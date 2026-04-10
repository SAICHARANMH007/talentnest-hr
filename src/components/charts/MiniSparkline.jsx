import React from 'react';

export default function MiniSparkline({ values, color }) {
  if (!values?.length) return null;
  const max = Math.max(...values,1), w=80, h=28;
  const pts = values.length === 1
    ? `0,${h-(values[0]/max)*h} ${w},${h-(values[0]/max)*h}`
    : values.map((v, i) => `${(i/(values.length-1))*w},${h-(v/max)*h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow:"visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
      <circle cx={(((values.length-1)/(values.length-1))*w)} cy={h-(values[values.length-1]/max)*h} r={2.5} fill={color} />
    </svg>
  );
}
