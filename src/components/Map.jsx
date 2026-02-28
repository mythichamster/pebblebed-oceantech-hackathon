import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { DeckGL } from '@deck.gl/react'
import { ScatterplotLayer } from '@deck.gl/layers'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { getVesselTypeName, mmsiToFlag } from '../utils/vesselSpecs'

// Port of New York / New Jersey center
const INITIAL_VIEW = {
  longitude: -74.02,
  latitude: 40.65,
  zoom: 10,
  pitch: 0,
  bearing: 0,
}

export default function Map({ vessels, selectedVessel, onSelectVessel }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const deckOverlay = useRef(null)
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
    deckOverlay.current = new MapboxOverlay({
      layers: [],
    })
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

    // Add port label
    map.current.on('load', () => {
      // Optional: add a marker for the port
    })

    return () => {
      map.current?.remove()
    }
  }, [])

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
        // Larger radius for selected vessel
        if (selectedVessel?.mmsi === d.mmsi) return 12
        // Scale by emissions
        return Math.max(6, Math.min(15, d.co2PerDayTonnes / 30))
      },
      getFillColor: (d) => {
        const hex = d.tierColor || '#00c853'
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        // Highlight selected
        const alpha = selectedVessel?.mmsi === d.mmsi ? 255 : 200
        return [r, g, b, alpha]
      },
      getLineColor: (d) => {
        if (selectedVessel?.mmsi === d.mmsi) {
          return [0, 212, 180, 255] // accent-teal
        }
        return [30, 58, 95, 255] // border color
      },
      getLineWidth: (d) => (selectedVessel?.mmsi === d.mmsi ? 3 : 1),
      onClick: ({ object }) => {
        if (object) {
          onSelectVessel(object)
        }
      },
      onHover: ({ object, x, y }) => {
        if (object) {
          setTooltip({ object, x, y })
        } else {
          setTooltip(null)
        }
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

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 bg-bg-card border border-border rounded-lg px-3 py-2 shadow-xl"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y + 10,
          }}
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
