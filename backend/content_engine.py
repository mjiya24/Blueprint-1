"""
Blueprint Content Engine — Generates 100 AI blueprints using Gemini 3 Flash.
Run: python content_engine.py
Or trigger via API: POST /api/admin/generate-blueprints
"""
import asyncio
import json
import re
import uuid
import os
import logging
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()
logger = logging.getLogger("content_engine")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

# ============================================================
# 100 HIGH-SIGNAL NICHES
# ============================================================
NICHES = [
    # AI & Automation (15)
    {"title": "AI Automation Agency for Local Law Firms", "category": "AI & Automation", "tags": ["ai", "automation", "legal", "agency"]},
    {"title": "AI Chatbot Builder for Real Estate Agents", "category": "AI & Automation", "tags": ["ai", "real-estate", "chatbot"]},
    {"title": "AI Customer Service Bot for E-commerce Stores", "category": "AI & Automation", "tags": ["ai", "ecommerce", "customer-service"]},
    {"title": "Custom GPT Creator for Small Businesses", "category": "AI & Automation", "tags": ["ai", "gpt", "smb"]},
    {"title": "AI Social Media Content Manager for Restaurants", "category": "AI & Automation", "tags": ["ai", "social-media", "restaurants"]},
    {"title": "Automated Bookkeeping Service with AI Tools", "category": "AI & Automation", "tags": ["ai", "bookkeeping", "finance"]},
    {"title": "Prompt Engineering Consultant for Enterprises", "category": "AI & Automation", "tags": ["ai", "prompts", "enterprise"]},
    {"title": "AI Voice Agent for Appointment Scheduling", "category": "AI & Automation", "tags": ["ai", "voice", "scheduling"]},
    {"title": "AI SEO Content Farm Builder", "category": "AI & Automation", "tags": ["ai", "seo", "content"]},
    {"title": "AI-Powered Podcast Editing Service", "category": "AI & Automation", "tags": ["ai", "podcast", "editing"]},
    {"title": "AI Email Marketing Automation Agency", "category": "AI & Automation", "tags": ["ai", "email", "marketing"]},
    {"title": "Machine Learning Model Fine-Tuner for SMBs", "category": "AI & Automation", "tags": ["ai", "ml", "fine-tuning"]},
    {"title": "AI Resume & LinkedIn Profile Optimizer Service", "category": "AI & Automation", "tags": ["ai", "resume", "linkedin"]},
    {"title": "AI Script Writer for YouTube & TikTok Creators", "category": "AI & Automation", "tags": ["ai", "scripts", "youtube"]},
    {"title": "AI Grant Writing Service for Nonprofits", "category": "AI & Automation", "tags": ["ai", "grants", "nonprofit"]},
    # No-Code & SaaS (15)
    {"title": "No-Code SaaS Builder for Shopify Merchants", "category": "No-Code & SaaS", "tags": ["no-code", "saas", "shopify"]},
    {"title": "Bubble.io App Developer for Startups", "category": "No-Code & SaaS", "tags": ["no-code", "bubble", "startup"]},
    {"title": "Webflow Agency for SaaS Landing Pages", "category": "No-Code & SaaS", "tags": ["no-code", "webflow", "saas"]},
    {"title": "Zapier Automation Consultant for SMBs", "category": "No-Code & SaaS", "tags": ["no-code", "zapier", "automation"]},
    {"title": "Airtable Database Consultant", "category": "No-Code & SaaS", "tags": ["no-code", "airtable", "database"]},
    {"title": "Make.com Automation Agency", "category": "No-Code & SaaS", "tags": ["no-code", "make", "automation"]},
    {"title": "Notion Workspace Designer for Remote Teams", "category": "No-Code & SaaS", "tags": ["no-code", "notion", "productivity"]},
    {"title": "No-Code Internal Tools Builder for Ops Teams", "category": "No-Code & SaaS", "tags": ["no-code", "internal-tools", "operations"]},
    {"title": "Shopify Store Optimizer & CRO Specialist", "category": "No-Code & SaaS", "tags": ["shopify", "ecommerce", "cro"]},
    {"title": "Chrome Extension Creator (Micro-SaaS)", "category": "No-Code & SaaS", "tags": ["chrome", "extension", "micro-saas"]},
    {"title": "Low-Code CRM Customizer for Sales Teams", "category": "No-Code & SaaS", "tags": ["no-code", "crm", "sales"]},
    {"title": "API Integration Specialist for SMBs", "category": "No-Code & SaaS", "tags": ["api", "integration", "developer"]},
    {"title": "Website Maintenance Retainer Service", "category": "No-Code & SaaS", "tags": ["web", "maintenance", "retainer"]},
    {"title": "AppSheet App Developer for Field Teams", "category": "No-Code & SaaS", "tags": ["no-code", "appsheet", "mobile"]},
    {"title": "Framer Website Designer for D2C Brands", "category": "No-Code & SaaS", "tags": ["design", "framer", "d2c"]},
    # Digital & Content (20)
    {"title": "High-Ticket Ghostwriting for LinkedIn Executives", "category": "Digital & Content", "tags": ["ghostwriting", "linkedin", "b2b"]},
    {"title": "Technical Writing for SaaS Documentation", "category": "Digital & Content", "tags": ["writing", "saas", "documentation"]},
    {"title": "Faceless YouTube Automation (Personal Finance)", "category": "Digital & Content", "tags": ["youtube", "faceless", "finance"]},
    {"title": "Newsletter Acquisition & Monetization Specialist", "category": "Digital & Content", "tags": ["newsletter", "acquisition", "media"]},
    {"title": "UGC Agency Coordinator for DTC Brands", "category": "Digital & Content", "tags": ["ugc", "dtc", "agency"]},
    {"title": "B2B Podcast Production Agency", "category": "Digital & Content", "tags": ["podcast", "b2b", "production"]},
    {"title": "Video Editing Agency for YouTube Channels", "category": "Digital & Content", "tags": ["video", "editing", "youtube"]},
    {"title": "Presentation Design Agency (Pitch Decks)", "category": "Digital & Content", "tags": ["design", "pitch-decks", "b2b"]},
    {"title": "Sales Funnel Designer & Copywriter", "category": "Digital & Content", "tags": ["funnels", "copywriting", "sales"]},
    {"title": "Ebook Publisher on Amazon KDP", "category": "Digital & Content", "tags": ["ebook", "kdp", "passive"]},
    {"title": "SEO Link Building Agency", "category": "Digital & Content", "tags": ["seo", "link-building", "agency"]},
    {"title": "Programmatic SEO Specialist for Real Estate", "category": "Digital & Content", "tags": ["seo", "real-estate", "programmatic"]},
    {"title": "Affiliate Blog Network Builder", "category": "Digital & Content", "tags": ["affiliate", "blog", "seo"]},
    {"title": "Online Course Creator (Skool/Kajabi)", "category": "Digital & Content", "tags": ["course", "online", "education"]},
    {"title": "Discord Community Manager for Web3 Projects", "category": "Digital & Content", "tags": ["discord", "community", "web3"]},
    {"title": "Email Newsletter Writer on Substack", "category": "Digital & Content", "tags": ["newsletter", "substack", "writing"]},
    {"title": "Figma UI/UX Design Service for Startups", "category": "Digital & Content", "tags": ["design", "ui-ux", "figma"]},
    {"title": "Digital Marketing Audit Consultant", "category": "Digital & Content", "tags": ["marketing", "audit", "consulting"]},
    {"title": "B2B Cold Email Outreach Agency", "category": "Digital & Content", "tags": ["cold-email", "b2b", "outreach"]},
    {"title": "Stock Photo & Digital Illustration Shop", "category": "Digital & Content", "tags": ["stock-photos", "illustration", "passive"]},
    # Agency & B2B Services (20)
    {"title": "Fractional CMO Service for E-commerce Brands", "category": "Agency & B2B", "tags": ["fractional", "cmo", "ecommerce"]},
    {"title": "Fractional CFO Service for SaaS Startups", "category": "Agency & B2B", "tags": ["fractional", "cfo", "saas"]},
    {"title": "White-Label Marketing Agency", "category": "Agency & B2B", "tags": ["white-label", "marketing", "agency"]},
    {"title": "LinkedIn Profile Optimization Agency", "category": "Agency & B2B", "tags": ["linkedin", "optimization", "b2b"]},
    {"title": "B2B Lead Generation Agency (Apollo/Clay)", "category": "Agency & B2B", "tags": ["lead-gen", "b2b", "outbound"]},
    {"title": "Talent Sourcing & Recruiting Agency", "category": "Agency & B2B", "tags": ["recruiting", "talent", "hr"]},
    {"title": "Brand Strategy Consultant for D2C Startups", "category": "Agency & B2B", "tags": ["brand", "strategy", "d2c"]},
    {"title": "PR & Media Outreach Service for Founders", "category": "Agency & B2B", "tags": ["pr", "media", "outreach"]},
    {"title": "Market Research & Competitive Intelligence", "category": "Agency & B2B", "tags": ["research", "intelligence", "b2b"]},
    {"title": "Business Plan Writing Service", "category": "Agency & B2B", "tags": ["business-plan", "writing", "startups"]},
    {"title": "Sales Training Workshop Facilitator", "category": "Agency & B2B", "tags": ["sales", "training", "workshop"]},
    {"title": "Google Ads Management Agency", "category": "Agency & B2B", "tags": ["google-ads", "ppc", "agency"]},
    {"title": "TikTok Ads Agency for E-commerce", "category": "Agency & B2B", "tags": ["tiktok-ads", "ecommerce", "paid"]},
    {"title": "Meta Ads Agency for Local Businesses", "category": "Agency & B2B", "tags": ["meta-ads", "local", "paid"]},
    {"title": "Review & Reputation Management Agency", "category": "Agency & B2B", "tags": ["reviews", "reputation", "local"]},
    {"title": "HubSpot CRM Implementation Consultant", "category": "Agency & B2B", "tags": ["hubspot", "crm", "implementation"]},
    {"title": "Klaviyo Email Marketing Specialist", "category": "Agency & B2B", "tags": ["klaviyo", "email", "ecommerce"]},
    {"title": "TikTok Shop Organic Growth Agency", "category": "Agency & B2B", "tags": ["tiktok", "shop", "organic"]},
    {"title": "YouTube SEO & Growth Consultant", "category": "Agency & B2B", "tags": ["youtube", "seo", "growth"]},
    {"title": "Podcast Guest Booking Agent", "category": "Agency & B2B", "tags": ["podcast", "booking", "pr"]},
    # Local & Skilled Service (15)
    {"title": "Remote Airbnb Arbitrage Business", "category": "Local & Service", "tags": ["airbnb", "arbitrage", "real-estate"]},
    {"title": "Airbnb Co-Host Management Service", "category": "Local & Service", "tags": ["airbnb", "co-host", "property"]},
    {"title": "Pool Cleaning & Maintenance Business", "category": "Local & Service", "tags": ["pool", "cleaning", "local"]},
    {"title": "Pressure Washing Business", "category": "Local & Service", "tags": ["pressure-washing", "local", "service"]},
    {"title": "Commercial Cleaning Business (B2B)", "category": "Local & Service", "tags": ["cleaning", "commercial", "b2b"]},
    {"title": "Mobile Notary Public Service", "category": "Local & Service", "tags": ["notary", "legal", "mobile"]},
    {"title": "Estate Sale Coordinator", "category": "Local & Service", "tags": ["estate-sales", "local", "events"]},
    {"title": "Senior Tech Help & Setup Service", "category": "Local & Service", "tags": ["tech-support", "seniors", "local"]},
    {"title": "Party & Event Decorator Service", "category": "Local & Service", "tags": ["events", "decor", "local"]},
    {"title": "Junk Removal Business", "category": "Local & Service", "tags": ["junk-removal", "local", "service"]},
    {"title": "Moving Helper & Labor Service", "category": "Local & Service", "tags": ["moving", "labor", "local"]},
    {"title": "Local Food Tour Guide Business", "category": "Local & Service", "tags": ["tours", "food", "local"]},
    {"title": "Handyman Business for HOA Communities", "category": "Local & Service", "tags": ["handyman", "hoa", "local"]},
    {"title": "Mobile Car Wash & Detailing Business", "category": "Local & Service", "tags": ["car-wash", "mobile", "local"]},
    {"title": "Professional Organizer Service", "category": "Local & Service", "tags": ["organizing", "local", "service"]},
    # Passive & Investment (15)
    {"title": "Micro-Private Equity: Acquire & Grow Small Websites", "category": "Passive & Investment", "tags": ["acquisition", "websites", "passive"]},
    {"title": "Amazon FBA Private Label Brand Builder", "category": "Passive & Investment", "tags": ["amazon", "fba", "private-label"]},
    {"title": "Merch by Amazon Optimization Strategy", "category": "Passive & Investment", "tags": ["merch", "amazon", "print-on-demand"]},
    {"title": "Automated Etsy AI Art & Digital Downloads", "category": "Passive & Investment", "tags": ["etsy", "ai-art", "passive"]},
    {"title": "Pattern & Template Marketplace Creator", "category": "Passive & Investment", "tags": ["patterns", "templates", "passive"]},
    {"title": "Subscription Box Curator & Operator", "category": "Passive & Investment", "tags": ["subscription", "box", "ecommerce"]},
    {"title": "Private Label Physical Products via Temu/Alibaba", "category": "Passive & Investment", "tags": ["private-label", "arbitrage", "physical"]},
    {"title": "Membership Community Creator on Skool", "category": "Passive & Investment", "tags": ["membership", "community", "skool"]},
    {"title": "Online Tutoring Platform Builder", "category": "Passive & Investment", "tags": ["tutoring", "education", "platform"]},
    {"title": "Sports Newsletter Acquisition & Monetization", "category": "Passive & Investment", "tags": ["newsletter", "sports", "media"]},
    {"title": "SaaS Micro-Acquisition & Growth", "category": "Passive & Investment", "tags": ["saas", "acquisition", "micro-pe"]},
    {"title": "Digital Sticker Shop (Procreate/Clip Studio)", "category": "Passive & Investment", "tags": ["stickers", "digital", "creative"]},
    {"title": "Print-on-Demand Niche Store", "category": "Passive & Investment", "tags": ["pod", "print-on-demand", "niche"]},
    {"title": "Domain Name Investment & Flipping", "category": "Passive & Investment", "tags": ["domains", "flipping", "investment"]},
    {"title": "YouTube Ad Revenue Passive Channel Build", "category": "Passive & Investment", "tags": ["youtube", "adsense", "passive"]},
]

