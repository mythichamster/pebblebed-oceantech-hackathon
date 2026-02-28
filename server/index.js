import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import cors from 'cors'
import { createServer } from 'http'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env from parent directory (project root)
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3001
const AISSTREAM_API_KEY = process.env.AISSTREAM_API_KEY

// Port of New York / New Jersey bounding box
const NY_BOUNDS = {
  name: 'New York',
  minLat: 40.45,
  minLon: -74.30,
  maxLat: 40.85,
  maxLon: -73.70,
}

// Vessel state storage
const vessels = new Map()
let isDemoMode = false

// Demo vessel names
const VESSEL_NAMES = [
  'Ever Given', 'Maersk Edmonton', 'MSC Oscar', 'CMA CGM Marco Polo',
  'COSCO Shipping Universe', 'ONE Commitment', 'Evergreen Triton',
  'Yang Ming Wellness', 'HMM Algeciras', 'Pacific Pioneer',
  'Atlantic Guardian', 'Ocean Voyager', 'Sea Champion', 'Global Carrier',
  'Maritime Express', 'Horizon Leader', 'Neptune Star', 'Coastal Pride',
  'Harbor Master', 'Port Authority', 'Bay Runner', 'Channel Navigator',
  'Strait Passage', 'Gulf Stream', 'Tidal Force', 'Current Rider',
  'Wave Crest', 'Storm Chaser', 'Wind Dancer', 'Sun Seeker',
  'Cargo King', 'Freight Master', 'Container Chief', 'Bulk Carrier One',
  'Tanker Supreme', 'Oil Transport', 'Gas Carrier', 'Chemical Hauler',
  'Auto Transporter', 'RoRo Express', 'Break Bulk Star', 'Heavy Lift Pro',
  'Reefer King', 'Produce Hauler', 'Grain Shipper', 'Coal Transport',
  'Iron Ore Giant', 'Steel Carrier', 'Timber Transport', 'Pacific Trader'
]

// Ship type codes for demo
const SHIP_TYPES = [70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 60, 61, 30, 50]

// Generate random position within LA bounds
function randomPosition() {
  const lat = NY_BOUNDS.minLat + Math.random() * (NY_BOUNDS.maxLat - NY_BOUNDS.minLat)
  const lon = NY_BOUNDS.minLon + Math.random() * (NY_BOUNDS.maxLon - NY_BOUNDS.minLon)
  return { lat, lon }
}

// Generate random MMSI (for demo, use realistic MID prefixes)
function randomMMSI() {
  const mids = [303, 338, 354, 370, 371, 372, 538, 636, 440, 477, 563, 412]
  const mid = mids[Math.floor(Math.random() * mids.length)]
  const rest = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return parseInt(`${mid}${rest}`)
}

// Calculate emissions for a vessel
function calculateEmissions(vessel) {
  const specs = getVesselSpecs(vessel.shipTypeCode)
  const engineKW = specs.avgEngineMCR_kW

  const speedRatio = Math.min(vessel.speed / specs.maxSpeedKnots, 1.0)
  let loadFactor = Math.pow(speedRatio, 3)
  loadFactor = Math.max(loadFactor, 0.05)

  const fuelType = 'HFO'
  const sfcGPerKWh = 195
  const emissionFactor = 3.114

  const fuelBurnedGPerHour = engineKW * loadFactor * sfcGPerKWh
  const fuelBurnedKgPerDay = (fuelBurnedGPerHour * 24) / 1000
  const fuelBurnedTonnesPerDay = fuelBurnedKgPerDay / 1000
  const co2PerDayTonnes = fuelBurnedTonnesPerDay * emissionFactor

  let emissionTier, tierColor
  if (co2PerDayTonnes > 300) {
    emissionTier = 'HIGH'
    tierColor = '#ff4d4d'
  } else if (co2PerDayTonnes > 100) {
    emissionTier = 'MODERATE'
    tierColor = '#ff9500'
  } else {
    emissionTier = 'LOW'
    tierColor = '#00c853'
  }

  return {
    engineKW,
    loadFactor,
    fuelType,
    sfcGPerKWh,
    emissionFactor,
    fuelBurnedTonnesPerDay,
    co2PerDayTonnes,
    emissionTier,
    tierColor,
  }
}

