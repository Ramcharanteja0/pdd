import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { supabase } from '../services/supabase';
import { scaleFont, scaleSize, responsivePadding, responsiveBorderRadius, screenWidth } from '../utils/responsive';

export default function LoginScreen({ onLoginSuccess, onShowCreateAccount, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      if (onLoginSuccess) onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      if (onLoginSuccess) {
        onLoginSuccess({ id: 'demo-123', email: 'demo@crowdiq.ai', user_metadata: { name: 'Demo Manager' } });
      }
      setLoading(false);
    }, 400);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header with Logo */}
        <View style={styles.gradientHeader}>
          <View style={styles.headerContent}>
            <View style={styles.logoBadge}>
              <View style={styles.logoPulse} />
              <View style={styles.logoPulse2} />
              <View style={styles.logoCenter} />
            </View>
            <Text style={styles.brandTitle}>CrowdIQ</Text>
          </View>
        </View>

        {/* Login Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your event operations dashboard</Text>

          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="you@company.com"
                placeholderTextColor="#CBD5E1"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#CBD5E1"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Text>{showPassword ? '👁️' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgotPassword} onPress={onForgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>➔ Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.demoButton}
            onPress={handleDemoLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.demoButtonIcon}>🚀</Text>
            <Text style={styles.demoButtonText}>Try Demo Dashboard</Text>
          </TouchableOpacity>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            {onShowCreateAccount ? (
              <TouchableOpacity onPress={onShowCreateAccount}>
                <Text style={styles.footerLink}>Create one free</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity style={styles.backHomeButton}>
            <Text style={styles.backHomeText}>← Back to home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  gradientHeader: {
    paddingVertical: scaleSize(40),
    paddingHorizontal: responsivePadding(),
    alignItems: 'center',
    borderBottomLeftRadius: scaleSize(24),
    borderBottomRightRadius: scaleSize(24),
    backgroundColor: '#7C3AED',
  },
  headerContent: {
    alignItems: 'center',
  },
  logoBadge: {
    width: scaleSize(70),
    height: scaleSize(70),
    borderRadius: scaleSize(18),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleSize(12),
  },
  logoPulse: {
    width: scaleSize(50),
    height: scaleSize(50),
    borderRadius: scaleSize(12),
    borderWidth: scaleSize(2),
    borderColor: 'rgba(255, 255, 255, 0.4)',
    position: 'absolute',
  },
  logoPulse2: {
    width: scaleSize(35),
    height: scaleSize(35),
    borderRadius: scaleSize(8),
    borderWidth: scaleSize(2),
    borderColor: 'rgba(255, 255, 255, 0.6)',
    position: 'absolute',
  },
  logoCenter: {
    width: scaleSize(12),
    height: scaleSize(12),
    borderRadius: scaleSize(6),
    backgroundColor: '#FFFFFF',
    position: 'absolute',
  },
  brandTitle: {
    fontSize: scaleFont(28),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scaleSize(24),
    borderTopRightRadius: scaleSize(24),
    padding: responsivePadding() + 4,
    flex: 1,
  },
  cardTitle: {
    fontSize: scaleFont(28),
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: scaleSize(8),
  },
  cardSubtitle: {
    fontSize: scaleFont(14),
    color: '#94A3B8',
    marginBottom: scaleSize(20),
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderLeftWidth: scaleSize(4),
    padding: scaleSize(12),
    borderRadius: scaleSize(8),
    marginBottom: scaleSize(16),
  },
  errorText: {
    color: '#991B1B',
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: scaleSize(16),
  },
  label: {
    fontSize: scaleFont(13),
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: scaleSize(8),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: scaleSize(1),
    borderRadius: responsiveBorderRadius(),
    paddingHorizontal: scaleSize(12),
  },
  inputIcon: {
    fontSize: scaleFont(18),
    marginRight: scaleSize(8),
  },
  input: {
    flex: 1,
    paddingVertical: scaleSize(12),
    fontSize: scaleFont(15),
    color: '#1E293B',
  },
  eyeIcon: {
    padding: scaleSize(8),
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: scaleSize(16),
  },
  forgotPasswordText: {
    color: '#6366F1',
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    borderRadius: responsiveBorderRadius(),
    paddingVertical: scaleSize(14),
    alignItems: 'center',
    marginBottom: scaleSize(16),
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: scaleSize(4) },
    shadowOpacity: 0.3,
    shadowRadius: scaleSize(8),
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: scaleFont(15),
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: scaleSize(16),
  },
  dividerLine: {
    flex: 1,
    height: scaleSize(1),
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: scaleSize(12),
    fontSize: scaleFont(12),
    color: '#94A3B8',
  },
  demoButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: scaleSize(1.5),
    borderRadius: responsiveBorderRadius(),
    paddingVertical: scaleSize(12),
    paddingHorizontal: scaleSize(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleSize(20),
  },
  demoButtonIcon: {
    fontSize: scaleFont(16),
    marginRight: scaleSize(8),
  },
  demoButtonText: {
    color: '#1E293B',
    fontSize: scaleFont(14),
    fontWeight: '700',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: scaleSize(12),
  },
  footerText: {
    fontSize: scaleFont(13),
    color: '#64748B',
  },
  footerLink: {
    fontSize: scaleFont(13),
    color: '#6366F1',
    fontWeight: '700',
  },
  backHomeButton: {
    alignItems: 'center',
    paddingVertical: scaleSize(8),
  },
  backHomeText: {
    fontSize: scaleFont(13),
    color: '#94A3B8',
  },
});
