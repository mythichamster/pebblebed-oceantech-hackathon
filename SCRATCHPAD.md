# ShipWatch — Scratchpad

## Session: Feb 28, 2026 (Hackathon - 4 hours)

### Current Status: MVP RUNNING ✅
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- 50 demo vessels in LA/Long Beach area
- Demo mode (no API keys needed)

### To Run
```bash
cd /Users/gargoodevi/Documents/shipwatch/pebblebed-oceantech-hackathon
npm run dev
```

---

## Decisions Made
- **Tech Stack:** React/Vite + Node.js (not Python/Streamlit)
- **Port:** Los Angeles / Long Beach only (single port for MVP)
- **Mode:** Demo mode first (no API keys yet)
- **Bounding Box:** LA: [33.5, -118.5] to [34.0, -117.8]

---

## Features Completed
1. ✅ Vite React + Tailwind setup
2. ✅ Dark theme with design system colors
3. ✅ Emissions calculation (IMO GHG Study IV methodology)
4. ✅ Node backend with WebSocket (demo mode 50 vessels)
5. ✅ Header with logo, methodology badge, live indicator
6. ✅ Map with deck.gl vessel layer (color-coded by tier)
7. ✅ Leaderboard (top 15 emitters, sorted by CO2)
8. ✅ VesselDetailCard with transparent calculation breakdown
9. ✅ **NEW: Port-level CO2 summary in header**
10. ✅ **NEW: Emission tier filter pills (All/High/Moderate/Low)**
11. ✅ **NEW: "Why should I trust this?" collapsible methodology section**
12. ✅ **NEW: IMO GHG Study IV · ISO 14083 badge**

---

## Files Structure
```
/src
  /components
    Header.jsx      ← methodology badge, port CO2, tier filters
    Map.jsx         ← deck.gl ScatterplotLayer
    Leaderboard.jsx ← top 15 emitters
    VesselDetailCard.jsx ← calculation breakdown + methodology
  /utils
    vesselSpecs.js  ← vessel type → engine specs
    emissions.js    ← IMO GHG calculation
  App.jsx           ← main app with WebSocket + state
  index.css         ← Tailwind + design system
/server
  index.js          ← Express + WebSocket + demo mode
```

---

## API Keys (OPTIONAL - demo works without them)

| API | Purpose | Get it at |
|-----|---------|-----------|
| `VITE_MAPBOX_TOKEN` | Pretty dark map tiles | https://mapbox.com (free tier) |
| `AISSTREAM_API_KEY` | Real-time AIS vessel data | https://aisstream.io (free tier) |

**To add keys:** Create `.env` file in project root:
```
VITE_MAPBOX_TOKEN=pk.xxxxx
AISSTREAM_API_KEY=xxxxx
```
Then restart `npm run dev`.

---

## Key Design Choices

### Emissions Formula (IMO GHG Study IV)
```
CO2 = Engine_kW × Load_Factor × Time × SFC × EmissionFactor

- Load Factor: cubic law (Admiralty formula) from speed
- SFC: 195 g/kWh for HFO
- Emission Factor: 3.114 kg CO2 / kg HFO
```

### Emission Tiers
- **HIGH:** >300 t/day (red #ff4d4d)
- **MODERATE:** >100 t/day (orange #ff9500)
- **LOW:** ≤100 t/day (green #00c853)

### UI Layout
- Header: full width (methodology badge, port CO2, tier filters, live indicator)
- Map: left 60%
- Right panel: 40% (Leaderboard top, VesselDetailCard bottom)

---

## Judging Points Added
1. ✅ **Methodology badge:** "IMO GHG Study IV · ISO 14083" in header
2. ✅ **"Why should I trust this?":** Collapsible section in VesselDetailCard
3. ✅ **Port-level summary:** "LA/Long Beach: ~X,XXX t CO₂/day (50 vessels)"
4. ✅ **Tier filter pills:** Filter by emission tier with counts

---

## Open Questions
- User still researching data sources — might use different API than aisstream.io
- Any stretch goals to add? (CSV export, flag state analysis, vessel trails)

---

## Next Steps (if time)
- [ ] Add Mapbox token for better map tiles
- [ ] Add AIS Stream API key for real data
- [ ] CSV export of top emitters
- [ ] Vessel trails (last 10 positions)
