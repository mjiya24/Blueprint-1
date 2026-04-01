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
from datetime import datetime, timezone, timedelta
import bcrypt
from bson import ObjectId
import httpx
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
logger = logging.getLogger(__name__)

def get_mongo_url():
    env_keys = [
        "MONGO_URL",
        "MONGO_URI",
        "MONGODB_URI",
        "DATABASE_URL",
        "MONGODB_URL",
    ]
    for key in env_keys:
        value = os.getenv(key)
        if value:
            return value, key
    return "mongodb://localhost:27017", "default"

mongo_url, mongo_url_source = get_mongo_url()
if mongo_url_source == "default":
    logger.warning("No Mongo env variable found; falling back to localhost")

if not mongo_url:
    raise RuntimeError(
        "One of MONGO_URL, MONGO_URI, MONGODB_URI, DATABASE_URL, or MONGODB_URL is required"
    )

db_name = os.getenv("DB_NAME") or os.getenv("DATABASE_NAME") or "blueprint_db"
client = AsyncIOMotorClient(
    mongo_url,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
    socketTimeoutMS=10000,
)
db = client[db_name]

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
    },
    # ============= QUICK WINS — $0 to Start, First $ in <60 min =============
    {
        "id": "qw-001",
        "title": "DataAnnotation Tech — AI Training",
        "description": "Get paid $20-$40/hr to train AI models by rating responses, writing prompts, and labeling data. No experience needed. DataAnnotation is one of the most legitimate, high-paying platforms for AI workers in 2025-2026. Payments via PayPal within 48 hours.",
        "category": "Quick Wins",
        "required_skills": ["Reading", "Critical Thinking", "English"],
        "startup_cost": "free",
        "time_needed": "flexible",
        "is_location_based": False,
        "is_quick_win": True,
        "location_types": ["online"],
        "action_steps": [
            "Go to DataAnnotation.tech and click 'Apply Now' — the form takes 5 minutes",
            "Complete the short skills assessment (multiple choice, 15 min) — there is no trick, just be honest and careful",
            "Wait for approval email (usually same day or 1-2 business days)",
            "Once approved, log in and pick tasks from the task queue — start with 'Conversation Rating' tasks (easiest)",
            "Complete 5 tasks to get comfortable with the platform and quality expectations",
            "Submit your first batch — payment is sent to PayPal within 48 hours",
            "Set a daily goal of 2-3 hours to earn $40-$80/day consistently"
        ],
        "potential_earnings": "$20-$40/hour",
        "difficulty": "beginner",
        "tags": ["quick-win", "ai-training", "no-cost", "remote", "same-day-pay"],
        "environment_fit": ["home", "office", "any"],
        "social_fit": ["solo"],
        "asset_requirements": ["laptop"],
        "interest_tags": ["tech", "finance"],
        "affiliate_link": "https://www.dataannotation.tech/",
        "badge": "VERIFIED",
        "time_to_first_dollar": "24-48 hours",
        "minimum_payout": "$10"
    },
    {
        "id": "qw-002",
        "title": "UserInterviews — $75/hr Focus Groups",
        "description": "Get paid $50-$150 per session to share your opinions in online focus groups and user research studies. UserInterviews connects real people with brands like Google, Microsoft, and Netflix who pay top dollar for genuine feedback. Sessions are 30-90 minutes via Zoom.",
        "category": "Quick Wins",
        "required_skills": ["Communication", "Honesty"],
        "startup_cost": "free",
        "time_needed": "flexible",
        "is_location_based": False,
        "is_quick_win": True,
        "location_types": ["online"],
        "action_steps": [
            "Sign up at UserInterviews.com — it's free and takes 3 minutes",
            "Complete your profile fully (the more detail, the more studies you qualify for)",
            "Browse open studies and apply to 5-10 that match your demographics",
            "Once selected, you'll get a confirmation email with Zoom link and payment info",
            "Show up on time, be genuine and articulate — they pay for honest feedback",
            "After the session, payment arrives via PayPal or Tremendous gift card within 5-7 days",
            "Stay active and check back weekly — new studies post constantly"
        ],
        "potential_earnings": "$50-$150/session",
        "difficulty": "beginner",
        "tags": ["quick-win", "focus-group", "no-cost", "remote", "opinion"],
        "environment_fit": ["home", "any"],
        "social_fit": ["customer-facing"],
        "asset_requirements": ["laptop"],
        "interest_tags": ["tech", "creative", "finance"],
        "affiliate_link": "https://www.userinterviews.com/participants",
        "badge": "VERIFIED",
        "time_to_first_dollar": "3-7 days",
        "minimum_payout": "$50"
    },
    {
        "id": "qw-003",
        "title": "Freecash — Play-to-Earn & Survey Cash",
        "description": "Freecash is the highest-rated get-paid-to (GPT) platform in 2026. Earn real money by playing mobile games, completing offers, and taking surveys. Top users earn $30+/day. Instant PayPal/Crypto payouts. 4.7 stars on Trustpilot with 150,000+ reviews.",
        "category": "Quick Wins",
        "required_skills": ["Patience", "Gaming (optional)"],
        "startup_cost": "free",
        "time_needed": "flexible",
        "is_location_based": False,
        "is_quick_win": True,
        "location_types": ["online"],
        "action_steps": [
            "Sign up at Freecash.com — completely free, takes 2 minutes",
            "Verify your email and start with the daily free coin claim (instant $0.10-$0.50)",
            "Go to 'Offers' and sort by 'Highest Payout' — look for app download or game offers",
            "Install a featured game and reach the target level — this earns $5-$25 per game",
            "Complete 3-5 survey offers daily ($0.50-$3 each) while your game runs",
            "Stack coins fast by completing Daily, Weekly, and Monthly missions",
            "Cash out via PayPal when you hit $1 minimum — arrives in minutes"
        ],
        "potential_earnings": "$5-$30/day",
        "difficulty": "beginner",
        "tags": ["quick-win", "play-to-earn", "surveys", "no-cost", "instant-payout"],
        "environment_fit": ["home", "any"],
        "social_fit": ["solo"],
        "asset_requirements": ["laptop"],
        "interest_tags": ["tech", "finance"],
        "affiliate_link": "https://freecash.com/",
        "badge": "TOP RATED",
        "time_to_first_dollar": "Same day",
        "minimum_payout": "$1"
    },
    {
        "id": "qw-004",
        "title": "Mistplay — Get Paid to Play Mobile Games",
        "description": "Mistplay is the #1 loyalty app for mobile gamers. Play games, earn Units, and cash out real gift cards. 15 million members globally. Perfect for anyone who already spends time gaming. Earn $10-$50/month passively — more if you are dedicated.",
        "category": "Quick Wins",
        "required_skills": ["Gaming", "Patience"],
        "startup_cost": "free",
        "time_needed": "flexible",
        "is_location_based": False,
        "is_quick_win": True,
        "location_types": ["online"],
        "action_steps": [
            "Download Mistplay from the Google Play Store (Android only — iOS users: use Freecash instead)",
            "Create your free account and browse the game library",
            "Pick a featured game with high Unit multiplier — prioritize 'New' games (higher bonuses)",
            "Play for at least 30 minutes to unlock your first Unit rewards",
            "Complete in-game achievements to earn bonus Units faster",
            "Reach 1,500 Units to redeem your first $5 Amazon or PayPal gift card",
            "Maximize by playing during 2x Unit events and referring friends ($5 bonus per referral)"
        ],
        "potential_earnings": "$10-$50/month",
        "difficulty": "beginner",
        "tags": ["quick-win", "gaming", "passive", "no-cost", "gift-cards"],
        "environment_fit": ["home", "any"],
        "social_fit": ["solo"],
        "asset_requirements": ["laptop"],
        "interest_tags": ["tech", "finance"],
        "affiliate_link": "https://www.mistplay.com/",
        "badge": "POPULAR",
        "time_to_first_dollar": "1-3 days",
        "minimum_payout": "$5"
    },
    {
        "id": "qw-005",
        "title": "Solitaire Cash — Win Real Money Playing Cards",
        "description": "Solitaire Cash is a skill-based card game where you compete against real players for cash prizes. Unlike luck-based games, it rewards skill — top players win $50-$200/week. Tournaments start at $1 buy-in. Available in most US states.",
        "category": "Quick Wins",
        "required_skills": ["Solitaire", "Strategy", "Speed"],
        "startup_cost": "free",
        "time_needed": "flexible",
        "is_location_based": False,
        "is_quick_win": True,
        "location_types": ["online"],
        "action_steps": [
            "Download Solitaire Cash from the App Store or Google Play",
            "Play 10 practice rounds (free) to learn the tournament rules and scoring system",
            "Join a free-roll tournament ($0 entry) to win your first real cash prize",
            "Once you win $5+, use that to enter $1 cash tournaments — never use outside money until profitable",
            "Focus on speed AND accuracy — time bonuses are where the big points come from",
            "Play during off-peak hours (weekday mornings) when competition is lower skill level",
            "Set a daily win goal of $10 and stop once you hit it to protect your bankroll"
        ],
        "potential_earnings": "$20-$200/week",
        "difficulty": "beginner",
        "tags": ["quick-win", "skill-game", "cash-prizes", "mobile-game"],
        "environment_fit": ["home", "any"],
        "social_fit": ["solo"],
        "asset_requirements": ["laptop"],
        "interest_tags": ["finance"],
        "affiliate_link": "https://apps.apple.com/us/app/solitaire-cash-win-real-money/id1453031993",
        "badge": "SKILL-BASED",
        "time_to_first_dollar": "Same day",
        "minimum_payout": "$10"
    },
    {
        "id": "qw-006",
        "title": "Campus Courier — DoorDash/UberEats 1-Hour Setup",
        "description": "This is the definitive 1-hour guide to activate your DoorDash or UberEats account and earn your first $25 today. Optimized for college campuses and dense urban areas where orders never stop. Most dashers earn $18-$25/hr during peak hours.",
        "category": "Quick Wins",
        "required_skills": ["Navigation", "Reliability"],
        "startup_cost": "free",
        "time_needed": "flexible",
        "is_location_based": True,
        "is_quick_win": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Download both the DoorDash Dasher app AND the Uber Eats driver app right now (apply to both)",
            "Submit your documents: valid ID, driver's license, proof of insurance — takes 10 minutes",
            "While waiting for approval (usually instant to 24 hours), identify your 3 best local 'Hot Zones' (restaurants + dorms + apartments within 1 mile)",
            "Once approved, activate your account and schedule your first dash for today's lunch rush (11am-2pm) or dinner rush (5pm-9pm)",
            "Accept every order above $5 for your first hour to build acceptance rate — don't cherry-pick yet",
            "Track your earnings and tip rate — after 10 deliveries you will know your best routes and times",
            "Stack apps: if DoorDash is slow, switch to UberEats — never sit idle during peak hours"
        ],
        "potential_earnings": "$15-$25/hour",
        "difficulty": "beginner",
        "tags": ["quick-win", "gig-economy", "same-day-pay", "flexible"],
        "environment_fit": ["outdoor"],
        "social_fit": ["solo"],
        "asset_requirements": ["car"],
        "interest_tags": ["finance"],
        "affiliate_link": "https://apps.apple.com/us/app/dasher-become-a-doordash-driver/id1037922353",
        "badge": "SAME-DAY PAY",
        "time_to_first_dollar": "Same day",
        "minimum_payout": "Instant via DasherDirect"
    },
    {
        "id": "qw-007",
        "title": "Pet Partner — Rover Dog Walking ($0 to Start)",
        "description": "Become a dog walker on Rover and earn $15-$25/walk with zero startup cost. Rover handles payments, insurance, and client matching. 1-hour setup guide: from zero to booked in under 60 minutes. Perfect for animal lovers in any neighborhood.",
        "category": "Quick Wins",
        "required_skills": ["Animal Care", "Reliability"],
        "startup_cost": "free",
        "time_needed": "flexible",
        "is_location_based": True,
        "is_quick_win": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Go to Rover.com/become-a-sitter and start your free profile (15 minutes)",
            "Upload 3-5 high-quality photos: your face clearly visible + any pets you have or know",
            "Write your bio focusing on reliability and love of animals — mention any pet experience",
            "Set competitive starting rates: $18/walk (below average) to attract first reviews faster",
            "Submit your free background check through Rover — this is required and takes 1-2 days",
            "Once approved, boost discoverability by enabling the 'Available Now' badge in your settings",
            "Accept your first 3 Meet & Greets (free meetings) this week — at least 1 will book you"
        ],
        "potential_earnings": "$800-$2,000/month",
        "difficulty": "beginner",
        "tags": ["quick-win", "pets", "local", "no-cost", "recurring"],
        "environment_fit": ["outdoor"],
        "social_fit": ["customer-facing"],
        "asset_requirements": ["none"],
        "interest_tags": ["pets", "fitness"],
        "affiliate_link": "https://www.rover.com/become-a-sitter/",
        "badge": "RECURRING INCOME",
        "time_to_first_dollar": "3-7 days",
        "minimum_payout": "$25"
    },
    {
        "id": "qw-008",
        "title": "BioLife Plasma Donation — $100+ First Week",
        "description": "Donate plasma at BioLife Plasma Services and earn up to $100 for your first two donations. New donors regularly earn $600-$800 in their first month through new donor promotions. Safe, medically supervised, and you can donate twice per week. Your body replenishes plasma in 48 hours.",
        "category": "Quick Wins",
        "required_skills": ["Physical Health", "Commitment"],
        "startup_cost": "free",
        "time_needed": "flexible",
        "is_location_based": True,
        "is_quick_win": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Find your nearest BioLife center at BioLifePlasma.com/locations",
            "Create a free donor account online and schedule your first appointment",
            "Prepare the day before: drink 6-8 glasses of water, eat a protein-rich meal, avoid alcohol and fatty foods",
            "Bring valid photo ID and proof of address — your first visit includes a free medical screening",
            "Your first donation takes 2-3 hours (including screening) — bring headphones and something to watch",
            "Return within 7 days for your second donation — together the first two pay $100+ via prepaid Visa card",
            "Set a recurring schedule of every Monday and Thursday to maximize monthly earnings ($200-$400/month ongoing)"
        ],
        "potential_earnings": "$200-$400/month",
        "difficulty": "beginner",
        "tags": ["quick-win", "plasma", "medical", "local", "recurring"],
        "environment_fit": ["outdoor", "any"],
        "social_fit": ["solo"],
        "asset_requirements": ["none"],
        "interest_tags": ["finance", "fitness"],
        "affiliate_link": "https://www.biolifeplasma.com/en/locations.html",
        "badge": "QUICK $100",
        "time_to_first_dollar": "Same day",
        "minimum_payout": "Paid per donation"
    },
    {
        "id": "qw-009",
        "title": "FanDuel New User Bonus — Bet $5, Get $200",
        "description": "FanDuel's new user welcome offer gives you $200 in bonus bets when you place your first $5 wager. This is a legal, verified bonus available in 25+ US states. Strategy: use the bonus bets on high-probability outcomes to maximize your expected return. Legal where sports betting is active.",
        "category": "Quick Wins",
        "required_skills": ["Sports Knowledge (optional)", "Discipline"],
        "startup_cost": "free",
        "time_needed": "flexible",
        "is_location_based": False,
        "is_quick_win": True,
        "requires_state_check": True,
        "restricted_states": ["CA", "TX", "UT", "HI", "ID", "WI", "GA", "AL", "AK", "MN", "MO", "OK", "MS", "NE", "NM", "ND", "SD", "WA", "SC"],
        "location_types": ["online"],
        "action_steps": [
            "Verify your state is eligible (see list) — if not, see the 'Banking Bonuses' blueprint instead",
            "Download the FanDuel app or go to FanDuel.com and click 'Sign Up'",
            "Complete identity verification (required by law) — use your real name and address",
            "Deposit $10 via debit card or PayPal",
            "Place your first $5 bet on any sport (moneyline bets on heavy favorites have ~85% win rate)",
            "You will immediately receive $200 in bonus bets in your account regardless of outcome",
            "Use bonus bets strategically on favorites with -300 or better odds to convert ~65% to real cash"
        ],
        "potential_earnings": "$50-$200 one-time",
        "difficulty": "beginner",
        "tags": ["quick-win", "sports-betting", "bonus-hunting", "state-gated"],
        "environment_fit": ["home", "any"],
        "social_fit": ["solo"],
        "asset_requirements": ["none"],
        "interest_tags": ["finance"],
        "affiliate_link": "https://www.fanduel.com/join",
        "badge": "STATE GATED",
        "time_to_first_dollar": "Same day",
        "minimum_payout": "Varies",
        "requires_state_check": True,
        "restricted_states": ["CA", "TX", "UT", "HI", "ID", "WI", "GA", "AL", "AK", "MN", "MO", "OK", "MS", "NE", "NM", "ND", "SD", "WA", "SC"]
    },
    {
        "id": "qw-010",
        "title": "Bank Account Bonus Hunting — $200-$500 Free",
        "description": "Banks pay new customers $200-$500 just for opening an account and meeting simple requirements like direct deposit. This is 100% legal, risk-free cash. Top 2026 offers: Chase $300 (direct deposit), SoFi $300 (direct deposit), Discover $200 (spend $500). Stack multiple banks for $1,000+ per year.",
        "category": "Quick Wins",
        "required_skills": ["Organization", "Basic Budgeting"],
        "startup_cost": "free",
        "time_needed": "flexible",
        "is_location_based": False,
        "is_quick_win": True,
        "location_types": ["online"],
        "action_steps": [
            "Visit BankBonuses.com or DoctorofCredit.com to find the current best bank offers",
            "Start with Chase Total Checking ($300 bonus) — open account online in 5 minutes",
            "Set up one direct deposit from your employer or Venmo business (qualifies at most banks)",
            "Meet minimum deposit requirement (usually $500-$1,000 in first 30 days)",
            "After receiving your first bonus (4-8 weeks), move to the next bank on your list",
            "Track all accounts in a spreadsheet: bank name, bonus amount, requirement, deadline",
            "Never close the account before 6 months (early closure fee can negate the bonus)"
        ],
        "potential_earnings": "$200-$1,000/year",
        "difficulty": "beginner",
        "tags": ["quick-win", "bank-bonus", "no-risk", "no-cost", "100-percent-legal"],
        "environment_fit": ["home", "any"],
        "social_fit": ["solo"],
        "asset_requirements": ["none"],
        "interest_tags": ["finance"],
        "affiliate_link": "https://www.doctorofcredit.com/best-current-bank-account-bonuses/",
        "badge": "100% RISK-FREE",
        "time_to_first_dollar": "4-8 weeks",
        "minimum_payout": "$200"
    },
    {
        "id": "qw-011",
        "title": "Survey Junkie — $40+/day in Spare Time",
        "description": "Survey Junkie is the highest-paying legitimate survey platform in 2026. Earn $1-$5 per survey, takes 5-15 minutes each. Cash out via PayPal or e-gift card. 13+ million members. Perfect for dead time: commutes, waiting rooms, lunch breaks. Most users earn $10-$40/day if consistent.",
        "category": "Quick Wins",
        "required_skills": ["Honesty", "Consistency"],
        "startup_cost": "free",
        "time_needed": "flexible",
        "is_location_based": False,
        "is_quick_win": True,
        "location_types": ["online"],
        "action_steps": [
            "Sign up at SurveyJunkie.com — completely free, takes 2 minutes",
            "Complete your full profile immediately — this unlocks higher-paying surveys",
            "Start with the 'Profile Surveys' first (pays 500-1000 points, quickest)",
            "Check for new surveys every morning — the best ones close fast",
            "Stack Survey Junkie with Swagbucks and Prolific for maximum earnings per day",
            "Refer friends: earn 200 points for every friend who earns their first 1,000 points",
            "Cash out at $10 minimum via PayPal — arrives in 1-5 business days"
        ],
        "potential_earnings": "$5-$40/day",
        "difficulty": "beginner",
        "tags": ["quick-win", "surveys", "no-cost", "remote", "spare-time"],
        "environment_fit": ["home", "any"],
        "social_fit": ["solo"],
        "asset_requirements": ["laptop"],
        "interest_tags": ["finance"],
        "affiliate_link": "https://www.surveyjunkie.com/",
        "badge": "TOP RATED",
        "time_to_first_dollar": "Same day",
        "minimum_payout": "$10"
    },
    {
        "id": "qw-012",
        "title": "Scrambly — P2E Gaming ($0 Start)",
        "description": "Scrambly is a 2026 breakout Play-to-Earn app that pays real cash for completing word puzzles and mini-games. No skills needed. 4.8 stars, 80,000+ reviews. Earns $5-$20/day just from daily play. Instant PayPal payouts at $2 minimum.",
        "category": "Quick Wins",
        "required_skills": ["Patience", "Basic Word Skills"],
        "startup_cost": "free",
        "time_needed": "flexible",
        "is_location_based": False,
        "is_quick_win": True,
        "location_types": ["online"],
        "action_steps": [
            "Download Scrambly from the App Store or Google Play — free, 2 minutes",
            "Create your account and claim the new-user welcome bonus (usually $0.50-$2.00)",
            "Complete the tutorial (5 minutes) — this unlocks your first cash mission",
            "Play 20 rounds of the daily word scramble puzzle to earn your first $1",
            "Use the 'Bonus Time' feature every 4 hours for 2x point multipliers",
            "Refer 2 friends for a $5 bonus each (they don't even have to play — just sign up)",
            "Cash out at $2 minimum via PayPal — arrives within 24 hours"
        ],
        "potential_earnings": "$5-$20/day",
        "difficulty": "beginner",
        "tags": ["quick-win", "play-to-earn", "gaming", "word-games", "no-cost"],
        "environment_fit": ["home", "any"],
        "social_fit": ["solo"],
        "asset_requirements": ["laptop"],
        "interest_tags": ["tech", "finance"],
        "affiliate_link": "https://apps.apple.com/us/app/scrambly/id1643534743",
        "badge": "NEW 2026",
        "time_to_first_dollar": "Same day",
        "minimum_payout": "$2"
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
    try:
        existing_user = await db.users.find_one({"email": user_data.email})
    except Exception as exc:
        logger.error("Database error during signup", exc_info=exc)
        raise HTTPException(status_code=503, detail="Database unavailable")
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    password_hash = hash_password(user_data.password)
    user = User(email=user_data.email, name=user_data.name, password_hash=password_hash)
    try:
        await db.users.insert_one(user.dict())
    except Exception as exc:
        logger.error("Database error inserting user during signup", exc_info=exc)
        raise HTTPException(status_code=503, detail="Database unavailable")

    return {"id": user.id, "email": user.email, "name": user.name, "is_guest": False, "is_architect": False, "profile": user.profile.dict()}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    try:
        user = await db.users.find_one({"email": credentials.email})
    except Exception as exc:
        logger.error("Database error during login", exc_info=exc)
        raise HTTPException(status_code=503, detail="Database unavailable")

    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {
        "id": user["id"], "email": user["email"], "name": user["name"],
        "is_guest": False, "is_architect": user.get("is_architect", False),
        "profile": user.get("profile", {}),
        "phone_verified": user.get("phone_verified", False),
        "phone_number": user.get("phone_number", ""),
    }

@api_router.post("/auth/guest")
async def create_guest():
    guest = GuestUser()
    try:
        await db.users.insert_one(guest.dict())
    except Exception as exc:
        logger.error("Database error creating guest user", exc_info=exc)
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"id": guest.id, "name": guest.name, "is_guest": True, "profile": guest.profile.dict()}

