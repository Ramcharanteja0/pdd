import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { fetchIncidents } from '../services/dataService';

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
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  header: { marginBottom: 16, marginTop: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 13, color: '#64748B' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  critBadge: { backgroundColor: '#FEE2E2' },
  modBadge: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  critText: { color: '#991B1B' },
  modText: { color: '#92400E' },
  statusLabel: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  title: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  resolveBtn: { backgroundColor: '#F1F5F9', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  resolveText: { color: '#334155', fontSize: 12, fontWeight: '700' },
});
