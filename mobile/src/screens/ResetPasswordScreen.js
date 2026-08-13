import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, SafeAreaView } from 'react-native';
import { supabase } from '../services/supabase';
import { scaleFont, scaleSize, responsivePadding, responsiveBorderRadius } from '../utils/responsive';

export default function ResetPasswordScreen({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email) {
      Alert.alert('Validation', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'crowdiq://reset-password',
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoSymbol}>🔑</Text>
          </View>
          <Text style={styles.title}>CrowdIQ</Text>
        </View>

        <View style={styles.card}>
          {sent ? (
            <>
              <Text style={styles.cardTitle}>Check your email</Text>
              <Text style={styles.cardSubtitle}>
                If an account exists for {email}, a password reset link has been sent. Open it on this device to complete the reset.
              </Text>
              <TouchableOpacity style={styles.button} onPress={onBackToLogin}>
                <Text style={styles.buttonText}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Reset Password</Text>
              <Text style={styles.cardSubtitle}>
                Enter your email and we'll send you a reset link. On mobile, the Supabase redirect link will let you set a new password.
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@company.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity style={styles.button} onPress={handleSend} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
              </TouchableOpacity>
            </>
          )}

          {onBackToLogin ? (
            <TouchableOpacity onPress={onBackToLogin} style={styles.backBtn}>
              <Text style={styles.linkText}>← Back to Sign In</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, padding: responsivePadding(), justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: scaleSize(30) },
  logoBadge: {
    width: scaleSize(60), height: scaleSize(60), borderRadius: scaleSize(12),
    backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', marginBottom: scaleSize(10),
  },
  logoSymbol: { fontSize: scaleFont(28) },
  title: { fontSize: scaleFont(28), fontWeight: 'bold', color: '#1E293B' },
  card: { backgroundColor: '#fff', borderRadius: responsiveBorderRadius(), padding: responsivePadding() },
  cardTitle: { fontSize: scaleFont(24), fontWeight: 'bold', color: '#1E293B', marginBottom: scaleSize(5) },
  cardSubtitle: { fontSize: scaleFont(14), color: '#64748B', marginBottom: scaleSize(20), lineHeight: scaleSize(20) },
  formGroup: { marginBottom: scaleSize(16) },
  label: { fontSize: scaleFont(13), fontWeight: '600', color: '#1E293B', marginBottom: scaleSize(6) },
  input: {
    borderWidth: scaleSize(1), borderColor: '#E2E8F0', borderRadius: responsiveBorderRadius(),
    padding: scaleSize(12), fontSize: scaleFont(15), color: '#1E293B',
  },
  button: {
    backgroundColor: '#4F46E5', borderRadius: responsiveBorderRadius(),
    padding: scaleSize(14), alignItems: 'center', marginBottom: scaleSize(12),
  },
  buttonText: { color: 'white', fontSize: scaleFont(15), fontWeight: 'bold' },
  backBtn: { alignItems: 'center', paddingVertical: scaleSize(8) },
  linkText: { color: '#4F46E5', fontSize: scaleFont(13), fontWeight: '600', textAlign: 'center' },
});