# Blueprint — Product Requirements Document

## Original Problem Statement
Build a premium, highly personalized fintech mobile app named "Blueprint" with tagline "Architect Your Income." A Fintech Dark Mode theme using black backgrounds, charcoal cards, and "Electric Mint" (#00D95F) accents. The app matches users to income-generating ideas ("Blueprints") using a questionnaire-driven match engine.

## User Personas
- **Aspiring Entrepreneurs:** People looking to start a side income but don't know where to begin
- **Side Hustlers:** People already earning side income who want to scale
- **Architect Tier Users:** Premium subscribers who want AI coaching and advanced strategies

## Core Requirements (Static)

### Branding
- App Name: Blueprint
- Tagline: "Architect Your Income."
- Theme: Fintech Dark Mode — black bg (#000), charcoal cards (#1A1C23), Electric Mint (#00D95F) accents

### Onboarding
- 4-step "Telling Questionnaire": work environment, social preferences, assets, interests
- JWT-based authentication (signup/login)
- Guest mode (preview without account)
- Match Probability Engine calculates 0-100% match scores

### Core Features
- Blueprint library (99+ AI-generated blueprints)
- 17-step actionable plans per blueprint
- Match score per blueprint per user
- Idea saving/tracking with progress bar
- Celebration animations (Lottie) at milestones

### Gamification & Retention
- Daily streak system with check-in
- Daily Blueprint Widget (personalized daily recommendation)
- StreakBadge on home screen

### Discovery Engine (Sprint 4 — COMPLETE)
- Netflix-style Discover screen with 8 category carousels:
  1. Trending in AI (AI & Automation)
  2. High-Ticket Earners (Hard difficulty)
  3. Quick Wins (Low/free startup cost)
  4. Passive Income (Passive & Investment)
  5. Agency Plays (Agency & B2B)
  6. Digital & Content
  7. Local Hustle
  8. No-Code Builders
- Search bar with real-time results
- Filters: category, difficulty, startup cost

### Content
- "Market Pulse" mocked news per blueprint
- "Blueprint Veterans" mocked social proof reviews
- Community Wins Feed (mocked)

### Monetization — Architect Tier ($14.99/mo)
- Stripe integration (test mode, needs live key)
- Paywalled content: steps 6-17 blurred (curiosity gap paywall)
- "Troubleshooting Matrix" AI workarounds per stuck step
- "Blueprint Guide" AI chatbot (Gemini 3 Flash)

---

## Architecture

### Tech Stack
- **Frontend:** React Native + Expo (runs as web via Expo Web)
- **Backend:** FastAPI (Python)
- **Database:** MongoDB (Atlas)
- **AI:** Gemini 3 Flash via `emergentintegrations` (Emergent LLM Key)
- **Payments:** Stripe (test mode)
- **Push Notifications:** expo-notifications

### Key File Structure
```
/app
├── backend/
│   ├── server.py          # All API routes
│   ├── generate_blueprints.js  # One-time content generation script
│   └── .env
└── frontend/
    ├── app/
    │   ├── (tabs)/
    │   │   ├── _layout.tsx         # Tab navigation
    │   │   ├── home.tsx            # Home screen (DailyWidget + ideas)
    │   │   ├── discover.tsx        # v2 Discovery (Netflix-style) [Sprint 4]
    │   │   ├── saved.tsx           # My Plans / Saved blueprints
    │   │   ├── wins.tsx            # Community Wins Feed
    │   │   └── profile.tsx         # User profile + logout
    │   ├── blueprint-detail.tsx    # v2 Detail page (blurred paywall) [Sprint 4]
    │   ├── idea-detail.tsx         # Legacy detail page (ideas collection)
    │   ├── architect-upgrade.tsx   # Stripe upgrade page [Sprint 2]
    │   ├── blueprint-guide.tsx     # AI chatbot [Sprint 2]
    │   ├── streak.tsx              # Streak detail screen [Sprint 3]
    │   └── onboarding/             # 4-step questionnaire
    └── components/
        ├── DailyBlueprintWidget.tsx    # Home + Discover widget [Sprint 4]
        ├── discover/
        │   └── CategoryCarousel.tsx    # Netflix carousel component [Sprint 4]
        ├── BlueprintCard.tsx
        ├── ArchitectPaywall.tsx
        ├── TroubleshootModal.tsx
        ├── StreakBadge.tsx
        ├── MarketPulse.tsx
        ├── BlueprintVeterans.tsx
        └── WinCard.tsx
```

### Key API Endpoints
```
Auth:
  POST /api/users/signup
  POST /api/users/login

Ideas (Legacy — db.ideas, 20 pre-seeded):
  GET  /api/ideas?limit=N
  GET  /api/ideas/personalized/{user_id}
  GET  /api/ideas/{idea_id}
  POST /api/saved-ideas

Blueprints (v2 — db.blueprints, 99 AI-generated):
  GET  /api/blueprints/carousels?user_id=  ← Netflix carousels
  GET  /api/blueprints/search?q=&category=&difficulty=
  GET  /api/blueprints/daily/{user_id}     ← Daily pick
  GET  /api/blueprints/{id}
  GET  /api/blueprints?category=&limit=&skip=

Gamification:
  POST /api/users/{user_id}/streak/checkin
  GET/POST /api/wins

Architect Tier:
  POST /api/payments/create-checkout-session
  POST /api/payments/webhook
  POST /api/blueprint-guide/chat/{user_id}
  GET  /api/blueprint-guide/history/{user_id}/{idea_id}
  POST /api/troubleshoot/{user_id}/{idea_id}/{step_number}
```

### DB Schema
```
users: { id, email, name, password_hash, profile, is_guest, is_architect, 
         stripe_customer_id, streak, last_check_in, push_token }
ideas: { id, title, description, category, action_steps, difficulty, startup_cost,
         potential_earnings, tags, logo, market_pulse_data, veterans_data }
blueprints: { id, title, description, category, version:"2.0", action_steps[17],
              difficulty, startup_cost, potential_earnings, tags, match_tags,
              time_to_first_dollar }
wins: { user_id, idea_id, description, amount, blueprint_title }
saved_ideas: { user_id, idea_id, status, notes, action_steps, progress_percentage }
```

---

## What's Been Implemented

| Sprint | Features | Status | Date |
|--------|----------|--------|------|
| Sprint 1 | Smart Logos, Market Pulse, Blueprint Veterans, Push token | ✅ Done | Early 2026 |
| Sprint 2 | Architect Tier (Stripe), Troubleshoot Matrix, AI Chatbot (Gemini) | ✅ Done | Feb 2026 |
| Sprint 3 | 99-blueprint content factory, Community Wins Feed, Streak System | ✅ Done | Mar 2026 |
| Sprint 4 | v2 Discovery (Netflix carousels), Daily Blueprint Widget, Blurred Paywall | ✅ Done | Mar 2026 |

---

## Prioritized Backlog

### P0 — Critical for Revenue
- [ ] **Stripe Live Key:** Swap test Stripe key for production live key. User must provide live secret key. Without this, no real payments can be processed.

### P1 — High Impact
- [ ] **Push Notification Nudges:** AI-driven proactive re-engagement (e.g., "The Guide found a shortcut for Step 8")
- [ ] **Questionnaire Persistence:** AsyncStorage clears on web page reload; should persist session server-side

### P2 — Improvements
- [ ] **Quick Wins Carousel Diversity:** Currently shows mostly AI & Automation blueprints. Add cross-category filtering to Quick Wins
- [ ] **Live Community Wins:** Replace mocked Community Wins with real user submissions
- [ ] **Live Market Pulse:** Replace mocked news with real RSS/API data
- [ ] **Push Notification Delivery:** expo-notifications configured but not sending

### P3 — Future Backlog
- [ ] Blueprint library expansion to 500+ (run generation script again)
- [ ] User referral/sharing system
- [ ] Revenue tracking dashboard for users
- [ ] Onboarding A/B testing

---

## Mocked / Test Data
- **Community Wins Feed:** Hardcoded mock data in server.py
- **Market Pulse:** Hardcoded per-idea mock news
- **Blueprint Veterans:** Hardcoded mock reviews
- **Stripe:** Test mode (`sk_test_emergent`) — needs live key

## Test Credentials
- Test user created during Sprint 4 testing: `TEST_sprint4_tester@blueprint.com` / `TestPass123`
