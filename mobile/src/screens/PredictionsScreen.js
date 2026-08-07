import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';

export default function PredictionsScreen() {
  const [acted, setActed] = useState(false);

  const handleActNow = () => {
    setActed(true);
    Alert.alert('⚡ Automation Triggered', 'Dispatched 3 security officers to Main Stage Arena and opened Gate 4 exit corridor.');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Crowd Forecasting</Text>
        <Text style={styles.headerSubtitle}>15-Minute Predictive Surge Intelligence</Text>
      </View>

      {/* Prediction Box */}
      <View style={styles.predictionCard}>
        <View style={styles.badgeRow}>
          <Text style={styles.badgeLabel}>⚡ HIGH SURGE RISK DETECTED</Text>
          <Text style={styles.timeTag}>T+15 Mins</Text>
        </View>

        <Text style={styles.predictionTitle}>Main Stage Density Exceeding 92%</Text>
        <Text style={styles.predictionDesc}>
          Linear regression model projects 1,200 additional attendees arriving at Main Stage within 15 minutes as headliner performance starts.
        </Text>

        <TouchableOpacity
          style={[styles.actButton, acted && { backgroundColor: '#10B981' }]}
          onPress={handleActNow}
        >
          <Text style={styles.actButtonText}>
            {acted ? '✓ Automated Response Executed' : '⚡ Act: Auto-Reroute Crowd & Dispatch Staff'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Forecast Tiers */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Forecasted Occupancy (+15 min)</Text>

        <View style={styles.forecastItem}>
          <Text style={styles.forecastZone}>Main Stage Arena</Text>
          <Text style={[styles.forecastVal, { color: '#EF4444' }]}>9,200 (92% CRITICAL)</Text>
        </View>

        <View style={styles.forecastItem}>
          <Text style={styles.forecastZone}>Food Plaza</Text>
          <Text style={[styles.forecastVal, { color: '#F59E0B' }]}>3,800 (63% MODERATE)</Text>
        </View>

        <View style={styles.forecastItem}>
          <Text style={styles.forecastZone}>North Gate Corridor</Text>
          <Text style={[styles.forecastVal, { color: '#10B981' }]}>1,100 (27% SAFE)</Text>
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
  predictionCard: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badgeLabel: { fontSize: 11, fontWeight: '800', color: '#4F46E5', letterSpacing: 0.5 },
  timeTag: { fontSize: 11, fontWeight: '700', color: '#6366F1', backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  predictionTitle: { fontSize: 18, fontWeight: '800', color: '#1E1B4B', marginBottom: 6 },
  predictionDesc: { fontSize: 13, color: '#4338CA', lineHeight: 20, marginBottom: 18 },
  actButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  actButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 14 },
  forecastItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  forecastZone: { fontSize: 14, fontWeight: '600', color: '#334155' },
  forecastVal: { fontSize: 13, fontWeight: '700' },
});
