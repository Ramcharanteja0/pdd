import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { fetchStaff } from '../services/dataService';
import { scaleFont, scaleSize, responsivePadding, responsiveBorderRadius } from '../utils/responsive';

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
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: responsivePadding() },
  header: { marginBottom: scaleSize(16), marginTop: scaleSize(8) },
  headerTitle: { fontSize: scaleFont(24), fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: scaleFont(13), color: '#64748B' },
  staffCard: { backgroundColor: '#FFFFFF', borderRadius: scaleSize(16), padding: scaleSize(16), marginBottom: scaleSize(12), borderWidth: scaleSize(1), borderColor: '#E2E8F0' },
  staffHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: scaleSize(14) },
  staffName: { fontSize: scaleFont(16), fontWeight: '700', color: '#0F172A' },
  staffRole: { fontSize: scaleFont(13), color: '#64748B', marginTop: scaleSize(2) },
  statusBadge: { paddingHorizontal: scaleSize(10), paddingVertical: scaleSize(4), borderRadius: scaleSize(12) },
  activeBadge: { backgroundColor: '#D1FAE5' },
  breakBadge: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: scaleFont(11), fontWeight: '700' },
  activeText: { color: '#065F46' },
  breakText: { color: '#92400E' },
  staffFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: scaleSize(10), borderTopWidth: scaleSize(1), borderTopColor: '#F1F5F9' },
  batteryText: { fontSize: scaleFont(12), color: '#94A3B8', fontWeight: '500' },
  dispatchBtn: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', borderWidth: scaleSize(1), paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(6), borderRadius: scaleSize(8) },
  dispatchText: { color: '#4F46E5', fontSize: scaleFont(12), fontWeight: '700' },
});
