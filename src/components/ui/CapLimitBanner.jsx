/**
 * CapLimitBanner — shows a warning when data is at or near the fetch limit.
 *
 * Shows:
 *  - Orange warning when fetched >= 80% of total (approaching limit)
 *  - Red warning when fetched === total (at limit — more data may exist)
 *
 * Usage:
 *   <CapLimitBanner total={pagination.total} fetched={rows.length} entity="jobs" role={user?.role} />
 *
 * Only renders for admin / super_admin roles.
 */
import React, { useState } from 'react';

export default function CapLimitBanner({ total = 0, fetched = 0, entity = 'records', role }) {
  const [dismissed, setDismissed] = useState(false);

  // Only admin/super_admin need to see this
  if (role && role !== 'admin' && role !== 'super_admin') return null;
  if (!fetched || !total || dismissed) return null;

  const pct = (fetched / total) * 100;
  const atLimit      = fetched === total && total > 0;
  const approachingLimit = pct >= 80 && !atLimit;

  if (!atLimit && !approachingLimit) return null;

  const isSuper = role === 'super_admin';
  const bg      = atLimit ? 'rgba(186,5,23,0.06)' : 'rgba(245,158,11,0.07)';
  const border  = atLimit ? 'rgba(186,5,23,0.25)' : 'rgba(245,158,11,0.3)';
  const color   = atLimit ? '#7f1d1d' : '#92400e';
  const icon    = atLimit ? '🚫' : '⚠️';

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 12, padding: '12px 16px', marginBottom: 16,
      fontSize: 13, color,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1, lineHeight: 1.55 }}>
        {atLimit ? (
          <>
            <strong>Data limit reached.</strong> You are seeing {fetched.toLocaleString()} of {total.toLocaleString()} {entity} in this view.
            The display is capped — there may be additional records not shown.{' '}
            {isSuper
              ? 'Use the search/filter controls to narrow results, or request a higher limit by adding ?limit=5000 to the current URL.'
              : 'Contact your Super Admin to request a higher data limit or use the Export option for complete data.'}
          </>
        ) : (
          <>
            <strong>Approaching data limit.</strong> Showing {fetched.toLocaleString()} of {total.toLocaleString()} {entity} ({Math.round(pct)}% of limit).
            {' '}Use filters to narrow results or export for complete data.
          </>
        )}
      </div>
      <button onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', color, cursor: 'pointer', fontSize: 16, flexShrink: 0, padding: 0, lineHeight: 1, opacity: 0.7 }}
        title="Dismiss">
        ✕
      </button>
    </div>
  );
}
