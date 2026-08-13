/**
 * HexHeatmap — Renders H3 hexagonal density grid on Leaflet map
 * 
 * Replaces simple CircleMarkers with precise hexagonal cells showing
 * persons/m² density using Uber's H3 spatial indexing.
 * 
 * Also renders flow vector arrows showing crowd movement direction.
 */
import { useEffect } from 'react';
import { Polygon, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';

/**
 * HexLayer — renders H3 hexagons colored by density
 * @param {Map} hexDensityMap - from computeHexDensity()
 * @param {Function} getDensityColor - color function
 * @param {Function} getDensityLevel - level function
 */
export function HexLayer({ hexDensityMap, getDensityColor, getDensityLevel }) {
  if (!hexDensityMap || hexDensityMap.size === 0) return null;

  return (
    <>
      {Array.from(hexDensityMap.entries()).map(([h3Index, data]) => {
        const color = getDensityColor(data.density_per_sqm);
        const level = getDensityLevel(data.density_per_sqm);
        const opacity = Math.min(0.85, 0.25 + (data.density_per_sqm / 5) * 0.6);

        // Convert H3 boundary to Leaflet [lat, lng] format
        const positions = data.boundary.map(([lat, lng]) => [lat, lng]);

        return (
          <Polygon
            key={h3Index}
            positions={positions}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: opacity,
              weight: 1,
              opacity: 0.6,
            }}
          >
            <Popup>
              <div style={{ fontFamily: "'Inter', sans-serif", minWidth: 180 }}>
                <div style={{
                  fontWeight: 800, fontSize: '0.95rem', marginBottom: 8,
                  color: color, display: 'flex', alignItems: 'center', gap: 6
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: color, display: 'inline-block'
                  }} />
                  {level}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '0.8rem' }}>
                  <span style={{ opacity: 0.6 }}>People:</span>
                  <span style={{ fontWeight: 700 }}>{data.count}</span>
                  <span style={{ opacity: 0.6 }}>Density:</span>
                  <span style={{ fontWeight: 700 }}>{data.density_per_sqm.toFixed(2)} /m²</span>
                  <span style={{ opacity: 0.6 }}>Area:</span>
                  <span style={{ fontWeight: 700 }}>~174 m²</span>
                </div>
                {data.density_per_sqm >= 4.0 && (
                  <div style={{
                    marginTop: 8, padding: '6px 8px', borderRadius: 6,
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    fontSize: '0.72rem', color: '#EF4444', fontWeight: 600
                  }}>
                    ⚠️ DANGER — Exceeds 4 persons/m² safety limit
                  </div>
                )}
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </>
  );
}

/**
 * DeviceMarkers — renders a marker for every active tracked GPS device
 * @param {Array} devices - [{id, lat, lng, zoneName?, updatedAt?}]
 */
export function DeviceMarkers({ devices }) {
  if (!devices || devices.length === 0) return null;

  return (
    <>
      {devices.map((d) => (
        <CircleMarker
          key={d.id}
          center={[d.lat, d.lng]}
          radius={5}
          pathOptions={{
            color: '#6366F1',
            weight: 1.5,
            fillColor: '#818CF8',
            fillOpacity: 0.85,
          }}
        >
          <Popup>
            <div style={{ fontFamily: "'Inter', sans-serif", minWidth: 150 }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: 4, color: '#6366F1' }}>
                📱 Active Device
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', fontSize: '0.78rem' }}>
                <span style={{ opacity: 0.6 }}>ID:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{d.id}</span>
                <span style={{ opacity: 0.6 }}>Zone:</span>
                <span style={{ fontWeight: 600 }}>{d.zoneName || '—'}</span>
                <span style={{ opacity: 0.6 }}>Lat/Lng:</span>
                <span style={{ fontWeight: 600 }}>{d.lat.toFixed(5)}, {d.lng.toFixed(5)}</span>
              </div>
              {d.updatedAt && (
                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: 6 }}>
                  Updated {new Date(d.updatedAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

/**
 * FlowArrows — renders directional arrows showing crowd movement
 * @param {Array} flowVectors - from computeFlowVectors()
 */
export function FlowArrows({ flowVectors }) {
  if (!flowVectors || flowVectors.length === 0) return null;

  return (
    <>
      {flowVectors.map((vec, idx) => {
        if (vec.avgSpeed < 0.1) return null; // Skip nearly stationary

        const [lat, lng] = vec.center;
        // Calculate arrow endpoint based on direction and speed
        const arrowLength = Math.min(0.0003, vec.avgSpeed * 0.0001);
        const rad = (vec.avgDirection * Math.PI) / 180;
        const endLat = lat + arrowLength * Math.cos(rad);
        const endLng = lng + arrowLength * Math.sin(rad);

        const speedColor = vec.avgSpeed < 0.3 ? '#EF4444' : 
                           vec.avgSpeed < 1.0 ? '#F59E0B' : '#10B981';

        return (
          <Polyline
            key={`flow-${idx}`}
            positions={[[lat, lng], [endLat, endLng]]}
            pathOptions={{
              color: speedColor,
              weight: 2.5,
              opacity: 0.7,
              dashArray: null,
            }}
          >
            <Popup>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Crowd Flow</div>
                <div>Direction: {Math.round(vec.avgDirection)}°</div>
                <div>Speed: {vec.avgSpeed.toFixed(2)} m/s</div>
                <div>Devices: {vec.deviceCount}</div>
                {vec.avgSpeed < 0.3 && (
                  <div style={{ color: '#EF4444', fontWeight: 700, marginTop: 4 }}>
                    ⚠️ Very slow — possible crush risk
                  </div>
                )}
              </div>
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
}

/**
 * AutoCenter — auto-pans map to center of hex data
 */
export function AutoCenter({ hexDensityMap }) {
  const map = useMap();

  useEffect(() => {
    if (!hexDensityMap || hexDensityMap.size === 0) return;
    const centers = Array.from(hexDensityMap.values()).map(d => d.center);
    const avgLat = centers.reduce((s, c) => s + c[0], 0) / centers.length;
    const avgLng = centers.reduce((s, c) => s + c[1], 0) / centers.length;
    map.setView([avgLat, avgLng], map.getZoom(), { animate: true });
  }, [hexDensityMap, map]);

  return null;
}

/**
 * SurgeBanner — shows critical alert at top of heatmap
 */
export function SurgeBanner({ surgeAlerts }) {
  if (!surgeAlerts || surgeAlerts.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 6,
      maxWidth: '90%',
    }}>
      {surgeAlerts.slice(0, 3).map((alert, i) => (
        <div key={i} style={{
          background: alert.type === 'CRUSH_RISK'
            ? 'linear-gradient(135deg, rgba(220,38,38,0.95), rgba(185,28,28,0.95))'
            : 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))',
          backdropFilter: 'blur(10px)',
          borderRadius: 10, padding: '10px 16px',
          color: 'white', fontSize: '0.78rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <span style={{ fontSize: '1.1rem' }}>
            {alert.type === 'CRUSH_RISK' ? '🚨' : '⚠️'}
          </span>
          <span>{alert.message}</span>
        </div>
      ))}
    </div>
  );
}

export default { HexLayer, DeviceMarkers, FlowArrows, AutoCenter, SurgeBanner };
