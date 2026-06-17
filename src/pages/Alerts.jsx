import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, Bell, Clock, Plus, X, Loader, Wifi, WifiOff } from 'lucide-react';
import Topbar from '../components/Topbar';
import { supabase } from '../lib/supabase';

const TYPE_META = {
  danger:   { label: 'Critical', color: '#EF4444', bg: '#FEE2E2', border: '#EF4444' },
  critical: { label: 'Critical', color: '#EF4444', bg: '#FEE2E2', border: '#EF4444' },
  warning:  { label: 'Warning',  color: '#F59E0B', bg: '#FEF3C7', border: '#F59E0B' },
  info:     { label: 'Info',     color: '#3B82F6', bg: '#DBEAFE', border: '#3B82F6' },
  success:  { label: 'Resolved', color: '#10B981', bg: '#D1FAE5', border: '#10B981' },
};

const metaFor = (type) => TYPE_META[type] || TYPE_META.info;

export default function Alerts({ sidebarOpen, setSidebarOpen }) {
  const [filter, setFilter]       = useState('all');
  const [alerts, setAlerts]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [resolving, setResolving] = useState(new Set());
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [connected, setConnected] = useState(false);
  const [form, setForm]           = useState({ title: '', description: '', zone: '', type: 'warning' });
  const channelRef                = useRef(null);

  // ── Initial load ────────────────────────────────────────────
  useEffect(() => {
    loadAlerts();
    setupRealtime();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  async function loadAlerts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  }

  // ── Supabase Realtime subscription ─────────────────────────
  function setupRealtime() {
    const ch = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        setAlerts(prev => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts' }, (payload) => {
        setAlerts(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'alerts' }, (payload) => {
        setAlerts(prev => prev.filter(a => a.id !== payload.old.id));
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });
    channelRef.current = ch;
  }

  // ── Resolve alert ───────────────────────────────────────────
  async function handleResolve(id) {
    setResolving(prev => new Set(prev).add(id));
    try {
      const { data, error } = await supabase
        .from('alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      // Realtime will handle the UI update, but also update optimistically
      setAlerts(prev => prev.map(a => a.id === id ? data : a));
    } catch (err) {
      console.error('Resolve failed:', err);
      alert('Failed to resolve alert: ' + err.message);
    } finally {
      setResolving(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  // ── Create new alert ────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('alerts')
        .insert([{
          title: form.title.trim(),
          description: form.description.trim(),
          zone: form.zone.trim() || 'General',
          type: form.type,
          resolved: false,
        }]);
      if (error) throw error;
      setForm({ title: '', description: '', zone: '', type: 'warning' });
      setShowForm(false);
    } catch (err) {
      console.error('Create alert failed:', err);
      alert('Failed to create alert: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Filtering ───────────────────────────────────────────────
  const filtered = alerts.filter(a => {
    if (filter === 'active')  return !a.resolved;
    if (filter === 'resolved') return !!a.resolved;
    if (filter === 'danger')  return (a.type === 'danger' || a.type === 'critical') && !a.resolved;
    if (filter === 'warning') return a.type === 'warning' && !a.resolved;
    return true;
  });

  const counts = {
    all:      alerts.length,
    active:   alerts.filter(a => !a.resolved).length,
    danger:   alerts.filter(a => (a.type === 'danger' || a.type === 'critical') && !a.resolved).length,
    warning:  alerts.filter(a => a.type === 'warning' && !a.resolved).length,
    resolved: alerts.filter(a => a.resolved).length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar
        title="Alerts"
        subtitle="Real-time operational warnings"
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        sidebarOpen={sidebarOpen}
      />
      <div className="page-body">

        {/* Summary Cards */}
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
          {[
            { label: 'Total Alerts', value: counts.all,      color: 'indigo', icon: Bell },
            { label: 'Active',       value: counts.active,   color: 'red',    icon: AlertTriangle },
            { label: 'Critical',     value: counts.danger,   color: 'red',    icon: AlertTriangle },
            { label: 'Warnings',     value: counts.warning,  color: 'amber',  icon: Clock },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className={`stat-card ${color}`}>
              <div className={`stat-icon ${color}`}><Icon size={18} /></div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="tabs" style={{ flex: 1, marginBottom: 0 }}>
            {[
              ['all',      `All (${counts.all})`],
              ['active',   `Active (${counts.active})`],
              ['danger',   `Critical (${counts.danger})`],
              ['warning',  `Warnings (${counts.warning})`],
              ['resolved', `Resolved (${counts.resolved})`],
            ].map(([key, label]) => (
              <button key={key} className={`tab ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>
                {label}
              </button>
            ))}
          </div>

          {/* Realtime indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem',
            color: connected ? '#10B981' : '#94A3B8', fontWeight: 600 }}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? 'Live' : 'Connecting...'}
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? 'Cancel' : 'Create Alert'}
          </button>
        </div>

        {/* Create Alert Form */}
        {showForm && (
          <div className="card fade-in" style={{ marginBottom: 20, borderTop: '3px solid #F59E0B' }}>
            <div className="card-header"><span className="card-title">🔔 Create New Alert</span></div>
            <div className="card-body">
              <form onSubmit={handleCreate}>
                <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Alert Title *</label>
                    <input
                      className="form-input" type="text" placeholder="e.g. Overcrowding at Main Stage"
                      value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      required autoFocus
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Zone / Location</label>
                    <input
                      className="form-input" type="text" placeholder="e.g. Main Stage, Gate A"
                      value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Severity</label>
                    <select className="form-input form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="warning">⚠️ Warning</option>
                      <option value="danger">🔴 Critical / Danger</option>
                      <option value="info">ℹ️ Info</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Description</label>
                    <input
                      className="form-input" type="text" placeholder="Brief description of the situation"
                      value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving || !form.title.trim()}>
                  {saving ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : <><Bell size={13} /> Create Alert</>}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Alert List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading alerts...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <Bell size={32} style={{ opacity: 0.25, display: 'block', margin: '0 auto 10px' }} />
            No alerts in this category
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(alert => {
              const meta = metaFor(alert.type);
              const isResolving = resolving.has(alert.id);
              return (
                <div key={alert.id} className="card slide-in"
                  style={{ borderLeft: `4px solid ${alert.resolved ? '#10B981' : meta.border}`, transition: 'opacity 0.3s', opacity: isResolving ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px' }}>
                    {/* Icon */}
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: alert.resolved ? '#D1FAE5' : meta.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: alert.resolved ? '#10B981' : meta.color,
                    }}>
                      {alert.resolved ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {alert.title}
                        </span>
                        <span style={{
                          padding: '2px 9px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700,
                          background: alert.resolved ? '#D1FAE5' : meta.bg,
                          color: alert.resolved ? '#065F46' : meta.color,
                        }}>
                          {alert.resolved ? '✓ Resolved' : meta.label}
                        </span>
                      </div>
                      {(alert.description || alert.desc) && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 3 }}>
                          {alert.description || alert.desc}
                        </div>
                      )}
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        {alert.zone && <span>📍 {alert.zone}</span>}
                        <span>🕐 {new Date(alert.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        {alert.resolved && alert.resolved_at && (
                          <span style={{ color: '#10B981' }}>
                            ✓ Resolved {new Date(alert.resolved_at).toLocaleString('en-IN', { timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Resolve button */}
                    {!alert.resolved && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        disabled={isResolving}
                        style={{
                          padding: '7px 14px', borderRadius: 8, border: '1px solid #10B981',
                          background: isResolving ? '#F0FDF4' : '#10B981', color: isResolving ? '#10B981' : 'white',
                          fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                          transition: 'all 0.2s',
                        }}
                      >
                        {isResolving
                          ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Resolving...</>
                          : <><CheckCircle size={13} /> Resolve</>
                        }
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
