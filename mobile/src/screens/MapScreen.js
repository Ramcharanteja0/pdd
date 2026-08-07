import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';

export default function MapScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Venue Map</Text>
        <Text style={styles.headerSubtitle}>Spatial density & H3 grid visualization</Text>
      </View>

      {/* Simulated Map Graphic Container */}
      <View style={styles.mapGraphicCard}>
        <View style={styles.gridOverlay}>
          <Text style={styles.mapLabel}>🗺️ Live Map Telemetry Layer</Text>
          <Text style={styles.mapSub}>Interactive GPS & H3 Hexagonal Grid Active</Text>

          <View style={styles.zoneMarkerContainer}>
            <View style={[styles.markerPill, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.markerText}>Main Stage: 85% Critical</Text>
            </View>
            <View style={[styles.markerPill, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.markerText}>Food Plaza: 53% Moderate</Text>
            </View>
            <View style={[styles.markerPill, { backgroundColor: '#10B981' }]}>
              <Text style={styles.markerText}>North Gate: 35% Safe</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Legend & Telemetry Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Map Legend & Risk Tiers</Text>

        <View style={styles.legendRow}>
          <View style={[styles.colorBox, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>0% – 50% Density (Safe Flow)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.colorBox, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>50% – 80% Density (Moderate Congestion)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.colorBox, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>80% – 100% Density (Critical Surge Warning)</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  header: { marginBottom: 16, marginTop: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 13, color: '#64748B' },
  mapGraphicCard: {
    height: 260,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridOverlay: { alignItems: 'center', padding: 20 },
  mapLabel: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  mapSub: { fontSize: 12, color: '#94A3B8', marginBottom: 16 },
  zoneMarkerContainer: { gap: 8, alignItems: 'center' },
  markerPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  markerText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 14 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  colorBox: { width: 14, height: 14, borderRadius: 4, marginRight: 10 },
  legendText: { fontSize: 13, color: '#334155', fontWeight: '500' },
});
