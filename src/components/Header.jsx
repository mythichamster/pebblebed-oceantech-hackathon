import { Anchor, ShieldCheck } from 'lucide-react'

const TIER_COLORS = {
  ALL: 'bg-accent-teal/20 text-accent-teal border-accent-teal/30',
  HIGH: 'bg-danger/20 text-danger border-danger/30',
  MODERATE: 'bg-warning/20 text-warning border-warning/30',
  LOW: 'bg-safe/20 text-safe border-safe/30',
}

const TIER_DOTS = {
  HIGH: 'bg-danger',
  MODERATE: 'bg-warning',
  LOW: 'bg-safe',
}

export default function Header({
  vesselCount,
  totalCO2,
  tierCounts,
  tierFilter,
  onTierFilterChange,
  lastUpdated,
  demoMode,
}) {
  const timeAgo = lastUpdated
    ? `${Math.floor((Date.now() - lastUpdated) / 1000)}s ago`
    : '...'

  return (
    <header className="h-16 bg-bg-secondary border-b border-border flex items-center justify-between px-4">
      {/* Logo + Methodology Badge */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Anchor className="w-6 h-6 text-accent-teal" />
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">ShipWatch</h1>
            <p className="text-xs text-text-muted leading-tight">
              Real-Time Vessel Emissions Intelligence
            </p>
          </div>
        </div>

        {/* Methodology Badge */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-accent-teal/10 border border-accent-teal/30 rounded text-accent-teal">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">IMO GHG Study IV · ISO 14083</span>
        </div>
      </div>

      {/* Center - Port Summary + Filters */}
      <div className="flex items-center gap-4">
        {demoMode && (
          <span className="px-2 py-1 bg-warning/20 text-warning text-xs font-medium rounded">
            ⚠️ Demo
          </span>
        )}

        {/* Port-level CO2 stat */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-card rounded border border-border">
          <span className="text-sm text-text-muted">📍 LA/Long Beach:</span>
          <span className="text-lg font-mono font-bold text-accent-teal">
            ~{totalCO2?.toLocaleString() || '0'}
          </span>
          <span className="text-sm text-text-muted">t CO₂/day</span>
          <span className="text-xs text-text-muted">({vesselCount} vessels)</span>
        </div>

        {/* Emission Tier Filter Pills */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTierFilterChange('ALL')}
            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
              tierFilter === 'ALL'
                ? TIER_COLORS.ALL
                : 'bg-bg-card text-text-muted border-border hover:border-accent-teal/50'
            }`}
          >
            All
          </button>
          {['HIGH', 'MODERATE', 'LOW'].map((tier) => (
            <button
              key={tier}
              onClick={() => onTierFilterChange(tier)}
              className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 ${
                tierFilter === tier
                  ? TIER_COLORS[tier]
                  : 'bg-bg-card text-text-muted border-border hover:border-text-muted'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${TIER_DOTS[tier]}`} />
              {tier.charAt(0) + tier.slice(1).toLowerCase()}
              <span className="font-mono">({tierCounts?.[tier] || 0})</span>
            </button>
          ))}
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-safe"></span>
          </span>
          <span className="text-sm text-safe font-medium">LIVE</span>
        </div>
      </div>

      {/* Right - Time */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-text-muted">Updated {timeAgo}</span>
      </div>
    </header>
  )
}
