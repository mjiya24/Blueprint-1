from datetime import datetime
from typing import Literal, Optional
import re
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

STEP_COMPLETION_EVENTS = []


class AIGeneratePathRequest(BaseModel):
    source_type: Literal["youtube", "notion", "text", "pdf"]
    source_input: str = Field(min_length=1)
    domain: str = Field(min_length=1)
    template: str = "7-day-challenge"
    attachments: list[dict] = Field(default_factory=list)


class PublishPathRequest(BaseModel):
    title: str = Field(min_length=1)
    description: str = ""
    category: str = "Creator"
    creator_handle: str = "miamitrader"
    steps: list[dict] = Field(min_length=1)
    pricing_tiers: list[dict] = Field(default_factory=list)
    access_limit: Optional[int] = Field(default=None, ge=1)
    visibility: Literal["public", "unlisted", "private"] = "public"


def build_creator_profile(handle: str = "miamitrader"):
    profiles = {
        "miamitrader": {
            "name": "Mia Turner",
            "handle": "miamitrader",
            "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
            "verified": True,
            "total_members": 1824,
            "bio": "Miami market operator teaching clean trading routines and execution discipline.",
        },
        "alexfit": {
            "name": "Alex Rhodes",
            "handle": "alexfit",
            "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
            "verified": True,
            "total_members": 2460,
            "bio": "Strength and conditioning coach for busy builders.",
        },
    }
    return profiles.get(handle, {
        "name": handle.replace('-', ' ').title(),
        "handle": handle,
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
        "verified": True,
        "total_members": 968,
        "bio": "Creator roadmap for members who want deeper execution momentum.",
    })


def build_deep_link_fallback(creator_handle: str, path_slug: str):
    creator = build_creator_profile(creator_handle)
    path_key = (path_slug or '').lower()

    if 'finance-valuation-suite' in path_key:
        title = 'Finance Valuation Suite'
        category = 'Finance'
        summary = 'A member preview of intrinsic value, position sizing, and risk-aware decision tools.'
        steps = [
            {"id": "finance-day-1", "day": 1, "type": "trading", "title": "DCF Moat Evaluator: Find Intrinsic Value", "instructions": "Adjust the assumptions to estimate a margin-of-safety entry range.", "widget_data": {"widget_type": "dcf_moat_evaluator", "hook": True, "ticker": "AAPL", "starting_revenue": 100000000, "discount_rate_pct": 9, "terminal_growth_pct": 3, "margin_of_safety_pct": 25, "output_label": "Estimated intrinsic value"}},
            {"id": "finance-day-2", "day": 2, "type": "trading", "title": "Position Sizing & Drawdown Simulator", "instructions": "Model your risk budget before entering a position.", "widget_data": {"widget_type": "position_sizing_simulator", "capital": 25000, "risk_per_trade_pct": 1, "stop_loss_pct": 2, "leverage_cap": 3}},
        ]
    elif 'fitness-overload-suite' in path_key:
        title = 'Progressive Overload Suite'
        category = 'Fitness'
        summary = 'A member preview of RPE-based load planning and workout fuel allocation.'
        steps = [
            {"id": "fitness-day-1", "day": 1, "type": "fitness", "title": "Progressive Overload Planner: Leg Day RPE", "instructions": "Set your 1RM and fatigue rating to generate today\'s working load.", "widget_data": {"widget_type": "progressive_overload_rpe", "hook": True, "one_rep_max": 315, "rpe": 8, "sets": 4, "reps": 8, "split": "Leg day"}},
            {"id": "fitness-day-2", "day": 2, "type": "fitness", "title": "Nutrient Timing Allocator", "instructions": "Tune your pre- and intra-workout fuel to match session intensity.", "widget_data": {"widget_type": "nutrient_timing_allocator", "workout_intensity": 8, "protein_grams": 42, "carbs_grams": 65, "timing_window_minutes": 90}},
        ]
    elif 'scalp' in path_key or 'trade' in path_key:
        title = '7-Day Scalp System'
        category = 'Trading'
        summary = 'A disciplined intraday trading roadmap for clean entries, tactical risk, and proof-based execution.'
        steps = [
            {"id": "dl-step-1", "type": "trading", "title": "Set up your execution checklist", "description": "Choose one market, define a clean setup, and write your entry rules.", "duration": 35, "widget_data": {"kind": "risk_setup"}},
            {"id": "dl-step-2", "type": "trading", "title": "Define your risk guardrails", "description": "Lock in max loss, stop placement, and unemotional trade sizing.", "duration": 25, "widget_data": {"kind": "risk_calculator"}},
            {"id": "dl-step-3", "type": "fitness", "title": "Log your proof checkpoint", "description": "Log your outcome and capture your trade review before the next session.", "duration": 18, "widget_data": {"kind": "pnl_log"}},
        ]
    else:
        title = 'Creator Momentum Sprint'
        category = 'Fitness'
        summary = 'A member-first roadmap for routines, tracking, and proof-based momentum.'
        steps = [
            {"id": "dl-step-1", "type": "fitness", "title": "Baseline and setup", "description": "Prepare your routine and choose the metrics that matter most.", "duration": 30, "widget_data": {"kind": "timer"}},
            {"id": "dl-step-2", "type": "fitness", "title": "Track your reps", "description": "Complete your set tracker and log progress consistently.", "duration": 20, "widget_data": {"kind": "set_tracker"}},
            {"id": "dl-step-3", "type": "creator", "title": "Capture proof", "description": "Post the result or snapshot that proves your momentum.", "duration": 15, "widget_data": {"kind": "proof_post"}},
        ]

    return {
        "creator": creator,
        "path": {
            "id": f"path-{path_slug}",
            "title": title,
            "slug": path_slug,
            "description": summary,
            "category": category,
            "days_count": 7,
            "summary": summary,
        },
        "steps": steps,
    }


async def mask_steps_for_member(payload: dict, user_id: Optional[str], path_slug: str):
    from app.routes.payment_routes import _has_entitlement

    has_access = bool(user_id and await _has_entitlement(user_id, path_slug))
    if has_access:
        payload["has_access"] = True
        return payload

    masked_steps = []
    for index, step in enumerate(payload.get("steps", [])):
        if int(step.get("day", index + 1)) <= 1:
            masked_steps.append(step)
            continue
        masked_steps.append({
            "id": step.get("id"),
            "day": step.get("day"),
            "title": step.get("title", "Member tool"),
            "type": step.get("type", "course"),
            "instructions": "Unlock this member tool to reveal the full interactive engine.",
            "description": "Day 2+ is reserved for members.",
            "widget_data": {"widget_type": "locked_preview", "locked": True},
            "locked": True,
        })
    payload["steps"] = masked_steps
    payload["has_access"] = False
    payload["access_price_cents"] = 4900
    return payload


