import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { supabase } from '../services/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Venue Zone Definitions ────────────────────────────────
const VENUE_ZONES = [
  {
    id: '1', name: 'Main Stage Arena',
    center: [15.8281, 78.0373],
    color: '#EF4444',
    polygon: [
      [15.8291, 78.0363],
      [15.8291, 78.0383],
      [15.8271, 78.0383],
      [15.8271, 78.0363],
    ],
  },
  {
    id: '2', name: 'Food Court & Plaza',
    center: [15.8265, 78.0395],
    color: '#F59E0B',
    polygon: [
      [15.8273, 78.0387],
      [15.8273, 78.0403],
      [15.8257, 78.0403],
      [15.8257, 78.0387],
    ],
  },
  {
    id: '3', name: 'North Gate Entrance',
    center: [15.8300, 78.0380],
    color: '#10B981',
    polygon: [
      [15.8307, 78.0373],
      [15.8307, 78.0387],
      [15.8293, 78.0387],
      [15.8293, 78.0373],
    ],
  },
  {
    id: '4', name: 'VIP Pavilion',
    center: [15.8275, 78.0350],
    color: '#8B5CF6',
    polygon: [
      [15.8281, 78.0343],
      [15.8281, 78.0357],
      [15.8269, 78.0357],
      [15.8269, 78.0343],
    ],
  },
  {
    id: '5', name: 'Parking Zone A',
    center: [15.8310, 78.0350],
    color: '#06B6D4',
    polygon: [
      [15.8318, 78.0340],
      [15.8318, 78.0360],
      [15.8302, 78.0360],
      [15.8302, 78.0340],
    ],
  },
];

function getDensityColor(pct) {
  if (pct >= 80) return '#EF4444';
  if (pct >= 50) return '#F59E0B';
  if (pct >= 30) return '#3B82F6';
  return '#10B981';
}

function getDensityLabel(pct) {
  if (pct >= 80) return 'CRITICAL';
  if (pct >= 50) return 'MODERATE';
  if (pct >= 30) return 'NORMAL';
  return 'SAFE';
}

