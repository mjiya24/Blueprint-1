from fastapi import FastAPI, APIRouter, HTTPException, Depends
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
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
    budget: str = ""  # low, medium, high
    time_availability: str = ""  # part-time, full-time, flexible
    location: Optional[Dict[str, float]] = None

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

class Idea(BaseModel):
    id: str
    title: str
    description: str
    category: str
    required_skills: List[str]
    startup_cost: str  # low, medium, high
    time_needed: str  # part-time, full-time
    is_location_based: bool
    location_types: List[str]  # urban, suburban, rural, online
    action_steps: List[str]
    potential_earnings: str
    difficulty: str  # beginner, intermediate, advanced
    tags: List[str]

class ActionStep(BaseModel):
    step_number: int
    text: str
    completed: bool = False
    completed_at: Optional[datetime] = None
    is_scary_step: bool = False  # Triggers big celebration animation

class SavedIdea(BaseModel):
    user_id: str
    idea_id: str
    status: str = "saved"  # saved, in-progress, completed
    notes: str = ""
    saved_at: datetime = Field(default_factory=datetime.utcnow)
    action_steps: List[ActionStep] = []
    progress_percentage: int = 0
    earnings_unlocked: bool = False  # True when setup steps complete

# ============= Helper Functions =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

# ============= Pre-populated Ideas =============