MASTER_ARCHITECT_SYSTEM = """You are a world-class Business Operations Consultant and the Blueprint Master Architect.
Generate precise, actionable 17-step blueprints for income-generating opportunities.

BLUEPRINT ARCHITECTURE RULES:
- Steps 1-5: FREE TIER — Foundation, research, first setup (anyone can access)  
- Steps 6-17: ARCHITECT TIER — Deep execution, client acquisition, legal, scaling (premium content)
- Every 3 steps, identify a "Common Wall" (the #1 reason people give up at that point)
- For locked steps (6-17), include a one-sentence "Architect Workaround Hint"
- Be specific: include real tools, real platforms, real dollar amounts
- Match Score Tags: Include 3 skills/assets that make someone a natural fit

Your output must be ONLY valid JSON — no markdown, no preamble, no explanation."""

BLUEPRINT_SCHEMA = """{
  "title": "exact niche title",
  "description": "2-3 compelling sentences about this income opportunity and why now is the right time",
  "category": "exact category",
  "tags": ["tag1", "tag2", "tag3"],
  "match_tags": ["skill1", "skill2", "asset1"],
  "difficulty": "easy|medium|hard",
  "difficulty_score": 5,
  "startup_cost": "free|low|medium|high",
  "startup_cost_range": "$0-$500",
  "time_to_first_dollar": "e.g. 7-21 days",
  "potential_earnings": "e.g. $2,000-$8,000/mo",
  "action_steps": [
    {"step_number": 1, "text": "specific action step", "is_locked": false, "common_wall": null, "workaround_hint": null},
    {"step_number": 2, "text": "specific action step", "is_locked": false, "common_wall": null, "workaround_hint": null},
    {"step_number": 3, "text": "specific action step", "is_locked": false, "common_wall": "Most common obstacle at this point", "workaround_hint": null},
    {"step_number": 4, "text": "specific action step", "is_locked": false, "common_wall": null, "workaround_hint": null},
    {"step_number": 5, "text": "specific action step", "is_locked": false, "common_wall": null, "workaround_hint": null},
    {"step_number": 6, "text": "specific action step", "is_locked": true, "common_wall": "Common wall here", "workaround_hint": "Architects bypass this by..."},
    {"step_number": 7, "text": "specific action step", "is_locked": true, "common_wall": null, "workaround_hint": "One-sentence architect hint"},
    {"step_number": 8, "text": "specific action step", "is_locked": true, "common_wall": null, "workaround_hint": "One-sentence architect hint"},
    {"step_number": 9, "text": "specific action step", "is_locked": true, "common_wall": "Common wall here", "workaround_hint": "Architects bypass this by..."},
    {"step_number": 10, "text": "specific action step", "is_locked": true, "common_wall": null, "workaround_hint": "One-sentence architect hint"},
    {"step_number": 11, "text": "specific action step", "is_locked": true, "common_wall": null, "workaround_hint": "One-sentence architect hint"},
    {"step_number": 12, "text": "specific action step", "is_locked": true, "common_wall": "Common wall here", "workaround_hint": "Architects bypass this by..."},
    {"step_number": 13, "text": "specific action step", "is_locked": true, "common_wall": null, "workaround_hint": "One-sentence architect hint"},
    {"step_number": 14, "text": "specific action step", "is_locked": true, "common_wall": null, "workaround_hint": "One-sentence architect hint"},
    {"step_number": 15, "text": "specific action step", "is_locked": true, "common_wall": "Common wall here", "workaround_hint": "Architects bypass this by..."},
    {"step_number": 16, "text": "specific action step", "is_locked": true, "common_wall": null, "workaround_hint": "One-sentence architect hint"},
    {"step_number": 17, "text": "specific action step", "is_locked": true, "common_wall": null, "workaround_hint": "One-sentence architect hint"}
  ]
}"""


