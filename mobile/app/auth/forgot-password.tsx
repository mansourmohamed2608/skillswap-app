import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, ActivityIndicator, Alert, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Link } from 'expo-router';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AppLogo } from '@/components/ui/AppLogo';
import { auth } from '@/services/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { MailQuestion } from 'lucide-react-native';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { getErrorMessage } from '@/lib/errors';
import { useTranslation } from 'react-i18next';

const AuthLogo = () => (
  <View style={cn('h-16 w-16 bg-primary rounded-full items-center justify-center')}>
    <AppLogo size={28} color="#ffffff" strokeWidth={2.25} />
  </View>
);

const placeholderColor = '#9CA3AF';

const MailWithQuestion = () => (
  <View style={cn('mb-2')}>
    <MailQuestion size={28} color="#2b6b4f" strokeWidth={2} />
  </View>
);

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { setFade } = useHeaderFade();
  const { t } = useTranslation();
  useEffect(() => { setFade(0); }, [setFade]);

  const normalizeFirebaseError = (err: any) => {
    if (!err) return t('errors.generic');
    const code = err?.code || '';
    if (code === 'auth/invalid-email') return t('auth.forgot.invalidEmail');
    if (code === 'auth/user-not-found') return t('auth.forgot.noAccount');
    if (code === 'auth/too-many-requests') return t('auth.forgot.tooManyRequests');
    return getErrorMessage(err, t('auth.forgot.sendFailedFallback'));
  };

  const onSubmit = async () => {
    setErrorMessage(null);
    if (!email || !email.includes('@')) {
      setErrorMessage(t('auth.forgot.invalidEmail'));
      return;
    }
    if (!auth) {
      setErrorMessage(t('auth.forgot.configError'));
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
      Alert.alert(t('auth.forgot.sentTitle'), t('auth.forgot.sentBody'));
    } catch (err: any) {
      setErrorMessage(normalizeFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={cn('flex-1 bg-background')}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y || 0;
        setFade(computeFade(y));
      }}
      scrollEventThrottle={16}
    >
      <View style={cn('flex-1 items-center justify-center py-12 px-4')}>
        <Link href="/">
          <View style={cn('flex-row items-center justify-center self-center gap-2 mb-8')}>
            <AuthLogo />
            <Text style={cn('text-2xl font-bold text-primary')}>SkillSwap</Text>
          </View>
        </Link>

        <Card style={cn('w-full max-w-md shadow-xl')}>
          <CardHeader style={cn('items-center')}>
            <MailWithQuestion />
            <CardTitle style={cn('text-2xl text-center')}>{t('auth.forgot.title')}</CardTitle>
            <CardDescription style={cn('text-center')}>
              {t('auth.forgot.subtitle')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {sent ? (
              <View style={cn('gap-3 items-center')}>
                <Text style={cn('text-base text-foreground text-center')}>
                  {t('auth.forgot.sentLine1')}
                </Text>
                <Text style={cn('text-base font-semibold text-foreground')}>{email}</Text>
                <Text style={cn('text-sm text-muted-foreground text-center')}>
                  {t('auth.forgot.sentLine2')}
                </Text>
              </View>
            ) : (
              <View style={cn('gap-4')}>
                <View style={cn('gap-1')}>
                  <Text style={cn('text-sm font-medium text-foreground')}>{t('auth.forgot.emailLabel')}</Text>
                  <TextInput
                    style={[cn('border border-input bg-white rounded-md px-3 py-2 text-base'), { minHeight: 44 }]}
                    placeholder={t('auth.forgot.emailPlaceholder')}
                    placeholderTextColor={placeholderColor}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
                {errorMessage && (
                  <View style={cn('bg-red-50 border border-red-200 rounded-md p-3')}>
                    <Text style={cn('text-sm font-medium text-red-800')}>{t('auth.forgot.requestFailedTitle')}</Text>
                    <Text style={cn('text-sm text-red-700 mt-1')}>{errorMessage}</Text>
                  </View>
                )}
              </View>
            )}
          </CardContent>

          <CardFooter>
            <View style={cn('w-full gap-3')}>
              {sent ? (
                <>
                  <Link href="/auth/signin">
                    <View>
                      <Button>
                        {t('auth.forgot.backToSignIn')}
                      </Button>
                    </View>
                  </Link>
                  <View style={cn('items-center')}>
                    <Link href="/auth/signup">
                      <Text style={cn('text-sm font-medium text-primary')}>{t('auth.forgot.createAccount')}</Text>
                    </Link>
                  </View>
                </>
              ) : (
                <Button onPress={onSubmit} disabled={loading}>
                  {loading ? (
                    <View style={cn('flex-row items-center')}>
                      <ActivityIndicator color="white" style={cn('mr-2')} />
                      <Text style={cn('text-primary-foreground font-semibold')}>{t('auth.forgot.sending')}</Text>
                    </View>
                  ) : (
                    t('auth.forgot.sendCta')
                  )}
                </Button>
              )}

              {!sent && (
                <View style={cn('flex-row items-center justify-center')}>
                  <Text style={cn('text-sm text-muted-foreground')}>{t('auth.forgot.remembered')} </Text>
                  <Link href="/auth/signin">
                    <Text style={cn('text-sm font-medium text-primary')}>{t('auth.forgot.backToSignIn')}</Text>
                  </Link>
                </View>
              )}
            </View>
          </CardFooter>
        </Card>
      </View>
    </ScrollView>
  );
}
 
