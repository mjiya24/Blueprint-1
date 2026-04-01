"""
Mock Money-Making Ideas Generator using Gemini API
Generates 50-100 diverse, realistic money-making ideas with auto-tagging
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

def get_env_var(name, alt_name=None, default=None, required=False):
    value = os.getenv(name)
    if not value and alt_name:
        value = os.getenv(alt_name)
    if not value:
        value = default
    if required and not value:
        raise RuntimeError(f"Environment variable '{name}'" + (f" or '{alt_name}'" if alt_name else "") + " is required")
    return value

# MongoDB connection
mongo_url = get_env_var('MONGO_URL', 'DATABASE_URL', default='mongodb://localhost:27017')
db_name = get_env_var('DB_NAME', 'DATABASE_NAME', default='blueprint_db')
emergent_key = get_env_var('EMERGENT_LLM_KEY', 'GEMINI_API_KEY', required=True)

# Idea generation prompt
IDEA_GENERATION_PROMPT = """You are an expert in side hustles, entrepreneurship, and creative money-making strategies. Generate a unique, realistic money-making idea with the following structure. Be creative and include both traditional and gray area (but legal) opportunities.

Generate the idea as a valid JSON object with this EXACT structure:
{
    "title": "Concise, catchy title (max 60 chars)",
    "description": "2-3 sentence description explaining what it is and why it works",
    "category": "One of: Flipping & Reselling, Middleman, Internet-Based, Service Middleman, Local Services, Digital Products",
    "required_skills": ["skill1", "skill2", "skill3"] // 2-5 skills from this list: Research, Negotiation, Photography, Communication, Marketing, SEO, Social Media, Content Creation, Sales, Customer Service, Organization, Time Management, Networking, Business Analysis, Problem Solving, Design, Technology, Writing, Data Analysis, Video Editing,
    "startup_cost": "low|medium|high",
    "time_needed": "part-time|full-time|flexible",
    "is_location_based": true|false,
    "location_types": ["urban", "suburban", "rural", "online"] // only if is_location_based is true,
    "action_steps": ["Step 1", "Step 2", ...] // 6-8 concrete, actionable steps,
    "potential_earnings": "$XXX-$XXXX/month or per deal",
    "difficulty": "beginner|intermediate|advanced",
    "tags": ["tag1", "tag2", "tag3"] // 3-5 relevant tags
}

Make the idea specific, practical, and achievable. Include both mainstream and creative/gray-area opportunities (like ticket reselling, domain flipping, social media account growth, etc.)

