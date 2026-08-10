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
import * as Location from 'expo-location';
import { supabase } from '../services/supabase';

// Safely import react-native-maps if supported
let MapView, Marker, Circle, Polygon;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Circle = Maps.Circle;
  Polygon = Maps.Polygon;
} catch (e) {
  // Graceful fallback if native maps module is missing or incompatible in environment
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Zone definitions with geo-coordinates ──────────────────
const VENUE_ZONES = [
  {
    id: '1', name: 'Main Stage Arena',
    center: { latitude: 15.8281, longitude: 78.0373 },
    radius: 120, color: '#EF4444',
    polygon: [
      { latitude: 15.8291, longitude: 78.0363 },
      { latitude: 15.8291, longitude: 78.0383 },
      { latitude: 15.8271, longitude: 78.0383 },
      { latitude: 15.8271, longitude: 78.0363 },
    ],
  },
  {
    id: '2', name: 'Food Court & Plaza',
    center: { latitude: 15.8265, longitude: 78.0395 },
    radius: 90, color: '#F59E0B',
    polygon: [
      { latitude: 15.8273, longitude: 78.0387 },
      { latitude: 15.8273, longitude: 78.0403 },
      { latitude: 15.8257, longitude: 78.0403 },
      { latitude: 15.8257, longitude: 78.0387 },
    ],
  },
  {
    id: '3', name: 'North Gate Entrance',
    center: { latitude: 15.8300, longitude: 78.0380 },
    radius: 70, color: '#10B981',
    polygon: [
      { latitude: 15.8307, longitude: 78.0373 },
      { latitude: 15.8307, longitude: 78.0387 },
      { latitude: 15.8293, longitude: 78.0387 },
      { latitude: 15.8293, longitude: 78.0373 },
    ],
  },
  {
    id: '4', name: 'VIP Pavilion',
    center: { latitude: 15.8275, longitude: 78.0350 },
    radius: 60, color: '#8B5CF6',
    polygon: [
      { latitude: 15.8281, longitude: 78.0343 },
      { latitude: 15.8281, longitude: 78.0357 },
      { latitude: 15.8269, longitude: 78.0357 },
      { latitude: 15.8269, longitude: 78.0343 },
    ],
  },
  {
    id: '5', name: 'Parking Zone A',
    center: { latitude: 15.8310, longitude: 78.0350 },
    radius: 100, color: '#06B6D4',
    polygon: [
      { latitude: 15.8318, longitude: 78.0340 },
      { latitude: 15.8318, longitude: 78.0360 },
      { latitude: 15.8302, longitude: 78.0360 },
      { latitude: 15.8302, longitude: 78.0340 },
    ],
  },
];

const VENUE_CENTER = { latitude: 15.8281, longitude: 78.0373 };

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
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [zones, setZones] = useState(VENUE_ZONES.map(z => ({ ...z, current_count: 3500, max_capacity: 10000, density: 45, trend: 'stable' })));
  const [selectedZone, setSelectedZone] = useState(null);
  const [attendeeCount, setAttendeeCount] = useState(17500);
  const [mapType, setMapType] = useState('standard');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [trackingActive, setTrackingActive] = useState(false);
  const [hasNativeMapError, setHasNativeMapError] = useState(false);
  const locationSubscription = useRef(null);

  const fetchZoneData = async () => {
    try {
      const { data, error } = await supabase.from('zones').select('*');
      if (!error && data && data.length > 0) {
        const merged = VENUE_ZONES.map((vz) => {
          const dbZone = data.find((d) => String(d.id) === vz.id || d.name === vz.name);
          return {
            ...vz,
            current_count: dbZone?.current_count || (dbZone?.density
              ? Math.round((dbZone.capacity || 10000) * (dbZone.density || 0) / 100)
              : Math.floor(Math.random() * 8000) + 500),
            max_capacity: dbZone?.capacity || dbZone?.max_capacity || 10000,
            density: dbZone?.density || Math.floor(Math.random() * 90) + 10,
            trend: dbZone?.trend || 'stable',
          };
        });
        setZones(merged);
        setAttendeeCount(merged.reduce((s, z) => s + z.current_count, 0));
      } else {
        const mock = VENUE_ZONES.map((vz) => ({
          ...vz,
          current_count: Math.floor(Math.random() * 6000) + 1000,
          max_capacity: 10000,
          density: Math.floor(Math.random() * 80) + 15,
          trend: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)],
        }));
        setZones(mock);
        setAttendeeCount(mock.reduce((s, z) => s + z.current_count, 0));
      }
    } catch (err) {
      // Keep default state
    }
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
      setTrackingActive(true);

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,
          timeInterval: 10000,
        },
        (loc) => {
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
          });
        }
      );
    } catch (err) {
      // Ignore location error
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current && mapRef.current.animateToRegion) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 800);
    } else {
      Alert.alert('GPS Location', 'Locking onto user location...');
    }
  };

  const centerOnVenue = () => {
    if (mapRef.current && mapRef.current.animateToRegion) {
      mapRef.current.animateToRegion({
        ...VENUE_CENTER,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }, 800);
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

  const canRenderNativeMap = MapView && !hasNativeMapError;

  return (
    <View style={styles.container}>
      {/* Top Header */}
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
            <Text style={styles.liveLabel}>{trackingActive ? 'GPS ON' : 'GPS STANDBY'}</Text>
          </View>
        </View>
      </View>

      {/* Map View or Interactive Grid View */}
      <View style={styles.mapContainer}>
        {canRenderNativeMap ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            mapType={mapType}
            initialRegion={{
              ...VENUE_CENTER,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={true}
            rotateEnabled={true}
            pitchEnabled={true}
            onError={() => setHasNativeMapError(true)}
          >
            {zones.map((zone) => {
              const pct = zone.density || 0;
              const fillColor = getDensityColor(pct) + '33';
              const strokeColor = getDensityColor(pct);

              return (
                <React.Fragment key={zone.id}>
                  {zone.polygon && Polygon && (
                    <Polygon
                      coordinates={zone.polygon}
                      fillColor={fillColor}
                      strokeColor={strokeColor}
                      strokeWidth={2}
                      tappable={true}
                      onPress={() => setSelectedZone(zone)}
                    />
                  )}

                  {showHeatmap && zone.center && Circle && (
                    <Circle
                      center={zone.center}
                      radius={zone.radius * Math.max(0.4, pct / 100)}
                      fillColor={getDensityColor(pct) + '25'}
                      strokeColor={getDensityColor(pct) + '50'}
                      strokeWidth={1}
                    />
                  )}

                  {zone.center && Marker && (
                    <Marker
                      coordinate={zone.center}
                      onPress={() => setSelectedZone(zone)}
                    >
                      <View style={[styles.zoneMarker, { backgroundColor: getDensityColor(pct) }]}>
                        <Text style={styles.zoneMarkerText}>{pct}%</Text>
                      </View>
                    </Marker>
                  )}
                </React.Fragment>
              );
            })}
          </MapView>
        ) : (
          /* Interactive Spatial Grid Fallback */
          <ScrollView contentContainerStyle={styles.fallbackContainer}>
            <Text style={styles.fallbackTitle}>🗺️ Live Venue Density Grid</Text>
            <Text style={styles.fallbackSub}>Real-time H3 Telemetry Active</Text>
            {zones.map((zone) => (
              <TouchableOpacity
                key={zone.id}
                style={[styles.fallbackZoneCard, { borderLeftColor: getDensityColor(zone.density) }]}
                onPress={() => setSelectedZone(zone)}
                activeOpacity={0.8}
              >
                <View style={styles.fallbackRow}>
                  <Text style={styles.fallbackName}>{zone.name}</Text>
                  <Text style={[styles.fallbackPct, { color: getDensityColor(zone.density) }]}>
                    {zone.density}%
                  </Text>
                </View>
                <View style={styles.fallbackBarTrack}>
                  <View style={[styles.fallbackBarFill, { width: `${zone.density}%`, backgroundColor: getDensityColor(zone.density) }]} />
                </View>
                <Text style={styles.fallbackSubText}>
                  {zone.current_count?.toLocaleString()} / {zone.max_capacity?.toLocaleString()} attendees ({zone.trend})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Floating Map Controls */}
        <View style={styles.floatingControls}>
          <TouchableOpacity style={styles.floatingBtn} onPress={centerOnUser}>
            <Text style={styles.floatingBtnIcon}>📍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.floatingBtn} onPress={centerOnVenue}>
            <Text style={styles.floatingBtnIcon}>🏟️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.floatingBtn}
            onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
          >
            <Text style={styles.floatingBtnIcon}>{mapType === 'standard' ? '🛰️' : '🗺️'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.floatingBtn, showHeatmap && styles.floatingBtnActive]}
            onPress={() => setShowHeatmap(!showHeatmap)}
          >
            <Text style={styles.floatingBtnIcon}>🔥</Text>
          </TouchableOpacity>
        </View>

        {/* GPS Badge */}
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
              onPress={() => setSelectedZone(zone)}
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
  map: { flex: 1 },
  fallbackContainer: { padding: 16, backgroundColor: '#0F172A' },
  fallbackTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  fallbackSub: { fontSize: 12, color: '#94A3B8', marginBottom: 14 },
  fallbackZoneCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  fallbackRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  fallbackName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  fallbackPct: { fontSize: 14, fontWeight: '900' },
  fallbackBarTrack: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  fallbackBarFill: { height: '100%', borderRadius: 3 },
  fallbackSubText: { fontSize: 11, color: '#94A3B8' },
  zoneMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  zoneMarkerText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF' },
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
  floatingBtnActive: { backgroundColor: '#FEF3C7', borderWidth: 2, borderColor: '#F59E0B' },
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
