# R&O site design integration checklist

Integration branch: `feat/ro-site-design-integration`

Base: `origin/main` at `e9e1525c7545eeb077ecee8b7a0878434555d3f6`

Review date: 2026-10-02

The homepage presentation is client-approved, except for the final lime hero Join correction. All other page treatments are owner-requested extensions and still require design review.

## Shared system

- Implemented: R&O color tokens, light and dark variables, typography, 12px controls, 16px cards, focus states, tactile button states, shared cards, fields, selects, tabs, alerts, skeletons, empty states, header, mobile navigation, and footer.
- Implemented: real auth-aware header states, real search, notifications, messaging links, category data, language switching, and sign-out.
- Implemented: mobile-only session-dismissible Get App banner with an honest in-site destination.
- Preserved: route URLs, query parameters, form fields, API calls, permission checks, membership rules, payment return handling, wallet idempotency, regional restrictions, and user media.

## Routes by function

| Group | Routes | Purpose and key interactions | Integration status |
| --- | --- | --- | --- |
| Homepage | `/` | Real featured listings and wishes, auth-aware Join or Start action, search, categories, subscription entry, listing messaging and detail links | Implemented and ready for visual review |
| Browse | `/listings`, `/search`, `/categories` | Search, category, location, radius and regional filters; result cards; create listing entry | Shared system implemented; route-specific visual review required |
| Listing detail | `/listings/[id]` | Listing information, owner media, message, exchange request, edit and delete for owners | Shared system implemented; route-specific visual review required |
| Listing forms | `/listings/new`, `/listings/[id]/edit` | Existing fields, validation, image handling, membership enforcement and submit states | Shared system implemented; form flow testing required |
| Authentication | `/auth/signin`, `/auth/signup`, `/auth/forgot-password` | Sign in, registration, password recovery, return paths and plan handoff | Shared system implemented; guest-state review required |
| Profile and account | `/profile`, `/profile/[userId]`, `/profile/edit`, `/profile/verify`, `/settings`, `/kyc/verify`, `/kyc/done` | Profile data, listings, reviews, notifications, settings and verification | Shared system implemented; authenticated review required |
| Messaging | `/chat`, `/chat/[chatId]` | Conversation list, composer, eligibility checks and routing | Shared system implemented; authenticated keyboard review required |
| Subscription | `/pricing` | Plan, currency and duration selection; auth return; real or mock checkout routing | Shared system implemented; sandbox-only checkout review required |
| Wallet | `/wallet` | Balance, token purchase, wish contribution, history and idempotency | Shared system implemented; sandbox-only payment review required |
| Wishes | `/wishes`, `/wishes/[id]`, `/wishes/request`, `/wishes/donate` | Browse, request, donate and wallet handoff | Shared system implemented; state-changing tests require sandbox data |
| Bookings | `/bookings`, `/bookings/[id]` | Booking status and existing actions | Shared system implemented; authenticated review required |
| Events | `/events`, `/events/new` | Browse and create events | Shared system implemented; authenticated review required |
| Regional and matching | `/matchmaking`, `/ai` | Matchmaking and regional eligibility behavior | Shared system implemented; entitlement review required |
| Community | `/contributors` | Contributor ranking and profile navigation | Shared system implemented; live-data review required |
| Help and legal | `/support`, `/legal/terms`, `/legal/privacy`, `/legal/community`, `/legal/refund` | Existing help and legal content | Shared system implemented; legal copy unchanged |
| Resilience | `/offline`, global loading, errors and not-found | Offline guidance, skeletons, retry actions and safe navigation | Shared system implemented; direct-load review required |
| Administration | `/admin` | Existing moderation, reports and analytics | Functional styling inherited only; outside the consumer redesign review set |

## Validation status

- English and Arabic RTL: captured and visually reviewed on the homepage.
- Mobile and desktop: captured at 390px, 430px RTL, and 1440px; no horizontal overflow in the automated audit. Tablet is covered by responsive breakpoints but was not separately captured.
- Guest and authenticated: guest state reviewed; authenticated state still requires a test account or emulator session.
- Loading, empty, error and permission states: shared treatments implemented; chat empty state reviewed; data-specific states require emulator or sandbox fixtures.
- Automated visual audit: eight routes returned HTTP 200 with no client-side or hydration errors. The local category API reported backend connection failures because the dependent service on port 5001 was not running.
- Typecheck: passed.
- Unit tests: 21 files and 176 tests passed.
- Lint: passed with 0 errors and 173 existing warnings.
- Production build: passed; all application routes compiled and generated successfully.
- Payment, message send, listing publication and other production writes: not authorized and will not be performed.
