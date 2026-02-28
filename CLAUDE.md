# CLAUDE.md — OceanTech Hackathon Project

This file guides Claude's behavior when working on this codebase.

---

## Code Style & Formatting

- **Formatter:** Use [Black](https://black.readthedocs.io/) with default settings (88 char line length). All code must be Black-compliant.
- **Linter:** Use [Ruff](https://docs.astral.sh/ruff/) for linting. Fix all Ruff warnings before considering code complete.
- **Import order:** Ruff handles this (isort-compatible). Standard library → third-party → local imports, each group separated by a blank line.
- **Docstrings:** Use [Google-style docstrings](https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings) for all public functions, classes, and modules.
- **Naming:** `snake_case` for variables and functions, `PascalCase` for classes, `SCREAMING_SNAKE_CASE` for module-level constants.

## Type Annotations

- **All** function signatures must have type annotations for arguments and return values — no exceptions.
- Use `from __future__ import annotations` at the top of every file to enable modern annotation syntax on older Python versions.
- Use `typing` and `collections.abc` for complex types (`Sequence`, `Mapping`, `Callable`, etc.).
- Prefer `X | None` over `Optional[X]` (Python 3.10+ union syntax).
- Run [mypy](https://mypy.readthedocs.io/) in strict mode: `mypy --strict .`. All type errors must be resolved.
- Use `TypedDict` for structured dictionaries rather than plain `dict[str, Any]` where the shape is known.

Example:
```python
from __future__ import annotations

def analyze_ocean_data(
    coordinates: list[tuple[float, float]],
    depth_meters: float | None = None,
) -> dict[str, float]:
    """Analyze ocean data at given coordinates.

    Args:
        coordinates: List of (latitude, longitude) pairs.
        depth_meters: Optional depth filter in meters.

    Returns:
        Dictionary of analysis results keyed by metric name.
    """
    ...
```

## Readability

- **Short functions:** Each function should do one thing. If it's longer than ~40 lines, consider splitting it.
- **No magic numbers:** Extract numeric constants with descriptive names.
- **Descriptive names:** Prefer `ocean_temperature_celsius` over `temp` or `t`.
- **Avoid clever one-liners** that sacrifice clarity. Readable > concise.
- **Early returns:** Prefer guard clauses and early returns over deeply nested if/else blocks.
- **Comments:** Explain *why*, not *what*. Code should be self-explanatory; comments fill in intent and context.

## Project Structure

```
oceantech-hack/
├── app.py                  # Streamlit entrypoint
├── CLAUDE.md
├── .env                    # Local secrets — never commit
├── .gitignore
├── requirements.txt
├── src/
│   ├── __init__.py
│   ├── claude_client.py    # Anthropic API wrapper
│   ├── data/               # Data loading and processing
│   │   ├── __init__.py
│   │   └── ocean.py
│   └── analysis/           # Domain logic
│       ├── __init__.py
│       └── pipeline.py
└── tests/
    ├── __init__.py
    ├── unit/
    │   └── test_analysis.py
    └── e2e/
        └── test_app.py     # Playwright tests
```

Keep business logic in `src/` — not in `app.py`. The Streamlit file should only handle UI concerns.

## Testing

### Unit Tests (pytest)
- Use [pytest](https://docs.pytest.org/) for all unit tests.
- Test files mirror the `src/` structure under `tests/unit/`.
- Every public function should have at least one test covering the happy path and one covering edge cases or error conditions.
- Use `pytest.mark.parametrize` for data-driven tests rather than copy-pasting similar test cases.
- Mock external API calls (Anthropic, NOAA, etc.) using `pytest-mock` — tests should never make real network requests.

```python
# Example
import pytest
from unittest.mock import MagicMock
from src.analysis.pipeline import analyze_ocean_data

@pytest.mark.parametrize("depth,expected_key", [
    (None, "surface_temp"),
    (200.0, "deep_temp"),
])
def test_analyze_ocean_data(depth: float | None, expected_key: str) -> None:
    result = analyze_ocean_data([(37.7, -122.4)], depth_meters=depth)
    assert expected_key in result
```

### End-to-End Tests (Playwright MCP)
- Use **Playwright MCP** for all front-end/Streamlit UI testing.
- E2E tests live in `tests/e2e/`.
- Tests should cover: page load, key user interactions, and that AI responses render without errors.
- Use explicit waits and stable selectors — avoid brittle time-based sleeps.
- Each test should be independent and not rely on state from a previous test.

To run E2E tests, ensure the Streamlit app is running locally first:
```bash
streamlit run app.py &
# then run your Playwright MCP tests against http://localhost:8501
```

### Running All Tests
```bash
pytest tests/unit/          # unit tests only
pytest tests/e2e/           # e2e tests only
pytest                      # everything
```

## Error Handling

- Never silently swallow exceptions. Either handle them meaningfully or let them propagate.
- Use custom exception classes for domain-specific errors (e.g. `OceanDataError`, `APITimeoutError`).
- Always validate external data (API responses, user inputs, dataset rows) before processing.
- Log errors with context using the standard `logging` module — not `print()`.

```python
import logging

logger = logging.getLogger(__name__)

try:
    result = fetch_ocean_data(coords)
except OceanDataError as e:
    logger.error("Failed to fetch ocean data for %s: %s", coords, e)
    raise
```

## Environment & Configuration

- All secrets and environment-specific config live in `.env` and are loaded via `python-dotenv`. Never hardcode API keys or URLs.
- Access config through a central `config.py` module rather than scattering `os.getenv()` calls throughout the codebase.

```python
# src/config.py
from __future__ import annotations
import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY: str = os.environ["ANTHROPIC_API_KEY"]  # raises if missing
DEFAULT_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
```

## Dependencies

- Pin all dependencies in `requirements.txt` via `pip freeze > requirements.txt`.
- Keep the Anthropic SDK up to date — check [pypi.org/project/anthropic](https://pypi.org/project/anthropic/) for the latest version.

## What to Avoid

- No `Any` type unless absolutely unavoidable — and if used, add a comment explaining why.
- No `print()` for logging — use the `logging` module.
- No bare `except:` clauses — always catch specific exception types.
- No mutable default arguments (e.g. `def f(x: list = [])` — use `None` and initialize inside).
- No global state outside of `config.py`.
