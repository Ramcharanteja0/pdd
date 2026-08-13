import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, RefreshControl,
} from 'react-native';
import { fetchAlerts, createAlert, resolveAlert } from '../services/dataService';
import { supabase } from '../services/supabase';
import { scaleFont, scaleSize, responsivePadding, responsiveBorderRadius } from '../utils/responsive';

function metaFor(type) {
  const meta = {
    critical: { color: '#EF4444', bg: '#FEE2E2', label: 'Critical' },
    warning: { color: '#F59E0B', bg: '#FEF3C7', label: 'Warning' },
    info: { color: '#3B82F6', bg: '#DBEAFE', label: 'Info' },
  };
  return meta[type] || meta.warning;
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [zone, setZone] = useState('');
  const [type, setType] = useState('warning');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadAlerts = async () => {
    const data = await fetchAlerts();
    setAlerts(data);
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleResolve = async (id) => {
    const ok = await resolveAlert(id);
    if (ok) {
      setAlerts(prev => prev.map(a => (a.id === id ? { ...a, resolved: true } : a)));
      Alert.alert('Alert Resolved', 'Alert marked as resolved.');
    } else {
      Alert.alert('Error', 'Could not resolve alert.');
    }
  };

  const handleCreate = async () => {
    if (!title) {
      Alert.alert('Validation', 'Please enter an alert title.');
      return;
    }
    setSubmitting(true);
    const newAlert = await createAlert({ title, zone, type, description });
    setSubmitting(false);
    if (newAlert) {
      setAlerts(prev => [newAlert, ...prev]);
      setShowForm(false);
      setTitle(''); setZone(''); setDescription(''); setType('warning');
    } else {
      Alert.alert('Error', 'Could not create alert.');
    }
  };

  const openCount = alerts.filter(a => !a.resolved).length;
  const critCount = alerts.filter(a => !a.resolved && a.type === 'critical').length;
  const warnCount = alerts.filter(a => !a.resolved && a.type === 'warning').length;

  const filtered = alerts.filter(a =>
    filter === 'all' ? true :
    filter === 'active' ? !a.resolved :
    a.type === filter
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts</Text>
        <Text style={styles.headerSubtitle}>Live incident alerts & broadcasts</Text>
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <View style={styles.statGrid}>
        <View style={[styles.statCard, { borderTopColor: '#6366F1' }]}>
          <Text style={styles.statValue}>{alerts.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#3B82F6' }]}>
          <Text style={styles.statValue}>{openCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#EF4444' }]}>
          <Text style={styles.statValue}>{critCount}</Text>
          <Text style={styles.statLabel}>Critical</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#F59E0B' }]}>
          <Text style={styles.statValue}>{warnCount}</Text>
          <Text style={styles.statLabel}>Warnings</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {['all', 'active', 'critical', 'warning', 'info'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.createBtn} onPress={() => setShowForm(!showForm)}>
        <Text style={styles.createBtnText}>{showForm ? 'Cancel' : '+ Create Alert'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Alert</Text>
          <TextInput style={styles.input} placeholder="Title" placeholderTextColor="#94A3B8" value={title} onChangeText={setTitle} />
          <TextInput style={styles.input} placeholder="Zone" placeholderTextColor="#94A3B8" value={zone} onChangeText={setZone} />
          <View style={styles.typeRow}>
            {['warning', 'critical', 'info'].map(t => (
              <TouchableOpacity key={t} style={[styles.typeChip, type === t && styles.typeChipActive]} onPress={() => setType(t)}>
                <Text style={[styles.typeText, type === t && styles.typeTextActive]}>{t.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor="#94A3B8" value={description} onChangeText={setDescription} multiline />
          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={submitting}>
            <Text style={styles.submitBtnText}>{submitting ? 'Creating...' : 'Create Alert'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No alerts found.</Text>
        </View>
      ) : (
        filtered.map(alert => {
          const meta = metaFor(alert.type);
          return (
            <View key={alert.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: alert.resolved ? '#D1FAE5' : '#FEE2E2' }]}>
                  <Text style={alert.resolved ? styles.statusResolved : styles.statusActive}>
                    {alert.resolved ? '✓ RESOLVED' : '● ACTIVE'}
                  </Text>
                </View>
              </View>
              <Text style={styles.title}>{alert.title}</Text>
              {alert.zone ? <Text style={styles.subtitle}>Zone: {alert.zone}</Text> : null}
              {alert.description ? <Text style={styles.desc}>{alert.description}</Text> : null}
              {!alert.resolved && (
                <TouchableOpacity style={styles.resolveBtn} onPress={() => handleResolve(alert.id)}>
                  <Text style={styles.resolveText}>Resolve Alert ✓</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
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
  liveRow: { flexDirection: 'row', alignItems: 'center', marginTop: scaleSize(8) },
  liveDot: { width: scaleSize(8), height: scaleSize(8), borderRadius: scaleSize(4), backgroundColor: '#EF4444', marginRight: scaleSize(6) },
  liveText: { fontSize: scaleFont(12), fontWeight: '800', color: '#EF4444', letterSpacing: 1 },
  statGrid: { flexDirection: 'row', gap: scaleSize(8), marginBottom: scaleSize(16) },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(14), borderTopWidth: scaleSize(3) },
  statValue: { fontSize: scaleFont(22), fontWeight: '900', color: '#0F172A' },
  statLabel: { fontSize: scaleFont(11), color: '#64748B', marginTop: scaleSize(2), fontWeight: '600' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scaleSize(6), marginBottom: scaleSize(12) },
  filterChip: { backgroundColor: '#FFFFFF', paddingHorizontal: scaleSize(10), paddingVertical: scaleSize(6), borderRadius: scaleSize(8), borderWidth: scaleSize(1), borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  filterText: { fontSize: scaleFont(10), fontWeight: '700', color: '#64748B' },
  filterTextActive: { color: '#FFFFFF' },
  createBtn: { alignSelf: 'flex-end', backgroundColor: '#EEF2FF', paddingHorizontal: scaleSize(14), paddingVertical: scaleSize(8), borderRadius: scaleSize(8), borderWidth: scaleSize(1), borderColor: '#C7D2FE', marginBottom: scaleSize(12) },
  createBtnText: { color: '#4F46E5', fontSize: scaleFont(13), fontWeight: '700' },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(16), marginBottom: scaleSize(12), borderWidth: scaleSize(1), borderColor: '#E2E8F0' },
  formTitle: { fontSize: scaleFont(16), fontWeight: '700', color: '#0F172A', marginBottom: scaleSize(12) },
  input: { borderWidth: scaleSize(1), borderColor: '#E2E8F0', borderRadius: scaleSize(8), paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(10), fontSize: scaleFont(14), color: '#0F172A', backgroundColor: '#F8FAFC', marginBottom: scaleSize(10) },
  textArea: { height: scaleSize(72), textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: scaleSize(8), marginBottom: scaleSize(12) },
  typeChip: { backgroundColor: '#F1F5F9', paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(6), borderRadius: scaleSize(8) },
  typeChipActive: { backgroundColor: '#4F46E5' },
  typeText: { fontSize: scaleFont(11), fontWeight: '700', color: '#64748B' },
  typeTextActive: { color: '#FFFFFF' },
  submitBtn: { backgroundColor: '#4F46E5', borderRadius: scaleSize(10), paddingVertical: scaleSize(12), alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: scaleFont(14), fontWeight: '800' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(20), alignItems: 'center', borderWidth: scaleSize(1), borderColor: '#E2E8F0' },
  emptyText: { color: '#94A3B8', fontSize: scaleFont(13) },
  card: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(16), marginBottom: scaleSize(12), borderWidth: scaleSize(1), borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleSize(10) },
  badge: { paddingHorizontal: scaleSize(8), paddingVertical: scaleSize(4), borderRadius: scaleSize(6) },
  badgeText: { fontSize: scaleFont(10), fontWeight: '800' },
  statusBadge: { paddingHorizontal: scaleSize(8), paddingVertical: scaleSize(4), borderRadius: scaleSize(6) },
  statusActive: { color: '#991B1B', fontSize: scaleFont(10), fontWeight: '800' },
  statusResolved: { color: '#065F46', fontSize: scaleFont(10), fontWeight: '800' },
  title: { fontSize: scaleFont(16), fontWeight: '700', color: '#0F172A', marginBottom: scaleSize(4) },
  subtitle: { fontSize: scaleFont(12), color: '#64748B', marginBottom: scaleSize(4) },
  desc: { fontSize: scaleFont(13), color: '#475569', marginBottom: scaleSize(12) },
  resolveBtn: { backgroundColor: '#F1F5F9', paddingVertical: scaleSize(8), borderRadius: scaleSize(8), alignItems: 'center' },
  resolveText: { color: '#334155', fontSize: scaleFont(12), fontWeight: '700' },
});