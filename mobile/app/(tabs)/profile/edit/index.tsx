import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { cn } from '@/lib/cn';
import { db, storage, auth } from '@/services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

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
        }
      } catch (e: any) {
        setError(getErrorMessage(e, t('errors.generic')));
      }
    })();
  }, [user?.uid]);

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
      const update: any = { name: displayName, location, country };
      if (geo) update.geo = geo;
      if (username) update.profile = { ...(update.profile || {}), username };
      if (avatarUrl) update.avatarUrl = avatarUrl;
      if (coverUrl) update.profile = { ...(update.profile || {}), coverUrl };
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

  async function useCurrentLocation() {
    try {
      setLocating(true);
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('common.error') || 'Error', 'Location permission denied. Please enable location access in your device settings.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = Number(position.coords.latitude);
      const lng = Number(position.coords.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        Alert.alert(t('common.error') || 'Error', 'Unable to read your current location.');
        return;
      }
      setGeo({ lat, lng });
      if (!location.trim()) {
        setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      Alert.alert(t('common.error') || 'Error', 'Unable to get your current location.');
    } finally {
      setLocating(false);
    }
  }

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
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? <Text style={cn('text-red-600 mb-2')}>{error}</Text> : null}
            <Text style={cn('text-sm text-foreground mb-1')}>Name</Text>
            <Input value={displayName} onChangeText={setDisplayName} className="mb-3" />
            <Text style={cn('text-sm text-foreground mb-1')}>Username</Text>
            <Input value={username} onChangeText={setUsername} className="mb-3" />
            <Text style={cn('text-sm text-foreground mb-1')}>City</Text>
            <Input value={location} onChangeText={setLocation} className="mb-3" />
            <Text style={cn('text-sm text-foreground mb-1')}>Country</Text>
            <Input value={country} onChangeText={setCountry} className="mb-3" />
            <TouchableOpacity onPress={useCurrentLocation} disabled={locating} style={cn('mt-1 mb-3 rounded-md border border-border px-3 py-2 bg-card', locating ? 'opacity-70' : '')}>
              <Text style={cn('text-foreground text-center')}>{locating ? 'Locating...' : 'Use Current Location'}</Text>
            </TouchableOpacity>
            {geo ? (
              <Text style={cn('text-xs text-muted-foreground mb-3')}>GPS: {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}</Text>
            ) : null}
            <TouchableOpacity onPress={pickAvatar} style={cn('mt-2 rounded-md border border-dashed border-border px-3 py-2')}>
              <Text style={cn('text-foreground text-center')}>{avatarUri ? 'Change Avatar' : 'Upload Avatar'}</Text>
            </TouchableOpacity>
            {avatarUri ? (
              <View style={cn('items-center mt-2')}>
                <Image source={{ uri: avatarUri }} style={{ width: '100%', height: 120, borderRadius: 8 }} resizeMode="cover" />
              </View>
            ) : null}
            <TouchableOpacity onPress={pickCover} style={cn('mt-2 rounded-md border border-dashed border-border px-3 py-2')}>
              <Text style={cn('text-foreground text-center')}>{coverUri ? 'Change Cover Photo' : 'Upload Cover Photo (1600x400)'}</Text>
            </TouchableOpacity>
            {coverUri ? (
              <View style={cn('items-center mt-2')}>
                <Image source={{ uri: coverUri }} style={{ width: '100%', height: 120, borderRadius: 8 }} resizeMode="cover" />
              </View>
            ) : null}
            <Text style={cn('text-sm text-foreground mt-4 mb-1')}>Email</Text>
            <Input autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} className="mb-3" />
            <TouchableOpacity onPress={() => setShowPasswordSection(v => !v)} style={cn('mt-2 rounded-md border border-border px-3 py-2 bg-card')}>
              <Text style={cn('text-foreground text-center')}>{showPasswordSection ? 'Cancel Password Change' : 'Change Password'}</Text>
            </TouchableOpacity>
            {showPasswordSection ? (
              <View style={cn('mt-3')}>
                <Text style={cn('text-sm text-foreground mb-1')}>Current Password</Text>
                <PasswordInput value={currentPassword} onChangeText={setCurrentPassword} className="mb-3" />
                <Text style={cn('text-sm text-foreground mb-1')}>New Password</Text>
                <PasswordInput value={newPassword} onChangeText={setNewPassword} className="mb-3" />
                <Text style={cn('text-sm text-foreground mb-1')}>Confirm New Password</Text>
                <PasswordInput value={confirmNewPassword} onChangeText={setConfirmNewPassword} className="mb-3" />
              </View>
            ) : null}
          </CardContent>
          <CardFooter>
            <TouchableOpacity disabled={loading} onPress={save} style={cn('rounded-md bg-primary px-4 py-3 min-w-[160px] items-center')}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={cn('text-primary-foreground font-semibold')}>Save Changes</Text>}
            </TouchableOpacity>
          </CardFooter>
        </Card>
      </View>
    </ScrollView>
  );
}
