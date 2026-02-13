import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import React, { useState } from 'react';
import { createListing } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
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
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);

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
        { label: 'description', value: description },
      ]);
      if (banned) {
        Alert.alert(t('common.error') || 'Error', t('errors.codes.content/banned'));
        return;
      }
      if (!title.trim()) return Alert.alert(t('common.error') || 'Error', t('listings.validation.offerTitleRequired'));
      if (!requestedTitle.trim()) return Alert.alert(t('common.error') || 'Error', t('listings.validation.requestTitleRequired'));
      let imageUrl: string | undefined;
      if (image && storage) {
        const resp = await fetch(image);
        const buf = await resp.arrayBuffer();
        const key = `listing-images/${user.uid}/${Date.now()}.jpg`;
        const r = ref(storage, key);
        await uploadBytes(r, new Uint8Array(buf), { contentType: 'image/jpeg' });
        imageUrl = await getDownloadURL(r);
      }
      const res = await createListing({
        offeredService: { title, category: offeredCategory.trim() || 'General', description, imageUrl },
        requestedService: { title: requestedTitle, category: requestedCategory.trim() || 'General', description: '' },
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={cn('flex-1')}>
    <View style={cn('flex-1 bg-background px-4 py-3')}>
      <Text style={cn('mb-3 text-lg font-semibold text-foreground')}>{t('listings.create')}</Text>
      <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('forms.offer_title')}</Text>
      <Input className="mb-3" value={title} onChangeText={setTitle} />
      <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('forms.offer_category') || 'Offer category'}</Text>
      <Input className="mb-3" value={offeredCategory} onChangeText={setOfferedCategory} placeholder={t('listings.categoryPlaceholder')} />
      <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('forms.request_title')}</Text>
      <Input className="mb-3" value={requestedTitle} onChangeText={setRequestedTitle} />
      <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('forms.request_category') || 'Request category'}</Text>
      <Input className="mb-3" value={requestedCategory} onChangeText={setRequestedCategory} placeholder={t('listings.categoryPlaceholder')} />
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
