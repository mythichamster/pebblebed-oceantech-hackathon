"""Central configuration module.

All secrets and environment-specific values are loaded here from .env.
Import constants from this module rather than calling os.getenv() elsewhere.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

# --- Anthropic ---
ANTHROPIC_API_KEY: str = os.environ["ANTHROPIC_API_KEY"]  # raises KeyError if missing
DEFAULT_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
MAX_TOKENS: int = 1024

# --- Nominatim (OpenStreetMap geocoding) ---
NOMINATIM_URL: str = "https://nominatim.openstreetmap.org/search"
# Nominatim policy requires a descriptive User-Agent identifying the application.
NOMINATIM_USER_AGENT: str = "OceanTechHackathon/1.0"

# --- NOAA Tides & Currents ---
NOAA_STATIONS_URL: str = (
    "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json"
)
NOAA_DATA_URL: str = (
    "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter"
)

# NOAA product selection thresholds (inclusive upper bound in days).
# Beyond HOURLY_HEIGHT_MAX_DAYS the API only supports daily means.
WATER_LEVEL_MAX_DAYS: int = 31
HOURLY_HEIGHT_MAX_DAYS: int = 365

# --- HTTP timeouts (seconds) ---
GEOCODING_TIMEOUT: int = 10
NOAA_STATIONS_TIMEOUT: int = 15
NOAA_DATA_TIMEOUT: int = 30

# --- Geography ---
EARTH_RADIUS_MILES: float = 3958.8
