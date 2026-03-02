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

# ============= Routes =============

@api_router.post("/auth/signup")
async def signup(user_data: UserSignup):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    password_hash = hash_password(user_data.password)
    user = User(email=user_data.email, name=user_data.name, password_hash=password_hash)
    await db.users.insert_one(user.dict())
    return {"id": user.id, "email": user.email, "name": user.name, "is_guest": False, "profile": user.profile.dict()}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"id": user["id"], "email": user["email"], "name": user["name"], "is_guest": False, "profile": user.get("profile", {})}

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
