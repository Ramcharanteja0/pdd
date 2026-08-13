import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { fetchIncidents } from '../services/dataService';
import { scaleFont, scaleSize, responsivePadding, responsiveBorderRadius } from '../utils/responsive';

export default function IncidentsScreen() {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    fetchIncidents().then(setIncidents);
  }, []);

  const handleResolve = (id) => {
    setIncidents((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'Resolved' } : item))
    );
    Alert.alert('✅ Incident Updated', 'Marked incident as resolved.');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safety & Incidents</Text>
        <Text style={styles.headerSubtitle}>Real-time emergency & bottleneck logging</Text>
      </View>

      {incidents.map((incident) => {
        const isCritical = incident.severity === 'critical';

        return (
          <View key={incident.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.badge, isCritical ? styles.critBadge : styles.modBadge]}>
                <Text style={[styles.badgeText, isCritical ? styles.critText : styles.modText]}>
                  {incident.severity.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.statusLabel}>{incident.status}</Text>
            </View>

            <Text style={styles.title}>{incident.title}</Text>
            <Text style={styles.subtitle}>Location: {incident.zone} • Reported {incident.time || 'recently'}</Text>

            {incident.status !== 'Resolved' && (
              <TouchableOpacity style={styles.resolveBtn} onPress={() => handleResolve(incident.id)}>
                <Text style={styles.resolveText}>Mark as Resolved ✓</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: responsivePadding() },
  header: { marginBottom: scaleSize(16), marginTop: scaleSize(8) },
  headerTitle: { fontSize: scaleFont(24), fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: scaleFont(13), color: '#64748B' },
  card: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(16), padding: scaleSize(16), marginBottom: scaleSize(12), borderWidth: scaleSize(1), borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleSize(8) },
  badge: { paddingHorizontal: scaleSize(8), paddingVertical: scaleSize(3), borderRadius: scaleSize(6) },
  critBadge: { backgroundColor: '#FEE2E2' },
  modBadge: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: scaleFont(10), fontWeight: '800' },
  critText: { color: '#991B1B' },
  modText: { color: '#92400E' },
  statusLabel: { fontSize: scaleFont(12), fontWeight: '700', color: '#64748B' },
  title: { fontSize: scaleFont(16), fontWeight: '700', color: '#0F172A', marginBottom: scaleSize(4) },
  subtitle: { fontSize: scaleFont(12), color: '#64748B', marginBottom: scaleSize(12) },
  resolveBtn: { backgroundColor: '#F1F5F9', paddingVertical: scaleSize(8), borderRadius: scaleSize(8), alignItems: 'center' },
  resolveText: { color: '#334155', fontSize: scaleFont(12), fontWeight: '700' },
});
