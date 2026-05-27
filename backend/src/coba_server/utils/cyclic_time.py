"""Cyclic time-of-day encoding for context features."""

from __future__ import annotations

import math


def encode_cyclic_time(hour: float) -> tuple[float, float]:
    """
    Map hour-of-day (0–24) to sin/cos features in [-1, 1].

    Adjacent hours are close in feature space; midnight and noon are far apart.
    """
    phase = 2 * math.pi * (hour % 24) / 24
    return math.sin(phase), math.cos(phase)


def hour_from_legacy_time_feature(t: float) -> float:
    """Convert legacy linear time feature (-1=midnight, +1=noon) to hour 0–12."""
    return (t + 1.0) * 6.0
