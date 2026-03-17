from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import bcrypt
from bson import ObjectId
import httpx
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============= Models =============

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    interests: List[str] = []
    skills: List[str] = []
    budget: str = ""
    time_availability: str = ""
    location: Optional[Dict[str, float]] = None
    # Blueprint questionnaire fields
    environment: str = ""          # home, office, outdoor
    social_preference: str = ""    # solo, small-team, customer-facing
    assets: List[str] = []         # car, laptop, investment
    questionnaire_interests: List[str] = []  # tech, fitness, pets, real-estate, creative, finance
    push_token: str = ""           # Expo push notification token
    # Sprint 5: Geolocation
    city: str = ""
    state: str = ""
    country: str = ""
    country_code: str = ""
    currency_code: str = ""
    currency_symbol: str = ""

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    password_hash: str
    profile: UserProfile = UserProfile()
    is_guest: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GuestUser(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Guest"
    is_guest: bool = True
    profile: UserProfile = UserProfile()
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ActionStep(BaseModel):
    step_number: int
    text: str
    completed: bool = False
    completed_at: Optional[datetime] = None
    is_scary_step: bool = False

class SavedIdea(BaseModel):
    user_id: str
    idea_id: str
    status: str = "saved"
    notes: str = ""
    saved_at: datetime = Field(default_factory=datetime.utcnow)
    action_steps: List[Dict[str, Any]] = []
    progress_percentage: int = 0
    earnings_unlocked: bool = False

# ============= Helper Functions =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def calculate_match_score(user_profile: dict, idea: dict) -> int:
    """Calculate 0-100% match score based on Blueprint questionnaire alignment"""
    has_questionnaire = any([
        user_profile.get("environment"),
        user_profile.get("social_preference"),
        user_profile.get("assets"),
        user_profile.get("questionnaire_interests")
    ])
    if not has_questionnaire:
        return 50

    score = 0

    # 1. Environment match (25 pts)
    env = user_profile.get("environment", "")
    env_fit = idea.get("environment_fit", ["any"])
    if "any" in env_fit or not env_fit:
        score += 25
    elif env and env in env_fit:
        score += 25

    # 2. Social preference (25 pts)
    social = user_profile.get("social_preference", "")
    social_fit = idea.get("social_fit", [])
    if not social_fit:
        score += 25
    elif social and social in social_fit:
        score += 25

    # 3. Assets (25 pts)
    user_assets = set(user_profile.get("assets", []))
    req_assets = [a for a in idea.get("asset_requirements", ["none"]) if a != "none"]
    if not req_assets:
        score += 25
    elif all(a in user_assets for a in req_assets):
        score += 25
    elif any(a in user_assets for a in req_assets):
        score += 12

    # 4. Interests (25 pts)
    user_interests = set(user_profile.get("questionnaire_interests", []))
    idea_interests = set(idea.get("interest_tags", []))
    if not idea_interests:
        score += 25
    elif user_interests:
        overlap = len(user_interests & idea_interests) / max(1, len(idea_interests))
        score += min(25, int(25 * overlap))

    # Normalize to 30-99 range for realism
    return min(99, max(30, int(30 + score * 0.69)))

async def send_expo_push_notification(push_token: str, title: str, body: str, data: dict = None):
    """Send push notification via Expo push API"""
    if not push_token or not push_token.startswith("ExponentPushToken"):
        return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://exp.host/--/api/v2/push/send",
                json={"to": push_token, "title": title, "body": body,
                      "data": data or {}, "sound": "default", "badge": 1},
                headers={"Content-Type": "application/json"},
                timeout=10.0
            )
    except Exception as e:
        logger.warning(f"Push notification failed: {e}")

# ============= Pre-populated Ideas (20 ideas, 4 categories) =============

