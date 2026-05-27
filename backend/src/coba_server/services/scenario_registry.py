"""Scenario registry — predefined real-world contexts for algorithm evaluation."""

from __future__ import annotations

from coba_server.models.context import (
    ContextFeature,
    ContextScenario,
    DriftConfig,
    PopulationSegment,
    RewardProfile,
)

_ARM_COLORS = ["#228be6", "#12b886", "#fd7e14", "#7950f2", "#e64980", "#2b8a3e"]
_ARM_LIGHT_COLORS = ["#e7f5ff", "#e6fcf5", "#fff4e6", "#f3f0ff", "#fce4ec", "#d3f9d8"]


def _with_palette(arms: list[dict]) -> list[dict]:
    return [
        {
            **arm,
            "color": arm.get("color") or _ARM_COLORS[i % len(_ARM_COLORS)],
            "light_color": arm.get("light_color") or _ARM_LIGHT_COLORS[i % len(_ARM_LIGHT_COLORS)],
        }
        for i, arm in enumerate(arms)
    ]


# ────────────────────────────────────────────────────────────────────────────
# Scenario A: Notification Channels
# Good for: LinUCB, LinTS, Logistic — clear linear reward structure
# ────────────────────────────────────────────────────────────────────────────

NOTIFICATION_CHANNELS = ContextScenario(
    id="notification_channels",
    label="Notification Channels",
    description=(
        "A mobile-first app sends notifications via Email, SMS, Push, or In-App. "
        "User engagement depends on device type (mobile vs desktop) and recency "
        "(how recently they've interacted). Each channel has a champion segment: "
        "inactive desktop users prefer email; active mobile users prefer push."
    ),
    domain="Marketing",
    features=[
        ContextFeature(
            name="mobile_usage",
            label="Mobile Usage",
            description=(
                "Fraction of recent sessions from mobile device (-1: desktop-only, +1: mobile-only)"
            ),
            min_val=-1.0,
            max_val=1.0,
            unit=None,
        ),
        ContextFeature(
            name="recency_days",
            label="Recency",
            description="Days since last interaction, normalised (-1: today, +1: 30+ days ago)",
            min_val=-1.0,
            max_val=1.0,
            unit="days",
        ),
    ],
    arms=_with_palette(
        [
            {"id": "email", "label": "Email", "true_prob": 0.2},
            {"id": "sms", "label": "SMS", "true_prob": 0.5},
            {"id": "push", "label": "Push", "true_prob": 0.7},
            {"id": "inapp", "label": "In-App", "true_prob": 0.4},
        ]
    ),
    reward_profiles=[
        RewardProfile(
            weights=[-0.6, 0.7],
            bias=0.1,
            description="Email: inactive desktop users respond well; active users ignore",
        ),
        RewardProfile(
            weights=[0.4, 0.2],
            bias=0.0,
            description="SMS: moderate baseline, slight mobile preference",
        ),
        RewardProfile(
            weights=[0.9, -0.5],
            bias=-0.1,
            description="Push: active mobile users respond strongly; inactive users ignore",
        ),
        RewardProfile(
            weights=[0.3, -0.8],
            bias=0.2,
            description="In-App: only recently-active users see; ignored by inactive users",
        ),
    ],
    population_segments=[
        PopulationSegment(
            name="Desktop Inactive",
            weight=0.25,
            context_mean=[-0.8, 0.7],
            context_std=[0.15, 0.2],
        ),
        PopulationSegment(
            name="Mobile Active",
            weight=0.35,
            context_mean=[0.8, -0.6],
            context_std=[0.15, 0.2],
        ),
        PopulationSegment(
            name="Cross-Device Recent",
            weight=0.25,
            context_mean=[0.1, -0.3],
            context_std=[0.3, 0.15],
        ),
        PopulationSegment(
            name="Low-Engagement Mixed",
            weight=0.15,
            context_mean=[-0.2, 0.5],
            context_std=[0.4, 0.25],
        ),
    ],
    drift_config=None,
)

# ────────────────────────────────────────────────────────────────────────────
# Scenario B: News Feed
# Good for: Neural Linear, Random Forest, Bootstrapped — non-linear surfaces
# ────────────────────────────────────────────────────────────────────────────