def build_interactive_widget(source_type: str, category: str, day: int, source_input: str):
    category_lower = category.lower()
    if "fitness" in category_lower or "health" in category_lower or "bodybuilding" in category_lower:
        if day == 1:
            return {"widget_type": "progressive_overload_rpe", "specialty": True, "hook": True, "one_rep_max": 315, "rpe": 8, "sets": 4, "reps": 8, "split": "Leg day"}
        if day == 2:
            return {"widget_type": "nutrient_timing_allocator", "specialty": True, "workout_intensity": 8, "protein_grams": 42, "carbs_grams": 65, "timing_window_minutes": 90}
    if "real estate" in category_lower or "property" in category_lower:
        if day == 1:
            return {"widget_type": "mao_calculator", "specialty": True, "hook": True, "arv": 350000, "rehab_cost": 60000, "target_margin_pct": 20}
    if "content" in category_lower or "creator" in category_lower:
        if day == 1:
            return {"widget_type": "hook_diagnostic", "specialty": True, "hook": True, "scoring_dimensions": ["curiosity_gap", "authority_signal", "scroll_stop"]}
    if any(term in category_lower for term in ("finance", "invest", "trading", "business")):
        if day == 1:
            return {
                "widget_type": "dcf_moat_evaluator",
                "hook": True,
                "ticker": "AAPL",
                "starting_revenue": 100000000,
                "discount_rate_pct": 9,
                "terminal_growth_pct": 3,
                "margin_of_safety_pct": 25,
                "output_label": "Estimated intrinsic value",
            }
        if day == 2:
            return {
                "widget_type": "position_sizing_simulator",
                "capital": 25000,
                "risk_per_trade_pct": 1,
                "stop_loss_pct": 2,
                "leverage_cap": 3,
            }
    if any(term in category_lower for term in ("fitness", "health", "bodybuilding")):
        if day == 1:
            return {
                "widget_type": "progressive_overload_rpe",
                "hook": True,
                "one_rep_max": 315,
                "rpe": 8,
                "sets": 4,
                "reps": 8,
                "split": "Leg day",
            }
        if day == 2:
            return {
                "widget_type": "nutrient_timing_allocator",
                "workout_intensity": 8,
                "protein_grams": 42,
                "carbs_grams": 65,
                "timing_window_minutes": 90,
            }
    if any(term in category_lower for term in ("sales", "coaching", "closer")):
        if day == 1:
            return {
                "widget_type": "objection_roleplay_matrix",
                "hook": True,
                "buyer_personas": ["Price-Sensitive CFO", "Skeptical Agency Owner"],
                "objection": "Your price is too high. Why should I pay today?",
                "grading_rubric": ["frame control", "value stacking", "closing technique"],
            }
        if day == 2:
            return {
                "widget_type": "deal_velocity_calculator",
                "deal_value": 5000,
                "close_rate_pct": 20,
                "sales_cycle_days": 14,
                "commission_pct": 10,
            }
    specialty_domains = {
        "e-commerce": ("product_roas_gauge", "Product Profitability & Breakeven ROAS Gauge"),
        "ecommerce": ("product_roas_gauge", "Product Profitability & Breakeven ROAS Gauge"),
        "content": ("hook_diagnostic", "First-3-Seconds Video Hook Diagnostic"),
        "real estate": ("mao_calculator", "Max Allowable Offer Calculator"),
        "no-code": ("mvp_scope_calculator", "MVP Feature Scoper & Complexity Calculator"),
        "productivity": ("sleep_window_calculator", "Caffeine Half-Life & Sleep Window Calculator"),
    }
    for domain_key, (widget_type, _) in specialty_domains.items():
        if domain_key in category_lower and day == 1:
            return {"widget_type": widget_type, "specialty": True, "hook": True, "source_rule": source_input[:120]}
    if day == 1:
        return {
            "widget_type": "diagnostic_calculator",
            "hook": True,
            "input_label": "Your current baseline",
            "output_label": "Personalized instant-win target",
            "starting_value": 5000 if "trad" in category_lower else 100,
            "target_rate_pct": 2 if "trad" in category_lower else 10,
            "save_to_profile": True,
        }
    if day == 2:
        return {
            "widget_type": "ai_pitch_simulator",
            "scenario": "A skeptical buyer says: Your price is too high. Why should I pay today?",
            "buyer_persona": "skeptical_buyer",
            "grading_rubric": ["clarity", "proof", "specific outcome", "objection handling"],
        }
    if day == 3 or source_type == "youtube" or "course" in category_lower or "ai" in category_lower:
        return {
            "widget_type": "video_prompt_lab",
            "video_url": source_input if source_input.startswith("http") else "https://www.youtube.com/watch?v=demo",
            "chapters": [{"title": "Core idea", "start_seconds": 0}, {"title": "Apply it", "start_seconds": 120}],
            "prompt": "Apply the creator's framework to my situation and return the next action.",
        }
    if "trad" in category_lower or "fit" in category_lower or "business" in category_lower:
        return {
            "widget_type": "diagnostic_calculator",
            "input_label": "Adjust your current metric",
            "output_label": "Projected result",
            "starting_value": 5000,
            "target_rate_pct": 2,
            "formula": "baseline * target_rate_pct / 100",
        }
    return {
        "widget_type": "proof_engine",
        "proof_type": "url_or_screenshot",
        "verification_rules": ["must be a reachable URL", "must show the completed outcome"],
        "unlock_next_step": True,
    }


