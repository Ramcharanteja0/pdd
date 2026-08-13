import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { fetchZones, fetchAttendeeLocations, syncZoneDensityFromGPS } from '../services/dataService';
import { supabase } from '../services/supabase';
import { scaleFont, scaleSize, responsivePadding } from '../utils/responsive';

function timeSince(dateStr) {
  if (!dateStr) return 'recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

function densityColor(pct) {
  if (pct >= 80) return '#EF4444';
  if (pct >= 50) return '#F59E0B';
  return '#10B981';
}

export default function TrackingScreen() {
  const [zones, setZones] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAttendees = async () => {
    const [zoneData, attendeeData] = await Promise.all([fetchZones(), fetchAttendeeLocations()]);
    setZones(zoneData);
    setAttendees(attendeeData);
    await syncZoneDensityFromGPS();
    const fresh = await fetchZones();
    setZones(fresh);
  };

  useEffect(() => {
    fetchAttendees();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAttendees, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAttendees();
    setRefreshing(false);
  };

  // Zone occupancy from attendee GPS
  const counts = {};
  attendees.forEach(a => {
    const key = a.zone_id || a.zone_name || 'outside';
    counts[key] = (counts[key] || 0) + 1;
  });
  const zoneOccupancy = zones.map(z => ({
    ...z,
    count: counts[z.id] || counts[z.name] || 0,
  }));
  const outsideCount = Object.keys(counts).filter(k => k === 'outside' || (!zones.find(z => z.id === k) && !zones.find(z => z.name === k))).reduce((s, k) => s + counts[k], 0);
  const accuracy = attendees.filter(a => a.accuracy && a.accuracy < 20).length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live GPS Tracking</Text>
        <Text style={styles.headerSubtitle}>Real-time attendee location monitoring</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlBtn, !autoRefresh && styles.controlBtnActive]} onPress={() => setAutoRefresh(!autoRefresh)}>
          <Text style={[styles.controlBtnText, !autoRefresh && styles.controlBtnTextActive]}>{autoRefresh ? 'Auto' : 'Paused'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={onRefresh}>
          <Text style={styles.controlBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statGrid}>
        <View style={[styles.statCard, { borderTopColor: '#6366F1' }]}>
          <Text style={styles.statValue}>{attendees.length}</Text>
          <Text style={styles.statLabel}>Active Devices</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#10B981' }]}>
          <Text style={styles.statValue}>{zoneOccupancy.filter(z => z.count > 0).length}</Text>
          <Text style={styles.statLabel}>Active Zones</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#F59E0B' }]}>
          <Text style={styles.statValue}>{outsideCount}</Text>
          <Text style={styles.statLabel}>Outside Zones</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#3B82F6' }]}>
          <Text style={styles.statValue}>{accuracy}</Text>
          <Text style={styles.statLabel}>High Accuracy</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Zone Occupancy</Text>
      <View style={styles.chartCard}>
        {zoneOccupancy.length === 0 ? (
          <Text style={styles.emptyText}>No zones available.</Text>
        ) : (
          zoneOccupancy.map(z => {
            const pct = z.capacity > 0 ? Math.min(100, Math.round((z.count / z.capacity) * 100)) : 0;
            return (
              <View key={z.id} style={styles.zoneRow}>
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneName} numberOfLines={1}>{z.name}</Text>
                  <Text style={styles.zoneCount}>{z.count} / {z.capacity || 0} attendees</Text>
                </View>
                <View style={styles.zoneTrack}>
                  <View style={[styles.zoneFill, { width: `${pct}%`, backgroundColor: densityColor(pct) }]} />
                </View>
                <Text style={[styles.zonePct, { color: densityColor(pct) }]}>{pct}%</Text>
              </View>
            );
          })
        )}
      </View>

      <Text style={styles.sectionTitle}>Active Devices</Text>
      {attendees.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No active attendees right now.</Text>
        </View>
      ) : (
        attendees.slice(0, 10).map(a => (
          <View key={a.id || a.device_id} style={styles.deviceCard}>
            <View style={[styles.deviceDot, { backgroundColor: densityColor(a.zone_name ? 50 : 0) }]} />
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName} numberOfLines={1}>Device {String(a.device_id).slice(0, 8)}</Text>
              <Text style={styles.deviceMeta}>{a.zone_name || 'Outside zones'} • Updated {timeSince(a.updated_at)}</Text>
            </View>
            <View style={styles.accuracyBadge}>
              <Text style={styles.accuracyText}>±{Math.round(a.accuracy || 0)}m</Text>
            </View>
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: responsivePadding() },
  header: { marginBottom: scaleSize(16), marginTop: scaleSize(8) },
  headerTitle: { fontSize: scaleFont(24), fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: scaleFont(13), color: '#64748B' },
  controls: { flexDirection: 'row', gap: scaleSize(8), marginBottom: scaleSize(16) },
  controlBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: scaleSize(14), paddingVertical: scaleSize(8), borderRadius: scaleSize(8), borderWidth: scaleSize(1), borderColor: '#E2E8F0' },
  controlBtnActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  controlBtnText: { fontSize: scaleFont(12), fontWeight: '700', color: '#64748B' },
  controlBtnTextActive: { color: '#FFFFFF' },
  statGrid: { flexDirection: 'row', gap: scaleSize(8), marginBottom: scaleSize(16) },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(14), borderTopWidth: scaleSize(3) },
  statValue: { fontSize: scaleFont(20), fontWeight: '900', color: '#0F172A' },
  statLabel: { fontSize: scaleFont(10), color: '#64748B', marginTop: scaleSize(2), fontWeight: '600' },
  sectionTitle: { fontSize: scaleFont(17), fontWeight: '700', color: '#0F172A', marginBottom: scaleSize(10), marginTop: scaleSize(8) },
  chartCard: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(16), marginBottom: scaleSize(16), borderWidth: scaleSize(1), borderColor: '#E2E8F0' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(16), alignItems: 'center', borderWidth: scaleSize(1), borderColor: '#E2E8F0', marginBottom: scaleSize(12) },
  emptyText: { color: '#94A3B8', fontSize: scaleFont(13), textAlign: 'center' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: scaleSize(12) },
  zoneInfo: { width: scaleSize(110) },
  zoneName: { fontSize: scaleFont(12), fontWeight: '700', color: '#334155' },
  zoneCount: { fontSize: scaleFont(10), color: '#94A3B8', marginTop: scaleSize(2) },
  zoneTrack: { flex: 1, height: scaleSize(8), backgroundColor: '#F1F5F9', borderRadius: scaleSize(4), marginHorizontal: scaleSize(8), overflow: 'hidden' },
  zoneFill: { height: '100%', borderRadius: scaleSize(4) },
  zonePct: { fontSize: scaleFont(12), fontWeight: '800', width: scaleSize(40), textAlign: 'right' },
  deviceCard: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(12), padding: scaleSize(14), marginBottom: scaleSize(10), borderWidth: scaleSize(1), borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' },
  deviceDot: { width: scaleSize(8), height: scaleSize(8), borderRadius: scaleSize(4), marginRight: scaleSize(10) },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: scaleFont(13), fontWeight: '600', color: '#334155' },
  deviceMeta: { fontSize: scaleFont(11), color: '#94A3B8', marginTop: scaleSize(2) },
  accuracyBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: scaleSize(8), paddingVertical: scaleSize(4), borderRadius: scaleSize(6) },
  accuracyText: { color: '#4F46E5', fontSize: scaleFont(10), fontWeight: '700' },
});