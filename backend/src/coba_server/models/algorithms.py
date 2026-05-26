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


# Shared algorithm metadata — used by both InMemoryCobaAdapter and CobaLibraryAdapter
ALGORITHM_META: dict[str, _AlgoMetaDict] = {
    "ucb1": {
        "label": "UCB1",
        "description": "Optimistic \u2014 uncertainty bonus",
        "hyperparams": ["alpha"],
    },
    "epsilon_greedy": {
        "label": "\u03b5-Greedy",
        "description": "Random exploration with prob \u03b5",
        "hyperparams": ["epsilon"],
    },
    "thompson": {
        "label": "Thompson Sampling",
        "description": "Bayesian Beta posteriors",
        "hyperparams": [],
    },
    "linucb": {
        "label": "LinUCB",
        "description": "Contextual linear UCB",
        "hyperparams": ["alpha"],
    },
}
