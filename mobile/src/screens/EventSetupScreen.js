import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { fetchZones, fetchEventInfo, saveEventInfo, saveZone, deleteZone } from '../services/dataService';
import { scaleFont, scaleSize, responsivePadding } from '../utils/responsive';

const EMPTY_ZONE = { id: '', name: '', capacity: 500, radius: 50, lat: 13.1945, lng: 80.2425 };

export default function EventSetupScreen() {
  const [event, setEvent] = useState({ name: '', venue: '', city: '', date: '', total_capacity: 5000, venue_lat: '', venue_lng: '' });
  const [zones, setZones] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const [zoneData, evt] = await Promise.all([fetchZones(), fetchEventInfo()]);
    setZones(zoneData.map(z => ({
      id: z.id,
      name: z.name,
      capacity: z.max_capacity || z.capacity || 500,
      radius: z.radius_meters || 50,
      lat: z.latitude || z.lat || 13.1945,
      lng: z.longitude || z.lng || 80.2425,
    })));
    setEvent({
      name: evt.name || '',
      venue: evt.venue || '',
      city: evt.city || '',
      date: evt.date || '',
      total_capacity: evt.total_capacity || 0,
      venue_lat: evt.venue_lat != null ? String(evt.venue_lat) : '',
      venue_lng: evt.venue_lng != null ? String(evt.venue_lng) : '',
    });
  };

  useEffect(() => { loadData(); }, []);

  const handleSaveEvent = async () => {
    setSaving(true);
    const ok = await saveEventInfo({
      name: event.name,
      venue: event.venue,
      city: event.city,
      date: event.date,
      total_capacity: event.total_capacity,
      venue_lat: event.venue_lat ? parseFloat(event.venue_lat) : null,
      venue_lng: event.venue_lng ? parseFloat(event.venue_lng) : null,
    });
    setSaving(false);
    if (ok) Alert.alert('✅ Saved', 'Event details saved to Supabase.');
    else Alert.alert('⚠️ Error', 'Could not save event details.');
  };

  const addZone = () => {
    const newZone = { ...EMPTY_ZONE, id: `zone-${Date.now()}` };
    setZones(prev => [...prev, newZone]);
  };

  const updateZone = (id, field, value) => {
    setZones(prev => prev.map(z => (z.id === id ? { ...z, [field]: value } : z)));
  };

  const removeZone = (id) => {
    setZones(prev => prev.filter(z => z.id !== id));
    deleteZone(id);
  };

  const handleSaveZones = async () => {
    setSaving(true);
    let ok = true;
    for (const z of zones) {
      const saved = await saveZone({
        id: z.id,
        name: z.name,
        capacity: z.capacity,
        radius_meters: z.radius,
        lat: z.lat,
        lng: z.lng,
        density: 0,
      });
      if (!saved) ok = false;
    }
    setSaving(false);
    Alert.alert(ok ? '✅ Saved' : '⚠️ Partial', ok ? 'All zones saved to Supabase.' : 'Some zones could not be saved.');
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Event Setup</Text>
          <Text style={styles.headerSubtitle}>Configure event & crowd zones</Text>
        </View>

        {/* Event Details */}
        <Text style={styles.sectionTitle}>📋 Event Details</Text>
        <View style={styles.card}>
          {[
            { key: 'name', label: 'Event Name', placeholder: 'Tech Summit 2026' },
            { key: 'venue', label: 'Venue', placeholder: 'Saveetha Engineering College' },
            { key: 'city', label: 'City', placeholder: 'Chennai' },
            { key: 'date', label: 'Date', placeholder: '2026-01-15' },
          ].map(field => (
            <View key={field.key} style={styles.field}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput
                style={styles.input}
                value={event[field.key]}
                onChangeText={t => setEvent(prev => ({ ...prev, [field.key]: t }))}
                placeholder={field.placeholder}
                placeholderTextColor="#94A3B8"
              />
            </View>
          ))}
          <View style={styles.zoneFields}>
            <View style={styles.zoneField}>
              <Text style={styles.fieldLabel}>Venue Latitude</Text>
              <TextInput
                style={styles.input}
                value={event.venue_lat}
                onChangeText={t => setEvent(prev => ({ ...prev, venue_lat: t }))}
                keyboardType="numeric"
                placeholder="e.g. 13.1945"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={styles.zoneField}>
              <Text style={styles.fieldLabel}>Venue Longitude</Text>
              <TextInput
                style={styles.input}
                value={event.venue_lng}
                onChangeText={t => setEvent(prev => ({ ...prev, venue_lng: t }))}
                keyboardType="numeric"
                placeholder="e.g. 80.2425"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Total Capacity</Text>
            <TextInput
              style={styles.input}
              value={String(event.total_capacity)}
              onChangeText={t => setEvent(prev => ({ ...prev, total_capacity: parseInt(t) || 0 }))}
              keyboardType="numeric"
              placeholder="5000"
              placeholderTextColor="#94A3B8"
            />
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveEvent} disabled={saving}>
            <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save Event Details'}</Text>
          </TouchableOpacity>
        </View>

        {/* Zones */}
        <View style={styles.zoneHeader}>
          <Text style={styles.sectionTitle}>🎯 Zones ({zones.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={addZone}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {zones.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No zones configured. Tap "+ Add" to create a zone.</Text>
          </View>
        ) : (
          zones.map((zone) => (
            <View key={zone.id} style={styles.card}>
              <View style={styles.zoneRowHeader}>
                <TextInput
                  style={styles.zoneNameInput}
                  value={zone.name}
                  onChangeText={t => updateZone(zone.id, 'name', t)}
                  placeholder="Zone name"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity onPress={() => removeZone(zone.id)}>
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.zoneFields}>
                <View style={styles.zoneField}>
                  <Text style={styles.fieldLabel}>Capacity</Text>
                  <TextInput
                    style={styles.input}
                    value={String(zone.capacity)}
                    onChangeText={t => updateZone(zone.id, 'capacity', parseInt(t) || 0)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.zoneField}>
                  <Text style={styles.fieldLabel}>Radius (m)</Text>
                  <TextInput
                    style={styles.input}
                    value={String(zone.radius)}
                    onChangeText={t => updateZone(zone.id, 'radius', parseInt(t) || 0)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.zoneFields}>
                <View style={styles.zoneField}>
                  <Text style={styles.fieldLabel}>Latitude</Text>
                  <TextInput
                    style={styles.input}
                    value={String(zone.lat)}
                    onChangeText={t => updateZone(zone.id, 'lat', parseFloat(t) || 0)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.zoneField}>
                  <Text style={styles.fieldLabel}>Longitude</Text>
                  <TextInput
                    style={styles.input}
                    value={String(zone.lng)}
                    onChangeText={t => updateZone(zone.id, 'lng', parseFloat(t) || 0)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity style={[styles.primaryBtn, zones.length === 0 && styles.disabledBtn]} onPress={handleSaveZones} disabled={saving || zones.length === 0}>
          <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save All Zones'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: responsivePadding() },
  header: { marginBottom: scaleSize(16), marginTop: scaleSize(8) },
  headerTitle: { fontSize: scaleFont(24), fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: scaleFont(13), color: '#64748B' },
  sectionTitle: { fontSize: scaleFont(17), fontWeight: '700', color: '#0F172A', marginBottom: scaleSize(10) },
  zoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleSize(10) },
  addBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: scaleSize(14), paddingVertical: scaleSize(6), borderRadius: scaleSize(8), borderWidth: scaleSize(1), borderColor: '#C7D2FE' },
  addBtnText: { color: '#4F46E5', fontSize: scaleFont(13), fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(16), marginBottom: scaleSize(12), borderWidth: scaleSize(1), borderColor: '#E2E8F0' },
  field: { marginBottom: scaleSize(12) },
  fieldLabel: { fontSize: scaleFont(12), fontWeight: '600', color: '#64748B', marginBottom: scaleSize(4) },
  input: { borderWidth: scaleSize(1), borderColor: '#E2E8F0', borderRadius: scaleSize(8), paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(9), fontSize: scaleFont(14), color: '#0F172A', backgroundColor: '#F8FAFC' },
  primaryBtn: { backgroundColor: '#4F46E5', borderRadius: scaleSize(12), paddingVertical: scaleSize(13), alignItems: 'center', marginBottom: scaleSize(12) },
  primaryBtnText: { color: '#FFFFFF', fontSize: scaleFont(14), fontWeight: '800' },
  disabledBtn: { opacity: 0.5 },
  emptyText: { textAlign: 'center', color: '#64748B', fontSize: scaleFont(13), paddingVertical: scaleSize(8) },
  zoneRowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: scaleSize(12) },
  zoneNameInput: { flex: 1, borderWidth: scaleSize(1), borderColor: '#E2E8F0', borderRadius: scaleSize(8), paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(9), fontSize: scaleFont(15), fontWeight: '700', color: '#0F172A', backgroundColor: '#F8FAFC' },
  deleteText: { color: '#EF4444', fontSize: scaleFont(20), fontWeight: '800', marginLeft: scaleSize(12), padding: scaleSize(4) },
  zoneFields: { flexDirection: 'row', gap: scaleSize(10), marginBottom: scaleSize(10) },
  zoneField: { flex: 1 },
});