PRE_POPULATED_IDEAS = [
    {
        "id": str(uuid.uuid4()),
        "title": "Retail Arbitrage - Buy Low, Sell High",
        "description": "Find discounted items at retail stores (clearance, liquidation) and resell them online on platforms like eBay, Amazon, or Facebook Marketplace. Focus on electronics, toys, or seasonal items.",
        "category": "Flipping & Reselling",
        "required_skills": ["Research", "Negotiation", "Photography"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Download price scanning apps (Amazon Seller, eBay)",
            "Visit local discount stores, clearance sections",
            "Scan items to check resale value",
            "Purchase profitable items",
            "List on marketplace with good photos",
            "Ship items and collect profit"
        ],
        "potential_earnings": "$500-$3000/month",
        "difficulty": "beginner",
        "tags": ["side-hustle", "flexible", "scalable"]
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Parking Space Rental Middleman",
        "description": "Find people with unused parking spaces and rent them out to people who need parking. You act as the middleman, taking a commission. Perfect for urban areas near stadiums, airports, or business districts.",
        "category": "Middleman",
        "required_skills": ["Communication", "Marketing", "Negotiation"],
        "startup_cost": "low",
        "time_needed": "part-time",
        "is_location_based": True,
        "location_types": ["urban"],
        "action_steps": [
            "Identify high-demand parking areas",
            "Contact property owners with unused spaces",
            "List spaces on parking apps or social media",
            "Set pricing (20-30% commission)",
            "Handle bookings and payments",
            "Build recurring relationships"
        ],
        "potential_earnings": "$800-$2500/month",
        "difficulty": "intermediate",
        "tags": ["recurring-income", "location-based", "low-overhead"]
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Domain Name Flipping",
        "description": "Buy undervalued domain names and sell them for profit. Look for expired domains with traffic, brandable names, or keyword-rich domains. This is a gray area goldmine if done right.",
        "category": "Internet-Based",
        "required_skills": ["SEO", "Research", "Marketing"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": False,
        "location_types": ["online"],
        "action_steps": [
            "Use GoDaddy Auctions, Namecheap, or ExpiredDomains.net",
            "Research domain history and traffic",
            "Buy domains for $10-$100",
            "List on Flippa, Sedo, or Afternic",
            "Market to potential buyers",
            "Sell for 2x-10x profit"
        ],
        "potential_earnings": "$200-$5000/month",
        "difficulty": "intermediate",
        "tags": ["online", "passive", "investment"]
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Local Laundry Service Aggregator",
        "description": "Connect busy professionals with local laundromats or individuals who'll do laundry. Pick up dirty clothes, drop off at laundromat or washer, return clean. Take 30-40% commission.",
        "category": "Service Middleman",
        "required_skills": ["Organization", "Customer Service", "Time Management"],
        "startup_cost": "low",
        "time_needed": "part-time",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Find reliable washers (laundromats or individuals)",
            "Create simple booking system (Google Forms or app)",
            "Market to busy professionals via social media",
            "Set pickup/delivery schedule",
            "Collect clothes, get washed, deliver",
            "Charge $25-40 per load, pay $15-20"
        ],
        "potential_earnings": "$1000-$3000/month",
        "difficulty": "beginner",
        "tags": ["local-service", "recurring", "scalable"]
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Wholesaler Connector",
        "description": "Find wholesale suppliers and connect them with small businesses, restaurants, or retailers. Take a finder's fee or commission on each deal. No inventory needed.",
        "category": "Middleman",
        "required_skills": ["Networking", "Sales", "Negotiation"],
        "startup_cost": "low",
        "time_needed": "part-time",
        "is_location_based": True,
        "location_types": ["urban", "suburban", "online"],
        "action_steps": [
            "Research local businesses and their suppliers",
            "Contact wholesalers and negotiate referral fees",
            "Build relationships with business owners",
            "Match businesses with better suppliers",
            "Facilitate introductions",
            "Collect 5-10% commission on orders"
        ],
        "potential_earnings": "$500-$4000/month",
        "difficulty": "intermediate",
        "tags": ["B2B", "networking", "commission-based"]
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Social Media Account Flipping",
        "description": "Grow niche social media accounts (Instagram, TikTok, Twitter) to 10k+ followers and sell them. Focus on profitable niches like fitness, finance, or pets. Gray area but legal.",
        "category": "Internet-Based",
        "required_skills": ["Social Media", "Content Creation", "Marketing"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": False,
        "location_types": ["online"],
        "action_steps": [
            "Choose profitable niche (fitness, crypto, pets)",
            "Create account with brandable username",
            "Post consistently (2-3x daily) using trends",
            "Use engagement groups to boost initial growth",
            "Reach 10k-50k followers in 3-6 months",
            "Sell on PlayerUp, Fameswap, or Direct to brands for $500-$5000"
        ],
        "potential_earnings": "$500-$5000 per account",
        "difficulty": "intermediate",
        "tags": ["online", "creative", "scalable"]
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Storage Unit Auction Flipping",
        "description": "Bid on abandoned storage units at auctions, sort through items, and resell valuable finds. Can find electronics, furniture, collectibles, and more.",
        "category": "Flipping & Reselling",
        "required_skills": ["Appraisal", "Research", "Sales"],
        "startup_cost": "medium",
        "time_needed": "part-time",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Find local storage unit auction schedules",
            "Attend auctions and inspect units briefly",
            "Bid conservatively on promising units",
            "Sort through items and identify valuables",
            "List items on eBay, Facebook, Craigslist",
            "Donate or dispose of junk items"
        ],
        "potential_earnings": "$1000-$4000/month",
        "difficulty": "intermediate",
        "tags": ["treasure-hunting", "physical", "adventure"]
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Airbnb Co-Hosting Without Property",
        "description": "Manage other people's Airbnb listings for 15-25% of booking revenue. Handle communication, cleaning coordination, and guest issues. No property ownership needed.",
        "category": "Service Middleman",
        "required_skills": ["Customer Service", "Organization", "Problem Solving"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Contact local Airbnb hosts offering co-host services",
            "Create professional co-host profile",
            "Handle guest communications and bookings",
            "Coordinate cleaners and maintenance",
            "Optimize listings for better bookings",
            "Earn 15-25% of booking revenue"
        ],
        "potential_earnings": "$800-$3000/month",
        "difficulty": "beginner",
        "tags": ["recurring", "service", "remote-friendly"]
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Website & Business Brokering",
        "description": "Find undervalued online businesses or websites on Flippa/Empire Flippers, connect with buyers, facilitate the sale. Take 5-10% commission without buying the site yourself.",
        "category": "Internet-Based",
        "required_skills": ["Business Analysis", "Negotiation", "Marketing"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": False,
        "location_types": ["online"],
        "action_steps": [
            "Browse Flippa, Motion Invest, Empire Flippers",
            "Identify undervalued sites with traffic/revenue",
            "Build network of potential buyers",
            "Facilitate introductions and negotiations",
            "Help with due diligence process",
            "Collect 5-10% broker fee on sale"
        ],
        "potential_earnings": "$500-$10000/deal",
        "difficulty": "advanced",
        "tags": ["online", "high-earning", "B2B"]
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Local Event Ticket Reselling",
        "description": "Buy tickets to local concerts, sports events, and shows early, then resell at markup when they sell out. Use StubHub, Vivid Seats, or Facebook groups.",
        "category": "Flipping & Reselling",
        "required_skills": ["Market Research", "Timing", "Sales"],
        "startup_cost": "medium",
        "time_needed": "flexible",
        "is_location_based": True,
        "location_types": ["urban"],
        "action_steps": [
            "Monitor upcoming events in your area",
            "Buy tickets to high-demand events early",
            "List on resale platforms (StubHub, SeatGeek)",
            "Price competitively but at 20-100% markup",
            "Transfer tickets to buyers",
            "Reinvest profits into more tickets"
        ],
        "potential_earnings": "$500-$3000/month",
        "difficulty": "intermediate",
        "tags": ["event-based", "timing-critical", "high-margin"]
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Equipment Rental Marketplace",
        "description": "Connect people who own equipment (tools, cameras, party supplies) with people who need to rent them. Take 20-30% commission on each rental. No inventory needed.",
        "category": "Middleman",
        "required_skills": ["Marketing", "Organization", "Customer Service"],
        "startup_cost": "low",
        "time_needed": "part-time",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Find people with underused equipment",
            "Create simple listing platform (website or social media)",
            "Market to people needing short-term rentals",
            "Coordinate pickups and returns",
            "Handle payments and security deposits",
            "Take 20-30% commission on rentals"
        ],
        "potential_earnings": "$600-$2500/month",
        "difficulty": "intermediate",
        "tags": ["sharing-economy", "local", "commission-based"]
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Digital Product Reselling",
        "description": "Buy PLR (Private Label Rights) products like ebooks, courses, or templates cheaply, rebrand them, and sell on Gumroad or Etsy. Completely legal gray area method.",
        "category": "Internet-Based",
        "required_skills": ["Marketing", "Design", "Sales"],
        "startup_cost": "low",
        "time_needed": "flexible",
        "is_location_based": False,
        "location_types": ["online"],
        "action_steps": [
            "Buy quality PLR products ($10-50)",
            "Rebrand with your own covers and branding",
            "Create attractive sales page",
            "List on Gumroad, Etsy, or own website",
            "Market via social media and ads",
            "Sell for $19-$99 with 90%+ profit margin"
        ],
        "potential_earnings": "$300-$2000/month",
        "difficulty": "beginner",
        "tags": ["passive", "digital", "scalable"]
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Car Wrap Advertising Facilitator",
        "description": "Connect drivers with companies that pay for car wrap advertising. Act as middleman between local businesses and drivers. Take cut from both sides.",
        "category": "Middleman",
        "required_skills": ["Sales", "Networking", "Marketing"],
        "startup_cost": "low",
        "time_needed": "part-time",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Contact local businesses needing advertising",
            "Recruit drivers willing to wrap cars",
            "Negotiate rates ($200-500/month per car)",
            "Coordinate wrap installation",
            "Monitor and verify driving activity",
            "Take 20-30% commission from both parties"
        ],
        "potential_earnings": "$500-$2000/month",
        "difficulty": "intermediate",
        "tags": ["recurring", "local", "B2B"]
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Sneaker Reselling via Bots",
        "description": "Use sneaker bots to buy limited release sneakers online, then resell on StockX, GOAT, or eBay for 2-5x profit. Requires initial investment but highly profitable.",
        "category": "Flipping & Reselling",
        "required_skills": ["Technology", "Research", "Timing"],
        "startup_cost": "medium",
        "time_needed": "flexible",
        "is_location_based": False,
        "location_types": ["online"],
        "action_steps": [
            "Research upcoming sneaker releases",
            "Get sneaker bot ($50-300/month)",
            "Set up multiple accounts and payment methods",
            "Bot limited releases on drop day",
            "List on StockX, GOAT immediately",
            "Ship to buyers and collect 100-400% profit"
        ],
        "potential_earnings": "$1000-$5000/month",
        "difficulty": "advanced",
        "tags": ["tech-savvy", "high-profit", "competitive"]
    },
    {
        "id": str(uuid.uuid4()),
        "title": "House Sitting & Pet Sitting Network",
        "description": "Create a local network connecting house/pet sitters with homeowners. Take booking fees from both parties without doing the sitting yourself.",
        "category": "Service Middleman",
        "required_skills": ["Organization", "Marketing", "Customer Service"],
        "startup_cost": "low",
        "time_needed": "part-time",
        "is_location_based": True,
        "location_types": ["urban", "suburban"],
        "action_steps": [
            "Recruit reliable house/pet sitters",
            "Market to homeowners via local groups",
            "Create booking system (simple website/form)",
            "Match sitters with clients",
            "Handle payments and reviews",
            "Take 15-25% commission from both sides"
        ],
        "potential_earnings": "$800-$2500/month",
        "difficulty": "beginner",
        "tags": ["local-service", "recurring", "trust-based"]
    }
]

