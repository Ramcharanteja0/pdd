import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { saveEventInfo, fetchEventInfo } from '../services/dataService';
import { scaleFont, scaleSize, responsivePadding } from '../utils/responsive';

export default function SettingsScreen() {
  const [event, setEvent] = useState({ name: '', venue: '', city: '', total_capacity: 0 });
  const [threshold, setThreshold] = useState(55);
  const [notifications, setNotifications] = useState({
    critical: true,
    alerts: true,
    predictions: true,
    weekly: false,
  });

  const [loaded, setLoaded] = useState(false);
  if (!loaded) {
    fetchEventInfo().then(evt => {
      setEvent({ name: evt.name || '', venue: evt.venue || '', city: evt.city || '', total_capacity: evt.total_capacity || 0 });
      setLoaded(true);
    });
  }

  const toggle = (key) => setNotifications(prev => ({ ...prev, [key]: !prev[key] }));

  const saveSettings = async () => {
    const ok = await saveEventInfo(event);
    Alert.alert('Settings Saved', ok ? 'Event configuration saved to database.' : 'Saved locally (database not reachable).');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Platform, event & notification configuration</Text>
      </View>

      <Text style={styles.sectionTitle}>📋 Event Configuration</Text>
      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Event Name</Text>
          <TextInput style={styles.input} value={event.name} onChangeText={t => setEvent(prev => ({ ...prev, name: t }))} placeholder="Event name" placeholderTextColor="#94A3B8" />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Venue</Text>
          <TextInput style={styles.input} value={event.venue} onChangeText={t => setEvent(prev => ({ ...prev, venue: t }))} placeholder="Venue" placeholderTextColor="#94A3B8" />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>City</Text>
          <TextInput style={styles.input} value={event.city} onChangeText={t => setEvent(prev => ({ ...prev, city: t }))} placeholder="City" placeholderTextColor="#94A3B8" />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Total Capacity</Text>
          <TextInput style={styles.input} value={String(event.total_capacity)} onChangeText={t => setEvent(prev => ({ ...prev, total_capacity: parseInt(t) || 0 }))} keyboardType="numeric" placeholder="0" placeholderTextColor="#94A3B8" />
        </View>
      </View>

      <Text style={styles.sectionTitle}>⚠️ Alert Thresholds</Text>
      <View style={styles.card}>
        <View style={styles.thresholdRow}>
          <Text style={styles.fieldLabel}>Critical Density Threshold</Text>
          <Text style={styles.thresholdVal}>{threshold}%</Text>
        </View>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${threshold}%` }]} />
        </View>
        <Text style={styles.helper}>System triggers critical alerts above this occupancy level.</Text>
        <View style={styles.thresholdBtns}>
          {[40, 50, 55, 60, 70].map(v => (
            <TouchableOpacity key={v} style={[styles.thresholdBtn, threshold === v && styles.thresholdBtnActive]} onPress={() => setThreshold(v)}>
              <Text style={[styles.thresholdBtnText, threshold === v && styles.thresholdBtnTextActive]}>{v}%</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>🔔 Notifications</Text>
      <View style={styles.card}>
        {[
          { key: 'critical', label: 'Critical Alert Push' },
          { key: 'alerts', label: 'Live Alert Updates' },
          { key: 'predictions', label: 'AI Prediction Notices' },
          { key: 'weekly', label: 'Weekly Summary' },
        ].map(toggleItem => (
          <View key={toggleItem.key} style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{toggleItem.label}</Text>
            <Switch
              value={notifications[toggleItem.key]}
              onValueChange={() => toggle(toggleItem.key)}
              trackColor={{ false: '#E2E8F0', true: '#4F46E5' }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={saveSettings}>
        <Text style={styles.saveBtnText}>Save Settings</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: responsivePadding() },
  header: { marginBottom: scaleSize(16), marginTop: scaleSize(8) },
  headerTitle: { fontSize: scaleFont(24), fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: scaleFont(13), color: '#64748B' },
  sectionTitle: { fontSize: scaleFont(17), fontWeight: '700', color: '#0F172A', marginBottom: scaleSize(10), marginTop: scaleSize(8) },
  card: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(16), marginBottom: scaleSize(12), borderWidth: scaleSize(1), borderColor: '#E2E8F0' },
  field: { marginBottom: scaleSize(12) },
  fieldLabel: { fontSize: scaleFont(13), fontWeight: '700', color: '#334155', marginBottom: scaleSize(6) },
  input: { borderWidth: scaleSize(1), borderColor: '#E2E8F0', borderRadius: scaleSize(8), paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(10), fontSize: scaleFont(14), color: '#0F172A', backgroundColor: '#F8FAFC' },
  thresholdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleSize(10) },
  thresholdVal: { fontSize: scaleFont(20), fontWeight: '900', color: '#4F46E5' },
  sliderTrack: { height: scaleSize(8), backgroundColor: '#EEF2FF', borderRadius: scaleSize(4), overflow: 'hidden', marginBottom: scaleSize(6) },
  sliderFill: { height: '100%', backgroundColor: '#4F46E5', borderRadius: scaleSize(4) },
  helper: { fontSize: scaleFont(11), color: '#94A3B8', marginBottom: scaleSize(12) },
  thresholdBtns: { flexDirection: 'row', gap: scaleSize(8) },
  thresholdBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(7), borderRadius: scaleSize(8) },
  thresholdBtnActive: { backgroundColor: '#4F46E5' },
  thresholdBtnText: { fontSize: scaleFont(12), fontWeight: '700', color: '#64748B' },
  thresholdBtnTextActive: { color: '#FFFFFF' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: scaleSize(10), borderBottomWidth: scaleSize(1), borderBottomColor: '#F1F5F9' },
  toggleLabel: { fontSize: scaleFont(14), color: '#1E293B', fontWeight: '600' },
  saveBtn: { backgroundColor: '#4F46E5', borderRadius: scaleSize(12), paddingVertical: scaleSize(14), alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: scaleFont(15), fontWeight: '800' },
});