import { View, Text, TextInput, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auth } from '@/services/firebase';
import { createWishMobile } from '@/services/api';
import { cn } from '@/lib/cn';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { getErrorMessage } from '@/lib/errors';

export default function RequestWishScreen() {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [category, setCategory] = useState('');
  const WISH_CATEGORIES = [
    'education', 'healthcare', 'housing', 'food', 'employment', 'community', 'other',
  ] as const;
  const [deadline, setDeadline] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const { setFade } = useHeaderFade();

  // Ensure solid header at top when landing on this non-scroll screen
  useEffect(() => { setFade(0); }, [setFade]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={cn('flex-1')}>
      <ScrollView style={cn('flex-1 bg-background')} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={cn('mb-3 text-lg font-semibold text-foreground')}>{t('wishes.request')}</Text>
        <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('forms.request_title')}</Text>
        <TextInput value={title} onChangeText={setTitle} style={cn('mb-3 rounded-lg border border-border bg-card px-3 py-2')} />
        <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('forms.description')}</Text>
        <TextInput value={details} onChangeText={setDetails} style={cn('mb-4 rounded-lg border border-border bg-card px-3 py-2')} multiline />
        <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('donation.amount')}</Text>
        <TextInput keyboardType="number-pad" value={goalAmount} onChangeText={setGoalAmount} style={cn('mb-3 rounded-lg border border-border bg-card px-3 py-2')} />
        <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('wishes.category') || 'Category (optional)'}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {WISH_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(category === cat ? '' : cat)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                backgroundColor: category === cat ? '#2b6b4f' : undefined,
                borderColor: category === cat ? '#2b6b4f' : '#d1d5db',
              }}
            >
              <Text style={{ color: category === cat ? '#ffffff' : undefined, fontSize: 13 }}>
                {t(`wishes.request.categories.${cat}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('wishes.deadline') || 'Deadline (optional)'}</Text>
        <TextInput value={deadline} onChangeText={setDeadline} placeholder={t('wishes.request.deadlinePlaceholder')} style={cn('mb-3 rounded-lg border border-border bg-card px-3 py-2')} />
        <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('wishes.image_url') || 'Image URL (optional)'}</Text>
        <TextInput value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" style={cn('mb-3 rounded-lg border border-border bg-card px-3 py-2')} />
        <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('wishes.video_url') || 'Video URL (optional)'}</Text>
        <TextInput value={videoUrl} onChangeText={setVideoUrl} autoCapitalize="none" style={cn('mb-4 rounded-lg border border-border bg-card px-3 py-2')} />
        <TouchableOpacity
          style={cn('rounded-lg bg-primary px-4 py-2')}
          onPress={async () => {
            try {
                  if (!auth?.currentUser) throw new Error(t('auth.sign_in_required'));
                  const amt = Number(goalAmount) || 0;
                  if (!title.trim() || !details.trim() || !(amt > 0)) throw new Error(t('wishes.request.validationMissing'));
                  await createWishMobile({
                    title: title.trim(),
                    description: details.trim(),
                    goalAmount: amt,
                    currency: 'EGP',
                    category: category.trim() || undefined,
                    deadline: deadline.trim() || undefined,
                    imageUrl: imageUrl.trim() || undefined,
                    videoUrl: videoUrl.trim() || undefined,
                  });
              Alert.alert(t('common.success') || 'Success', t('wishes.request.submittedTitle'));
              setTitle('');
              setDetails('');
              setGoalAmount('');
              setCategory('');
              setDeadline('');
              setImageUrl('');
              setVideoUrl('');
            } catch (e: any) {
              Alert.alert(t('common.error') || 'Error', getErrorMessage(e, t('errors.generic')));
            }
          }}
        >
          <Text style={cn('text-center font-medium text-primary-foreground')}>{t('actions.submit')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
