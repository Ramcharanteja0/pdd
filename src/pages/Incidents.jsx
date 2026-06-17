import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, Plus, X, Loader, Wifi, WifiOff, Clock } from 'lucide-react';
import Topbar from '../components/Topbar';
import { supabase } from '../lib/supabase';
import { fetchZones } from '../lib/supabaseService';

const TYPE_COLORS = {
  Medical:   { bg: '#FEE2E2', color: '#991B1B', border: '#EF4444', icon: '🚑' },
  Security:  { bg: '#EDE9FE', color: '#5B21B6', border: '#8B5CF6', icon: '🛡️' },
  Crowd:     { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B', icon: '👥' },
  Technical: { bg: '#DBEAFE', color: '#1E40AF', border: '#3B82F6', icon: '⚙️' },
  Fire:      { bg: '#FEE2E2', color: '#7F1D1D', border: '#DC2626', icon: '🔥' },
  Other:     { bg: '#F1F5F9', color: '#475569', border: '#94A3B8', icon: '📋' },
};
const tcFor = (type) => TYPE_COLORS[type] || TYPE_COLORS.Other;

const SEVERITY_META = {
  low:      { label: 'Low',      bg: '#DBEAFE', color: '#1E40AF' },
  medium:   { label: 'Medium',   bg: '#FEF3C7', color: '#92400E' },
  high:     { label: 'High',     bg: '#FEE2E2', color: '#991B1B' },
  critical: { label: 'Critical', bg: '#FEE2E2', color: '#7F1D1D' },
};

export default function Incidents({ sidebarOpen, setSidebarOpen }) {
  const [incidents, setIncidents] = useState([]);
  const [zones, setZones]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [resolving, setResolving] = useState(new Set());
  const [showForm, setShowForm]   = useState(false);
  const [connected, setConnected] = useState(false);
  const [filter, setFilter]       = useState('all'); // all | open | resolved
  const [error, setError]         = useState('');
  const [form, setForm]           = useState({
    zone: '', type: 'Crowd', description: '', severity: 'medium', reporter: ''
  });
  const channelRef = useRef(null);

  useEffect(() => {
    loadAll();
    setupRealtime();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [{ data: inc, error: incErr }, zonesData] = await Promise.all([
        supabase.from('incidents').select('*').order('created_at', { ascending: false }),
        fetchZones(),
      ]);
      if (incErr) throw incErr;
      setIncidents(inc || []);
      setZones(zonesData || []);
    } catch (err) {
      console.error('Failed to load incidents:', err);
      setError('Could not load incidents from database. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  // ── Supabase Realtime ─────────────────────────────────────
  function setupRealtime() {
    const ch = supabase
      .channel('incidents-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, (payload) => {
        setIncidents(prev => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidents' }, (payload) => {
        setIncidents(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'incidents' }, (payload) => {
        setIncidents(prev => prev.filter(i => i.id !== payload.old.id));
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });
    channelRef.current = ch;
  }

  // ── Submit new incident ───────────────────────────────────
  async function submitIncident(e) {
    e.preventDefault();
    if (!form.zone || !form.description.trim()) {
      setError('Please fill in Zone and Description.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase
        .from('incidents')
        .insert([{
          title:       `${form.type} incident at ${form.zone}`,
          zone:        form.zone,
          type:        form.type,
          description: form.description.trim(),
          severity:    form.severity,
          status:      'open',
          reported_by: user?.id || null,
        }]);
      if (insErr) throw insErr;
      setForm({ zone: '', type: 'Crowd', description: '', severity: 'medium', reporter: '' });
      setShowForm(false);
      // Realtime will add the new row automatically
    } catch (err) {
      setError('Failed to submit incident: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Resolve incident ──────────────────────────────────────
  async function handleResolve(id) {
    setResolving(prev => new Set(prev).add(id));
    setError('');
    try {
      const { data, error: updErr } = await supabase
        .from('incidents')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (updErr) throw updErr;
      setIncidents(prev => prev.map(i => i.id === id ? data : i));
    } catch (err) {
      setError('Failed to resolve incident: ' + err.message);
    } finally {
      setResolving(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  // ── Filtered view ─────────────────────────────────────────
  const filtered = incidents.filter(i => {
    if (filter === 'open')     return i.status !== 'resolved';
    if (filter === 'resolved') return i.status === 'resolved';
    return true;
  });

  const openCount     = incidents.filter(i => i.status !== 'resolved').length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar
        title="Incident Management"
        subtitle="Log, track and resolve operational incidents"
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        sidebarOpen={sidebarOpen}
      />
      <div className="page-body">

        {/* Error banner */}
        {error && (
          <div style={{
            padding: '10px 16px', background: '#FEE2E2', color: '#991B1B',
            borderRadius: 8, marginBottom: 16, fontSize: '0.82rem', fontWeight: 600,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>⚠ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#991B1B' }}>✕</button>
          </div>
        )}

        {/* Summary stats */}
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
          {[
            { label: 'Total',    value: incidents.length, color: 'indigo', icon: AlertTriangle },
            { label: 'Open',     value: openCount,        color: 'red',    icon: AlertTriangle },
            { label: 'Resolved', value: resolvedCount,    color: 'green',  icon: CheckCircle },
            { label: 'Critical', value: incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length, color: 'amber', icon: Clock },
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
              ['all',      `All (${incidents.length})`],
              ['open',     `Open (${openCount})`],
              ['resolved', `Resolved (${resolvedCount})`],
            ].map(([key, label]) => (
              <button key={key} className={`tab ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>
                {label}
              </button>
            ))}
          </div>

          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem',
            color: connected ? '#10B981' : '#94A3B8', fontWeight: 600 }}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? 'Live' : 'Connecting...'}
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setShowForm(s => !s); setError(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? 'Cancel' : 'Report Incident'}
          </button>
        </div>

        {/* Report Form */}
        {showForm && (
          <div className="card fade-in" style={{ marginBottom: 20, borderTop: '3px solid #EF4444' }}>
            <div className="card-header"><span className="card-title">🚨 New Incident Report</span></div>
            <div className="card-body">
              <form onSubmit={submitIncident}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Zone / Location *</label>
                    <select className="form-input form-select" value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} required>
                      <option value="">— Select a zone —</option>
                      {zones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
                      <option value="Entrance">Entrance / Gate</option>
                      <option value="Parking">Parking Area</option>
                      <option value="General">General / Unknown</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Incident Type</label>
                    <select className="form-input form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      {Object.entries(TYPE_COLORS).map(([t, m]) => <option key={t} value={t}>{m.icon} {t}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Severity</label>
                    <select className="form-input form-select" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🔴 High</option>
                      <option value="critical">🚨 Critical</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Reporter Name (optional)</label>
                    <input
                      className="form-input" type="text" placeholder="Staff name"
                      value={form.reporter} onChange={e => setForm(f => ({ ...f, reporter: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label">Description *</label>
                    <textarea
                      className="form-input" rows={3} placeholder="Describe what happened, location details, actions taken..."
                      value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      style={{ resize: 'vertical' }} required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '9px 20px', borderRadius: 8, border: 'none',
                    background: saving ? '#94A3B8' : '#EF4444', color: 'white',
                    fontWeight: 700, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {saving
                    ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
                    : <><AlertTriangle size={13} /> Submit Incident Report</>
                  }
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Incidents table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Incident Log</span>
            <button className="btn btn-sm btn-outline" onClick={loadAll} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              ↻ Refresh
            </button>
          </div>
          <div className="card-body" style={{ paddingTop: 10, overflowX: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading incidents...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <AlertTriangle size={32} style={{ opacity: 0.25, display: 'block', margin: '0 auto 10px' }} />
                No incidents in this category.{' '}
                {filter !== 'all' && <span className="auth-link" style={{ cursor: 'pointer' }} onClick={() => setFilter('all')}>View all</span>}
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Zone</th>
                    <th>Severity</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inc => {
                    const tc   = tcFor(inc.type);
                    const sev  = SEVERITY_META[inc.severity] || SEVERITY_META.medium;
                    const time = new Date(inc.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
                    const isRes = resolving.has(inc.id);
                    return (
                      <tr key={inc.id} style={{ opacity: isRes ? 0.5 : 1, transition: 'opacity 0.3s' }}>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{time}</td>
                        <td>
                          <span style={{ background: tc.bg, color: tc.color, padding: '3px 9px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {tc.icon} {inc.type}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>{inc.zone}</td>
                        <td>
                          <span style={{ background: sev.bg, color: sev.color, padding: '3px 9px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700 }}>
                            {sev.label}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', maxWidth: 240 }}>{inc.description}</td>
                        <td>
                          <span style={{
                            background: inc.status === 'resolved' ? '#D1FAE5' : '#FEF3C7',
                            color: inc.status === 'resolved' ? '#065F46' : '#92400E',
                            padding: '3px 9px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                          }}>
                            {inc.status === 'resolved' ? '✓ Resolved' : '● Open'}
                          </span>
                        </td>
                        <td>
                          {inc.status !== 'resolved' && (
                            <button
                              onClick={() => handleResolve(inc.id)}
                              disabled={isRes}
                              style={{
                                padding: '5px 12px', borderRadius: 6,
                                border: '1px solid #10B981', background: '#10B981', color: 'white',
                                fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                                opacity: isRes ? 0.6 : 1,
                              }}
                            >
                              {isRes
                                ? <><Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> Resolving</>
                                : <><CheckCircle size={11} /> Resolve</>
                              }
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
