import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { cn } from '@/lib/cn';
import { db, storage, auth } from '@/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import Input from '@/components/ui/Input';
import PasswordInput from '@/components/ui/PasswordInput';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail, updatePassword } from 'firebase/auth';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { updateUserProfile } from '@/services/api';
import { getErrorMessage } from '@/lib/errors';
import { findBannedKeywordInFields } from '@/lib/moderation';
import { useTranslation } from 'react-i18next';
import { useMembership } from '@/hooks/useMembership';

export default function EditProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { setFade } = useHeaderFade();
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('');
  const [geo, setGeo] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [locating, setLocating] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const { plan } = useMembership();
  const isBusinessPlan = plan === 'Business';
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [businessBrandColor, setBusinessBrandColor] = useState('');
  const [businessLogoUri, setBusinessLogoUri] = useState<string | null>(null);
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState('');
  const [customCategories, setCustomCategories] = useState('');
  const autoLocationRequestedRef = useRef(false);

  async function formatLocationFromGeo(lat: number, lng: number): Promise<string | undefined> {
    try {
      const rows = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const first = rows?.[0];
      if (!first) return undefined;
      const city = String(first.city || first.subregion || first.region || '').trim();
      const countryValue = String(first.country || '').trim();
      const parts = [city, countryValue].filter(Boolean);
      return parts.length ? parts.join(', ') : undefined;
    } catch {
      return undefined;
    }
  }

  useEffect(() => { setFade(0); }, [setFade]);

  useEffect(() => {
    (async () => {
      try {
        if (!user || !db) return;
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data: any = snap.data();
          setDisplayName(data.name ?? '');
          setLocation(data.location ?? '');
          setCountry(data.country ?? '');
          setGeo(data.geo ? { lat: Number(data.geo.lat), lng: Number(data.geo.lng) } : undefined);
          setUsername(data.profile?.username ?? '');
          setEmail(user.email ?? '');
          const biz = data.businessProfile || {};
          setBusinessName(biz.name ?? '');
          setBusinessDescription(biz.description ?? '');
          setBusinessWebsite(biz.website ?? '');
          setBusinessBrandColor(biz.brandColor ?? '');
          setBusinessLogoUrl(biz.logoUrl ?? null);
          setTeamMembers(Array.isArray(biz.teamMembers) ? biz.teamMembers.join(', ') : '');
          setCustomCategories(Array.isArray(biz.customCategories) ? biz.customCategories.join(', ') : '');
        }
      } catch (e: any) {
        setError(getErrorMessage(e, t('errors.generic')));
      } finally {
        setProfileLoaded(true);
      }
    })();
  }, [user?.uid]);

  async function pickBusinessLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (!res.canceled) setBusinessLogoUri(res.assets[0].uri);
  }

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (!res.canceled) setAvatarUri(res.assets[0].uri);
  }

  async function pickCover() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (res.canceled) return;
    const uri = res.assets[0].uri;
    try {
      // Center-crop to 4:1 then downscale to 1600x400
      const info = await ImageManipulator.manipulateAsync(uri, [], { compress: 0.9 });
      // Without image dimensions we fallback to a resize; if width/height exist, compute crop rect
      // For simplicity, just resize to 1600x400 maintaining aspect ratio via contain; many devices will accept this.
      const out = await ImageManipulator.manipulateAsync(info.uri, [{ resize: { width: 1600, height: 400 } }], { compress: 0.9 });
      setCoverUri(out.uri);
    } catch {
      setCoverUri(uri);
    }
  }

  async function save() {
    try {
      if (!user || !db) throw new Error('Not signed in');
      setError(null);
      setLoading(true);
      if (showPasswordSection) {
        if (!currentPassword || !newPassword || !confirmNewPassword) {
          setLoading(false);
          setError(t('profile.edit.errors.passwordMissing'));
          return;
        }
        if (newPassword !== confirmNewPassword) {
          setLoading(false);
          setError(t('profile.edit.errors.passwordMismatch'));
          return;
        }
      }
      const banned = findBannedKeywordInFields([
        { label: 'name', value: displayName },
        { label: 'username', value: username },
        { label: 'location', value: location },
        { label: 'country', value: country },
        { label: 'businessName', value: businessName },
        { label: 'businessDescription', value: businessDescription },
        { label: 'businessWebsite', value: businessWebsite },
      ]);
      if (banned) {
        setLoading(false);
        setError(t('errors.codes.content/banned'));
        return;
      }
      let avatarUrl: string | undefined;
      let coverUrl: string | undefined;
      if (avatarUri && storage) {
        const buf = await (await fetch(avatarUri)).arrayBuffer();
        const key = `avatars/${user.uid}/${Date.now()}.jpg`;
        const r = ref(storage, key);
        await uploadBytes(r, new Uint8Array(buf), { contentType: 'image/jpeg' });
        avatarUrl = await getDownloadURL(r);
      }
      if (coverUri && storage) {
        const buf = await (await fetch(coverUri)).arrayBuffer();
        const key = `covers/${user.uid}/${Date.now()}.jpg`;
        const r = ref(storage, key);
        await uploadBytes(r, new Uint8Array(buf), { contentType: 'image/jpeg' });
        coverUrl = await getDownloadURL(r);
      }
      // Upload business logo if changed
      let resolvedBusinessLogoUrl: string | null = businessLogoUrl;
      if (businessLogoUri && storage) {
        const buf = await (await fetch(businessLogoUri)).arrayBuffer();
        const key = `business-logos/${user.uid}/${Date.now()}.jpg`;
        const r = ref(storage, key);
        await uploadBytes(r, new Uint8Array(buf), { contentType: 'image/jpeg' });
        resolvedBusinessLogoUrl = await getDownloadURL(r);
      }
      const update: any = { name: displayName, location, country };
      if (geo) update.geo = geo;
      if (username) update.profile = { ...(update.profile || {}), username };
      if (avatarUrl) update.avatarUrl = avatarUrl;
      if (coverUrl) update.profile = { ...(update.profile || {}), coverUrl };
      if (isBusinessPlan) {
        const biz: any = {};
        if (businessName.trim()) biz.name = businessName.trim();
        if (businessDescription.trim()) biz.description = businessDescription.trim();
        if (businessWebsite.trim()) biz.website = businessWebsite.trim();
        if (businessBrandColor.trim()) biz.brandColor = businessBrandColor.trim();
        if (resolvedBusinessLogoUrl) biz.logoUrl = resolvedBusinessLogoUrl;
        const teamList = teamMembers.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
        if (teamList.length) biz.teamMembers = teamList;
        const catList = customCategories.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10);
        if (catList.length) biz.customCategories = catList;
        if (Object.keys(biz).length) update.businessProfile = biz;
      }
      await updateUserProfile(update);
      // After profile update, change email/password if requested
      if (auth && email && email !== user.email) {
        await updateEmail(user, email);
      }
      if (auth && showPasswordSection) {
        const cred = EmailAuthProvider.credential(user.email || '', currentPassword);
        await reauthenticateWithCredential(user, cred);
        await updatePassword(user, newPassword);
      }
      Alert.alert(t('profile.edit.successTitle'), t('profile.edit.successBody'));
      router.replace('/profile');
    } catch (e: any) {
      Alert.alert(t('profile.edit.failedTitle'), getErrorMessage(e, t('profile.edit.failedBody')));
    } finally {
      setLoading(false);
    }
  }

  async function useCurrentLocation(options?: { auto?: boolean }) {
    const auto = Boolean(options?.auto);
    try {
      setLocating(true);
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        if (!auto) {
          Alert.alert(t('common.error') || 'Error', t('profile.edit.locationPermissionDenied'));
        }
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = Number(position.coords.latitude);
      const lng = Number(position.coords.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        if (!auto) {
          Alert.alert(t('common.error') || 'Error', t('profile.edit.locationReadFailed'));
        }
        return;
      }
      const resolved = await formatLocationFromGeo(lat, lng);
      if (resolved) setLocation(resolved);
      setGeo({ lat, lng });
    } catch {
      if (!auto) {
        Alert.alert(t('common.error') || 'Error', t('profile.edit.locationFetchFailed'));
      }
    } finally {
      setLocating(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    if (!profileLoaded) return;
    if (autoLocationRequestedRef.current) return;
    if (location.trim() || geo) return;
    autoLocationRequestedRef.current = true;
    void useCurrentLocation({ auto: true });
    // Request once when profile data is loaded and location is missing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profileLoaded, location, geo]);

  return (
    <ScrollView
      style={cn('flex-1 bg-background')}
      onScroll={(e) => {
        const y = e.nativeEvent.contentOffset.y || 0;
        setFade(computeFade(y));
      }}
      scrollEventThrottle={16}
    >
      <View style={cn('px-4 py-6')}>
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.edit.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? <Text style={cn('text-destructive mb-2')}>{error}</Text> : null}            {/* Business Profile Section - Business plan only */}
            {isBusinessPlan ? (
              <View style={cn('mt-4 rounded-md border border-border bg-muted/10 p-4 gap-3')}>
                <Text style={cn('text-lg font-semibold text-foreground')}>{t('profile.edit.business.title')}</Text>
                <Text style={cn('text-sm text-muted-foreground -mt-2')}>{t('profile.edit.business.subtitle')}</Text>

                <View>
                  <Text style={cn('text-sm text-foreground mb-1')}>{t('profile.edit.business.nameLabel')}</Text>
                  <Input value={businessName} onChangeText={setBusinessName} placeholder={t('profile.edit.business.namePlaceholder')} />
                </View>

                <View>
                  <Text style={cn('text-sm text-foreground mb-1')}>{t('profile.edit.business.descriptionLabel')}</Text>
                  <Input
                    value={businessDescription}
                    onChangeText={setBusinessDescription}
                    placeholder={t('profile.edit.business.descriptionPlaceholder')}
                    multiline
                    numberOfLines={3}
                    style={{ minHeight: 72, textAlignVertical: 'top' }}
                  />
                </View>

                <View>
                  <Text style={cn('text-sm text-foreground mb-1')}>{t('profile.edit.business.websiteLabel')}</Text>
                  <Input
                    value={businessWebsite}
                    onChangeText={setBusinessWebsite}
                    placeholder={t('profile.edit.business.websitePlaceholder')}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                <View>
                  <Text style={cn('text-sm text-foreground mb-1')}>{t('profile.edit.business.brandColorLabel')}</Text>
                  <Input
                    value={businessBrandColor}
                    onChangeText={setBusinessBrandColor}
                    placeholder={t('profile.edit.business.brandColorPlaceholder')}
                    autoCapitalize="none"
                  />
                </View>

                <View>
                  <Text style={cn('text-sm text-foreground mb-1')}>{t('profile.edit.business.logoLabel')}</Text>
                  {(businessLogoUri || businessLogoUrl) ? (
                    <Image
                      source={{ uri: businessLogoUri || businessLogoUrl! }}
                      style={{ width: 64, height: 64, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#ddd' }}
                    />
                  ) : null}
                  <TouchableOpacity onPress={pickBusinessLogo} style={cn('rounded-md border border-dashed border-border px-3 py-2 mt-1')}>
                    <Text style={cn('text-foreground text-center')}>{businessLogoUri || businessLogoUrl ? t('profile.edit.business.logoChange') : t('profile.edit.business.logoUpload')}</Text>
                  </TouchableOpacity>
                </View>

                <View>
                  <Text style={cn('text-sm text-foreground mb-1')}>{t('profile.edit.business.teamLabel')}</Text>
                  <Input
                    value={teamMembers}
                    onChangeText={setTeamMembers}
                    placeholder={t('profile.edit.business.teamPlaceholder')}
                  />
                  <Text style={cn('text-xs text-muted-foreground mt-1')}>{t('profile.edit.business.teamHelp')}</Text>
                </View>

                <View>
                  <Text style={cn('text-sm text-foreground mb-1')}>{t('profile.edit.business.categoriesLabel')}</Text>
                  <Input
                    value={customCategories}
                    onChangeText={setCustomCategories}
                    placeholder={t('profile.edit.business.categoriesPlaceholder')}
                  />
                  <Text style={cn('text-xs text-muted-foreground mt-1')}>{t('profile.edit.business.categoriesHelp')}</Text>
                </View>
              </View>
            ) : null}
            <Text style={cn('text-sm text-foreground mb-1')}>{t('profile.edit.nameLabel')}</Text>
            <Input value={displayName} onChangeText={setDisplayName} className="mb-3" />
            <Text style={cn('text-sm text-foreground mb-1')}>{t('profile.edit.usernameLabel')}</Text>
            <Input value={username} onChangeText={setUsername} className="mb-3" />
            <Text style={cn('text-sm text-foreground mb-1')}>{t('profile.edit.cityLabel')}</Text>
            <Input value={location} onChangeText={setLocation} className="mb-3" />
            <Text style={cn('text-sm text-foreground mb-1')}>{t('profile.edit.countryLabel')}</Text>
            <Input value={country} onChangeText={setCountry} className="mb-3" />
            <TouchableOpacity
              onPress={() => {
                void useCurrentLocation();
              }}
              disabled={locating}
              style={cn('mt-1 mb-3 rounded-md border border-border px-3 py-2 bg-card', locating ? 'opacity-70' : '')}
            >
              <Text style={cn('text-foreground text-center')}>{locating ? t('profile.edit.locating') : t('profile.edit.useCurrentLocation')}</Text>
            </TouchableOpacity>
            {geo ? (
              <Text style={cn('text-xs text-muted-foreground mb-3')}>{t('profile.edit.locationCaptured')}</Text>
            ) : null}
            <TouchableOpacity onPress={pickAvatar} style={cn('mt-2 rounded-md border border-dashed border-border px-3 py-2')}>
              <Text style={cn('text-foreground text-center')}>{avatarUri ? t('profile.edit.changeAvatar') : t('profile.edit.uploadAvatar')}</Text>
            </TouchableOpacity>
            {avatarUri ? (
              <View style={cn('items-center mt-2')}>
                <Image source={{ uri: avatarUri }} style={{ width: '100%', height: 120, borderRadius: 8 }} resizeMode="cover" />
              </View>
            ) : null}
            <TouchableOpacity onPress={pickCover} style={cn('mt-2 rounded-md border border-dashed border-border px-3 py-2')}>
              <Text style={cn('text-foreground text-center')}>{coverUri ? t('profile.edit.changeCover') : t('profile.edit.uploadCover')}</Text>
            </TouchableOpacity>
            {coverUri ? (
              <View style={cn('items-center mt-2')}>
                <Image source={{ uri: coverUri }} style={{ width: '100%', height: 120, borderRadius: 8 }} resizeMode="cover" />
              </View>
            ) : null}
            <Text style={cn('text-sm text-foreground mt-4 mb-1')}>{t('profile.edit.emailLabel')}</Text>
            <Input autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} className="mb-3" />
            <TouchableOpacity onPress={() => setShowPasswordSection(v => !v)} style={cn('mt-2 rounded-md border border-border px-3 py-2 bg-card')}>
              <Text style={cn('text-foreground text-center')}>{showPasswordSection ? t('profile.edit.cancelPasswordChange') : t('profile.edit.changePassword')}</Text>
            </TouchableOpacity>
            {showPasswordSection ? (
              <View style={cn('mt-3')}>
                <Text style={cn('text-sm text-foreground mb-1')}>{t('profile.edit.currentPassword')}</Text>
                <PasswordInput value={currentPassword} onChangeText={setCurrentPassword} className="mb-3" />
                <Text style={cn('text-sm text-foreground mb-1')}>{t('profile.edit.newPassword')}</Text>
                <PasswordInput value={newPassword} onChangeText={setNewPassword} className="mb-3" />
                <Text style={cn('text-sm text-foreground mb-1')}>{t('profile.edit.confirmNewPassword')}</Text>
                <PasswordInput value={confirmNewPassword} onChangeText={setConfirmNewPassword} className="mb-3" />
              </View>
            ) : null}
          </CardContent>
          <CardFooter>
            <TouchableOpacity disabled={loading} onPress={save} style={cn('rounded-md bg-primary px-4 py-3 min-w-[160px] items-center')}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={cn('text-primary-foreground font-semibold')}>{t('profile.edit.save')}</Text>}
            </TouchableOpacity>
          </CardFooter>
        </Card>
      </View>
    </ScrollView>
  );
}
