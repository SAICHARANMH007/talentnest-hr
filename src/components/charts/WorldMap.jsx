import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/api.js';

/**
 * WorldMap — shows application pins on a simplified SVG world map.
 * Uses equirectangular projection: x=(lng+180)/360*W, y=(90-lat)/180*H
 */

// Simplified continent outlines as polygon point strings (equirectangular, W=960 H=480)
const toLonLat = (pairs) =>
  pairs.map(([lng, lat]) => `${((lng + 180) / 360 * 960).toFixed(1)},${((90 - lat) / 180 * 480).toFixed(1)}`).join(' ');

const CONTINENTS = [
  // North America
  { name: 'North America', fill: '#D1FAE5', stroke: '#A7F3D0', d: toLonLat([
    [-168,72],[-142,72],[-95,72],[-83,68],[-64,63],[-52,47],[-66,44],[-70,41],[-75,35],[-80,25],[-87,15],[-92,17],[-104,19],[-117,31],[-117,32],[-124,48],[-130,55],[-140,59],[-157,60],[-162,63],[-168,66],[-168,72]
  ])},
  // Greenland
  { name: 'Greenland', fill: '#D1FAE5', stroke: '#A7F3D0', d: toLonLat([
    [-73,83],[-18,83],[-18,76],[-25,70],[-44,60],[-52,65],[-60,68],[-68,72],[-73,80],[-73,83]
  ])},
  // South America
  { name: 'South America', fill: '#FEF3C7', stroke: '#FDE68A', d: toLonLat([
    [-81,8],[-77,8],[-62,11],[-50,4],[-35,-5],[-35,-10],[-40,-20],[-50,-25],[-55,-30],[-62,-35],[-65,-42],[-68,-52],[-63,-55],[-55,-52],[-50,-30],[-44,-23],[-40,-18],[-35,-5],[-50,2],[-60,4],[-72,12],[-81,8]
  ])},
  // Europe
  { name: 'Europe', fill: '#DBEAFE', stroke: '#BFDBFE', d: toLonLat([
    [-10,36],[0,36],[5,40],[15,38],[20,37],[30,37],[36,36],[36,40],[32,45],[35,48],[28,55],[20,55],[18,60],[10,58],[5,62],[15,70],[25,71],[30,68],[28,62],[30,55],[25,50],[22,45],[18,45],[15,45],[10,44],[8,46],[2,50],[-5,48],[-10,44],[-10,36]
  ])},
  // Africa
  { name: 'Africa', fill: '#FEE2E2', stroke: '#FECACA', d: toLonLat([
    [-18,14],[0,14],[5,15],[10,14],[15,14],[25,14],[36,15],[42,12],[50,12],[50,10],[45,5],[42,12],[44,8],[44,2],[40,-5],[36,-10],[34,-20],[32,-25],[30,-30],[28,-35],[18,-35],[15,-30],[12,-22],[8,-5],[2,4],[0,8],[-5,10],[-8,5],[-15,10],[-18,14]
  ])},
  // Asia
  { name: 'Asia', fill: '#F3E8FF', stroke: '#E9D5FF', d: toLonLat([
    [36,36],[40,36],[50,30],[60,22],[70,20],[80,22],[90,22],[100,12],[105,10],[110,1],[120,1],[125,5],[130,5],[130,10],[135,34],[145,35],[145,40],[140,46],[140,54],[130,58],[120,55],[115,50],[100,55],[85,56],[75,52],[65,55],[50,65],[40,65],[30,68],[25,71],[20,71],[28,62],[30,55],[35,48],[32,45],[36,40],[36,36]
  ])},
  // Japan (simplified)
  { name: 'Japan', fill: '#F3E8FF', stroke: '#E9D5FF', d: toLonLat([
    [130,31],[135,34],[140,36],[145,44],[142,44],[141,40],[135,34],[130,31]
  ])},
  // Australia
  { name: 'Australia', fill: '#FFEDD5', stroke: '#FED7AA', d: toLonLat([
    [114,-22],[120,-18],[130,-12],[135,-12],[140,-14],[145,-15],[150,-22],[152,-27],[151,-30],[148,-38],[146,-38],[142,-38],[138,-35],[132,-32],[125,-32],[114,-28],[114,-22]
  ])},
  // New Zealand
  { name: 'New Zealand', fill: '#FFEDD5', stroke: '#FED7AA', d: toLonLat([
    [166,-46],[168,-46],[170,-43],[172,-40],[174,-36],[175,-36],[174,-38],[172,-42],[170,-44],[166,-46]
  ])},
  // UK / Ireland
  { name: 'UK', fill: '#DBEAFE', stroke: '#BFDBFE', d: toLonLat([
    [-5,50],[-2,50],[0,52],[0,54],[-2,58],[-4,58],[-6,56],[-8,54],[-8,52],[-5,50]
  ])},
  // India
  { name: 'India', fill: '#F3E8FF', stroke: '#E9D5FF', d: toLonLat([
    [68,22],[72,20],[77,8],[80,10],[82,14],[80,20],[78,28],[72,24],[68,22]
  ])},
  // Sri Lanka
  { name: 'Sri Lanka', fill: '#F3E8FF', stroke: '#E9D5FF', d: toLonLat([
    [80,10],[82,8],[82,6],[80,6],[80,8],[80,10]
  ])},
];

// Equirectangular lat/lng → SVG x/y
function project(lat, lng, W = 960, H = 480) {
  const x = ((lng + 180) / 360) * W;
  const y = ((90 - lat) / 180) * H;
  return { x, y };
}

function dotColor(count) {
  if (count >= 20) return '#DC2626';
  if (count >= 10) return '#F59E0B';
  if (count >= 5)  return '#0176D3';
  return '#10B981';
}
function dotRadius(count) {
  return Math.min(5 + Math.sqrt(count) * 2.5, 22);
}

