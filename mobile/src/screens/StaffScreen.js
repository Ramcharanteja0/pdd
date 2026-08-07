import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { fetchStaff } from '../services/dataService';

export default function StaffScreen() {
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    fetchStaff().then(setStaffList);
  }, []);

  const handleDispatch = (staffMember) => {
    Alert.alert('👮 Staff Dispatched', `Task sent to ${staffMember.name} (${staffMember.role}) in ${staffMember.zone}.`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ground Staff Operations</Text>
        <Text style={styles.headerSubtitle}>Field deployment & task dispatch panel</Text>
      </View>

      {staffList.map((member) => (
        <View key={member.id} style={styles.staffCard}>
          <View style={styles.staffHeader}>
            <View>
              <Text style={styles.staffName}>{member.name}</Text>
              <Text style={styles.staffRole}>{member.role} • {member.zone}</Text>
            </View>
            <View style={[styles.statusBadge, member.status === 'Active' ? styles.activeBadge : styles.breakBadge]}>
              <Text style={[styles.statusText, member.status === 'Active' ? styles.activeText : styles.breakText]}>
                {member.status}
              </Text>
            </View>
          </View>

          <View style={styles.staffFooter}>
            <Text style={styles.batteryText}>🔋 Battery: {member.battery || '90%'}</Text>
            <TouchableOpacity style={styles.dispatchBtn} onPress={() => handleDispatch(member)}>
              <Text style={styles.dispatchText}>⚡ Dispatch Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  header: { marginBottom: 16, marginTop: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 13, color: '#64748B' },
  staffCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  staffHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  staffName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  staffRole: { fontSize: 13, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadge: { backgroundColor: '#D1FAE5' },
  breakBadge: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 11, fontWeight: '700' },
  activeText: { color: '#065F46' },
  breakText: { color: '#92400E' },
  staffFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  batteryText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  dispatchBtn: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  dispatchText: { color: '#4F46E5', fontSize: 12, fontWeight: '700' },
});
