"""Anthropic API wrapper for ocean-domain AI analysis."""

from __future__ import annotations

import logging

import anthropic

from src.config import ANTHROPIC_API_KEY, DEFAULT_MODEL, MAX_TOKENS

logger = logging.getLogger(__name__)

_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def get_ocean_analysis(user_input: str) -> str:
    """Send a user prompt to Claude and return the text response.

    Args:
        user_input: A plain-text description of an ocean problem or question.

    Returns:
        The model's text response as a string.

    Raises:
        anthropic.APIError: If the Anthropic API returns an error.
    """
    logger.info("Sending ocean analysis request to %s", DEFAULT_MODEL)
    message = _client.messages.create(
        model=DEFAULT_MODEL,
        max_tokens=MAX_TOKENS,
        messages=[{"role": "user", "content": user_input}],
    )
    return str(message.content[0].text)
