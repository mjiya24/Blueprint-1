# Blueprint — Product Requirements Document

## App Identity
- **App Name**: Blueprint
- **Tagline**: "Blueprint: Architect Your Income."
- **Category**: Fintech / Gig Economy / Personal Finance
- **Platform**: React Native / Expo (iOS + Android + Web)

## Problem Statement
Users want to earn more money but feel overwhelmed by the options and don't know where to start. Most "side hustle" content is generic and not personalized to the user's specific environment, skills, and assets.

## Solution
A premium, highly personalized income aggregator app that:
1. Matches users to their best-fit income opportunities via a questionnaire
2. Provides step-by-step action plans for each opportunity
3. Tracks progress with gamification mechanics (progress bars, milestone animations)
4. Covers all categories: Gig Economy, Local Services, Digital Freelancing, Passive Income

## Design System (Fintech Dark Mode)
- Background: `#000000` (Pitch Black)
- Cards: `#1A1C23` (Sleek Charcoal)
- Accent: `#00D95F` (Electric Mint)
- Text Primary: `#FFFFFF`
- Text Secondary: `#8E8E8E`
- Border: `#2A2C35`

## Technical Architecture
- **Frontend**: React Native + Expo Router (file-based routing)
- **Backend**: FastAPI (Python) — port 8001
- **Database**: MongoDB
- **Auth**: Custom JWT (bcrypt)

## Core User Flows
1. Welcome → Sign Up → 4-Step Questionnaire → Personalized Home
2. Welcome → Preview as Guest → Home (limited features)
3. Home/Discover → Idea Detail → Start Blueprint → Track Steps → Completion

## Features Implemented (v2.0 — Blueprint Sprint)

### Branding
- [x] App name: Blueprint
- [x] Tagline: "Architect Your Income."
- [x] Fintech Dark Mode across all screens

### Authentication
- [x] Signup → redirects to questionnaire (if first time)
- [x] Login → redirects to questionnaire (if no profile) or home
- [x] Guest mode with feature limitations

### 4-Step Questionnaire Onboarding
- [x] Step 1: Work Environment (home / office / outdoor)
- [x] Step 2: Social Preference (solo / small-team / customer-facing)
- [x] Step 3: Assets (car, laptop, $100+ investment) — multi-select
- [x] Step 4: Interests (tech, fitness, pets, real-estate, creative, finance) — multi-select
- [x] Saves to backend on completion

### Match Probability Engine
- [x] Algorithm: 4 dimensions × 25 points each, normalized to 30–99% range
- [x] `GET /api/ideas/personalized/{user_id}` returns ideas sorted by match_score
- [x] UI: colored match badges (green ≥75%, amber ≥50%, red <50%)
- [x] Home screen: top 6 personalized ideas
- [x] Discover screen: all 20 ideas with match scores
- [x] Idea detail: match score banner

### Ideas Database (20 Ideas, 4 Categories)
- [x] Gig Economy (5): DoorDash, Uber/Lyft, Instacart, TaskRabbit, Amazon Flex
- [x] Local & Service Based (5): Fitness Trainer, Dog Walker, Car Detailing, House Sitter, Lawn Care
- [x] Digital & Freelance (5): Web Designer, VA, UGC Creator, Social Media Manager, AI Copywriter
- [x] Passive/Scalable (5): Print-on-Demand, Domain Flipping, Vending Machines, Digital Course, Retail Arbitrage
- [x] Each idea has: environment_fit, social_fit, asset_requirements, interest_tags, affiliate_link

### Gamification (idea-detail.tsx)
- [x] "Start My Blueprint" button — saves idea and reveals interactive checklist
- [x] Interactive action step checkboxes with Electric Mint completion state
- [x] Earnings Progress Bar (animated, Electric Mint)
- [x] 3-Tier celebration animations:
  - Tier 1 (First step): Pulsing Electric Mint checkmark + haptic light
  - Tier 2 (50%): Rising bar chart "Momentum!" notification + haptic medium
  - Tier 3 (100%): Full-screen "Blueprint Complete!" overlay + haptic heavy
- [x] Status tracking: not-started → in-progress → completed

### Guest Gating
- [x] Guests see first 2 action steps
- [x] Steps 3+ locked with "Unlock with free account" message
- [x] Match scores shown as locked for guests
- [x] Upgrade prompts throughout the app

### Push Notifications (Backend)
- [x] `POST /api/users/{user_id}/push-token` endpoint
- [x] `send_expo_push_notification()` function using Expo Push API
- [x] Triggered on 50% milestone ("You're on a roll! 📈")
- [x] Triggered on 100% completion ("Blueprint Complete! 💰")
- [ ] Frontend push token registration (pending)

## Key API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Create account |
| POST | /api/auth/login | Login |
| POST | /api/auth/guest | Create guest session |
| PUT | /api/users/{id}/profile | Update questionnaire + profile |
| GET | /api/ideas | Get all ideas (pagination + filters) |
| GET | /api/ideas/personalized/{user_id} | Get ideas with match scores |
| GET | /api/ideas/{idea_id} | Get single idea |
| POST | /api/saved-ideas | Save/start a blueprint |
| GET | /api/saved-ideas/{user_id}/{idea_id} | Get single saved idea |
| POST | /api/saved-ideas/{user_id}/{idea_id}/complete-step | Complete a step |
| POST | /api/saved-ideas/{user_id}/{idea_id}/uncomplete-step | Uncomplete a step |
| GET | /api/saved-ideas/{user_id} | Get all saved ideas |
| POST | /api/users/{user_id}/push-token | Store push token |

## Prioritized Backlog

### P0 (Critical Next)
- Push notification registration in frontend (questionnaire.tsx → expo-notifications)
- Login with persistent session restore (re-fetch user profile from backend)

### P1 (High Value)
- Social Proof: Review/rating system on idea pages
- Success Stories: User testimonials for each idea category
- Discover Screen: Sort by "Highest Match" or "Lowest Cost"

### P2 (Medium Value)
- Monetization: Premium tier (Stripe/RevenueCat) with paywall for top-ranked ideas
- Live Data Pipeline: Real Fiverr/Upwork job listings via APIs
- Analytics: Mixpanel or Amplitude integration

### P3 (Nice to Have)
- Referral program: share your blueprint progress
- Community: discussion threads per idea category
- Streak system: daily check-in rewards

## Test Credentials
- Email: tester@blueprint.com
- Password: TestPass123
- Profile: Home environment, Solo preference, Laptop asset, Tech + Finance interests

## App URL
https://side-hustle-hub-13.preview.emergentagent.com
