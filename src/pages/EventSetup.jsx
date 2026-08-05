/**
 * EventSetup.jsx — Admin Event Location & Zone Configuration
 *
 * Flow:
 * 1. Admin searches for venue by name (Nominatim geocoding)
 * 2. Map auto-centers to venue
 * 3. Admin clicks on map to place zone pins
 * 4. Sets name, capacity, radius for each zone
 * 5. Saves everything to Supabase
 *
 * The entire app (heatmap, check-in, dashboard) dynamically uses these values.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Search, Plus, Trash2, Save, Edit3, Navigation, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import Topbar from '../components/Topbar';
import { supabase } from '../lib/supabase';
import L from 'leaflet';

// Custom marker icons
const venueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const zoneIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

// Map click handler component
function MapClickHandler({ onMapClick, isPlacingZone }) {
  useMapEvents({
    click(e) {
      if (isPlacingZone) onMapClick(e.latlng);
    },
  });
  return null;
}

// Auto-fly to center component
function FlyToCenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 17, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

export default function EventSetup({ sidebarOpen, setSidebarOpen }) {
  // Event details
  const [eventName, setEventName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [totalCapacity, setTotalCapacity] = useState(5000);

  // Map state
  const [venueCenter, setVenueCenter] = useState(null);
  const [mapCenter, setMapCenter] = useState([12.8523, 80.0514]); // default SIMATS
  const [zones, setZones] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // UI state
  const [isPlacingZone, setIsPlacingZone] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error'
  const [loading, setLoading] = useState(true);

  // New zone form
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCapacity, setNewZoneCapacity] = useState(500);
  const [newZoneRadius, setNewZoneRadius] = useState(50);
  const [pendingLatLng, setPendingLatLng] = useState(null);

  // Load existing event + zones from Supabase
  useEffect(() => {
    async function loadExisting() {
      try {
        // Load event info
        const { data: evt } = await supabase.from('events').select('*').eq('id', 'current').maybeSingle();
        if (evt) {
          setEventName(evt.name || '');
          setVenueName(evt.venue || '');
          setCity(evt.city || '');
          setEventDate(evt.date || '');
          setTotalCapacity(evt.total_capacity || 5000);
          if (evt.venue_lat && evt.venue_lng) {
            setVenueCenter([evt.venue_lat, evt.venue_lng]);
            setMapCenter([evt.venue_lat, evt.venue_lng]);
          }
        }

        // Load zones
        const { data: zoneData } = await supabase.from('zones').select('*').order('id');
        if (zoneData && zoneData.length > 0) {
          setZones(zoneData.map(z => ({
            id: z.id,
            name: z.name,
            lat: z.lat,
            lng: z.lng,
            capacity: z.capacity,
            radius: z.radius_meters || 50,
            density: z.density || 0,
          })));
          // Center on zones if no venue center
          if (!venueCenter) {
            const avgLat = zoneData.reduce((s, z) => s + z.lat, 0) / zoneData.length;
            const avgLng = zoneData.reduce((s, z) => s + z.lng, 0) / zoneData.length;
            setMapCenter([avgLat, avgLng]);
          }
        }
      } catch (err) {
        console.error('Failed to load event data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadExisting();
  }, []);

  // Search venue by name (Nominatim free geocoding)
  const searchVenue = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await resp.json();
      setSearchResults(data.map(r => ({
        name: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      })));
    } catch (err) {
      console.error('Geocoding error:', err);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // Select a search result
  const selectVenue = (result) => {
    setVenueCenter([result.lat, result.lng]);
    setMapCenter([result.lat, result.lng]);
    setVenueName(result.name.split(',')[0]); // First part of name
    setCity(result.name.split(',').slice(-2).join(',').trim());
    setSearchResults([]);
    setSearchQuery('');
  };

  // Handle map click (place new zone)
  const handleMapClick = (latlng) => {
    setPendingLatLng(latlng);
    setNewZoneName('');
    setNewZoneCapacity(500);
    setNewZoneRadius(50);
  };

  // Confirm new zone placement
  const confirmZone = () => {
    if (!pendingLatLng || !newZoneName.trim()) return;
    const newZone = {
      id: `Z${zones.length + 1}`,
      name: newZoneName.trim(),
      lat: pendingLatLng.lat,
      lng: pendingLatLng.lng,
      capacity: newZoneCapacity,
      radius: newZoneRadius,
      density: 0,
      isNew: true,
    };
    setZones(prev => [...prev, newZone]);
    setPendingLatLng(null);
    setNewZoneName('');
    setIsPlacingZone(false);
  };

  // Delete a zone
  const deleteZone = (zoneId) => {
    setZones(prev => prev.filter(z => z.id !== zoneId));
  };

  // Save everything to Supabase
  const saveToSupabase = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      // 1. Upsert event info
      const eventData = {
        id: 'current',
        name: eventName || 'Untitled Event',
        venue: venueName,
        city: city,
        date: eventDate || new Date().toISOString().split('T')[0],
        total_capacity: totalCapacity,
        venue_lat: venueCenter?.[0] || mapCenter[0],
        venue_lng: venueCenter?.[1] || mapCenter[1],
      };

      const { error: evtErr } = await supabase.from('events').upsert(eventData, { onConflict: 'id' });
      if (evtErr) console.warn('Event upsert warning:', evtErr.message);

      // 2. Delete old zones not in current list
      const currentIds = zones.map(z => z.id);
      await supabase.from('zones').delete().not('id', 'in', `(${currentIds.join(',')})`);

      // 3. Upsert all zones
      for (const zone of zones) {
        const zoneRow = {
          id: zone.id,
          name: zone.name,
          lat: zone.lat,
          lng: zone.lng,
          capacity: zone.capacity,
          radius_meters: zone.radius,
          density: zone.density || 0,
        };
        const { error } = await supabase.from('zones').upsert(zoneRow, { onConflict: 'id' });
        if (error) console.warn(`Zone ${zone.id} upsert error:`, error.message);
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Topbar title="Event Setup" subtitle="Loading..." onToggleSidebar={() => setSidebarOpen(o => !o)} sidebarOpen={sidebarOpen} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
          <div className="spinner" style={{ border: '4px solid rgba(99,102,241,0.1)', borderLeft: '4px solid var(--primary)', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar
        title="Event Setup"
        subtitle="Configure event location, venue, and crowd zones"
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        sidebarOpen={sidebarOpen}
      />
      <div className="page-body">

        {/* Save Status Banner */}
        {saveStatus && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 16px',
            background: saveStatus === 'success' ? '#D1FAE5' : '#FEE2E2',
            border: `1px solid ${saveStatus === 'success' ? '#A7F3D0' : '#FECACA'}`,
            borderRadius: 10, fontSize: '0.82rem', fontWeight: 600,
            color: saveStatus === 'success' ? '#065F46' : '#991B1B',
          }}>
            {saveStatus === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {saveStatus === 'success' ? 'Event configuration saved! Heatmap and check-in pages are now using your zones.' : 'Failed to save. Check console for details.'}
          </div>
        )}

        <div className="grid-main-aside" style={{ alignItems: 'start' }}>

          {/* LEFT: Map + Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Venue Search */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📍 Find Your Venue</span>
              </div>
              <div className="card-body" style={{ paddingTop: 10 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchVenue()}
                    placeholder='Search: "Saveetha Engineering College"'
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 8,
                      border: '1px solid var(--border)', fontSize: '0.85rem',
                      background: 'var(--bg)', color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={searchVenue}
                    disabled={searching}
                    style={{
                      padding: '10px 16px', borderRadius: 8, border: 'none',
                      background: 'var(--primary)', color: 'white', cursor: 'pointer',
                      fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {searching ? <Loader size={14} className="spin" /> : <Search size={14} />}
                    Search
                  </button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div style={{ marginTop: 10, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    {searchResults.map((r, i) => (
                      <div
                        key={i}
                        onClick={() => selectVenue(r)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer', fontSize: '0.8rem',
                          borderBottom: i < searchResults.length - 1 ? '1px solid var(--border)' : 'none',
                          background: 'var(--bg)', transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.target.style.background = 'var(--primary-light)'}
                        onMouseLeave={e => e.target.style.background = 'var(--bg)'}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          <MapPin size={12} style={{ marginRight: 4 }} />
                          {r.name.split(',')[0]}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {r.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {venueCenter && (
                  <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Navigation size={12} color="#6366F1" />
                    Venue: {venueCenter[0].toFixed(6)}, {venueCenter[1].toFixed(6)}
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Map */}
            <div className="card" style={{ overflow: 'hidden', position: 'relative' }}>
              <div className="card-header">
                <span className="card-title">🗺️ Zone Map</span>
                <button
                  onClick={() => { setIsPlacingZone(!isPlacingZone); setPendingLatLng(null); }}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: isPlacingZone ? '#EF4444' : 'var(--primary)', color: 'white',
                    fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {isPlacingZone ? <><Trash2 size={12} /> Cancel</> : <><Plus size={12} /> Add Zone</>}
                </button>
              </div>

              {isPlacingZone && !pendingLatLng && (
                <div style={{
                  background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 8, padding: '8px 14px', margin: '0 16px', fontSize: '0.78rem',
                  color: '#6366F1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <MapPin size={14} /> Click on the map to place a new zone
                </div>
              )}

              {/* New zone form (appears after clicking map) */}
              {pendingLatLng && (
                <div style={{
                  background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 8, padding: '12px 14px', margin: '8px 16px',
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    📍 New zone at {pendingLatLng.lat.toFixed(5)}, {pendingLatLng.lng.toFixed(5)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 8 }}>
                    <input
                      type="text" placeholder="Zone name (e.g. Main Stage)"
                      value={newZoneName} onChange={e => setNewZoneName(e.target.value)}
                      autoFocus
                      style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.8rem', background: 'white' }}
                    />
                    <input
                      type="number" placeholder="Cap" value={newZoneCapacity}
                      onChange={e => setNewZoneCapacity(parseInt(e.target.value) || 0)}
                      style={{ padding: '8px 6px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.8rem', background: 'white', textAlign: 'center' }}
                    />
                    <input
                      type="number" placeholder="Radius" value={newZoneRadius}
                      onChange={e => setNewZoneRadius(parseInt(e.target.value) || 30)}
                      style={{ padding: '8px 6px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.8rem', background: 'white', textAlign: 'center' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Name · Capacity · Radius (meters)
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={confirmZone} disabled={!newZoneName.trim()} style={{
                      padding: '6px 14px', borderRadius: 6, border: 'none', background: '#10B981',
                      color: 'white', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', opacity: newZoneName.trim() ? 1 : 0.5,
                    }}>
                      <CheckCircle size={12} style={{ marginRight: 4 }} /> Add Zone
                    </button>
                    <button onClick={() => setPendingLatLng(null)} style={{
                      padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)',
                      background: 'white', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                    }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div style={{ height: 420, margin: '12px 16px 16px' }}>
                <MapContainer center={mapCenter} zoom={17} style={{ height: '100%', width: '100%', borderRadius: 10 }} zoomControl={true}>
                  <TileLayer
                    attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <FlyToCenter center={mapCenter} zoom={17} />
                  <MapClickHandler onMapClick={handleMapClick} isPlacingZone={isPlacingZone} />

                  {/* Venue center marker */}
                  {venueCenter && (
                    <Marker position={venueCenter} icon={venueIcon}>
                      <Popup><strong>📍 Venue Center</strong><br />{venueName}</Popup>
                    </Marker>
                  )}

                  {/* Zone markers + radius circles */}
                  {zones.map(zone => (
                    <div key={zone.id}>
                      <Circle
                        center={[zone.lat, zone.lng]}
                        radius={zone.radius}
                        pathOptions={{
                          color: '#6366F1', fillColor: '#6366F1',
                          fillOpacity: 0.12, weight: 1.5, dashArray: '4 4',
                        }}
                      />
                      <Marker position={[zone.lat, zone.lng]} icon={zoneIcon}>
                        <Popup>
                          <div style={{ minWidth: 160 }}>
                            <strong>{zone.name}</strong>
                            <div style={{ fontSize: '0.78rem', marginTop: 4, color: '#475569' }}>
                              Capacity: {zone.capacity}<br />
                              Radius: {zone.radius}m<br />
                              ID: {zone.id}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    </div>
                  ))}

                  {/* Pending zone marker */}
                  {pendingLatLng && (
                    <>
                      <Circle
                        center={[pendingLatLng.lat, pendingLatLng.lng]}
                        radius={newZoneRadius}
                        pathOptions={{ color: '#10B981', fillColor: '#10B981', fillOpacity: 0.15, weight: 2 }}
                      />
                      <Marker position={[pendingLatLng.lat, pendingLatLng.lng]} icon={zoneIcon}>
                        <Popup>New zone: {newZoneName || '(unnamed)'}</Popup>
                      </Marker>
                    </>
                  )}
                </MapContainer>
              </div>
            </div>
          </div>

          {/* RIGHT: Event Details + Zone List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Event Details Form */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📋 Event Details</span>
              </div>
              <div className="card-body" style={{ paddingTop: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Event Name</label>
                    <input type="text" value={eventName} onChange={e => setEventName(e.target.value)}
                      placeholder="Tech Summit 2026"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Venue</label>
                    <input type="text" value={venueName} onChange={e => setVenueName(e.target.value)}
                      placeholder="Saveetha Engineering College"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>City</label>
                      <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Chennai"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Date</label>
                      <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Total Capacity</label>
                    <input type="number" value={totalCapacity} onChange={e => setTotalCapacity(parseInt(e.target.value) || 0)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Zone List */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">🎯 Zones ({zones.length})</span>
                <button
                  onClick={() => { setIsPlacingZone(true); setPendingLatLng(null); }}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Plus size={11} /> Add
                </button>
              </div>
              <div className="card-body" style={{ paddingTop: 10, maxHeight: 350, overflowY: 'auto' }}>
                {zones.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No zones configured. Click "Add Zone" and click on the map to place zones.
                  </div>
                ) : (
                  zones.map(zone => (
                    <div key={zone.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: 8, marginBottom: 4,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin size={14} color="#6366F1" />
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{zone.name}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            Cap: {zone.capacity} · {zone.radius}m · {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteZone(zone.id)}
                        style={{
                          padding: '4px 6px', borderRadius: 4, border: 'none',
                          background: 'rgba(239,68,68,0.08)', color: '#EF4444', cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={saveToSupabase}
              disabled={saving || zones.length === 0}
              style={{
                width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
                background: saving ? '#94A3B8' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {saving ? <><Loader size={16} /> Saving...</> : <><Save size={16} /> Save Event Configuration</>}
            </button>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
              Saves to Supabase. The heatmap, check-in page, and dashboard will immediately use your new zones.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
