import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Header from './components/Header'
import Map from './components/Map'
import Leaderboard from './components/Leaderboard'
import VesselDetailCard from './components/VesselDetailCard'
import { getVesselTypeKey } from './utils/vesselSpecs'
import { distanceNM, NY_HARBOR_CENTER } from './utils/geo'
import './index.css'

const WS_URL = 'ws://localhost:3001'

function App() {
  const [vessels, setVessels] = useState([])
  const [selectedVessel, setSelectedVessel] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [demoMode, setDemoMode] = useState(false)
  const [tierFilter, setTierFilter] = useState('ALL') // ALL, HIGH, MODERATE, LOW
  const [typeFilter, setTypeFilter] = useState('ALL') // ALL, CONTAINER, TANKER, PASSENGER, FISHING, SERVICE, CARGO
  const [authorityFilter, setAuthorityFilter] = useState('ALL') // ALL, EPA (200NM), STATE (20NM), PORT (2NM)
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const selectedVesselRef = useRef(null)
  const isMountedRef = useRef(false)

  // Keep ref in sync so onmessage can read latest value without being a dependency
  useEffect(() => {
    selectedVesselRef.current = selectedVessel
  }, [selectedVessel])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    console.log('🔌 Connecting to WebSocket...')
    const ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      if (wsRef.current !== ws) return // stale connection, a newer one took over
      console.log('✅ WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'vesselUpdate') {
          setVessels(data.vessels || [])
          setLastUpdated(Date.now())
          setDemoMode(data.demoMode || false)

          // Use ref so this handler never needs to be recreated
          const current = selectedVesselRef.current
          if (current) {
            const updated = data.vessels.find((v) => v.mmsi === current.mmsi)
            if (updated) setSelectedVessel(updated)
          }
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e)
      }
    }

    ws.onclose = () => {
      if (wsRef.current !== ws) return // stale connection, ignore
      console.log('🔌 WebSocket disconnected, reconnecting in 3s...')
      if (isMountedRef.current) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      ws.close()
    }

    wsRef.current = ws
  }, []) // stable — no deps, uses refs for mutable values

  // Connect on mount only
  useEffect(() => {
    isMountedRef.current = true
    connect()

    return () => {
      isMountedRef.current = false
      clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  // Fetch initial data via REST as backup
  useEffect(() => {
    fetch('/api/vessels')
      .then((res) => res.json())
      .then((data) => {
        if (data.length > 0 && vessels.length === 0) {
          setVessels(data)
          setLastUpdated(Date.now())
        }
      })
      .catch(() => {
        // Server might not be ready yet
      })
  }, [])

  // Radius in NM for each regulatory authority zone
  const AUTHORITY_RADIUS_NM = { EPA: 200, STATE: 20, PORT: 2 }

  // Calculate total CO2 and tier counts
  const { totalCO2, tierCounts, filteredVessels } = useMemo(() => {
    const counts = { HIGH: 0, MODERATE: 0, LOW: 0 }
    let total = 0

    vessels.forEach((v) => {
      total += v.co2PerDayTonnes || 0
      if (v.emissionTier) {
        counts[v.emissionTier] = (counts[v.emissionTier] || 0) + 1
      }
    })

    let filtered = tierFilter === 'ALL'
      ? vessels
      : vessels.filter((v) => v.emissionTier === tierFilter)

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter((v) => getVesselTypeKey(v.shipTypeCode) === typeFilter)
    }

    if (authorityFilter !== 'ALL') {
      const radiusNM = AUTHORITY_RADIUS_NM[authorityFilter]
      filtered = filtered.filter((v) =>
        distanceNM(NY_HARBOR_CENTER.lat, NY_HARBOR_CENTER.lon, v.latitude, v.longitude) <= radiusNM
      )
    }

    return {
      totalCO2: Math.round(total),
      tierCounts: counts,
      filteredVessels: filtered,
    }
  }, [vessels, tierFilter, typeFilter, authorityFilter])

  const handleSelectVessel = useCallback((vessel) => {
    setSelectedVessel(vessel)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedVessel(null)
  }, [])

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-primary overflow-hidden">
      {/* Header */}
      <Header
        vesselCount={vessels.length}
        totalCO2={totalCO2}
        tierCounts={tierCounts}
        tierFilter={tierFilter}
        onTierFilterChange={setTierFilter}
        lastUpdated={lastUpdated}
        demoMode={demoMode}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map - Left 60% */}
        <div className="w-[60%] h-full">
          <Map
            vessels={filteredVessels}
            selectedVessel={selectedVessel}
            onSelectVessel={handleSelectVessel}
            authorityFilter={authorityFilter}
            onAuthorityFilterChange={setAuthorityFilter}
          />
        </div>

        {/* Right Panel - 40%: full-height Leaderboard or full-height DetailCard */}
        <div className="w-[40%] h-full flex flex-col p-3">
          {selectedVessel ? (
            <VesselDetailCard
              vessel={selectedVessel}
              onClose={handleCloseDetail}
            />
          ) : (
            <Leaderboard
              vessels={filteredVessels}
              selectedVessel={selectedVessel}
              onSelectVessel={handleSelectVessel}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
            />
          )}
        </div>
      </div>

    </div>
  )
}

export default App
