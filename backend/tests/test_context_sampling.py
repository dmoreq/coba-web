"""Tests for correlated and independent context sampling."""

import numpy as np

from coba_server.models.context import ContextFeature, PopulationSegment
from coba_server.utils.context_sampling import sample_segment_context


def _two_features() -> list[ContextFeature]:
    return [
        ContextFeature(
            name="f0",
            label="F0",
            description="d",
            low_label="low",
            high_label="high",
        ),
        ContextFeature(
            name="f1",
            label="F1",
            description="d",
            low_label="low",
            high_label="high",
        ),
    ]


class TestCorrelatedContextSampling:
    def test_correlated_sampling_respects_correlation(self):
        segment = PopulationSegment(
            name="Test",
            weight=1.0,
            context_mean=[0.0, 0.0],
            context_std=[0.3, 0.3],
            context_correlations=[-0.7],
        )
        rng = np.random.default_rng(42)
        samples = [sample_segment_context(segment, _two_features(), rng) for _ in range(2000)]
        r = np.corrcoef([s[0] for s in samples], [s[1] for s in samples])[0, 1]
        assert abs(r - (-0.7)) < 0.08

    def test_zero_correlation_is_backward_compatible(self):
        segment = PopulationSegment(
            name="Test",
            weight=1.0,
            context_mean=[0.0, 0.0],
            context_std=[0.3, 0.3],
            context_correlations=None,
        )
        rng = np.random.default_rng(7)
        ctx = sample_segment_context(segment, _two_features(), rng)
        assert ctx.shape == (2,)
        assert all(-1.0 <= v <= 1.0 for v in ctx)
