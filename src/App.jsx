import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Header from './components/Header'
import Map from './components/Map'
import Leaderboard from './components/Leaderboard'
import VesselDetailCard from './components/VesselDetailCard'
import './index.css'

const WS_URL = 'ws://localhost:3001'

function App() {
  const [vessels, setVessels] = useState([])
  const [selectedVessel, setSelectedVessel] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [demoMode, setDemoMode] = useState(false)
  const [connected, setConnected] = useState(false)
  const [tierFilter, setTierFilter] = useState('ALL') // ALL, HIGH, MODERATE, LOW
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
      setConnected(true)
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
      setConnected(false)
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

    const filtered = tierFilter === 'ALL'
      ? vessels
      : vessels.filter((v) => v.emissionTier === tierFilter)

    return {
      totalCO2: Math.round(total),
      tierCounts: counts,
      filteredVessels: filtered,
    }
  }, [vessels, tierFilter])

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
          />
        </div>

        {/* Right Panel - 40% */}
        <div className="w-[40%] h-full flex flex-col p-3 gap-3">
          {/* Leaderboard - Top half */}
          <div className="flex-1 min-h-0">
            <Leaderboard
              vessels={filteredVessels}
              selectedVessel={selectedVessel}
              onSelectVessel={handleSelectVessel}
            />
          </div>

          {/* Vessel Detail - Bottom half */}
          <div className="flex-1 min-h-0">
            <VesselDetailCard
              vessel={selectedVessel}
              onClose={handleCloseDetail}
            />
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {!connected && (
        <div className="fixed bottom-4 right-4 bg-warning/20 text-warning px-3 py-2 rounded-lg text-sm">
          ⏳ Connecting to server...
        </div>
      )}
    </div>
  )
}

export default App
