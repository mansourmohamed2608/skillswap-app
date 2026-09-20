import { describe, expect, it } from 'vitest';
import { getListingMessageDecision, getListingMessagePath } from './message-listing';

describe('featured listing Message action', () => {
  const destination = getListingMessagePath('listing/42', 'owner-7', 'Owner Name');

  it('targets the owner and preserves listing context without sending', () => {
    expect(destination).toBe('/chat/owner-7?listing=listing%2F42&name=Owner+Name');
  });

  it('preserves the intended composer through guest sign-in', () => {
    expect(getListingMessageDecision({
      userId: null,
      ownerId: 'owner-7',
      destination,
      membershipLoading: false,
      membershipActive: false,
      canSendMessage: false,
      navigating: false,
    })).toEqual({ kind: 'navigate', href: `/auth/signin?next=${encodeURIComponent(destination)}` });
  });

  it('hides self-messaging', () => {
    expect(getListingMessageDecision({
      userId: 'owner-7', ownerId: 'owner-7', destination,
      membershipLoading: false, membershipActive: true, canSendMessage: true, navigating: false,
    }).kind).toBe('hidden');
  });

  it('uses message eligibility and routes depleted message quota to upgrade', () => {
    expect(getListingMessageDecision({
      userId: 'member-1', ownerId: 'owner-7', destination,
      membershipLoading: false, membershipActive: true, canSendMessage: false, navigating: false,
    })).toEqual({ kind: 'navigate', href: `/pricing?alert=message-required&next=${encodeURIComponent(destination)}` });
  });

  it('allows messaging when message quota remains, independently of booking quota', () => {
    expect(getListingMessageDecision({
      userId: 'member-1', ownerId: 'owner-7', destination,
      membershipLoading: false, membershipActive: true, canSendMessage: true, navigating: false,
    })).toEqual({ kind: 'navigate', href: destination });
  });

  it('disables a repeat click while navigation is pending', () => {
    expect(getListingMessageDecision({
      userId: 'member-1', ownerId: 'owner-7', destination,
      membershipLoading: false, membershipActive: true, canSendMessage: true, navigating: true,
    }).kind).toBe('disabled');
  });
});
