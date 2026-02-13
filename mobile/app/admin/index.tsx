import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ScrollView, ActivityIndicator, TouchableOpacity, Alert, NativeSyntheticEvent, NativeScrollEvent, TextInput } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { db } from '@/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { addModerationKeywordMobile, dismissFlaggedContentMobile, fetchFlaggedContentMobile, fetchModerationKeywordsMobile, removeFlaggedContentMobile, removeModerationKeywordMobile } from '@/services/api';

export default function AdminScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<any | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const { setFade } = useHeaderFade();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // Check if user has admin role
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const hasAdminRole = userData?.role === 'admin';
        setIsAdmin(hasAdminRole);

        if (hasAdminRole) {
          const flagRes = await fetchFlaggedContentMobile();
          setFlags(flagRes.items || []);
          try {
            const keywordRes = await fetchModerationKeywordsMobile();
            setKeywords(keywordRes.keywords || []);
          } catch (keywordErr) {
            console.error('Error fetching keywords:', keywordErr);
          }
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleApprove = async (contentType: 'listing' | 'wish' | 'review', contentId: string) => {
    try {
      await dismissFlaggedContentMobile(contentType, contentId);
      setFlags((prev) => prev.filter(f => f.id !== contentId));
      setSelectedFlag(null);
      Alert.alert(t('admin.success') || 'Success', t('admin.flag_dismissed') || 'Flag dismissed');
    } catch (error) {
      console.error('Error approving:', error);
      Alert.alert(t('common.error') || 'Error', t('admin.action_failed') || 'Action failed');
    }
  };

  const handleReject = async (contentType: 'listing' | 'wish' | 'review', contentId: string) => {
    try {
      await removeFlaggedContentMobile(contentType, contentId);
      setFlags((prev) => prev.filter(f => f.id !== contentId));
      setSelectedFlag(null);
      Alert.alert(t('admin.success') || 'Success', t('admin.content_removed') || 'Content removed');
    } catch (error) {
      console.error('Error rejecting:', error);
      Alert.alert(t('common.error') || 'Error', t('admin.action_failed') || 'Action failed');
    }
  };

  const handleAddKeyword = async () => {
    const value = keywordInput.trim();
    if (!value) return;
    setKeywordsLoading(true);
    try {
      const res = await addModerationKeywordMobile(value);
      setKeywords(res.keywords || []);
      setKeywordInput('');
    } catch (error) {
      console.error('Error adding keyword:', error);
      Alert.alert(t('common.error') || 'Error', t('admin.action_failed') || 'Action failed');
    } finally {
      setKeywordsLoading(false);
    }
  };

  const handleRemoveKeyword = async (keyword: string) => {
    setKeywordsLoading(true);
    try {
      const res = await removeModerationKeywordMobile(keyword);
      setKeywords(res.keywords || []);
    } catch (error) {
      console.error('Error removing keyword:', error);
      Alert.alert(t('common.error') || 'Error', t('admin.action_failed') || 'Action failed');
    } finally {
      setKeywordsLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background')}>
        <ActivityIndicator size="large" color="#4f7942" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background px-6')}>
        <Text style={cn('mb-4 text-lg font-semibold text-foreground')}>
          {t('auth.sign_in_required') || 'Please sign in'}
        </Text>
        <Link href="/auth/signin">
          <Button>
            <Text style={cn('text-primary-foreground font-medium')}>{t('header.signIn') || 'Sign In'}</Text>
          </Button>
        </Link>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background px-6')}>
        <AlertTriangle size={48} color="#ef4444" />
        <Text style={cn('mt-4 text-center text-lg font-semibold text-foreground')}>
          {t('admin.access_denied') || 'Access Denied'}
        </Text>
        <Text style={cn('mt-2 text-center text-sm text-muted-foreground')}>
          {t('admin.admin_only') || 'This page is only accessible to administrators.'}
        </Text>
        <Link href="/">
          <Button variant="outline">
            <Text style={cn('text-foreground font-medium')}>{t('common.go_home') || 'Go Home'}</Text>
          </Button>
        </Link>
      </View>
    );
  }

  if (selectedFlag) {
    const reason =
      selectedFlag.data?.flagReason ||
      selectedFlag.data?.reason ||
      t('admin.no_reason') ||
      'No reason provided';
    const ownerId =
      selectedFlag.data?.ownerId ||
      selectedFlag.data?.userId ||
      selectedFlag.data?.offeredByUserId ||
      selectedFlag.data?.reviewerId;
    const timestamp = selectedFlag.data?.createdAt || selectedFlag.data?.updatedAt;
    const timestampDate =
      timestamp && typeof (timestamp as any).toDate === 'function'
        ? (timestamp as any).toDate()
        : (timestamp ? new Date(timestamp) : null);
    return (
      <View style={cn('flex-1 bg-background')}>
        <ScrollView
          style={cn('flex-1 px-4 py-3')}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const y = e.nativeEvent.contentOffset.y || 0;
            setFade(computeFade(y));
          }}
          scrollEventThrottle={16}
        >
          <View style={cn('mb-4 flex-row items-center justify-between')}>
            <Text style={cn('text-2xl font-bold text-foreground')}>{t('admin.flag_details') || 'Flag Details'}</Text>
            <TouchableOpacity onPress={() => setSelectedFlag(null)}>
              <Text style={cn('text-primary')}>{t('common.back') || 'Back'}</Text>
            </TouchableOpacity>
          </View>

          <View style={cn('rounded-lg border border-border bg-card p-4')}>
            <View style={cn('mb-3 flex-row items-center gap-2')}>
              <AlertTriangle size={20} color="#ef4444" />
              <Badge variant="destructive">
                <Text style={cn('text-xs font-semibold text-white')}>{selectedFlag.type || 'content'}</Text>
              </Badge>
            </View>

            <Text style={cn('mb-2 text-sm font-medium text-muted-foreground')}>{t('admin.reason') || 'Reason'}:</Text>
            <Text style={cn('mb-4 text-base text-foreground')}>{reason}</Text>

            <Text style={cn('mb-2 text-sm font-medium text-muted-foreground')}>{t('admin.content_id') || 'Content ID'}:</Text>
            <Text style={cn('mb-4 font-mono text-sm text-foreground')}>{selectedFlag.id}</Text>

            {ownerId ? (
              <>
                <Text style={cn('mb-2 text-sm font-medium text-muted-foreground')}>{t('admin.owner_id') || 'Owner ID'}:</Text>
                <Text style={cn('mb-4 font-mono text-sm text-foreground')}>{ownerId}</Text>
              </>
            ) : null}

            {timestampDate && (
              <>
                <Text style={cn('mb-2 text-sm font-medium text-muted-foreground')}>{t('common.date') || 'Date'}:</Text>
                <Text style={cn('mb-4 text-sm text-foreground')}>
                  {timestampDate.toLocaleString()}
                </Text>
              </>
            )}
          </View>

          <View style={cn('mt-6 gap-3')}>
            <Button
              onPress={() => handleApprove(selectedFlag.type, selectedFlag.id)}
              className="flex-row items-center justify-center gap-2"
            >
              <CheckCircle size={18} color="#fff" />
              <Text style={cn('text-primary-foreground font-medium')}>
                {t('admin.dismiss_flag') || 'Dismiss Flag'}
              </Text>
            </Button>

            <Button
              variant="destructive"
              onPress={() => handleReject(selectedFlag.type, selectedFlag.id)}
              className="flex-row items-center justify-center gap-2"
            >
              <XCircle size={18} color="#fff" />
              <Text style={cn('text-white font-medium')}>
                {t('admin.remove_content') || 'Remove Content'}
              </Text>
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={cn('flex-1 bg-background')}>
      <ScrollView
        style={cn('flex-1 px-4 py-3')}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = e.nativeEvent.contentOffset.y || 0;
          setFade(computeFade(y));
        }}
        scrollEventThrottle={16}
      >
        <Text style={cn('mb-3 text-2xl font-bold text-foreground')}>
          {t('admin.title') || 'Admin Panel'}
        </Text>
        
        <View style={cn('mb-4 rounded-lg border border-border bg-card p-4')}>
          <Text style={cn('text-sm text-muted-foreground')}>
            {t('admin.flagged_items') || 'Flagged items'}: <Text style={cn('font-semibold text-foreground')}>{flags.length}</Text>
          </Text>
        </View>

        <View style={cn('mb-4 rounded-lg border border-border bg-card p-4')}>
          <Text style={cn('mb-3 text-lg font-semibold text-foreground')}>
            {t('admin.keywords_title') || 'Banned Keywords'}
          </Text>
          <View style={cn('mb-3 flex-row items-center gap-2')}>
            <TextInput
              value={keywordInput}
              onChangeText={setKeywordInput}
              placeholder={t('admin.keyword_placeholder') || 'Add a keyword...'}
              autoCapitalize="none"
              style={cn('flex-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground')}
            />
            <Button onPress={handleAddKeyword} disabled={keywordsLoading || !keywordInput.trim()}>
              <Text style={cn('text-primary-foreground font-medium')}>
                {t('admin.add_keyword') || 'Add Keyword'}
              </Text>
            </Button>
          </View>
          {keywords.length === 0 ? (
            <Text style={cn('text-sm text-muted-foreground')}>
              {t('admin.keywords_empty') || 'No keywords configured yet'}
            </Text>
          ) : (
            <View style={cn('flex-row flex-wrap gap-2')}>
              {keywords.map((keyword) => (
                <View key={keyword} style={cn('flex-row items-center rounded-full border border-border px-3 py-1')}>
                  <Text style={cn('text-sm text-foreground')}>{keyword}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveKeyword(keyword)}
                    disabled={keywordsLoading}
                    style={cn('ml-2')}
                  >
                    <Text style={cn('text-sm text-muted-foreground')}>
                      {t('admin.remove_keyword') || 'Remove'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {flags.length === 0 ? (
          <View style={cn('items-center py-8')}>
            <CheckCircle size={48} color="#10b981" />
            <Text style={cn('mt-4 text-center text-muted-foreground')}>
              {t('admin.no_flags') || 'No flagged content to review'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={flags}
            keyExtractor={(it) => it.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const reason =
                item.data?.flagReason ||
                item.data?.reason ||
                t('admin.no_reason') ||
                'No reason';
              const ts = item.data?.createdAt || item.data?.updatedAt;
              const date =
                ts && typeof (ts as any).toDate === 'function'
                  ? (ts as any).toDate()
                  : (ts ? new Date(ts) : null);
              return (
                <View style={cn('mb-3 rounded-lg border border-border bg-card p-4')}>
                  <View style={cn('mb-2 flex-row items-center justify-between')}>
                    <Badge variant="destructive">
                      <Text style={cn('text-xs font-semibold text-white')}>{item.type || 'content'}</Text>
                    </Badge>
                    <TouchableOpacity onPress={() => setSelectedFlag(item)}>
                      <View style={cn('flex-row items-center gap-1')}>
                        <Eye size={16} color="#4f7942" />
                        <Text style={cn('text-sm text-primary')}>{t('common.view') || 'View'}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  <Text style={cn('text-sm text-foreground')}>{reason}</Text>
                  {date && (
                    <Text style={cn('mt-2 text-xs text-muted-foreground')}>
                      {date.toLocaleDateString()}
                    </Text>
                  )}
                </View>
              );
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}