async def generate_single_blueprint(niche: dict) -> dict | None:
    session_id = f"blueprint-gen-{uuid.uuid4().hex}"
    try:
        chat = LlmChat(
            api_key=LLM_KEY,
            session_id=session_id,
            system_message=MASTER_ARCHITECT_SYSTEM,
        )
        chat.with_model("gemini", "gemini-3-flash-preview")
        prompt = (
            f"Generate a 17-step blueprint for: {niche['title']}\n"
            f"Category: {niche['category']}\n"
            f"Tags: {', '.join(niche['tags'])}\n\n"
            f"Return ONLY valid JSON matching this schema exactly:\n{BLUEPRINT_SCHEMA}"
        )
        response = await chat.send_message(UserMessage(text=prompt))
        clean = re.sub(r"```json\n?|```\n?", "", response).strip()
        # Remove BOM if present
        if clean.startswith('\ufeff'):
            clean = clean[1:]
        data = json.loads(clean)
        data["id"] = f"bp-{uuid.uuid4().hex[:10]}"
        data["version"] = "2.0"
        data["status"] = "AI-Drafted"
        data["win_count"] = 0
        data["created_at"] = datetime.utcnow().isoformat()
        # Ensure all steps have required fields
        for step in data.get("action_steps", []):
            step.setdefault("is_locked", step.get("step_number", 1) > 5)
            step.setdefault("common_wall", None)
            step.setdefault("workaround_hint", None)
            step.setdefault("completed", False)
        logger.info(f"Generated: {data['title']}")
        return data
    except Exception as e:
        logger.error(f"Failed to generate {niche['title']}: {e}")
        return None


