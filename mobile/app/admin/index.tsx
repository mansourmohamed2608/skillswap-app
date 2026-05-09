import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ScrollView, ActivityIndicator, TouchableOpacity, Alert, NativeSyntheticEvent, NativeScrollEvent, TextInput, useColorScheme } from 'react-native';
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
import { addModerationKeywordMobile, dismissFlaggedContentMobile, fetchFlaggedContentMobile, fetchModerationKeywordsMobile, removeFlaggedContentMobile, removeModerationKeywordMobile, fetchAdminReportsMobile, resolveAdminReportMobile, fetchAdminUsersMobile, updateAdminUserRoleMobile, updateAdminUserStatusMobile, fetchAdminAuditMobile, fetchAdminAnalyticsMobile } from '@/services/api';

export default function AdminScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const brandGreen = colorScheme === 'dark' ? '#86efac' : '#4f7942';
  const destructiveRed = '#ef4444';
  const successGreen = colorScheme === 'dark' ? '#34d399' : '#10b981';
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<any | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<Array<{ name: string; count: number }>>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
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
          } catch {
            // keywords are non-critical; continue without them
          }
          const [usersRes, reportsRes, auditRes, analyticsRes] = await Promise.allSettled([
            fetchAdminUsersMobile(50),
            fetchAdminReportsMobile(50),
            fetchAdminAuditMobile(50),
            fetchAdminAnalyticsMobile(200),
          ]);
          if (usersRes.status === 'fulfilled') setUsers(usersRes.value.users || []);
          if (reportsRes.status === 'fulfilled') setReports(reportsRes.value.items || []);
          if (auditRes.status === 'fulfilled') setAuditItems(auditRes.value.items || []);
          if (analyticsRes.status === 'fulfilled') setAnalyticsSummary(analyticsRes.value.summary || []);
        }
      } catch {
        // admin data fetch failed silently
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
    } catch {
      Alert.alert(t('common.error') || 'Error', t('admin.action_failed') || 'Action failed');
    }
  };

  const handleReject = async (contentType: 'listing' | 'wish' | 'review', contentId: string) => {
    try {
      await removeFlaggedContentMobile(contentType, contentId);
      setFlags((prev) => prev.filter(f => f.id !== contentId));
      setSelectedFlag(null);
      Alert.alert(t('admin.success') || 'Success', t('admin.content_removed') || 'Content removed');
    } catch {
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
    } catch {
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
    } catch {
      Alert.alert(t('common.error') || 'Error', t('admin.action_failed') || 'Action failed');
    } finally {
      setKeywordsLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background')}>
        <ActivityIndicator size="large" color={brandGreen} />
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
        <AlertTriangle size={48} color={destructiveRed} />
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
              <AlertTriangle size={20} color={destructiveRed} />
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
            <CheckCircle size={48} color={successGreen} />
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
                        <Eye size={16} color={brandGreen} />
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

        {/* ----- Users Section ----- */}
        <View style={cn('mb-4 rounded-lg border border-border bg-card p-4')}>
          <TouchableOpacity
            onPress={() => setExpandedSection(expandedSection === 'users' ? null : 'users')}
            style={cn('flex-row items-center justify-between')}
          >
            <Text style={cn('text-lg font-semibold text-foreground')}>
              {t('admin.users_title') || 'Users'} ({users.length})
            </Text>
            <Text style={cn('text-sm text-primary')}>
              {expandedSection === 'users' ? (t('admin.section_collapse') || 'Hide') : (t('admin.section_expand') || 'Show')}
            </Text>
          </TouchableOpacity>
          {expandedSection === 'users' && (
            <View style={cn('mt-3 gap-3')}>
              {users.length === 0 ? (
                <Text style={cn('text-sm text-muted-foreground')}>{t('admin.users_empty') || 'No users found.'}</Text>
              ) : (
                users.map((u) => (
                  <View key={u.id} style={cn('rounded-md border border-border p-3 gap-2')}>
                    <Text style={cn('text-sm font-semibold text-foreground')} numberOfLines={1}>
                      {u.name || u.email || u.id}
                    </Text>
                    <Text style={cn('text-xs text-muted-foreground')}>
                      {t('admin.user_role') || 'Role'}: {u.role || 'user'} · {t('admin.user_status') || 'Status'}: {u.accountStatus || 'active'}
                    </Text>
                    <View style={cn('flex-row flex-wrap gap-2 mt-1')}>
                      {(['admin', 'moderator', 'user'] as const).map((role) => (
                        u.role !== role ? (
                          <TouchableOpacity
                            key={role}
                            onPress={async () => {
                              try {
                                await updateAdminUserRoleMobile(u.id, role);
                                setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, role } : x));
                              } catch {
                                Alert.alert(t('common.error') || 'Error', t('admin.action_failed') || 'Action failed');
                              }
                            }}
                            style={{ backgroundColor: brandGreen, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}
                          >
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
                              {t(`admin.set_role_${role}`) || role}
                            </Text>
                          </TouchableOpacity>
                        ) : null
                      ))}
                      {(['active', 'suspended', 'banned'] as const).map((st) => (
                        (u.accountStatus || 'active') !== st ? (
                          <TouchableOpacity
                            key={st}
                            onPress={async () => {
                              try {
                                await updateAdminUserStatusMobile(u.id, st);
                                setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, accountStatus: st } : x));
                              } catch {
                                Alert.alert(t('common.error') || 'Error', t('admin.action_failed') || 'Action failed');
                              }
                            }}
                            style={{ backgroundColor: st === 'active' ? successGreen : destructiveRed, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}
                          >
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
                              {t(`admin.set_status_${st}`) || st}
                            </Text>
                          </TouchableOpacity>
                        ) : null
                      ))}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* ----- Reports Section ----- */}
        <View style={cn('mb-4 rounded-lg border border-border bg-card p-4')}>
          <TouchableOpacity
            onPress={() => setExpandedSection(expandedSection === 'reports' ? null : 'reports')}
            style={cn('flex-row items-center justify-between')}
          >
            <Text style={cn('text-lg font-semibold text-foreground')}>
              {t('admin.reports_title') || 'User Reports'} ({reports.length})
            </Text>
            <Text style={cn('text-sm text-primary')}>
              {expandedSection === 'reports' ? (t('admin.section_collapse') || 'Hide') : (t('admin.section_expand') || 'Show')}
            </Text>
          </TouchableOpacity>
          {expandedSection === 'reports' && (
            <View style={cn('mt-3 gap-3')}>
              {reports.length === 0 ? (
                <Text style={cn('text-sm text-muted-foreground')}>{t('admin.reports_empty') || 'No reports.'}</Text>
              ) : (
                reports.map((r) => (
                  <View key={r.id} style={cn('rounded-md border border-border p-3 gap-1')}>
                    <View style={cn('flex-row items-center justify-between')}>
                      <Badge variant={r.status === 'resolved' ? 'secondary' : 'destructive'}>
                        <Text style={cn('text-xs font-semibold text-white')}>{r.type || 'content'}</Text>
                      </Badge>
                      <Text style={cn('text-xs text-muted-foreground')}>{r.status || 'open'}</Text>
                    </View>
                    <Text style={cn('text-sm text-foreground mt-1')} numberOfLines={2}>{r.reason}</Text>
                    {r.status !== 'resolved' && (
                      <View style={cn('flex-row gap-2 mt-2')}>
                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              await resolveAdminReportMobile(r.id, 'dismiss');
                              setReports((prev) => prev.map((x) => x.id === r.id ? { ...x, status: 'resolved' } : x));
                            } catch {
                              Alert.alert(t('common.error') || 'Error', t('admin.action_failed') || 'Action failed');
                            }
                          }}
                          style={{ backgroundColor: brandGreen, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5 }}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                            {t('admin.resolve_dismiss') || 'Dismiss'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              await resolveAdminReportMobile(r.id, 'remove');
                              setReports((prev) => prev.map((x) => x.id === r.id ? { ...x, status: 'resolved' } : x));
                            } catch {
                              Alert.alert(t('common.error') || 'Error', t('admin.action_failed') || 'Action failed');
                            }
                          }}
                          style={{ backgroundColor: destructiveRed, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5 }}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                            {t('admin.resolve_remove') || 'Remove Content'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* ----- Audit Log Section ----- */}
        <View style={cn('mb-4 rounded-lg border border-border bg-card p-4')}>
          <TouchableOpacity
            onPress={() => setExpandedSection(expandedSection === 'audit' ? null : 'audit')}
            style={cn('flex-row items-center justify-between')}
          >
            <Text style={cn('text-lg font-semibold text-foreground')}>
              {t('admin.audit_title') || 'Audit Log'} ({auditItems.length})
            </Text>
            <Text style={cn('text-sm text-primary')}>
              {expandedSection === 'audit' ? (t('admin.section_collapse') || 'Hide') : (t('admin.section_expand') || 'Show')}
            </Text>
          </TouchableOpacity>
          {expandedSection === 'audit' && (
            <View style={cn('mt-3 gap-2')}>
              {auditItems.length === 0 ? (
                <Text style={cn('text-sm text-muted-foreground')}>{t('admin.audit_empty') || 'No audit entries.'}</Text>
              ) : (
                auditItems.map((entry) => {
                  const ts = entry.createdAt;
                  const date = ts && typeof ts.toDate === 'function' ? ts.toDate() : ts ? new Date(ts) : null;
                  return (
                    <View key={entry.id} style={cn('rounded-md border border-border p-3 gap-1')}>
                      <Text style={cn('text-xs font-semibold text-primary')}>{entry.action || '-'}</Text>
                      <Text style={cn('text-xs text-muted-foreground')} numberOfLines={1}>
                        {t('admin.audit_actor') || 'Actor'}: {entry.actorId || '-'}
                      </Text>
                      <Text style={cn('text-xs text-muted-foreground')} numberOfLines={1}>
                        {t('admin.audit_target') || 'Target'}: {entry.targetId || '-'}
                      </Text>
                      {date && (
                        <Text style={cn('text-xs text-muted-foreground')}>{date.toLocaleString()}</Text>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>

        {/* ----- Analytics Section ----- */}
        <View style={cn('mb-6 rounded-lg border border-border bg-card p-4')}>
          <TouchableOpacity
            onPress={() => setExpandedSection(expandedSection === 'analytics' ? null : 'analytics')}
            style={cn('flex-row items-center justify-between')}
          >
            <Text style={cn('text-lg font-semibold text-foreground')}>
              {t('admin.analytics_title') || 'Analytics'}
            </Text>
            <Text style={cn('text-sm text-primary')}>
              {expandedSection === 'analytics' ? (t('admin.section_collapse') || 'Hide') : (t('admin.section_expand') || 'Show')}
            </Text>
          </TouchableOpacity>
          {expandedSection === 'analytics' && (
            <View style={cn('mt-3 gap-2')}>
              {analyticsSummary.length === 0 ? (
                <Text style={cn('text-sm text-muted-foreground')}>{t('admin.analytics_empty') || 'No analytics data.'}</Text>
              ) : (
                analyticsSummary.map((item) => (
                  <View key={item.name} style={cn('flex-row items-center justify-between rounded-md border border-border p-3')}>
                    <Text style={cn('text-sm text-foreground')}>{item.name}</Text>
                    <Text style={cn('text-sm font-semibold text-primary')}>{item.count}</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
