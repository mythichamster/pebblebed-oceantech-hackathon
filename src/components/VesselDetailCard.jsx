import { useState } from 'react'
import { X, Navigation, Gauge, Anchor, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'
import { getVesselTypeName, getVesselTypeEmoji, mmsiToFlag, mmsiToCountry } from '../utils/vesselSpecs'

export default function VesselDetailCard({ vessel, onClose }) {
  const [showMethodology, setShowMethodology] = useState(false)

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
            className="p-1 hover:bg-bg-secondary rounded transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
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
