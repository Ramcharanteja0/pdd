import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Wifi, Users, Radio, RefreshCw } from 'lucide-react';
import Topbar from '../components/Topbar';
import { getDensityLevel, getDensityColor } from '../data/mockData';
import { fetchZones } from '../lib/supabaseService';
import { supabase } from '../lib/supabase';

function MapLegend() {
  return (
    <div style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 1000, background: 'white', borderRadius: 12, padding: '14px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>Crowd Density</p>
      {[['#10B981', 'Safe (< 55%)'], ['#F59E0B', 'Moderate (55–80%)'], ['#EF4444', 'Critical (> 80%)']].map(([color, label]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, opacity: 0.85 }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Heatmap({ sidebarOpen, setSidebarOpen }) {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendeeCounts, setAttendeeCounts] = useState({});
  const [totalTracked, setTotalTracked] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Fetch real attendee counts from GPS tracking table
  const fetchAttendeeCounts = useCallback(async () => {
    try {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('attendee_locations')
        .select('zone_id, zone_name')
        .gte('updated_at', tenMinAgo)
        .eq('event_id', 'current');

      if (error) {
        console.warn('attendee_locations table may not exist yet:', error.message);
        return;
      }

      const counts = {};
      let total = 0;
      (data || []).forEach(row => {
        const key = row.zone_id;
        if (key) {
          counts[key] = (counts[key] || 0) + 1;
        }
        total++;
      });
      setAttendeeCounts(counts);
      setTotalTracked(total);
      setLastRefresh(new Date());
    } catch (err) {
      console.warn('GPS tracking fetch error:', err);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchZones();
        setZones(data);
      } catch (err) {
        console.error('Error loading heatmap zones:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    fetchAttendeeCounts();

    // Supabase Realtime for zone updates
    const zonesChannel = supabase
      .channel('heatmap-zones-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'zones' }, (payload) => {
        setZones(prev => prev.map(z => z.id === payload.new.id ? payload.new : z));
        setSelectedZone(prev => prev && prev.id === payload.new.id ? payload.new : prev);
      })
      .subscribe();

    // Supabase Realtime for attendee location changes
    const attendeeChannel = supabase
      .channel('heatmap-attendees-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendee_locations' }, () => {
        fetchAttendeeCounts();
      })
      .subscribe();

    // Auto-refresh attendee counts every 20 seconds
    const interval = setInterval(fetchAttendeeCounts, 20000);

    return () => {
      supabase.removeChannel(zonesChannel);
      supabase.removeChannel(attendeeChannel);
      clearInterval(interval);
    };
  }, [fetchAttendeeCounts]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Topbar title="Live Venue Heatmap" subtitle="Loading map data..." onToggleSidebar={() => setSidebarOpen(o => !o)} sidebarOpen={sidebarOpen} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
          <div className="spinner" style={{ border: '4px solid rgba(99,102,241,0.1)', borderLeft: '4px solid var(--primary)', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  const totalCapacity = zones.reduce((sum, z) => sum + (z.capacity || 0), 0);
  const criticalZones = zones.filter(z => (z.density || 0) >= 80).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Live Venue Heatmap" subtitle="Real-time crowd density from GPS tracking" onToggleSidebar={() => setSidebarOpen(o => !o)} sidebarOpen={sidebarOpen} />
      <div className="page-body">

        {/* Live Stats Bar */}
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
              <Users size={18} color="#10B981" />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{zones.length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Zones</div>
            </div>
          </div>
          <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#F59E0B" />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalCapacity.toLocaleString()}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Capacity</div>
            </div>
          </div>
          <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: criticalZones > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {criticalZones > 0 ? <Users size={18} color="#EF4444" /> : <Users size={18} color="#10B981" />}
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: criticalZones > 0 ? '#EF4444' : 'var(--text-primary)' }}>{criticalZones}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Critical Zones</div>
            </div>
          </div>
        </div>

        <div className="grid-main-aside" style={{ alignItems: 'start' }}>
          {/* Map */}
          <div className="card" style={{ overflow: 'hidden', position: 'relative' }}>
            <div className="card-header">
              <span className="card-title">🗺️ Live Venue Heatmap</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={fetchAttendeeCounts} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <RefreshCw size={11} /> Refresh
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                  <Wifi size={13} /> Live GPS Feed
                </div>
              </div>
            </div>
            <div style={{ height: 520, margin: '12px 16px 16px' }}>
              <MapContainer
                center={zones.length > 0 ? [zones.reduce((s,z) => s + z.lat, 0) / zones.length, zones.reduce((s,z) => s + z.lng, 0) / zones.length] : [12.8523, 80.0514]}
                zoom={17}
                style={{ height: '100%', width: '100%', borderRadius: 10 }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {zones.map(zone => {
                  const gpsCount = attendeeCounts[zone.id] || 0;
                  const pct = zone.density || 0;
                  const color = getDensityColor(pct);
                  const radius = 20 + (pct / 100) * 30;
                  return (
                    <CircleMarker
                      key={zone.id}
                      center={[zone.lat, zone.lng]}
                      radius={radius}
                      pathOptions={{
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.45,
                        weight: 2,
                      }}
                      eventHandlers={{ click: () => setSelectedZone(zone) }}
                    >
                      <Popup>
                        <div style={{ minWidth: 200 }}>
                          <strong style={{ fontSize: '0.95rem' }}>{zone.name}</strong>
                          <div style={{ marginTop: 8, fontSize: '0.82rem', color: '#475569', lineHeight: 1.7 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Density:</span>
                              <strong style={{ color }}>{pct}%</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Capacity:</span>
                              <strong>{zone.capacity}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>GPS Tracked:</span>
                              <strong style={{ color: '#6366F1' }}>{gpsCount} people</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Status:</span>
                              <strong>{getDensityLevel(pct).toUpperCase()}</strong>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
            <MapLegend />
          </div>

          {/* Side Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Selected Zone Detail */}
            {selectedZone && (() => {
              const pct = selectedZone.density || 0;
              const level = getDensityLevel(pct);
              const color = getDensityColor(pct);
              const gpsCount = attendeeCounts[selectedZone.id] || 0;
              return (
                <div className="card fade-in">
                  <div className="card-header">
                    <span className="card-title">Zone Detail</span>
                    <button onClick={() => setSelectedZone(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}>✕</button>
                  </div>
                  <div className="card-body">
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <div style={{ fontSize: '3rem', fontWeight: 900, color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{pct}%</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 4, fontSize: '1.1rem' }}>{selectedZone.name}</div>
                      <span className={`badge-status ${level}`} style={{ marginTop: 8, display: 'inline-flex' }}>{level}</span>
                    </div>
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.82rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Capacity</span>
                        <span style={{ fontWeight: 700 }}>{selectedZone.capacity}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.82rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Estimated Occupancy</span>
                        <span style={{ fontWeight: 700 }}>{Math.round(selectedZone.capacity * pct / 100)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.82rem' }}>
                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Radio size={12} color="#6366F1" /> GPS Tracked
                        </span>
                        <span style={{ fontWeight: 700, color: '#6366F1' }}>{gpsCount} people</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* All Zones List */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title">All Zones ({zones.length})</span>
                {lastRefresh && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Updated {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="card-body" style={{ paddingTop: 10 }}>
                {zones.map(zone => {
                  const pct = zone.density || 0;
                  const color = getDensityColor(pct);
                  const gpsCount = attendeeCounts[zone.id] || 0;
                  return (
                    <div
                      key={zone.id}
                      onClick={() => setSelectedZone(zone)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                        border: `1px solid ${pct >= 80 ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
                        background: selectedZone?.id === zone.id ? 'var(--primary-light)' : pct >= 80 ? 'rgba(239,68,68,0.03)' : 'var(--bg)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: '50%', background: color,
                          boxShadow: pct >= 80 ? '0 0 6px rgba(239,68,68,0.5)' : 'none'
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
