import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { createListing } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/services/firebase';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/errors';
import { findBannedKeywordInFields } from '@/lib/moderation';

export default function NewListingScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [requestedTitle, setRequestedTitle] = useState('');
  const [offeredCategory, setOfferedCategory] = useState('');
  const [requestedCategory, setRequestedCategory] = useState('');
  const [requestedKind, setRequestedKind] = useState<'service' | 'product' | 'money'>('service');
  const [requestedProductName, setRequestedProductName] = useState('');
  const [requestedProductDescription, setRequestedProductDescription] = useState('');
  const [requestedMoneyAmount, setRequestedMoneyAmount] = useState('');
  const [requestedMoneyCurrency, setRequestedMoneyCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [geo, setGeo] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [locating, setLocating] = useState(false);
  const [image, setImage] = useState<string | null>(null);
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

  async function onSubmit() {
    try {
      if (!user) {
        Alert.alert(t('common.error') || 'Error', t('auth.sign_in_required'));
        return;
      }
      const banned = findBannedKeywordInFields([
        { label: 'title', value: title },
        { label: 'requestedTitle', value: requestedTitle },
        { label: 'offeredCategory', value: offeredCategory },
        { label: 'requestedCategory', value: requestedCategory },
        { label: 'requestedProductName', value: requestedProductName },
        { label: 'requestedProductDescription', value: requestedProductDescription },
        { label: 'requestedMoneyCurrency', value: requestedMoneyCurrency },
        { label: 'location', value: location },
        { label: 'description', value: description },
      ]);
      if (banned) {
        Alert.alert(t('common.error') || 'Error', t('errors.codes.content/banned'));
        return;
      }
      if (!title.trim()) return Alert.alert(t('common.error') || 'Error', t('listings.validation.offerTitleRequired'));
      if (!location.trim() && !geo) {
        return Alert.alert(t('common.error') || 'Error', t('listings.form.locationRequired'));
      }
      if (requestedKind === 'service' && !requestedTitle.trim()) {
        return Alert.alert(t('common.error') || 'Error', t('listings.validation.requestTitleRequired'));
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
      let imageUrl: string | undefined;
      if (image && storage) {
        const resp = await fetch(image);
        const buf = await resp.arrayBuffer();
        const key = `listing-images/${user.uid}/${Date.now()}.jpg`;
        const r = ref(storage, key);
        await uploadBytes(r, new Uint8Array(buf), { contentType: 'image/jpeg' });
        imageUrl = await getDownloadURL(r);
      }
      let requestedServicePayload: { title: string; category: string; description: string };
      let requestedProductPayload: { name: string; description?: string } | undefined;
      let requestedMoneyPayload: { amount: number; currency: string } | undefined;
      if (requestedKind === 'service') {
        requestedServicePayload = {
          title: requestedTitle.trim(),
          category: requestedCategory.trim() || 'General',
          description: '',
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
      const res = await createListing({
        offeredService: { title, category: offeredCategory.trim() || 'General', description, imageUrl },
        requestedService: requestedServicePayload,
        requestedKind,
        requestedProduct: requestedProductPayload,
        requestedMoney: requestedMoneyPayload,
        location: location.trim(),
        geo,
        status: 'open'
      });
      Alert.alert(t('common.success') || 'Success', t('listings.created', { id: res.id }));
    } catch (e: any) {
      Alert.alert(t('common.error') || 'Error', getErrorMessage(e, t('errors.generic')));
    }
  }
  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled) setImage(res.assets[0].uri);
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
    if (autoLocationRequestedRef.current) return;
    autoLocationRequestedRef.current = true;
    void useCurrentLocation({ auto: true });
    // Request once on first screen open; manual button remains for retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={cn('flex-1')}>
    <View style={cn('flex-1 bg-background px-4 py-3')}>
      <Text style={cn('mb-3 text-lg font-semibold text-foreground')}>{t('listings.create')}</Text>
      <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('forms.offer_title')}</Text>
      <Input className="mb-3" value={title} onChangeText={setTitle} />
      <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('forms.offer_category') || 'Offer category'}</Text>
      <Input className="mb-3" value={offeredCategory} onChangeText={setOfferedCategory} placeholder={t('listings.categoryPlaceholder')} />
      <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('forms.request_title')}</Text>
      <View style={cn('mb-3 flex-row gap-2')}>
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
          <Input className="mb-3" value={requestedTitle} onChangeText={setRequestedTitle} />
          <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('forms.request_category') || 'Request category'}</Text>
          <Input className="mb-3" value={requestedCategory} onChangeText={setRequestedCategory} placeholder={t('listings.categoryPlaceholder')} />
        </>
      ) : null}
      {requestedKind === 'product' ? (
        <>
          <Input
            className="mb-3"
            value={requestedProductName}
            onChangeText={setRequestedProductName}
            placeholder={t('listings.form.requestedProductPlaceholder')}
          />
          <Textarea
            className="mb-3"
            value={requestedProductDescription}
            onChangeText={setRequestedProductDescription}
            placeholder={t('listings.form.productDetailsPlaceholder')}
          />
        </>
      ) : null}
      {requestedKind === 'money' ? (
        <>
          <Input
            className="mb-3"
            value={requestedMoneyAmount}
            onChangeText={setRequestedMoneyAmount}
            placeholder={t('listings.form.requestedAmountPlaceholder')}
            keyboardType="decimal-pad"
          />
          <Input
            className="mb-3"
            value={requestedMoneyCurrency}
            onChangeText={(v) => setRequestedMoneyCurrency(v.toUpperCase())}
            placeholder={t('listings.form.requestedCurrencyPlaceholder')}
          />
        </>
      ) : null}
      <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('listings.location') || 'Location'}</Text>
      <Input className="mb-3" value={location} onChangeText={setLocation} placeholder={t('listings.locationPlaceholder') || 'City, Country'} />
      <TouchableOpacity
        onPress={useCurrentLocation}
        disabled={locating}
        style={cn('mb-3 rounded-lg border border-border px-4 py-2', locating ? 'opacity-70' : '')}
      >
        <Text style={cn('text-center text-foreground')}>
          {locating ? t('listings.form.locating') : t('listings.form.useCurrentLocation')}
        </Text>
      </TouchableOpacity>
      {geo ? (
        <Text style={cn('mb-3 text-xs text-muted-foreground')}>
          {t('listings.form.locationCaptured')}
        </Text>
      ) : null}
      <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('forms.description')}</Text>
      <Textarea className="mb-3" value={description} onChangeText={setDescription} />
      {image ? (
        <Image
          source={{ uri: image }}
          style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }}
          resizeMode="cover"
        />
      ) : null}
      <TouchableOpacity onPress={pickImage} style={cn('mb-4 rounded-lg border border-dashed border-border px-4 py-2')}>
        <Text style={cn('text-center text-foreground')}>{t('listings.upload_image')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSubmit} style={cn('rounded-lg bg-primary px-4 py-2')}>
        <Text style={cn('text-center text-primary-foreground font-medium')}>{t('actions.submit')}</Text>
      </TouchableOpacity>
    </View>
    </KeyboardAvoidingView>
  );
}
