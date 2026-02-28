import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ScatterplotLayer } from '@deck.gl/layers'
import { getVesselTypeName, mmsiToFlag } from '../utils/vesselSpecs'
import { NY_HARBOR_CENTER, circlePolygon } from '../utils/geo'

/**
 * Compute a [SW, NE] bounding box for a circle around NY Harbor.
 * Uses the same flat-earth approximation as circlePolygon() in geo.js.
 */
function zoneBounds(radiusNM) {
  const { lat, lon } = NY_HARBOR_CENTER
  const radiusKm = radiusNM * 1.852
  const deltaLat = radiusKm / 110.574
  const deltaLon = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))
  return [
    [lon - deltaLon, lat - deltaLat], // SW corner
    [lon + deltaLon, lat + deltaLat], // NE corner
  ]
}

// Port of New York / New Jersey center
const INITIAL_VIEW = {
  longitude: -74.02,
  latitude: 40.65,
  zoom: 10,
  pitch: 0,
  bearing: 0,
}

const ZONE_LAYERS = [
  { key: 'EPA',   label: 'EPA Zone',   nm: '200 NM', radiusNM: 200, color: '#ff9500', fillOpacity: 0.04, lineOpacity: 0.6 },
  { key: 'STATE', label: 'State Zone', nm: '20 NM',  radiusNM: 20,  color: '#6366f1', fillOpacity: 0.06, lineOpacity: 0.7 },
  { key: 'PORT',  label: 'Port Zone',  nm: '2 NM',   radiusNM: 2,   color: '#00d4b4', fillOpacity: 0.10, lineOpacity: 0.9 },
]

