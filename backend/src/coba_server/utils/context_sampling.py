"""Context vector sampling from population segments."""

from __future__ import annotations

import numpy as np
from scipy.stats import truncnorm

from coba_server.models.context import ContextFeature, PopulationSegment
from coba_server.utils.covariance import build_covariance_matrix


def _clip_to_feature_range(value: float, low: float, high: float) -> float:
    """Clip to bounds and avoid exact boundary pile-up from hard clipping."""
    v = float(np.clip(value, low, high))
    if v >= high:
        return high - 1e-9
    if v <= low:
        return low + 1e-9
    return v


def truncated_normal(
    rng: np.random.Generator,
    mean: float,
    std: float,
    low: float,
    high: float,
) -> float:
    if std <= 0:
        return float(np.clip(mean, low, high))
    a, b = (low - mean) / std, (high - mean) / std
    return _clip_to_feature_range(
        float(truncnorm.rvs(a, b, loc=mean, scale=std, random_state=rng)),
        low,
        high,
    )


def sample_segment_context(
    segment: PopulationSegment,
    features: list[ContextFeature],
    rng: np.random.Generator,
) -> np.ndarray:
    """
    Sample one context vector for a segment.

    Uses multivariate normal when context_correlations is set (values are then
    clipped to feature bounds). Otherwise uses independent truncated normals.
    """
    n_features = len(features)
    mins = [f.min_val for f in features]
    maxs = [f.max_val for f in features]

    if segment.context_correlations:
        cov = np.array(build_covariance_matrix(segment.context_std, segment.context_correlations))
        raw = rng.multivariate_normal(segment.context_mean, cov)
        return np.array(
            [_clip_to_feature_range(raw[i], mins[i], maxs[i]) for i in range(n_features)]
        )

    return np.array(
        [
            truncated_normal(
                rng,
                segment.context_mean[i],
                segment.context_std[i],
                mins[i],
                maxs[i],
            )
            for i in range(n_features)
        ]
    )
