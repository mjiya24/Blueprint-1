from datetime import datetime


def practice_paths():
    now = datetime.utcnow().isoformat()
    specs = [
        ("tradepilot_ai", "7-Day Algorithmic Edge & Prop Firm Challenge", "Trading", "6-in-1 Confluence Bias Score Calculator", "confluence_bias_score", 67, "TradePilot AI", "Trading"),
        ("gadzhi_agency", "5-Day Client Acquisition & Outreach Sprint", "Agency", "Outreach ROI & Retainer Modeling Engine", "outreach_roi_model", 97, "Gadzhi Agency", "Agency"),
        ("build_with_ai", "AI Lead Generation & Workflow Architect", "AI/SaaS", "API Token Cost & Automation ROI Estimator", "api_automation_roi", 49, "Build With AI", "AI"),
        ("apex_physique", "Peak Week Hypertrophy & Macro Sculptor", "Fitness", "Dynamic RPE & Progressive Overload Planner", "progressive_overload_rpe", 39, "Apex Physique", "Fitness"),
        ("ecom_scale", "Winning Product Validator & Ad ROAS Calculator", "E-commerce", "Product Profitability & Breakeven ROAS Gauge", "product_roas_gauge", 59, "Ecom Scale", "E-commerce"),
        ("viral_creator", "7-Day Hook-to-Format Virality Blueprint", "Content", "First-3-Seconds Video Hook Diagnostic", "hook_diagnostic", 29, "Viral Creator", "Content"),
        ("property_pro", "BRRRR Deal Analyzer & Rehab Estimator", "Real Estate", "Max Allowable Offer (MAO) Calculator", "mao_calculator", 149, "Property Pro", "Real Estate"),
        ("bootstrapped_saas", "Zero-to-MVP Launch Sprint", "No-Code", "MVP Feature Scoper & Complexity Calculator", "mvp_scope_calculator", 79, "Bootstrapped SaaS", "No-Code"),
        ("neuro_hacker", "Circadian Rhythm & Deep Work Optimizer", "Productivity", "Caffeine Half-Life & Sleep Window Calculator", "sleep_window_calculator", 45, "Neuro Hacker", "Productivity"),
        ("closer_matrix", "Frame Control & Objection Handling Simulator", "Sales", "Live AI Buyer Objection Roleplay Engine", "objection_roleplay_matrix", 99, "Closer Matrix", "Sales"),
    ]
    paths = []
    for index, (handle, title, category, hook_title, widget_type, price, creator_name, domain) in enumerate(specs, 1):
        slug = title.lower().replace("&", "and").replace(" ", "-").replace("/", "-")
        while "--" in slug:
            slug = slug.replace("--", "-")
        paid_widgets = {
            "confluence_bias_score": "position_sizing_simulator",
            "outreach_roi_model": "objection_roleplay_matrix",
            "api_automation_roi": "video_prompt_lab",
            "progressive_overload_rpe": "nutrient_timing_allocator",
            "product_roas_gauge": "video_prompt_lab",
            "hook_diagnostic": "video_prompt_lab",
            "mao_calculator": "diagnostic_calculator",
            "mvp_scope_calculator": "video_prompt_lab",
            "sleep_window_calculator": "diagnostic_calculator",
            "objection_roleplay_matrix": "deal_velocity_calculator",
        }
        paths.append({
            "id": f"practice-{index}",
            "creator_id": f"creator-{handle}",
            "creator_handle": handle,
            "creator_name": creator_name,
            "title": title,
            "slug": slug,
            "category": category,
            "category_aliases": [category, domain],
            "domain": domain,
            "niche": domain,
            "summary": f"A conversion-first {domain.lower()} path built around {hook_title.lower()}.",
            "description": f"Experience the free {hook_title}, then unlock the complete interactive engine with member-only execution tools.",
            "price": price,
            "currency": "USD",
            "status": "published",
            "visibility": "public",
            "difficulty": "intermediate",
            "estimated_duration_days": 7,
            "estimated_duration_hours": 8,
            "tags": [domain.lower(), "interactive", "practice-path", "verified-creator"],
            "active_members": 120 + index * 137,
            "rating": 4.9,
            "verified_creator": True,
            "created_at": now,
            "updated_at": now,
            "steps": [
                {"id": f"{handle}-day-1", "day": 1, "title": hook_title, "type": domain.lower(), "instructions": f"Run the {hook_title.lower()} and save your baseline result.", "widget_data": {"widget_type": widget_type, "hook": True, "specialty": True}},
                {"id": f"{handle}-day-2", "day": 2, "title": f"{domain} execution engine", "type": domain.lower(), "instructions": "Unlock the complete creator playbook and member execution tools.", "widget_data": {"widget_type": paid_widgets[widget_type], "specialty": True}, "locked": True},
            ],
        })
    return paths


def find_practice_path(slug: str):
    return next((path for path in practice_paths() if path["slug"] == slug), None)