function getVesselSpecs(typeCode) {
  if (typeCode >= 70 && typeCode <= 79) {
    return typeCode === 70
      ? { avgEngineMCR_kW: 8000, maxSpeedKnots: 14 }
      : { avgEngineMCR_kW: 25000, maxSpeedKnots: 22 }
  }
  if (typeCode >= 80 && typeCode <= 89) return { avgEngineMCR_kW: 15000, maxSpeedKnots: 15 }
  if (typeCode >= 60 && typeCode <= 69) return { avgEngineMCR_kW: 30000, maxSpeedKnots: 22 }
  if (typeCode >= 50 && typeCode <= 59) return { avgEngineMCR_kW: 3000, maxSpeedKnots: 13 }
  if (typeCode === 30) return { avgEngineMCR_kW: 1500, maxSpeedKnots: 12 }
  return { avgEngineMCR_kW: 10000, maxSpeedKnots: 14 }
}

// Initialize demo vessels
function initDemoVessels() {
  console.log('🚢 Initializing demo mode with 50 vessels...')

  for (let i = 0; i < 50; i++) {
    const pos = randomPosition()
    const mmsi = randomMMSI()
    const shipTypeCode = SHIP_TYPES[Math.floor(Math.random() * SHIP_TYPES.length)]
    const speed = 5 + Math.random() * 15 // 5-20 knots
    const heading = Math.floor(Math.random() * 360)

    const vessel = {
      mmsi,
      name: VESSEL_NAMES[i] || `Vessel ${mmsi}`,
      shipTypeCode,
      latitude: pos.lat,
      longitude: pos.lon,
      speed,
      heading,
      course: heading,
      lastUpdated: Date.now(),
      imo: 9000000 + Math.floor(Math.random() * 999999),
      port: 'New York',
    }

    // Add emissions data
    const emissions = calculateEmissions(vessel)
    Object.assign(vessel, emissions)

    vessels.set(mmsi, vessel)
  }

  console.log(`✅ Created ${vessels.size} demo vessels`)
}

// Update vessel positions (simulate movement)
function updateVesselPositions() {
  vessels.forEach((vessel) => {
    // Move vessel slightly based on heading and speed
    const speedKmH = vessel.speed * 1.852 // knots to km/h
    const distanceKm = (speedKmH / 3600) * 5 // distance in 5 seconds
    const distanceDeg = distanceKm / 111 // rough km to degrees

    const headingRad = (vessel.heading * Math.PI) / 180
    vessel.latitude += Math.cos(headingRad) * distanceDeg
    vessel.longitude += Math.sin(headingRad) * distanceDeg

    // Keep within bounds, bounce off edges
    if (vessel.latitude < NY_BOUNDS.minLat || vessel.latitude > NY_BOUNDS.maxLat) {
      vessel.heading = (180 - vessel.heading + 360) % 360
      vessel.latitude = Math.max(NY_BOUNDS.minLat, Math.min(NY_BOUNDS.maxLat, vessel.latitude))
    }
    if (vessel.longitude < NY_BOUNDS.minLon || vessel.longitude > NY_BOUNDS.maxLon) {
      vessel.heading = (360 - vessel.heading) % 360
      vessel.longitude = Math.max(NY_BOUNDS.minLon, Math.min(NY_BOUNDS.maxLon, vessel.longitude))
    }

    // Occasionally vary speed slightly
    if (Math.random() < 0.1) {
      vessel.speed = Math.max(3, Math.min(22, vessel.speed + (Math.random() - 0.5) * 2))
      const emissions = calculateEmissions(vessel)
      Object.assign(vessel, emissions)
    }

    vessel.lastUpdated = Date.now()
    vessel.course = vessel.heading
  })
}

// Create HTTP server
const server = createServer(app)