# ============= Sprint 7B: Firebase Phone Verification =============

class PhoneVerifyRequest(BaseModel):
    user_id: str
    firebase_id_token: str

@api_router.post("/auth/verify-phone")
async def verify_phone(data: PhoneVerifyRequest):
    """Verify Firebase phone OTP and mark user as phone-verified."""
    firebase_api_key = os.environ.get("FIREBASE_WEB_API_KEY", "")
    if not firebase_api_key:
        raise HTTPException(status_code=500, detail="Firebase not configured")
    import httpx
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={firebase_api_key}",
            json={"idToken": data.firebase_id_token}
        )
    if resp.status_code != 200:
        logger.error(f"Firebase token verification failed: {resp.text}")
        raise HTTPException(status_code=400, detail="Invalid or expired Firebase token")
    users_data = resp.json().get("users", [])
    if not users_data:
        raise HTTPException(status_code=400, detail="No user found for this token")
    firebase_user = users_data[0]
    phone_number = firebase_user.get("phoneNumber")
    if not phone_number:
        raise HTTPException(status_code=400, detail="Phone number not verified in this token")
    # Update MongoDB
    result = await db.users.update_one(
        {"id": data.user_id},
        {"$set": {"phone_number": phone_number, "phone_verified": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"verified": True, "phone": phone_number}

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

@api_router.get("/location/ip-detect")
async def detect_ip_location(request: Request):
    """Sprint 5: Server-side IP geolocation proxy (avoids CORS)."""
    try:
        import httpx
        # Get real client IP from headers
        forwarded_for = request.headers.get("X-Forwarded-For", "")
        client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else ""
        url = f"https://ipapi.co/{client_ip}/json/" if client_ip else "https://ipapi.co/json/"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            data = resp.json()
        return {
            "city": data.get("city", ""),
            "state": data.get("region", ""),
            "country": data.get("country_name", ""),
            "country_code": data.get("country_code", "US"),
        }
    except Exception as e:
        logger.error(f"IP detect error: {e}")
        return {"city": "", "state": "", "country": "", "country_code": "US"}
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
    """Seed ideas if DB is empty or if ideas lack new schema fields (Sprint 9: Scrambly added)"""
    count = await db.ideas.count_documents({})
    if count == 0:
        await db.ideas.insert_many(PRE_POPULATED_IDEAS)
        return
    # Migration: check if ideas have new fields
    old_ideas = await db.ideas.count_documents({"environment_fit": {"$exists": False}})
    qw_count = await db.ideas.count_documents({"is_quick_win": True})
    expected_qw = len([i for i in PRE_POPULATED_IDEAS if i.get("is_quick_win")])
    if old_ideas > 0 or qw_count < expected_qw:
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
    # Award +5 ARC for daily check-in on new days
    if is_new_day:
        await db.users.update_one({"id": user_id}, {"$inc": {"arc_balance": 5}})
    return {
        "streak_current": current_streak, "streak_longest": longest_streak,
        "is_new_day": is_new_day, "arc_awarded": 5 if is_new_day else 0,
        "message": f"Streak: {current_streak} days!" + (" +5 ARC" if is_new_day else ""),
    }

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

# ============= Sprint 6: Victory Lap / Completion Engine =============

@api_router.get("/completions/percentile/{idea_id}")
async def get_completion_percentile(idea_id: str, days: float = 0):
    """Calculate where this completion speed ranks among all finishers."""
    all_completions = await db.completions.find({"idea_id": idea_id}, {"_id": 0, "completion_days": 1}).to_list(1000)
    total = len(all_completions)
    if total == 0:
        return {"percentile": 50, "total_completions": 1, "completion_days": days}
    faster_count = sum(1 for c in all_completions if c.get("completion_days", 9999) > days)
    percentile = round((faster_count / total) * 100)
    return {"percentile": percentile, "total_completions": total + 1, "completion_days": days}

@api_router.post("/completions/{user_id}/{idea_id}")
async def save_completion(user_id: str, idea_id: str, data: Dict[str, Any]):
    """Sprint 6: Save a user's blueprint completion record with earnings + strategy."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "idea_id": idea_id,
        "earnings": float(data.get("earnings", 0)),
        "strategy": data.get("strategy", ""),
        "tricky_step": data.get("tricky_step", ""),
        "improvement_tip": data.get("improvement_tip", ""),
        "completion_days": float(data.get("completion_days", 0)),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "username": user.get("name", ""),
    }
    await db.completions.insert_one(record)
    # Mark the saved_idea as fully complete
    await db.saved_ideas.update_one(
        {"user_id": user_id, "idea_id": idea_id},
        {"$set": {"status": "completed", "progress_percentage": 100, "earnings_unlocked": True}}
    )
    # Add a win to the community feed
    if record["earnings"] > 0:
        win = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "idea_id": idea_id,
            "blueprint_title": (await db.ideas.find_one({"id": idea_id}, {"_id": 0, "title": 1}) or
                                await db.blueprints.find_one({"id": idea_id}, {"_id": 0, "title": 1}) or {}).get("title", ""),
            "description": data.get("strategy", "Completed the full blueprint!"),
            "amount": record["earnings"],
            "created_at": record["completed_at"],
            "username": record["username"],
        }
        await db.community_wins.insert_one(win)
    return {"message": "Completion saved", "id": record["id"]}

# ============= Sprint 7: ARC Credits System =============

ARC_EVENTS = {
    "step_complete": 10,
    "blueprint_complete": 100,
    "share_flex": 25,
    "daily_login": 5,
}

def get_arc_level(balance: int) -> str:
    if balance >= 1000: return "Legend"
    if balance >= 600: return "Architect"
    if balance >= 300: return "Strategist"
    if balance >= 100: return "Builder"
    return "Apprentice"

def get_next_arc_milestone(balance: int) -> int:
    for m in [100, 300, 600, 1000]:
        if balance < m:
            return m
    return 1000

class ARCAwardRequest(BaseModel):
    user_id: str
    event: str  # step_complete | blueprint_complete | share_flex | daily_login

@api_router.get("/arc/{user_id}")
async def get_arc_balance(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "arc_balance": 1, "id": 1})
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    balance = user.get("arc_balance", 0)
    return {
        "arc_balance": balance,
        "level": get_arc_level(balance),
        "next_milestone": get_next_arc_milestone(balance),
    }

@api_router.post("/arc/award")
async def award_arc(data: ARCAwardRequest):
    amount = ARC_EVENTS.get(data.event, 0)
    if amount == 0:
        raise HTTPException(status_code=400, detail="Unknown ARC event")
    result = await db.users.update_one(
        {"id": data.user_id},
        {"$inc": {"arc_balance": amount}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"id": data.user_id}, {"_id": 0, "arc_balance": 1})
    new_balance = user.get("arc_balance", 0)
    return {
        "awarded": amount,
        "new_balance": new_balance,
        "level": get_arc_level(new_balance),
        "event": data.event,
    }

# ============= Sprint 8: Quick Wins & Tactical AI =============

GAMBLING_RESTRICTED_STATES = {
    "CA", "TX", "UT", "HI", "ID", "WI", "GA", "AL", "AK",
    "MN", "MO", "OK", "MS", "NE", "NM", "ND", "SD", "WA", "SC"
}

@api_router.get("/quick-wins")
async def get_quick_wins(user_state: str = "", user_id: str = None):
    """Sprint 8: Returns all Quick Win ideas, filtered by state for gambling content."""
    await ensure_ideas_seeded()
    ideas = await db.ideas.find({"is_quick_win": True}, {"_id": 0}).to_list(50)
    user_state_upper = user_state.upper().strip()
    # Apply state filter for gambling/betting ideas
    filtered = []
    for idea in ideas:
        if idea.get("requires_state_check") and user_state_upper in GAMBLING_RESTRICTED_STATES:
            continue  # Hide gambling ideas in restricted states
        filtered.append(idea)
    # Attach match scores if user_id provided
    if user_id:
        user = await db.users.find_one({"id": user_id})
        if user:
            profile = user.get("profile", {})
            for idea in filtered:
                idea["match_score"] = calculate_match_score(profile, idea)
    return filtered

class LogWinRequest(BaseModel):
    user_id: str
    idea_id: str
    platform_name: str
    amount_earned: float
    note: str = ""

@api_router.post("/quick-wins/log")
async def log_quick_win(data: LogWinRequest):
    """Sprint 8: Log a Quick Win earnings entry + award ARC credits."""
    user = await db.users.find_one({"id": data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    win_record = {
        "id": str(uuid.uuid4()),
        "user_id": data.user_id,
        "idea_id": data.idea_id,
        "platform_name": data.platform_name,
        "amount_earned": data.amount_earned,
        "note": data.note,
        "logged_at": datetime.utcnow().isoformat(),
    }
    await db.quick_win_logs.insert_one(win_record)
    # Award ARC for logging a win
    arc_amount = min(50, max(5, int(data.amount_earned // 2)))
    await db.users.update_one({"id": data.user_id}, {"$inc": {"arc_balance": arc_amount}})
    user_updated = await db.users.find_one({"id": data.user_id}, {"_id": 0, "arc_balance": 1})
    new_balance = user_updated.get("arc_balance", 0)
    return {
        "message": "Win logged!",
        "arc_awarded": arc_amount,
        "new_arc_balance": new_balance,
        "arc_level": get_arc_level(new_balance),
    }

class TacticalAIRequest(BaseModel):
    user_id: str
    idea_id: str
    step_text: str
    idea_title: str
    city: str = ""
    state: str = ""
    country: str = ""

@api_router.post("/tactical-ai/go-deeper")
async def tactical_go_deeper(data: TacticalAIRequest):
    """Sprint 8: Gemini 3 Flash — generates 5 local leads, DM script, and objection guide for any blueprint step."""
    user = await db.users.find_one({"id": data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Build location context
    location_parts = [p for p in [data.city, data.state, data.country] if p]
    location_str = ", ".join(location_parts) if location_parts else "your city"
    profile = user.get("profile", {})
    # Use profile location if not provided in request
    if not data.city:
        location_parts = [p for p in [profile.get("city",""), profile.get("state",""), profile.get("country","")] if p]
        location_str = ", ".join(location_parts) if location_parts else "your city"

    prompt = f"""You are a hyper-tactical business development AI inside the Blueprint income app.

A user is working on this blueprint step:
BLUEPRINT: "{data.idea_title}"
STEP: "{data.step_text}"
THEIR LOCATION: {location_str}

Generate a tactical execution package with EXACTLY this JSON structure (no markdown, no extra text):
{{
  "summary": "One sentence tactical overview of exactly what to do right now",
  "local_leads": [
    {{
      "name": "Real business name in {location_str}",
      "type": "Business type (e.g. Spa, Restaurant, Gym)",
      "why": "One sentence: why this business specifically needs this service",
      "google_search_url": "https://www.google.com/search?q=BUSINESS+NAME+{location_str.replace(' ', '+')}",
      "maps_url": "https://www.google.com/maps/search/BUSINESS+TYPE+near+{location_str.replace(' ', '+')}",
      "approach": "cold_email|instagram_dm|walk_in|linkedin"
    }},
    {{
      "name": "Second business",
      "type": "Business type",
      "why": "Why they need this",
      "google_search_url": "https://www.google.com/search?q=BUSINESS+NAME+{location_str.replace(' ', '+')}",
      "maps_url": "https://www.google.com/maps/search/BUSINESS+TYPE+near+{location_str.replace(' ', '+')}",
      "approach": "instagram_dm"
    }},
    {{
      "name": "Third business",
      "type": "Business type",
      "why": "Why they need this",
      "google_search_url": "https://www.google.com/search?q=BUSINESS+NAME+{location_str.replace(' ', '+')}",
      "maps_url": "https://www.google.com/maps/search/BUSINESS+TYPE+near+{location_str.replace(' ', '+')}",
      "approach": "cold_email"
    }},
    {{
      "name": "Fourth business",
      "type": "Business type",
      "why": "Why they need this",
      "google_search_url": "https://www.google.com/search?q=BUSINESS+NAME+{location_str.replace(' ', '+')}",
      "maps_url": "https://www.google.com/maps/search/BUSINESS+TYPE+near+{location_str.replace(' ', '+')}",
      "approach": "walk_in"
    }},
    {{
      "name": "Fifth business",
      "type": "Business type",
      "why": "Why they need this",
      "google_search_url": "https://www.google.com/search?q=BUSINESS+NAME+{location_str.replace(' ', '+')}",
      "maps_url": "https://www.google.com/maps/search/BUSINESS+TYPE+near+{location_str.replace(' ', '+')}",
      "approach": "instagram_dm"
    }}
  ],
  "dm_script": {{
    "subject": "Short email subject line or DM opener (max 8 words)",
    "body": "Hi [Name],\\n\\nFull copy-paste ready message. 3-4 sentences max. Reference their specific business type. End with a clear, low-friction CTA. Sound human, not sales-y.\\n\\n[Your Name]",
    "follow_up": "A 1-sentence follow-up message to send 3 days later if no reply"
  }},
  "objection_guide": [
    {{
      "objection": "Most common objection they will hear",
      "reframe": "Exact words to say back — confident, empathetic, closes the loop"
    }},
    {{
      "objection": "Second common objection",
      "reframe": "Exact response"
    }},
    {{
      "objection": "Third common objection",
      "reframe": "Exact response"
    }}
  ]
}}"""

    try:
        llm_key = os.environ["EMERGENT_LLM_KEY"]
        session_id = f"tactical-{data.user_id}-{data.idea_id}-{uuid.uuid4().hex[:8]}"
        chat = LlmChat(
            api_key=llm_key,
            session_id=session_id,
            system_message="You are a tactical business development AI. Always return valid JSON only. No markdown. No explanations outside the JSON."
        )
        chat.with_model("gemini", "gemini-3-flash-preview")
        response_text = await chat.send_message(UserMessage(text=prompt))
        import re as _re, json as _json
        # Extract JSON from response
        match = _re.search(r'\{.*\}', response_text, _re.DOTALL)
        if match:
            result = _json.loads(match.group())
            return result
    except Exception as e:
        logger.error(f"Tactical AI error: {e}")
    # Fallback response
    return {
        "summary": f"To execute '{data.step_text}', focus on identifying the highest-value prospects in {location_str} and reaching out with a direct, specific offer.",
        "local_leads": [
            {"name": "Search Google Maps for local businesses", "type": "Various", "why": "Target businesses in your immediate area first for fastest response", "google_search_url": f"https://www.google.com/search?q={data.idea_title.replace(' ', '+')}+{location_str.replace(' ', '+')}", "maps_url": f"https://www.google.com/maps/search/{data.idea_title.replace(' ', '+')}+near+{location_str.replace(' ', '+')}", "approach": "cold_email"}
        ],
        "dm_script": {"subject": "Quick question about your business", "body": f"Hi [Name],\n\nI specialize in {data.idea_title} and noticed your business could benefit from this. Would you be open to a 15-minute call this week?\n\n[Your Name]", "follow_up": "Just checking in — did you get a chance to see my previous message?"},
        "objection_guide": [{"objection": "We don't have the budget right now", "reframe": "That's exactly why I offer a results-first trial — you only pay after you see the value. Can we start small?"}, {"objection": "We already have someone for that", "reframe": "Totally understand. I'm not here to replace anyone — I'm here to add a capability you don't currently have. What gap would be most valuable to fill?"}]
    }


# ============= Sprint 9: Earnings Dashboard, Referrals, Ads =============

ADSENSE_PUBLISHER_ID = "ca-pub-7453043458871233"
GOOGLE_ADS_ACCOUNT = "915-268-4915"

# ads.txt endpoint (must be accessible at /ads.txt for the domain)
@api_router.get("/ads.txt", include_in_schema=False)
async def serve_ads_txt():
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse("google.com, pub-7453043458871233, DIRECT, f08c47fec0942fa0")

@api_router.get("/earnings/dashboard/{user_id}")
async def get_earnings_dashboard(user_id: str):
    """Sprint 9: Returns total earnings, 30-day breakdown, and projected potential."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Actual logged wins from quick_win_logs
    from_date_30 = datetime.utcnow() - timedelta(days=30)
    all_wins = await db.quick_win_logs.find({"user_id": user_id}, {"_id": 0}).to_list(200)
    wins_30d = [w for w in all_wins if w.get("logged_at", "") >= from_date_30.isoformat()]
    
    total_earned = sum(w.get("amount_earned", 0) for w in all_wins)
    earned_30d = sum(w.get("amount_earned", 0) for w in wins_30d)
    
    # In-progress blueprints → calculate projected potential
    saved_ideas = await db.saved_ideas.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    active_plans = [s for s in saved_ideas if s.get("status") == "in_progress"]
    
    projected_potential = 0.0
    active_details = []
    for plan in active_plans:
        idea = await db.ideas.find_one({"id": plan.get("idea_id")}, {"_id": 0})
        if idea:
            # Parse potential earnings range (e.g. "$20-$40/hour" → take lower bound per-day estimate)
            earnings_str = idea.get("potential_earnings", "$0")
            try:
                import re as _re
                nums = _re.findall(r'[\d,]+', earnings_str.replace(',', ''))
                if nums:
                    low_val = float(nums[0])
                    projected_potential += low_val
                    active_details.append({
                        "idea_id": plan.get("idea_id"),
                        "title": idea.get("title", ""),
                        "potential": idea.get("potential_earnings", ""),
                        "progress_pct": plan.get("progress_percentage", 0),
                        "steps_done": plan.get("completed_steps_count", 0),
                        "total_steps": len(idea.get("action_steps", [])),
                    })
            except:
                pass
    
    # Win history (last 10)
    win_history = sorted(all_wins, key=lambda x: x.get("logged_at", ""), reverse=True)[:10]
    
    # Lifetime ARC from arc_transactions
    arc_data = await db.arc_balances.find_one({"user_id": user_id}) or {}
    lifetime_arc = arc_data.get("total_earned", 0) or user.get("arc_balance", 0)
    
    return {
        "total_earned": round(total_earned, 2),
        "earned_30d": round(earned_30d, 2),
        "projected_potential": round(projected_potential, 2),
        "total_wins_logged": len(all_wins),
        "active_plans_count": len(active_plans),
        "active_plans": active_details,
        "win_history": win_history,
        "lifetime_arc": lifetime_arc,
        "arc_balance": user.get("arc_balance", 0),
    }

# ---- Referral Engine ----
import hashlib as _hashlib

def generate_referral_code(user_id: str, name: str) -> str:
    """Generate a short unique referral code."""
    raw = f"{user_id[:8]}{name[:3].upper()}"
    return raw.replace("-", "").upper()[:8]

@api_router.get("/referrals/{user_id}")
async def get_referral_info(user_id: str):
    """Sprint 9: Get user's referral code, referral count, and earnings."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate or retrieve referral code
    ref_code = user.get("referral_code")
    if not ref_code:
        ref_code = generate_referral_code(user_id, user.get("name", "USER"))
        await db.users.update_one({"id": user_id}, {"$set": {"referral_code": ref_code}})
    
    # Count how many users were referred
    referred_count = await db.users.count_documents({"referred_by": ref_code})
    arc_from_referrals = referred_count * 100  # 100 ARC per referral
    
    return {
        "referral_code": ref_code,
        "referral_link": f"https://quick-wins-3.preview.emergentagent.com?ref={ref_code}",
        "referred_count": referred_count,
        "arc_from_referrals": arc_from_referrals,
        "reward_per_referral": 100,
    }

class ClaimReferralRequest(BaseModel):
    new_user_id: str
    referral_code: str

@api_router.post("/referrals/claim")
async def claim_referral(data: ClaimReferralRequest):
    """Sprint 9: New user claims a referral code → referrer gets 100 ARC."""
    # Find referrer
    referrer = await db.users.find_one({"referral_code": data.referral_code})
    if not referrer:
        raise HTTPException(status_code=404, detail="Referral code not found")
    
    new_user = await db.users.find_one({"id": data.new_user_id})
    if not new_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check not already claimed
    if new_user.get("referred_by"):
        raise HTTPException(status_code=400, detail="Referral already claimed")
    
    # Award 100 ARC to referrer
    await db.users.update_one({"id": referrer["id"]}, {"$inc": {"arc_balance": 100}})
    # Mark new user as referred
    await db.users.update_one({"id": data.new_user_id}, {"$set": {"referred_by": data.referral_code}})
    # Also give 25 ARC bonus to new user
    await db.users.update_one({"id": data.new_user_id}, {"$inc": {"arc_balance": 25}})
    
    return {
        "message": "Referral claimed!",
        "referrer_name": referrer.get("name", ""),
        "arc_awarded_to_referrer": 100,
        "arc_bonus_for_you": 25,
    }

# ---- Rewarded Ad Verification ----
class AdRewardRequest(BaseModel):
    user_id: str
    feature_id: str  # e.g. "go-deeper-step-3"
    ad_type: str = "rewarded_video"  # rewarded_video | banner

@api_router.post("/ads/reward-verify")
async def verify_ad_reward(data: AdRewardRequest):
    """Sprint 9: Verify ad watch → unlock Go Deeper for free users (24hr window)."""
    user = await db.users.find_one({"id": data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Record unlock with 24hr expiry
    unlock_key = f"ad_unlock_{data.user_id}_{data.feature_id}"
    unlock_record = {
        "user_id": data.user_id,
        "feature_id": data.feature_id,
        "unlocked_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
        "ad_type": data.ad_type,
    }
    await db.ad_unlocks.replace_one(
        {"user_id": data.user_id, "feature_id": data.feature_id},
        unlock_record, upsert=True
    )
    # Award 5 ARC for watching an ad
    await db.users.update_one({"id": data.user_id}, {"$inc": {"arc_balance": 5}})
    
    return {"unlocked": True, "feature_id": data.feature_id, "valid_for_hours": 24, "arc_bonus": 5}

@api_router.get("/ads/check-unlock/{user_id}/{feature_id}")
async def check_ad_unlock(user_id: str, feature_id: str):
    """Sprint 9: Check if a feature is unlocked via ad watch."""
    unlock = await db.ad_unlocks.find_one({"user_id": user_id, "feature_id": feature_id})
    if not unlock:
        return {"unlocked": False}
    expires = unlock.get("expires_at", "")
    if expires < datetime.utcnow().isoformat():
        return {"unlocked": False, "expired": True}
    return {"unlocked": True, "expires_at": expires}

@api_router.get("/ads/config")
async def get_ads_config():
    """Sprint 9: Returns AdSense configuration."""
    return {
        "publisher_id": ADSENSE_PUBLISHER_ID,
        "channel_id": "f08c47fec0942fa0",
        "google_ads_account": GOOGLE_ADS_ACCOUNT,
        "rewarded_enabled": True,
        "banner_enabled": True,
    }

def mask_mongo_url(url: str) -> str:
    if "mongodb+srv" in url:
        return "mongodb+srv://<hidden>"
    if "mongodb://" in url:
        return "mongodb://<hidden>"
    return "<hidden>"


@app.get("/health")
async def health_check(debug: bool = False):
    try:
        await client.admin.command("ping")
        result = {"status": "ok", "database": "connected"}
    except Exception as exc:
        logger.error("Health check failed", exc_info=exc)
        if debug:
            return {
                "status": "error",
                "detail": "Database unavailable",
                "mongo_url_source": mongo_url_source,
                "db_name": db_name,
                "mongo_url_preview": mask_mongo_url(mongo_url),
            }
        raise HTTPException(status_code=503, detail="Database unavailable")

    if debug:
        result.update({
            "mongo_url_source": mongo_url_source,
            "db_name": db_name,
            "mongo_url_preview": mask_mongo_url(mongo_url),
        })
    return result


@app.get("/")
async def root():
    return {"message": "Blueprint-1 API is officially LIVE locally!"}


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
