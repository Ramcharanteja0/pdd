import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { fetchZones, fetchCrowdTimeline, fetchEventInfo, fetchAttendeeLocations } from '../services/dataService';
import { scaleFont, scaleSize, responsivePadding, responsiveBorderRadius } from '../utils/responsive';

function LoginTrendChart({ data }) {
  const max = Math.max(...data.map(d => d.attendees), 1);
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Attendee Logins</Text>
        <Text style={styles.chartSub}>Check-ins over time</Text>
      </View>
      <View style={styles.chartBody}>
        <View style={styles.barsRow}>
          {data.map((d, i) => {
            const h = Math.max(4, Math.round((d.attendees / max) * 100));
            return (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${h}%` }]} />
                </View>
                <Text style={styles.barLabel}>{d.time.replace(':00', '')}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.chartMax}>Peak {max.toLocaleString()} attendees</Text>
      </View>
    </View>
  );
}

function DensityChart({ zones }) {
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Crowd Density</Text>
        <Text style={styles.chartSub}>Occupancy by zone</Text>
      </View>
      <View style={styles.densityBody}>
        {zones.map(z => {
          const pct = z.density_percent || 0;
          const color = pct >= 80 ? '#EF4444' : pct >= 50 ? '#F59E0B' : '#10B981';
          return (
            <View key={z.id} style={styles.densityRow}>
              <Text style={styles.densityName} numberOfLines={1}>{z.name}</Text>
              <View style={styles.densityTrack}>
                <View style={[styles.densityFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
              </View>
              <Text style={styles.densityVal}>{pct}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const [zones, setZones] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [activeDevices, setActiveDevices] = useState(0);
  const [eventName, setEventName] = useState('Live Overview');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const [data, tl, evt, attendees] = await Promise.all([fetchZones(), fetchCrowdTimeline(), fetchEventInfo(), fetchAttendeeLocations()]);
    const normalized = data.map(z => {
      const current = z.current_count != null ? z.current_count : (z.density != null ? Math.round((z.capacity || 0) * (z.density / 100)) : 0);
      const max = z.max_capacity || z.capacity || 0;
      const density = z.density_percent != null ? z.density_percent : (max > 0 ? Math.round((current / max) * 100) : 0);
      return { ...z, current_count: current, max_capacity: max, density_percent: density };
    });
    setZones(normalized);
    setTimeline(tl);
    setActiveDevices((attendees || []).length);
    if (evt && evt.name) setEventName(evt.name);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalAttendees = zones.reduce((acc, z) => acc + (z.current_count || 0), 0);
  const totalCapacity = zones.reduce((acc, z) => acc + (z.max_capacity || 0), 0);
  const avgOccupancy = totalCapacity > 0 ? Math.round((totalAttendees / totalCapacity) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Live Overview</Text>
          <Text style={styles.headerSubtitle}>Real-time venue telemetry & crowd status</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Quick Stat Cards */}
      <View style={styles.statGrid}>
        <View style={[styles.statCard, { borderTopColor: '#6366F1' }]}>
          <Text style={styles.statLabel}>Total Occupancy</Text>
          <Text style={styles.statValue}>{totalAttendees.toLocaleString()}</Text>
          <Text style={styles.statSub}>of {totalCapacity.toLocaleString()} max</Text>
        </View>

        <View style={[styles.statCard, { borderTopColor: '#10B981' }]}>
          <Text style={styles.statLabel}>Avg Density</Text>
          <Text style={styles.statValue}>{avgOccupancy}%</Text>
          <Text style={[styles.statSub, { color: '#10B981' }]}>🟢 Optimal Flow</Text>
        </View>

        <View style={[styles.statCard, { borderTopColor: '#F59E0B' }]}>
          <Text style={styles.statLabel}>Active Devices</Text>
          <Text style={styles.statValue}>{activeDevices}</Text>
          <Text style={styles.statSub}>GPS tracked (10 min)</Text>
        </View>
      </View>

      {/* Event Name Banner */}
      <Text style={styles.eventName}>{eventName}</Text>

      {/* Working Graphs */}
      <LoginTrendChart data={timeline} />
      <DensityChart zones={zones} />

      {/* Zone Occupancy Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Zone Occupancy Details</Text>
        <Text style={styles.sectionAction}>Updated Live</Text>
      </View>

      {zones.map((zone) => {
        const pct = Math.round(((zone.current_count || 0) / (zone.max_capacity || 1)) * 100);
        const isCritical = pct >= 80;
        const isModerate = pct >= 50 && pct < 80;

        const barColor = isCritical ? '#EF4444' : isModerate ? '#F59E0B' : '#10B981';

        return (
          <View key={zone.id} style={styles.zoneCard}>
            <View style={styles.zoneRow}>
              <Text style={styles.zoneName}>{zone.name}</Text>
              <Text style={[styles.zoneBadge, { color: barColor }]}>
                {pct}% ({zone.current_count?.toLocaleString()} / {zone.max_capacity?.toLocaleString()})
              </Text>
            </View>

            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
            </View>
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: responsivePadding(),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSize(20),
    marginTop: scaleSize(8),
  },
  headerTitle: {
    fontSize: scaleFont(24),
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: scaleFont(13),
    color: '#64748B',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: scaleSize(10),
    paddingVertical: scaleSize(5),
    borderRadius: scaleSize(20),
  },
  liveDot: {
    width: scaleSize(6),
    height: scaleSize(6),
    borderRadius: scaleSize(3),
    backgroundColor: '#FFFFFF',
    marginRight: scaleSize(6),
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: scaleFont(11),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statGrid: {
    flexDirection: 'row',
    gap: scaleSize(12),
    marginBottom: scaleSize(24),
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: scaleSize(16),
    padding: scaleSize(16),
    borderTopWidth: scaleSize(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleSize(2) },
    shadowOpacity: 0.05,
    shadowRadius: scaleSize(8),
    elevation: 2,
  },
  statLabel: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#64748B',
    marginBottom: scaleSize(4),
  },
  statValue: {
    fontSize: scaleFont(22),
    fontWeight: '900',
    color: '#0F172A',
  },
  statSub: {
    fontSize: scaleFont(11),
    color: '#94A3B8',
    marginTop: scaleSize(4),
    fontWeight: '500',
  },
  eventName: {
    fontSize: scaleFont(18),
    fontWeight: '800',
    color: '#4F46E5',
    marginBottom: scaleSize(12),
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scaleSize(16),
    padding: scaleSize(16),
    marginBottom: scaleSize(16),
    borderWidth: scaleSize(1),
    borderColor: '#E2E8F0',
  },
  chartHeader: { marginBottom: scaleSize(14) },
  chartTitle: { fontSize: scaleFont(16), fontWeight: '700', color: '#0F172A' },
  chartSub: { fontSize: scaleFont(12), color: '#64748B', marginTop: scaleSize(2) },
  chartBody: { marginTop: scaleSize(4) },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', height: scaleSize(120), justifyContent: 'space-between' },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', marginHorizontal: scaleSize(2) },
  barTrack: { flex: 1, width: '70%', justifyContent: 'flex-end', backgroundColor: '#EEF2FF', borderRadius: scaleSize(4), overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: '#6366F1', borderRadius: scaleSize(4), minHeight: scaleSize(4) },
  barLabel: { fontSize: scaleFont(9), color: '#94A3B8', marginTop: scaleSize(6), fontWeight: '600' },
  chartMax: { fontSize: scaleFont(11), color: '#6366F1', fontWeight: '700', marginTop: scaleSize(10), textAlign: 'right' },
  densityBody: { gap: scaleSize(12) },
  densityRow: { flexDirection: 'row', alignItems: 'center' },
  densityName: { width: scaleSize(105), fontSize: scaleFont(12), fontWeight: '600', color: '#334155' },
  densityTrack: { flex: 1, height: scaleSize(8), backgroundColor: '#F1F5F9', borderRadius: scaleSize(4), marginHorizontal: scaleSize(10), overflow: 'hidden' },
  densityFill: { height: '100%', borderRadius: scaleSize(4) },
  densityVal: { fontSize: scaleFont(12), fontWeight: '800', color: '#334155', width: scaleSize(42), textAlign: 'right' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSize(12),
  },
  sectionTitle: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionAction: {
    fontSize: scaleFont(12),
    color: '#6366F1',
    fontWeight: '600',
  },
  zoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scaleSize(14),
    padding: scaleSize(16),
    marginBottom: scaleSize(12),
    borderColor: '#E2E8F0',
    borderWidth: scaleSize(1),
  },
  zoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSize(10),
  },
  zoneName: {
    fontSize: scaleFont(15),
    fontWeight: '700',
    color: '#1E293B',
  },
  zoneBadge: {
    fontSize: scaleFont(13),
    fontWeight: '700',
  },
  progressBarTrack: {
    height: scaleSize(8),
    backgroundColor: '#F1F5F9',
    borderRadius: scaleSize(4),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: scaleSize(4),
  },
});