NEWS_FEED = ContextScenario(
    id="news_feed",
    label="News Feed",
    description=(
        "A news app recommends content categories (Sports, Tech, Lifestyle, "
        "Politics, Entertainment) based on user engagement level, time of day, "
        "and topic diversity. Non-linear interactions: sports peaks for engaged "
        "morning users; tech rewards diverse readers; entertainment suits "
        "low-engagement evenings."
    ),
    domain="News",
    features=[
        ContextFeature(
            name="engagement_score",
            label="Engagement",
            description="User's historical click-through rate (-1: passive, +1: power reader)",
            min_val=-1.0,
            max_val=1.0,
            unit=None,
        ),
        ContextFeature(
            name="time_of_day",
            label="Time of Day",
            description="Normalised time of day (-1: midnight, +1: noon)",
            min_val=-1.0,
            max_val=1.0,
            unit=None,
        ),
    ],
    arms=_with_palette(
        [
            {"id": "sports", "label": "Sports", "true_prob": 0.6},
            {"id": "tech", "label": "Tech", "true_prob": 0.5},
            {"id": "lifestyle", "label": "Lifestyle", "true_prob": 0.4},
            {"id": "politics", "label": "Politics", "true_prob": 0.3},
            {"id": "entertainment", "label": "Entertainment", "true_prob": 0.5},
        ]
    ),
    reward_profiles=[
        RewardProfile(
            weights=[0.7, 0.6],
            bias=0.0,
            description="Sports: high for engaged morning readers (interaction effect)",
        ),
        RewardProfile(
            weights=[0.5, -0.1],
            bias=0.1,
            description="Tech: consistent across engagement, slight morning lean",
        ),
        RewardProfile(
            weights=[-0.1, -0.7],
            bias=0.3,
            description="Lifestyle: evening + low engagement peak",
        ),
        RewardProfile(
            weights=[0.8, 0.2],
            bias=-0.2,
            description="Politics: power users only, time-insensitive",
        ),
        RewardProfile(
            weights=[-0.3, -0.5],
            bias=0.4,
            description="Entertainment: strong evening baseline, passive users responsive",
        ),
    ],
    population_segments=[
        PopulationSegment(
            name="Morning Commuter",
            weight=0.45,
            context_mean=[0.6, 0.7],
            context_std=[0.2, 0.15],
        ),
        PopulationSegment(
            name="Weekend Browser",
            weight=0.35,
            context_mean=[-0.5, -0.3],
            context_std=[0.3, 0.4],
        ),
        PopulationSegment(
            name="Power Reader",
            weight=0.2,
            context_mean=[0.9, 0.2],
            context_std=[0.1, 0.25],
        ),
    ],
    drift_config=None,
)

# ────────────────────────────────────────────────────────────────────────────
# Scenario C: Product Recommendations
# Good for: GP-UCB — smooth continuous reward surfaces
# ────────────────────────────────────────────────────────────────────────────

PRODUCT_RECOMMENDATIONS = ContextScenario(
    id="product_recommendations",
    label="Product Recommendations",
    description=(
        "An e-commerce site recommends price points (Premium, Mid-Range, Budget, "
        "Flash-Sale, Bundle) based on user price sensitivity and cart value. "
        "Smooth, continuous reward surfaces: premium suits high-cart "
        "price-insensitive users; budget suits low-cart price-sensitive users; "
        "flash-sale bimodal (both extremes). GP-UCB's kernel captures smoothness "
        "better than linear methods."
    ),
    domain="E-Commerce",
    features=[
        ContextFeature(
            name="price_sensitivity",
            label="Price Sensitivity",
            description="How much user cares about price (-1: insensitive, +1: highly sensitive)",
            min_val=-1.0,
            max_val=1.0,
            unit=None,
        ),
        ContextFeature(
            name="cart_value",
            label="Cart Value",
            description="Normalised recent cart value (-1: empty, +1: high-value)",
            min_val=-1.0,
            max_val=1.0,
            unit=None,
        ),
    ],
    arms=_with_palette(
        [
            {"id": "premium", "label": "Premium", "true_prob": 0.5},
            {"id": "midrange", "label": "Mid-Range", "true_prob": 0.6},
            {"id": "budget", "label": "Budget", "true_prob": 0.5},
            {"id": "flashsale", "label": "Flash-Sale", "true_prob": 0.55},
            {"id": "bundle", "label": "Bundle", "true_prob": 0.6},
        ]
    ),
    reward_profiles=[
        RewardProfile(
            weights=[-0.8, 0.7],
            bias=0.1,
            description="Premium: high for price-insensitive, high-cart users",
        ),
        RewardProfile(
            weights=[0.1, 0.3],
            bias=0.2,
            description="Mid-Range: broad plateau across middle of feature space",
        ),
        RewardProfile(
            weights=[0.8, -0.6],
            bias=0.15,
            description="Budget: high for price-sensitive, low-cart users",
        ),
        RewardProfile(
            weights=[0.7, -0.7],
            bias=0.05,
            description="Flash-Sale: bimodal—both price-sensitive and price-insensitive extremes",
        ),
        RewardProfile(
            weights=[0.0, 0.6],
            bias=0.25,
            description="Bundle: peaks along cart_value axis; high-cart users responsive",
        ),
    ],
    population_segments=[
        PopulationSegment(
            name="Budget Conscious",
            weight=0.4,
            context_mean=[0.7, -0.4],
            context_std=[0.2, 0.3],
        ),
        PopulationSegment(
            name="Premium Buyer",
            weight=0.3,
            context_mean=[-0.6, 0.5],
            context_std=[0.25, 0.2],
        ),
        PopulationSegment(
            name="Deal Seeker",
            weight=0.3,
            context_mean=[0.5, -0.2],
            context_std=[0.3, 0.3],
        ),
    ],
    drift_config=None,
)

