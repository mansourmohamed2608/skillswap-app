// src/app/profile/edit/page.tsx
"use client";

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db, storage, auth } from '@/services/firebase';
import { updateUserProfile } from '@/services/api';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '@/lib/errors';
import { findBannedKeywordInFields } from '@/lib/moderation';
import { LocateFixedIcon, Loader2, MapPinIcon } from 'lucide-react';

// Lazy-load the cropper dialog on client only to keep initial bundle smaller
const CoverCropperDialog = dynamic(() => import('@/features/profile/components/CoverCropperDialog'), { ssr: false });

/**
 * Profile editing page.
 *
 * This page allows the authenticated user to update their display name,
 * username (handle), location (city), country, avatar image, cover photo,
 * email and password.  File uploads are sent to the Firebase Storage
 * emulator.  After saving, the user is returned to their profile page.
 */
export default function EditProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('');
  const [geo, setGeo] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [locating, setLocating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [membershipPlan, setMembershipPlan] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [businessBrandColor, setBusinessBrandColor] = useState('');
  const [businessLogoFile, setBusinessLogoFile] = useState<File | null>(null);
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);
  const [businessLogoPreview, setBusinessLogoPreview] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState('');
  const [customCategories, setCustomCategories] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load existing profile data on mount
  useEffect(() => {
    async function fetchProfile() {
      if (!user || !db) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data: any = snap.data();
          setDisplayName(data.name ?? '');
          setLocation(data.location ?? '');
          setCountry(data.country ?? '');
          setGeo(data.geo ? { lat: Number(data.geo.lat), lng: Number(data.geo.lng) } : undefined);
          // Username is stored under profile.username
          setUsername(data.profile?.username ?? '');
          setMembershipPlan(data.membership?.plan ?? null);
          const business = data.businessProfile || {};
          setBusinessName(business.name ?? '');
          setBusinessDescription(business.description ?? '');
          setBusinessWebsite(business.website ?? '');
          setBusinessBrandColor(business.brandColor ?? '');
          setBusinessLogoUrl(business.logoUrl ?? null);
          setBusinessLogoPreview(business.logoUrl ?? null);
          setTeamMembers(Array.isArray(business.teamMembers) ? business.teamMembers.join(', ') : '');
          setCustomCategories(Array.isArray(business.customCategories) ? business.customCategories.join(', ') : '');
        }
        setEmail(user.email ?? '');
      } catch (err: any) {
        console.error('Failed to load profile', err);
        setError(getErrorMessage(err, t('profile.edit.errorLoad')));
      }
    }
    fetchProfile();
  }, [user]);

  const isBusinessPlan = membershipPlan === 'Business';

  // Submit handler updates email/password if changed and writes profile to Firestore
  const handleBusinessLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setBusinessLogoFile(null);
      setBusinessLogoPreview(businessLogoUrl);
      return;
    }
    setBusinessLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setBusinessLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  async function useCurrentLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setError('Unable to read your current location.');
          setLocating(false);
          return;
        }
        setGeo({ lat, lng });
        if (!location.trim()) setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setLocating(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location permission denied. Please enable it in browser settings.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('Location unavailable. Please check your device settings.');
        } else if (err.code === err.TIMEOUT) {
          setError('Location request timed out. Please try again.');
        } else {
          setError('Unable to get your current location.');
        }
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      setError(t('profile.edit.errorNotSignedIn'));
      return;
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
      setError(t('errors.codes.content/banned'));
      return;
    }
    if (showPasswordSection) {
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        setError(t('profile.edit.errorMissingPasswordFields'));
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setError(t('profile.edit.errorPasswordMismatch'));
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      let avatarUrl: string | undefined;
      let coverUrl: string | undefined;
      // Upload avatar if present
      if (avatarFile && storage) {
        // Persist avatar inside a user-specific folder with a timestamp to avoid collisions.
        const ext = avatarFile.name.split('.').pop() ?? 'jpg';
        const avatarFileName = `${Date.now()}.${ext}`;
        const avatarRef = ref(storage, `avatars/${user.uid}/${avatarFileName}`);
        await uploadBytes(avatarRef, avatarFile);
        avatarUrl = await getDownloadURL(avatarRef);
      }
      // Upload cover photo if present
      if (coverFile && storage) {
        // Persist cover image inside a user-specific folder with a timestamp.
        const ext = coverFile.name.split('.').pop() ?? 'jpg';
        const coverFileName = `${Date.now()}.${ext}`;
        const coverRef = ref(storage, `covers/${user.uid}/${coverFileName}`);
        await uploadBytes(coverRef, coverFile);
        coverUrl = await getDownloadURL(coverRef);
      }
      let resolvedBusinessLogoUrl: string | undefined = businessLogoUrl ?? undefined;
      if (businessLogoFile && storage) {
        const ext = businessLogoFile.name.split('.').pop() ?? 'jpg';
        const logoFileName = `${Date.now()}.${ext}`;
        const logoRef = ref(storage, `business-logos/${user.uid}/${logoFileName}`);
        await uploadBytes(logoRef, businessLogoFile);
        resolvedBusinessLogoUrl = await getDownloadURL(logoRef);
      }
      // Build profile update object
      const profileUpdate: any = {
        name: displayName,
        location,
        country,
        ...(geo ? { geo } : {}),
      };
      // Nested profile fields
      const nested: any = {};
      if (username) nested.username = username;
      if (coverUrl) nested.coverUrl = coverUrl;
      if (Object.keys(nested).length > 0) profileUpdate.profile = nested;
      if (avatarUrl) profileUpdate.avatarUrl = avatarUrl;
      if (isBusinessPlan) {
        const businessProfile: any = {};
        if (businessName.trim()) businessProfile.name = businessName.trim();
        if (businessDescription.trim()) businessProfile.description = businessDescription.trim();
        if (businessWebsite.trim()) businessProfile.website = businessWebsite.trim();
        if (businessBrandColor.trim()) businessProfile.brandColor = businessBrandColor.trim();
        if (resolvedBusinessLogoUrl) businessProfile.logoUrl = resolvedBusinessLogoUrl;
        const teamList = teamMembers.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 5);
        if (teamList.length) businessProfile.teamMembers = teamList;
        const customList = customCategories.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 10);
        if (customList.length) businessProfile.customCategories = customList;
        if (Object.keys(businessProfile).length > 0) {
          profileUpdate.businessProfile = businessProfile;
        }
      }
      // First update the profile in Firestore using the current valid ID token.
      await updateUserProfile(profileUpdate);
      // Only after updating the profile do we change email/password. Updating
      // email or password invalidates the existing ID token, which can cause
      // subsequent authenticated API calls to fail with "token revoked".
      if (auth && email && email !== user.email) {
        await updateEmail(user, email);
      }
      // Change password flow (optional section)
      if (auth && showPasswordSection) {
        // Re-authenticate with the old password, then set the new one.
        const cred = EmailAuthProvider.credential(user.email || '', currentPassword);
        await reauthenticateWithCredential(user, cred);
        await updatePassword(user, newPassword);
      }
  // Redirect back to the user's dashboard (/profile). If the ID token was
  // invalidated due to email/password changes, that page may prompt to
  // re-authenticate.
  router.push('/profile');
    } catch (err: any) {
      console.error('Profile update failed:', err);
      setError(getErrorMessage(err, t('profile.edit.errorUpdateFailed')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.edit.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="displayName">{t('profile.edit.nameLabel')}</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('profile.edit.namePlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="username">{t('profile.edit.usernameLabel')}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('profile.edit.usernamePlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('profile.edit.usernameHelp')}
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="location">{t('profile.edit.cityLabel')}</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t('profile.edit.cityLabel')}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="country">{t('profile.edit.countryLabel')}</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder={t('profile.edit.countryLabel')}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={locating}>
                {locating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LocateFixedIcon className="h-4 w-4 mr-2" />}
                Use Current Location
              </Button>
              {geo ? (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <MapPinIcon className="h-3 w-3" />
                  {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
                </span>
              ) : null}
            </div>
            <div>
              <Label htmlFor="avatar">{t('profile.edit.avatarLabel')}</Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />
            </div>
            <div id="cover-section">
              <Label htmlFor="cover">{t('profile.edit.coverLabel')}</Label>
              <Input
                id="cover"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (!f) {
                    setCoverFile(null);
                    return;
                  }
                  const objectUrl = URL.createObjectURL(f);
                  setCropSrc(objectUrl);
                  setShowCropper(true);
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('profile.edit.coverHelp')}</p>
            </div>
            {isBusinessPlan && (
              <div className="rounded-md border bg-muted/20 p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{t('profile.edit.business.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('profile.edit.business.subtitle')}</p>
                </div>
                <div>
                  <Label htmlFor="businessName">{t('profile.edit.business.nameLabel')}</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={t('profile.edit.business.namePlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="businessDescription">{t('profile.edit.business.descriptionLabel')}</Label>
                  <Textarea
                    id="businessDescription"
                    rows={3}
                    value={businessDescription}
                    onChange={(e) => setBusinessDescription(e.target.value)}
                    placeholder={t('profile.edit.business.descriptionPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="businessWebsite">{t('profile.edit.business.websiteLabel')}</Label>
                  <Input
                    id="businessWebsite"
                    type="url"
                    value={businessWebsite}
                    onChange={(e) => setBusinessWebsite(e.target.value)}
                    placeholder={t('profile.edit.business.websitePlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="businessBrandColor">{t('profile.edit.business.brandColorLabel')}</Label>
                  <Input
                    id="businessBrandColor"
                    value={businessBrandColor}
                    onChange={(e) => setBusinessBrandColor(e.target.value)}
                    placeholder={t('profile.edit.business.brandColorPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="businessLogo">{t('profile.edit.business.logoLabel')}</Label>
                  <Input id="businessLogo" type="file" accept="image/*" onChange={handleBusinessLogoChange} />
                  {businessLogoPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={businessLogoPreview} alt={t('profile.edit.business.logoAlt')} className="mt-3 h-16 w-16 rounded border object-cover" />
                  )}
                </div>
                <div>
                  <Label htmlFor="businessTeamMembers">{t('profile.edit.business.teamLabel')}</Label>
                  <Input
                    id="businessTeamMembers"
                    value={teamMembers}
                    onChange={(e) => setTeamMembers(e.target.value)}
                    placeholder={t('profile.edit.business.teamPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('profile.edit.business.teamHelp')}</p>
                </div>
                <div>
                  <Label htmlFor="businessCategories">{t('profile.edit.business.categoriesLabel')}</Label>
                  <Input
                    id="businessCategories"
                    value={customCategories}
                    onChange={(e) => setCustomCategories(e.target.value)}
                    placeholder={t('profile.edit.business.categoriesPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('profile.edit.business.categoriesHelp')}</p>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="email">{t('profile.edit.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('profile.edit.emailPlaceholder')}
              />
            </div>
            {/* Change password toggle */}
            <div className="mt-2">
              <Button type="button" variant="outline" onClick={() => setShowPasswordSection(v => !v)}>
                {showPasswordSection ? t('profile.edit.cancelPasswordChange') : t('profile.edit.changePassword')}
              </Button>
            </div>
            {showPasswordSection && (
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="currentPassword">{t('profile.edit.currentPassword')}</Label>
                  <PasswordInput
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t('profile.edit.currentPasswordPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">{t('profile.edit.newPassword')}</Label>
                  <PasswordInput
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('profile.edit.newPasswordPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmNewPassword">{t('profile.edit.confirmNewPassword')}</Label>
                  <PasswordInput
                    id="confirmNewPassword"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder={t('profile.edit.confirmNewPasswordPlaceholder')}
                  />
                </div>
              </div>
            )}
            <Button type="submit" disabled={loading} className="mt-4">
              {loading ? t('profile.edit.saving') : t('profile.edit.save')}
            </Button>
          </form>
        </CardContent>
      </Card>
      {cropSrc && (
        <CoverCropperDialog
          open={showCropper}
          onOpenChange={(o) => {
            setShowCropper(o);
            if (!o) {
              // Revoke the object URL when dialog closes to avoid memory leaks
              URL.revokeObjectURL(cropSrc);
            }
          }}
          imageSrc={cropSrc}
          aspect={4/1}
          outputWidth={1600}
          outFileName={`cover-${Date.now()}.jpg`}
          onCropped={(file) => {
            setCoverFile(file);
          }}
        />
      )}
    </div>
  );
}
