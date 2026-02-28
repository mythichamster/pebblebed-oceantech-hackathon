"""OceanTech AI Tool — Streamlit entrypoint.

UI concerns only. All business logic lives in src/.
"""

from __future__ import annotations

from datetime import date, timedelta

import plotly.graph_objects as go
import streamlit as st

from src.analysis.pipeline import find_nearest_station, select_noaa_product
from src.claude_client import get_ocean_analysis
from src.data.ocean import fetch_noaa_stations, fetch_water_levels, geocode_zip_code
from src.exceptions import GeocodingError, NoaaApiError, OceanDataError

def _render_water_level_tab() -> None:
    """Render the water level visualizer tab."""
    st.header("Water Level Visualizer")

    col_zip, col_start, col_end = st.columns(3)
    with col_zip:
        zip_code = st.text_input("ZIP Code", placeholder="e.g. 10001")
    with col_start:
        start_date = st.date_input("Start Date", value=date.today() - timedelta(days=7))
    with col_end:
        end_date = st.date_input("End Date", value=date.today())

    if not st.button("Fetch Water Levels"):
        return

    if not _validate_inputs(zip_code, start_date, end_date):
        return

    location = _resolve_location(zip_code)
    if location is None:
        return

    station, distance_miles = _resolve_nearest_station(
        location["lat"], location["lon"]
    )
    if station is None:
        return

    days = (end_date - start_date).days
    product = select_noaa_product(days)

    water_level_df = _load_water_levels(station["id"], start_date, end_date, product)
    if water_level_df is None:
        return

    fig = go.Figure(
        go.Scatter(
            x=water_level_df["timestamp"],
            y=water_level_df["water_level_ft"],
            mode="lines",
            name="Water Level",
            line={"color": "#1f77b4", "width": 1.5},
            hovertemplate="%{x}<br>%{y:.2f} ft<extra></extra>",
        )
    )
    fig.update_layout(
        title=f"Water Level at {station['name']} ({station['id']})",
        xaxis_title="Date / Time",
        yaxis_title="Water Level (ft, MLLW)",
        hovermode="x unified",
        margin={"t": 50, "b": 40},
    )
    st.plotly_chart(fig, width='stretch')

    with st.expander("Raw data"):
        st.dataframe(
            water_level_df.rename(
                columns={"timestamp": "Time", "water_level_ft": "Water Level (ft)"}
            ),
            width='stretch',
        )


def _render_ai_tab() -> None:
    """Render the AI ocean analysis tab."""
    st.header("AI Ocean Analysis")
    user_input = st.text_area("Describe your ocean problem:")
    if st.button("Analyze"):
        with st.spinner("Thinking..."):
            try:
                answer = get_ocean_analysis(user_input)
            except Exception as exc:
                st.error(f"Analysis failed: {exc}")
                return
        st.write(answer)


def _validate_inputs(
    zip_code: str,
    start_date: date,
    end_date: date,
) -> bool:
    """Validate user inputs and display errors for any violations.

    Args:
        zip_code: The ZIP code entered by the user.
        start_date: The selected start date.
        end_date: The selected end date.

    Returns:
        True if all inputs are valid, False otherwise.
    """
    if not zip_code:
        st.error("Please enter a ZIP code.")
        return False
    if end_date <= start_date:
        st.error("End date must be after start date.")
        return False
    return True


def _resolve_location(
    zip_code: str,
) -> dict[str, float | str] | None:
    """Geocode a ZIP code and display progress/error in the UI.

    Args:
        zip_code: The ZIP code to resolve.

    Returns:
        A GeocodingResult dict, or None if geocoding failed.
    """
    with st.spinner("Looking up location..."):
        try:
            location = geocode_zip_code(zip_code)
        except GeocodingError as exc:
            st.error(str(exc))
            return None

    st.info(
        f"{location['display_name']} "
        f"({location['lat']:.4f}, {location['lon']:.4f})"
    )
    return location  # type: ignore[return-value]  # TypedDict is a dict subtype


def _resolve_nearest_station(
    lat: float,
    lon: float,
) -> tuple[dict[str, object], float] | tuple[None, None]:
    """Fetch all NOAA stations, find the nearest one, and report it in the UI.

    Args:
        lat: Target latitude in decimal degrees.
        lon: Target longitude in decimal degrees.

    Returns:
        A (station, distance_miles) tuple, or (None, None) on failure.
    """
    with st.spinner("Finding nearest water level station..."):
        try:
            stations = fetch_noaa_stations()
        except OceanDataError as exc:
            st.error(str(exc))
            return None, None

        station, distance_miles = find_nearest_station(lat, lon, stations)

    st.success(
        f"Nearest station: **{station['name']}** (ID: {station['id']}) "
        f"— {distance_miles:.1f} miles away"
    )
    return station, distance_miles  # type: ignore[return-value]


def _load_water_levels(
    station_id: str,
    start_date: date,
    end_date: date,
    product: str,
) -> object | None:
    """Fetch water level data and display progress/error in the UI.

    Args:
        station_id: NOAA station identifier.
        start_date: Start of the requested range.
        end_date: End of the requested range.
        product: NOAA data product name.

    Returns:
        A DataFrame with ``timestamp`` and ``water_level_ft`` columns,
        or None if the request failed.
    """
    label = product.replace("_", " ")
    with st.spinner(f"Fetching {label} data..."):
        try:
            return fetch_water_levels(station_id, start_date, end_date, product)
        except NoaaApiError as exc:
            st.error(f"NOAA API error: {exc}")
        except OceanDataError as exc:
            st.error(str(exc))
    return None


# ---------------------------------------------------------------------------
# Streamlit entry point — must come after all function definitions
# ---------------------------------------------------------------------------

st.title("OceanTech AI Tool")

tab_water, tab_ai = st.tabs(["Water Level Visualizer", "AI Ocean Analysis"])

with tab_water:
    _render_water_level_tab()

with tab_ai:
    _render_ai_tab()
