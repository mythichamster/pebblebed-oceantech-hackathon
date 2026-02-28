// Geographic utilities for regulatory authority zone calculations

export const NY_HARBOR_CENTER = { lat: 40.65, lon: -74.02 }

const EARTH_RADIUS_NM = 3440.065

/**
 * Calculate great-circle distance in nautical miles between two coordinates.
 * Uses the Haversine formula.
 */
export function distanceNM(lat1, lon1, lat2, lon2) {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2

  return EARTH_RADIUS_NM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Generate a GeoJSON Feature (Polygon) approximating a circle on the map.
 * @param {number} centerLon - Center longitude in degrees
 * @param {number} centerLat - Center latitude in degrees
 * @param {number} radiusNM - Radius in nautical miles
 * @param {number} steps - Number of polygon vertices (higher = smoother)
 */
export function circlePolygon(centerLon, centerLat, radiusNM, steps = 64) {
  const radiusKm = radiusNM * 1.852
  const coords = []

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    const dx = (radiusKm / (111.32 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle)
    const dy = (radiusKm / 110.574) * Math.cos(angle)
    coords.push([centerLon + dx, centerLat + dy])
  }

  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  }
}