# ────────────────────────────────────────────────────────────────────────────
# Scenario D: Content Format
# Good for: Sliding-Window LinUCB, Drift Detection — concept drift showcase
# ────────────────────────────────────────────────────────────────────────────

CONTENT_FORMAT = ContextScenario(
    id="content_format",
    label="Content Format",
    description=(
        "A media platform recommends content formats (Short-Form Video, Long-Form Article, "
        "Infographic, Podcast, Interactive) based on attention span and network bandwidth. "
        "Includes concept drift at step 200: short-form dominates early (mobile-first era); "
        "long-form + interactive surge later (content quality trend). Sliding-window LinUCB "
        "adapts post-drift; standard LinUCB gets stuck on stale statistics."
    ),
    domain="Content",
    features=[
        ContextFeature(
            name="attention_span",
            label="Attention Span",
            description="Normalised session dwell time (-1: quick browse, +1: deep dive)",
            min_val=-1.0,
            max_val=1.0,
            unit=None,
        ),
        ContextFeature(
            name="bandwidth",
            label="Bandwidth",
            description="Connection quality (-1: slow mobile, +1: fast broadband)",
            min_val=-1.0,
            max_val=1.0,
            unit=None,
        ),
    ],
    arms=_with_palette(
        [
            {"id": "shortform", "label": "Short-Form Video", "true_prob": 0.7},
            {"id": "longform", "label": "Long-Form Article", "true_prob": 0.4},
            {"id": "infographic", "label": "Infographic", "true_prob": 0.5},
            {"id": "podcast", "label": "Podcast", "true_prob": 0.45},
            {"id": "interactive", "label": "Interactive", "true_prob": 0.5},
        ]
    ),
    reward_profiles=[
        RewardProfile(
            weights=[0.2, 0.6],
            bias=0.2,
            description="Short-Form: mobile-first era (pre-drift), bandwidth-dependent",
        ),
        RewardProfile(
            weights=[0.3, -0.2],
            bias=0.1,
            description="Long-Form: modest early reward, strong post-drift",
        ),
        RewardProfile(
            weights=[-0.1, 0.5],
            bias=0.15,
            description="Infographic: steady baseline, broadband preference",
        ),
        RewardProfile(
            weights=[0.25, -0.3],
            bias=0.2,
            description="Podcast: time-investment play, cable-friendly",
        ),
        RewardProfile(
            weights=[0.4, 0.1],
            bias=0.05,
            description="Interactive: modest early, strong post-drift (engagement quality)",
        ),
    ],
    population_segments=[
        PopulationSegment(
            name="Mobile Quick Viewer",
            weight=0.4,
            context_mean=[-0.7, -0.5],
            context_std=[0.2, 0.2],
        ),
        PopulationSegment(
            name="Desktop Deep Diver",
            weight=0.3,
            context_mean=[0.8, 0.7],
            context_std=[0.15, 0.15],
        ),
        PopulationSegment(
            name="Moderate User",
            weight=0.3,
            context_mean=[0.1, 0.2],
            context_std=[0.4, 0.3],
        ),
    ],
    drift_config=DriftConfig(
        drift_step=200,
        drift_duration=100,
        target_profiles=[
            RewardProfile(
                weights=[-0.6, 0.3],
                bias=0.1,
                description="Short-Form: post-drift decline (content quality trend)",
            ),
            RewardProfile(
                weights=[0.8, 0.1],
                bias=0.3,
                description="Long-Form: post-drift surge (users demand deeper content)",
            ),
            RewardProfile(
                weights=[0.1, 0.4],
                bias=0.2,
                description="Infographic: unchanged",
            ),
            RewardProfile(
                weights=[0.3, -0.2],
                bias=0.25,
                description="Podcast: moderate post-drift gain",
            ),
            RewardProfile(
                weights=[0.7, 0.2],
                bias=0.35,
                description="Interactive: post-drift surge (engagement platform)",
            ),
        ],
    ),
)

