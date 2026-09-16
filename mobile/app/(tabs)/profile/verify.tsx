import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Alert, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, storage } from '@/services/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getKycStatusMobile, submitKycMobile, cancelKycMobile } from '@/services/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { useRouter } from 'expo-router';
import { isLatinName, requiresLatinName } from '@/lib/validation';
import { getErrorMessage } from '@/lib/errors';
import { findBannedKeywordInFields } from '@/lib/moderation';
import { useTranslation } from 'react-i18next';

const REQUIRE_LATIN_NAME = requiresLatinName();

export default function VerifyProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusReloadKey, setStatusReloadKey] = useState(0);
  const [status, setStatus] = useState<any>(null);
  const [fullName, setFullName] = useState<string>('');
  const [nationalId, setNationalId] = useState<string>('');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);

  useEffect(() => {
    const u = auth?.currentUser;
    if (!u) {
      setLoading(false);
      Alert.alert(t('kyc.signInRequiredTitle'), t('kyc.signInRequiredBody'), [
        { text: 'OK', onPress: () => router.replace('/auth/signin') },
      ]);
      return;
    }
    // Prefill name from auth displayName if available
    if (u.displayName && !fullName) setFullName(u.displayName);
    (async () => {
      setLoading(true);
      setStatusError(null);
      try {
        const s = await getKycStatusMobile();
        setStatus(s.result || null);
      } catch (error) {
        setStatusError(getErrorMessage(error, t('errors.generic')));
      } finally {
        setLoading(false);
      }
    })();
  }, [statusReloadKey]);

  async function pickImage(which: 'front' | 'back') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('kyc.permissionTitle'), t('kyc.permissionBody'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (!res.canceled) {
      const asset = res.assets[0];
      const FIVE_MB = 5 * 1024 * 1024;
      if (asset.fileSize && asset.fileSize > FIVE_MB) {
        Alert.alert(t('kyc.fileTooLargeTitle'), t('kyc.fileTooLargeBody'));
        return;
      }
      const mime = asset.mimeType ?? '';
      if (mime && !['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp'].includes(mime)) {
        Alert.alert(t('kyc.invalidFileTypeTitle'), t('kyc.invalidFileTypeBody'));
        return;
      }
      const uri = asset.uri;
      if (which === 'front') setFrontUri(uri);
      else setBackUri(uri);
    }
  }

  async function uploadFromUri(uri: string, path: string): Promise<string> {
    if (!storage) throw new Error('Storage not configured');
    const resp = await fetch(uri);
    const buf = await resp.arrayBuffer();
    const r = ref(storage, path);
    await uploadBytes(r, new Uint8Array(buf), { contentType: 'image/jpeg' });
    return await getDownloadURL(r);
  }

  async function onSubmit() {
    const u = auth?.currentUser;
    if (!u) return;
    if (!fullName.trim()) {
      Alert.alert(t('kyc.missingInfoTitle'), t('kyc.missingInfoBody'));
      return;
    }
    const banned = findBannedKeywordInFields([{ label: 'fullName', value: fullName }]);
    if (banned) {
      Alert.alert(t('common.error') || 'Error', t('errors.codes.content/banned'));
      return;
    }
    if (REQUIRE_LATIN_NAME && !isLatinName(fullName)) {
      Alert.alert(t('kyc.invalidNameTitle'), t('kyc.invalidNameBody'));
      return;
    }
    if (!frontUri || !backUri) {
      Alert.alert(t('kyc.missingImagesTitle'), t('kyc.missingImagesBody'));
      return;
    }
    setSubmitting(true);
    try {
      const frontKey = `users/${u.uid}/kyc/verify_front_${Date.now()}.jpg`;
      const backKey = `users/${u.uid}/kyc/verify_back_${Date.now()}.jpg`;
      const [frontUrl, backUrl] = await Promise.all([
        uploadFromUri(frontUri, frontKey),
        uploadFromUri(backUri, backKey),
      ]);
      const result = await submitKycMobile({ fullName: fullName.trim(), nationalId: nationalId.trim() || undefined, idFrontUrl: frontUrl, idBackUrl: backUrl });
      setStatus(result.result || null);
      Alert.alert(t('kyc.submittedTitle'), t('kyc.submittedBody'));
    } catch (e: any) {
      Alert.alert(t('kyc.submitFailedTitle'), getErrorMessage(e, t('errors.generic')));
    } finally {
      setSubmitting(false);
    }
  }

  async function onCancel() {
    setCanceling(true);
    setCancelError(null);
    try {
      const res = await cancelKycMobile();
      setStatus({ ...(status || {}), status: res?.status || 'CANCELLED' });
    } catch (e: any) {
      setCancelError(getErrorMessage(e, t('errors.generic')));
    } finally {
      setCanceling(false);
    }
  }

  const header = useMemo(() => (
    <View style={cn('mb-4')}>
      <Text style={cn('text-2xl font-semibold text-foreground')}>{t('kyc.title')}</Text>
      <Text style={cn('text-muted-foreground mt-1')}>{t('kyc.subtitle')}</Text>
    </View>
  ), [t]);

  if (loading) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background')}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={cn('flex-1 bg-background')}>
      <ScrollView contentContainerStyle={cn('p-4 gap-4')}>
        {header}

        {statusError ? (
          <View style={cn('rounded-md border border-destructive p-3 bg-card gap-2')}>
            <Text style={cn('text-sm text-destructive')}>{statusError}</Text>
            <Button variant="outline" onPress={() => setStatusReloadKey((value) => value + 1)}>
              <Text>{t('common.retry') || 'Retry'}</Text>
            </Button>
          </View>
        ) : null}

        {status ? (
          <View style={cn('rounded-md border border-border p-3 bg-card')}>
            <Text style={cn('text-sm text-foreground')}>
              {t('kyc.currentStatus')}{' '}
              <Text style={cn('font-semibold')}>{String(status.status || '').toUpperCase()}</Text>
            </Text>
            {status.reason ? (<Text style={cn('text-sm text-muted-foreground mt-1')}>{status.reason}</Text>) : null}
            {status.verifiedName ? (
              <Text style={cn('text-sm text-muted-foreground mt-1')}>
                {t('kyc.verifiedAs')}{' '}{status.verifiedName}
              </Text>
            ) : null}
            {['PENDING', 'IN_REVIEW'].includes(String(status.status || '').toUpperCase()) ? (
              <View style={cn('mt-3')}>
                <Button variant="outline" onPress={onCancel} disabled={canceling}>
                  {canceling ? <Text>{t('kyc.canceling')}</Text> : <Text>{t('kyc.cancelLabel')}</Text>}
                </Button>
                {cancelError ? (<Text style={cn('text-xs text-destructive mt-2')}>{cancelError}</Text>) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <View>
          <Text style={cn('mb-1 text-sm text-foreground')}>{t('kyc.fullNameLabel')}</Text>
          <Input value={fullName} onChangeText={setFullName} placeholder={t('kyc.fullNamePlaceholder')} />
        </View>

        <View>
          <Text style={cn('mb-1 text-sm text-foreground')}>{t('kyc.nationalIdLabel')}</Text>
          <Input value={nationalId} onChangeText={setNationalId} placeholder={t('kyc.nationalIdPlaceholder')} />
        </View>

        <View>
          <Text style={cn('mb-1 text-sm text-foreground')}>{t('kyc.idFrontLabel')}</Text>
          {frontUri ? (
            <Image source={{ uri: frontUri }} style={{ width: 180, height: 110, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#ddd' }} />
          ) : null}
          <Button variant="outline" className="h-10 items-start justify-center px-3" onPress={() => pickImage('front')}>
            {t('kyc.uploadFront')}
          </Button>
        </View>

        <View>
          <Text style={cn('mb-1 text-sm text-foreground')}>{t('kyc.idBackLabel')}</Text>
          {backUri ? (
            <Image source={{ uri: backUri }} style={{ width: 180, height: 110, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#ddd' }} />
          ) : null}
          <Button variant="outline" className="h-10 items-start justify-center px-3" onPress={() => pickImage('back')}>
            {t('kyc.uploadBack')}
          </Button>
        </View>

        <Button onPress={onSubmit} disabled={submitting}>
          {submitting ? (<Text>{t('kyc.submitting')}</Text>) : (<Text>{t('kyc.submit')}</Text>)}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
