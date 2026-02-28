import { getVesselTypeName, getVesselTypeEmoji, mmsiToFlag } from '../utils/vesselSpecs'
import { formatCO2 } from '../utils/emissions'

const TYPE_FILTERS = [
  { key: 'ALL',       label: 'All',       emoji: null },
  { key: 'CONTAINER', label: 'Container', emoji: '📦' },
  { key: 'TANKER',    label: 'Tanker',    emoji: '🛢️' },
  { key: 'PASSENGER', label: 'Passenger', emoji: '🚢' },
  { key: 'CARGO',     label: 'Cargo',     emoji: '🚚' },
  { key: 'SERVICE',   label: 'Service',   emoji: '🚤' },
  { key: 'FISHING',   label: 'Fishing',   emoji: '🐟' },
]

export default function Leaderboard({ vessels, selectedVessel, onSelectVessel, typeFilter, onTypeFilterChange }) {
  // Sort by CO2 emissions descending, take top 15
  const topEmitters = [...vessels]
    .filter((v) => v.co2PerDayTonnes > 0)
    .sort((a, b) => b.co2PerDayTonnes - a.co2PerDayTonnes)
    .slice(0, 15)

  const maxCO2 = topEmitters[0]?.co2PerDayTonnes || 1

  return (
    <div className="h-full flex flex-col bg-bg-card rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
          <span className="text-danger">●</span> Top Emitters — Live
        </h2>
        <div className="flex flex-wrap gap-1">
          {TYPE_FILTERS.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => onTypeFilterChange(key)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                typeFilter === key
                  ? 'bg-accent-teal/20 text-accent-teal border-accent-teal/40'
                  : 'bg-bg-secondary text-text-muted border-border hover:border-text-muted'
              }`}
            >
              {emoji && <span className="mr-1">{emoji}</span>}{label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {topEmitters.length === 0 ? (
          <div className="p-4 text-text-muted text-sm">No vessels detected...</div>
        ) : (
          <div className="divide-y divide-border">
            {topEmitters.map((vessel, index) => {
              const isSelected = selectedVessel?.mmsi === vessel.mmsi
              const barWidth = (vessel.co2PerDayTonnes / maxCO2) * 100

              return (
                <button
                  key={vessel.mmsi}
                  onClick={() => onSelectVessel(vessel)}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-bg-secondary transition-colors text-left ${
                    isSelected ? 'bg-bg-secondary ring-1 ring-accent-teal' : ''
                  }`}
                >
                  {/* Rank */}
                  <span className="w-6 text-sm font-bold text-text-muted">#{index + 1}</span>

                  {/* Vessel Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {vessel.name || `Vessel ${vessel.mmsi}`}
                      </span>
                      <span className="text-xs">{mmsiToFlag(vessel.mmsi)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-text-muted">
                        {getVesselTypeEmoji(vessel.shipTypeCode)}{' '}
                        {getVesselTypeName(vessel.shipTypeCode)}
                      </span>
                    </div>
                  </div>

                  {/* CO2 */}
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-accent-teal">
                      {formatCO2(vessel.co2PerDayTonnes)}t
                    </div>
                    <div className="text-xs text-text-muted">per day</div>
                  </div>

                  {/* Bar */}
                  <div className="w-20 h-2 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: vessel.tierColor,
                      }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
