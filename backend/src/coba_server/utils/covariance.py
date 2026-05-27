"""Covariance helpers for correlated context sampling."""

from __future__ import annotations


def build_covariance_matrix(
    stds: list[float], upper_triangle_correlations: list[float]
) -> list[list[float]]:
    """Build n×n covariance from per-feature stds and upper-triangle correlations."""
    n = len(stds)
    cov = [[0.0] * n for _ in range(n)]
    k = 0
    for i in range(n):
        cov[i][i] = stds[i] ** 2
        for j in range(i + 1, n):
            rho = upper_triangle_correlations[k]
            cov_ij = rho * stds[i] * stds[j]
            cov[i][j] = cov_ij
            cov[j][i] = cov_ij
            k += 1
    return cov
