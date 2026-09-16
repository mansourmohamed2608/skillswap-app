import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getListingById } from '@/services/data';
import { updateListingMobile } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/services/firebase';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '@/lib/errors';
import { findBannedKeywordInFields } from '@/lib/moderation';
import { listingImageExtension, validateListingImage } from '@/lib/listing-image';
import * as Location from 'expo-location';

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [offeredCategory, setOfferedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [requestedTitle, setRequestedTitle] = useState('');
  const [requestedCategory, setRequestedCategory] = useState('');
  const [requestedDescription, setRequestedDescription] = useState('');
  const [requestedKind, setRequestedKind] = useState<'service' | 'product' | 'money'>('service');
  const [requestedProductName, setRequestedProductName] = useState('');
  const [requestedProductDescription, setRequestedProductDescription] = useState('');
  const [requestedMoneyAmount, setRequestedMoneyAmount] = useState('');
  const [requestedMoneyCurrency, setRequestedMoneyCurrency] = useState('USD');
  const [location, setLocation] = useState('');
  const [geo, setGeo] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [locating, setLocating] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState('image/jpeg');
  const [pickedImage, setPickedImage] = useState(false);
  const autoLocationRequestedRef = useRef(false);

  async function formatLocationFromGeo(lat: number, lng: number): Promise<string | undefined> {
    try {
      const rows = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const first = rows?.[0];
      if (!first) return undefined;
      const city = String(first.city || first.subregion || first.region || '').trim();
      const country = String(first.country || '').trim();
      const parts = [city, country].filter(Boolean);
      return parts.length ? parts.join(', ') : undefined;
    } catch {
      return undefined;
    }
  }

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const data = await getListingById(id);
        if (!data) {
          setListing(null);
          return;
        }
        setListing(data);
        setTitle(data.offeredService?.title || '');
        setOfferedCategory(data.offeredService?.category || '');
        setDescription(data.offeredService?.description || '');
        setRequestedTitle(data.requestedService?.title || '');
        setRequestedCategory(data.requestedService?.category || '');
        setRequestedDescription(data.requestedService?.description || '');
        const inferredKind =
          data.requestedKind ||
          (String(data.requestedService?.category || '').toLowerCase() === 'money'
            ? 'money'
            : String(data.requestedService?.category || '').toLowerCase() === 'product'
              ? 'product'
              : 'service');
        setRequestedKind(inferredKind as 'service' | 'product' | 'money');
        setRequestedProductName(data.requestedProduct?.name || '');
        setRequestedProductDescription(data.requestedProduct?.description || '');
        setRequestedMoneyAmount(
          data.requestedMoney?.amount !== undefined && data.requestedMoney?.amount !== null
            ? String(data.requestedMoney.amount)
            : ''
        );
        setRequestedMoneyCurrency(data.requestedMoney?.currency || 'USD');
        setLocation(data.location || '');
        setGeo(data.geo || undefined);
        setImageUri(data.offeredService?.imageUrl || null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled) {
      const asset = res.assets[0];
      const validation = validateListingImage(asset);
      if (validation !== 'VALID') {
        Alert.alert(
          t('common.error') || 'Error',
          validation === 'FILE_TOO_LARGE'
            ? t('listings.image_too_large')
            : t('listings.image_invalid_type'),
        );
        return;
      }
      setImageMimeType(asset.mimeType || 'image/jpeg');
      setImageUri(asset.uri);
      setPickedImage(true);
    }
  }

  async function onSave() {
    if (!id) return;
    if (!user) {
      Alert.alert(t('common.error') || 'Error', t('auth.sign_in_required') || 'Please sign in to continue.');
      return;
    }
    const banned = findBannedKeywordInFields([
      { label: 'title', value: title },
      { label: 'offeredCategory', value: offeredCategory },
      { label: 'description', value: description },
      { label: 'requestedTitle', value: requestedTitle },
      { label: 'requestedCategory', value: requestedCategory },
      { label: 'requestedDescription', value: requestedDescription },
      { label: 'requestedProductName', value: requestedProductName },
      { label: 'requestedProductDescription', value: requestedProductDescription },
      { label: 'requestedMoneyCurrency', value: requestedMoneyCurrency },
      { label: 'location', value: location },
    ]);
    if (banned) {
      Alert.alert(t('common.error') || 'Error', t('errors.codes.content/banned'));
      return;
    }
    if (!title.trim()) return Alert.alert(t('common.error') || 'Error', t('listings.missing_title') || 'Offer title is required.');
    if (!location.trim() && !geo) {
      return Alert.alert(t('common.error') || 'Error', t('listings.form.locationRequired'));
    }
    if (requestedKind === 'service' && !requestedTitle.trim()) {
      return Alert.alert(t('common.error') || 'Error', t('listings.missing_request') || 'Request title is required.');
    }
    if (requestedKind === 'product' && !requestedProductName.trim()) {
      return Alert.alert(t('common.error') || 'Error', t('listings.form.requestedProductRequired'));
    }
    if (requestedKind === 'money') {
      const amount = Number(requestedMoneyAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return Alert.alert(t('common.error') || 'Error', t('listings.form.requestedAmountInvalid'));
      }
      if (!requestedMoneyCurrency.trim()) {
        return Alert.alert(t('common.error') || 'Error', t('listings.form.requestedCurrencyRequired'));
      }
    }
    setSaving(true);
    try {
      let imageUrl = imageUri || undefined;
      if (pickedImage && imageUri && storage) {
        const resp = await fetch(imageUri);
        const buf = await resp.arrayBuffer();
        const key = `listing-images/${user.uid}/${Date.now()}.${listingImageExtension(imageMimeType)}`;
        const r = ref(storage, key);
        await uploadBytes(r, new Uint8Array(buf), { contentType: imageMimeType });
        imageUrl = await getDownloadURL(r);
      }
      let requestedServicePayload: { title: string; category: string; description: string };
      let requestedProductPayload: { name: string; description?: string } | undefined;
      let requestedMoneyPayload: { amount: number; currency: string } | undefined;
      if (requestedKind === 'service') {
        requestedServicePayload = {
          title: requestedTitle.trim(),
          category: requestedCategory.trim() || 'General',
          description: requestedDescription.trim(),
        };
      } else if (requestedKind === 'product') {
        requestedProductPayload = {
          name: requestedProductName.trim(),
          description: requestedProductDescription.trim() || undefined,
        };
        requestedServicePayload = {
          title: requestedProductPayload.name,
          category: 'Product',
          description: requestedProductPayload.description || 'Product exchange',
        };
      } else {
        requestedMoneyPayload = {
          amount: Number(requestedMoneyAmount),
          currency: requestedMoneyCurrency.trim().toUpperCase(),
        };
        requestedServicePayload = {
          title: `${requestedMoneyPayload.amount} ${requestedMoneyPayload.currency}`,
          category: 'Money',
          description: 'Cash payment exchange',
        };
      }
      const payload = {
        offeredService: {
          title: title.trim(),
          category: offeredCategory.trim() || 'General',
          description: description.trim(),
          imageUrl,
        },
        requestedService: requestedServicePayload,
        requestedKind,
        requestedProduct: requestedProductPayload,
        requestedMoney: requestedMoneyPayload,
        location: location.trim(),
        geo,
        status: listing?.status || 'open',
        postedDate: listing?.postedDate || new Date().toISOString(),
      };
      await updateListingMobile(id, payload);
      Alert.alert(t('common.success') || 'Success', t('listings.update_success') || 'Listing updated.');
      router.back();
    } catch (e: any) {
      const msg = e?.status === 403
        ? (t('membership.required') || 'Subscription required.')
        : getErrorMessage(e, t('listings.update_failed') || 'Update failed.');
      Alert.alert(t('common.error') || 'Error', msg);
    } finally {
      setSaving(false);
    }
  }

  async function useCurrentLocation(options?: { auto?: boolean }) {
    const auto = Boolean(options?.auto);
    try {
      setLocating(true);
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        if (!auto) {
          Alert.alert(t('common.error') || 'Error', t('listings.form.locationPermissionDenied'));
        }
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = Number(position.coords.latitude);
      const lng = Number(position.coords.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        if (!auto) {
          Alert.alert(t('common.error') || 'Error', t('listings.form.locationReadFailed'));
        }
        return;
      }
      const resolved = await formatLocationFromGeo(lat, lng);
      if (resolved) setLocation(resolved);
      setGeo({ lat, lng });
    } catch {
      if (!auto) {
        Alert.alert(t('common.error') || 'Error', t('listings.form.locationFetchFailed'));
      }
    } finally {
      setLocating(false);
    }
  }

  useEffect(() => {
    if (loading) return;
    if (autoLocationRequestedRef.current) return;
    if (location.trim() || geo) return;
    autoLocationRequestedRef.current = true;
    void useCurrentLocation({ auto: true });
    // Request once when listing data is ready and location is missing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, location, geo]);

  if (loading) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background')}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background p-6')}>
        <Text style={cn('text-muted-foreground')}>{t('listings.not_found') || 'Listing not found'}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={cn('flex-1')}>
      <View style={cn('flex-1 bg-background px-4 py-3 gap-3')}>
        <Text style={cn('text-xl font-semibold text-foreground')}>{t('listings.edit_title') || 'Edit Listing'}</Text>
        <Text style={cn('text-sm text-muted-foreground')}>{t('forms.offer_title')}</Text>
        <Input value={title} onChangeText={setTitle} />
        <Text style={cn('text-sm text-muted-foreground')}>{t('forms.offer_category') || 'Offer category'}</Text>
        <Input value={offeredCategory} onChangeText={setOfferedCategory} placeholder={t('listings.categoryPlaceholder')} />
        <Text style={cn('text-sm text-muted-foreground')}>{t('forms.description')}</Text>
        <Textarea value={description} onChangeText={setDescription} />
        <Text style={cn('text-sm text-muted-foreground')}>{t('forms.request_title')}</Text>
        <View style={cn('flex-row gap-2')}>
          {(['service', 'product', 'money'] as const).map((kind) => (
            <TouchableOpacity
              key={kind}
              onPress={() => setRequestedKind(kind)}
            style={cn(
              'rounded-full border px-3 py-1.5',
              requestedKind === kind ? 'border-primary bg-primary/10' : 'border-border'
            )}
          >
              <Text style={cn('text-xs text-foreground')}>{t(`listings.form.kind.${kind}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {requestedKind === 'service' ? (
          <>
            <Input value={requestedTitle} onChangeText={setRequestedTitle} />
            <Text style={cn('text-sm text-muted-foreground')}>{t('forms.request_category') || 'Request category'}</Text>
            <Input value={requestedCategory} onChangeText={setRequestedCategory} placeholder={t('listings.categoryPlaceholder')} />
            <Text style={cn('text-sm text-muted-foreground')}>{t('listings.request_description') || 'Request description'}</Text>
            <Textarea value={requestedDescription} onChangeText={setRequestedDescription} />
          </>
        ) : null}
        {requestedKind === 'product' ? (
          <>
            <Input
              value={requestedProductName}
              onChangeText={setRequestedProductName}
              placeholder={t('listings.form.requestedProductPlaceholder')}
            />
            <Textarea
              value={requestedProductDescription}
              onChangeText={setRequestedProductDescription}
              placeholder={t('listings.form.productDetailsPlaceholder')}
            />
          </>
        ) : null}
        {requestedKind === 'money' ? (
          <>
            <Input
              value={requestedMoneyAmount}
              onChangeText={setRequestedMoneyAmount}
              placeholder={t('listings.form.requestedAmountPlaceholder')}
              keyboardType="decimal-pad"
            />
            <Input
              value={requestedMoneyCurrency}
              onChangeText={(v) => setRequestedMoneyCurrency(v.toUpperCase())}
              placeholder={t('listings.form.requestedCurrencyPlaceholder')}
            />
          </>
        ) : null}
        <Text style={cn('text-sm text-muted-foreground')}>{t('listings.location') || 'Location'}</Text>
        <Input value={location} onChangeText={setLocation} />
        <TouchableOpacity
          onPress={() => {
            void useCurrentLocation();
          }}
          disabled={locating}
          style={cn('rounded-lg border border-border px-4 py-2', locating ? 'opacity-70' : '')}
        >
          <Text style={cn('text-center text-foreground')}>
            {locating ? t('listings.form.locating') : t('listings.form.useCurrentLocation')}
          </Text>
        </TouchableOpacity>
        {geo ? (
          <Text style={cn('text-xs text-muted-foreground')}>
            {t('listings.form.locationCaptured')}
          </Text>
        ) : null}
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: '100%', height: 160, borderRadius: 12 }} resizeMode="cover" />
        ) : null}
        <TouchableOpacity onPress={pickImage} style={cn('rounded-lg border border-dashed border-border px-4 py-2')}>
          <Text style={cn('text-center text-foreground')}>{t('listings.upload_image') || 'Upload image'}</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={saving} onPress={onSave} style={cn('rounded-lg bg-primary px-4 py-2')}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={cn('text-center text-primary-foreground font-medium')}>{t('listings.save') || 'Save changes'}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
