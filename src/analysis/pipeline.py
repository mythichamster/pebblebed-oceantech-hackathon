"""Domain logic: nearest-station selection and NOAA product routing."""

from __future__ import annotations

import math

from src.config import (
    EARTH_RADIUS_MILES,
    HOURLY_HEIGHT_MAX_DAYS,
    WATER_LEVEL_MAX_DAYS,
)
from src.data.ocean import Station


def haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """Calculate the great-circle distance between two points on Earth.

    Uses the haversine formula, which is accurate for small and large distances
    but assumes a spherical Earth.

    Args:
        lat1: Latitude of the first point in decimal degrees.
        lon1: Longitude of the first point in decimal degrees.
        lat2: Latitude of the second point in decimal degrees.
        lon2: Longitude of the second point in decimal degrees.

    Returns:
        Distance between the two points in miles.
    """
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    a = math.sin(delta_lat / 2) ** 2 + (
        math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(delta_lon / 2) ** 2
    )
    return EARTH_RADIUS_MILES * 2 * math.asin(math.sqrt(a))


def find_nearest_station(
    lat: float,
    lon: float,
    stations: list[Station],
) -> tuple[Station, float]:
    """Find the NOAA station closest to the given coordinates.

    Args:
        lat: Target latitude in decimal degrees.
        lon: Target longitude in decimal degrees.
        stations: Candidate NOAA stations to search.

    Returns:
        A tuple of (nearest_station, distance_miles).
    """
    nearest = min(
        stations,
        key=lambda station: haversine_distance(
            lat, lon, station["lat"], station["lng"]
        ),
    )
    distance_miles = haversine_distance(lat, lon, nearest["lat"], nearest["lng"])
    return nearest, distance_miles


def select_noaa_product(days: int) -> str:
    """Choose the most appropriate NOAA data product for a given date range.

    Shorter ranges use finer-grained products; longer ranges fall back to
    coarser products because the API imposes per-product maximums.

    Args:
        days: Number of days in the requested date range.

    Returns:
        A NOAA CO-OPS product name string: "water_level", "hourly_height",
        or "daily_mean".
    """
    if days <= WATER_LEVEL_MAX_DAYS:
        return "water_level"
    if days <= HOURLY_HEIGHT_MAX_DAYS:
        return "hourly_height"
    return "daily_mean"
