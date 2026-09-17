import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import AppLogo from '@/components/ui/AppLogo';
import { Menu, MessagesSquare } from 'lucide-react-native';
import MobileBurgerMenu from '@/components/layout/MobileBurgerMenu';
import { BlurView } from 'expo-blur';

import { useHeaderFade } from '@/context/HeaderFadeContext';
import { BLUR_INTENSITY_MIN, BLUR_INTENSITY_MAX, OVERLAY_OPACITY_BOTTOM, OVERLAY_OPACITY_TOP, SHADOW_OPACITY_MAX, ELEVATION_MAX } from './constants';
import { useAuth } from '@/context/AuthContext';
import { getUnreadConversationCount, useConversationsRTDB } from '@/services/chatRTDB';

export default function MobileHeader() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const conversations = useConversationsRTDB();
  const unreadChats = getUnreadConversationCount(conversations, user?.uid);
  const { fade, setHeaderHeight } = useHeaderFade();
  const f = Math.min(1, Math.max(0, fade));
  // Match the original fade curve via shared constants
  const overlayOpacity = OVERLAY_OPACITY_TOP - f * (OVERLAY_OPACITY_TOP - OVERLAY_OPACITY_BOTTOM);
  const blurIntensity = Math.round(BLUR_INTENSITY_MIN + f * (BLUR_INTENSITY_MAX - BLUR_INTENSITY_MIN));
  // Keep a subtle, fixed shadow to avoid growing below the header and covering content when scrolled
  const shadowStyle = {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1.5,
    elevation: 1,
  } as const;
  
  return (
    <View style={cn('w-full absolute top-0 left-0 right-0 z-50')} pointerEvents="box-none">
      {/* Foreground container defines height; overlays render behind */}
      <View
        style={[cn('px-4 py-3') as any, shadowStyle]}
        pointerEvents="box-none"
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          if (h) setHeaderHeight(h);
        }}
      >
        {/* Background blur and divider, non-interactive */}
        <BlurView
          pointerEvents="none"
          intensity={blurIntensity}
          tint="default"
          style={[StyleSheet.absoluteFillObject, { borderBottomWidth: 1, borderBottomColor: `rgba(255,255,255,${0.2 * (1 - f)})` }]}
        />
        {/* Translucent overlay using theme background color */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, cn('bg-background'), { opacity: overlayOpacity }]} />

        <View style={cn('mx-auto w-full flex-row items-center justify-between')}>
          <Link href="/" asChild>
            <View style={cn('flex-row items-center gap-2')}>
              <AppLogo size={24} />
              <Text style={cn('text-xl font-bold text-foreground')}>{t('app_name')}</Text>
            </View>
          </Link>
          <View style={cn('flex-row items-center gap-1')}>
            {user ? (
              <Link href="/chat" asChild>
                <TouchableOpacity style={cn('relative p-2 rounded-full bg-background/30')} accessibilityRole="button" accessibilityLabel={t('header.chat') || 'Messages'}>
                  <MessagesSquare size={21} color="#111" />
                  {unreadChats > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{unreadChats > 99 ? '99+' : unreadChats}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </Link>
            ) : null}
            {/* Glassy circular trigger without border */}
            <View style={cn('rounded-full overflow-hidden')}>
              <BlurView pointerEvents="none" intensity={28} tint="light" style={styles.blurCircle} />
              <TouchableOpacity onPress={() => setOpen(true)} style={cn('p-2 rounded-full bg-background/30')} accessibilityRole="button" accessibilityLabel={t('nav.menu') || 'Menu'}>
                <Menu size={22} color="#111" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      <MobileBurgerMenu open={open} onClose={() => setOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  blurCircle: {
    ...StyleSheet.absoluteFillObject,
    // Ensure the blur is clipped to the rounded container
  },
  unreadBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d4642f',
  },
  unreadText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
