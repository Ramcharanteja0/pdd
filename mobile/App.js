import * as ReactNative from 'react-native';

// Polyfill codegenNativeCommands for React Native 0.78 / Expo SDK 54 compatibility
if (typeof ReactNative.codegenNativeCommands !== 'function') {
  ReactNative.codegenNativeCommands = function (options) {
    const commands = options?.supportedCommands || [];
    return commands.reduce((acc, command) => {
      acc[command] = (ref, ...args) => {
        try {
          if (ReactNative.UIManager && ReactNative.findNodeHandle) {
            const handle = ReactNative.findNodeHandle(ref);
            if (handle) {
              ReactNative.UIManager.dispatchViewManagerCommand(handle, command, args);
            }
          }
        } catch (e) {
          // Fallback if node handle or command dispatch fails
        }
      };
      return acc;
    }, {});
  };
}

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { supabase } from './src/services/supabase';

import LoginScreen from './src/screens/LoginScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import CreateAccountScreen from './src/screens/CreateAccountScreen';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [showReset, setShowReset] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) setUser(data?.session?.user ?? null);
      } catch (err) {
        console.warn('Auth note:', err);
      } finally {
        if (mounted) setInitializing(false);
      }
    }

    initAuth();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Starting CrowdIQ...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {user ? (
        <AppNavigator user={user} onLogout={() => { supabase.auth.signOut(); setUser(null); }} />
      ) : showCreateAccount ? (
        <CreateAccountScreen
          onAccountCreated={(u) => setUser(u)}
          onShowLogin={() => setShowCreateAccount(false)}
        />
      ) : showReset ? (
        <ResetPasswordScreen onBackToLogin={() => setShowReset(false)} />
      ) : (
        <LoginScreen
          onLoginSuccess={(u) => setUser(u)}
          onShowCreateAccount={() => setShowCreateAccount(true)}
          onForgotPassword={() => setShowReset(true)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
});
