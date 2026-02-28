import { useState } from 'react'
import { ChevronLeft, Navigation, Gauge, Anchor, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'
import { getVesselTypeName, getVesselTypeEmoji, mmsiToFlag, mmsiToCountry } from '../utils/vesselSpecs'
import {
  REMEDIATION_STRATEGIES,
  getProjectedEmissions,
} from '../utils/emissions'

export default function VesselDetailCard({ vessel, onClose }) {
  const [showMethodology, setShowMethodology] = useState(false)
  const [selectedStrategyIds, setSelectedStrategyIds] = useState(new Set())

  if (!vessel) {
    return (
      <div className="h-full flex flex-col bg-bg-card rounded-lg border border-border">
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          <div className="text-center">
            <Anchor className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Click a vessel to inspect emissions</p>
          </div>
        </div>
      </div>
    )
  }

  const tierBadgeColors = {
    HIGH: 'bg-danger/20 text-danger border-danger/30',
    MODERATE: 'bg-warning/20 text-warning border-warning/30',
    LOW: 'bg-safe/20 text-safe border-safe/30',
  }

  return (
    <div className="h-full flex flex-col bg-bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">
            {vessel.name || `Vessel ${vessel.mmsi}`}
          </h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted font-mono">
            {vessel.imo && <span>IMO: {vessel.imo}</span>}
            <span>MMSI: {vessel.mmsi}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs font-semibold rounded border ${
              tierBadgeColors[vessel.emissionTier]
            }`}
          >
            {vessel.emissionTier} EMITTER
          </span>
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-white hover:bg-bg-secondary rounded border border-border transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
            Rankings
          </button>
        </div>
      </div>

      {/* Specs Row */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-1.5">
          <span>{getVesselTypeEmoji(vessel.shipTypeCode)}</span>
          <span className="text-text-muted">{getVesselTypeName(vessel.shipTypeCode)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>{mmsiToFlag(vessel.mmsi)}</span>
          <span className="text-text-muted">{mmsiToCountry(vessel.mmsi)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-text-muted" />
          <span className="font-mono text-white">{vessel.speed?.toFixed(1)} kn</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-text-muted" />
          <span className="font-mono text-white">{vessel.heading?.toFixed(0)}°</span>
        </div>
      </div>

      {/* Calculation Breakdown */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          📊 Emissions Estimate — How We Got Here
        </h3>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-text-muted">Engine Power</span>
            <div className="text-right">
              <span className="font-mono text-white">
                {vessel.engineKW?.toLocaleString()} kW MCR
              </span>
              <p className="text-xs text-text-muted">estimated from vessel type avg</p>
            </div>
          </div>

          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-text-muted">Load Factor</span>
            <div className="text-right">
              <span className="font-mono text-white">
                {(vessel.loadFactor * 100).toFixed(0)}%
              </span>
              <p className="text-xs text-text-muted">cubic law from speed</p>
            </div>
          </div>

          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-text-muted">Fuel Type</span>
            <div className="text-right">
              <span className="font-mono text-white">{vessel.fuelType}</span>
              <p className="text-xs text-text-muted">Heavy Fuel Oil assumed</p>
            </div>
          </div>

          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-text-muted">Fuel Consumed</span>
            <div className="text-right">
              <span className="font-mono text-white">
                ~{vessel.fuelBurnedTonnesPerDay?.toFixed(1)} t/day
              </span>
              <p className="text-xs text-text-muted">engine × load × 24hr × SFC</p>
            </div>
          </div>

          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-text-muted">CO₂ Factor</span>
            <div className="text-right">
              <span className="font-mono text-white">{vessel.emissionFactor} kg/kg</span>
              <p className="text-xs text-text-muted">IMO standard for HFO</p>
            </div>
          </div>

          {/* Result */}
          <div className="flex justify-between py-3 bg-bg-secondary -mx-4 px-4 mt-2">
            <span className="font-semibold text-white">Est. CO₂</span>
            <span
              className="text-2xl font-mono font-bold"
              style={{ color: vessel.tierColor }}
            >
              {vessel.co2PerDayTonnes?.toFixed(0)} t/day
            </span>
          </div>
        </div>

        {/* Remediation scenarios */}
        {vessel.fuelBurnedTonnesPerDay != null && vessel.co2PerDayTonnes != null ? (
          <div className="mt-3 border border-border rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-bg-secondary border-b border-border">
              <h3 className="text-sm font-semibold text-white">Remediation scenarios</h3>
              <p className="text-xs text-text-muted mt-0.5">Pitch a strategy to see projected fuel and CO₂</p>
            </div>
            <div className="px-3 py-2 space-y-2">
              {REMEDIATION_STRATEGIES.map((strategy) => {
                const checked = selectedStrategyIds.has(strategy.id)
                const pct = Math.round(strategy.fuelReductionFraction * 100)
                return (
                  <label
                    key={strategy.id}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedStrategyIds((prev) => {
                          const next = new Set(prev)
                          if (next.has(strategy.id)) next.delete(strategy.id)
                          else next.add(strategy.id)
                          return next
                        })
                      }}
                      className="rounded border-border bg-bg-secondary text-accent-teal focus:ring-accent-teal"
                    />
                    <span className="text-white">{strategy.label}</span>
                    <span className="text-text-muted text-xs">(−{pct}% fuel)</span>
                  </label>
                )
              })}
            </div>
            {selectedStrategyIds.size > 0 && (() => {
              const baselineFuel = vessel.fuelBurnedTonnesPerDay
              const baselineCo2 = vessel.co2PerDayTonnes
              const selectedStrategies = REMEDIATION_STRATEGIES.filter((s) =>
                selectedStrategyIds.has(s.id)
              )
              const projected = getProjectedEmissions(baselineFuel, baselineCo2, selectedStrategies)
              const reductionPct =
                baselineCo2 > 0
                  ? Math.round(projected.reductionFraction * 100)
                  : 0
              return (
                <div className="px-3 py-3 border-t border-border bg-bg-primary/50 space-y-2 text-sm">
                  <div className="flex justify-between text-text-muted">
                    <span>Current</span>
                    <span className="font-mono text-white">
                      ~{baselineFuel.toFixed(1)} t/day fuel · {baselineCo2.toFixed(0)} t/day CO₂
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white">If adopted</span>
                    <span className="font-mono font-semibold" style={{ color: projected.projectedTierColor }}>
                      ~{projected.projectedFuelTpd.toFixed(1)} t/day fuel · {projected.projectedCo2Tpd.toFixed(0)} t/day CO₂
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted text-xs">{reductionPct}% reduction</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                        tierBadgeColors[projected.projectedTier]
                      }`}
                    >
                      {projected.projectedTier}
                    </span>
                  </div>
                </div>
              )
            })()}
          </div>
        ) : (
          <div className="mt-3 px-3 py-2 border border-border rounded-lg text-xs text-text-muted">
            Emissions data required to show remediation scenarios.
          </div>
        )}

        {/* Why Trust This - Collapsible */}
        <div className="mt-3 border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full px-3 py-2 flex items-center justify-between bg-bg-secondary hover:bg-bg-secondary/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent-teal" />
              <span className="text-sm font-medium text-white">Why should I trust this?</span>
            </div>
            {showMethodology ? (
              <ChevronUp className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {showMethodology && (
            <div className="px-3 py-3 text-xs text-text-muted leading-relaxed bg-bg-primary/50">
              <p className="mb-2">
                <strong className="text-white">Methodology:</strong> This estimate follows the
                <span className="text-accent-teal"> IMO Fourth GHG Study (2020)</span> — the international
                standard used by the International Maritime Organization to assess global shipping emissions.
              </p>
              <p className="mb-2">
                We apply the <span className="text-accent-teal">Admiralty cubic law</span> to derive engine load
                from vessel speed, use <span className="text-accent-teal">ISO 14083</span> compliant emission factors,
                and align with the <span className="text-accent-teal">GLEC Framework</span> for transport emissions
                accounting.
              </p>
              <p>
                All assumptions are shown transparently above. For verified data, vessel operators can
                provide actual engine specs, fuel declarations, or MRV reports.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-accent-teal" />
        <p className="text-xs text-text-muted">
          IMO GHG Study IV · ISO 14083 · GLEC Framework Aligned
        </p>
      </div>
    </div>
  )
}
