import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/api.js';

/**
 * WorldMap — Leaflet-powered map showing where applications come from.
 * Uses OpenStreetMap tiles so it looks like a real map, not a cartoon.
 */
export default function WorldMap({ height = 440 }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);   // Leaflet map instance
  const markersRef   = useRef([]);     // track circle markers for cleanup
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);
  const [pinCount, setPinCount] = useState(0);
  const [error, setError]     = useState('');

  // Colour by application count
  const dotColor = (n) => n >= 20 ? '#DC2626' : n >= 10 ? '#F59E0B' : n >= 5 ? '#0176D3' : '#10B981';
  const dotRadius = (n) => Math.min(8 + Math.sqrt(n) * 3, 28);

  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      // Dynamic import — keeps Leaflet out of the SSR/Node bundle
      const L = (await import('leaflet')).default;

      // Leaflet needs its own CSS — inject once
      if (!document.getElementById('leaflet-map-css')) {
        const link = document.createElement('link');
        link.id  = 'leaflet-map-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (cancelled || !containerRef.current || mapRef.current) return;

      // Init map — no scroll zoom by default (less intrusive on dashboards)
      const map = L.map(containerRef.current, {
        center: [20, 10],
        zoom: 2,
        minZoom: 1,
        maxZoom: 10,
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      });

      // OpenStreetMap tiles — free, no API key
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Fetch application pin data
      try {
        const r = await api.getApplicationLocations();
        if (cancelled) return;

        const data = Array.isArray(r?.data) ? r.data : [];
        const totalApps = data.reduce((s, p) => s + p.count, 0);
        setTotal(totalApps);
        setPinCount(data.length);

        if (data.length === 0) {
          // Show a nice "no data yet" popup in the middle of the map
          L.popup({ closeButton: false, autoPan: false })
            .setLatLng([20, 10])
            .setContent(`
              <div style="font-family:system-ui;text-align:center;padding:8px 4px;">
                <div style="font-size:24px;margin-bottom:8px">📍</div>
                <strong style="font-size:13px;color:#0176D3">Location tracking is active</strong>
                <p style="font-size:12px;color:#64748B;margin:6px 0 0;line-height:1.5">
                  Pins will appear here as candidates<br/>submit with location permission
                </p>
              </div>
            `)
            .openOn(map);
        } else {
          // Plot each cluster as a circle marker
          data.forEach(pin => {
            const color  = dotColor(pin.count);
            const radius = dotRadius(pin.count);

            const circle = L.circleMarker([pin.lat, pin.lng], {
              radius,
              fillColor:   color,
              color:       '#ffffff',
              weight:      2,
              opacity:     1,
              fillOpacity: 0.85,
            });

            // Popup: city, count, first 5 candidate names
            const names = (pin.candidates || []).slice(0, 5)
              .map(c => `<li style="padding:2px 0">${c.name}</li>`)
              .join('');
            const extra = (pin.candidates || []).length > 5
              ? `<li style="color:#94A3B8">+${pin.candidates.length - 5} more</li>`
              : '';

            const mapsUrl    = `https://www.google.com/maps?q=${pin.lat},${pin.lng}`;
            const navUrl     = `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`;
            const coordLabel = `${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}`;

            circle.bindPopup(`
              <div style="font-family:system-ui;min-width:190px;max-width:240px">
                <strong style="font-size:13px;display:block;margin-bottom:2px">
                  📍 ${pin.city || 'Unknown City'}${pin.country ? ', ' + pin.country : ''}
                </strong>
                <span style="font-size:10px;color:#94A3B8;display:block;margin-bottom:4px">${coordLabel}</span>
                <span style="font-size:12px;color:#64748B;display:block;margin-bottom:8px">
                  ${pin.count} application${pin.count !== 1 ? 's' : ''}
                </span>
                <ul style="margin:0 0 10px;padding-left:16px;font-size:12px;color:#374151">
                  ${names}${extra}
                </ul>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  <a href="${mapsUrl}" target="_blank" rel="noopener"
                    style="display:inline-flex;align-items:center;gap:4px;background:#0176D3;color:#fff;padding:5px 10px;border-radius:7px;font-size:11px;font-weight:700;text-decoration:none">
                    🗺️ View on Map
                  </a>
                  <a href="${navUrl}" target="_blank" rel="noopener"
                    style="display:inline-flex;align-items:center;gap:4px;background:#059669;color:#fff;padding:5px 10px;border-radius:7px;font-size:11px;font-weight:700;text-decoration:none">
                    🧭 Navigate Here
                  </a>
                </div>
              </div>
            `, { maxWidth: 260 });

            circle.addTo(map);
            markersRef.current.push(circle);
          });

          // Fit map to show all markers if we have data
          if (data.length > 0) {
            const bounds = L.latLngBounds(data.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 5 });
          }
        }
      } catch {
        setError('Could not load location data');
      }

      setLoading(false);
    };

    initMap().catch(e => {
      console.error('[WorldMap]', e);
      setError('Map failed to load');
      setLoading(false);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'relative', fontFamily: 'system-ui' }}>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--mkt-text-secondary, #374151)' }}>
          📍 {loading ? '…' : total} application{total !== 1 ? 's' : ''} from {loading ? '…' : pinCount} location{pinCount !== 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[['1–4', '#10B981'], ['5–9', '#0176D3'], ['10–19', '#F59E0B'], ['20+', '#DC2626']].map(([label, color]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--mkt-text-muted, #64748B)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
              {label}
            </span>
          ))}
        </div>
        {error && <span style={{ fontSize: 12, color: '#EF4444' }}>{error}</span>}
      </div>

      {/* Map container */}
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 500,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: '#F0F4F8', gap: 10,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#0176D3', animation: 'mapSpin 0.8s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Loading map…</span>
          </div>
        )}
        <div ref={containerRef} style={{ height, width: '100%' }} />
      </div>

      <style>{`
        @keyframes mapSpin { to { transform: rotate(360deg); } }
        .leaflet-container { font-family: 'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif; }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
        }
        .leaflet-popup-tip { display: none; }
        .leaflet-control-attribution { font-size: 10px !important; }
      `}</style>
    </div>
  );
}
