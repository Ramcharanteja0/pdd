import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { generateLivePredictions, fetchAutomatedActions, logAutomatedAction, fetchZoneDensitySnapshot } from '../services/dataService';
import { scaleFont, scaleSize, responsivePadding } from '../utils/responsive';

function riskColor(risk) {
  if (risk === 'HIGH') return '#EF4444';
  if (risk === 'MEDIUM') return '#F59E0B';
  return risk === 'LOW' ? '#10B981' : '#64748B';
}

function riskBg(risk) {
  if (risk === 'HIGH') return '#FEE2E2';
  if (risk === 'MEDIUM') return '#FEF3C7';
  return '#D1FAE5';
}

function DensityBar({ snapshot }) {
  const max = Math.max(...snapshot.map(s => s.density), 1);
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Zone Density Overview</Text>
      <Text style={styles.chartSub}>Current occupancy by zone</Text>
      {snapshot.length === 0 ? (
        <Text style={styles.emptyText}>No zone data.</Text>
      ) : (
        snapshot.map(s => {
          const pct = s.density;
          return (
            <View key={s.zone} style={styles.zoneRow}>
              <Text style={styles.zoneName} numberOfLines={1}>{s.zone}</Text>
              <View style={styles.zoneTrack}>
                <View style={[styles.zoneFill, { width: `${Math.min(pct / max * 100, 100)}%`, backgroundColor: riskColor(pct >= 80 ? 'HIGH' : pct >= 50 ? 'MEDIUM' : 'LOW') }]} />
              </View>
              <Text style={styles.zoneVal}>{pct}%</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

export default function PredictionsScreen() {
  const [predictions, setPredictions] = useState([]);
  const [actions, setActions] = useState([]);
  const [snapshot, setSnapshot] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const [preds, acts, snap] = await Promise.all([
      generateLivePredictions(),
      fetchAutomatedActions(),
      fetchZoneDensitySnapshot(),
    ]);
    setPredictions(preds);
    setActions(acts);
    setSnapshot(snap);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAction = async (pred) => {
    const ok = await logAutomatedAction({
      zone: pred.zone,
      title: pred.risk === 'HIGH' ? 'Critical Action Triggered' : 'Preventive Action',
      description: pred.action || pred.prediction,
    });
    if (ok) {
      Alert.alert('Action Logged', `Action recorded for ${pred.zone}.`);
      await loadData();
    } else {
      Alert.alert('Error', 'Could not log action.');
    }
  };

  const highCount = predictions.filter(p => p.risk === 'HIGH').length;
  const medCount = predictions.filter(p => p.risk === 'MEDIUM').length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Predictions</Text>
        <Text style={styles.headerSubtitle}>Live crowd forecasting & automated response</Text>
      </View>

      <View style={styles.statGrid}>
        <View style={[styles.statCard, { borderTopColor: '#6366F1' }]}>
          <Text style={styles.statValue}>{predictions.length}</Text>
          <Text style={styles.statLabel}>Predictions</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#EF4444' }]}>
          <Text style={styles.statValue}>{highCount}</Text>
          <Text style={styles.statLabel}>High Risk</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#F59E0B' }]}>
          <Text style={styles.statValue}>{medCount}</Text>
          <Text style={styles.statLabel}>Medium Risk</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#10B981' }]}>
          <Text style={styles.statValue}>{actions.length}</Text>
          <Text style={styles.statLabel}>Actions Taken</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Active Predictions</Text>
      {predictions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No live predictions — all zones below thresholds.</Text>
        </View>
      ) : (
        predictions.map(pred => (
          <View key={pred.id} style={styles.predCard}>
            <View style={styles.predHeader}>
              <View style={[styles.riskBadge, { backgroundColor: riskBg(pred.risk) }]}>
                <Text style={[styles.riskText, { color: riskColor(pred.risk) }]}>{pred.risk}</Text>
              </View>
              <Text style={styles.predZone}>{pred.zone}</Text>
              <Text style={styles.predConfidence}>{(pred.confidence || 0)}%</Text>
            </View>
            <Text style={styles.prediction}>{pred.prediction}</Text>
            {pred.action ? <Text style={styles.actionText}>→ {pred.action}</Text> : null}
            <TouchableOpacity style={styles.actBtn} onPress={() => handleAction(pred)}>
              <Text style={styles.actBtnText}>⚡ Trigger Action</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <DensityBar snapshot={snapshot} />

      <Text style={styles.sectionTitle}>Automated Actions Log</Text>
      {actions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No automated actions recorded.</Text>
        </View>
      ) : (
        actions.map(action => (
          <View key={action.id} style={styles.actionCard}>
            <Text style={styles.actionTitle}>{action.title}</Text>
            <Text style={styles.actionZone}>Zone: {action.zone}</Text>
            <Text style={styles.actionDesc}>{action.description}</Text>
            {action.triggered_by ? <Text style={styles.actionMeta}>Triggered by: {action.triggered_by}</Text> : null}
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
  statGrid: { flexDirection: 'row', gap: scaleSize(8), marginBottom: scaleSize(16) },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(14), borderTopWidth: scaleSize(3) },
  statValue: { fontSize: scaleFont(20), fontWeight: '900', color: '#0F172A' },
  statLabel: { fontSize: scaleFont(10), color: '#64748B', marginTop: scaleSize(2), fontWeight: '600' },
  sectionTitle: { fontSize: scaleFont(17), fontWeight: '700', color: '#0F172A', marginBottom: scaleSize(10), marginTop: scaleSize(8) },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(16), alignItems: 'center', borderWidth: scaleSize(1), borderColor: '#E2E8F0', marginBottom: scaleSize(12) },
  emptyText: { color: '#94A3B8', fontSize: scaleFont(13) },
  predCard: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(16), marginBottom: scaleSize(12), borderWidth: scaleSize(1), borderColor: '#E2E8F0', borderLeftWidth: scaleSize(4) },
  predHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: scaleSize(10) },
  riskBadge: { paddingHorizontal: scaleSize(10), paddingVertical: scaleSize(4), borderRadius: scaleSize(6) },
  riskText: { fontSize: scaleFont(11), fontWeight: '900' },
  predZone: { flex: 1, fontSize: scaleFont(15), fontWeight: '700', color: '#0F172A', marginLeft: scaleSize(10) },
  predConfidence: { fontSize: scaleFont(13), fontWeight: '800', color: '#4F46E5' },
  prediction: { fontSize: scaleFont(13), color: '#475569', marginBottom: scaleSize(8) },
  actionText: { fontSize: scaleFont(13), color: '#4F46E5', marginBottom: scaleSize(12) },
  actBtn: { alignSelf: 'flex-start', backgroundColor: '#EEF2FF', paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(7), borderRadius: scaleSize(8), borderWidth: scaleSize(1), borderColor: '#C7D2FE' },
  actBtnText: { color: '#4F46E5', fontSize: scaleFont(12), fontWeight: '700' },
  chartCard: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(16), marginBottom: scaleSize(16), borderWidth: scaleSize(1), borderColor: '#E2E8F0' },
  chartTitle: { fontSize: scaleFont(16), fontWeight: '700', color: '#0F172A' },
  chartSub: { fontSize: scaleFont(12), color: '#64748B', marginTop: scaleSize(2), marginBottom: scaleSize(12) },
  zoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: scaleSize(10) },
  zoneName: { width: scaleSize(95), fontSize: scaleFont(12), fontWeight: '600', color: '#334155' },
  zoneTrack: { flex: 1, height: scaleSize(8), backgroundColor: '#F1F5F9', borderRadius: scaleSize(4), marginHorizontal: scaleSize(8), overflow: 'hidden' },
  zoneFill: { height: '100%', borderRadius: scaleSize(4) },
  zoneVal: { fontSize: scaleFont(12), fontWeight: '800', color: '#334155', width: scaleSize(42), textAlign: 'right' },
  actionCard: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(16), marginBottom: scaleSize(12), borderWidth: scaleSize(1), borderColor: '#E2E8F0' },
  actionTitle: { fontSize: scaleFont(15), fontWeight: '700', color: '#0F172A', marginBottom: scaleSize(4) },
  actionZone: { fontSize: scaleFont(12), color: '#4F46E5', marginBottom: scaleSize(6), fontWeight: '600' },
  actionDesc: { fontSize: scaleFont(13), color: '#475569', marginBottom: scaleSize(6) },
  actionMeta: { fontSize: scaleFont(11), color: '#94A3B8', marginTop: scaleSize(2) },
});