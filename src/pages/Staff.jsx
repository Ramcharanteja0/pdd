import { useState, useEffect, useCallback } from 'react';
import { Phone, MapPin, UserCheck, Send, ShieldAlert, Check, Clock, AlertTriangle } from 'lucide-react';
import Topbar from '../components/Topbar';
import { fetchStaff, logDispatch, fetchZones, updateZoneDensity, createIncident, logAutomatedAction } from '../lib/supabaseService';
import { supabase } from '../lib/supabase';

const ROLE_COLORS = {
  Security: '#6366F1', Medical: '#EF4444', Volunteer: '#10B981',
  Cleaner: '#F59E0B', Supervisor: '#8B5CF6'
};

const STATUS_CONFIG = {
  active: { label: 'On Duty', bg: '#D1FAE5', color: '#065F46' },
  busy: { label: 'Deployed', bg: '#FEF3C7', color: '#92400E' },
  offline: { label: 'Off Duty', bg: '#F1F5F9', color: '#64748B' },
};

export default function Staff({ sidebarOpen, setSidebarOpen }) {
  const [staff, setStaff] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [taskMsg, setTaskMsg] = useState('');
  const [filter, setFilter] = useState('all');
  const [dispatched, setDispatched] = useState([]);
  const [sending, setSending] = useState(false);

  // Zone status reporting
  const [reportZone, setReportZone] = useState('');
  const [reportLevel, setReportLevel] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [staffData, zonesData] = await Promise.all([fetchStaff(), fetchZones()]);
      setStaff(staffData);
      setZones(zonesData);
    } catch (err) {
      console.error('Error loading staff/zones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const staffChannel = supabase
      .channel('staff-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setStaff(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
        } else if (payload.eventType === 'INSERT') {
          setStaff(prev => [...prev, payload.new]);
        }
      })
      .subscribe();

    const zonesChannel = supabase
      .channel('staff-zones-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'zones' }, (payload) => {
        setZones(prev => prev.map(z => z.id === payload.new.id ? payload.new : z));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(staffChannel);
      supabase.removeChannel(zonesChannel);
    };
  }, [loadData]);

  const dispatch = async () => {
    if (!taskMsg.trim() || !selected) return;
    setSending(true);
    try {
      await logDispatch({ staffId: selected.id, message: taskMsg });
      setDispatched(prev => [...prev, {
        staffName: selected.name,
        msg: taskMsg,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      }]);
      setTaskMsg('');
    } catch (e) {
      console.error('Dispatch failed:', e.message);
    } finally {
      setSending(false);
    }
  };

  // Zone status report — staff reports crowd level for a zone
  const submitZoneReport = async () => {
    if (!reportZone || !reportLevel) return;
    setReporting(true);
    setReportSuccess('');
    try {
      const densityMap = { safe: 30, moderate: 65, critical: 90 };
      const densityPct = densityMap[reportLevel] || 50;
      await updateZoneDensity(reportZone, densityPct);

      const zoneObj = zones.find(z => z.id === reportZone);
      const zoneName = zoneObj?.name || reportZone;

      if (reportLevel === 'critical') {
        await createIncident({
          title: 'Crowd Bottleneck Reported',
          zone: zoneName,
          type: 'Crowd',
          severity: 'critical',
          description: `Staff reported critical density (${densityPct}%) at ${zoneName}. ${reportNote || ''}`.trim()
        });

        await supabase.from('alerts').insert([{
          title: 'Critical Overcrowding',
          zone: zoneName,
          type: 'danger',
          description: `Density exceeds safe threshold at ${zoneName}. Ground staff verified.`,
          resolved: false
        }]);

        await logAutomatedAction({
          zone: zoneName,
          title: 'Emergency Protocol Activated',
          description: `Crowd dispersion alerts sent to attendees near ${zoneName}. Additional security dispatched.`,
          triggered_by: 'staff_report'
        });
      }

      setReportSuccess(`${zoneName} updated to ${reportLevel.toUpperCase()} (${densityPct}%)`);
      setReportNote('');
      setTimeout(() => setReportSuccess(''), 4000);
    } catch (err) {
      console.error('Zone report failed:', err);
    } finally {
      setReporting(false);
    }
  };

  const filtered = filter === 'all' ? staff : staff.filter(s => s.role === filter || s.status === filter);
  const roles = ['all', ...new Set(staff.map(s => s.role))];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Topbar title="Staff Operations" subtitle="Loading..." onToggleSidebar={() => setSidebarOpen(o => !o)} sidebarOpen={sidebarOpen} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ border: '4px solid rgba(99,102,241,0.1)', borderLeft: '4px solid var(--primary)', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar
        title="Staff Operations"
        subtitle={`${staff.filter(s => s.status === 'active').length} on duty · ${staff.length} total personnel`}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        sidebarOpen={sidebarOpen}
      />

      <div className="page-body">
        {/* Summary Stats */}
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
          {[
            { label: 'On Duty', value: staff.filter(s => s.status === 'active').length, color: 'green', icon: '🟢' },
            { label: 'Deployed', value: staff.filter(s => s.status === 'busy').length, color: 'amber', icon: '🟡' },
            { label: 'Off Duty', value: staff.filter(s => s.status === 'offline').length, color: 'red', icon: '⚪' },
            { label: 'Tasks Sent', value: dispatched.length, color: 'blue', icon: '📋' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className={`stat-card ${color}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                <div>
                  <div className="stat-value">{value}</div>
                  <div className="stat-label">{label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid-main-aside" style={{ alignItems: 'start' }}>
          {/* Staff Table */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Personnel Directory</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {roles.map(r => (
                  <button key={r} className={`btn btn-sm ${filter === r ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(r)} style={{ textTransform: 'capitalize' }}>{r}</button>
                ))}
              </div>
            </div>
            <div className="card-body" style={{ paddingTop: 10, overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Role</th>
                    <th>Assigned Zone</th>
                    <th>Status</th>
                    <th>Contact</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const sc = STATUS_CONFIG[s.status] || STATUS_CONFIG['offline'];
                    return (
                      <tr key={s.id} onClick={() => setSelected(s)} style={{ cursor: 'pointer', background: selected?.id === s.id ? 'var(--primary-light)' : '' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <div className="avatar-sm" style={{ background: ROLE_COLORS[s.role] || '#8B5CF6' }}>{s.avatar}</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.id}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ background: (ROLE_COLORS[s.role] || '#8B5CF6') + '22', color: ROLE_COLORS[s.role] || '#8B5CF6', padding: '2px 8px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700 }}>{s.role}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem' }}>
                            <MapPin size={12} color="var(--text-muted)" />{s.zone}
                          </div>
                        </td>
                        <td>
                          <span style={{ background: sc.bg, color: sc.color, padding: '3px 9px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700 }}>{sc.label}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            <Phone size={12} />{s.phone}
                          </div>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline" onClick={e => { e.stopPropagation(); setSelected(s); }}>
                            <Send size={12} /> Dispatch
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Dispatch Panel */}
            {selected ? (
              <div className="card fade-in">
                <div className="card-header">
                  <span className="card-title">Dispatch Task</span>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px', background: 'var(--bg)', borderRadius: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: ROLE_COLORS[selected.role] || '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>{selected.avatar}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selected.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selected.role} · {selected.zone}</div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quick Tasks</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {['Move to Gate 3', 'Assist at Stage', 'Check Zone A', 'Medical standby', 'Crowd control', 'Perimeter check'].map(t => (
                        <button key={t} className="btn btn-sm btn-outline" style={{ fontSize: '0.72rem' }} onClick={() => setTaskMsg(t)}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Custom Instruction</label>
                    <textarea className="form-input" rows={3} value={taskMsg} onChange={e => setTaskMsg(e.target.value)} placeholder="Type task or instruction..." style={{ resize: 'vertical' }} />
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={dispatch} disabled={sending}>
                    <Send size={15} /> {sending ? 'Sending...' : 'Send Dispatch'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                <UserCheck size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ fontSize: '0.85rem' }}>Select a staff member to dispatch a task</p>
              </div>
            )}

            {/* Zone Status Report */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <ShieldAlert size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                  Zone Status Report
                </span>
              </div>
              <div className="card-body">
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                  Report observed crowd conditions. Critical reports trigger automated incident creation, alerts, and crowd dispersion protocols.
                </p>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">Zone</label>
                  <select className="form-input form-select" value={reportZone} onChange={e => setReportZone(e.target.value)}>
                    <option value="">Select zone</option>
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name} — {z.density || 0}% current</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">Observed Condition</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { key: 'safe', label: 'Safe', color: '#10B981', icon: '🟢' },
                      { key: 'moderate', label: 'Moderate', color: '#F59E0B', icon: '🟡' },
                      { key: 'critical', label: 'Critical', color: '#EF4444', icon: '🔴' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setReportLevel(opt.key)}
                        className="btn btn-sm"
                        style={{
                          flex: 1, justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700,
                          background: reportLevel === opt.key ? opt.color : 'var(--bg)',
                          color: reportLevel === opt.key ? 'white' : 'var(--text-secondary)',
                          border: `1.5px solid ${reportLevel === opt.key ? opt.color : 'var(--border)'}`,
                          transition: 'all 0.2s',
                        }}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Notes (optional)</label>
                  <input className="form-input" value={reportNote} onChange={e => setReportNote(e.target.value)} placeholder="e.g. Bottleneck near exit gate" />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={submitZoneReport}
                  disabled={!reportZone || !reportLevel || reporting}
                >
                  <ShieldAlert size={14} /> {reporting ? 'Submitting...' : 'Submit Report'}
                </button>
                {reportSuccess && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--success-light)', color: 'var(--success)', border: '1px solid #A7F3D0', borderRadius: 8, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} /> {reportSuccess}
                  </div>
                )}
              </div>
            </div>

            {/* Dispatch Log */}
            {dispatched.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title"><Clock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />Dispatch Log</span>
                </div>
                <div className="card-body" style={{ paddingTop: 10, maxHeight: 200, overflowY: 'auto' }}>
                  {dispatched.slice().reverse().map((d, i) => (
                    <div key={i} style={{ padding: '8px 10px', background: 'var(--success-light)', borderRadius: 8, marginBottom: 6, fontSize: '0.78rem' }}>
                      <strong>{d.staffName}</strong>: {d.msg}
                      <span style={{ float: 'right', color: 'var(--text-muted)' }}>{d.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
