import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView, StyleSheet, Animated } from 'react-native';
import { supabase } from '../services/supabase';
import { scaleFont, scaleSize, responsivePadding, responsiveBorderRadius } from '../utils/responsive';

export default function CreateAccountScreen({ onAccountCreated, onShowLogin }) {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('Aarav Mehta');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateAccount = async () => {
    setError('');
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: fullName,
          },
        },
      });
      if (err) throw err;
      if (onAccountCreated) {
        onAccountCreated(data.user);
      }
    } catch (err) {
      setError(err.message || 'Account creation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoSymbol}>◯</Text>
          </View>
          <Text style={styles.title}>CrowdIQ</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create your account</Text>
          <Text style={styles.cardSubtitle}>Start your free trial — no credit card needed</Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: step === 1 ? '50%' : '100%' }]} />
            </View>
            <Text style={styles.progressText}>Step {step} of 2</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 1 ? (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@company.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={() => setStep(2)}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.reviewBox}>
                <Text style={styles.reviewLabel}>Full Name: {fullName}</Text>
                <Text style={styles.reviewLabel}>Email: {email}</Text>
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleCreateAccount}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep(1)}>
                <Text style={styles.linkText}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          {onShowLogin ? (
            <TouchableOpacity onPress={onShowLogin}>
              <Text style={styles.linkText}>Already have an account? Sign in here</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: responsivePadding(),
  },
  header: {
    alignItems: 'center',
    marginBottom: scaleSize(30),
  },
  logoBadge: {
    width: scaleSize(60),
    height: scaleSize(60),
    borderRadius: scaleSize(12),
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleSize(10),
  },
  logoSymbol: {
    fontSize: scaleFont(28),
    color: 'white',
  },
  title: {
    fontSize: scaleFont(28),
    fontWeight: 'bold',
    color: '#1E293B',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: responsiveBorderRadius(),
    padding: responsivePadding(),
  },
  cardTitle: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: scaleSize(5),
  },
  cardSubtitle: {
    fontSize: scaleFont(14),
    color: '#64748B',
    marginBottom: scaleSize(20),
  },
  progressContainer: {
    marginBottom: scaleSize(20),
  },
  progressTrack: {
    height: scaleSize(6),
    backgroundColor: '#E2E8F0',
    borderRadius: scaleSize(3),
    overflow: 'hidden',
    marginBottom: scaleSize(8),
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: scaleSize(3),
  },
  progressText: {
    fontSize: scaleFont(12),
    color: '#94A3B8',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: scaleSize(12),
    borderRadius: responsiveBorderRadius(),
    marginBottom: scaleSize(16),
  },
  errorText: {
    color: '#991B1B',
    fontSize: scaleFont(13),
  },
  formGroup: {
    marginBottom: scaleSize(16),
  },
  label: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: scaleSize(6),
  },
  input: {
    borderWidth: scaleSize(1),
    borderColor: '#E2E8F0',
    borderRadius: responsiveBorderRadius(),
    padding: scaleSize(12),
    fontSize: scaleFont(15),
    color: '#1E293B',
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: responsiveBorderRadius(),
    padding: scaleSize(14),
    alignItems: 'center',
    marginBottom: scaleSize(12),
  },
  buttonText: {
    color: 'white',
    fontSize: scaleFont(15),
    fontWeight: 'bold',
  },
  reviewBox: {
    backgroundColor: '#F8FAFC',
    padding: scaleSize(12),
    borderRadius: responsiveBorderRadius(),
    marginBottom: scaleSize(20),
  },
  reviewLabel: {
    fontSize: scaleFont(14),
    color: '#1E293B',
    marginBottom: scaleSize(8),
  },
  linkText: {
    color: '#4F46E5',
    fontSize: scaleFont(13),
    fontWeight: '600',
    textAlign: 'center',
  },
});
