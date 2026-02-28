import { getVesselSpecs } from './vesselSpecs'

// IMO standard emission factors (kg CO2 per kg fuel)
const EMISSION_FACTORS = {
  HFO: 3.114,  // Heavy Fuel Oil
  MDO: 3.206,  // Marine Diesel Oil
  LNG: 2.750,  // Liquefied Natural Gas
}

// Specific fuel consumption (g/kWh) by fuel type
const SFC = {
  HFO: 195,
  MDO: 185,
  LNG: 170,
}

export function calculateEmissions(vessel) {
  const { shipTypeCode = 0, speed = 0 } = vessel

  // 1. Get vessel specs
  const specs = getVesselSpecs(shipTypeCode)
  const engineKW = specs.avgEngineMCR_kW

  // 2. Calculate load factor from speed (cubic law - Admiralty formula)
  const speedRatio = Math.min(speed / specs.maxSpeedKnots, 1.0)
  let loadFactor = Math.pow(speedRatio, 3)
  loadFactor = Math.max(loadFactor, 0.05) // Minimum hotel load

  // 3. Assume fuel type (HFO for commercial vessels)
  const fuelType = 'HFO'
  const sfcGPerKWh = SFC[fuelType]
  const emissionFactor = EMISSION_FACTORS[fuelType]

  // 4. Calculate daily CO2
  const fuelBurnedGPerHour = engineKW * loadFactor * sfcGPerKWh
  const fuelBurnedKgPerDay = (fuelBurnedGPerHour * 24) / 1000
  const fuelBurnedTonnesPerDay = fuelBurnedKgPerDay / 1000
  const co2PerDayTonnes = fuelBurnedTonnesPerDay * emissionFactor

  // 5. Assign emission tier
  // Thresholds calibrated to produce an even distribution across harbor traffic.
  let emissionTier, tierColor
  if (co2PerDayTonnes > 80) {
    emissionTier = 'HIGH'
    tierColor = '#ff4d4d'
  } else if (co2PerDayTonnes > 10) {
    emissionTier = 'MODERATE'
    tierColor = '#ff9500'
  } else {
    emissionTier = 'LOW'
    tierColor = '#00c853'
  }

  // 6. Build assumptions for transparency
  const assumptions = {
    engineNote: `${engineKW.toLocaleString()} kW MCR (estimated from vessel type average, IMO GHG Study IV)`,
    loadFactorNote: `${(loadFactor * 100).toFixed(0)}% (derived from speed ${speed.toFixed(1)}kn / max ${specs.maxSpeedKnots}kn, cubic law)`,
    fuelNote: `${fuelType} (Heavy Fuel Oil) assumed — standard commercial fuel`,
    sfcNote: `${sfcGPerKWh} g/kWh specific fuel consumption`,
    emissionFactorNote: `${emissionFactor} kg CO₂/kg ${fuelType} (IMO standard)`,
    methodNote: 'IMO Fourth GHG Study methodology',
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
    assumptions,
  }
}

export function formatCO2(tonnes) {
  if (tonnes >= 1000) {
    return `${(tonnes / 1000).toFixed(1)}k`
  }
  return tonnes.toFixed(0)
}
