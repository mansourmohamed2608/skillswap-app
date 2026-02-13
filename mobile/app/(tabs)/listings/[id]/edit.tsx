import React, { useEffect, useState } from 'react';
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
  const [location, setLocation] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [pickedImage, setPickedImage] = useState(false);

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
        setLocation(data.location || '');
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
      setImageUri(res.assets[0].uri);
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
      { label: 'location', value: location },
    ]);
    if (banned) {
      Alert.alert(t('common.error') || 'Error', t('errors.codes.content/banned'));
      return;
    }
    if (!title.trim()) return Alert.alert(t('common.error') || 'Error', t('listings.missing_title') || 'Offer title is required.');
    if (!requestedTitle.trim()) return Alert.alert(t('common.error') || 'Error', t('listings.missing_request') || 'Request title is required.');
    setSaving(true);
    try {
      let imageUrl = imageUri || undefined;
      if (pickedImage && imageUri && storage) {
        const resp = await fetch(imageUri);
        const buf = await resp.arrayBuffer();
        const key = `listing-images/${user.uid}/${Date.now()}.jpg`;
        const r = ref(storage, key);
        await uploadBytes(r, new Uint8Array(buf), { contentType: 'image/jpeg' });
        imageUrl = await getDownloadURL(r);
      }
      const payload = {
        offeredService: {
          title: title.trim(),
          category: offeredCategory.trim() || 'General',
          description: description.trim(),
          imageUrl,
        },
        requestedService: {
          title: requestedTitle.trim(),
          category: requestedCategory.trim() || 'General',
          description: requestedDescription.trim(),
        },
        location: location.trim(),
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
        <Input value={requestedTitle} onChangeText={setRequestedTitle} />
        <Text style={cn('text-sm text-muted-foreground')}>{t('forms.request_category') || 'Request category'}</Text>
        <Input value={requestedCategory} onChangeText={setRequestedCategory} placeholder={t('listings.categoryPlaceholder')} />
        <Text style={cn('text-sm text-muted-foreground')}>{t('listings.request_description') || 'Request description'}</Text>
        <Textarea value={requestedDescription} onChangeText={setRequestedDescription} />
        <Text style={cn('text-sm text-muted-foreground')}>{t('listings.location') || 'Location'}</Text>
        <Input value={location} onChangeText={setLocation} />
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
