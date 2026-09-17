import React, { useEffect, useRef } from 'react';
import { Alert, Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Link } from 'expo-router';
import { Home, List, Sparkles, Gem, LogIn, UserPlus, X, CalendarDays, User, LifeBuoy, CalendarCheck, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';
import { setLanguage } from '@/lib/i18n';

export interface MobileBurgerMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileBurgerMenu({ open, onClose }: MobileBurgerMenuProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const lang = (i18n.language as 'en' | 'ar') || 'en';
  const slideX = useRef(new Animated.Value(280)).current;

  // Safely translate: if the key is missing, fall back to a friendly label
  const label = (key: string, fallback: string) => {
    const result = t(key as any);
    return result === key ? fallback : result;
  };

  // Mirror frontend nav structure
  const publicNav = [
    { href: '/', label: label('header.home', 'Home'), icon: Home },
    { href: '/listings', label: label('header.listings', 'Listings'), icon: List },
    { href: '/events', label: label('events.title', 'Community Events'), icon: CalendarCheck },
    { href: '/matchmaking', label: label('header.matchmaking', 'AI Matchmaking'), icon: Sparkles },
    { href: '/pricing', label: label('header.pricing', 'Subscription Plans'), icon: Gem },
    { href: '/support', label: label('header.support', 'Support'), icon: LifeBuoy },
  ];
  const privateNav = [
    { href: '/bookings', label: label('header.bookings', 'Bookings'), icon: CalendarDays },
    { href: '/profile', label: label('header.profile', 'Profile'), icon: User },
    { href: '/settings', label: label('nav.mobile.settings', 'Settings'), icon: Settings },
  ];
  const authNav = [
    { href: '/auth/signin', label: label('header.signIn', 'Sign In'), icon: LogIn },
    { href: '/auth/signup', label: label('header.signUp', 'Sign Up'), icon: UserPlus },
  ];

  useEffect(() => {
    if (open) {
      Animated.timing(slideX, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    } else {
      slideX.setValue(280);
    }
  }, [open]);

  const handleClose = () => {
    Animated.timing(slideX, { toValue: 280, duration: 200, useNativeDriver: true }).start(() => {
      onClose();
    });
  };

  function Item({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
    return (
      <Link href={href} asChild>
        <TouchableOpacity onPress={handleClose} style={styles.itemRow}>
          <Icon size={18} color="#111" />
          <Text style={styles.itemText}>{label}</Text>
        </TouchableOpacity>
      </Link>
    );
  }

  return (
    <Modal visible={open} transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} />
        <Animated.View style={[styles.sheet, cn('bg-background'), { transform: [{ translateX: slideX }] }]}>          
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <X size={20} color="#111" />
          </TouchableOpacity>

          {/* Public */}
          {publicNav.map((n) => (
            <Item key={n.href} href={n.href} icon={n.icon} label={n.label} />
          ))}

          <View style={styles.separator} />
          {user
            ? privateNav.map((n) => <Item key={n.href} href={n.href} icon={n.icon} label={n.label} />)
            : authNav.map((n) => <Item key={n.href} href={n.href} icon={n.icon} label={n.label} />)
          }

          <View style={styles.separator} />
          <View style={styles.langRow}>
            {lang === 'en' ? (
              <TouchableOpacity
                onPress={() => {
                  const { requiresRestart } = setLanguage('ar');
                  if (requiresRestart) {
                    Alert.alert(t('nav.restartRequiredTitle'), t('nav.restartRequiredRtlBody'));
                  }
                }}
              >
                <Text style={styles.langLink}>العربية</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  const { requiresRestart } = setLanguage('en');
                  if (requiresRestart) {
                    Alert.alert(t('nav.restartRequiredTitle'), t('nav.restartRequiredLtrBody'));
                  }
                }}
              >
                <Text style={styles.langLink}>English</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'stretch' },
  backdrop: { flex: 1 },
  sheet: { width: 280, backgroundColor: '#fff', padding: 16, paddingTop: 40, borderLeftWidth: 1, borderLeftColor: '#e5e7eb', height: '100%', alignSelf: 'stretch' },
  closeBtn: { position: 'absolute', right: 12, top: 12, padding: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  itemText: { fontSize: 16, color: '#111', fontWeight: '500' },
  separator: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
  langRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  langLink: { fontSize: 16, color: '#111' },
});
