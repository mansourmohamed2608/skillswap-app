import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/i18n/config';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'settings-user' }, loading: false }),
}));

import SettingsPage from './page';

const expectedRoutes = [
  ['/profile/edit', 'Edit Profile'],
  ['/profile?tab=notifications', 'Notifications'],
  ['/pricing', 'Membership'],
  ['/profile/verify', 'Identity Verification'],
  ['/profile/edit#account-security', 'Account & Security'],
  ['/support', 'Support'],
] as const;

describe('SettingsPage', () => {
  beforeEach(async () => {
    replace.mockClear();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('renders every setting with a visible label, description, and unchanged route', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Language')).toBeVisible();
    expect(screen.getByText('English / العربية')).toBeVisible();
    for (const [href, label] of expectedRoutes) {
      const link = screen.getByRole('link', { name: new RegExp(label, 'i') });
      expect(link).toBeVisible();
      expect(link).toHaveAttribute('href', href);
    }
    expect(screen.getByText('Update your personal information')).toBeVisible();
    expect(screen.getByText('View notifications and preferences')).toBeVisible();
    expect(screen.getByText('Manage your plan')).toBeVisible();
    expect(screen.getByText('Verify your identity')).toBeVisible();
    expect(screen.getByText('Email, password, and security')).toBeVisible();
    expect(screen.getByText('Help and contact')).toBeVisible();
  });

  it('switches the same compact settings rows to Arabic', async () => {
    render(<SettingsPage />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Switch language to Arabic' }));
    });

    await waitFor(() => expect(screen.getByText('الإعدادات')).toBeVisible());
    expect(screen.getByText('اللغة')).toBeVisible();
    expect(screen.getByText('تعديل الملف الشخصي')).toBeVisible();
    expect(screen.getByText('الإشعارات')).toBeVisible();
    expect(screen.getByText('العضوية')).toBeVisible();
    expect(screen.getByText('التحقق من الهوية')).toBeVisible();
    expect(screen.getByText('الحساب والأمان')).toBeVisible();
    expect(screen.getByText('الدعم')).toBeVisible();
  });
});
