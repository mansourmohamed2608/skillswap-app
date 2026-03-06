import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform, Modal, Pressable, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
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
import { auth } from '@/services/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { bootstrapUserAccountMobile } from '@/services/api';
import { isLatinName, requiresLatinName } from '@/lib/validation';
import { getErrorMessage } from '@/lib/errors';
import { findBannedKeywordInFields } from '@/lib/moderation';
import { useTranslation } from 'react-i18next';

type FormState = {
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  occupation?: string;
  country: string;
  city?: string;
  password: string;
  confirmPassword: string;
};

type Errors = Partial<Record<keyof FormState | 'server', string>>;

const REQUIRE_LATIN_NAME = requiresLatinName();

function normalizePhoneNumber(value: string): string {
  const raw = String(value || '').trim();
  const normalized = raw.replace(/[^\d+]/g, '');
  if (normalized.startsWith('00')) return `+${normalized.slice(2)}`;
  return normalized;
}

export default function SignupScreen() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>({
    fullName: '',
    username: '',
    email: '',
    phoneNumber: '',
    occupation: '',
    country: '',
    city: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Errors>({});
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
    const trimmedUsername = form.username.trim();
    if (!trimmedUsername || trimmedUsername.length < 3) {
      e.username = t('auth.signup.errors.usernameTooShort');
    } else if (!/^[\p{L}\p{N}._-]{3,32}$/u.test(trimmedUsername)) {
      e.username = t('auth.signup.errors.usernameInvalid');
    }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t('auth.signup.errors.invalidEmail');
    if (!form.phoneNumber || form.phoneNumber.trim().length < 9) e.phoneNumber = t('auth.signup.errors.invalidPhone');
    if (!form.country) e.country = t('auth.signup.errors.countryRequired');
    if (!form.password || form.password.length < 6) e.password = t('auth.signup.errors.passwordTooShort');
    if (form.confirmPassword !== form.password) e.confirmPassword = t('auth.signup.errors.passwordMismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      if (!auth) throw new Error(t('auth.signup.errors.configError'));
      const fullName = form.fullName.trim();
      const username = form.username.trim();
      const { email, password, phoneNumber, occupation, country, city } = form;
      const phoneNumberNormalized = normalizePhoneNumber(phoneNumber);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });
      try {
        await bootstrapUserAccountMobile({ fullName, username, phoneNumber, phoneNumberNormalized, occupation: occupation || '', country, city: city || '', email });
      } catch (err: any) {
        try { await cred.user.delete(); } catch {}
        throw err;
      }
      Alert.alert(t('auth.signup.successTitle'), t('auth.signup.successBody'), [
        { text: t('common.continue'), onPress: () => router.replace('/profile/verify') },
      ]);
    } catch (err: any) {
      const msg = getErrorMessage(err, t('auth.signup.errors.signupFailedFallback'));
      setErrors((s) => ({ ...s, server: msg }));
      Alert.alert(t('auth.signup.errors.signupFailedTitle'), msg);
    } finally {
      setLoading(false);
    }
  }

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

              {/* Username */}
              <View>
                <Text style={cn('mb-1 text-sm text-foreground')}>{t('auth.signup.usernameLabel')}</Text>
                <Input value={form.username} onChangeText={(t) => setField('username', t)} autoCapitalize="none" placeholder={t('auth.signup.usernamePlaceholder')} />
                {errors.username ? (<Text style={cn('mt-1 text-sm text-destructive')}>{errors.username}</Text>) : null}
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


            </CardContent>

            <CardFooter className="flex-col items-stretch gap-4">
              <Button onPress={handleSubmit} disabled={loading}>
                {loading ? (
                  <Text>{t('auth.signup.submitting')}</Text>
                ) : (
                  <Text>{t('auth.signup.submit')}</Text>
                )}
              </Button>
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
