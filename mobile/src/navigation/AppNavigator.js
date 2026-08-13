import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform, ScrollView } from 'react-native';

import DashboardScreen from '../screens/DashboardScreen';
import MapScreen from '../screens/MapScreen';
import EventSetupScreen from '../screens/EventSetupScreen';
import IncidentsScreen from '../screens/IncidentsScreen';
import AlertsScreen from '../screens/AlertsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TrackingScreen from '../screens/TrackingScreen';

const TABS = [
  { id: 'Dashboard', label: 'Overview', icon: '📊' },
  { id: 'Map', label: 'Live Map', icon: '🗺️' },
  { id: 'Alerts', label: 'Alerts', icon: '🔔' },
  { id: 'Analytics', label: 'Insights', icon: '📈' },
  { id: 'Tracking', label: 'GPS', icon: '📍' },
  { id: 'EventSetup', label: 'Setup', icon: '⚙️' },
  { id: 'Incidents', label: 'Safety', icon: '🚨' },
  { id: 'Settings', label: 'Settings', icon: '🛠️' },
];

export default function AppNavigator({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('Dashboard');

  const renderScreen = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <DashboardScreen />;
      case 'Map':
        return <MapScreen />;
      case 'EventSetup':
        return <EventSetupScreen />;
      case 'Incidents':
        return <IncidentsScreen />;
      case 'Alerts':
        return <AlertsScreen />;
      case 'Analytics':
        return <AnalyticsScreen />;
      case 'Settings':
        return <SettingsScreen />;
      case 'Tracking':
        return <TrackingScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topbar}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoSymbol}>⚡</Text>
          </View>
          <Text style={styles.brandText}>Crowd<Text style={{ color: '#818CF8' }}>IQ</Text></Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Sign Out ➔</Text>
        </TouchableOpacity>
      </View>

      {/* Screen Body */}
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabbarContent}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabItem, isActive && styles.activeTabItem]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabIcon, isActive && styles.activeTabIcon]}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topbar: {
    height: 56,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSymbol: {
    fontSize: 16,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  logoutText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabbar: {
    height: Platform.OS === 'ios' ? 70 : 62,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: Platform.OS === 'ios' ? 14 : 6,
    paddingTop: 6,
    alignItems: 'center',
  },
  tabbarContent: {
    paddingHorizontal: 8,
  },
  tabItem: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  activeTabItem: {
    transform: [{ scale: 1.05 }],
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
    marginBottom: 2,
  },
  activeTabIcon: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeTabLabel: {
    color: '#4F46E5',
    fontWeight: '800',
  },
});
