export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  coverUrl?: string;
  bio: string;
  servicesOffered: Array<{
    id: string;
    title: string;
    category: string;
    description?: string;
  }>;
  servicesRequested: Array<{
    id: string;
    title: string;
    category: string;
    description?: string;
  }>;
  rating: number;
  reviewsCount: number;
  location?: string;
  country?: string;
  membershipPlan?: string;
  membershipActive?: boolean;
  businessProfile?: {
    name?: string;
    description?: string;
    website?: string;
    brandColor?: string;
    logoUrl?: string;
    teamMembers?: string[];
    customCategories?: string[];
    accountManager?: string;
  };
}

export interface ServiceListing {
  id: string;
  offeredByUserId: string;
  offeredService: {
    title: string;
    category: string;
    description: string;
    imageUrl?: string;
  };
  requestedService: {
    title: string;
    category: string;
    description: string;
  };
  requestedKind?: 'service' | 'product' | 'money';
  requestedProduct?: {
    name: string;
    description?: string;
  };
  requestedMoney?: {
    amount: number;
    currency: string;
  };
  postedDate: string;
  status: 'open' | 'pending_exchange' | 'completed' | 'cancelled' | 'removed';
  location?: string;
  geo?: {
    lat: number;
    lng: number;
  };
}

export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';

export interface BookingRequest {
  id: string;
  listingId: string;
  ownerId: string;
  requesterId: string;
  proposedTime?: string | null;
  message?: string;
  status: BookingStatus;
  createdAt?: string;
}

export interface ChatConversation {
  id: string;
  participants: string[]; // user ids
  lastMessage?: string;
  lastMessageAt?: string;
  perUserLastReadAt?: Record<string, string>;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export type NotificationType = 'review' | 'message' | 'request' | 'system';
export interface Notification {
  id: string;
  type: NotificationType;
  content: string;
  date: string; // ISO
  isRead: boolean;
  userId?: string;
  link?: string;
}
