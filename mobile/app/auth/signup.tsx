import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Modal, Pressable, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Link } from 'expo-router';
// @ts-ignore - Expo Router types may not expose useRouter in this project, but it's available at runtime
import { useRouter } from 'expo-router';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import PasswordInput from '@/components/ui/PasswordInput';
import Button from '@/components/ui/Button';
import { AppLogo } from '@/components/ui/AppLogo';
import { countries } from '@/lib/countries';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '@/services/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { finalizeKycMobile, submitKycPublicMobile, updateUserProfile as updateUserProfileApi } from '@/services/api';
import { isLatinName, requiresLatinName } from '@/lib/validation';
import { getErrorMessage } from '@/lib/errors';
import { findBannedKeywordInFields } from '@/lib/moderation';
import { useTranslation } from 'react-i18next';

// Countries list now imported from '@/lib/countries'

type FormState = {
  fullName: string;
  email: string;
  phoneNumber: string;
  occupation?: string;
  country: string;
  city?: string;
  password: string;
  confirmPassword: string;
};

type Errors = Partial<Record<keyof FormState | 'nationalIdFront' | 'nationalIdBack' | 'server', string>>;

const REQUIRE_LATIN_NAME = requiresLatinName();

export default function SignupScreen() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    phoneNumber: '',
    occupation: '',
    country: '',
    city: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [frontBase64, setFrontBase64] = useState<string | null>(null);
  const [backBase64, setBackBase64] = useState<string | null>(null);
  const [vendor, setVendor] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<'IDLE' | 'PENDING' | 'VERIFIED' | 'FAILED'>('IDLE');
  const [finalizing, setFinalizing] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const { setFade } = useHeaderFade();
  const [countryQuery, setCountryQuery] = useState('');
  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.toLowerCase().includes(q));
  }, [countryQuery]);
  // Bottom sheet sizing: shorter, scrollable list
  const sheetHeights = useMemo(() => {
    const h = Dimensions.get('window').height;
    const maxSheet = Math.min(480, Math.round(h * 0.55));
    const listArea = Math.max(200, maxSheet - 120); // leave space for header + search
    return { maxSheet, listArea };
  }, []);

  const setField = (k: keyof FormState, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function pickImage(which: 'front' | 'back') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('auth.signup.errors.permissionTitle'), t('auth.signup.errors.permissionBody'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9, base64: true });
    if (!res.canceled) {
      const asset = res.assets[0];
      const b64 = asset.base64 || null;
      if (!b64) {
        Alert.alert(t('common.error') || 'Error', t('auth.signup.errors.imageReadFailed'));
        return;
      }
      if (which === 'front') setFrontBase64(`data:${asset.mimeType || 'image/jpeg'};base64,${b64}`);
      else setBackBase64(`data:${asset.mimeType || 'image/jpeg'};base64,${b64}`);
    }
  }

  function validate(): boolean {
    const e: Errors = {};
    const trimmedName = form.fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      e.fullName = t('auth.signup.errors.nameTooShort');
    } else if (REQUIRE_LATIN_NAME && !isLatinName(trimmedName)) {
      e.fullName = t('auth.signup.errors.latinOnly');
    } else {
      const banned = findBannedKeywordInFields([{ label: 'fullName', value: trimmedName }]);
      if (banned) e.fullName = t('errors.codes.content/banned');
    }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t('auth.signup.errors.invalidEmail');
    if (!form.phoneNumber || form.phoneNumber.trim().length < 9) e.phoneNumber = t('auth.signup.errors.invalidPhone');
    if (!form.country) e.country = t('auth.signup.errors.countryRequired');
    if (!form.password || form.password.length < 6) e.password = t('auth.signup.errors.passwordTooShort');
    if (form.confirmPassword !== form.password) e.confirmPassword = t('auth.signup.errors.passwordMismatch');
    if (!frontBase64) e.nationalIdFront = t('auth.signup.errors.frontRequired');
    if (!backBase64) e.nationalIdBack = t('auth.signup.errors.backRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function ensureVendor(): Promise<string> {
    let v = vendor;
    if (v) return v;
    // Try restore from storage to survive restarts
    try {
      const existing = await AsyncStorage.getItem('kyc_vendor');
      if (existing) {
        setVendor(existing);
        return existing;
      }
    } catch {}
    // Generate a simple unique-ish vendor id
    v = `didit-mobile-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
    setVendor(v);
    try { await AsyncStorage.setItem('kyc_vendor', v); } catch {}
    return v;
  }

  // Submit KYC to backend (public) and attach a Firestore listener to kyc_temp/{vendor}
  async function submitKycAndListen() {
    setLoading(true);
    setErrors({});
    try {
      if (!auth || !db) throw new Error(t('auth.signup.errors.configError'));
      if (!validate()) return;
      const v = await ensureVendor();
      const { fullName, nationalId } = { fullName: form.fullName.trim(), nationalId: undefined as string | undefined };
      await submitKycPublicMobile({ fullName, vendor: v, idFrontBase64: frontBase64 as string, idBackBase64: backBase64 as string, nationalId });
      setKycStatus('PENDING');

      // Attach listener once
      onSnapshot(doc(db, 'kyc_temp', v), (snap) => {
        const data: any = snap.data() || {};
        const status = String(data?.status || '').toUpperCase();
        if (!status) return;
        if (status === 'PENDING' && kycStatus !== 'PENDING') setKycStatus('PENDING');
        if (status === 'FAILED') setKycStatus('FAILED');
        if (status === 'VERIFIED') {
          setKycStatus('VERIFIED');
        }
      });
    } catch (err: any) {
      const msg = getErrorMessage(err, t('auth.signup.errors.kycFailedFallback'));
      setErrors((s) => ({ ...s, server: msg }));
      Alert.alert(t('auth.signup.errors.kycFailedTitle'), msg);
    } finally {
      setLoading(false);
    }
  }

  // Once KYC is VERIFIED, create the account and finalize KYC binding
  useEffect(() => {
    const maybeFinalize = async () => {
      if (kycStatus !== 'VERIFIED' || finalizing) return;
      setFinalizing(true);
      try {
        const { email, password, fullName, phoneNumber, occupation, country, city } = form;
        const cred = await createUserWithEmailAndPassword(auth!, email, password);
        await updateProfile(cred.user, { displayName: fullName });
        // Bind verified KYC temp record to this uid
        const v = await ensureVendor();
        await finalizeKycMobile(v);
        // Create user profile via backend (enforced by server to require KYC VERIFIED)
        await updateUserProfileApi({
          uid: cred.user.uid,
          fullName,
          email,
          phoneNumber,
          occupation: occupation || '',
          country,
          city: city || '',
          avatarUrl: 'https://placehold.co/128x128.png',
          bio: '',
          rating: 0,
          reviewsCount: 0,
          servicesOffered: [],
          servicesRequested: [],
        });
        try { await AsyncStorage.removeItem('kyc_vendor'); } catch {}
        Alert.alert(t('auth.signup.successTitle'), t('auth.signup.successBody'), [
          { text: t('common.continue'), onPress: () => router.replace('/') },
        ]);
      } catch (err: any) {
        const msg = getErrorMessage(err, t('auth.signup.errors.signupFailedFallback'));
        setErrors((s) => ({ ...s, server: msg }));
        Alert.alert(t('auth.signup.errors.signupFailedTitle'), msg);
      } finally {
        setFinalizing(false);
      }
    };
    // no await in effect
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    maybeFinalize();
  }, [kycStatus]);

  const Bg = useMemo(() => (
    <Image
      source={{ uri: 'https://placehold.co/1920x1080.png' }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}
      resizeMode="cover"
      blurRadius={6}
    />
  ), []);

  // Ensure header starts at top state, then fade with scroll
  useEffect(() => { setFade(0); }, [setFade]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={cn('flex-1 bg-background')}>
      <View style={cn('flex-1 items-center justify-center pb-6')}> 
        {Bg}
        <ScrollView
          contentContainerStyle={cn('px-4 pb-12')}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const y = e.nativeEvent.contentOffset.y || 0;
            setFade(computeFade(y));
          }}
          scrollEventThrottle={16}
        >
          <View style={cn('items-center mt-4 mb-6')}>
            <Link href="/" asChild>
              <TouchableOpacity style={cn('flex-row items-center gap-2')}>
                <AppLogo size={40} />
                <Text style={cn('font-bold text-2xl text-primary')}>SkillSwap</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <Card className="w-full max-w-md self-center shadow-xl">
            <CardHeader className="items-center">
            <CardTitle className="text-2xl">{t('auth.signup.title')}</CardTitle>
              <CardDescription>{t('auth.signup.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Full Name */}
              <View>
                <Text style={cn('mb-1 text-sm text-foreground')}>{t('auth.signup.fullNameLabel')}</Text>
                <Input value={form.fullName} onChangeText={(t) => setField('fullName', t)} placeholder={t('auth.signup.fullNamePlaceholder')} />
                {errors.fullName ? (<Text style={cn('mt-1 text-sm text-destructive')}>{errors.fullName}</Text>) : null}
              </View>

              {/* Email */}
              <View>
                <Text style={cn('mb-1 text-sm text-foreground')}>{t('auth.signup.emailLabel')}</Text>
                <Input value={form.email} onChangeText={(t) => setField('email', t)} keyboardType="email-address" autoCapitalize="none" placeholder={t('auth.signup.emailPlaceholder')} />
                {errors.email ? (<Text style={cn('mt-1 text-sm text-destructive')}>{errors.email}</Text>) : null}
              </View>

              {/* Phone Number */}
              <View>
                <Text style={cn('mb-1 text-sm text-foreground')}>{t('auth.signup.phoneLabel')}</Text>
                <Input value={form.phoneNumber} onChangeText={(t) => setField('phoneNumber', t)} keyboardType="phone-pad" placeholder={t('auth.signup.phonePlaceholder')} />
                {errors.phoneNumber ? (<Text style={cn('mt-1 text-sm text-destructive')}>{errors.phoneNumber}</Text>) : null}
              </View>

              {/* Occupation */}
              <View>
                <Text style={cn('mb-1 text-sm text-foreground')}>{t('auth.signup.occupationLabel')}</Text>
                <Input value={form.occupation} onChangeText={(t) => setField('occupation', t)} placeholder={t('auth.signup.occupationPlaceholder')} />
                {errors.occupation ? (<Text style={cn('mt-1 text-sm text-destructive')}>{errors.occupation}</Text>) : null}
              </View>

              {/* Country (dropdown picker) */}
              <View>
                <Text style={cn('mb-1 text-sm text-foreground')}>{t('auth.signup.countryLabel')}</Text>
                <TouchableOpacity
                  onPress={() => setCountryPickerOpen(true)}
                  style={cn('h-10 w-full rounded-md border border-input bg-background px-3 justify-center')}
                >
                  <Text style={cn(form.country ? 'text-foreground' : 'text-muted-foreground')}>
                    {form.country || t('auth.signup.countryPlaceholder')}
                  </Text>
                </TouchableOpacity>
                {errors.country ? (<Text style={cn('mt-1 text-sm text-destructive')}>{errors.country}</Text>) : null}
              </View>

              {/* City */}
              <View>
                <Text style={cn('mb-1 text-sm text-foreground')}>{t('auth.signup.cityLabel')}</Text>
                <Input value={form.city} onChangeText={(t) => setField('city', t)} placeholder={t('auth.signup.cityPlaceholder')} />
                {errors.city ? (<Text style={cn('mt-1 text-sm text-destructive')}>{errors.city}</Text>) : null}
              </View>

              {/* Password */}
              <View>
                <Text style={cn('mb-1 text-sm text-foreground')}>{t('auth.signup.passwordLabel')}</Text>
                <PasswordInput value={form.password} onChangeText={(t) => setField('password', t)} placeholder={t('auth.signup.passwordPlaceholder')} />
                {errors.password ? (<Text style={cn('mt-1 text-sm text-destructive')}>{errors.password}</Text>) : null}
              </View>

              {/* Confirm Password */}
              <View>
                <Text style={cn('mb-1 text-sm text-foreground')}>{t('auth.signup.confirmPasswordLabel')}</Text>
                <PasswordInput value={form.confirmPassword} onChangeText={(t) => setField('confirmPassword', t)} placeholder={t('auth.signup.passwordPlaceholder')} />
                {errors.confirmPassword ? (<Text style={cn('mt-1 text-sm text-destructive')}>{errors.confirmPassword}</Text>) : null}
              </View>

              {/* National ID Front */}
              <View>
                <Text style={cn('mb-1 text-sm text-foreground')}>{t('auth.signup.idFrontLabel')}</Text>
                {frontBase64 ? (
                  <Image source={{ uri: frontBase64 }} style={{ width: 150, height: 90, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' }} />
                ) : null}
                <Button
                  variant="outline"
                  className="w-full h-10 items-start justify-center px-3"
                  onPress={() => pickImage('front')}
                >
                  {t('auth.signup.uploadFront')}
                </Button>
                {errors.nationalIdFront ? (<Text style={cn('mt-1 text-sm text-destructive')}>{errors.nationalIdFront}</Text>) : null}
              </View>

              {/* National ID Back */}
              <View>
                <Text style={cn('mb-1 text-sm text-foreground')}>{t('auth.signup.idBackLabel')}</Text>
                {backBase64 ? (
                  <Image source={{ uri: backBase64 }} style={{ width: 150, height: 90, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' }} />
                ) : null}
                <Button
                  variant="outline"
                  className="w-full h-10 items-start justify-center px-3"
                  onPress={() => pickImage('back')}
                >
                  {t('auth.signup.uploadBack')}
                </Button>
                {errors.nationalIdBack ? (<Text style={cn('mt-1 text-sm text-destructive')}>{errors.nationalIdBack}</Text>) : null}
              </View>

              {/* Privacy note */}
              <View style={cn('mt-2 rounded-md border border-primary/30 bg-muted/50 p-3')}>
                <Text style={cn('text-primary font-medium')}>{t('auth.signup.privacyTitle')}</Text>
                <Text style={cn('text-muted-foreground mt-1')}>{t('auth.signup.privacyBody')}</Text>
              </View>
            </CardContent>

            <CardFooter className="flex-col items-stretch gap-4">
              <Button onPress={submitKycAndListen} disabled={loading || kycStatus === 'PENDING' || kycStatus === 'VERIFIED'}>
                {loading ? (
                  <Text>{t('auth.signup.submitting')}</Text>
                ) : (
                  <Text>{kycStatus === 'PENDING' ? t('auth.signup.waiting') : (kycStatus === 'VERIFIED' ? t('auth.signup.verified') : t('auth.signup.submit'))}</Text>
                )}
              </Button>
              {kycStatus === 'PENDING' ? (
                <View style={cn('rounded-md border border-primary/30 bg-primary/10 p-3')}>
                  <Text style={cn('font-medium text-primary')}>{t('auth.signup.pendingTitle')}</Text>
                  <Text style={cn('text-muted-foreground mt-1')}>{t('auth.signup.pendingBody')}</Text>
                </View>
              ) : null}
              {kycStatus === 'FAILED' ? (
                <View style={cn('rounded-md border border-destructive/30 bg-destructive/10 p-3')}>
                  <Text style={cn('font-medium text-destructive')}>{t('auth.signup.failedTitle')}</Text>
                  <Text style={cn('text-destructive mt-1')}>{t('auth.signup.failedBody')}</Text>
                </View>
              ) : null}
              {errors.server ? (
                <View style={cn('rounded-md border border-destructive/30 bg-destructive/10 p-3')}>
                  <Text style={cn('font-medium text-destructive')}>{t('auth.signup.errorTitle')}</Text>
                  <Text style={cn('text-destructive mt-1')}>{errors.server}</Text>
                </View>
              ) : null}
              <Text style={cn('text-center text-sm text-muted-foreground')}>
                {t('auth.signup.haveAccount')}{' '}
                <Text onPress={() => router.push('/auth/signin')} style={cn('font-medium text-primary')}>
                  {t('auth.signup.signInCta')}
                </Text>
              </Text>
            </CardFooter>
          </Card>

          <Text style={cn('mt-6 text-center text-sm text-muted-foreground')}>
            {t('auth.signup.termsNotice')}{' '}
            <Text onPress={() => router.push('/legal/terms')} style={cn('underline text-primary')}>
              {t('auth.signup.termsLink')}
            </Text>
            .
          </Text>
          {/* Country Picker: Mobile-friendly bottom sheet */}
          <Modal
            visible={countryPickerOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setCountryPickerOpen(false)}
          >
            <Pressable style={cn('flex-1 bg-black/40')} onPress={() => setCountryPickerOpen(false)}>
              <Pressable style={[cn('absolute inset-x-0 bottom-0 rounded-t-2xl bg-card p-4'), { maxHeight: sheetHeights.maxSheet }]} onPress={(e) => e.stopPropagation()}>
                {/* Handle */}
                <View style={cn('mb-3 items-center')}>
                  <View style={cn('h-1.5 w-12 rounded-full bg-muted')} />
                </View>
                {/* Header */}
                <View style={cn('mb-3 flex-row items-center justify-between')}>
                  <Text style={cn('text-lg font-semibold text-foreground')}>{t('auth.signup.countrySelectTitle')}</Text>
                  <TouchableOpacity onPress={() => setCountryPickerOpen(false)}>
                    <Text style={cn('text-primary font-medium')}>{t('common.close')}</Text>
                  </TouchableOpacity>
                </View>
                {/* Search */}
                <Input
                  placeholder={t('auth.signup.countrySearchPlaceholder')}
                  value={countryQuery}
                  onChangeText={setCountryQuery}
                  className="mb-3"
                />
                {/* List */}
                <View style={{ maxHeight: sheetHeights.listArea }}>
                  <FlatList
                    data={filteredCountries}
                    keyExtractor={(item) => item}
                    ItemSeparatorComponent={() => <View style={cn('h-px bg-border')} />}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => { setField('country', item); setCountryPickerOpen(false); setCountryQuery(''); }}
                        style={cn('py-3 px-2 rounded-md')}
                      >
                        <Text style={cn(item === form.country ? 'text-primary font-medium' : 'text-foreground')}>{item}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