# ============= Routes =============

@api_router.post("/auth/signup")
async def signup(user_data: UserSignup):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    password_hash = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=password_hash
    )
    
    await db.users.insert_one(user.dict())
    return {"id": user.id, "email": user.email, "name": user.name, "is_guest": False}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "is_guest": False,
        "profile": user.get("profile", {})
    }

@api_router.post("/auth/guest")
async def create_guest():
    guest = GuestUser()
    await db.users.insert_one(guest.dict())
    return {"id": guest.id, "name": guest.name, "is_guest": True}

@api_router.put("/users/{user_id}/profile")
async def update_profile(user_id: str, profile: UserProfile):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"profile": profile.dict()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Profile updated successfully"}

@api_router.get("/users/{user_id}/profile")
async def get_profile(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user.get("profile", {})

@api_router.get("/ideas")
async def get_all_ideas(
    skip: int = 0,
    limit: int = 100,
    category: str = None,
    difficulty: str = None,
    cost: str = None
):
    # Check if ideas exist in DB, if not populate
    count = await db.ideas.count_documents({})
    if count == 0:
        await db.ideas.insert_many(PRE_POPULATED_IDEAS)
    
    # Build filter query
    query = {}
    if category and category != "All":
        query["category"] = category
    if difficulty and difficulty != "all":
        query["difficulty"] = difficulty
    if cost and cost != "all":
        query["startup_cost"] = cost
    
    ideas = await db.ideas.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.ideas.count_documents(query)
    
    return {
        "ideas": ideas,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@api_router.get("/ideas/personalized/{user_id}")
async def get_personalized_ideas(user_id: str):
    # Get user profile
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    profile = user.get("profile", {})
    
    # Get all ideas
    count = await db.ideas.count_documents({})
    if count == 0:
        await db.ideas.insert_many(PRE_POPULATED_IDEAS)
    
    ideas = await db.ideas.find({}, {"_id": 0}).to_list(1000)
    
    # Score and rank ideas based on user profile
    scored_ideas = []
    for idea in ideas:
        score = 0
        
        # Match interests (category)
        interests = profile.get("interests", [])
        if idea["category"] in interests:
            score += 3
        
        # Match skills
        skills = profile.get("skills", [])
        matching_skills = set(skills) & set(idea["required_skills"])
        score += len(matching_skills) * 2
        
        # Match budget
        budget = profile.get("budget", "")
        if budget and idea["startup_cost"] == budget:
            score += 2
        
        # Match time availability
        time_avail = profile.get("time_availability", "")
        if time_avail == "flexible" and idea["time_needed"] == "flexible":
            score += 2
        elif time_avail == idea["time_needed"]:
            score += 2
        
        # Location matching
        location = profile.get("location")
        if location and idea["is_location_based"]:
            score += 1
        elif not location and not idea["is_location_based"]:
            score += 1
        
        idea["match_score"] = score
        scored_ideas.append(idea)
    
    # Sort by score
    scored_ideas.sort(key=lambda x: x["match_score"], reverse=True)
    
    return scored_ideas

@api_router.get("/ideas/{idea_id}")
async def get_idea(idea_id: str):
    idea = await db.ideas.find_one({"id": idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea

@api_router.post("/saved-ideas")
async def save_idea(saved: SavedIdea):
    # Check if already saved
    existing = await db.saved_ideas.find_one({
        "user_id": saved.user_id,
        "idea_id": saved.idea_id
    })
    
    if existing:
        return {"message": "Idea already saved", "id": str(existing["_id"])}
    
    # Get idea details to populate action steps
    idea = await db.ideas.find_one({"id": saved.idea_id})
    if idea and "action_steps" in idea:
        # Convert action steps to trackable format
        # Mark first 2-3 steps as quick wins (Path to First $50)
        action_steps = []
        for i, step_text in enumerate(idea["action_steps"]):
            # Identify "scary" steps that deserve big celebration
            is_scary = any(keyword in step_text.lower() for keyword in [
                "publish", "register", "launch", "go live", "first", "contact", "post", "list"
            ])
            
            action_steps.append({
                "step_number": i + 1,
                "text": step_text,
                "completed": False,
                "completed_at": None,
                "is_scary_step": is_scary
            })
        
        saved.action_steps = action_steps
    
    result = await db.saved_ideas.insert_one(saved.dict())
    return {"message": "Idea saved successfully", "id": str(result.inserted_id)}

@api_router.post("/saved-ideas/{user_id}/{idea_id}/complete-step")
async def complete_step(user_id: str, idea_id: str, step_number: int):
    """Mark a step as complete and calculate progress"""
    
    # Find the saved idea
    saved_idea = await db.saved_ideas.find_one({
        "user_id": user_id,
        "idea_id": idea_id
    })
    
    if not saved_idea:
        raise HTTPException(status_code=404, detail="Saved idea not found")
    
    # Update the specific step
    action_steps = saved_idea.get("action_steps", [])
    step_found = False
    is_scary_step = False
    
    for step in action_steps:
        if step["step_number"] == step_number and not step["completed"]:
            step["completed"] = True
            step["completed_at"] = datetime.utcnow()
            step_found = True
            is_scary_step = step.get("is_scary_step", False)
            break
    
    if not step_found:
        raise HTTPException(status_code=400, detail="Step already completed or not found")
    
    # Calculate progress
    total_steps = len(action_steps)
    completed_steps = sum(1 for step in action_steps if step["completed"])
    progress_percentage = int((completed_steps / total_steps) * 100) if total_steps > 0 else 0
    
    # Check if earnings are unlocked (first 3 steps = setup phase)
    earnings_unlocked = completed_steps >= min(3, total_steps)
    
    # Update status
    status = "in-progress" if completed_steps < total_steps else "completed"
    
    # Update in database
    await db.saved_ideas.update_one(
        {"user_id": user_id, "idea_id": idea_id},
        {
            "$set": {
                "action_steps": action_steps,
                "progress_percentage": progress_percentage,
                "earnings_unlocked": earnings_unlocked,
                "status": status
            }
        }
    )
    
    return {
        "message": "Step completed successfully",
        "progress_percentage": progress_percentage,
        "earnings_unlocked": earnings_unlocked,
        "status": status,
        "is_scary_step": is_scary_step,
        "trigger_celebration": is_scary_step or progress_percentage == 100
    }

@api_router.post("/saved-ideas/{user_id}/{idea_id}/uncomplete-step")
async def uncomplete_step(user_id: str, idea_id: str, step_number: int):
    """Unmark a step (for mistakes)"""
    
    saved_idea = await db.saved_ideas.find_one({
        "user_id": user_id,
        "idea_id": idea_id
    })
    
    if not saved_idea:
        raise HTTPException(status_code=404, detail="Saved idea not found")
    
    # Update the specific step
    action_steps = saved_idea.get("action_steps", [])
    
    for step in action_steps:
        if step["step_number"] == step_number:
            step["completed"] = False
            step["completed_at"] = None
            break
    
    # Recalculate progress
    total_steps = len(action_steps)
    completed_steps = sum(1 for step in action_steps if step["completed"])
    progress_percentage = int((completed_steps / total_steps) * 100) if total_steps > 0 else 0
    earnings_unlocked = completed_steps >= min(3, total_steps)
    status = "saved" if completed_steps == 0 else "in-progress"
    
    await db.saved_ideas.update_one(
        {"user_id": user_id, "idea_id": idea_id},
        {
            "$set": {
                "action_steps": action_steps,
                "progress_percentage": progress_percentage,
                "earnings_unlocked": earnings_unlocked,
                "status": status
            }
        }
    )
    
    return {
        "message": "Step uncompleted",
        "progress_percentage": progress_percentage
    }

@api_router.get("/saved-ideas/{user_id}")
async def get_saved_ideas(user_id: str):
    saved = await db.saved_ideas.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    # Get full idea details
    result = []
    for item in saved:
        idea = await db.ideas.find_one({"id": item["idea_id"]}, {"_id": 0})
        if idea:
            idea["saved_status"] = item["status"]
            idea["saved_notes"] = item.get("notes", "")
            idea["saved_at"] = item["saved_at"]
            result.append(idea)
    
    return result

@api_router.delete("/saved-ideas/{user_id}/{idea_id}")
async def remove_saved_idea(user_id: str, idea_id: str):
    result = await db.saved_ideas.delete_one({
        "user_id": user_id,
        "idea_id": idea_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saved idea not found")
    
    return {"message": "Idea removed successfully"}

@api_router.put("/saved-ideas/{user_id}/{idea_id}")
async def update_saved_idea(user_id: str, idea_id: str, update_data: Dict[str, Any]):
    result = await db.saved_ideas.update_one(
        {"user_id": user_id, "idea_id": idea_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Saved idea not found")
    
    return {"message": "Saved idea updated successfully"}

# ============= Affiliate Redirect Service =============

class AffiliateLink(BaseModel):
    original_url: str
    affiliate_tag: str = ""
    click_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

@api_router.post("/affiliate/create")
async def create_affiliate_link(link_data: AffiliateLink):
    """Create a tracked affiliate link"""
    result = await db.affiliate_links.insert_one(link_data.dict())
    return {"link_id": str(result.inserted_id), "message": "Affiliate link created"}

@api_router.get("/redirect/{link_id}")
async def redirect_with_tracking(link_id: str):
    """Redirect through our server for affiliate tracking"""
    from fastapi.responses import RedirectResponse
    
    # Find the link
    link = await db.affiliate_links.find_one({"_id": link_id})
    
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    # Increment click count
    await db.affiliate_links.update_one(
        {"_id": link_id},
        {"$inc": {"click_count": 1}}
    )
    
    # Build final URL with affiliate tag
    final_url = link["original_url"]
    if link.get("affiliate_tag"):
        separator = "&" if "?" in final_url else "?"
        final_url = f"{final_url}{separator}{link['affiliate_tag']}"
    
    # Redirect user
    return RedirectResponse(url=final_url, status_code=307)

@api_router.get("/affiliate/stats")
async def get_affiliate_stats():
    """Get affiliate link statistics"""
    links = await db.affiliate_links.find().to_list(1000)
    
    total_clicks = sum(link.get("click_count", 0) for link in links)
    
    return {
        "total_links": len(links),
        "total_clicks": total_clicks,
        "links": links
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
