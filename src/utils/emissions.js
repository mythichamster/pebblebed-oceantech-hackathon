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

// Remediation strategies regulators can pitch to vessels (fuel reduction fractions)
export const REMEDIATION_STRATEGIES = [
  { id: 'slow-steam', label: 'Slow steam', fuelReductionFraction: 0.15 },
  { id: 'wind-propulsion', label: 'Wind propulsion', fuelReductionFraction: 0.05 },
  { id: 'hull-cleaning', label: 'Hull cleaning', fuelReductionFraction: 0.2 },
]

// Tier thresholds (must match calculateEmissions)
const TIER_CO2_HIGH = 80
const TIER_CO2_MODERATE = 10

function getTierForCo2(co2Tpd) {
  if (co2Tpd > TIER_CO2_HIGH) return { tier: 'HIGH', tierColor: '#ff4d4d' }
  if (co2Tpd > TIER_CO2_MODERATE) return { tier: 'MODERATE', tierColor: '#ff9500' }
  return { tier: 'LOW', tierColor: '#00c853' }
}

/**
 * Projected fuel and CO2 after applying selected remediation strategies.
 * Reductions are applied multiplicatively.
 * @param {number} baselineFuelTpd - Baseline fuel tonnes per day
 * @param {number} baselineCo2Tpd - Baseline CO2 tonnes per day
 * @param {Array<{ fuelReductionFraction: number }>} selectedStrategies - Strategies to apply
 * @returns {{ projectedFuelTpd: number, projectedCo2Tpd: number, reductionFraction: number, projectedTier: string, projectedTierColor: string }}
 */
export function getProjectedEmissions(baselineFuelTpd, baselineCo2Tpd, selectedStrategies) {
  if (!selectedStrategies?.length) {
    const base = getTierForCo2(baselineCo2Tpd)
    return {
      projectedFuelTpd: baselineFuelTpd,
      projectedCo2Tpd: baselineCo2Tpd,
      reductionFraction: 0,
      projectedTier: base.tier,
      projectedTierColor: base.tierColor,
    }
  }
  const factor = selectedStrategies.reduce(
    (acc, s) => acc * (1 - s.fuelReductionFraction),
    1
  )
  const projectedFuelTpd = baselineFuelTpd * factor
  const projectedCo2Tpd = baselineCo2Tpd * factor
  const reductionFraction = 1 - factor
  const { tier: projectedTier, tierColor: projectedTierColor } = getTierForCo2(projectedCo2Tpd)
  return {
    projectedFuelTpd,
    projectedCo2Tpd,
    reductionFraction,
    projectedTier,
    projectedTierColor,
  }
}
