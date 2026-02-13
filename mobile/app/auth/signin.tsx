import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Link } from 'expo-router';
// @ts-ignore - useRouter available at runtime even if not typed in this setup
import { useRouter } from 'expo-router';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AppLogo } from '@/components/ui/AppLogo';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { LogIn } from 'lucide-react-native';
import PasswordInput from '@/components/ui/PasswordInput';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { getErrorMessage } from '@/lib/errors';
import { useTranslation } from 'react-i18next';

const AuthLogo = () => (
  <View style={cn('h-16 w-16 bg-primary rounded-full items-center justify-center')}>
    <AppLogo size={28} color="#ffffff" strokeWidth={2.25} />
  </View>
);

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { setFade } = useHeaderFade();
  const { t } = useTranslation();

  useEffect(() => { setFade(0); }, [setFade]);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      if (!auth) throw new Error(t('auth.signin.configError'));
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert(t('auth.signin.successTitle'), t('auth.signin.successBody'));
      router.replace('/profile');
    } catch (err: any) {
      console.error('Sign in error:', err);
      const message = getErrorMessage(err, t('auth.signin.invalidCredentials'));
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  // Success navigation handled immediately via router.replace

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
          <View style={cn('flex-row items-center gap-2 mb-8')}>
            <AuthLogo />
            <Text style={cn('text-2xl font-bold text-primary')}>SkillSwap</Text>
          </View>
        </Link>

        <Card style={cn('w-full max-w-md shadow-xl')}>
          <CardHeader style={cn('items-center')}>
            <View style={cn('h-12 w-12 rounded-full items-center justify-center mb-2 bg-primary/10')}>
              <LogIn size={22} color="#2b6b4f" />
            </View>
            <CardTitle style={cn('text-2xl text-center')}>{t('auth.signin.title')}</CardTitle>
            <CardDescription style={cn('text-center')}>
              {t('auth.signin.subtitle')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <View style={cn('gap-4')}>
              {/* Email Input */}
              <View style={cn('gap-1')}>
                <Text style={cn('text-sm font-medium text-foreground')}>{t('auth.signin.emailLabel')}</Text>
                <TextInput
                  style={[cn('border border-input bg-white rounded-md px-3 py-2 text-base'), { minHeight: 44 }]}
                  placeholder={t('auth.signin.emailPlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Password Input */}
              <View style={cn('gap-1')}>
                <View style={cn('flex-row items-center justify-between')}>
                  <Text style={cn('text-sm font-medium text-foreground')}>{t('auth.signin.passwordLabel')}</Text>
                  <Link href="/auth/forgot-password">
                    <Text style={cn('text-sm font-medium text-primary')}>{t('auth.signin.forgotPassword')}</Text>
                  </Link>
                </View>
                <PasswordInput
                  className="border border-input bg-white rounded-md px-3 py-2 text-base"
                  placeholder={t('auth.signin.passwordPlaceholder')}
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {/* Remember Me */}
              <TouchableOpacity 
                style={cn('flex-row items-center gap-2')}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[cn('h-5 w-5 border-2 rounded items-center justify-center'), 
                  rememberMe ? { borderColor: colors.primary, backgroundColor: colors.primary } : { borderColor: '#D1D5DB' }]}>
                  {rememberMe && <Text style={cn('text-white text-xs')}>✓</Text>}
                </View>
                <Text style={cn('text-sm text-muted-foreground')}>{t('auth.signin.rememberMe')}</Text>
              </TouchableOpacity>
            </View>
          </CardContent>

          <CardFooter>
            <View style={cn('w-full gap-4')}>
              {/* Sign In Button */}
              <TouchableOpacity
                style={[cn('bg-primary rounded-md py-3 items-center'), loading && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <View style={cn('flex-row items-center')}>
                    <ActivityIndicator color="white" style={cn('mr-2')} />
                    <Text style={cn('text-white font-semibold')}>{t('auth.signin.buttonLoading')}</Text>
                  </View>
                ) : (
                  <Text style={cn('text-white font-semibold')}>{t('header.signIn')}</Text>
                )}
              </TouchableOpacity>

              {/* Error Message */}
              {errorMessage && (
                <View style={cn('bg-red-50 border border-red-200 rounded-md p-3')}>
                  <Text style={cn('text-sm font-medium text-red-800')}>{t('auth.signin.errorTitle')}</Text>
                  <Text style={cn('text-sm text-red-700 mt-1')}>{errorMessage}</Text>
                </View>
              )}

              {/* Sign Up Link */}
              <View style={cn('flex-row items-center justify-center')}>
                <Text style={cn('text-sm text-muted-foreground')}>{t('auth.signin.noAccount')} </Text>
                <Link href="/auth/signup">
                  <Text style={cn('text-sm font-medium text-primary')}>{t('auth.signin.signUp')}</Text>
                </Link>
              </View>
            </View>
          </CardFooter>
  </Card>
      </View>
    </ScrollView>
  );
}

// Helper to access colors
const colors = {
  primary: '#4A7C59',
  placeholder: '#9CA3AF',
};
