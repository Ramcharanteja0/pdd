/**
 * supabaseService.js
 * Reusable helpers for all Supabase DB operations in CrowdIQ
 */
import { supabase } from './supabase';

// ── INCIDENTS ──────────────────────────────────────────────
export async function fetchIncidents() {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createIncident({ title, zone, type, description, severity = 'medium' }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('incidents')
    .insert([{ title, zone, type, description, severity, reported_by: user?.id }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function resolveIncident(id) {
  const { data, error } = await supabase
    .from('incidents')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── ALERTS ─────────────────────────────────────────────────
export async function fetchAlerts() {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function resolveAlert(id) {
  const { data, error } = await supabase
    .from('alerts')
    .update({ resolved: true })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── STAFF ──────────────────────────────────────────────────
export async function fetchStaff() {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

export async function logDispatch({ staffId, message }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('dispatch_log')
    .insert([{ staff_id: staffId, message, sent_by: user?.id }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchDispatchLog() {
  const { data, error } = await supabase
    .from('dispatch_log')
    .select('*, staff:staff_id(name, role)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}
