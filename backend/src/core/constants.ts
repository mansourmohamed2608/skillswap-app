/**
 * Configuration constants used throughout the backend.  This file defines
 * subscription plan limits and durations.
 */

export type SubscriptionPlan = 'Basic' | 'Standard' | 'Pro' | 'Business';

export const PLAN_LISTING_LIMITS: Record<SubscriptionPlan, number> = {
  Basic: 9,
  Standard: 12,
  Pro: Infinity,
  Business: Infinity,
};

export const PLAN_BOOKING_LIMITS: Record<SubscriptionPlan, number> = {
  Basic: 9,
  Standard: 12,
  Pro: Infinity,
  Business: Infinity,
};

export const PLAN_MESSAGE_LIMITS: Record<SubscriptionPlan, number> = {
  Basic: 9,
  Standard: 12,
  Pro: Infinity,
  Business: Infinity,
};

export const DURATION_IN_MONTHS: Record<string, number> = {
  '3_months': 3,
  '6_months': 6,
  '12_months': 12,
};
