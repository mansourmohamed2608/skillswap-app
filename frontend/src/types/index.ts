
export interface PortfolioItem {
  id?: string;
  title?: string;
  description?: string;
  url?: string;
  fileUrl?: string;
  thumbnail?: string;
  type?: string;
  updatedAt?: unknown;
}

export interface User {
  id: string;
  username?: string;
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
    portfolio?: PortfolioItem[];
  };
  portfolio?: PortfolioItem[];
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
  publicId?: string;
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
  postedDate: string; // ISO date string
  status: 'open' | 'pending_exchange' | 'completed' | 'cancelled' | 'removed';
  location?: string; // Optional: general location for the service
  distanceKm?: number; // Optional: computed at search-time when user location is provided
  geo?: {
    lat: number;
    lng: number;
  };
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

export interface Wish {
  id: string;
  publicId?: string;
  userId: string;
  title: string;
  description: string;
  goalAmount: number;
  totalDonated?: number;
  donationCount?: number;
  currency?: string;
  category?: string;
  status: 'open' | 'fulfilled' | 'closed' | 'cancelled';
  deadline?: string | Date;
  imageUrl?: string | null;
  videoUrl?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type WishSummary = {
  id: string;
  publicId?: string;
  userId?: string;
  title?: string;
  description?: string;
  totalDonated?: number;
  goalAmount?: number;
  currency?: string;
  category?: string;
  status?: 'open' | 'fulfilled' | 'closed' | 'cancelled';
  deadline?: any;
  imageUrl?: string | null;
  videoUrl?: string | null;
};

export interface Contributor {
  id: string;
  name: string;
  displayName?: string;
  profileImage?: string | null;
  totalTokensContributed: number;
  contributionCount: number;
  wishTitle?: string;
  amount: number;
  createdAt: string | Date;
}