export default function MapScreen() {
  const webViewRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [zones, setZones] = useState(
    VENUE_ZONES.map(z => ({
      ...z,
      current_count: 3500,
      max_capacity: 10000,
      density: 45,
      trend: 'stable',
    }))
  );
  const [selectedZone, setSelectedZone] = useState(null);
  const [attendeeCount, setAttendeeCount] = useState(17500);
  const [trackingActive, setTrackingActive] = useState(false);
  const locationSubscription = useRef(null);

  // Fetch zone telemetry from Supabase
  const fetchZoneData = async () => {
    try {
      const { data, error } = await supabase.from('zones').select('*');
      if (!error && data && data.length > 0) {
        const merged = VENUE_ZONES.map((vz) => {
          const dbZone = data.find((d) => String(d.id) === vz.id || d.name === vz.name);
          const density = dbZone?.density || Math.floor(Math.random() * 85) + 15;
          return {
            ...vz,
            current_count: dbZone?.current_count || Math.round(10000 * density / 100),
            max_capacity: dbZone?.capacity || 10000,
            density,
            trend: dbZone?.trend || 'stable',
          };
        });
        setZones(merged);
        setAttendeeCount(merged.reduce((s, z) => s + z.current_count, 0));
        updateMapData(merged, userLocation);
      } else {
        const mock = VENUE_ZONES.map((vz) => {
          const density = Math.floor(Math.random() * 80) + 15;
          return {
            ...vz,
            current_count: Math.round(10000 * density / 100),
            max_capacity: 10000,
            density,
            trend: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)],
          };
        });
        setZones(mock);
        setAttendeeCount(mock.reduce((s, z) => s + z.current_count, 0));
        updateMapData(mock, userLocation);
      }
    } catch (err) {
      // Fallback update
    }
  };

  // Start live GPS tracking
  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const loc = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };

      setUserLocation(loc);
      setTrackingActive(true);
      updateMapData(zones, loc);

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,
          timeInterval: 10000,
        },
        (newLoc) => {
          const updatedLoc = {
            lat: newLoc.coords.latitude,
            lng: newLoc.coords.longitude,
            accuracy: newLoc.coords.accuracy,
          };
          setUserLocation(updatedLoc);
          updateMapData(zones, updatedLoc);
        }
      );
    } catch (err) {
      // Standby GPS mode
    }
  };

  // Update map layer via postMessage
  const updateMapData = (zoneList, loc) => {
    if (webViewRef.current) {
      const payload = JSON.stringify({
        type: 'UPDATE_MAP',
        zones: zoneList,
        userLocation: loc,
      });
      webViewRef.current.postMessage(payload);
    }
  };

  const centerOnUser = () => {
    if (userLocation && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'CENTER_USER' }));
    } else {
      Alert.alert('GPS Location', 'Locking onto your position...');
    }
  };

  const centerOnVenue = () => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'CENTER_VENUE' }));
    }
  };

  useEffect(() => {
    fetchZoneData();
    startLocationTracking();
    const interval = setInterval(fetchZoneData, 10000);
    return () => {
      clearInterval(interval);
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const trendArrow = (trend) => {
    if (trend === 'increasing') return '↑';
    if (trend === 'decreasing') return '↓';
    return '→';
  };

  // Leaflet OpenStreetMap HTML source
  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #0F172A; }
        .zone-popup { font-family: system-ui, sans-serif; padding: 4px; }
        .zone-popup h4 { margin: 0 0 4px 0; font-size: 14px; font-weight: 800; color: #0F172A; }
        .zone-popup p { margin: 0; font-size: 12px; color: #475569; }
        .user-marker {
          width: 16px; height: 16px; background: #3B82F6; border: 3px solid #FFFFFF;
          border-radius: 50%; box-shadow: 0 0 10px rgba(59,130,246,0.8);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const venueCenter = [15.8281, 78.0373];
        const map = L.map('map', { zoomControl: false }).setView(venueCenter, 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: 'OpenStreetMap'
        }).addTo(map);

        let zoneLayers = [];
        let userMarker = null;
        let lastUserLoc = null;

        function getDensityColor(pct) {
          if (pct >= 80) return '#EF4444';
          if (pct >= 50) return '#F59E0B';
          if (pct >= 30) return '#3B82F6';
          return '#10B981';
        }

        function updateMap(zones, userLoc) {
          zoneLayers.forEach(l => map.removeLayer(l));
          zoneLayers = [];

          if (zones && zones.length) {
            zones.forEach(z => {
              const color = getDensityColor(z.density);
              if (z.polygon) {
                const poly = L.polygon(z.polygon, {
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.35,
                  weight: 2
                }).addTo(map);
                poly.bindPopup('<div class="zone-popup"><h4>' + z.name + '</h4><p>Density: <b>' + z.density + '%</b> (' + z.current_count + ' attendees)</p></div>');
                zoneLayers.push(poly);
              }
              const circle = L.circle(z.center, {
                radius: 60,
                color: color,
                fillColor: color,
                fillOpacity: 0.2,
                weight: 1
              }).addTo(map);
              zoneLayers.push(circle);
            });
          }

          if (userLoc && userLoc.lat && userLoc.lng) {
            lastUserLoc = [userLoc.lat, userLoc.lng];
            if (!userMarker) {
              const userIcon = L.divIcon({ className: 'user-marker', iconSize: [16, 16] });
              userMarker = L.marker([userLoc.lat, userLoc.lng], { icon: userIcon }).addTo(map);
            } else {
              userMarker.setLatLng([userLoc.lat, userLoc.lng]);
            }
          }
        }

        document.addEventListener('message', function(e) {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'UPDATE_MAP') {
              updateMap(data.zones, data.userLocation);
            } else if (data.type === 'CENTER_USER' && lastUserLoc) {
              map.setView(lastUserLoc, 17, { animate: true });
            } else if (data.type === 'CENTER_VENUE') {
              map.setView(venueCenter, 16, { animate: true });
            }
          } catch (err) {}
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.topBarTitle}>Live Venue Map</Text>
          <Text style={styles.topBarSub}>
            {attendeeCount.toLocaleString()} attendees tracked
          </Text>
        </View>
        <View style={styles.topBarRight}>
          <View style={[styles.livePulse, trackingActive && styles.livePulseActive]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>{trackingActive ? 'GPS ACTIVE' : 'GPS STANDBY'}</Text>
          </View>
        </View>
      </View>

      {/* Interactive Map WebView */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: leafletHTML }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          onLoadEnd={() => updateMapData(zones, userLocation)}
        />

        {/* Floating Controls */}
        <View style={styles.floatingControls}>
          <TouchableOpacity style={styles.floatingBtn} onPress={centerOnUser}>
            <Text style={styles.floatingBtnIcon}>📍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.floatingBtn} onPress={centerOnVenue}>
            <Text style={styles.floatingBtnIcon}>🏟️</Text>
          </TouchableOpacity>
        </View>

        {/* GPS Accuracy Badge */}
        {userLocation && (
          <View style={styles.gpsBadge}>
            <Text style={styles.gpsBadgeText}>
              GPS ±{Math.round(userLocation.accuracy || 0)}m
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Zone Cards */}
      <ScrollView
        style={styles.bottomPanel}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bottomPanelContent}
      >
        {zones.map((zone) => {
          const pct = zone.density || 0;
          const isSelected = selectedZone?.id === zone.id;

          return (
            <TouchableOpacity
              key={zone.id}
              style={[
                styles.zoneCard,
                isSelected && styles.zoneCardSelected,
                { borderTopColor: getDensityColor(pct) },
              ]}
              onPress={() => {
                setSelectedZone(zone);
                if (webViewRef.current) {
                  webViewRef.current.postMessage(
                    JSON.stringify({
                      type: 'UPDATE_MAP',
                      zones: [zone],
                      userLocation,
                    })
                  );
                }
              }}
              activeOpacity={0.8}
            >
              <View style={styles.zoneCardHeader}>
                <Text style={styles.zoneCardName} numberOfLines={1}>{zone.name}</Text>
                <View style={[styles.densityChip, { backgroundColor: getDensityColor(pct) + '20' }]}>
                  <Text style={[styles.densityChipText, { color: getDensityColor(pct) }]}>
                    {getDensityLabel(pct)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.zoneCardPct, { color: getDensityColor(pct) }]}>{pct}%</Text>

              <View style={styles.zoneCardProgressTrack}>
                <View
                  style={[
                    styles.zoneCardProgressFill,
                    {
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: getDensityColor(pct),
                    },
                  ]}
                />
              </View>

              <Text style={styles.zoneCardCount}>
                {zone.current_count?.toLocaleString()} / {zone.max_capacity?.toLocaleString()}
              </Text>

              <View style={styles.zoneCardTrend}>
                <Text style={styles.zoneCardTrendText}>
                  {trendArrow(zone.trend)} {zone.trend}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legendBar}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Safe</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendText}>Normal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>Moderate</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>Critical</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  topBarLeft: {},
  topBarTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  topBarSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  topBarRight: {},
  livePulse: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100,116,139,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  livePulseActive: { backgroundColor: 'rgba(16,185,129,0.2)' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
  liveLabel: { fontSize: 11, fontWeight: '800', color: '#10B981', letterSpacing: 0.5 },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1, backgroundColor: '#0F172A' },
  floatingControls: { position: 'absolute', right: 12, top: 12, gap: 8 },
  floatingBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  floatingBtnIcon: { fontSize: 18 },
  gpsBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  gpsBadgeText: { color: '#10B981', fontSize: 11, fontWeight: '700' },
  bottomPanel: { maxHeight: 140, backgroundColor: '#0F172A', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  bottomPanelContent: { paddingHorizontal: 12, paddingVertical: 10 },
  zoneCard: {
    width: SCREEN_WIDTH * 0.38,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    borderTopWidth: 3,
    marginRight: 10,
  },
  zoneCardSelected: { backgroundColor: '#334155', borderWidth: 1, borderColor: 'rgba(99,102,241,0.5)' },
  zoneCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  zoneCardName: { fontSize: 12, fontWeight: '700', color: '#E2E8F0', flex: 1, marginRight: 6 },
  densityChip: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  densityChipText: { fontSize: 9, fontWeight: '800' },
  zoneCardPct: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  zoneCardProgressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  zoneCardProgressFill: { height: '100%', borderRadius: 2 },
  zoneCardCount: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  zoneCardTrend: { marginTop: 4 },
  zoneCardTrendText: { fontSize: 10, color: '#64748B', fontWeight: '600', textTransform: 'capitalize' },
  legendBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#0F172A',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
});