// Create WebSocket server
const wss = new WebSocketServer({ server })

// Track connected clients
const clients = new Set()

wss.on('connection', (ws) => {
  console.log('📡 Client connected')
  clients.add(ws)

  // Send current vessel state immediately
  const vesselArray = Array.from(vessels.values())
  ws.send(JSON.stringify({ type: 'vesselUpdate', vessels: vesselArray, demoMode: isDemoMode }))

  ws.on('close', () => {
    console.log('📡 Client disconnected')
    clients.delete(ws)
  })
})

// Broadcast vessel updates to all clients
function broadcastVessels() {
  const vesselArray = Array.from(vessels.values())
  const message = JSON.stringify({ type: 'vesselUpdate', vessels: vesselArray, demoMode: isDemoMode })

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

// REST endpoint for initial load
app.get('/api/vessels', (_req, res) => {
  res.json(Array.from(vessels.values()))
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', vesselCount: vessels.size, demoMode: isDemoMode })
})

// AIS Stream connection (when API key is available)
let aisStreamWs = null

function connectToAISStream() {
  if (!AISSTREAM_API_KEY) {
    console.log('⚠️  No AISSTREAM_API_KEY found, using demo mode')
    isDemoMode = true
    initDemoVessels()
    return
  }

  console.log('🌊 Connecting to AIS Stream...')

  aisStreamWs = new WebSocket('wss://stream.aisstream.io/v0/stream')

  aisStreamWs.on('open', () => {
    console.log('✅ Connected to AIS Stream')

    const subscription = {
      Apikey: AISSTREAM_API_KEY,
      BoundingBoxes: [
        [[NY_BOUNDS.minLat, NY_BOUNDS.minLon], [NY_BOUNDS.maxLat, NY_BOUNDS.maxLon]],
      ],
      FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
    }

    aisStreamWs.send(JSON.stringify(subscription))
  })

  aisStreamWs.on('message', (data) => {
    try {
      const msg = JSON.parse(data)
      processAISMessage(msg)
    } catch (e) {
      console.error('Error parsing AIS message:', e)
    }
  })

  aisStreamWs.on('error', (err) => {
    console.error('AIS Stream error:', err.message)
    console.log('⚠️  Falling back to demo mode')
    isDemoMode = true
    initDemoVessels()
  })

  aisStreamWs.on('close', () => {
    console.log('AIS Stream connection closed, reconnecting in 5s...')
    setTimeout(connectToAISStream, 5000)
  })
}

function processAISMessage(msg) {
  const { MessageType, Message, MetaData } = msg

  if (!Message || !MetaData) return

  const mmsi = MetaData.MMSI
  if (!mmsi) return

  let vessel = vessels.get(mmsi) || { mmsi, port: 'New York' }

  if (MessageType === 'PositionReport') {
    const pos = Message.PositionReport
    vessel.latitude = pos.Latitude
    vessel.longitude = pos.Longitude
    vessel.speed = pos.Sog || 0
    vessel.heading = pos.TrueHeading || pos.Cog || 0
    vessel.course = pos.Cog || 0
    vessel.lastUpdated = Date.now()

    if (vessel.shipTypeCode) {
      const emissions = calculateEmissions(vessel)
      Object.assign(vessel, emissions)
    }
  }

  if (MessageType === 'ShipStaticData') {
    const data = Message.ShipStaticData
    vessel.name = data.Name || `Vessel ${mmsi}`
    vessel.shipTypeCode = data.Type || 70
    vessel.imo = data.ImoNumber || null
    vessel.callsign = data.CallSign || null

    const emissions = calculateEmissions(vessel)
    Object.assign(vessel, emissions)
  }

  vessels.set(mmsi, vessel)
}

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)

  // Connect to AIS Stream or init demo mode
  connectToAISStream()

  // Update positions and broadcast every 5 seconds
  setInterval(() => {
    if (!AISSTREAM_API_KEY) {
      updateVesselPositions()
    }
    broadcastVessels()
  }, 5000)
})