PRE_POPULATED_IDEAS = [
    # === GIG ECONOMY ===
    {
        "id": "gig-001",
        "title": "DoorDash Food Delivery",
        "description": "Earn money delivering food from restaurants to customers. Set your own hours, work as much or as little as you want. Peak hours mean more orders and better tips.",
        "category": "Gig Economy",
        "required_skills": ["Navigation", "Time Management", "Customer Service"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Download the Dasher app and sign up",
            "Pass background check (1-3 business days)",
            "Activate your Dasher account with your Red Card",
            "Pick a high-demand zone near restaurants",
            "Complete your first 3 deliveries to unlock boosts",
            "Accept Peak Pay opportunities ($4-8 extra per order)",
            "Stack with other delivery apps for maximum earnings"
        ],
        "potential_earnings": "$15-$25/hour",
        "difficulty": "beginner",
        "tags": ["flexible", "gig-economy", "no-experience"],
        "environment_fit": ["outdoor"],
        "social_fit": ["solo", "customer-facing"],
        "asset_requirements": ["car"],
        "interest_tags": ["finance"],
        "affiliate_link": "https://apps.apple.com/us/app/dasher-become-a-doordash-driver/id1037922353"
    },
    {
        "id": "gig-002",
        "title": "Uber / Lyft Rideshare Driver",
        "description": "Drive passengers to their destinations using your own car. Work when you want, earn instant payouts, and receive tips. Surge pricing during peak hours can double your earnings.",
        "category": "Gig Economy",
        "required_skills": ["Safe Driving", "Navigation", "Customer Service"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Sign up on the Uber or Lyft app with your vehicle details",
            "Submit required documents (license, insurance, registration)",
            "Pass background check and vehicle inspection",
            "Get a dashboard phone mount for navigation",
            "Learn surge pricing times in your city",
            "Drive during peak hours (6-9am, 4-8pm, Fri/Sat nights)",
            "Maintain 4.85+ rating to unlock top driver perks"
        ],
        "potential_earnings": "$20-$35/hour",
        "difficulty": "beginner",
        "tags": ["flexible", "gig-economy", "car-required"],
        "environment_fit": ["outdoor"],
        "social_fit": ["customer-facing"],
        "asset_requirements": ["car"],
        "interest_tags": ["finance"],
        "affiliate_link": "https://www.uber.com/us/en/drive/"
    },
    {
        "id": "gig-003",
        "title": "Instacart Personal Shopper",
        "description": "Shop for groceries and deliver them to customers. Higher pay per hour than food delivery, plus tips. Choose in-store only (no car needed) or full-service batches.",
        "category": "Gig Economy",
        "required_skills": ["Organization", "Attention to Detail", "Customer Service"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Download the Instacart Shopper app and apply",
            "Pass background check (1-5 business days)",
            "Choose: in-store shopper or full-service (delivery)",
            "Shop during high-demand hours (9am-12pm, 4pm-8pm)",
            "Master the item replacement and substitution feature",
            "Communicate proactively with customers about substitutions",
            "Complete 20+ batches in first 2 weeks for bonus incentives"
        ],
        "potential_earnings": "$18-$28/hour",
        "difficulty": "beginner",
        "tags": ["flexible", "gig-economy", "no-experience"],
        "environment_fit": ["outdoor"],
        "social_fit": ["solo", "customer-facing"],
        "asset_requirements": ["car"],
        "interest_tags": ["finance"],
        "affiliate_link": "https://shoppers.instacart.com/"
    },
    {
        "id": "gig-004",
        "title": "TaskRabbit Handyman / Helper",
        "description": "Complete tasks for people in your area: furniture assembly, TV mounting, cleaning, moving help, yard work. Set your own rates and schedule. High demand year-round in any city.",
        "category": "Gig Economy",
        "required_skills": ["Physical Fitness", "Basic Handyman Skills", "Reliability"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Create a TaskRabbit profile highlighting your skills",
            "Pay one-time $25 registration fee and pass background check",
            "Set competitive rates (check other Taskers in your area)",
            "Accept first 5 tasks at slightly lower rates to build reviews",
            "Arrive on time, over-communicate, deliver quality work",
            "Raise rates as reviews grow (5 stars = higher demand)",
            "Specialize in high-demand tasks: IKEA assembly, TV mounting"
        ],
        "potential_earnings": "$25-$60/hour",
        "difficulty": "beginner",
        "tags": ["flexible", "local-service", "physical"],
        "environment_fit": ["outdoor"],
        "social_fit": ["customer-facing"],
        "asset_requirements": ["none"],
        "interest_tags": ["fitness", "real-estate"],
        "affiliate_link": "https://www.taskrabbit.com/become-a-tasker"
    },
    {
        "id": "gig-005",
        "title": "Amazon Flex Package Delivery",
        "description": "Deliver Amazon packages in your own car in 3-6 hour blocks. Paid per block, not per package. Consistent work especially during holidays. Higher pay than food delivery platforms.",
        "category": "Gig Economy",
        "required_skills": ["Navigation", "Organization", "Time Management"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": True,
        "location_types": ["urban", "suburban", "rural"],
        "action_steps": [
            "Download Amazon Flex app and complete registration",
            "Submit documents and pass background check",
            "Reserve a delivery block (blocks go fast — check app often)",
            "Pick up packages from Amazon delivery station",
            "Use the Flex app's built-in navigation for efficient routing",
            "Complete your block on time for full block payment",
            "Check app multiple times daily — new blocks added constantly"
        ],
        "potential_earnings": "$18-$25/hour",
        "difficulty": "beginner",
        "tags": ["flexible", "gig-economy", "car-required"],
        "environment_fit": ["outdoor"],
        "social_fit": ["solo"],
        "asset_requirements": ["car"],
        "interest_tags": ["finance"],
        "affiliate_link": "https://flex.amazon.com/"
    },
    # === LOCAL & SERVICE BASED ===
    {
        "id": "local-001",
        "title": "Personal Fitness Trainer",
        "description": "Train clients one-on-one or in small groups at their home, a park, or a gym. Premium clients pay $100+/hour. Certification is a plus but not required to start building a client base.",
        "category": "Local & Service Based",
        "required_skills": ["Fitness Knowledge", "Motivation", "Communication"],
        "startup_cost": "low",
        "time_needed": "part-time",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Define your training specialty (weight loss, strength, endurance)",
            "Create a simple 30-day starter workout program template",
            "Post on Nextdoor and Facebook Groups offering a free trial session",
            "Deliver an exceptional first session — over-deliver on value",
            "Set rates at $50-80/hour and ask every client for referrals",
            "Get basic CPT certification (ACE, NASM) to charge premium rates",
            "Build to 10 regular clients for $2,000-$4,000/month income"
        ],
        "potential_earnings": "$2,000-$6,000/month",
        "difficulty": "beginner",
        "tags": ["fitness", "local-service", "recurring"],
        "environment_fit": ["outdoor", "any"],
        "social_fit": ["customer-facing"],
        "asset_requirements": ["none"],
        "interest_tags": ["fitness"],
        "affiliate_link": ""
    },
    {
        "id": "local-002",
        "title": "Dog Walker with Rover",
        "description": "Walk dogs, do drop-in visits, or board dogs in your home. Rover is the #1 platform. Build a base of 5-10 regular weekly clients for steady, predictable recurring income.",
        "category": "Local & Service Based",
        "required_skills": ["Animal Care", "Reliability", "Physical Fitness"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Create a Rover profile with a friendly photo and detailed bio",
            "Set competitive starting rates to attract first reviews",
            "Pass Rover background check and complete pet CPR certification",
            "Accept Meet & Greets with potential new clients (free)",
            "Send detailed post-walk updates with GPS proof and photos",
            "Build to 5+ five-star reviews then raise your rates",
            "Offer boarding and house-sitting for higher per-day rates"
        ],
        "potential_earnings": "$800-$2,500/month",
        "difficulty": "beginner",
        "tags": ["pets", "local-service", "outdoor"],
        "environment_fit": ["outdoor"],
        "social_fit": ["solo", "customer-facing"],
        "asset_requirements": ["none"],
        "interest_tags": ["pets", "fitness"],
        "affiliate_link": "https://www.rover.com/become-a-sitter/"
    },
    {
        "id": "local-003",
        "title": "Mobile Car Detailing",
        "description": "Go to clients' homes or offices to detail their cars. Premium mobile service in a booming market. Minimal equipment to start. Can scale to a full fleet operation with employees.",
        "category": "Local & Service Based",
        "required_skills": ["Attention to Detail", "Physical Stamina", "Customer Service"],
        "startup_cost": "medium",
        "time_needed": "flexible",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Watch 10+ YouTube tutorials on professional car detailing techniques",
            "Buy a basic kit ($150-250): microfibers, foam cannon, wax, vacuum",
            "Detail 3 friends' cars for free to build skills and take before/afters",
            "Post dramatic before/after photos on Instagram and Nextdoor",
            "Offer introductory prices on Facebook Marketplace ($50-75 interior)",
            "Land first 3 paid clients and ask for 5-star Google reviews",
            "Raise prices to $100-200 per detail as reputation builds"
        ],
        "potential_earnings": "$1,500-$4,500/month",
        "difficulty": "beginner",
        "tags": ["local-service", "scalable", "outdoor"],
        "environment_fit": ["outdoor"],
        "social_fit": ["solo", "customer-facing"],
        "asset_requirements": ["car"],
        "interest_tags": ["fitness", "real-estate"],
        "affiliate_link": ""
    },
    {
        "id": "local-004",
        "title": "Professional House Sitter",
        "description": "Stay at people's homes while they travel, caring for their property and pets. Earn payment while potentially saving on rent. Platforms like TrustedHousesitters make connecting easy.",
        "category": "Local & Service Based",
        "required_skills": ["Responsibility", "Animal Care", "Reliability"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Create profiles on TrustedHousesitters and HouseSitter.com",
            "Get 3 character references from friends, family, or employers",
            "Complete your first sit for free or low cost to earn initial review",
            "Take timestamped photos of each property and send daily updates",
            "Build 5+ five-star reviews over your first month",
            "Charge $30-75/night for paid sits after reviews are established",
            "Specialize in long-term sits (2-4 weeks) for maximum income"
        ],
        "potential_earnings": "$500-$2,000/month",
        "difficulty": "beginner",
        "tags": ["pets", "local-service", "flexible"],
        "environment_fit": ["outdoor", "home"],
        "social_fit": ["solo"],
        "asset_requirements": ["none"],
        "interest_tags": ["pets", "real-estate"],
        "affiliate_link": "https://www.trustedhousesitters.com/become-a-house-sitter/"
    },
    {
        "id": "local-005",
        "title": "Lawn Care & Landscaping",
        "description": "Mow lawns, trim hedges, plant flowers, and do yard cleanups. Simple to start with just a mower. Scale to a full landscaping crew with word-of-mouth growth in residential neighborhoods.",
        "category": "Local & Service Based",
        "required_skills": ["Physical Fitness", "Reliability", "Equipment Handling"],
        "startup_cost": "medium",
        "time_needed": "flexible",
        "is_location_based": True,
        "location_types": ["suburban", "rural"],
        "action_steps": [
            "Get basic equipment: mower, trimmer, blower ($300-600 used)",
            "Canvass 30 homes in a neighborhood with a simple flyer or door knock",
            "Offer first mow at $25 (below market) to land first clients fast",
            "Do exceptional work and request a Nextdoor review immediately",
            "Set recurring weekly/biweekly contracts at $40-85 per yard",
            "Upsell seasonal services: mulching, leaf cleanup, planting",
            "Scale by hiring one reliable helper during busy seasons"
        ],
        "potential_earnings": "$2,000-$6,000/month",
        "difficulty": "beginner",
        "tags": ["outdoor", "local-service", "scalable"],
        "environment_fit": ["outdoor"],
        "social_fit": ["solo", "customer-facing"],
        "asset_requirements": ["none"],
        "interest_tags": ["fitness", "real-estate"],
        "affiliate_link": ""
    },
    # === DIGITAL & FREELANCE ===
    {
        "id": "digital-001",
        "title": "Freelance Web Designer (Fiverr/Upwork)",
        "description": "Design websites, landing pages, and UI/UX for clients worldwide. High demand, work from anywhere, scale to $10,000+/month with the right portfolio and niche specialization.",
        "category": "Digital & Freelance",
        "required_skills": ["Web Design", "Figma", "Basic HTML/CSS"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": False,
        "location_types": ["online"],
        "action_steps": [
            "Learn Figma (free) via YouTube — 2 hours to start designing",
            "Build 3 portfolio projects for fictional clients in a specific niche",
            "Create a Fiverr gig with professional mockup screenshots",
            "Price first 3 gigs at $75 to quickly earn reviews",
            "Over-deliver on first 5 orders: add extras, respond fast",
            "Raise prices to $250-500 after 10 five-star reviews",
            "Create an Upwork profile and apply to 5 relevant jobs daily"
        ],
        "potential_earnings": "$2,000-$8,000/month",
        "difficulty": "intermediate",
        "tags": ["online", "creative", "scalable"],
        "environment_fit": ["home", "office"],
        "social_fit": ["solo", "small-team"],
        "asset_requirements": ["laptop"],
        "interest_tags": ["tech", "creative"],
        "affiliate_link": "https://www.fiverr.com/start_selling"
    },
    {
        "id": "digital-002",
        "title": "Virtual Assistant (VA)",
        "description": "Help entrepreneurs and small businesses with email management, scheduling, data entry, and admin tasks. Entry-level position that scales fast with the right retainer clients.",
        "category": "Digital & Freelance",
        "required_skills": ["Organization", "Written Communication", "Google Suite"],
        "startup_cost": "low",
        "time_needed": "part-time",
        "is_location_based": False,
        "location_types": ["online"],
        "action_steps": [
            "List your core VA services: email management, scheduling, research",
            "Create a 1-page Notion or Google Doc portfolio",
            "Send 20 personalized outreach messages to small business owners on IG",
            "Offer a 2-hour free trial to prove your value with zero risk",
            "Set initial rates at $20-30/hour or $500-800/month retainer",
            "Deliver impeccable, organized work to your first client",
            "Scale to 4-5 retainer clients for $2,000-5,000/month"
        ],
        "potential_earnings": "$1,500-$5,000/month",
        "difficulty": "beginner",
        "tags": ["online", "remote", "entry-level"],
        "environment_fit": ["home", "office"],
        "social_fit": ["solo", "small-team"],
        "asset_requirements": ["laptop"],
        "interest_tags": ["tech", "finance"],
        "affiliate_link": ""
    },
    {
        "id": "digital-003",
        "title": "UGC Video Creator for Brands",
        "description": "Create authentic video content (unboxing, reviews, tutorials) for brands to use in their paid ads. No social following required — brands pay for raw content, not your audience size.",
        "category": "Digital & Freelance",
        "required_skills": ["Video Recording", "Storytelling", "Basic Editing"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": False,
        "location_types": ["online"],
        "action_steps": [
            "Create 3 sample UGC-style videos for products you already own",
            "Post examples on TikTok or Instagram with #UGCCreator tags",
            "Apply to brands via Billo.app, UGC.club, or direct DMs on IG",
            "Charge $150-300 per video for first clients to build portfolio",
            "Deliver raw footage + 3 edited short-form versions per brief",
            "Raise rates to $500-800 per video as portfolio grows",
            "Scale by partnering with multiple brands simultaneously"
        ],
        "potential_earnings": "$2,000-$8,000/month",
        "difficulty": "beginner",
        "tags": ["online", "creative", "trending"],
        "environment_fit": ["home", "outdoor"],
        "social_fit": ["solo"],
        "asset_requirements": ["laptop"],
        "interest_tags": ["creative", "tech"],
        "affiliate_link": "https://www.billo.app/"
    },
    {
        "id": "digital-004",
        "title": "Social Media Manager",
        "description": "Manage Instagram, TikTok, and LinkedIn for small businesses. Create content, grow their following, and report results. High demand as every business needs social presence.",
        "category": "Digital & Freelance",
        "required_skills": ["Social Media Strategy", "Content Creation", "Copywriting"],
        "startup_cost": "low",
        "time_needed": "part-time",
        "is_location_based": False,
        "location_types": ["online"],
        "action_steps": [
            "Choose 1-2 niches you understand well (restaurants, fitness, real estate)",
            "Create a case study: grow your own account to 500+ followers first",
            "Reach out to 20 local businesses offering a free 7-day audit",
            "Propose a 30-day trial package for $300-500 to land first client",
            "Deliver content calendar, 20+ posts, and weekly performance report",
            "Keep client for 90+ days and collect a detailed video testimonial",
            "Scale to 5 retainer clients at $500-1,500/month each"
        ],
        "potential_earnings": "$2,500-$7,500/month",
        "difficulty": "intermediate",
        "tags": ["online", "creative", "scalable"],
        "environment_fit": ["home", "office"],
        "social_fit": ["solo", "small-team"],
        "asset_requirements": ["laptop"],
        "interest_tags": ["creative", "tech"],
        "affiliate_link": ""
    },
    {
        "id": "digital-005",
        "title": "AI-Powered Copywriter",
        "description": "Write compelling emails, ad copy, product descriptions, and landing pages for businesses. AI tools make you 5x faster. High demand as every business needs words that convert.",
        "category": "Digital & Freelance",
        "required_skills": ["Writing", "Marketing", "AI Tools (ChatGPT)"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": False,
        "location_types": ["online"],
        "action_steps": [
            "Learn 3 copywriting formulas: AIDA, PAS, Before/After/Bridge",
            "Practice rewriting 5 bad ads into compelling copy with AI help",
            "Build a 3-piece portfolio: email sequence, landing page, ad set",
            "Create Fiverr and Upwork profiles with portfolio samples",
            "Apply to 10 copywriting jobs daily, specialize in your strongest niche",
            "Complete first 3 projects and collect 5-star reviews",
            "Raise rates to $500-2,000 per project as reputation builds"
        ],
        "potential_earnings": "$3,000-$10,000/month",
        "difficulty": "intermediate",
        "tags": ["online", "writing", "scalable"],
        "environment_fit": ["home", "office"],
        "social_fit": ["solo"],
        "asset_requirements": ["laptop"],
        "interest_tags": ["tech", "creative", "finance"],
        "affiliate_link": ""
    },
    # === PASSIVE/SCALABLE ===
    {
        "id": "passive-001",
        "title": "Print-on-Demand (Printify + Etsy)",
        "description": "Design t-shirts, mugs, and phone cases on Printify and sell on Etsy. No inventory, no shipping — Printify handles everything. Pure passive income once your store gains traction.",
        "category": "Passive/Scalable",
        "required_skills": ["Basic Design (Canva)", "Niche Research", "Etsy SEO"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": False,
        "location_types": ["online"],
        "action_steps": [
            "Sign up for a free Printify account and connect to Etsy",
            "Find a profitable niche with low competition (nurse humor, dog breeds)",
            "Create 10 designs using Canva (completely free to start)",
            "Open an Etsy shop and list all 10 products with SEO-rich titles",
            "Run Etsy ads at $1-3/day on your best-looking listings",
            "Find which products sell, then create 10 more variations of those",
            "Scale with TikTok and Pinterest organic content driving free traffic"
        ],
        "potential_earnings": "$500-$5,000/month",
        "difficulty": "beginner",
        "tags": ["passive", "online", "creative"],
        "environment_fit": ["home", "office"],
        "social_fit": ["solo"],
        "asset_requirements": ["laptop"],
        "interest_tags": ["creative", "tech", "finance"],
        "affiliate_link": "https://printify.com/"
    },
    {
        "id": "passive-002",
        "title": "Domain Name Flipping",
        "description": "Buy undervalued domain names and sell them for 2x-100x profit. Focus on brandable .com domains for emerging niches. High-margin, digital asset investing with low risk when done right.",
        "category": "Passive/Scalable",
        "required_skills": ["Market Research", "SEO Basics", "Negotiation"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": False,
        "location_types": ["online"],
        "action_steps": [
            "Research trending niches, emerging startups, and new tech categories",
            "Use Namecheap to find available single-word .com domains under $15",
            "Find expired domains with backlinks at ExpiredDomains.net",
            "Buy 5-10 promising domains for $10-50 each as your initial portfolio",
            "List on Sedo, Afternic, or Flippa for passive inbound inquiries",
            "Reach out directly to companies that could use your domain name",
            "Negotiate and close deals for 5x-100x your purchase price"
        ],
        "potential_earnings": "$1,000-$10,000/month",
        "difficulty": "intermediate",
        "tags": ["online", "passive", "investment"],
        "environment_fit": ["home", "office"],
        "social_fit": ["solo"],
        "asset_requirements": ["laptop", "investment"],
        "interest_tags": ["tech", "finance", "real-estate"],
        "affiliate_link": ""
    },
    {
        "id": "passive-003",
        "title": "Vending Machine Business",
        "description": "Place vending machines in high-traffic locations and collect passive income. Each machine generates $200-800/month. Start with 1-2 machines and scale to a full fleet operation.",
        "category": "Passive/Scalable",
        "required_skills": ["Negotiation", "Business Sense", "Basic Maintenance"],
        "startup_cost": "high",
        "time_needed": "flexible",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Scout high-traffic locations: offices, gyms, apartments, laundromats",
            "Buy a used vending machine for $500-1,500 on Facebook Marketplace",
            "Negotiate free placement with location owner (offer revenue share)",
            "Stock with high-margin items: energy drinks, protein bars, snacks",
            "Set prices 40-60% above retail store prices",
            "Service machine weekly — restock, clean, collect cash",
            "Reinvest first $1,500 profit into a second machine location"
        ],
        "potential_earnings": "$500-$3,500/month",
        "difficulty": "intermediate",
        "tags": ["passive", "physical", "scalable"],
        "environment_fit": ["outdoor", "any"],
        "social_fit": ["solo"],
        "asset_requirements": ["car", "investment"],
        "interest_tags": ["finance", "real-estate"],
        "affiliate_link": ""
    },
    {
        "id": "passive-004",
        "title": "Digital Course Creator",
        "description": "Teach what you know on Gumroad, Teachable, or Kajabi. One course can sell thousands of times with zero additional work. Ideal for anyone with a marketable skill or unique experience.",
        "category": "Passive/Scalable",
        "required_skills": ["Expertise in Any Skill", "Presentation", "Video Recording"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": False,
        "location_types": ["online"],
        "action_steps": [
            "Identify your most valuable and teachable knowledge or skill",
            "Survey 10 people in your target audience to validate demand",
            "Create a lean 5-8 module course outline focused on specific results",
            "Record all videos using your phone + a $30 clip-on microphone",
            "Upload to Gumroad (free) and price at $47-$197",
            "Post 3 free tips from your course on TikTok/Instagram daily for 30 days",
            "Scale with email list and targeted ads after first 10 sales"
        ],
        "potential_earnings": "$500-$10,000/month",
        "difficulty": "intermediate",
        "tags": ["passive", "online", "scalable"],
        "environment_fit": ["home", "office"],
        "social_fit": ["solo"],
        "asset_requirements": ["laptop"],
        "interest_tags": ["tech", "creative", "finance"],
        "affiliate_link": "https://gumroad.com/"
    },
    {
        "id": "passive-005",
        "title": "Retail Arbitrage (Buy Low, Sell High)",
        "description": "Buy clearance items from retail stores and resell on Amazon/eBay for 2-5x profit. Focus on toys, electronics, and seasonal goods. Entirely scalable and can become a full business.",
        "category": "Passive/Scalable",
        "required_skills": ["Market Research", "Product Sourcing", "Photography"],
        "startup_cost": "medium",
        "time_needed": "flexible",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Download the Amazon Seller and eBay apps for real-time price scanning",
            "Visit clearance sections at Target, Walmart, TJ Maxx, and Big Lots",
            "Scan items and find products selling for 2.5x+ on Amazon FBA",
            "Buy 5-10 profitable items to test the market with $100-200",
            "List on Amazon FBA or eBay with professional photos and descriptions",
            "Reinvest all profits into higher-value product categories",
            "Scale by visiting multiple stores and hiring part-time help"
        ],
        "potential_earnings": "$1,000-$5,000/month",
        "difficulty": "beginner",
        "tags": ["flipping", "physical", "scalable"],
        "environment_fit": ["outdoor", "any"],
        "social_fit": ["solo"],
        "asset_requirements": ["car", "investment"],
        "interest_tags": ["finance"],
        "affiliate_link": ""
    }
]

# ============= Sprint 5: Currency & Location Constants =============

CURRENCY_MAP: Dict[str, Dict[str, str]] = {
    "US": {"code": "USD", "symbol": "$"}, "GB": {"code": "GBP", "symbol": "£"},
    "DE": {"code": "EUR", "symbol": "€"}, "FR": {"code": "EUR", "symbol": "€"},
    "ES": {"code": "EUR", "symbol": "€"}, "IT": {"code": "EUR", "symbol": "€"},
    "CA": {"code": "CAD", "symbol": "CA$"}, "AU": {"code": "AUD", "symbol": "A$"},
    "IN": {"code": "INR", "symbol": "₹"}, "BR": {"code": "BRL", "symbol": "R$"},
    "MX": {"code": "MXN", "symbol": "MX$"}, "KE": {"code": "KES", "symbol": "KSh"},
    "NG": {"code": "NGN", "symbol": "₦"}, "ZA": {"code": "ZAR", "symbol": "R"},
    "PH": {"code": "PHP", "symbol": "₱"}, "SG": {"code": "SGD", "symbol": "S$"},
    "AE": {"code": "AED", "symbol": "AED"}, "ID": {"code": "IDR", "symbol": "Rp"},
    "NZ": {"code": "NZD", "symbol": "NZ$"}, "JP": {"code": "JPY", "symbol": "¥"},
}

# ============= Routes =============

@api_router.post("/auth/signup")
async def signup(user_data: UserSignup):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    password_hash = hash_password(user_data.password)
    user = User(email=user_data.email, name=user_data.name, password_hash=password_hash)
    await db.users.insert_one(user.dict())
    return {"id": user.id, "email": user.email, "name": user.name, "is_guest": False, "is_architect": False, "profile": user.profile.dict()}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"id": user["id"], "email": user["email"], "name": user["name"], "is_guest": False, "is_architect": user.get("is_architect", False), "profile": user.get("profile", {})}

@api_router.post("/auth/guest")
async def create_guest():
    guest = GuestUser()
    await db.users.insert_one(guest.dict())
    return {"id": guest.id, "name": guest.name, "is_guest": True, "profile": guest.profile.dict()}

@api_router.put("/users/{user_id}/profile")
async def update_profile(user_id: str, profile: UserProfile):
    result = await db.users.update_one({"id": user_id}, {"$set": {"profile": profile.dict()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Profile updated successfully"}

@api_router.get("/users/{user_id}/profile")
async def get_profile(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.get("profile", {})

@api_router.post("/users/{user_id}/push-token")
async def update_push_token(user_id: str, token_data: Dict[str, Any]):
    push_token = token_data.get("push_token", "")
    result = await db.users.update_one({"id": user_id}, {"$set": {"profile.push_token": push_token}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Push token updated"}

@api_router.put("/users/{user_id}/location")
async def update_user_location(user_id: str, location_data: Dict[str, Any]):
    """Sprint 5: Store user's geo-location for local market features."""
    city = location_data.get("city", "")
    country_code = location_data.get("country_code", "US")
    currency = CURRENCY_MAP.get(country_code, {"code": "USD", "symbol": "$"})
    update_fields = {
        "profile.city": city,
        "profile.state": location_data.get("state", ""),
        "profile.country": location_data.get("country", ""),
        "profile.country_code": country_code,
        "profile.currency_code": location_data.get("currency_code") or currency["code"],
        "profile.currency_symbol": location_data.get("currency_symbol") or currency["symbol"],
    }
    result = await db.users.update_one({"id": user_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Location updated", "city": city, "currency": currency}

async def ensure_ideas_seeded():
    """Seed ideas if DB is empty or if ideas lack new schema fields"""
    count = await db.ideas.count_documents({})
    if count == 0:
        await db.ideas.insert_many(PRE_POPULATED_IDEAS)
        return
    # Migration: check if ideas have new fields
    old_ideas = await db.ideas.count_documents({"environment_fit": {"$exists": False}})
    if old_ideas > 0:
        await db.ideas.delete_many({})
        await db.ideas.insert_many(PRE_POPULATED_IDEAS)

@api_router.get("/ideas")
async def get_all_ideas(skip: int = 0, limit: int = 100, category: str = None, difficulty: str = None, cost: str = None):
    await ensure_ideas_seeded()
    query = {}
    if category and category != "All":
        query["category"] = category
    if difficulty and difficulty != "all":
        query["difficulty"] = difficulty
    if cost and cost != "all":
        query["startup_cost"] = cost
    ideas = await db.ideas.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.ideas.count_documents(query)
    return {"ideas": ideas, "total": total, "skip": skip, "limit": limit}

@api_router.get("/ideas/personalized/{user_id}")
async def get_personalized_ideas(user_id: str):
    await ensure_ideas_seeded()
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    profile = user.get("profile", {})
    ideas = await db.ideas.find({}, {"_id": 0}).to_list(1000)
    scored_ideas = []
    for idea in ideas:
        idea["match_score"] = calculate_match_score(profile, idea)
        scored_ideas.append(idea)
    scored_ideas.sort(key=lambda x: x["match_score"], reverse=True)
    return scored_ideas

@api_router.get("/ideas/{idea_id}")
async def get_idea(idea_id: str, user_id: str = None):
    idea = await db.ideas.find_one({"id": idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    if user_id:
        user = await db.users.find_one({"id": user_id})
        if user:
            idea["match_score"] = calculate_match_score(user.get("profile", {}), idea)
    return idea

@api_router.post("/saved-ideas")
async def save_idea(saved: SavedIdea):
    existing = await db.saved_ideas.find_one({"user_id": saved.user_id, "idea_id": saved.idea_id})
    if existing:
        return {"message": "Idea already saved", "id": str(existing.get("_id", ""))}
    idea = await db.ideas.find_one({"id": saved.idea_id})
    if idea and "action_steps" in idea:
        action_steps = []
        for i, step_text in enumerate(idea["action_steps"]):
            is_scary = any(kw in step_text.lower() for kw in
                ["publish", "register", "launch", "go live", "first", "contact", "post", "list", "apply", "sign up", "create"])
            action_steps.append({"step_number": i + 1, "text": step_text,
                                  "completed": False, "completed_at": None, "is_scary_step": is_scary})
        saved.action_steps = action_steps
    result = await db.saved_ideas.insert_one(saved.dict())
    return {"message": "Idea saved successfully", "id": str(result.inserted_id)}

@api_router.get("/saved-ideas/{user_id}/{idea_id}")
async def get_saved_idea(user_id: str, idea_id: str):
    saved = await db.saved_ideas.find_one({"user_id": user_id, "idea_id": idea_id}, {"_id": 0})
    if not saved:
        return None
    return saved

@api_router.post("/saved-ideas/{user_id}/{idea_id}/complete-step")
async def complete_step(user_id: str, idea_id: str, step_data: Dict[str, Any]):
    step_number = step_data.get("step_number")
    saved_idea = await db.saved_ideas.find_one({"user_id": user_id, "idea_id": idea_id})
    if not saved_idea:
        raise HTTPException(status_code=404, detail="Saved idea not found")
    action_steps = saved_idea.get("action_steps", [])
    step_found = False
    is_scary_step = False
    for step in action_steps:
        if step["step_number"] == step_number and not step["completed"]:
            step["completed"] = True
            step["completed_at"] = datetime.utcnow().isoformat()
            step_found = True
            is_scary_step = step.get("is_scary_step", False)
            break
    if not step_found:
        raise HTTPException(status_code=400, detail="Step already completed or not found")
    total_steps = len(action_steps)
    completed_steps = sum(1 for s in action_steps if s["completed"])
    progress_percentage = int((completed_steps / total_steps) * 100) if total_steps > 0 else 0
    earnings_unlocked = completed_steps >= min(3, total_steps)
    status = "in-progress" if completed_steps < total_steps else "completed"
    await db.saved_ideas.update_one(
        {"user_id": user_id, "idea_id": idea_id},
        {"$set": {"action_steps": action_steps, "progress_percentage": progress_percentage,
                  "earnings_unlocked": earnings_unlocked, "status": status}}
    )
    # Send push notifications for milestones
    user = await db.users.find_one({"id": user_id})
    if user:
        push_token = user.get("profile", {}).get("push_token", "")
        if push_token:
            if progress_percentage == 50:
                await send_expo_push_notification(push_token, "You're on a roll! 📈",
                    "Halfway done — momentum is building on your Blueprint!")
            elif status == "completed":
                await send_expo_push_notification(push_token, "Blueprint Complete! 💰",
                    "You've finished all steps — time to start earning!")
    return {"message": "Step completed", "progress_percentage": progress_percentage,
            "earnings_unlocked": earnings_unlocked, "status": status,
            "is_scary_step": is_scary_step,
            "trigger_celebration": is_scary_step or progress_percentage in [50, 100]}

@api_router.post("/saved-ideas/{user_id}/{idea_id}/uncomplete-step")
async def uncomplete_step(user_id: str, idea_id: str, step_data: Dict[str, Any]):
    step_number = step_data.get("step_number")
    saved_idea = await db.saved_ideas.find_one({"user_id": user_id, "idea_id": idea_id})
    if not saved_idea:
        raise HTTPException(status_code=404, detail="Saved idea not found")
    action_steps = saved_idea.get("action_steps", [])
    for step in action_steps:
        if step["step_number"] == step_number:
            step["completed"] = False
            step["completed_at"] = None
            break
    total_steps = len(action_steps)
    completed_steps = sum(1 for s in action_steps if s["completed"])
    progress_percentage = int((completed_steps / total_steps) * 100) if total_steps > 0 else 0
    earnings_unlocked = completed_steps >= min(3, total_steps)
    status = "saved" if completed_steps == 0 else "in-progress"
    await db.saved_ideas.update_one(
        {"user_id": user_id, "idea_id": idea_id},
        {"$set": {"action_steps": action_steps, "progress_percentage": progress_percentage,
                  "earnings_unlocked": earnings_unlocked, "status": status}}
    )
    return {"message": "Step uncompleted", "progress_percentage": progress_percentage}

@api_router.get("/saved-ideas/{user_id}")
async def get_saved_ideas(user_id: str):
    saved = await db.saved_ideas.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    result = []
    for item in saved:
        idea = await db.ideas.find_one({"id": item["idea_id"]}, {"_id": 0})
        if idea:
            idea["saved_status"] = item["status"]
            idea["progress_percentage"] = item.get("progress_percentage", 0)
            idea["saved_at"] = item["saved_at"]
            result.append(idea)
    return result

@api_router.delete("/saved-ideas/{user_id}/{idea_id}")
async def remove_saved_idea(user_id: str, idea_id: str):
    result = await db.saved_ideas.delete_one({"user_id": user_id, "idea_id": idea_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saved idea not found")
    return {"message": "Idea removed successfully"}

# ============= Affiliate Redirect Service =============

@api_router.get("/redirect")
async def affiliate_redirect(url: str):
    from fastapi.responses import RedirectResponse
    if not url:
        raise HTTPException(status_code=400, detail="URL required")
    return RedirectResponse(url=url, status_code=307)

# ============= Sprint 2: Architect Tier & AI Features =============

# High-ticket blueprint IDs (locked behind Architect tier)
HIGH_TICKET_IDS = {"digital-001", "digital-005", "passive-002", "passive-003", "passive-004"}

# Pricing packages (server-side only)
ARCHITECT_PLANS = {
    "monthly": {"amount": 14.99, "currency": "usd", "label": "Monthly"},
    "annual":  {"amount": 99.00, "currency": "usd", "label": "Annual"},
}

# --- New Models ---
class CheckoutRequest(BaseModel):
    plan_type: str  # "monthly" or "annual"
    user_id: str
    origin_url: str

class ChatRequest(BaseModel):
    message: str
    idea_id: str  # active blueprint context

# --- Subscription helpers ---
async def get_architect_status(user_id: str) -> bool:
    """Returns True if user has an active Architect subscription"""
    txn = await db.payment_transactions.find_one(
        {"user_id": user_id, "payment_status": "paid"},
        sort=[("created_at", -1)]
    )
    return txn is not None

# --- Stripe Payment Routes ---

@api_router.post("/payments/checkout")
async def create_checkout(data: CheckoutRequest, request: Request):
    if data.plan_type not in ARCHITECT_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan type")
    plan = ARCHITECT_PLANS[data.plan_type]
    stripe_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)
    success_url = f"{data.origin_url}?session_id={{CHECKOUT_SESSION_ID}}&payment=success"
    cancel_url = f"{data.origin_url}?payment=cancelled"
    metadata = {"user_id": data.user_id, "plan_type": data.plan_type}
    checkout_req = CheckoutSessionRequest(
        amount=plan["amount"],
        currency=plan["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await stripe.create_checkout_session(checkout_req)
    # Create pending transaction record
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": data.user_id,
        "plan_type": data.plan_type,
        "amount": plan["amount"],
        "currency": plan["currency"],
        "payment_status": "pending",
        "status": "initiated",
        "created_at": datetime.utcnow().isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str):
    # Prevent double-processing
    existing = await db.payment_transactions.find_one({"session_id": session_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if existing.get("payment_status") == "paid":
        return {"payment_status": "paid", "status": "complete", "is_architect": True}
    stripe_key = os.environ["STRIPE_API_KEY"]
    stripe = StripeCheckout(api_key=stripe_key, webhook_url="")
    result = await stripe.get_checkout_status(session_id)
    if result.payment_status == "paid":
        user_id = existing.get("user_id")
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "status": "complete", "paid_at": datetime.utcnow().isoformat()}}
        )
        if user_id:
            await db.users.update_one({"id": user_id}, {"$set": {"is_architect": True}})
    return {
        "payment_status": result.payment_status,
        "status": result.status,
        "is_architect": result.payment_status == "paid",
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    stripe_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        event = await stripe.handle_webhook(body, sig)
        if event.payment_status == "paid":
            meta = event.metadata or {}
            user_id = meta.get("user_id")
            session_id = event.session_id
            existing = await db.payment_transactions.find_one({"session_id": session_id, "payment_status": "paid"})
            if not existing:
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "paid", "status": "complete", "paid_at": datetime.utcnow().isoformat()}}
                )
                if user_id:
                    await db.users.update_one({"id": user_id}, {"$set": {"is_architect": True}})
    except Exception as e:
        logger.warning(f"Webhook error: {e}")
    return {"received": True}

@api_router.get("/payments/subscription/{user_id}")
async def get_subscription_status(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    is_architect = user.get("is_architect", False)
    return {"is_architect": is_architect, "user_id": user_id}

# --- High-Ticket Blueprints Route ---
# NOTE: This must be defined BEFORE /api/ideas/{idea_id} to avoid route conflict.
# We use /api/high-ticket-ideas to be safe.

@api_router.get("/high-ticket-ideas")
async def get_high_ticket_ideas():
    await ensure_ideas_seeded()
    ideas = await db.ideas.find({"id": {"$in": list(HIGH_TICKET_IDS)}}, {"_id": 0}).to_list(10)
    return ideas

# --- Blueprint Guide (AI Accountability Coach) ---

@api_router.post("/blueprint-guide/chat/{user_id}")
async def blueprint_guide_chat(user_id: str, data: ChatRequest):
    # Verify user and architect status
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.get("is_architect", False):
        raise HTTPException(status_code=403, detail="Architect tier required")
    # Get the active blueprint context
    saved_idea = await db.saved_ideas.find_one({"user_id": user_id, "idea_id": data.idea_id})
    idea = await db.ideas.find_one({"id": data.idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    completed_steps = 0
    total_steps = 0
    progress = 0
    if saved_idea:
        steps = saved_idea.get("action_steps", [])
        total_steps = len(steps)
        completed_steps = sum(1 for s in steps if s.get("completed"))
        progress = saved_idea.get("progress_percentage", 0)
    profile = user.get("profile", {})
    system_message = f"""You are Blueprint Guide, an AI accountability coach inside the Blueprint income app. 
You help users succeed with their active income blueprints through personalized, motivating advice.

CURRENT USER CONTEXT:
- Blueprint: {idea['title']} ({idea['category']})
- Progress: {progress}% complete ({completed_steps}/{total_steps} steps done)
- Earnings Potential: {idea.get('potential_earnings', 'varies')}
- User Environment: {profile.get('environment', 'not specified')}
- User Assets: {', '.join(profile.get('assets', [])) or 'none specified'}
- User Interests: {', '.join(profile.get('questionnaire_interests', [])) or 'none specified'}

GUIDELINES:
- Be direct, motivating, and actionable. No fluff.
- Reference their specific blueprint and progress when relevant.
- Give concrete next steps, not generic advice.
- Keep responses under 200 words unless detail is needed.
- Speak like an experienced mentor who has done this before.
- Address them as a fellow entrepreneur."""
    llm_key = os.environ["EMERGENT_LLM_KEY"]
    session_id = f"blueprint-guide-{user_id}-{data.idea_id}"
    chat = LlmChat(api_key=llm_key, session_id=session_id, system_message=system_message)
    chat.with_model("gemini", "gemini-3-flash-preview")
    # Restore prior conversation from MongoDB (for persistence across server restarts)
    prior = await db.chat_messages.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(20)
    for msg in prior:
        if msg["role"] == "user":
            chat._add_user_message(msg["content"])
        elif msg["role"] == "assistant":
            chat._add_assistant_message(msg["content"])
    response = await chat.send_message(UserMessage(text=data.message))
    # Store messages
    ts = datetime.utcnow().isoformat()
    await db.chat_messages.insert_many([
        {"session_id": session_id, "user_id": user_id, "idea_id": data.idea_id,
         "role": "user", "content": data.message, "created_at": ts},
        {"session_id": session_id, "user_id": user_id, "idea_id": data.idea_id,
         "role": "assistant", "content": response, "created_at": ts},
    ])
    return {"response": response, "session_id": session_id}

@api_router.get("/blueprint-guide/history/{user_id}/{idea_id}")
async def get_chat_history(user_id: str, idea_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user or not user.get("is_architect", False):
        raise HTTPException(status_code=403, detail="Architect tier required")
    session_id = f"blueprint-guide-{user_id}-{idea_id}"
    messages = await db.chat_messages.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    return messages

# --- Troubleshooting Matrix ---

@api_router.post("/troubleshoot/{user_id}/{idea_id}/{step_number}")
async def get_troubleshoot(user_id: str, idea_id: str, step_number: int):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.get("is_architect", False):
        raise HTTPException(status_code=403, detail="Architect tier required")
    idea = await db.ideas.find_one({"id": idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    steps = idea.get("action_steps", [])
    step_text = steps[step_number - 1] if 0 < step_number <= len(steps) else "this step"
    profile = user.get("profile", {})
    prompt = f"""A Blueprint user is stuck on a specific action step. Generate a Troubleshooting Matrix with exactly 3 practical workarounds.

BLUEPRINT: {idea['title']}
STUCK ON STEP {step_number}: "{step_text}"
USER CONTEXT: Environment={profile.get('environment','any')}, Assets={', '.join(profile.get('assets', ['none']))}

Return EXACTLY this JSON format (no markdown, no extra text):
{{
  "step_summary": "brief restatement of what the user is trying to do",
  "workarounds": [
    {{
      "title": "Workaround 1 title (max 6 words)",
      "description": "2-3 sentences of actionable advice",
      "difficulty": "easy|medium|hard",
      "time_to_implement": "e.g. 30 minutes"
    }},
    {{
      "title": "Workaround 2 title",
      "description": "2-3 sentences of actionable advice",
      "difficulty": "easy|medium|hard",
      "time_to_implement": "e.g. 1 day"
    }},
    {{
      "title": "Workaround 3 title",
      "description": "2-3 sentences of actionable advice",
      "difficulty": "easy|medium|hard",
      "time_to_implement": "e.g. 2 hours"
    }}
  ]
}}"""
    llm_key = os.environ["EMERGENT_LLM_KEY"]
    session_id = f"troubleshoot-{uuid.uuid4()}"  # Fresh each time
    chat = LlmChat(api_key=llm_key, session_id=session_id, system_message="You are the Blueprint Troubleshooting Matrix AI. Return only valid JSON.")
    chat.with_model("gemini", "gemini-3-flash-preview")
    response_text = await chat.send_message(UserMessage(text=prompt))
    import json, re
    try:
        # Strip any markdown code blocks if present
        clean = re.sub(r"```json\n?|```\n?", "", response_text).strip()
        matrix = json.loads(clean)
    except Exception:
        matrix = {"step_summary": step_text, "workarounds": [{"title": "Try a different approach", "description": response_text, "difficulty": "medium", "time_to_implement": "varies"}]}
    return matrix

# ============= Sprint 3: Community Wins, Streak System, Content Engine =============

from content_engine import run_generation, NICHES
from fastapi import BackgroundTasks

# --- Seeded Community Wins ---
SEEDED_WINS = [
    {"user_name": "Sarah M.", "user_initials": "SM", "user_color": "#8B5CF6", "blueprint_title": "No-Code SaaS Builder for Shopify Merchants", "category": "No-Code & SaaS", "earnings_amount": 3200, "earnings_period": "per month", "weeks_to_earn": 6, "quote": "Followed every step. My first Shopify client paid $1,200. I now have 3 retainers. The locked steps are worth every penny of Architect.", "verified": True, "upvotes": 47},
    {"user_name": "Alex K.", "user_initials": "AK", "user_color": "#6366F1", "blueprint_title": "AI Automation Agency for Local Law Firms", "category": "AI & Automation", "earnings_amount": 5800, "earnings_period": "per month", "weeks_to_earn": 8, "quote": "Cold-emailed 20 law firms. 3 responded. 2 became clients at $2,900/mo each. The AI builds the automations, I do the relationship work.", "verified": True, "upvotes": 62},
    {"user_name": "James T.", "user_initials": "JT", "user_color": "#F59E0B", "blueprint_title": "Faceless YouTube Automation (Personal Finance)", "category": "Digital & Content", "earnings_amount": 2100, "earnings_period": "per month", "weeks_to_earn": 12, "quote": "Took 12 weeks to hit monetization threshold. Month 4 I cleared $2,100 from AdSense + sponsorships. Pure passive now.", "verified": True, "upvotes": 38},
    {"user_name": "Diana C.", "user_initials": "DC", "user_color": "#EC4899", "blueprint_title": "Fractional CMO Service for E-commerce Brands", "category": "Agency & B2B", "earnings_amount": 4400, "earnings_period": "per month", "weeks_to_earn": 10, "quote": "I was already doing marketing. This blueprint helped me package it as a Fractional CMO offer. Doubled my rates overnight.", "verified": True, "upvotes": 55},
    {"user_name": "Marcus R.", "user_initials": "MR", "user_color": "#10B981", "blueprint_title": "Automated Etsy AI Art & Digital Downloads", "category": "Passive & Investment", "earnings_amount": 1800, "earnings_period": "per month", "weeks_to_earn": 8, "quote": "Set it up over one weekend. Now it earns while I sleep. The AI art angle was genius — no skills needed, just system.", "verified": True, "upvotes": 41},
    {"user_name": "Lisa H.", "user_initials": "LH", "user_color": "#00D95F", "blueprint_title": "High-Ticket Ghostwriting for LinkedIn Executives", "category": "Digital & Content", "earnings_amount": 7200, "earnings_period": "per month", "weeks_to_earn": 6, "quote": "Found my first client on LinkedIn within 48 hours of setting up my profile the Blueprint way. $3,500/mo retainer locked in week 2.", "verified": True, "upvotes": 89},
    {"user_name": "Kevin P.", "user_initials": "KP", "user_color": "#EF4444", "blueprint_title": "Pressure Washing Business", "category": "Local & Service", "earnings_amount": 3500, "earnings_period": "per month", "weeks_to_earn": 4, "quote": "Rented a $300 pressure washer for the first 2 jobs. Made $1,100 that weekend. Bought my own machine in week 3. Best ROI of my life.", "verified": True, "upvotes": 33},
    {"user_name": "Yara T.", "user_initials": "YT", "user_color": "#3B82F6", "blueprint_title": "B2B Cold Email Outreach Agency", "category": "Agency & B2B", "earnings_amount": 2800, "earnings_period": "per month", "weeks_to_earn": 7, "quote": "Sent 500 cold emails using the exact template in the blueprint. 11 replies. 4 calls. 2 clients. $1,400/mo each.", "verified": True, "upvotes": 44},
    {"user_name": "Will C.", "user_initials": "WC", "user_color": "#F97316", "blueprint_title": "Amazon FBA Private Label Brand Builder", "category": "Passive & Investment", "earnings_amount": 9400, "earnings_period": "per month", "weeks_to_earn": 14, "quote": "Slow build but the compounding is insane. Month 4 I hit $9.4K. The sourcing and PPC steps in the blueprint are GOLD.", "verified": False, "upvotes": 71},
    {"user_name": "Nina W.", "user_initials": "NW", "user_color": "#A78BFA", "blueprint_title": "Bubble.io App Developer for Startups", "category": "No-Code & SaaS", "earnings_amount": 4100, "earnings_period": "per month", "weeks_to_earn": 9, "quote": "Charged $5K for my first Bubble app. Client referred me to two friends. I now have a waitlist. No-code is the great equalizer.", "verified": True, "upvotes": 58},
]

async def seed_wins_if_empty():
    count = await db.community_wins.count_documents({})
    if count == 0:
        ts_base = datetime.utcnow()
        for i, w in enumerate(SEEDED_WINS):
            from datetime import timedelta
            w_copy = {**w, "id": str(uuid.uuid4()), "user_id": "seeded", "created_at": (ts_base - timedelta(hours=i * 3)).isoformat()}
            await db.community_wins.insert_one({k: v for k, v in w_copy.items() if k != "_id"})

class WinSubmission(BaseModel):
    user_id: str
    blueprint_title: str
    category: str
    earnings_amount: float
    earnings_period: str
    weeks_to_earn: int = 0
    quote: str

USER_COLORS = ["#00D95F", "#6366F1", "#F59E0B", "#EC4899", "#3B82F6", "#10B981", "#EF4444", "#8B5CF6", "#F97316", "#A78BFA"]

@api_router.get("/wins")
async def get_wins(category: str = None, limit: int = 50):
    await seed_wins_if_empty()
    query = {}
    if category and category != "All":
        query["category"] = category
    wins = await db.community_wins.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return wins

@api_router.get("/wins/stats")
async def get_wins_stats():
    await seed_wins_if_empty()
    pipeline = [{"$group": {"_id": None, "total_wins": {"$sum": 1}, "total_earned": {"$sum": "$earnings_amount"}, "verified_count": {"$sum": {"$cond": ["$verified", 1, 0]}}}}]
    result = await db.community_wins.aggregate(pipeline).to_list(1)
    if result:
        r = result[0]
        return {"total_wins": r["total_wins"], "total_earned": int(r["total_earned"]), "verified_count": r["verified_count"]}
    return {"total_wins": 0, "total_earned": 0, "verified_count": 0}

@api_router.post("/wins")
async def submit_win(data: WinSubmission):
    user = await db.users.find_one({"id": data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.get("is_architect", False):
        raise HTTPException(status_code=403, detail="Architect tier required to post wins")
    import random
    color = random.choice(USER_COLORS)
    name = user.get("name", "Anonymous")
    initials = "".join([p[0].upper() for p in name.split()[:2]]) if name else "??"
    win = {
        "id": str(uuid.uuid4()),
        "user_id": data.user_id,
        "user_name": name,
        "user_initials": initials,
        "user_color": color,
        "blueprint_title": data.blueprint_title,
        "category": data.category,
        "earnings_amount": data.earnings_amount,
        "earnings_period": data.earnings_period,
        "weeks_to_earn": data.weeks_to_earn,
        "quote": data.quote,
        "verified": False,
        "upvotes": 0,
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.community_wins.insert_one({k: v for k, v in win.items() if k != "_id"})
    return {"id": win["id"], "message": "Win posted successfully"}

@api_router.post("/wins/{win_id}/upvote")
async def upvote_win(win_id: str):
    result = await db.community_wins.update_one({"id": win_id}, {"$inc": {"upvotes": 1}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Win not found")
    updated = await db.community_wins.find_one({"id": win_id}, {"_id": 0, "upvotes": 1})
    return {"upvotes": updated.get("upvotes", 0)}

# --- Streak System ---

@api_router.post("/users/{user_id}/streak/checkin")
async def streak_checkin(user_id: str):
    from datetime import date, timedelta
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    today = date.today().isoformat()
    last_action = user.get("streak_last_action")
    current_streak = user.get("streak_current", 0)
    longest_streak = user.get("streak_longest", 0)
    is_new_day = False
    if last_action == today:
        return {"streak_current": current_streak, "streak_longest": longest_streak, "is_new_day": False, "message": "Already checked in today"}
    elif last_action == (date.today() - timedelta(days=1)).isoformat():
        current_streak += 1
        is_new_day = True
    else:
        current_streak = 1
        is_new_day = True
    if current_streak > longest_streak:
        longest_streak = current_streak
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"streak_current": current_streak, "streak_last_action": today, "streak_longest": longest_streak}}
    )
    return {"streak_current": current_streak, "streak_longest": longest_streak, "is_new_day": is_new_day, "message": f"Streak: {current_streak} days!"}

@api_router.get("/users/{user_id}/streak")
async def get_streak(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "streak_current": user.get("streak_current", 0),
        "streak_longest": user.get("streak_longest", 0),
        "streak_last_action": user.get("streak_last_action"),
    }

# --- Content Engine: Blueprint Generation ---

_generation_status: Dict[str, Any] = {}

async def _run_generation_task(job_id: str, limit: int):
    _generation_status[job_id] = {"status": "running", "done": 0, "total": min(limit, len(NICHES)), "success": 0, "fail": 0}
    async def progress(done, total, success, fail):
        _generation_status[job_id].update({"done": done, "total": total, "success": success, "fail": fail})
    try:
        s, f = await run_generation(batch_size=5, limit=limit, progress_callback=progress)
        _generation_status[job_id].update({"status": "complete", "success": s, "fail": f})
    except Exception as e:
        _generation_status[job_id].update({"status": "error", "error": str(e)})

@api_router.post("/admin/generate-blueprints")
async def trigger_blueprint_generation(background_tasks: BackgroundTasks, limit: int = 100):
    job_id = str(uuid.uuid4())[:8]
    background_tasks.add_task(_run_generation_task, job_id, limit)
    return {"job_id": job_id, "message": f"Generation started for up to {limit} blueprints", "status_url": f"/api/admin/generate-blueprints/{job_id}"}

@api_router.get("/admin/generate-blueprints/{job_id}")
async def get_generation_status(job_id: str):
    status = _generation_status.get(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return status

@api_router.get("/blueprints")
async def get_blueprints(category: str = None, limit: int = 50, skip: int = 0):
    query = {"version": "2.0"}
    if category and category != "All":
        query["category"] = category
    total = await db.blueprints.count_documents(query)
    items = await db.blueprints.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).to_list(limit)
    return {"blueprints": items, "total": total, "has_more": skip + limit < total}

# --- Blueprint Carousels & Daily Blueprint (Sprint 4) ---
# NOTE: Specific routes must come BEFORE parameterized /{blueprint_id} to avoid conflicts

def calculate_blueprint_match(bp: dict, profile: dict) -> int:
    """Calculate match score for a v2 blueprint against user profile."""
    score = 40  # base
    tags = set(t.lower() for t in (bp.get("tags") or []) + (bp.get("match_tags") or []))
    env = profile.get("environment", "")
    assets = [a.lower() for a in profile.get("assets", [])]
    interests = [i.lower() for i in profile.get("questionnaire_interests", [])]
    social = profile.get("social_preference", "")

    # Environment alignment
    if env == "remote" and any(t in tags for t in ["digital", "remote", "online", "no-code", "ai", "saas", "content", "freelance", "email"]):
        score += 18
    elif env == "flexible" and any(t in tags for t in ["digital", "local", "service", "agency"]):
        score += 10

    # Asset matching
    for asset in assets:
        asset_tag_map = {
            "laptop": ["digital", "content", "saas", "no-code", "ai"],
            "car": ["local", "service", "gig", "mobile"],
            "smartphone": ["ugc", "tiktok", "social-media", "youtube"],
            "tools": ["handyman", "local", "service"],
            "money": ["investment", "acquisition", "fba", "passive"],
            "free time": ["passive", "content", "online"],
            "skills": ["freelance", "agency", "consulting"],
        }
        for tag_list in asset_tag_map.values():
            if asset in asset_tag_map and any(t in tags for t in asset_tag_map.get(asset, [])):
                score += 8
                break

    # Interest matching
    for interest in interests:
        if any(interest.lower() in tag for tag in tags):
            score += 12

    # Social preference
    if social == "independent" and any(t in tags for t in ["solo", "passive", "digital", "automation", "ai"]):
        score += 10
    elif social == "collaborative" and any(t in tags for t in ["agency", "b2b", "client", "community"]):
        score += 10

    # Difficulty bonus for completeness
    diff = bp.get("difficulty", "medium")
    if diff == "easy":
        score += 5
    elif diff == "medium":
        score += 3

    return min(99, max(30, score))

@api_router.get("/blueprints/daily/{user_id}")
async def get_daily_blueprint(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    from datetime import date as _date
    today_seed = int(_date.today().strftime("%Y%m%d"))
    profile = user.get("profile", {})
    blueprints = await db.blueprints.find({"version": "2.0"}, {"_id": 0}).to_list(200)
    if not blueprints:
        raise HTTPException(status_code=404, detail="No blueprints available yet")
    scored = sorted([(calculate_blueprint_match(bp, profile), bp) for bp in blueprints], key=lambda x: x[0], reverse=True)
    top = scored[:25]
    idx = today_seed % len(top)
    score, daily = top[idx]
    return {**daily, "match_score": score}

@api_router.get("/blueprints/carousels")
async def get_blueprint_carousels(user_id: str = None):
    user_profile = {}
    if user_id:
        u = await db.users.find_one({"id": user_id})
        if u:
            user_profile = u.get("profile", {})

    async def _fetch(query, limit=12):
        bps = await db.blueprints.find({**query, "version": "2.0"}, {"_id": 0}).to_list(limit)
        if user_profile:
            for bp in bps:
                bp["match_score"] = calculate_blueprint_match(bp, user_profile)
        return bps

    ai_bps = await _fetch({"category": "AI & Automation"})
    passive = await _fetch({"category": "Passive & Investment"})
    agency = await _fetch({"category": "Agency & B2B"})
    quick = await _fetch({"startup_cost": {"$in": ["free", "low"]}, "difficulty": {"$in": ["easy", "medium"]}}, limit=10)
    high = await _fetch({"difficulty": "hard"})
    digital = await _fetch({"category": "Digital & Content"})
    local = await _fetch({"category": "Local & Service"})
    nocode = await _fetch({"category": "No-Code & SaaS"})

    carousels = []
    if ai_bps: carousels.append({"id": "ai", "title": "Trending in AI", "subtitle": "AI-powered income streams", "icon": "flash", "color": "#6366F1", "blueprints": ai_bps})
    if high: carousels.append({"id": "high-ticket", "title": "High-Ticket Earners", "subtitle": "High effort, maximum reward", "icon": "diamond", "color": "#F59E0B", "blueprints": high})
    if quick: carousels.append({"id": "quick-wins", "title": "Quick Wins", "subtitle": "Low cost, fast first dollar", "icon": "timer", "color": "#00D95F", "blueprints": quick})
    if passive: carousels.append({"id": "passive", "title": "Passive Income", "subtitle": "Build once, earn forever", "icon": "trending-up", "color": "#10B981", "blueprints": passive})
    if agency: carousels.append({"id": "agency", "title": "Agency Plays", "subtitle": "B2B is where the money is", "icon": "briefcase", "color": "#3B82F6", "blueprints": agency})
    if digital: carousels.append({"id": "digital", "title": "Digital & Content", "subtitle": "Laptop-friendly income", "icon": "laptop-outline", "color": "#EC4899", "blueprints": digital})
    if local: carousels.append({"id": "local", "title": "Local Hustle", "subtitle": "Serve your community, earn big", "icon": "location", "color": "#EF4444", "blueprints": local})
    if nocode: carousels.append({"id": "nocode", "title": "No-Code Builders", "subtitle": "Ship products without code", "icon": "cube", "color": "#8B5CF6", "blueprints": nocode})
    return carousels

@api_router.get("/blueprints/search")
async def search_blueprints(q: str = "", category: str = None, difficulty: str = None, startup_cost: str = None, user_id: str = None, limit: int = 30):
    query: Dict[str, Any] = {"version": "2.0"}
    if category and category != "All":
        query["category"] = category
    if difficulty and difficulty != "all":
        query["difficulty"] = difficulty
    if startup_cost and startup_cost != "all":
        query["startup_cost"] = startup_cost
    all_bps = await db.blueprints.find(query, {"_id": 0}).to_list(200)
    if q:
        q_lower = q.lower()
        all_bps = [bp for bp in all_bps if q_lower in bp.get("title", "").lower() or q_lower in bp.get("description", "").lower() or any(q_lower in t for t in bp.get("tags", []))]
    user_profile = {}
    if user_id:
        u = await db.users.find_one({"id": user_id})
        if u:
            user_profile = u.get("profile", {})
    if user_profile:
        for bp in all_bps:
            bp["match_score"] = calculate_blueprint_match(bp, user_profile)
        all_bps.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    return all_bps[:limit]

@api_router.get("/blueprints/local-trending")
async def get_local_trending(city: str = "", country_code: str = "US", user_id: str = None):
    """Sprint 5: Returns 3 top blueprints tailored to user's region."""
    REGION_CATS = {
        "US": ["AI & Automation", "Agency & B2B", "Digital & Content"],
        "GB": ["AI & Automation", "Agency & B2B", "Digital & Content"],
        "CA": ["AI & Automation", "Digital & Content", "Agency & B2B"],
        "AU": ["AI & Automation", "Digital & Content", "Passive & Investment"],
        "IN": ["Digital & Content", "No-Code & SaaS", "AI & Automation"],
        "BR": ["Digital & Content", "Local & Service", "Agency & B2B"],
        "NG": ["Digital & Content", "Agency & B2B", "No-Code & SaaS"],
        "KE": ["Digital & Content", "Local & Service", "No-Code & SaaS"],
    }
    cats = REGION_CATS.get(country_code, ["AI & Automation", "Digital & Content", "Passive & Investment"])
    user_profile = {}
    if user_id:
        u = await db.users.find_one({"id": user_id})
        if u:
            user_profile = u.get("profile", {})
    result = []
    for cat in cats[:3]:
        bps = await db.blueprints.find({"category": cat, "version": "2.0"}, {"_id": 0}).to_list(20)
        if bps:
            if user_profile:
                for bp in bps:
                    bp["match_score"] = calculate_blueprint_match(bp, user_profile)
                bps.sort(key=lambda x: x.get("match_score", 0), reverse=True)
            result.append(bps[0])
    return {"city": city, "country_code": country_code, "blueprints": result}

@api_router.get("/blueprints/{blueprint_id}/viability")
async def get_blueprint_viability(blueprint_id: str, city: str = "", country_code: str = "US", country: str = ""):
    """Sprint 5: AI-powered local market viability assessment for a blueprint."""
    bp = await db.blueprints.find_one({"id": blueprint_id}, {"_id": 0})
    if not bp:
        bp = await db.ideas.find_one({"id": blueprint_id}, {"_id": 0})
    if not bp:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    location_str = f"{city}, {country or country_code}" if city else (country or country_code or "United States")
    prompt = f"""Analyze the market viability of this income blueprint for someone in {location_str}.

Blueprint: {bp['title']}
Category: {bp.get('category', '')}
Description: {bp.get('description', '')}

Return EXACTLY this JSON (no markdown, no extra text):
{{
  "score": 78,
  "demand_level": "High",
  "reason": "2-3 sentences explaining viability in {location_str}",
  "local_tip": "One specific actionable insight for {location_str}",
  "local_tools": ["tool1", "tool2"]
}}"""
    try:
        llm_key = os.environ["EMERGENT_LLM_KEY"]
        session_id = f"viability-{blueprint_id}-{city}-{country_code}"
        chat = LlmChat(api_key=llm_key, session_id=session_id, system_message="You are a local market analyst. Always return valid JSON.")
        chat.with_model("gemini", "gemini-3-flash-preview")
        response = await chat.send_message(UserMessage(text=prompt))
        import re as _re, json as _json
        match = _re.search(r'\{.*\}', response, _re.DOTALL)
        if match:
            return _json.loads(match.group())
    except Exception as e:
        logger.error(f"Viability generation error: {e}")
    return {"score": 72, "demand_level": "Medium", "reason": f"Market data for {location_str} is currently being analyzed.", "local_tip": "Research local demand before launching.", "local_tools": []}

@api_router.post("/rescue/{user_id}/{idea_id}")
async def generate_rescue_tasks(user_id: str, idea_id: str):
    """Sprint 5: Architect-only. Generates 3 AI-powered Quick-Cash tasks for stuck users."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.get("is_architect", False):
        raise HTTPException(status_code=403, detail="Architect tier required for Rescue Mode")
    bp = await db.blueprints.find_one({"id": idea_id}, {"_id": 0})
    if not bp:
        bp = await db.ideas.find_one({"id": idea_id}, {"_id": 0})
    if not bp:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    saved_idea = await db.saved_ideas.find_one({"user_id": user_id, "idea_id": idea_id}, {"_id": 0})
    stuck_step_text = "getting started"
    stuck_step_num = 1
    if saved_idea:
        for step in saved_idea.get("action_steps", []):
            if not step.get("completed"):
                stuck_step_text = step.get("text", "getting started")
                stuck_step_num = step.get("step_number", 1)
                break
    profile = user.get("profile", {})
    city = profile.get("city", "")
    country = profile.get("country", "")
    location_ctx = f"in {city}, {country}" if city else "remotely"
    assets = ", ".join(profile.get("assets", [])) or "none"
    prompt = f"""You are Blueprint Rescue AI. A user is stuck on their income blueprint and needs 3 quick-cash tasks completable in 48 hours to earn $50-$200 immediately.

CONTEXT:
- Blueprint: {bp['title']} ({bp.get('category', '')})
- Stuck on Step {stuck_step_num}: "{stuck_step_text}"
- Location: {location_ctx}
- Available assets: {assets}

Generate EXACTLY 3 "Quick-Cash Sprint" tasks that:
1. Take 24-48 hours to complete
2. Require zero upfront cost
3. Leverage skills directly from this blueprint
4. Can realistically earn $50-$200 today

Return EXACTLY this JSON (no markdown):
{{
  "rescue_message": "One energizing sentence acknowledging their situation and why this works",
  "tasks": [
    {{
      "title": "Task name under 6 words",
      "description": "Exactly what to do — step by step (2 sentences)",
      "estimated_earn": "$X-$Y",
      "time_required": "X-Y hours",
      "action_label": "2-3 word CTA"
    }},
    {{
      "title": "Task 2",
      "description": "What to do",
      "estimated_earn": "$X-$Y",
      "time_required": "X-Y hours",
      "action_label": "Short CTA"
    }},
    {{
      "title": "Task 3",
      "description": "What to do",
      "estimated_earn": "$X-$Y",
      "time_required": "X-Y hours",
      "action_label": "Short CTA"
    }}
  ]
}}"""
    try:
        llm_key = os.environ["EMERGENT_LLM_KEY"]
        session_id = f"rescue-{user_id}-{idea_id}-{datetime.now().strftime('%Y%m%d')}"
        chat = LlmChat(api_key=llm_key, session_id=session_id, system_message="You are a financial rescue specialist. Always return valid JSON only.")
        chat.with_model("gemini", "gemini-3-flash-preview")
        response = await chat.send_message(UserMessage(text=prompt))
        import re as _re, json as _json
        match = _re.search(r'\{.*\}', response, _re.DOTALL)
        if match:
            result = _json.loads(match.group())
            result["stuck_step"] = stuck_step_text
            result["stuck_step_num"] = stuck_step_num
            return result
    except Exception as e:
        logger.error(f"Rescue generation error: {e}")
    raise HTTPException(status_code=500, detail="Failed to generate rescue tasks")

@api_router.get("/blueprints/{blueprint_id}")
async def get_blueprint(blueprint_id: str):
    bp = await db.blueprints.find_one({"id": blueprint_id}, {"_id": 0})
    if not bp:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    return bp

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
