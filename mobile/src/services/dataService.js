import { supabase } from './supabase';

export async function fetchZones() {
  try {
    const { data, error } = await supabase.from('zones').select('*');
    if (error || !data || data.length === 0) {
      return [
        { id: '1', name: 'Main Stage Arena', current_count: 8500, max_capacity: 10000, density_level: 'critical', trend: 'increasing' },
        { id: '2', name: 'Food Court & Plaza', current_count: 3200, max_capacity: 6000, density_level: 'moderate', trend: 'stable' },
        { id: '3', name: 'North Gate Entrance', current_count: 1400, max_capacity: 4000, density_level: 'safe', trend: 'decreasing' },
        { id: '4', name: 'VIP Pavilion', current_count: 950, max_capacity: 1500, density_level: 'moderate', trend: 'increasing' }
      ];
    }
    return data;
  } catch (err) {
    return [
      { id: '1', name: 'Main Stage Arena', current_count: 8500, max_capacity: 10000, density_level: 'critical', trend: 'increasing' },
      { id: '2', name: 'Food Court & Plaza', current_count: 3200, max_capacity: 6000, density_level: 'moderate', trend: 'stable' },
      { id: '3', name: 'North Gate Entrance', current_count: 1400, max_capacity: 4000, density_level: 'safe', trend: 'decreasing' }
    ];
  }
}

export async function fetchIncidents() {
  try {
    const { data, error } = await supabase.from('incidents').select('*').order('created_at', { ascending: false });
    if (error || !data || data.length === 0) {
      return [
        { id: '101', title: 'Bottleneck at Gate B', zone: 'North Gate', severity: 'critical', status: 'Active', time: '10m ago' },
        { id: '102', title: 'Medical Assist - Dehydration', zone: 'Main Stage', severity: 'moderate', status: 'In Progress', time: '25m ago' },
        { id: '103', title: 'Overcrowding at Food Stall 4', zone: 'Food Plaza', severity: 'moderate', status: 'Resolved', time: '1h ago' }
      ];
    }
    return data;
  } catch (err) {
    return [
      { id: '101', title: 'Bottleneck at Gate B', zone: 'North Gate', severity: 'critical', status: 'Active', time: '10m ago' }
    ];
  }
}

export async function fetchStaff() {
  try {
    const { data, error } = await supabase.from('staff').select('*');
    if (error || !data || data.length === 0) {
      return [
        { id: 's1', name: 'Vikram Singh', role: 'Security Lead', zone: 'Main Stage', status: 'Active', battery: '92%' },
        { id: 's2', name: 'Ananya Sharma', role: 'Medical Ops', zone: 'Food Plaza', status: 'Active', battery: '85%' },
        { id: 's3', name: 'Rahul Verma', role: 'Crowd Controller', zone: 'North Gate', status: 'On Break', battery: '64%' },
        { id: 's4', name: 'Priya Nair', role: 'Safety Inspector', zone: 'VIP Pavilion', status: 'Active', battery: '98%' }
      ];
    }
    return data;
  } catch (err) {
    return [
      { id: 's1', name: 'Vikram Singh', role: 'Security Lead', zone: 'Main Stage', status: 'Active', battery: '92%' }
    ];
  }
}