export default function Map({ vessels, selectedVessel, onSelectVessel, authorityFilter, onAuthorityFilterChange }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const deckOverlay = useRef(null)
  const zonesAdded = useRef(false)
  const [viewState, setViewState] = useState(INITIAL_VIEW)
  const [tooltip, setTooltip] = useState(null)

  // Initialize map
  useEffect(() => {
    if (map.current) return

    const token = import.meta.env.VITE_MAPBOX_TOKEN

    if (!token) {
      console.warn('No Mapbox token found, using fallback style')
    }

    mapboxgl.accessToken = token || 'pk.placeholder'

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: token
        ? 'mapbox://styles/mapbox/dark-v11'
        : {
            version: 8,
            sources: {
              'simple-tiles': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
              },
            },
            layers: [
              {
                id: 'simple-tiles',
                type: 'raster',
                source: 'simple-tiles',
                minzoom: 0,
                maxzoom: 22,
              },
            ],
          },
      center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
      zoom: INITIAL_VIEW.zoom,
      attributionControl: false,
    })

    // Add deck.gl overlay
    deckOverlay.current = new MapboxOverlay({ layers: [] })
    map.current.addControl(deckOverlay.current)

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-left')

    // Sync view state
    map.current.on('move', () => {
      const center = map.current.getCenter()
      setViewState({
        longitude: center.lng,
        latitude: center.lat,
        zoom: map.current.getZoom(),
        pitch: map.current.getPitch(),
        bearing: map.current.getBearing(),
      })
    })

    // Add zone circle layers once map style loads
    map.current.on('load', () => {
      ZONE_LAYERS.forEach(({ key, radiusNM, color, fillOpacity, lineOpacity }) => {
        const geojson = circlePolygon(NY_HARBOR_CENTER.lon, NY_HARBOR_CENTER.lat, radiusNM)

        map.current.addSource(`zone-${key}`, {
          type: 'geojson',
          data: geojson,
        })

        map.current.addLayer({
          id: `zone-${key}-fill`,
          type: 'fill',
          source: `zone-${key}`,
          paint: {
            'fill-color': color,
            'fill-opacity': fillOpacity,
          },
        })

        map.current.addLayer({
          id: `zone-${key}-line`,
          type: 'line',
          source: `zone-${key}`,
          paint: {
            'line-color': color,
            'line-opacity': lineOpacity,
            'line-width': 1.5,
            'line-dasharray': [4, 3],
          },
        })
      })

      zonesAdded.current = true
    })

    return () => {
      map.current?.remove()
      map.current = null
      deckOverlay.current = null
      zonesAdded.current = false
    }
  }, [])

  // Highlight active zone: raise opacity for active, dim the rest
  useEffect(() => {
    if (!map.current || !zonesAdded.current) return

    ZONE_LAYERS.forEach(({ key, fillOpacity, lineOpacity }) => {
      const isActive = authorityFilter === key
      const fillMult = authorityFilter === 'ALL' ? 1 : isActive ? 2.5 : 0.3
      const lineMult = authorityFilter === 'ALL' ? 1 : isActive ? 1.5 : 0.3

      map.current.setPaintProperty(`zone-${key}-fill`, 'fill-opacity', fillOpacity * fillMult)
      map.current.setPaintProperty(`zone-${key}-line`, 'line-opacity', lineOpacity * lineMult)
    })
  }, [authorityFilter])

  // Fly to zone bounds when regulatory authority filter changes
  useEffect(() => {
    if (!map.current) return

    if (authorityFilter === 'ALL') {
      map.current.flyTo({
        center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
        zoom: INITIAL_VIEW.zoom,
        duration: 1200,
      })
      return
    }

    const zone = ZONE_LAYERS.find((z) => z.key === authorityFilter)
    if (!zone) return

    map.current.fitBounds(zoneBounds(zone.radiusNM), {
      padding: 60,
      duration: 1200,
      maxZoom: 15,
    })
  }, [authorityFilter])

  // Update deck.gl layer when vessels change
  useEffect(() => {
    if (!deckOverlay.current) return

    const vesselLayer = new ScatterplotLayer({
      id: 'vessels',
      data: vessels,
      pickable: true,
      opacity: 0.9,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 6,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 1,
      getPosition: (d) => [d.longitude, d.latitude],
      getRadius: (d) => {
        if (selectedVessel?.mmsi === d.mmsi) return 12
        return Math.max(6, Math.min(15, d.co2PerDayTonnes / 30))
      },
      getFillColor: (d) => {
        const hex = d.tierColor || '#00c853'
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        const alpha = selectedVessel?.mmsi === d.mmsi ? 255 : 200
        return [r, g, b, alpha]
      },
      getLineColor: (d) => {
        if (selectedVessel?.mmsi === d.mmsi) return [0, 212, 180, 255]
        return [30, 58, 95, 255]
      },
      getLineWidth: (d) => (selectedVessel?.mmsi === d.mmsi ? 3 : 1),
      onClick: ({ object }) => {
        if (object) onSelectVessel(object)
      },
      onHover: ({ object, x, y }) => {
        setTooltip(object ? { object, x, y } : null)
      },
      updateTriggers: {
        getRadius: [selectedVessel?.mmsi],
        getFillColor: [selectedVessel?.mmsi],
        getLineColor: [selectedVessel?.mmsi],
        getLineWidth: [selectedVessel?.mmsi],
      },
    })

    deckOverlay.current.setProps({ layers: [vesselLayer] })
  }, [vessels, selectedVessel, onSelectVessel])

  // Center on selected vessel
  useEffect(() => {
    if (selectedVessel && map.current) {
      map.current.flyTo({
        center: [selectedVessel.longitude, selectedVessel.latitude],
        zoom: Math.max(map.current.getZoom(), 11),
        duration: 1000,
      })
    }
  }, [selectedVessel?.mmsi])

  return (
    <div className="relative w-full h-full bg-gray-900">
      <div ref={mapContainer} className="w-full h-full" style={{ minHeight: '100%' }} />

      {/* Regulatory Authority Selector */}
      <div className="absolute top-4 right-4 z-10 bg-bg-card/95 border border-border rounded-lg overflow-hidden shadow-xl">
        <div className="px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Regulatory Zone</span>
        </div>
        <div className="p-2 space-y-1">
          <button
            onClick={() => onAuthorityFilterChange('ALL')}
            className={`w-full px-3 py-1.5 rounded text-xs text-left flex items-center gap-2 transition-colors ${
              authorityFilter === 'ALL'
                ? 'bg-bg-secondary text-white font-medium'
                : 'text-text-muted hover:text-white hover:bg-bg-secondary/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-text-muted/40 inline-block" />
            All Ships
          </button>
          {ZONE_LAYERS.map(({ key, label, nm, color }) => (
            <button
              key={key}
              onClick={() => onAuthorityFilterChange(authorityFilter === key ? 'ALL' : key)}
              className={`w-full px-3 py-1.5 rounded text-xs text-left flex items-center gap-2 transition-colors ${
                authorityFilter === key
                  ? 'bg-bg-secondary text-white font-medium'
                  : 'text-text-muted hover:text-white hover:bg-bg-secondary/50'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="flex-1">{label}</span>
              <span className="text-text-muted font-mono">{nm}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 bg-bg-card border border-border rounded-lg px-3 py-2 shadow-xl"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
        >
          <div className="text-sm font-semibold text-white">
            {tooltip.object.name || `Vessel ${tooltip.object.mmsi}`}
          </div>
          <div className="text-xs text-text-muted mt-1">
            {getVesselTypeName(tooltip.object.shipTypeCode)} {mmsiToFlag(tooltip.object.mmsi)}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs">
            <span className="text-text-muted">
              Speed: <span className="text-white font-mono">{tooltip.object.speed?.toFixed(1)} kn</span>
            </span>
            <span className="font-mono font-bold" style={{ color: tooltip.object.tierColor }}>
              {tooltip.object.co2PerDayTonnes?.toFixed(0)} t/day
            </span>
          </div>
        </div>
      )}

      {/* Port Label */}
      <div className="absolute bottom-4 left-4 bg-bg-card/90 border border-border rounded px-3 py-1.5">
        <span className="text-sm text-white font-medium">📍 Port of New York / New Jersey</span>
      </div>
    </div>
  )
}
