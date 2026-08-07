import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';

import DashboardScreen from '../screens/DashboardScreen';
import MapScreen from '../screens/MapScreen';
import PredictionsScreen from '../screens/PredictionsScreen';
import StaffScreen from '../screens/StaffScreen';
import IncidentsScreen from '../screens/IncidentsScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ symbol, focused }) {
  return <Text style={[styles.icon, focused && styles.focusedIcon]}>{symbol}</Text>;
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '800' },
        tabBarStyle: { backgroundColor: '#FFFFFF', height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Overview',
          tabBarIcon: ({ focused }) => <TabIcon symbol="📊" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="LiveMap"
        component={MapScreen}
        options={{
          title: 'Live Map',
          tabBarIcon: ({ focused }) => <TabIcon symbol="🗺️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Predictions"
        component={PredictionsScreen}
        options={{
          title: 'AI Forecast',
          tabBarIcon: ({ focused }) => <TabIcon symbol="⚡" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Staff"
        component={StaffScreen}
        options={{
          title: 'Ground Staff',
          tabBarIcon: ({ focused }) => <TabIcon symbol="👮" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Incidents"
        component={IncidentsScreen}
        options={{
          title: 'Safety Logs',
          tabBarIcon: ({ focused }) => <TabIcon symbol="🚨" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 18, opacity: 0.6 },
  focusedIcon: { opacity: 1 },
});
