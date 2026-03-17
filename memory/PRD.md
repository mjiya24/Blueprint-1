# Blueprint — Product Requirements Document

## Original Problem Statement
Build a premium, highly personalized fintech mobile app named "Blueprint" with the tagline "Architect Your Income." The app uses a "Fintech Dark Mode" theme (black backgrounds, charcoal cards, Electric Mint #00D95F accents). Users complete a 4-step questionnaire which feeds a Match Probability Engine that scores income-generating ideas for them.

## Core Requirements
- **Branding**: Blueprint / "Architect Your Income" / Electric Mint fintech dark mode
- **Onboarding**: 4-step questionnaire (work environment, social preferences, assets, interests)
- **Match Engine**: Backend algorithm scores each idea 30–99% based on user profile
- **Gamification**: Interactive checklist, progress bar, Lottie milestone animations (First Step, 50%, 100%)
- **Content**: 20 curated ideas + 99 AI-generated blueprints (v2.0 with 17-step format)
- **Social Proof**: Market Pulse news + Blueprint Veterans testimonials + Community Wins Feed
- **Monetization**: "Architect Tier" ($14.99/mo or $99/yr via Stripe)
- **AI Support**: Blueprint Guide chatbot (Gemini 3 Flash) + Troubleshooting Matrix
- **Retention**: Streak system, Community Wins Feed, Win Upload flow

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
│   ├── .env
│   ├── server.py (~1400 lines)
│   ├── content_engine.py (100-niche generator)
│   └── tests/test_sprint3.py
└── frontend/
    ├── app/
    │   ├── (tabs)/home.tsx, discover.tsx, wins.tsx, saved.tsx, profile.tsx
    │   ├── auth/login.tsx, signup.tsx
    │   ├── onboarding/questionnaire.tsx
    │   ├── idea-detail.tsx
    │   ├── architect-upgrade.tsx
    │   ├── blueprint-guide.tsx
    │   ├── submit-win.tsx
    │   └── streak.tsx
    └── components/
        ├── icons/index.tsx
        ├── MarketPulse.tsx
        ├── BlueprintVeterans.tsx
        ├── ArchitectPaywall.tsx
        ├── TroubleshootModal.tsx
        ├── WinCard.tsx
        ├── StreakBadge.tsx
        ├── EarningsProgressBar.tsx
        └── CelebrationAnimation.tsx
```

### Key DB Collections
- `users`: { id, email, hashed_password, name, profile, is_architect, push_token, streak_current, streak_longest, streak_last_action }
- `ideas`: { id, title, description, category, tags, action_steps (5-10 steps), ... }
- `blueprints`: { id (bp-xxx), title, category, tags, difficulty_score, 17 action_steps (5 free + 12 locked), version: "2.0", status: "AI-Drafted" }
- `saved_ideas`: { user_id, idea_id, action_steps (with completion), progress_percentage }
- `payment_transactions`: { session_id, user_id, plan_type, amount, payment_status }
- `chat_messages`: { session_id, user_id, idea_id, role, content, created_at }
- `community_wins`: { id, user_id, user_name, earnings_amount, blueprint_title, category, quote, verified, upvotes, created_at }

## What's Been Implemented

### Sprint 0 — V1 MVP (Complete)
- Auth (signup/login/guest mode), tab navigation, idea browsing

### Blueprint Sprint (Complete)
- Full rebranding to Blueprint + Fintech Dark Mode
- 4-step onboarding questionnaire + Match Probability Engine
- Full gamification: checklist, progress bar, Lottie animations (27/27 tests)

### Sprint 1 — Polish & Retention (Complete)
- Smart Logos, Market Pulse (mocked news), Blueprint Veterans (mocked testimonials)
- Push token registration (expo-notifications)

### Sprint 2 — Monetization & AI (Complete)
- Architect Tier: Stripe subscription ($14.99/mo, $99/yr), checkout + webhook + is_architect on login
- Blueprint Guide AI: Gemini 3 Flash accountability coach (Architect-only, context-aware)
- Troubleshooting Matrix: "Stuck?" button per step → 3 AI workarounds (Architect-only)
- Architect Upgrade Screen, ArchitectPaywall modal
- High-Ticket Badges on 5 premium ideas

### Sprint 3 — Content Engine + Retention (Complete, Mar 2026)
- **Content Engine**: 99/100 blueprints generated (Gemini 3 Flash, 17-step format, 5 free + 12 locked steps)
  - 100 niches across: AI & Automation, No-Code & SaaS, Digital & Content, Agency & B2B, Local & Service, Passive & Investment
  - Batch generation via `/api/admin/generate-blueprints` with progress tracking
- **Community Wins Feed**: New "Wins" tab (5th tab) with 10 seeded verified wins ($44K+ total earned)
  - Category filtering, real-time stats bar, upvote system
  - Submit Win flow (`/submit-win`) — Architect-gated, pre-fills from saved blueprints
- **Streak System**: Daily check-in on app load, flame badge in home header, `/streak` screen with milestone tracker
- **Testing**: Backend 34/34 tests, all bugs from testing agent fixed (streak route, architect gate, upvote count)

## Prioritized Backlog

### P0 — Next
- **Stripe Live Keys**: Swap `sk_test_emergent` for production Stripe key (user to provide `sk_live_...`)
- **Blueprints v2 browsable in app**: `/api/blueprints` exists but no dedicated discovery page for 99 AI-generated blueprints

### P1 — High Priority
- **Blueprint v2 Discovery Screen**: Browse/search all 99 AI blueprints with category filters + 17-step preview
- **Proactive AI Push Nudges**: "The Guide found a shortcut for Step 8. Check it out." server-sent notifications
- **Win Verification Flow**: Admin endpoint to mark wins as verified (Proof of Work Loop)
- **Sprint 4**: Real Stripe live integration, blueprint v2 detail page

### P2 — Medium Priority
- Live data (Fiverr/Upwork APIs for signal-based niche discovery)
- Social sharing (share blueprint progress or wins)
- Referral program
- Architect cancellation/management flow

### P3 — Backlog
- Analytics (Mixpanel/Amplitude)
- Native build (iOS/Android) for real push notifications
- Admin dashboard for content management
- A/B testing for paywall conversion
