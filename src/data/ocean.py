"""Ocean data fetching: ZIP code geocoding and NOAA water level retrieval."""

from __future__ import annotations

import logging
from datetime import date
from typing import Any, TypedDict

import pandas as pd
import requests

from src.config import (
    GEOCODING_TIMEOUT,
    NOMINATIM_URL,
    NOMINATIM_USER_AGENT,
    NOAA_DATA_TIMEOUT,
    NOAA_DATA_URL,
    NOAA_STATIONS_TIMEOUT,
    NOAA_STATIONS_URL,
)
from src.exceptions import GeocodingError, NoaaApiError, OceanDataError

logger = logging.getLogger(__name__)


class GeocodingResult(TypedDict):
    """Resolved location for a ZIP code."""

    lat: float
    lon: float
    display_name: str


class Station(TypedDict):
    """A NOAA water level monitoring station."""

    id: str
    name: str
    lat: float
    lng: float


def geocode_zip_code(zip_code: str) -> GeocodingResult:
    """Resolve a US ZIP code to geographic coordinates.

    Args:
        zip_code: A five-digit US ZIP code.

    Returns:
        A GeocodingResult containing lat, lon, and a human-readable display name.

    Raises:
        GeocodingError: If the ZIP code cannot be resolved or the request fails.
    """
    try:
        response = requests.get(
            NOMINATIM_URL,
            params={"postalcode": zip_code, "country": "US", "format": "json"},
            headers={"User-Agent": NOMINATIM_USER_AGENT},
            timeout=GEOCODING_TIMEOUT,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.error("Geocoding request failed for ZIP %s: %s", zip_code, exc)
        raise GeocodingError(f"Geocoding request failed: {exc}") from exc

    # requests.Response.json() returns Any; explicit parsing below makes types safe.
    results: list[Any] = response.json()

    if not results:
        raise GeocodingError(f"No location found for ZIP code: {zip_code}")

    first = results[0]
    return GeocodingResult(
        lat=float(first["lat"]),
        lon=float(first["lon"]),
        display_name=str(first["display_name"]),
    )


def fetch_noaa_stations() -> list[Station]:
    """Fetch all active NOAA water level monitoring stations.

    Returns:
        A list of Station records with id, name, lat, and lng.

    Raises:
        OceanDataError: If the request fails or the response cannot be parsed.
    """
    try:
        response = requests.get(
            NOAA_STATIONS_URL,
            params={"type": "waterlevels"},
            timeout=NOAA_STATIONS_TIMEOUT,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.error("Failed to fetch NOAA stations: %s", exc)
        raise OceanDataError(f"Failed to fetch NOAA stations: {exc}") from exc

    # The JSON payload shape is known but requests returns Any.
    payload: dict[str, Any] = response.json()

    return [
        Station(
            id=str(raw["id"]),
            name=str(raw["name"]),
            lat=float(raw["lat"]),
            lng=float(raw["lng"]),
        )
        for raw in payload["stations"]
    ]


def fetch_water_levels(
    station_id: str,
    start_date: date,
    end_date: date,
    product: str,
) -> pd.DataFrame:
    """Fetch water level observations from the NOAA CO-OPS API.

    Args:
        station_id: The NOAA station identifier (e.g. "8443970").
        start_date: First day of the requested range (inclusive).
        end_date: Last day of the requested range (inclusive).
        product: NOAA data product name ("water_level", "hourly_height",
            or "daily_mean").

    Returns:
        A DataFrame with columns:
            - ``timestamp`` (datetime64): observation time in local standard time.
            - ``water_level_ft`` (float64): water level in feet above MLLW.

    Raises:
        NoaaApiError: If the NOAA API returns an application-level error.
        OceanDataError: If the HTTP request fails or data is missing.
    """
    try:
        response = requests.get(
            NOAA_DATA_URL,
            params={
                "begin_date": start_date.strftime("%Y%m%d"),
                "end_date": end_date.strftime("%Y%m%d"),
                "station": station_id,
                "product": product,
                "datum": "MLLW",
                "time_zone": "lst_ldt",
                "units": "english",
                "format": "json",
            },
            timeout=NOAA_DATA_TIMEOUT,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.error(
            "NOAA data request failed for station %s (%s–%s): %s",
            station_id,
            start_date,
            end_date,
            exc,
        )
        raise OceanDataError(f"NOAA data request failed: {exc}") from exc

    # The JSON shape is known from the NOAA API spec; requests returns Any.
    payload: dict[str, Any] = response.json()

    if "error" in payload:
        message = payload["error"].get("message", "Unknown NOAA error")
        logger.error("NOAA API error for station %s: %s", station_id, message)
        raise NoaaApiError(message)

    if "data" not in payload:
        raise OceanDataError(
            f"No data returned for station {station_id} "
            f"({start_date}–{end_date}, product={product})."
        )

    return _parse_water_level_payload(payload["data"])


def _parse_water_level_payload(raw_data: list[Any]) -> pd.DataFrame:
    """Convert raw NOAA data records into a clean DataFrame.

    Args:
        raw_data: List of dicts from the NOAA API response ``data`` key.

    Returns:
        A DataFrame with ``timestamp`` and ``water_level_ft`` columns,
        with unparseable values dropped.
    """
    dataframe = pd.DataFrame(raw_data)
    dataframe["timestamp"] = pd.to_datetime(dataframe["t"])
    dataframe["water_level_ft"] = pd.to_numeric(dataframe["v"], errors="coerce")
    return (
        dataframe[["timestamp", "water_level_ft"]]
        .dropna(subset=["water_level_ft"])
        .reset_index(drop=True)
    )
