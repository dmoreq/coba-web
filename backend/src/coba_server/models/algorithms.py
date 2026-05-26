"""Algorithm metadata schemas."""

from typing import TypedDict

from pydantic import BaseModel


class AlgorithmInfo(BaseModel):
    id: str
    label: str
    description: str
    hyperparams: list[str] = []


class _AlgoMetaDict(TypedDict):
    label: str
    description: str
    hyperparams: list[str]


# Discrete ClusterBandit policies exposed by coba. CATS is intentionally excluded
# because it is a continuous-action policy with a different action-space contract.
ALGORITHM_META: dict[str, _AlgoMetaDict] = {
    "ucb1": {
        "label": "UCB1",
        "description": "Context-free optimistic baseline",
        "hyperparams": ["alpha"],
    },
    "epsilon_greedy": {
        "label": "ε-Greedy",
        "description": "Estimator-based random exploration with probability ε",
        "hyperparams": ["epsilon", "l2_lambda"],
    },
    "thompson": {
        "label": "Thompson Sampling",
        "description": "Context-free Bayesian Beta posteriors",
        "hyperparams": [],
    },
    "linucb": {
        "label": "LinUCB",
        "description": "Contextual linear upper confidence bound",
        "hyperparams": ["alpha", "l2_lambda", "gamma", "n_clusters"],
    },
    "lints": {
        "label": "LinTS",
        "description": "Contextual linear Thompson sampling",
        "hyperparams": ["v_sq", "l2_lambda", "gamma", "n_clusters"],
    },
    "linucb_hybrid": {
        "label": "Hybrid LinUCB",
        "description": "LinUCB with shared and arm-specific features",
        "hyperparams": ["alpha", "l2_lambda", "gamma", "n_shared_features", "n_clusters"],
    },
    "neural_linear": {
        "label": "Neural Linear",
        "description": "Neural representation with linear Thompson sampling head",
        "hyperparams": ["v_sq", "l2_lambda", "neural_embedding_dim", "neural_retrain_freq"],
    },
    "bootstrapped_ts": {
        "label": "Bootstrapped TS",
        "description": "Bootstrapped estimator ensemble Thompson sampling",
        "hyperparams": ["n_bootstraps", "l2_lambda", "n_clusters"],
    },
    "bootstrapped_ucb": {
        "label": "Bootstrapped UCB",
        "description": "Bootstrapped estimator ensemble upper confidence bound",
        "hyperparams": ["n_bootstraps", "l2_lambda", "n_clusters"],
    },
    "logistic_ucb": {
        "label": "Logistic UCB",
        "description": "Contextual logistic upper confidence bound",
        "hyperparams": ["alpha", "l2_lambda", "gamma", "n_clusters"],
    },
    "logistic_ts": {
        "label": "Logistic TS",
        "description": "Contextual logistic Thompson sampling",
        "hyperparams": ["v_sq", "l2_lambda", "gamma", "n_clusters"],
    },
    "gp_ucb": {
        "label": "GP-UCB",
        "description": "Gaussian-process upper confidence bound",
        "hyperparams": ["gp_beta", "gp_length_scale", "gp_noise_var", "gp_max_obs"],
    },
    "softmax": {
        "label": "Softmax",
        "description": "Temperature-controlled probabilistic action selection",
        "hyperparams": ["softmax_tau", "l2_lambda", "gamma", "n_clusters"],
    },
    "linucb_sw": {
        "label": "Sliding-Window LinUCB",
        "description": "LinUCB with a finite recent-observation window",
        "hyperparams": ["alpha", "l2_lambda", "linucb_sw_window", "n_clusters"],
    },
    "random_forest_ucb": {
        "label": "Random Forest UCB",
        "description": "Tree-ensemble contextual UCB",
        "hyperparams": ["alpha", "rf_n_estimators", "rf_max_depth", "rf_max_obs"],
    },
    "random_forest_ts": {
        "label": "Random Forest TS",
        "description": "Tree-ensemble contextual Thompson-style sampling",
        "hyperparams": ["rf_n_estimators", "rf_max_depth", "rf_max_obs"],
    },
}
