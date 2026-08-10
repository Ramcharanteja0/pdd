import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, Polygon, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../services/supabase';

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

// Default venue center (Kurnool area)
const VENUE_CENTER = { latitude: 15.8281, longitude: 78.0373 };

// ── Density helpers ────────────────────────────────────────
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

function getDensityEmoji(pct) {
  if (pct >= 80) return '🔴';
  if (pct >= 50) return '🟡';
  if (pct >= 30) return '🔵';
  return '🟢';
}

export default function MapScreen() {
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [mapType, setMapType] = useState('standard');
  const [showZoneOverlay, setShowZoneOverlay] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [trackingActive, setTrackingActive] = useState(false);
  const locationSubscription = useRef(null);

  // ── Fetch zone density data from Supabase ────────────────
  const fetchZoneData = async () => {
    try {
      const { data, error } = await supabase.from('zones').select('*');
      if (!error && data && data.length > 0) {
        const merged = VENUE_ZONES.map((vz) => {
          const dbZone = data.find((d) => String(d.id) === vz.id || d.name === vz.name);
          return {
            ...vz,
            current_count: dbZone?.current_count || dbZone?.density
              ? Math.round((dbZone.capacity || 10000) * (dbZone.density || 0) / 100)
              : Math.floor(Math.random() * 8000) + 500,
            max_capacity: dbZone?.capacity || dbZone?.max_capacity || 10000,
            density: dbZone?.density || Math.floor(Math.random() * 90) + 10,
            trend: dbZone?.trend || 'stable',
          };
        });
        setZones(merged);
        setAttendeeCount(merged.reduce((s, z) => s + z.current_count, 0));
      } else {
        // Fallback mock data
        const mock = VENUE_ZONES.map((vz) => ({
          ...vz,
          current_count: Math.floor(Math.random() * 8000) + 1000,
          max_capacity: 10000,
          density: Math.floor(Math.random() * 85) + 15,
          trend: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)],
        }));
        setZones(mock);
        setAttendeeCount(mock.reduce((s, z) => s + z.current_count, 0));
      }
      setLastUpdated(new Date());
    } catch (err) {
      // Use mock on error
      const mock = VENUE_ZONES.map((vz) => ({
        ...vz,
        current_count: Math.floor(Math.random() * 6000) + 1000,
        max_capacity: 10000,
        density: Math.floor(Math.random() * 80) + 20,
        trend: 'stable',
      }));
      setZones(mock);
      setAttendeeCount(mock.reduce((s, z) => s + z.current_count, 0));
      setLastUpdated(new Date());
    }
  };

  // ── GPS Location tracking ────────────────────────────────
  const startLocationTracking = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        setLocationLoading(false);
        return;
      }

      // Get initial position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
      });
      setLocationLoading(false);
      setTrackingActive(true);

      // Start continuous tracking
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 5000,
        },
        (loc) => {
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            heading: loc.coords.heading,
            speed: loc.coords.speed,
          });

          // Upsert location to Supabase
          upsertLocation(loc.coords);
        }
      );
    } catch (err) {
      setLocationError('Could not get location');
      setLocationLoading(false);
    }
  };

  // ── Upsert user location to Supabase ─────────────────────
  const upsertLocation = async (coords) => {
    try {
      const deviceId = 'mobile-' + Platform.OS + '-' + Math.random().toString(36).substr(2, 6);
      // Find which zone the user is in
      let nearestZone = null;
      let minDist = Infinity;
      VENUE_ZONES.forEach((z) => {
        const dist = Math.sqrt(
          Math.pow(coords.latitude - z.center.latitude, 2) +
          Math.pow(coords.longitude - z.center.longitude, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestZone = z;
        }
      });

      await supabase.from('attendee_locations').upsert({
        device_id: deviceId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        zone_id: nearestZone?.id,
        zone_name: nearestZone?.name,
        event_id: 'current',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'device_id,event_id' });
    } catch (err) {
      // Silent fail — don't break tracking
    }
  };

  // ── Center map on user location ──────────────────────────
  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 800);
    } else {
      Alert.alert('Location Unavailable', 'Waiting for GPS signal...');
    }
  };

  // ── Center map on venue ──────────────────────────────────
  const centerOnVenue = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...VENUE_CENTER,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }, 800);
    }
  };

  // ── Initialize ───────────────────────────────────────────
  useEffect(() => {
    fetchZoneData();
    startLocationTracking();

    // Auto-refresh every 10 seconds
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

  return (
    <View style={styles.container}>
      {/* ── Top Status Bar ─────────────────────────────── */}
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
            <Text style={styles.liveLabel}>{trackingActive ? 'GPS ON' : 'GPS OFF'}</Text>
          </View>
        </View>
      </View>

      {/* ── Map View ───────────────────────────────────── */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
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
        >
          {/* Zone Polygon Overlays */}
          {showZoneOverlay && zones.map((zone) => {
            const pct = zone.density || 0;
            const fillColor = getDensityColor(pct) + '40'; // 25% opacity
            const strokeColor = getDensityColor(pct);

            return (
              <React.Fragment key={zone.id}>
                {/* Zone boundary polygon */}
                <Polygon
                  coordinates={zone.polygon}
                  fillColor={fillColor}
                  strokeColor={strokeColor}
                  strokeWidth={2}
                  tappable={true}
                  onPress={() => setSelectedZone(zone)}
                />

                {/* Heatmap circle overlay */}
                {showHeatmap && (
                  <Circle
                    center={zone.center}
                    radius={zone.radius * (pct / 100)}
                    fillColor={getDensityColor(pct) + '30'}
                    strokeColor={getDensityColor(pct) + '60'}
                    strokeWidth={1}
                  />
                )}

                {/* Zone marker with density info */}
                <Marker
                  coordinate={zone.center}
                  onPress={() => setSelectedZone(zone)}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={[styles.zoneMarker, { backgroundColor: getDensityColor(pct) }]}>
                    <Text style={styles.zoneMarkerText}>{pct}%</Text>
                  </View>
                  <Callout tooltip>
                    <View style={styles.calloutContainer}>
                      <Text style={styles.calloutTitle}>{zone.name}</Text>
                      <Text style={styles.calloutDensity}>
                        {getDensityEmoji(pct)} {pct}% — {getDensityLabel(pct)}
                      </Text>
                      <Text style={styles.calloutCount}>
                        {zone.current_count?.toLocaleString()} / {zone.max_capacity?.toLocaleString()}
                      </Text>
                      <Text style={styles.calloutTrend}>
                        Trend: {trendArrow(zone.trend)} {zone.trend}
                      </Text>
                    </View>
                  </Callout>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapView>

        {/* ── Floating Controls ────────────────────────── */}
        <View style={styles.floatingControls}>
          <TouchableOpacity
            style={styles.floatingBtn}
            onPress={centerOnUser}
            activeOpacity={0.7}
          >
            <Text style={styles.floatingBtnIcon}>📍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.floatingBtn}
            onPress={centerOnVenue}
            activeOpacity={0.7}
          >
            <Text style={styles.floatingBtnIcon}>🏟️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.floatingBtn}
            onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
            activeOpacity={0.7}
          >
            <Text style={styles.floatingBtnIcon}>{mapType === 'standard' ? '🛰️' : '🗺️'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.floatingBtn, showHeatmap && styles.floatingBtnActive]}
            onPress={() => setShowHeatmap(!showHeatmap)}
            activeOpacity={0.7}
          >
            <Text style={styles.floatingBtnIcon}>🔥</Text>
          </TouchableOpacity>
        </View>

        {/* ── GPS Accuracy Badge ──────────────────────── */}
        {userLocation && (
          <View style={styles.gpsBadge}>
            <Text style={styles.gpsBadgeText}>
              GPS ±{Math.round(userLocation.accuracy || 0)}m
            </Text>
          </View>
        )}

        {/* Last updated timestamp */}
        <View style={styles.timestampBadge}>
          <Text style={styles.timestampText}>
            Updated {lastUpdated.toLocaleTimeString()}
          </Text>
        </View>
      </View>

      {/* ── Bottom Zone Details Panel ──────────────────── */}
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
                if (mapRef.current) {
                  mapRef.current.animateToRegion({
                    ...zone.center,
                    latitudeDelta: 0.004,
                    longitudeDelta: 0.004,
                  }, 600);
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

      {/* ── Legend ─────────────────────────────────────── */}
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
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  // Top bar
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
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  topBarSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  topBarRight: {},
  livePulse: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100,116,139,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  livePulseActive: {
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },

  // Map
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },

  // Zone markers
  zoneMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  zoneMarkerText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Callout
  calloutContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  calloutTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  calloutDensity: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  calloutCount: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  calloutTrend: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },

  // Floating controls
  floatingControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 8,
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 6,
  },
  floatingBtnActive: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  floatingBtnIcon: {
    fontSize: 20,
  },

  // GPS badge
  gpsBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  gpsBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },

  // Timestamp badge
  timestampBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  timestampText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },

  // Bottom panel
  bottomPanel: {
    maxHeight: 160,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  bottomPanelContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },

  // Zone cards
  zoneCard: {
    width: SCREEN_WIDTH * 0.38,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    borderTopWidth: 3,
    marginRight: 10,
  },
  zoneCardSelected: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.5)',
  },
  zoneCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  zoneCardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    flex: 1,
    marginRight: 6,
  },
  densityChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  densityChipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  zoneCardPct: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  zoneCardProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  zoneCardProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  zoneCardCount: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  zoneCardTrend: {
    marginTop: 4,
  },
  zoneCardTrendText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Legend
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
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
