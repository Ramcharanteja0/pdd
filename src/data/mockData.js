// CrowdIQ — Utility functions only (NO hardcoded data)

// Reusable live density calculations
export function getDensityLevel(pct) {
  if (pct >= 80) return "critical";
  if (pct >= 55) return "moderate";
  return "safe";
}

export function getDensityColor(pct) {
  if (pct >= 80) return "#EF4444";
  if (pct >= 55) return "#F59E0B";
  return "#10B981";
}