def parse_source_to_path(source_type: str, source_input: str, domain: str, template: str = "7-day-challenge", attachments=None):
    cleaned = (source_input or '').strip()
    attachment_names = [str(item.get("name", "")) for item in (attachments or []) if isinstance(item, dict)]
    attachment_context = f" Attachments: {', '.join(attachment_names)}." if attachment_names else ""
    title_seed = cleaned[:80].strip() or "Creator Growth Sprint"
    title = title_seed.splitlines()[0].strip()
    category = (domain or 'Creator').strip() or 'Creator'

    if category.lower() in {'trading', 'finance', 'investing'}:
        category_name = 'Finance' if category.lower() in {'finance', 'investing'} else 'Trading'
        step_templates = [
            {"id": "step_1", "day": 1, "title": "Pre-Market Risk Setup", "type": "trading", "instructions": "Set your maximum loss, check the news calendar, and define what counts as a valid setup.", "widget_data": {"checklist": ["Check news calendar", "Max drawdown cap set at 2%"], "account_risk_pct": 1.5, "require_pnl_log": True}},
            {"id": "step_2", "day": 2, "title": "Strategy Prompt Review", "type": "course", "instructions": "Use the system prompt to evaluate entries and exits before acting on any trade.", "widget_data": {"code_snippet": "Act as a disciplined momentum trader. Evaluate risk/reward, trend, and execution quality before entering.", "resource_url": "https://example.com/trading-rules", "proof_type": "url_submission"}},
        ]
    elif category.lower() in {'fitness', 'health'}:
        category_name = 'Fitness'
        step_templates = [
            {"id": "step_1", "day": 1, "title": "Baseline Workout Setup", "type": "fitness", "instructions": "Choose your workout block, movement plan, and recovery check-in.", "widget_data": {"checklist": ["Set workout time", "Track reps", "Log recovery"], "session_goal": "Consistency", "require_reps": True}},
            {"id": "step_2", "day": 2, "title": "Track Your Progress", "type": "fitness", "instructions": "Record reps, intensity, and energy so you can improve with data instead of guesswork.", "widget_data": {"checklist": ["Log sets", "Review soreness", "Update streak"], "proof_type": "image_submission"}},
        ]
    elif category.lower() in {'ai', 'ai & tech', 'technology'}:
        category_name = 'AI & Tech'
        step_templates = [
            {"id": "step_1", "day": 1, "title": "Stack the tool workflow", "type": "course", "instructions": "Choose the AI stack and build your first repeatable workflow from raw input to output.", "widget_data": {"code_snippet": "Create a workflow that turns content into an offer, deliverable, and proof checkpoint.", "resource_url": "https://example.com/ai-wf", "proof_type": "url_submission"}},
            {"id": "step_2", "day": 2, "title": "Ship a deliverable", "type": "creator", "instructions": "Turn the workflow into a concrete artifact customers can use immediately.", "widget_data": {"checklist": ["Build first output", "Capture screenshot", "Share result"], "proof_type": "image_submission"}},
        ]
    elif category.lower() in {'sales', 'coaching', 'high-ticket'}:
        category_name = 'Sales'
        step_templates = [
            {"id": "step_1", "day": 1, "title": "AI Objection Matrix", "type": "creator", "instructions": "Handle a live buyer objection and practice frame control before the close.", "widget_data": {"proof_type": "roleplay_score"}},
            {"id": "step_2", "day": 2, "title": "Deal Velocity Model", "type": "course", "instructions": "Model payback period, close rate, and commission before your next sales call.", "widget_data": {"proof_type": "calculator_result"}},
        ]
    elif category.lower() in {'real estate', 'property', 'realestate'}:
        category_name = 'Real Estate'
        step_templates = [
            {"id": "step_1", "day": 1, "title": "MAO Calculator", "type": "course", "instructions": "Calculate your maximum allowable offer from ARV and rehab costs.", "widget_data": {}},
            {"id": "step_2", "day": 2, "title": "BRRRR Rehab Estimator", "type": "course", "instructions": "Model rehab scope, refinance value, and cash-out potential.", "widget_data": {}},
        ]
    elif category.lower() in {'content', 'content creation', 'personal brand'}:
        category_name = 'Content'
        step_templates = [
            {"id": "step_1", "day": 1, "title": "Viral Hook Score", "type": "creator", "instructions": "Test curiosity, authority, and scroll-stop potential.", "widget_data": {}},
            {"id": "step_2", "day": 2, "title": "Format & B-Roll Matrix", "type": "creator", "instructions": "Pair the winning hook with a shoot-ready format.", "widget_data": {}},
        ]
    else:
        category_name = 'Creator'
        step_templates = [
            {"id": "step_1", "day": 1, "title": "Define the content system", "type": "creator", "instructions": "Turn your raw ideas into a tiny repeatable content engine with a clear cadence.", "widget_data": {"checklist": ["Choose output format", "Set publishing cadence", "Define proof checkpoint"], "proof_type": "url_submission"}},
            {"id": "step_2", "day": 2, "title": "Publish and refine", "type": "course", "instructions": "Ship the first working asset, study the response, and improve the next loop.", "widget_data": {"code_snippet": "Create a weekly content system that converts audience attention into repeatable action.", "resource_url": "https://example.com/creator-loop", "proof_type": "url_submission"}},
        ]

    template_days = {
        "3-day-onboarding": 3,
        "7-day-challenge": 7,
        "30-day-masterclass": 30,
        "pre-market-checklist": 5,
    }
    if template in template_days:
        total_steps = template_days[template]
    elif '5-day' in cleaned.lower() or '5 day' in cleaned.lower():
        total_steps = 5
    elif '7-day' in cleaned.lower() or '7 day' in cleaned.lower():
        total_steps = 7
    else:
        total_steps = max(3, min(7, len(cleaned.split()) // 12 + 3))

    steps = []
    source_lower = cleaned.lower()
    detected_source = "youtube" if "youtube.com" in source_lower or "youtu.be" in source_lower else "notion" if "notion" in source_lower else source_type
    for i in range(total_steps):
        template = step_templates[i % len(step_templates)]
        widget_data = {
            **template["widget_data"],
            **build_interactive_widget(source_type, category, i + 1, cleaned),
            "proof_required": "interactive_result" if i == 0 else "proof_submission",
            "paywall_after_completion": i >= 1,
        }
        domain_titles = {
            "Finance": ["DCF Moat Evaluator: Find Intrinsic Value", "Position Sizing & Drawdown Simulator", "PnL Proof Engine", "TradingView Strategy Sandbox", "Prop Firm Readiness Score"],
            "Trading": ["DCF Moat Evaluator: Find Intrinsic Value", "Position Sizing & Drawdown Simulator", "PnL Proof Engine", "TradingView Strategy Sandbox", "Prop Firm Readiness Score"],
            "Fitness": ["Progressive Overload Planner: Leg Day RPE", "Nutrient Timing Allocator", "Overload Proof Log", "Recovery Timer Lab", "Transformation Scorecard"],
            "Sales": ["AI Objection Matrix: Elite Closer Roleplay", "Deal Commission & Pipeline Velocity", "Call Script Sandbox", "Proof of Pipeline", "Closer Scorecard"],
            "Real Estate": ["MAO Calculator", "BRRRR Rehab Estimator", "Deal Pitch Proof", "Investor Pitch Sandbox", "Acquisition Scorecard"],
            "Content": ["Viral Hook Score", "Format & B-Roll Matrix", "Publish Proof Log", "Audience Signal Lab", "Creator Growth Scorecard"],
        }
        phase_specs = {
            "Fitness": ["progressive_overload_rpe", "nutrient_timing_allocator", "proof_engine", "video_prompt_lab", "diagnostic_calculator"],
            "Real Estate": ["mao_calculator", "diagnostic_calculator", "proof_engine", "video_prompt_lab", "diagnostic_calculator"],
            "Sales": ["objection_roleplay_matrix", "deal_velocity_calculator", "video_prompt_lab", "proof_engine", "diagnostic_calculator"],
            "Content": ["hook_diagnostic", "video_prompt_lab", "proof_engine", "diagnostic_calculator", "diagnostic_calculator"],
            "Finance": ["dcf_moat_evaluator", "position_sizing_simulator", "proof_engine", "video_prompt_lab", "diagnostic_calculator"],
            "Trading": ["dcf_moat_evaluator", "position_sizing_simulator", "proof_engine", "video_prompt_lab", "diagnostic_calculator"],
        }
        if category_name in phase_specs:
            widget_data["widget_type"] = phase_specs[category_name][min(i, len(phase_specs[category_name]) - 1)]
            widget_data["specialty"] = True
        phase_instructions = {
            "Fitness": ["Set your 1RM and fatigue rating to generate today's working load.", "Allocate fuel around your training intensity.", "Submit completed sets and recovery proof.", "Run the recovery protocol for your current split.", "Review your final volume and consistency score."],
            "Real Estate": ["Calculate your maximum allowable offer from ARV and rehab costs.", "Model rehab scope, refinance value, and cash-out potential.", "Submit your property analysis for verification.", "Rehearse the investor conversation with your deal numbers.", "Review your final margin and risk score."],
            "Sales": ["Practice frame control against a skeptical buyer persona.", "Model close rate, payback period, and commission upside.", "Run your call script through a live rehearsal.", "Submit a qualified opportunity for verification.", "Review your final value stacking and close score."],
            "Content": ["Test curiosity, authority, and scroll-stop potential.", "Pair the winning hook with a shoot-ready format.", "Submit your live post and performance proof.", "Interpret retention and response signals.", "Review your final reach and conversion score."],
        }
        if category_name in phase_instructions:
            template_instruction = phase_instructions[category_name][min(i, 4)]
        else:
            template_instruction = template["instructions"]
        title_options = domain_titles.get(category_name, [])
        steps.append({
            "id": f"step_{i + 1}",
            "day": i + 1,
            "title": title_options[i] if i < len(title_options) else template["title"],
            "type": template["type"],
            "instructions": template_instruction,
            "widget_data": widget_data,
            "locked": i >= 1,
            "unlock_price_cents": 4900,
            "tier_name": "Pathfinder Plus" if i >= 1 else "Free Hook",
            "phase": "free_hook" if i == 0 else "paid_execution" if i < total_steps - 1 else "final_upsell",
            "source_type_detected": detected_source,
            "upsell": {"enabled": i == total_steps - 1, "label": "Continue into the creator mastermind", "url": "https://example.com/creator-offer"},
        })

    return {
        "title": title or f"{category_name} Growth Sprint",
        "category": category_name,
        "description": f"Generated from {source_type} content for a {category_name.lower()} growth system.{attachment_context}",
        "creator_handle": "miamitrader",
        "steps": steps,
    }


def build_creator_insights():
    events = STEP_COMPLETION_EVENTS[:]

    active_members = len({event["user_id"] for event in events}) if events else 1284
    total_joins = len({(event["user_id"], event["path_id"]) for event in events}) if events else 3961

    completion_speed = 4.8
    if events:
        completion_speed = round(max(1.2, min(12.0, 4.8 + (len(events) / 20.0))), 1)

    step_dropoff = [
        {"label": "Step 1", "value": 92},
        {"label": "Step 3", "value": 74},
        {"label": "Step 5", "value": 58},
        {"label": "Step 8", "value": 39},
        {"label": "Final", "value": 24},
    ]

    if events:
        path_counts = {}
        for event in events:
            path_counts[event["path_id"]] = path_counts.get(event["path_id"], 0) + 1
        if path_counts:
            step_dropoff = [
                {"label": "Step 1", "value": min(98, 84 + max(path_counts.values()))},
                {"label": "Step 3", "value": min(90, 64 + max(path_counts.values()) // 2)},
                {"label": "Step 5", "value": min(84, 48 + max(path_counts.values()) // 3)},
                {"label": "Step 8", "value": min(70, 30 + max(path_counts.values()) // 4)},
                {"label": "Final", "value": min(60, 18 + max(path_counts.values()) // 5)},
            ]

    roadblocks = [
        {"step": "Step 4", "text": "Members lose momentum when setup feels unclear.", "tone": "#F59E0B"},
        {"step": "Step 7", "text": "Proof requirements create a pause before members finish.", "tone": "#35E4A1"},
    ]

    return {
        "active_members": active_members,
        "total_joins": total_joins,
        "completion_speed_days": completion_speed,
        "roadblocks": roadblocks,
        "step_dropoff": step_dropoff,
    }


def build_activity_feed(limit: int = 10):
    events = STEP_COMPLETION_EVENTS[-limit:]
    event_activities = [
        {
            "id": event["id"],
            "username": f"member_{event['user_id'].split('_')[-1]}",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
            "path_id": event["path_id"],
            "path_title": event["path_id"].replace("-", " ").title(),
            "step_completed": f"Step {event['step_id']}",
            "proof_type": "proof" if event.get("proof_data") else "metric",
            "proof_value": event.get("proof_data", {}).get("type", "Completed"),
            "verified": True,
            "timestamp": "just now",
            "likes": 12,
        }
        for event in events
    ]

    fallback_activities = [
        {
            "id": "act-101",
            "username": "alex_trades",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
            "path_id": "path-trade-momentum",
            "path_title": "Trade Momentum 7-Day Sprint",
            "step_completed": "Day 3: Pre-Market Execution & Risk Setup",
            "proof_type": "metric",
            "proof_value": "+$420 Logged",
            "verified": True,
            "timestamp": "12m ago",
            "likes": 24,
        },
        {
            "id": "act-102",
            "username": "sarah_fit",
            "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100",
            "path_id": "path-creator-shred",
            "path_title": "12-Week Creator Shred Routine",
            "step_completed": "Week 2, Day 4: High-Intensity Metabolic Circuit",
            "proof_type": "streak",
            "proof_value": "12 Day Streak 🔥",
            "verified": True,
            "timestamp": "45m ago",
            "likes": 18,
        },
        {
            "id": "act-103",
            "username": "marcus_ai",
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
            "path_id": "path-ai-agency",
            "path_title": "AI Automation Agency Playbook",
            "step_completed": "Milestone 2: Deployed Cold Email Lead Bot",
            "proof_type": "outcome",
            "proof_value": "First 3 Client Replies",
            "verified": False,
            "timestamp": "2h ago",
            "likes": 31,
        },
        {
            "id": "act-104",
            "username": "elena_creator",
            "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
            "path_id": "path-digital-product",
            "path_title": "Creator Digital Product Launch",
            "step_completed": "Day 5: Gumroad & Notion Template Setup",
            "proof_type": "revenue",
            "proof_value": "$1,250 Pre-orders",
            "verified": True,
            "timestamp": "4h ago",
            "likes": 56,
        },
    ]

    merged_activities = event_activities + [act for act in fallback_activities if act["id"] not in {item["id"] for item in event_activities}]
    limited = merged_activities[:limit]
    return {
        "activities": limited,
        "total": len(merged_activities),
    }

from app.models.path import (
    Difficulty,
    PathModel,
    PathStatus,
    PathStep,
    StepKind,
    UserPathProgress,
    Visibility,
)
from app.services import path_service
from app.practice_paths import find_practice_path, practice_paths

router = APIRouter()
PUBLISHED_PATHS = {}


def build_standby_paths():
    now = datetime.utcnow().isoformat()

    return [
        PathModel(
            id="trade-momentum-7d",
            creator_id="creator_trade_momentum",
            title="Trade Momentum 7-Day Sprint",
            slug="trade-momentum-7-day-sprint",
            category="Trading",
            niche="Finance",
            summary="A focused 7-day routine for learning momentum entries, risk control, and consistency without overtrading.",
            description="This sprint teaches a simple repeatable process for identifying momentum setups, managing risk, and journaling your trades every day.",
            price=49.0,
            currency="USD",
            status=PathStatus.PUBLISHED,
            visibility=Visibility.PUBLIC,
            target_audience=["new traders", "day traders", "people building routines"],
            difficulty=Difficulty.INTERMEDIATE,
            estimated_duration_days=7,
            estimated_duration_hours=12,
            cover_image_url="",
            tags=["trading", "momentum", "risk", "routine"],
            source_assets=[],
            steps=[
                PathStep(
                    id="tm-day-1",
                    title="Set up your trading dashboard",
                    description="Choose one market, define your watchlist, and standardize your chart setup.",
                    step_number=1,
                    kind=StepKind.TASK,
                    duration_minutes=45,
                    prerequisites=[],
                    checklist=["Pick one market", "Set 3 watchlists", "Define entry criteria"],
                    resources=["TradingView template", "Risk checklist"],
                    completion_criteria="Dashboard is ready and you know your setup rules.",
                    success_metric="Trade journal is ready to log entries.",
                ),
                PathStep(
                    id="tm-day-2",
                    title="Learn the momentum checklist",
                    description="Identify trend, volume, relative strength, and risk-to-reward before you enter.",
                    step_number=2,
                    kind=StepKind.LESSON,
                    duration_minutes=60,
                    prerequisites=["tm-day-1"],
                    checklist=["Review trend filter", "Confirm volume spike", "Identify stop placement"],
                    resources=["Momentum checklist", "Entry template"],
                    completion_criteria="You can explain when to pass on a setup.",
                    success_metric="At least 5 setups reviewed with a clear thesis.",
                ),
                PathStep(
                    id="tm-day-3",
                    title="Simulate 3 low-risk trades",
                    description="Practice your setup on paper to validate your process before risking capital.",
                    step_number=3,
                    kind=StepKind.TASK,
                    duration_minutes=90,
                    prerequisites=["tm-day-2"],
                    checklist=["Log 3 paper trades", "Review setup quality", "Note mistakes"],
                    resources=["Journal template"],
                    completion_criteria="Three entries are logged with clear reasons.",
                    success_metric="Consistency beats perfection across 3 trades.",
                ),
                PathStep(
                    id="tm-day-4",
                    title="Define your risk plan",
                    description="Set max loss per trade, daily drawdown limit, and your stop-loss method.",
                    step_number=4,
                    kind=StepKind.CHECKPOINT,
                    duration_minutes=30,
                    prerequisites=["tm-day-3"],
                    checklist=["Set 1% max risk", "Limit daily losses", "Create stop rules"],
                    resources=["Risk calculator"],
                    completion_criteria="You can explain your risk model before entering a trade.",
                    success_metric="No trade exceeds the defined risk cap.",
                ),
                PathStep(
                    id="tm-day-5",
                    title="Execute with a review loop",
                    description="Take only your highest-quality setups and review them after each session.",
                    step_number=5,
                    kind=StepKind.TASK,
                    duration_minutes=120,
                    prerequisites=["tm-day-4"],
                    checklist=["Trade only 1-2 setups", "Review each exit", "Note lessons"],
                    resources=["Trade review prompt"],
                    completion_criteria="A full review session is complete.",
                    success_metric="You follow your checklist for every trade.",
                ),
                PathStep(
                    id="tm-day-6",
                    title="Backtest your best pattern",
                    description="Look for the one pattern that keeps working across recent sessions and double down on it.",
                    step_number=6,
                    kind=StepKind.REVIEW,
                    duration_minutes=60,
                    prerequisites=["tm-day-5"],
                    checklist=["Review past trades", "Find pattern repeats", "Adjust plan"],
                    resources=["Pattern review sheet"],
                    completion_criteria="You can identify your best setup and share the conditions.",
                    success_metric="You have one repeatable pattern with clear criteria.",
                ),
                PathStep(
                    id="tm-day-7",
                    title="Lock in your weekly system",
                    description="Document what worked, what failed, and what you will do next week to stay consistent.",
                    step_number=7,
                    kind=StepKind.MILESTONE,
                    duration_minutes=45,
                    prerequisites=["tm-day-6"],
                    checklist=["Summarize results", "Track lessons", "Set next week's rules"],
                    resources=["Weekly scorecard"],
                    completion_criteria="The system is documented and repeatable.",
                    success_metric="You have a plan you can execute next week without starting over.",
                ),
            ],
            outcome="Build a repeatable momentum trading system without emotional overtrading.",
            success_signals=["You can explain your setup in one sentence", "You respect risk caps", "Your journal is consistent"],
            created_at=now,
            updated_at=now,
        ),
        PathModel(
            id="fitness-shred-12w",
            creator_id="creator_fitness_coach",
            title="12-Week Creator Shred Routine",
            slug="12-week-creator-shred-routine",
            category="Fitness",
            niche="Health",
            summary="A 12-week body recomposition plan for creators balancing desk work, workout consistency, and recovery.",
            description="This roadmap combines strength, conditioning, and recovery so you can improve energy, body composition, and discipline without burning out.",
            price=39.0,
            currency="USD",
            status=PathStatus.PUBLISHED,
            visibility=Visibility.PUBLIC,
            target_audience=["busy creators", "fitness beginners", "people returning to training"],
            difficulty=Difficulty.BEGINNER,
            estimated_duration_days=84,
            estimated_duration_hours=30,
            cover_image_url="",
            tags=["fitness", "strength", "recovery", "creator lifestyle"],
            source_assets=[],
            steps=[
                PathStep(
                    id="fit-week-1",
                    title="Baseline and movement prep",
                    description="Establish your starting point and learn the movement patterns you will repeat each week.",
                    step_number=1,
                    kind=StepKind.TASK,
                    duration_minutes=60,
                    checklist=["Take body metrics", "Test movement basics", "Set weekly schedule"],
                    resources=["Workout calendar", "Movement screen"],
                    completion_criteria="You know your baseline and your weekly training blocks.",
                    success_metric="You complete the first full week without skipping workouts.",
                ),
                PathStep(
                    id="fit-week-2",
                    title="Build your training rhythm",
                    description="Create a realistic 3-4 day routine and anchor it around your workweek.",
                    step_number=2,
                    kind=StepKind.CHECKPOINT,
                    duration_minutes=45,
                    checklist=["Choose strength days", "Set cardio blocks", "Plan recovery"],
                    resources=["Sample weekly split"],
                    completion_criteria="You follow a consistent training rhythm.",
                    success_metric="You train at least 3 times this week.",
                ),
                PathStep(
                    id="fit-week-3",
                    title="Add progressive overload",
                    description="Increase volume or resistance slowly so you gain strength without injury.",
                    step_number=3,
                    kind=StepKind.LESSON,
                    duration_minutes=50,
                    checklist=["Track weights", "Add reps or load", "Review soreness"],
                    resources=["Progression guide"],
                    completion_criteria="You can explain when to increase load.",
                    success_metric="You improve one movement pattern over the week.",
                ),
                PathStep(
                    id="fit-week-6",
                    title="Build consistency over intensity",
                    description="Focus on keeping workouts repeatable and recovery strong across busy weeks.",
                    step_number=4,
                    kind=StepKind.TASK,
                    duration_minutes=55,
                    checklist=["Track weekly consistency", "Reduce missed sessions", "Prioritize sleep"],
                    resources=["Recovery checklist"],
                    completion_criteria="You complete the majority of planned sessions.",
                    success_metric="Consistency remains above 80% for the month.",
                ),
                PathStep(
                    id="fit-week-9",
                    title="Adjust for performance and fatigue",
                    description="Use data from your training log to refine your plan and avoid burnout.",
                    step_number=5,
                    kind=StepKind.REVIEW,
                    duration_minutes=40,
                    checklist=["Review progress", "Look for fatigue signs", "Push only when recovered"],
                    resources=["Training review template"],
                    completion_criteria="You can identify what needs to change in the next block.",
                    success_metric="You are executing with less soreness and better energy.",
                ),
                PathStep(
                    id="fit-week-12",
                    title="Final transformation checkpoint",
                    description="Measure your progress, lock in your habits, and set the next phase for maintenance.",
                    step_number=6,
                    kind=StepKind.MILESTONE,
                    duration_minutes=60,
                    checklist=["Measure progress", "Review wins", "Design the next block"],
                    resources=["Transformation checklist"],
                    completion_criteria="You have a clear progress summary and long-term maintenance plan.",
                    success_metric="You finish with a sustainable routine that lasts beyond 12 weeks.",
                ),
            ],
            outcome="Build a realistic fitness system that supports creator life instead of fighting it.",
            success_signals=["Train consistently 3+ times a week", "Improved energy and recovery", "Sustainable weekly routine"],
            created_at=now,
            updated_at=now,
        ),
        PathModel(
            id="ai-agency-playbook",
            creator_id="creator_ai_studio",
            title="AI Automation Agency Playbook",
            slug="ai-automation-agency-playbook",
            category="AI & Courses",
            niche="Business",
            summary="A step-by-step playbook for packaging AI automations into services clients will pay for.",
            description="This path helps creators turn AI tooling into an agency offer, validate demand, and deliver recurring automation wins for small businesses.",
            price=79.0,
            currency="USD",
            status=PathStatus.PUBLISHED,
            visibility=Visibility.PUBLIC,
            target_audience=["operators", "agency founders", "solopreneurs"],
            difficulty=Difficulty.INTERMEDIATE,
            estimated_duration_days=21,
            estimated_duration_hours=18,
            cover_image_url="",
            tags=["ai", "automation", "agency", "offer design"],
            source_assets=[],
            steps=[
                PathStep(
                    id="ai-1",
                    title="Choose your niche service",
                    description="Pick a business problem you can automate and a customer segment that already feels the pain.",
                    step_number=1,
                    kind=StepKind.TASK,
                    duration_minutes=50,
                    checklist=["Interview prospects", "Map workflow pain", "Choose one offer"],
                    resources=["Offer worksheet"],
                    completion_criteria="You know the exact AI workflow you will sell.",
                    success_metric="You have a narrow offer and a target customer.",
                ),
                PathStep(
                    id="ai-2",
                    title="Prototype the automation",
                    description="Build a working demo using a low-cost stack and small but real business data.",
                    step_number=2,
                    kind=StepKind.LESSON,
                    duration_minutes=90,
                    checklist=["Build demo workflow", "Test prompts", "Track time saved"],
                    resources=["No-code stack list"],
                    completion_criteria="The demo saves time and shows clear value.",
                    success_metric="You have a repeatable prototype for the offer.",
                ),
                PathStep(
                    id="ai-3",
                    title="Test pricing and objections",
                    description="Sell the pilot to a real client or a warm lead to validate pricing and demand.",
                    step_number=3,
                    kind=StepKind.CTA,
                    duration_minutes=60,
                    checklist=["Offer pilot", "Collect objections", "Adjust pricing"],
                    resources=["Pricing guide"],
                    completion_criteria="You have real feedback from a customer conversation.",
                    success_metric="At least one pilot is booked or discussed seriously.",
                ),
                PathStep(
                    id="ai-4",
                    title="Deliver an MVP for a client",
                    description="Package your workflow into a clear service with scope, timeline, and expected outcomes.",
                    step_number=4,
                    kind=StepKind.TASK,
                    duration_minutes=120,
                    checklist=["Set deliverables", "Define handoff", "Document logic"],
                    resources=["Client delivery template"],
                    completion_criteria="The solution is delivered with a measurable outcome.",
                    success_metric="The client sees an ROI in the first 30 days.",
                ),
                PathStep(
                    id="ai-5",
                    title="Scale the service",
                    description="Create systems for onboarding, reporting, and repeatable implementation so it becomes a client engine.",
                    step_number=5,
                    kind=StepKind.MILESTONE,
                    duration_minutes=90,
                    checklist=["Document SOPs", "Build onboarding flow", "Systemize reporting"],
                    resources=["Agency ops template"],
                    completion_criteria="Your offer can be delivered consistently without reinventing the process.",
                    success_metric="You have a repeatable playbook beyond the first client.",
                ),
            ],
            outcome="Turn AI experiments into a real service business with a repeatable delivery model.",
            success_signals=["You have a validated niche", "You can show a live demo", "You have a client-ready offer"],
            created_at=now,
            updated_at=now,
        ),
        PathModel(
            id="digital-product-launch",
            creator_id="creator_digital_store",
            title="Creator Digital Product Launch",
            slug="creator-digital-product-launch",
            category="Creator",
            niche="Creator Economy",
            summary="A launch roadmap for turning audience trust into a paid digital product with a clear offer and funnel.",
            description="This path shows how to package knowledge, validate demand, and launch a digital product without overbuilding or needing a huge audience first.",
            price=59.0,
            currency="USD",
            status=PathStatus.PUBLISHED,
            visibility=Visibility.PUBLIC,
            target_audience=["content creators", "educators", "solo experts"],
            difficulty=Difficulty.BEGINNER,
            estimated_duration_days=14,
            estimated_duration_hours=10,
            cover_image_url="",
            tags=["creator", "digital products", "launch", "audience monetization"],
            source_assets=[],
            steps=[
                PathStep(
                    id="dp-1",
                    title="Identify the highest-value customer pain",
                    description="Pick one problem your audience already asks you about and package that into a product.",
                    step_number=1,
                    kind=StepKind.TASK,
                    duration_minutes=45,
                    checklist=["List audience problems", "Choose one topic", "Validate demand"],
                    resources=["Audience request tracker"],
                    completion_criteria="You have a clear product promise and an audience problem it solves.",
                    success_metric="You can articulate the offer in one sentence.",
                ),
                PathStep(
                    id="dp-2",
                    title="Design the product format",
                    description="Choose whether the product is a PDF, mini course, toolkit, template pack, or a small membership offer.",
                    step_number=2,
                    kind=StepKind.LESSON,
                    duration_minutes=60,
                    checklist=["Pick format", "Define outcomes", "Map deliverables"],
                    resources=["Product format examples"],
                    completion_criteria="The product format matches the customer need.",
                    success_metric="The offer is easy to understand and easy to deliver.",
                ),
                PathStep(
                    id="dp-3",
                    title="Create the MVP and landing page",
                    description="Build the simplest working version, then create a landing page with the value proposition and CTA.",
                    step_number=3,
                    kind=StepKind.TASK,
                    duration_minutes=120,
                    checklist=["Outline product", "Build landing page", "Write CTA copy"],
                    resources=["Landing page framework"],
                    completion_criteria="A draft product and sales page are ready.",
                    success_metric="The landing page clearly explains the offer and outcome.",
                ),
                PathStep(
                    id="dp-4",
                    title="Test with a warm launch",
                    description="Invite a limited audience to purchase or pre-sell the product before a general launch.",
                    step_number=4,
                    kind=StepKind.CTA,
                    duration_minutes=50,
                    checklist=["Send outreach", "Collect feedback", "Adjust offer"],
                    resources=["Launch email template"],
                    completion_criteria="You have real buyer feedback from the launch audience.",
                    success_metric="You validate demand before broad release.",
                ),
                PathStep(
                    id="dp-5",
                    title="Ship and refine",
                    description="Launch publicly, collect feedback, and iterate on the product to increase conversion and satisfaction.",
                    step_number=5,
                    kind=StepKind.MILESTONE,
                    duration_minutes=75,
                    checklist=["Launch publicly", "Gather reactions", "Improve next iteration"],
                    resources=["Post-launch feedback form"],
                    completion_criteria="The product is live and there is feedback you can act on.",
                    success_metric="You have your first paying customers and a clearer growth plan.",
                ),
            ],
            outcome="Launch a simple digital product from audience trust, without overbuilding or overcomplicating the offer.",
            success_signals=["You have a product that solves a real problem", "You have a launch page", "You have early paying customers"],
            created_at=now,
            updated_at=now,
        ),
    ]


@router.post("/{path_id}/complete-step")
async def complete_step(path_id: str, payload: dict):
    step_id = payload.get("step_id")
    user_id = payload.get("user_id")
    proof_data = payload.get("proof_data") or {}

    if not step_id or not user_id:
        raise HTTPException(status_code=400, detail="step_id and user_id are required")

    event = {
        "id": f"evt-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",
        "path_id": path_id,
        "step_id": step_id,
        "user_id": user_id,
        "proof_data": proof_data,
        "timestamp": datetime.utcnow().isoformat(),
    }
    STEP_COMPLETION_EVENTS.append(event)

    return {
        "status": "success",
        "path_id": path_id,
        "completed_step_id": step_id,
        "user_id": user_id,
        "proof_data": proof_data,
        "standby": True,
    }


@router.get("/")
async def get_paths(category: str = None, limit: int = 50, skip: int = 0):
    try:
        result = await path_service.get_paths_paginated(
            category=category,
            limit=limit,
            skip=skip,
        )

        existing_paths = result.get("paths", [])
        existing_ids = {path.get("id") or path.get("slug") for path in existing_paths}
        seeded_paths = [path for path in practice_paths() if path.get("id") not in existing_ids and path.get("slug") not in existing_ids]
        merged_paths = existing_paths + seeded_paths
        if not existing_paths:
            merged_paths = [path.model_dump(mode="json") for path in build_standby_paths()] + seeded_paths
        if category and category != "All":
            category_key = category.lower().replace(" & courses", "").replace("/", "")
            merged_paths = [
                path for path in merged_paths
                if category_key in str(path.get("category", "")).lower().replace("/", "")
            ]
        return {
            "paths": merged_paths[skip: skip + limit],
            "total": len(merged_paths),
            "has_more": skip + limit < len(merged_paths),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/resolve/{creator_handle}/{path_slug}")
async def resolve_creator_path(creator_handle: str, path_slug: str, user_id: Optional[str] = None):
    creator = build_creator_profile(creator_handle)

    practice = find_practice_path(path_slug)
    if practice and practice["creator_handle"] == creator_handle.lower():
        payload = {
            "creator": {**creator, "name": practice["creator_name"], "handle": practice["creator_handle"], "total_members": practice["active_members"]},
            "path": {key: practice[key] for key in ("id", "title", "slug", "description", "category", "summary")},
            "steps": practice["steps"],
        }
        return await mask_steps_for_member(payload, user_id, path_slug)

    standby_paths = build_standby_paths()
    match = next((item.model_dump(mode="json") for item in standby_paths if item.slug.lower() == path_slug.lower()), None)

    if match:
        return await mask_steps_for_member({
            "creator": creator,
            "path": {
                "id": match["id"],
                "title": match["title"],
                "slug": match["slug"],
                "description": match["description"],
                "category": match["category"],
                "days_count": match.get("estimated_duration_days") or 7,
                "summary": match.get("summary"),
            },
            "steps": [
                {
                    "id": step["id"],
                    "type": step["kind"],
                    "title": step["title"],
                    "description": step["description"],
                    "duration": step.get("duration_minutes") or 30,
                    "widget_data": {"kind": "interactive_step"},
                }
                for step in match.get("steps", [])
            ],
        }, user_id, path_slug)

    published = PUBLISHED_PATHS.get((creator_handle.lower(), path_slug.lower()))
    if published:
        return await mask_steps_for_member(dict(published), user_id, path_slug)

    fallback = build_deep_link_fallback(creator_handle, path_slug)
    return await mask_steps_for_member(fallback, user_id, path_slug)


@router.get("/access-check")
async def path_access_check(path_slug: str, user_id: str):
    from app.routes.payment_routes import _has_entitlement
    return {"has_access": await _has_entitlement(user_id, path_slug), "path_slug": path_slug, "user_id": user_id}


@router.post("/publish")
async def publish_path(payload: PublishPathRequest):
    slug = re.sub(r"[^a-z0-9]+", "-", payload.title.lower()).strip("-") or "creator-path"
    slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    path_id = f"path-{uuid.uuid4().hex[:10]}"
    creator_handle = payload.creator_handle.strip().lower() or "creator"
    published = {
        "creator": build_creator_profile(creator_handle),
        "path": {
            "id": path_id,
            "title": payload.title,
            "slug": slug,
            "description": payload.description,
            "category": payload.category,
            "days_count": len(payload.steps),
            "summary": payload.description,
            "status": "published",
            "visibility": payload.visibility,
            "pricing_tiers": payload.pricing_tiers,
            "access_limit": payload.access_limit,
        },
        "steps": payload.steps,
    }
    PUBLISHED_PATHS[(creator_handle, slug)] = published
    return {
        "status": "published",
        "path_id": path_id,
        "slug": slug,
        "public_bio_link": f"/c/{creator_handle}/{slug}",
        "pricing_tiers": payload.pricing_tiers,
        "access_limit": payload.access_limit,
        "visibility": payload.visibility,
    }


@router.post("/ai-generate")
async def ai_generate_path(payload: AIGeneratePathRequest):
    try:
        source_type = payload.source_type
        source_input = payload.source_input
        domain = payload.domain

        if not source_input.strip():
            raise HTTPException(status_code=400, detail="source_input is required")

        parsed = parse_source_to_path(source_type, source_input, domain, payload.template, payload.attachments)
        return parsed
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{slug}")
async def get_path_by_slug(slug: str):
    try:
        path = await path_service.get_path_by_slug(slug)
        if path:
            return path

        standby_paths = build_standby_paths()
        match = next((item.model_dump(mode="json") for item in standby_paths if item.slug == slug), None)
        if not match:
            raise HTTPException(status_code=404, detail="Path not found")
        return match
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/import")
async def import_path(path: PathModel):
    try:
        inserted_id = await path_service.save_path(path)
        return {
            "message": "Successfully imported path",
            "id": inserted_id,
            "title": path.title,
            "message_detail": "Path created and added to database",
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {str(exc)}")


@router.post("/progress")
async def save_user_progress(progress: UserPathProgress):
    try:
        progress_id = await path_service.upsert_progress(progress)
        return {
            "message": "Progress saved",
            "id": progress_id,
            "user_id": progress.user_id,
            "path_id": progress.path_id,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/progress/{user_id}/{path_id}")
async def get_user_progress(user_id: str, path_id: str):
    try:
        progress = await path_service.get_progress_for_user_path(user_id, path_id)
        if not progress:
            raise HTTPException(status_code=404, detail="Progress not found")
        return progress
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
