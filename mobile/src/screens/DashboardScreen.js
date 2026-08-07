import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { fetchZones } from '../services/dataService';

export default function DashboardScreen() {
  const [zones, setZones] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const data = await fetchZones();
    setZones(data);
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
      </View>

      {/* Zone Occupancy Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Zone Density Breakdown</Text>
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
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  statSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionAction: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
  },
  zoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  zoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  zoneBadge: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
