import { useState, useEffect, useCallback } from 'react';
import { Zap, AlertTriangle, CheckCircle, ShieldAlert, Terminal, Sparkles } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Topbar from '../components/Topbar';
import { fetchPredictions, fetchAutomatedActions, logAutomatedAction, fetchZoneDensitySnapshot } from '../lib/supabaseService';
import { supabase } from '../lib/supabase';

const RISK_CONFIG = {
  HIGH: { bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
  MEDIUM: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  LOW: { bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0' },
};

export default function Predictions({ sidebarOpen, setSidebarOpen }) {
  const [predictions, setPredictions] = useState([]);
  const [actions, setActions] = useState([]);
  const [radarData, setRadarData] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState([]);
  const [actingId, setActingId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [preds, acts, snapshot] = await Promise.all([
        fetchPredictions(),
        fetchAutomatedActions(),
        fetchZoneDensitySnapshot(),
      ]);
      setPredictions(preds);
      setActions(acts);

      // Build radar from real zone densities
      setRadarData(snapshot.slice(0, 8).map(z => ({ zone: z.zone.length > 12 ? z.zone.substring(0, 10) + '..' : z.zone, density: z.density })));

      // Build forecast by extrapolating current trends
      if (snapshot.length > 0) {
        const top3 = snapshot.sort((a, b) => b.density - a.density).slice(0, 3);
        const forecast = [
          { time: 'Now' },
          { time: '+15m' },
          { time: '+30m' },
          { time: '+45m' },
          { time: '+60m' },
        ];
        top3.forEach((z, idx) => {
          const key = z.zone.substring(0, 10);
          const d = z.density;
          // Simple trend: critical zones increase short-term then decrease, others stay stable
          const trend = d >= 80 ? [d, Math.min(100, d + 3), d - 5, d - 15, d - 25] :
                        d >= 55 ? [d, d + 2, d + 5, d - 3, d - 8] :
                                  [d, d + 1, d + 3, d + 2, d - 1];
          forecast.forEach((f, i) => { f[key] = Math.max(0, Math.min(100, trend[i])); });
        });
        setForecastData(forecast);
      }
    } catch (err) {
      console.error('Error loading AI Predictions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const actionsChannel = supabase
      .channel('live-dispersion-actions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'automated_actions' }, (payload) => {
        setActions(prev => [payload.new, ...prev]);
      })
      .subscribe();

    const predsChannel = supabase
      .channel('live-predictions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(actionsChannel);
      supabase.removeChannel(predsChannel);
    };
  }, [loadData]);

  const handleAction = async (pred) => {
    setActingId(pred.id);
    try {
      await logAutomatedAction({
        zone: pred.zone,
        title: `AI Action: ${pred.action}`,
        description: `Triggered by prediction: "${pred.prediction}" — Confidence: ${pred.confidence}%`,
        triggered_by: 'ai_prediction'
      });
      setDismissed(prev => [...prev, pred.id]);
    } catch (e) {
      console.error('Failed to execute action:', e);
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Topbar title="AI Predictions" subtitle="Loading..." onToggleSidebar={() => setSidebarOpen(o => !o)} sidebarOpen={sidebarOpen} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ border: '4px solid rgba(99,102,241,0.1)', borderLeft: '4px solid var(--primary)', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  const activePreds = predictions.filter(p => !dismissed.includes(p.id));
  const forecastKeys = forecastData.length > 0 ? Object.keys(forecastData[0]).filter(k => k !== 'time') : [];
  const forecastColors = ['#6366F1', '#EF4444', '#F59E0B', '#10B981'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar
        title="AI Predictions & Automated Response"
        subtitle={`${activePreds.length} active predictions · ${actions.length} automated actions logged`}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        sidebarOpen={sidebarOpen}
      />
      <div className="page-body">
        {/* Stats */}
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
          <div className="stat-card indigo">
            <div className="stat-value">{predictions.length}</div>
            <div className="stat-label">Total Predictions</div>
          </div>
          <div className="stat-card red">
            <div className="stat-value">{predictions.filter(p => p.risk === 'HIGH').length}</div>
            <div className="stat-label">High Risk</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-value">{predictions.filter(p => p.risk === 'MEDIUM').length}</div>
            <div className="stat-label">Medium Risk</div>
          </div>
          <div className="stat-card green">
            <div className="stat-value">{actions.length}</div>
            <div className="stat-label">Actions Taken</div>
          </div>
        </div>

        <div className="grid-main-aside" style={{ alignItems: 'start' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Predictions List */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><Zap size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />Active Predictions</span>
              </div>
              <div className="card-body" style={{ paddingTop: 10 }}>
                {activePreds.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                    <CheckCircle size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>All predictions addressed</div>
                  </div>
                ) : (
                  activePreds.map(pred => {
                    const rc = RISK_CONFIG[pred.risk] || RISK_CONFIG.LOW;
                    return (
                      <div key={pred.id} className="prediction-box" style={{ marginBottom: 12 }}>
                        <h4>
                          <span style={{ background: rc.bg, color: rc.color, padding: '2px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700 }}>{pred.risk}</span>
                          {pred.zone}
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>{pred.prediction}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginBottom: 8 }}>→ {pred.action}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: '#E0E7FF', borderRadius: 99 }}>
                            <div style={{ width: `${pred.confidence}%`, height: '100%', background: 'var(--primary)', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)' }}>{pred.confidence}%</span>
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: '0.7rem', padding: '4px 10px' }}
                            onClick={() => handleAction(pred)}
                            disabled={actingId === pred.id}
                          >
                            {actingId === pred.id ? '...' : '⚡ Act'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Automated Actions Log */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><Terminal size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />Automated Actions Log</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{actions.length} total</span>
              </div>
              <div className="card-body" style={{ paddingTop: 10, maxHeight: 300, overflowY: 'auto' }}>
                {actions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No automated actions yet</div>
                ) : (
                  actions.slice(0, 10).map(act => (
                    <div key={act.id} style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 6, border: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{act.title}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(act.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{act.zone} · {act.triggered_by}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column — Charts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Radar Chart — from REAL zone densities */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><Sparkles size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />Zone Risk Radar</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Live from Supabase</span>
              </div>
              <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#E2E8F0" />
                      <PolarAngleAxis dataKey="zone" tick={{ fontSize: 10, fill: '#64748B' }} />
                      <Radar name="Density" dataKey="density" stroke="#6366F1" fill="#6366F1" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No zone data available</div>
                )}
              </div>
            </div>

            {/* Forecast Chart — from REAL densities */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><ShieldAlert size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />Density Forecast</span>
              </div>
              <div className="card-body">
                {forecastData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={forecastData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} domain={[0, 100]} />
                      <Tooltip />
                      {forecastKeys.map((key, idx) => (
                        <Bar key={key} dataKey={key} name={key} fill={forecastColors[idx % forecastColors.length]} radius={[4, 4, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No forecast data yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
