
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
  location?: string; // This will now represent the City
  country?: string;
  // Display-only membership info for profile header
  membershipPlan?: string; // e.g. "Basic" | "Standard" | "Pro" | "Business" | "Free"
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
  kyc?: {
    status?: string;
    provider?: string;
    referenceId?: string;
    updatedAt?: unknown;
    reason?: string;
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
  postedDate: string; // ISO date string
  status: 'open' | 'pending_exchange' | 'completed' | 'cancelled';
  location?: string; // Optional: general location for the service
}

export type ServiceCategory = string;

export interface Notification {
  id: string;
  type: 'review' | 'message' | 'request' | 'system';
  content: string;
  isRead: boolean;
  date: string; // ISO date string
  link?: string;
  userId?: string; // ID of the user who triggered the notification
}
