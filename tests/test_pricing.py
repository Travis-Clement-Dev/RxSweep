from rxsweep.pricing import PRICES, estimate_cost


def test_known_model_cost():
    cost = estimate_cost("claude-haiku-4-5", 1_000_000, 1_000_000)
    assert cost == PRICES["claude-haiku-4-5"][0] + PRICES["claude-haiku-4-5"][1]


def test_small_run_cost_scale():
    cost = estimate_cost("claude-haiku-4-5", 4_000, 2_500)
    assert cost is not None and 0.01 < cost < 0.03


def test_unknown_model_returns_none_never_guesses():
    assert estimate_cost("claude-opus-4-8", 1000, 1000) is None
    assert estimate_cost("", 0, 0) is None
