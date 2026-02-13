/**
 * Configuration constants used throughout the backend.  This file defines
 * subscription plan limits and durations.  Should the business update
 * pricing or quotas later on, these values can be adjusted in one place.
 */

export type SubscriptionPlan = 'Basic' | 'Standard' | 'Pro' | 'Business';

/**
 * Mapping of each plan to the maximum number of active listings a user
 * may have during a billing period.  The Pro and Business tiers have
 * unlimited listings so their limit is represented as `Infinity`.
 */
export const PLAN_LISTING_LIMITS: Record<SubscriptionPlan, number> = {
  Basic: 9,
  Standard: 12,
  Pro: Infinity,
  Business: Infinity,
};

/**
 * Mapping of each plan to the maximum number of bookings a user may
 * schedule during a billing period.  The Pro and Business tiers are
 * unlimited.
 */
export const PLAN_BOOKING_LIMITS: Record<SubscriptionPlan, number> = {
  Basic: 9,
  Standard: 12,
  Pro: Infinity,
  Business: Infinity,
};

/**
 * Mapping of each plan to the maximum number of messages a user may send
 * during a billing period.  Only the basic and standard tiers are
 * constrained.  This can be used by the chat service when implemented.
 */
export const PLAN_MESSAGE_LIMITS: Record<SubscriptionPlan, number> = {
  Basic: 9,
  Standard: 12,
  Pro: Infinity,
  Business: Infinity,
};

/**
 * Mapping of billing durations to a number of months.  These strings
 * correspond to the plan durations offered to customers.  When a
 * subscription is purchased the appropriate duration is looked up
 * here to compute the membership expiry date.
 */
export const DURATION_IN_MONTHS: Record<string, number> = {
  '3_months': 3,
  '6_months': 6,
  '12_months': 12,
};
