import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { Radio, Users, Shield, Activity, RefreshCw, Wifi, AlertTriangle } from 'lucide-react';
import Topbar from '../components/Topbar';
import { HexLayer, FlowArrows, AutoCenter, SurgeBanner } from '../components/HexHeatmap';
import { fetchZones } from '../lib/supabaseService';
import { supabase } from '../lib/supabase';

// Dynamic imports for h3 utilities — graceful fallback if not yet available
let h3Utils = null;
let surgeDetector = null;

async function loadH3Modules() {
  try {
    h3Utils = await import('../lib/h3Utils.js');
    surgeDetector = await import('../lib/surgeDetector.js');
    return true;
  } catch (err) {
    console.warn('H3 modules not loaded yet, using fallback:', err.message);
    return false;
  }
}

// Fallback density functions (used when h3Utils isn't available)
function fallbackDensityColor(pct) {
  if (pct >= 80) return '#EF4444';
  if (pct >= 55) return '#F59E0B';
  return '#10B981';
}
function fallbackDensityLevel(pct) {
  if (pct >= 80) return 'critical';
  if (pct >= 55) return 'moderate';
  return 'safe';
}

function MapLegend({ mode }) {
  const items = mode === 'hex'
    ? [
        ['#10B981', 'Safe (< 1.0 /m²)'],
        ['#F59E0B', 'Moderate (1.0–2.5 /m²)'],
        ['#F97316', 'High (2.5–4.0 /m²)'],
        ['#EF4444', 'Critical (≥ 4.0 /m²)'],
      ]
    : [
        ['#10B981', 'Safe (< 55%)'],
        ['#F59E0B', 'Moderate (55–80%)'],
        ['#EF4444', 'Critical (> 80%)'],
      ];

  return (
    <div style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 1000, background: 'white', borderRadius: 12, padding: '14px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
        {mode === 'hex' ? 'Crowd Density (persons/m²)' : 'Crowd Density'}
      </p>
      {items.map(([color, label]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: mode === 'hex' ? 2 : '50%', background: color, opacity: 0.85 }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Heatmap({ sidebarOpen, setSidebarOpen }) {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalTracked, setTotalTracked] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [hexMode, setHexMode] = useState(false);
  const [hexDensityMap, setHexDensityMap] = useState(new Map());
  const [flowVectors, setFlowVectors] = useState([]);
  const [surgeAlerts, setSurgeAlerts] = useState([]);
  const [attendeeCounts, setAttendeeCounts] = useState({});
  const [selectedZone, setSelectedZone] = useState(null);
  const previousPositions = useRef([]);
  const flowVectorsRef = useRef([]); // use ref to avoid stale closure in fetchAndComputeH3

  // Fetch raw GPS data and compute H3 density
  const fetchAndComputeH3 = useCallback(async () => {
    try {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: locations, error } = await supabase
        .from('attendee_locations')
        .select('device_id, latitude, longitude, zone_id, zone_name, updated_at')
        .gte('updated_at', tenMinAgo)
        .eq('event_id', 'current');

      if (error) {
        console.warn('GPS fetch error:', error.message);
        return;
      }

      const locs = locations || [];
      setTotalTracked(locs.length);
      setLastRefresh(new Date());

      // Count per zone (for sidebar)
      const counts = {};
      locs.forEach(row => {
        if (row.zone_id) counts[row.zone_id] = (counts[row.zone_id] || 0) + 1;
      });
      setAttendeeCounts(counts);

      // If h3Utils is loaded, compute hex density
      if (h3Utils) {
        setHexMode(true);
        const attendees = locs.map(l => ({
          lat: l.latitude,
          lng: l.longitude,
          anon_token: l.device_id,
        }));

        // Compute hex density grid
        const densityMap = h3Utils.computeHexDensity(attendees, 9);
        setHexDensityMap(densityMap);

        // Compute flow vectors (compare with previous positions)
        const currentPositions = attendees.map(a => ({
          anon_token: a.anon_token, lat: a.lat, lng: a.lng,
        }));
        if (previousPositions.current.length > 0) {
          const vectors = h3Utils.computeFlowVectors(currentPositions, previousPositions.current);
          flowVectorsRef.current = vectors;
          setFlowVectors(vectors);
        }
        previousPositions.current = currentPositions;

        // Check surge conditions using ref (no stale closure)
        if (surgeDetector) {
          const alerts = surgeDetector.checkSurgeConditions(densityMap, flowVectorsRef.current);
          setSurgeAlerts(alerts);
          if (alerts.length > 0) {
            surgeDetector.publishSurgeAlerts(alerts).catch(console.warn);
          }
        }
      }
    } catch (err) {
      console.warn('H3 computation error:', err);
    }
  }, []); // no flowVectors dependency — use ref instead to avoid infinite loop

  useEffect(() => {
    async function init() {
      try {
        // Load zones for sidebar
        const zoneData = await fetchZones();
        setZones(zoneData);

        // Try to load H3 modules
        await loadH3Modules();

        // Initial GPS fetch
        await fetchAndComputeH3();
      } catch (err) {
        console.error('Heatmap init error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();

    // Realtime subscriptions
    const zonesChannel = supabase
      .channel('heatmap-zones-v2')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'zones' }, (payload) => {
        setZones(prev => prev.map(z => z.id === payload.new.id ? payload.new : z));
      })
      .subscribe();

    const attendeeChannel = supabase
      .channel('heatmap-attendees-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendee_locations' }, () => {
        fetchAndComputeH3();
      })
      .subscribe();

    // Refresh every 15 seconds
    const interval = setInterval(fetchAndComputeH3, 15000);

    return () => {
      supabase.removeChannel(zonesChannel);
      supabase.removeChannel(attendeeChannel);
      clearInterval(interval);
    };
  }, [fetchAndComputeH3]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Topbar title="Live Venue Heatmap" subtitle="Loading H3 grid data..." onToggleSidebar={() => setSidebarOpen(o => !o)} sidebarOpen={sidebarOpen} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
          <div className="spinner" style={{ border: '4px solid rgba(99,102,241,0.1)', borderLeft: '4px solid var(--primary)', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  const totalCapacity = zones.reduce((sum, z) => sum + (z.capacity || 0), 0);
  const criticalZones = zones.filter(z => (z.density || 0) >= 80).length;
  const hexCritical = Array.from(hexDensityMap.values()).filter(d => d.density_per_sqm >= 4.0).length;
  const peakDensity = hexDensityMap.size > 0
    ? Math.max(...Array.from(hexDensityMap.values()).map(d => d.density_per_sqm))
    : 0;

  // Map center
  const mapCenter = zones.length > 0
    ? [zones.reduce((s, z) => s + z.lat, 0) / zones.length, zones.reduce((s, z) => s + z.lng, 0) / zones.length]
    : [12.8523, 80.0514];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Live Venue Heatmap" subtitle={hexMode ? 'H3 hexagonal density grid · persons/m²' : 'Real-time GPS tracking'} onToggleSidebar={() => setSidebarOpen(o => !o)} sidebarOpen={sidebarOpen} />
      <div className="page-body">

        {/* Stats Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Radio size={18} color="#6366F1" />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalTracked}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>GPS Tracked</div>
            </div>
          </div>
          <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={18} color="#10B981" />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{hexDensityMap.size || zones.length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{hexMode ? 'Active Hex Cells' : 'Active Zones'}</div>
            </div>
          </div>
          <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} color="#F59E0B" />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{peakDensity.toFixed(1)}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Peak /m²</div>
            </div>
          </div>
          <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: (hexCritical > 0 || surgeAlerts.length > 0) ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(hexCritical > 0 || surgeAlerts.length > 0) ? <AlertTriangle size={18} color="#EF4444" /> : <Shield size={18} color="#10B981" />}
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: (hexCritical > 0 || surgeAlerts.length > 0) ? '#EF4444' : 'var(--text-primary)' }}>{surgeAlerts.length || hexCritical}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Surge Alerts</div>
            </div>
          </div>
        </div>

        <div className="grid-main-aside" style={{ alignItems: 'start' }}>
          {/* Map */}
          <div className="card" style={{ overflow: 'hidden', position: 'relative' }}>
            <div className="card-header">
              <span className="card-title">🗺️ {hexMode ? 'H3 Hex Density Grid' : 'Live Venue Heatmap'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={fetchAndComputeH3} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <RefreshCw size={11} /> Refresh
                </button>
                {hexMode && (
                  <span style={{ fontSize: '0.68rem', color: '#6366F1', fontWeight: 700, background: 'rgba(99,102,241,0.08)', padding: '3px 8px', borderRadius: 6 }}>
                    H3 RES-9
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                  <Wifi size={13} /> Live GPS
                </div>
              </div>
            </div>
            <div style={{ height: 520, margin: '12px 16px 16px', position: 'relative' }}>
              {/* Surge Alerts Banner */}
              <SurgeBanner surgeAlerts={surgeAlerts} />

              <MapContainer
                center={mapCenter}
                zoom={17}
                style={{ height: '100%', width: '100%', borderRadius: 10 }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* H3 Hex Grid Layer */}
                {hexMode && h3Utils && (
                  <>
                    <HexLayer
                      hexDensityMap={hexDensityMap}
                      getDensityColor={h3Utils.getDensityColor}
                      getDensityLevel={h3Utils.getDensityLevel}
                    />
                    <FlowArrows flowVectors={flowVectors} />
                    <AutoCenter hexDensityMap={hexDensityMap} />
                  </>
                )}
              </MapContainer>
            </div>
            <MapLegend mode={hexMode ? 'hex' : 'zone'} />
          </div>

          {/* Side Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Surge Alerts Panel */}
            {surgeAlerts.length > 0 && (
              <div className="card fade-in">
                <div className="card-header">
                  <span className="card-title" style={{ color: '#EF4444' }}>🚨 Active Surge Alerts</span>
                </div>
                <div className="card-body" style={{ paddingTop: 10 }}>
                  {surgeAlerts.map((alert, i) => (
                    <div key={i} style={{
                      padding: '10px 12px', borderRadius: 8, marginBottom: 6,
                      background: 'rgba(239,68,68,0.05)',
                      border: '1px solid rgba(239,68,68,0.2)',
                    }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#EF4444', marginBottom: 2 }}>
                        {alert.type === 'CRUSH_RISK' ? '🚨 CRUSH RISK' : '⚠️ HIGH DENSITY'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{alert.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hex Cell Stats (if H3 mode) */}
            {hexMode && hexDensityMap.size > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Hex Cell Stats</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {hexDensityMap.size} cells
                  </span>
                </div>
                <div className="card-body" style={{ paddingTop: 10 }}>
                  {Array.from(hexDensityMap.entries())
                    .sort(([, a], [, b]) => b.density_per_sqm - a.density_per_sqm)
                    .slice(0, 8)
                    .map(([h3Index, data]) => {
                      const color = h3Utils ? h3Utils.getDensityColor(data.density_per_sqm) : '#10B981';
                      const level = h3Utils ? h3Utils.getDensityLevel(data.density_per_sqm) : 'SAFE';
                      return (
                        <div key={h3Index} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 10px', borderRadius: 8, marginBottom: 4,
                          border: `1px solid ${data.density_per_sqm >= 4.0 ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
                          background: data.density_per_sqm >= 4.0 ? 'rgba(239,68,68,0.03)' : 'var(--bg)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 10, height: 10, borderRadius: 2, background: color,
                              boxShadow: data.density_per_sqm >= 4.0 ? '0 0 6px rgba(239,68,68,0.5)' : 'none',
                            }} />
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                {h3Index.slice(-6)}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                {data.count} people · {level}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{data.density_per_sqm.toFixed(1)} /m²</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* All Zones List (always shown) */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title">Zones ({zones.length})</span>
                {lastRefresh && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Updated {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="card-body" style={{ paddingTop: 10 }}>
                {zones.map(zone => {
                  const pct = zone.density || 0;
                  const color = fallbackDensityColor(pct);
                  const gpsCount = attendeeCounts[zone.id] || 0;
                  return (
                    <div
                      key={zone.id}
                      onClick={() => setSelectedZone(selectedZone?.id === zone.id ? null : zone)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                        border: `1px solid ${pct >= 80 ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
                        background: selectedZone?.id === zone.id ? 'var(--primary-light)' : pct >= 80 ? 'rgba(239,68,68,0.03)' : 'var(--bg)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: '50%', background: color,
                          boxShadow: pct >= 80 ? '0 0 6px rgba(239,68,68,0.5)' : 'none',
                        }} />
                        <div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{zone.name}</span>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>
                            {gpsCount > 0 ? `${gpsCount} tracked` : 'No devices'} · Cap: {zone.capacity}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
