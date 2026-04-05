import React from 'react';

/**
 * RevenueLineChart - Custom SVG Line Chart
 * Features: Cubic Bezier curves, Gradient fill, Hover interactions (simplified)
 */
export const RevenueLineChart = ({ data, height = 300, color = 'var(--accent-color)' }) => {
  if (!data || data.length === 0) return null;

  const width = 1000;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxVal = Math.max(...data.map(d => d.revenue)) * 1.1;
  const minVal = 0;

  const getX = (index) => padding + (index * (chartWidth / (data.length - 1)));
  const getY = (value) => height - padding - ((value - minVal) / (maxVal - minVal) * chartHeight);

  // Generate SVG Path using Cubic Bezier for smooth curves
  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.revenue) }));
  
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cp1x = curr.x + (next.x - curr.x) / 2;
    const cp2x = curr.x + (next.x - curr.x) / 2;
    pathD += ` C ${cp1x} ${curr.y}, ${cp2x} ${next.y}, ${next.x} ${next.y}`;
  }

  const fillD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: height }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        
        {/* Y Axis Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line 
            key={i}
            x1={padding} 
            y1={height - padding - (p * chartHeight)} 
            x2={width - padding} 
            y2={height - padding - (p * chartHeight)} 
            stroke="rgba(255,255,255,0.05)" 
            strokeDasharray="4"
          />
        ))}

        {/* X Axis Labels */}
        {data.filter((_, i) => i % 2 === 0).map((d, i) => (
          <text 
            key={i}
            x={getX(i * 2)} 
            y={height - padding + 20} 
            fill="var(--text-secondary)" 
            fontSize="12" 
            textAnchor="middle"
            fontWeight="600"
          >
            {d.day}
          </text>
        ))}

        {/* Areas & Paths */}
        <path d={fillD} fill="url(#chartGradient)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data Points */}
        {points.map((p, i) => (
          <circle 
            key={i} 
            cx={p.x} 
            cy={p.y} 
            r="6" 
            fill="var(--bg-color)" 
            stroke={color} 
            strokeWidth="3" 
            style={{ cursor: 'pointer', transition: 'r 0.2s' }}
          />
        ))}
      </svg>
    </div>
  );
};

/**
 * ConversionDonutChart - Custom SVG Donut
 */
export const ConversionDonutChart = ({ data, size = 200 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 70;
  const stroke = 25;
  const circumference = 2 * Math.PI * radius;

  // Calculate offsets in a pure functional way
  const circleData = data.reduce((acc, d) => {
    const dash = (d.value / total) * circumference;
    const offset = acc.currentOffset;
    acc.circles.push({ ...d, dash, offset });
    acc.currentOffset -= dash;
    return acc;
  }, { circles: [], currentOffset: 0 }).circles;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius} 
          fill="none" 
          stroke="rgba(255,255,255,0.05)" 
          strokeWidth={stroke} 
        />
        {circleData.map((d, i) => (
          <circle 
            key={i}
            cx={size / 2} 
            cy={size / 2} 
            r={radius} 
            fill="none" 
            stroke={d.color} 
            strokeWidth={stroke} 
            strokeDasharray={`${d.dash} ${circumference}`}
            strokeDashoffset={d.offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        ))}
        <text x="50%" y="45%" textAnchor="middle" fill="white" fontSize="18" fontWeight="800">100%</text>
        <text x="50%" y="60%" textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontWeight="700">CONVERSION</text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: d.color }}></div>
            <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{d.name}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * MiniSparkline - Tiny SVG Trend Line
 */
export const MiniSparkline = ({ data, width = 80, height = 30, color = 'var(--accent-color)' }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * height
  }));
  const d = `M ${points.map(p => `${p.x},${p.y}`).join(' L')}`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
