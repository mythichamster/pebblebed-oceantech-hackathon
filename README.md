# ShipWatch — Real-Time Vessel Emissions Intelligence

> **OceanTech Hackathon 2026 · Propeller VC Track**
>
> *"We know ships are emitting — but who, how much, and where?"*

ShipWatch is a real-time port emissions dashboard for regulators. It ingests live AIS vessel position data, estimates CO₂ output per vessel using the IMO Fourth GHG Study methodology, and surfaces the results as an interactive map with transparent, auditable assumptions — so a port authority can see top emitters, understand the estimation logic, and prioritize enforcement or incentive action.

**[Live Demo →](https://pebblebed-oceantech-hackathon.vercel.app/)** | **Track:** Ocean Data & Climate Transparency

---

## The Problem

Shipping accounts for ~3% of global CO₂ emissions. Vessel-level reporting is self-reported, inconsistent, and difficult to audit. AIS and VMS data exist — but are used almost exclusively for route optimization and cargo tracking, not independent emissions transparency.

Port authorities and regulators currently lack:
- Vessel-level CO₂ estimates derived from observable data
- Transparent, auditable methodology (not black-box models)
- Prioritization tools for enforcement or incentive programs
- A public-facing accountability layer

---

## What We Built

A full-stack web application that:

1. **Streams live AIS data** from [aisstream.io](https://aisstream.io) for the Port of New York / New Jersey bounding box, falling back to a realistic 50-vessel demo simulation when no API key is present
2. **Estimates CO₂ per vessel** using a physics-based model derived from the IMO GHG Study IV (see Methodology below)
3. **Classifies vessels** into HIGH / MODERATE / LOW emission tiers and displays them on a live-updating Mapbox map with deck.gl
4. **Filters by regulatory authority zone** — EPA (200 NM), State (20 NM), Port (2 NM) — each with different enforcement priorities and modeling assumptions
5. **Shows every assumption** in the vessel detail card so regulators can see exactly how the estimate was derived and where verified data would improve it

---

## Emissions Methodology

All assumptions are shown to the user in the UI. None of this is a black box.

### Core Formula

```
CO₂ (t/day) = P_MCR × L × SFC × H × EF / 10⁹
```

| Variable | Description | Source |
|---|---|---|
| `P_MCR` | Main engine Maximum Continuous Rating (kW) | IMO GHG Study IV fleet averages by AIS type code |
| `L` | Engine load factor (0–1) | Admiralty Cubic Law: `(v / v_max)³` |
| `SFC` | Specific Fuel Consumption: **195 g/kWh** for HFO | ISO 15550 |
| `H` | Operating hours/day (24 for cargo/tanker, **8 for passenger**) | Vessel type assumption |
| `EF` | Emission factor: **3.114 kg CO₂/kg HFO** | IMO MEPC.1/Circ.684 |

### Engine Load via Admiralty Cubic Law

AIS broadcasts speed over ground (SOG). Engine load is derived using the Admiralty Cubic Law — a fundamental result of naval architecture where hull drag scales with speed², and propeller thrust scales with RPM², yielding cubic power demand:

```
L = (v_observed / v_max)³     [minimum floor: 0.05 = hotel load]
```

### Vessel Type Engine Specs

| Type | AIS Codes | Engine (kW) | Design Speed | Op. Hours |
|---|---|---|---|---|
| General Cargo | 70 | 8,000 | 14 kn | 24 hr |
| Container | 71–79 | 25,000 | 22 kn | 24 hr |
| Tanker | 80–89 | 15,000 | 15 kn | 24 hr |
| Passenger / Ferry | 60–69 | 30,000 | 22 kn | 8 hr |
| Service / Tug | 50–59 | 3,000 | 13 kn | 24 hr |
| Fishing | 30 | 1,500 | 12 kn | 24 hr |

### Standards Alignment

- **IMO Fourth GHG Study (2020)** — fleet-average engine specs by vessel type
- **IMO MEPC.1/Circ.684** — HFO combustion emission factor (3.114 kg CO₂/kg)
- **ISO 15550** — specific fuel consumption reference for marine diesel engines
- **ISO 14083:2023** — transport chain GHG quantification framework
- **GLEC Framework v3** — logistics emissions accounting alignment

---

## Regulatory Zone Model

Three overlapping zones reflect real regulatory jurisdictions, each with different modeling priorities:

| Zone | Radius | Authority | Key Emissions Driver |
|---|---|---|---|
| Port | 2 NM | Port Authority | Hotel load, berth-time emissions, shore power compliance |
| State | 20 NM | State EPA | Approach/departure speed, air quality standards |
| EPA | 200 NM | US EPA | Transit speed, fuel type selection |

Selecting a zone filters vessels to those within that radius and flies the map to fit the zone boundary.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4 |
| Map | Mapbox GL JS, deck.gl (ScatterplotLayer) |
| Backend | Node.js, Express, `ws` WebSocket server |
| AIS Data | [aisstream.io](https://aisstream.io) WebSocket API |
| Deployment | Single-process: Express serves built Vite dist + WebSocket on same port |

### Architecture

```
Browser
  └── WebSocket → Node.js server (port 3001)
        ├── AIS Stream WebSocket (aisstream.io) → vessel position updates
        ├── Emissions calculation (per vessel, on each position update)
        ├── Broadcast to all clients every 3s (fast) → 30s (steady state)
        └── express.static → serves built React frontend
```

---

## Running Locally

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Add API keys (optional — demo mode works without them)
cp .env.example .env
# Edit .env: add VITE_MAPBOX_TOKEN and AISSTREAM_API_KEY

# Start both frontend and backend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_MAPBOX_TOKEN` | Optional | Mapbox GL token for dark map tiles (falls back to OpenStreetMap) |
| `AISSTREAM_API_KEY` | Optional | Real-time AIS data (falls back to 50-vessel demo simulation) |

---

## What Works Today

- Live vessel map with color-coded emission tiers (HIGH / MODERATE / LOW)
- Real-time AIS data ingestion via WebSocket, with automatic demo mode fallback
- Per-vessel CO₂ estimation with fully transparent assumption breakdown in the UI
- Leaderboard of top 15 emitters, filterable by vessel type and emission tier
- Regulatory zone overlays (EPA / State / Port) with map zoom-to-fit and vessel filtering
- Vessel detail card showing every step of the calculation (engine → load → fuel → CO₂)
- Haversine-based distance filtering for zone membership

## What Is Incomplete

- Emission estimates use fleet-average engine specs, not actual vessel certificates (Lloyd's Register, class data)
- Fuel type is assumed HFO for all vessels — LNG and MDO vessels are not distinguished from AIS data alone
- No voyage-averaged emissions — current speed is instantaneous, not a route average
- No persistent storage; vessel history is in-memory only

## What We Would Build Next

- **Verified data ingestion**: Cross-reference IMO number against Lloyd's Register or IHS Markit for actual engine kW and fuel type
- **MRV / CII integration**: Ingest EU MRV and IMO DCS fuel consumption declarations to validate estimates against self-reported data
- **Vessel trail history**: Store last N positions per vessel to compute voyage-averaged emissions, not just instantaneous
- **Remediation projections**: Per-vessel intervention analysis (slow steaming, hull cleaning, wind propulsion) to show regulators the CO₂ impact of specific incentives
- **Export and alerting**: CSV export of top emitters, webhook alerts when a vessel exceeds a configurable threshold within a jurisdiction

---

## Team

**Pebblebed** · OceanTech Hackathon 2026
