"""Model pricing for cost estimates shown to BYO-key users.

A governance tool must not guess: unknown models return None and the UI
shows tokens only. Update the table deliberately and bump PRICES_AS_OF.
"""

PRICES_AS_OF = "2026-07-09"

# model id -> (USD per 1M input tokens, USD per 1M output tokens)
PRICES: dict[str, tuple[float, float]] = {
    "claude-haiku-4-5": (1.00, 5.00),
}


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float | None:
    """Estimated USD cost, or None when the model is not in the table."""
    rates = PRICES.get(model)
    if rates is None:
        return None
    return input_tokens / 1e6 * rates[0] + output_tokens / 1e6 * rates[1]