# ────────────────────────────────────────────────────────────────────────────
# Scenario E: Ad Creative Selection
# Good for: Hybrid LinUCB — shared vs. arm-specific features
# ────────────────────────────────────────────────────────────────────────────

AD_CREATIVE_SELECTION = ContextScenario(
    id="ad_creative_selection",
    label="Ad Creative Selection",
    description=(
        "An ad platform selects creative formats (Video Ad, Carousel, Static Banner, Text Only) "
        "for different users. Features include ad fatigue (affects all creatives "
        "equally—shared) and brand affinity + content relevance (arm-specific). "
        "Hybrid LinUCB's shared parameters capture 'fatigue hurts everything'; "
        "arm-specific parameters capture per-creative preferences."
    ),
    domain="Advertising",
    features=[
        ContextFeature(
            name="ad_fatigue",
            label="Ad Fatigue",
            description="Number of ads user has seen today, normalised (-1: fresh, +1: saturated)",
            min_val=-1.0,
            max_val=1.0,
            unit=None,
        ),
        ContextFeature(
            name="creative_relevance",
            label="Creative Relevance",
            description=(
                "Relevance of ad topic to user's current session "
                "(-1: unrelated, +1: highly relevant)"
            ),
            min_val=-1.0,
            max_val=1.0,
            unit=None,
        ),
    ],
    arms=_with_palette(
        [
            {"id": "video", "label": "Video Ad", "true_prob": 0.6},
            {"id": "carousel", "label": "Carousel", "true_prob": 0.55},
            {"id": "banner", "label": "Static Banner", "true_prob": 0.4},
            {"id": "textonly", "label": "Text Only", "true_prob": 0.35},
        ]
    ),
    reward_profiles=[
        RewardProfile(
            weights=[-0.7, 0.6],
            bias=0.1,
            description="Video Ad: high engagement when relevant; fatigue sensitive",
        ),
        RewardProfile(
            weights=[-0.5, 0.5],
            bias=0.15,
            description="Carousel: balanced; relevance-driven",
        ),
        RewardProfile(
            weights=[-0.3, 0.3],
            bias=0.1,
            description="Static Banner: lower fatigue sensitivity; modest relevance boost",
        ),
        RewardProfile(
            weights=[-0.2, 0.2],
            bias=0.05,
            description="Text Only: minimal impact from relevance or fatigue",
        ),
    ],
    population_segments=[
        PopulationSegment(
            name="High-Relevance Viewer",
            weight=0.4,
            context_mean=[-0.3, 0.8],
            context_std=[0.3, 0.15],
        ),
        PopulationSegment(
            name="Ad-Fatigued User",
            weight=0.35,
            context_mean=[0.7, -0.2],
            context_std=[0.2, 0.3],
        ),
        PopulationSegment(
            name="Neutral",
            weight=0.25,
            context_mean=[0.1, 0.1],
            context_std=[0.4, 0.4],
        ),
    ],
    drift_config=None,
)

# ────────────────────────────────────────────────────────────────────────────
# Scenario Registry
# ────────────────────────────────────────────────────────────────────────────

SCENARIO_REGISTRY: dict[str, ContextScenario] = {
    scenario.id: scenario
    for scenario in [
        NOTIFICATION_CHANNELS,
        NEWS_FEED,
        PRODUCT_RECOMMENDATIONS,
        CONTENT_FORMAT,
        AD_CREATIVE_SELECTION,
    ]
}


def validate_all_scenarios() -> None:
    """Validate all scenarios in the registry. Call once at startup."""
    for scenario_id, scenario in SCENARIO_REGISTRY.items():
        try:
            scenario.validate_consistency()
        except ValueError as e:
            raise ValueError(f"Scenario '{scenario_id}' validation failed: {e}") from e


def get_scenario(scenario_id: str) -> ContextScenario:
    """Retrieve a scenario by ID. Raises KeyError if not found."""
    if scenario_id not in SCENARIO_REGISTRY:
        available = ", ".join(sorted(SCENARIO_REGISTRY.keys()))
        raise KeyError(f"Unknown scenario '{scenario_id}'. Available: {available}")
    return SCENARIO_REGISTRY[scenario_id]