async def run_generation(batch_size: int = 5, limit: int = 100, progress_callback=None):
    """
    Generate blueprints in concurrent batches. Stores results in MongoDB.
    Returns (success_count, fail_count).
    """
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Check which niches already exist (avoid duplicates)
    existing_titles = set()
    async for doc in db.blueprints.find({}, {"title": 1, "_id": 0}):
        existing_titles.add(doc["title"])

    niches_to_generate = [n for n in NICHES[:limit] if n["title"] not in existing_titles]
    logger.info(f"Generating {len(niches_to_generate)} blueprints (skipping {limit - len(niches_to_generate)} existing)...")

    success, fail = 0, 0
    total = len(niches_to_generate)

    for i in range(0, total, batch_size):
        batch = niches_to_generate[i: i + batch_size]
        results = await asyncio.gather(*[generate_single_blueprint(n) for n in batch])
        for bp in results:
            if bp:
                await db.blueprints.insert_one({k: v for k, v in bp.items() if k != "_id"})
                success += 1
            else:
                fail += 1
        done = min(i + batch_size, total)
        pct = round(done / total * 100)
        logger.info(f"Progress: {done}/{total} ({pct}%)  success={success}  fail={fail}")
        if progress_callback:
            await progress_callback(done, total, success, fail)
        # Small delay to be polite to the API
        await asyncio.sleep(0.5)

    client.close()
    return success, fail


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    s, f = asyncio.run(run_generation(batch_size=5, limit=100))
    print(f"\nDone! Generated {s} blueprints. Failed: {f}")
