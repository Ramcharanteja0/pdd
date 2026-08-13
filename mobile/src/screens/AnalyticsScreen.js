import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { fetchIncidents, fetchDispatchLog, fetchStaff, buildCrowdTimeline } from '../services/dataService';
import { scaleFont, scaleSize, responsivePadding } from '../utils/responsive';

export default function AnalyticsScreen() {
  const [incidents, setIncidents] = useState([]);
  const [dispatchLog, setDispatchLog] = useState([]);
  const [staff, setStaff] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const [inc, dl, st, tl] = await Promise.all([
      fetchIncidents(), fetchDispatchLog(), fetchStaff(), buildCrowdTimeline(),
    ]);
    setIncidents(inc);
    setDispatchLog(dl);
    setStaff(st);
    setTimeline(tl);
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalIncidents = incidents.length;
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved').length;
  const totalDispatches = dispatchLog.length;
  const openCount = incidents.filter(i => i.status !== 'resolved').length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Event Analytics</Text>
        <Text style={styles.headerSubtitle}>Incidents, dispatch & crowd insights</Text>
      </View>

      <View style={styles.statGrid}>
        <View style={[styles.statCard, { borderTopColor: '#EF4444' }]}>
          <Text style={styles.statValue}>{totalIncidents}</Text>
          <Text style={styles.statLabel}>Total Incidents</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#10B981' }]}>
          <Text style={styles.statValue}>{resolvedIncidents}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#F59E0B' }]}>
          <Text style={styles.statValue}>{openCount}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#6366F1' }]}>
          <Text style={styles.statValue}>{totalDispatches}</Text>
          <Text style={styles.statLabel}>Dispatches</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Peak Crowd Hours</Text>
      <View style={styles.chartCard}>
        {timeline.length === 0 ? (
          <Text style={styles.emptyText}>No timeline data.</Text>
        ) : (
          <TimelineBars data={timeline} />
        )}
      </View>

      <Text style={styles.sectionTitle}>Recent Incidents</Text>
      {incidents.length === 0 ? (
        <View style={styles.emptyCard}><Text style={styles.emptyText}>No incidents recorded.</Text></View>
      ) : (
        incidents.slice(0, 6).map(incident => (
          <View key={incident.id} style={styles.incidentCard}>
            <View style={styles.incidentHeader}>
              <Text style={styles.incidentTitle}>{incident.title}</Text>
              <Text style={[styles.incidentStatus, { color: incident.status === 'resolved' ? '#10B981' : '#EF4444' }]}>
                {incident.status}
              </Text>
            </View>
            {incident.zone ? <Text style={styles.incidentZone}>Zone: {incident.zone} • {incident.severity || 'n/a'}</Text> : null}
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Dispatch Log</Text>
      {dispatchLog.length === 0 ? (
        <View style={styles.emptyCard}><Text style={styles.emptyText}>No dispatches recorded.</Text></View>
      ) : (
        dispatchLog.slice(0, 6).map(item => (
          <View key={item.id} style={styles.dispatchCard}>
            <Text style={styles.dispatchMsg}>{item.message}</Text>
            {item.staff ? <Text style={styles.dispatchStaff}>To: {item.staff.name} ({item.staff.role})</Text> : null}
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Staff Overview</Text>
      <View style={styles.chartCard}>
        {staff.length === 0 ? (
          <Text style={styles.emptyText}>No staff data.</Text>
        ) : (
          staff.map(s => {
            const onDuty = s.status === 'Active';
            return (
              <View key={s.id} style={styles.staffRow}>
                <View style={[styles.staffDot, { backgroundColor: onDuty ? '#10B981' : '#F59E0B' }]} />
                <Text style={styles.staffName} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.staffRole} numberOfLines={1}>{s.role}</Text>
              </View>
            );
          })
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function TimelineBars({ data }) {
  const max = Math.max(...data.map(d => d.attendees), 1);
  return (
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
  chartCard: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(16), marginBottom: scaleSize(16), borderWidth: scaleSize(1), borderColor: '#E2E8F0' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(14), padding: scaleSize(16), alignItems: 'center', borderWidth: scaleSize(1), borderColor: '#E2E8F0', marginBottom: scaleSize(12) },
  emptyText: { color: '#94A3B8', fontSize: scaleFont(13), textAlign: 'center' },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', height: scaleSize(120), justifyContent: 'space-between' },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', marginHorizontal: scaleSize(2) },
  barTrack: { flex: 1, width: '70%', justifyContent: 'flex-end', backgroundColor: '#EEF2FF', borderRadius: scaleSize(4), overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: '#6366F1', borderRadius: scaleSize(4), minHeight: scaleSize(4) },
  barLabel: { fontSize: scaleFont(9), color: '#94A3B8', marginTop: scaleSize(6), fontWeight: '600' },
  incidentCard: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(12), padding: scaleSize(14), marginBottom: scaleSize(10), borderWidth: scaleSize(1), borderColor: '#E2E8F0' },
  incidentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  incidentTitle: { fontSize: scaleFont(14), fontWeight: '700', color: '#0F172A', flex: 1, marginRight: scaleSize(8) },
  incidentStatus: { fontSize: scaleFont(11), fontWeight: '800', textTransform: 'uppercase' },
  incidentZone: { fontSize: scaleFont(12), color: '#64748B', marginTop: scaleSize(4) },
  dispatchCard: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(12), padding: scaleSize(14), marginBottom: scaleSize(10), borderWidth: scaleSize(1), borderColor: '#E2E8F0' },
  dispatchMsg: { fontSize: scaleFont(13), color: '#334155', fontWeight: '600' },
  dispatchStaff: { fontSize: scaleFont(12), color: '#64748B', marginTop: scaleSize(4) },
  staffRow: { flexDirection: 'row', alignItems: 'center', marginBottom: scaleSize(10) },
  staffDot: { width: scaleSize(8), height: scaleSize(8), borderRadius: scaleSize(4), marginRight: scaleSize(10) },
  staffName: { flex: 1, fontSize: scaleFont(13), fontWeight: '600', color: '#334155' },
  staffRole: { fontSize: scaleFont(12), color: '#94A3B8', width: scaleSize(90), textAlign: 'right' },
});