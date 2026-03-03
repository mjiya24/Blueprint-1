# Blueprint — Product Requirements Document

## Original Problem Statement
Build a premium, highly personalized fintech mobile app named "Blueprint" with the tagline "Architect Your Income." The app uses a "Fintech Dark Mode" theme (black backgrounds, charcoal cards, Electric Mint #00D95F accents). Users complete a 4-step questionnaire which feeds a Match Probability Engine that scores income-generating ideas for them.

## Core Requirements
- **Branding**: Blueprint / "Architect Your Income" / Electric Mint fintech dark mode
- **Onboarding**: 4-step questionnaire (work environment, social preferences, assets, interests)
- **Match Engine**: Backend algorithm scores each idea 30–99% based on user profile
- **Gamification**: Interactive checklist, progress bar, Lottie milestone animations (First Step, 50%, 100%)
- **Content**: 20 ideas across 4 categories (Gig Economy, Local, Digital, Passive) with Smart Logos
- **Social Proof**: "Market Pulse" news snippets + "Blueprint Veterans" testimonials per idea
- **Monetization**: "Architect Tier" ($14.99/mo or $99/yr via Stripe) with AI tools
- **AI Support**: "Blueprint Guide" chatbot (Gemini 3 Flash) + "Troubleshooting Matrix"

## Architecture

### Tech Stack
- **Frontend**: React Native (Expo), Expo Router, Lottie, expo-notifications, @expo/vector-icons
- **Backend**: FastAPI (Python), MongoDB (Motor async), JWT auth
- **AI**: emergentintegrations (Gemini 3 Flash via Emergent LLM Key)
- **Payments**: emergentintegrations (Stripe via Emergent test key)

### File Structure
```
/app
├── backend/
│   ├── .env (MONGO_URL, DB_NAME, EMERGENT_LLM_KEY, STRIPE_API_KEY)
│   ├── server.py (main FastAPI app, all routes)
│   └── tests/test_sprint2.py
└── frontend/
    ├── app/
    │   ├── (tabs)/home.tsx, discover.tsx, saved.tsx, profile.tsx
    │   ├── auth/login.tsx, signup.tsx
    │   ├── onboarding/questionnaire.tsx
    │   ├── idea-detail.tsx
    │   ├── architect-upgrade.tsx (NEW - Sprint 2)
    │   └── blueprint-guide.tsx (NEW - Sprint 2)
    └── components/
        ├── icons/index.tsx (Smart Logos)
        ├── MarketPulse.tsx
        ├── BlueprintVeterans.tsx
        ├── ArchitectPaywall.tsx (NEW - Sprint 2)
        ├── TroubleshootModal.tsx (NEW - Sprint 2)
        ├── EarningsProgressBar.tsx
        └── CelebrationAnimation.tsx
```

### Key DB Collections
- `users`: { id, email, hashed_password, name, profile, is_architect, push_token }
- `ideas`: { id, title, description, category, tags, action_steps, ... }
- `saved_ideas`: { user_id, idea_id, action_steps (with completion), progress_percentage }
- `payment_transactions`: { session_id, user_id, plan_type, amount, payment_status }
- `chat_messages`: { session_id, user_id, idea_id, role, content, created_at }

### Key API Endpoints
| Endpoint | Method | Description |
|---|---|---|
| /api/signup | POST | Register user |
| /api/login | POST | Login, returns is_architect |
| /api/users/{id}/profile | PUT | Save questionnaire answers |
| /api/users/{id}/push-token | POST | Register push token |
| /api/ideas | GET | All ideas (20) |
| /api/ideas/personalized/{user_id} | GET | Match-scored ideas |
| /api/ideas/{id} | GET | Single idea detail |
| /api/saved-ideas/{user_id} | GET | User's saved ideas |
| /api/saved-ideas/{user_id}/{idea_id}/complete-step | POST | Mark step complete |
| /api/payments/checkout | POST | Create Stripe checkout session |
| /api/payments/status/{session_id} | GET | Poll payment status |
| /api/payments/subscription/{user_id} | GET | Check architect status |
| /api/webhook/stripe | POST | Stripe webhook handler |
| /api/high-ticket-ideas | GET | 5 premium blueprint ideas |
| /api/blueprint-guide/chat/{user_id} | POST | AI chat (Architect only) |
| /api/blueprint-guide/history/{user_id}/{idea_id} | GET | Chat history |
| /api/troubleshoot/{user_id}/{idea_id}/{step_number} | POST | Get AI workarounds |

## What's Been Implemented

### Sprint 0 — V1 MVP (Complete)
- Auth (signup/login/guest mode), tab navigation, idea browsing

### Blueprint Sprint (Complete)
- Full rebranding to Blueprint + Fintech Dark Mode theme
- 4-step onboarding questionnaire
- Backend Match Probability Engine (30–99% scoring)
- Full gamification: checklist, progress bar, Lottie animations
- 27/27 backend tests passing

### Sprint 1 — Polish & Retention (Complete, Feb 2026)
- Smart Logos (IdeaIcon component) on discover cards + idea detail header
- Market Pulse (mocked news per idea) on idea detail
- Blueprint Veterans (mocked testimonials per idea) on idea detail
- Push token registration (expo-notifications) on questionnaire completion

### Sprint 2 — Monetization & AI (Complete, Mar 2026)
- **Architect Tier**: Stripe subscription ($14.99/mo or $99/yr)
  - Checkout session creation + payment polling
  - Stripe webhook handler
  - `is_architect` field on user, returned in login/signup responses
- **High-Ticket Blueprints**: 5 ideas marked with gold "High-Ticket" badge
  - IDs: digital-001, digital-005, passive-002, passive-003, passive-004
- **Architect Upgrade Screen** (`/architect-upgrade`): Full plan selection + Stripe redirect + success state
- **Blueprint Guide** (`/blueprint-guide`): AI chat accountability coach (Gemini 3 Flash, Architect-only)
  - Context-aware: reads user's active blueprint + progress
  - Session persistence via MongoDB + in-memory LlmChat sessions
- **Troubleshooting Matrix**: AI-generated 3 workarounds per stuck step (Architect-only)
  - "Stuck? Get Workaround ⚡" button on each uncompleted step
  - TroubleshootModal shows difficulty + time-to-implement for each workaround
- **ArchitectPaywall modal**: Shown when non-Architect tries to access locked features
- **Architect Banner** on Home: Shown to logged-in non-Architect users
- **Testing**: 17/17 backend tests + 14/14 frontend Sprint 2 scenarios verified

## Prioritized Backlog

### P0 — Next Sprint
- None currently (all sprints complete)

### P1 — High Priority
- **Sprint 3: Retention & Analytics**
  - Streak system (daily check-ins)
  - Push notification triggers on milestone completion
  - User analytics dashboard (total progress, earnings unlocked)
- **Real Stripe webhook** (currently using test key — needs live key for production)

### P2 — Medium Priority
- Live data integration (Fiverr/Upwork APIs for real listings)
- Persistent login session restore (currently AsyncStorage only)
- Social sharing (share blueprint progress)
- Referral program

### P3 — Backlog / Future
- Architect cancellation flow (subscription management)
- Mixpanel/Amplitude analytics
- Native app build (iOS/Android) for real push notifications
- Admin dashboard for content management
- A/B testing framework for paywall conversion