IMPORTANT: Return ONLY the JSON object, no other text or explanation."""

# Categories to generate ideas for
CATEGORIES = [
    "Flipping & Reselling",
    "Middleman", 
    "Internet-Based",
    "Service Middleman",
    "Local Services",
    "Digital Products"
]

async def generate_idea_with_gemini(chat: LlmChat, idea_number: int, category: str) -> dict:
    """Generate a single idea using Gemini API"""
    try:
        prompt = f"{IDEA_GENERATION_PROMPT}\n\nFocus on the '{category}' category. Make it unique and different from common ideas (idea #{idea_number})."
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        # Parse JSON from response
        response_text = response.strip()
        
        # Try to extract JSON if there's extra text
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        idea = json.loads(response_text)
        
        # Add unique ID
        import uuid
        idea['id'] = str(uuid.uuid4())
        
        print(f"✅ Generated idea #{idea_number}: {idea['title']}")
        return idea
        
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse JSON for idea #{idea_number}: {e}")
        print(f"Response: {response_text[:200]}...")
        return None
    except Exception as e:
        print(f"❌ Error generating idea #{idea_number}: {e}")
        return None

async def generate_mock_ideas(num_ideas: int = 60):
    """Generate multiple mock ideas using Gemini with concurrent requests"""
    
    print(f"\n🚀 Starting Mock Idea Generation (Target: {num_ideas} ideas)\n")
    
    # Initialize Gemini chat
    chat = LlmChat(
        api_key=emergent_key,
        session_id="mock-idea-generator",
        system_message="You are an expert in entrepreneurship and creative money-making strategies. Generate diverse, realistic business ideas in valid JSON format."
    ).with_model("gemini", "gemini-2.5-flash")
    
    # Create tasks for concurrent generation (batches of 5)
    all_tasks = []
    idea_number = 1
    
    # Generate ideas across different categories
    ideas_per_category = num_ideas // len(CATEGORIES)
    
    for category in CATEGORIES:
        for i in range(ideas_per_category):
            all_tasks.append((chat, idea_number, category))
            idea_number += 1
    
    # Generate remaining ideas
    remaining = num_ideas - len(all_tasks)
    for i in range(remaining):
        category = CATEGORIES[i % len(CATEGORIES)]
        all_tasks.append((chat, idea_number, category))
        idea_number += 1
    
    # Process in batches of 5 for faster generation
    ideas = []
    batch_size = 5
    
    for i in range(0, len(all_tasks), batch_size):
        batch = all_tasks[i:i+batch_size]
        print(f"\n📦 Generating batch {i//batch_size + 1}/{(len(all_tasks) + batch_size - 1)//batch_size}")
        
        # Generate ideas concurrently in this batch
        batch_results = await asyncio.gather(
            *[generate_idea_with_gemini(chat, num, cat) for chat, num, cat in batch],
            return_exceptions=True
        )
        
        for result in batch_results:
            if result and not isinstance(result, Exception):
                ideas.append(result)
        
        # Small delay between batches
        await asyncio.sleep(1)
    
    print(f"\n✨ Successfully generated {len(ideas)} ideas!")
    return ideas

async def save_to_database(ideas: list):
    """Save generated ideas to MongoDB"""
    
    print("\n💾 Saving ideas to MongoDB...")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    try:
        # Clear existing ideas
        await db.ideas.delete_many({})
        print("🗑️  Cleared existing ideas")
        
        # Insert new ideas
        if ideas:
            result = await db.ideas.insert_many(ideas)
            print(f"✅ Saved {len(result.inserted_ids)} ideas to database")
        else:
            print("⚠️  No ideas to save")
        
    except Exception as e:
        print(f"❌ Error saving to database: {e}")
    finally:
        client.close()

async def main():
    """Main execution function"""
    
    # Get number of ideas from command line or use default
    num_ideas = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    
    # Generate ideas
    ideas = await generate_mock_ideas(num_ideas)
    
    # Save to JSON file as backup
    output_file = ROOT_DIR / 'mock_ideas.json'
    with open(output_file, 'w') as f:
        json.dump(ideas, f, indent=2)
    print(f"\n💾 Saved backup to {output_file}")
    
    # Save to database
    await save_to_database(ideas)
    
    # Print summary
    print("\n" + "="*60)
    print(f"📊 GENERATION SUMMARY")
    print("="*60)
    print(f"Total Ideas Generated: {len(ideas)}")
    
    # Category breakdown
    category_counts = {}
    for idea in ideas:
        cat = idea.get('category', 'Unknown')
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    print("\n📦 By Category:")
    for cat, count in sorted(category_counts.items()):
        print(f"  • {cat}: {count} ideas")
    
    # Difficulty breakdown
    difficulty_counts = {}
    for idea in ideas:
        diff = idea.get('difficulty', 'Unknown')
        difficulty_counts[diff] = difficulty_counts.get(diff, 0) + 1
    
    print("\n🎯 By Difficulty:")
    for diff, count in sorted(difficulty_counts.items()):
        print(f"  • {diff}: {count} ideas")
    
    # Cost breakdown
    cost_counts = {}
    for idea in ideas:
        cost = idea.get('startup_cost', 'Unknown')
        cost_counts[cost] = cost_counts.get(cost, 0) + 1
    
    print("\n💰 By Startup Cost:")
    for cost, count in sorted(cost_counts.items()):
        print(f"  • {cost}: {count} ideas")
    
    print("\n" + "="*60)
    print("✅ Mock idea generation complete!")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