export default function WorldMap({ height = 420 }) {
  const [pins, setPins]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null); // { x, y, pin }
  const [error, setError]   = useState('');
  const svgRef = useRef(null);
  const W = 960, H = 480;

  useEffect(() => {
    api.getApplicationLocations()
      .then(r => {
        const data = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
        setPins(data);
      })
      .catch(() => setError('Could not load location data'))
      .finally(() => setLoading(false));
  }, []);

  const total = pins.reduce((s, p) => s + p.count, 0);
  const maxCount = Math.max(...pins.map(p => p.count), 1);

  return (
    <div style={{ position: 'relative' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
          📍 {total} application{total !== 1 ? 's' : ''} from {pins.length} location{pins.length !== 1 ? 's' : ''}
        </span>
        {[['1–4', '#10B981'], ['5–9', '#0176D3'], ['10–19', '#F59E0B'], ['20+', '#DC2626']].map(([label, color]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748B' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>

      {loading && (
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 14, background: '#EFF6FF', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          ⏳ Loading map data…
        </div>
      )}

      {!loading && (
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #E2E8F0', background: '#EFF6FF' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', height, display: 'block' }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Ocean background */}
            <rect width={W} height={H} fill="#EFF6FF" />

            {/* Latitude/longitude grid */}
            {[-60,-30,0,30,60].map(lat => {
              const { y } = project(lat, 0, W, H);
              return <line key={lat} x1={0} y1={y} x2={W} y2={y} stroke="#BFDBFE" strokeWidth={0.5} strokeDasharray="4,4" />;
            })}
            {[-120,-60,0,60,120].map(lng => {
              const { x } = project(0, lng, W, H);
              return <line key={lng} x1={x} y1={0} x2={x} y2={H} stroke="#BFDBFE" strokeWidth={0.5} strokeDasharray="4,4" />;
            })}
            {/* Equator */}
            <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#93C5FD" strokeWidth={1} />

            {/* Continent shapes */}
            {CONTINENTS.map((c) => (
              <polygon key={c.name} points={c.d} fill={c.fill} stroke={c.stroke} strokeWidth={0.8} />
            ))}

            {/* Grid labels */}
            {[['0°', 0, 0], ['30°N', 30, 0], ['60°N', 60, 0], ['30°S', -30, 0], ['60°S', -60, 0]].map(([label, lat]) => {
              const { y } = project(lat, -175, W, H);
              return <text key={label} x={4} y={y + 3} fontSize={8} fill="#93C5FD" fontWeight={600}>{label}</text>;
            })}

            {/* No-data message */}
            {pins.length === 0 && !error && (
              <>
                <rect x={W/2 - 260} y={H/2 - 28} width={520} height={56} rx={10} fill="rgba(255,255,255,0.85)" />
                <text x={W / 2} y={H / 2 - 6} textAnchor="middle" fontSize={13} fontWeight={700} fill="#0176D3">
                  📍 Location tracking is active
                </text>
                <text x={W / 2} y={H / 2 + 14} textAnchor="middle" fontSize={11} fill="#64748B">
                  Application pins will appear here as candidates submit with location permission
                </text>
              </>
            )}
            {error && (
              <>
                <rect x={W/2 - 180} y={H/2 - 20} width={360} height={40} rx={8} fill="rgba(255,255,255,0.9)" />
                <text x={W / 2} y={H / 2 + 5} textAnchor="middle" fontSize={12} fill="#94A3B8">
                  ⚠️ {error}
                </text>
              </>
            )}

            {/* Application pins */}
            {pins.map((pin, i) => {
              const { x, y } = project(pin.lat, pin.lng, W, H);
              const r = dotRadius(pin.count);
              const color = dotColor(pin.count);
              return (
                <g key={i} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => {
                    const svgRect = svgRef.current?.getBoundingClientRect();
                    if (!svgRect) return;
                    const scaleX = svgRect.width / W;
                    const scaleY = (height / H); // approximate
                    setTooltip({ svgX: x * scaleX + svgRect.left, svgY: y * scaleY + svgRect.top, pin });
                  }}
                  onMouseLeave={() => setTooltip(null)}>
                  {/* Pulse ring */}
                  <circle cx={x} cy={y} r={r + 4} fill={color} opacity={0.15} />
                  {/* Main dot */}
                  <circle cx={x} cy={y} r={r} fill={color} opacity={0.9} stroke="#fff" strokeWidth={1.5} />
                  {/* Count label (for large clusters) */}
                  {pin.count >= 3 && (
                    <text x={x} y={y + r * 0.38} textAnchor="middle" fontSize={r * 0.65} fontWeight={800} fill="#fff" style={{ pointerEvents: 'none' }}>
                      {pin.count}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div style={{
              position: 'fixed',
              left: tooltip.svgX + 12,
              top: tooltip.svgY - 10,
              background: '#0F172A',
              color: '#fff',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 12,
              pointerEvents: 'none',
              zIndex: 9999,
              minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>
                📍 {tooltip.pin.city || 'Unknown City'}{tooltip.pin.country ? `, ${tooltip.pin.country}` : ''}
              </div>
              <div style={{ color: '#94A3B8' }}>{tooltip.pin.count} application{tooltip.pin.count !== 1 ? 's' : ''}</div>
              {tooltip.pin.candidates?.slice(0, 3).map((c, i) => (
                <div key={i} style={{ color: '#CBD5E1', marginTop: 3, fontSize: 11 }}>• {c.name}</div>
              ))}
              {tooltip.pin.candidates?.length > 3 && (
                <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>+{tooltip.pin.candidates.length - 3} more</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
