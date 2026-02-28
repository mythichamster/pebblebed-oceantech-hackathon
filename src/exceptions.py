"""Domain-specific exception classes for the OceanTech application."""

from __future__ import annotations


class GeocodingError(Exception):
    """Raised when a ZIP code cannot be resolved to coordinates."""


class OceanDataError(Exception):
    """Raised when ocean data cannot be fetched or parsed."""


class NoaaApiError(OceanDataError):
    """Raised when the NOAA Tides & Currents API returns an error response."""
