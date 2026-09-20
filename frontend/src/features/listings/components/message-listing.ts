export function getListingMessagePath(listingId: string, ownerId: string, ownerName?: string | null) {
  const params = new URLSearchParams({ listing: listingId });
  if (ownerName) params.set('name', ownerName);
  return `/chat/${encodeURIComponent(ownerId)}?${params.toString()}`;
}

export function getListingMessageDecision(args: {
  userId?: string | null;
  ownerId: string;
  destination: string;
  membershipLoading: boolean;
  membershipActive: boolean;
  canSendMessage: boolean;
  navigating: boolean;
}): { kind: 'hidden' | 'disabled' | 'navigate'; href?: string } {
  if (args.userId && args.userId === args.ownerId) return { kind: 'hidden' };
  if (!args.ownerId || args.membershipLoading || args.navigating) return { kind: 'disabled' };
  if (!args.userId) {
    return { kind: 'navigate', href: `/auth/signin?next=${encodeURIComponent(args.destination)}` };
  }
  if (!args.membershipActive || !args.canSendMessage) {
    return { kind: 'navigate', href: `/pricing?alert=message-required&next=${encodeURIComponent(args.destination)}` };
  }
  return { kind: 'navigate', href: args.destination };
}
