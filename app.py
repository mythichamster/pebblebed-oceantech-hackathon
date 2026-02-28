import math
from datetime import date, timedelta

import anthropic
import pandas as pd
import plotly.graph_objects as go
import requests
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic()

st.title("OceanTech AI Tool")

tab1, tab2 = st.tabs(["Water Level Visualizer", "AI Ocean Analysis"])

with tab1:
    st.header("Water Level Visualizer")

    col1, col2, col3 = st.columns(3)
    with col1:
        zip_code = st.text_input("ZIP Code", placeholder="e.g. 10001")
    with col2:
        start_date = st.date_input("Start Date", value=date.today() - timedelta(days=7))
    with col3:
        end_date = st.date_input("End Date", value=date.today())

    if st.button("Fetch Water Levels"):
        if not zip_code:
            st.error("Please enter a ZIP code.")
            st.stop()
        if end_date <= start_date:
            st.error("End date must be after start date.")
            st.stop()

        # Step 1: Geocode zip code via Nominatim
        with st.spinner("Looking up location..."):
            try:
                geo_resp = requests.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"postalcode": zip_code, "country": "US", "format": "json"},
                    headers={"User-Agent": "OceanTechHackathon/1.0"},
                    timeout=10,
                )
                geo_data = geo_resp.json()
            except Exception as e:
                st.error(f"Geocoding request failed: {e}")
                st.stop()

            if not geo_data:
                st.error(f"Could not find location for ZIP code {zip_code}.")
                st.stop()

            lat = float(geo_data[0]["lat"])
            lon = float(geo_data[0]["lon"])
            st.info(f"Location: {geo_data[0]['display_name']} ({lat:.4f}, {lon:.4f})")

        # Step 2: Find nearest NOAA water level station
        with st.spinner("Finding nearest water level station..."):
            try:
                stations_resp = requests.get(
                    "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json",
                    params={"type": "waterlevels"},
                    timeout=15,
                )
                stations = stations_resp.json()["stations"]
            except Exception as e:
                st.error(f"Failed to fetch NOAA stations: {e}")
                st.stop()

            def haversine(lat1, lon1, lat2, lon2):
                R = 3958.8  # miles
                dlat = math.radians(lat2 - lat1)
                dlon = math.radians(lon2 - lon1)
                a = (
                    math.sin(dlat / 2) ** 2
                    + math.cos(math.radians(lat1))
                    * math.cos(math.radians(lat2))
                    * math.sin(dlon / 2) ** 2
                )
                return R * 2 * math.asin(math.sqrt(a))

            nearest = min(
                stations,
                key=lambda s: haversine(lat, lon, float(s["lat"]), float(s["lng"])),
            )
            dist = haversine(lat, lon, float(nearest["lat"]), float(nearest["lng"]))
            st.success(
                f"Nearest station: **{nearest['name']}** (ID: {nearest['id']}) — {dist:.1f} miles away"
            )

        # Step 3: Choose product based on date range
        days = (end_date - start_date).days
        if days <= 31:
            product = "water_level"
        elif days <= 365:
            product = "hourly_height"
        else:
            product = "daily_mean"

        with st.spinner(f"Fetching water level data ({product.replace('_', ' ')})..."):
            try:
                wl_resp = requests.get(
                    "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter",
                    params={
                        "begin_date": start_date.strftime("%Y%m%d"),
                        "end_date": end_date.strftime("%Y%m%d"),
                        "station": nearest["id"],
                        "product": product,
                        "datum": "MLLW",
                        "time_zone": "lst_ldt",
                        "units": "english",
                        "format": "json",
                    },
                    timeout=30,
                )
                wl_json = wl_resp.json()
            except Exception as e:
                st.error(f"Failed to fetch water level data: {e}")
                st.stop()

            if "error" in wl_json:
                st.error(f"NOAA API error: {wl_json['error']['message']}")
                st.stop()

            if "data" not in wl_json:
                st.error("No water level data returned for this station and date range.")
                st.stop()

            df = pd.DataFrame(wl_json["data"])
            df["t"] = pd.to_datetime(df["t"])
            df["v"] = pd.to_numeric(df["v"], errors="coerce")
            df = df.dropna(subset=["v"])

        # Step 4: Plot
        fig = go.Figure()
        fig.add_trace(
            go.Scatter(
                x=df["t"],
                y=df["v"],
                mode="lines",
                name="Water Level",
                line=dict(color="#1f77b4", width=1.5),
                hovertemplate="%{x}<br>%{y:.2f} ft<extra></extra>",
            )
        )
        fig.update_layout(
            title=f"Water Level at {nearest['name']} ({nearest['id']})",
            xaxis_title="Date / Time",
            yaxis_title="Water Level (ft, MLLW)",
            hovermode="x unified",
            margin=dict(t=50, b=40),
        )
        st.plotly_chart(fig, use_container_width=True)

        with st.expander("Raw data"):
            st.dataframe(
                df[["t", "v"]].rename(columns={"t": "Time", "v": "Water Level (ft)"}),
                use_container_width=True,
            )

with tab2:
    st.header("AI Ocean Analysis")
    user_input = st.text_area("Describe your ocean problem:")
    if st.button("Analyze"):
        with st.spinner("Thinking..."):
            message = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                messages=[{"role": "user", "content": user_input}],
            )
            st.write(message.content[0].text)
