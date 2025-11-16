import type { SVGProps } from 'react';

const Logo = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 600 400" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="heatmapLinesGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#00C0FF"/>
        <stop offset="25%" stopColor="#19D896"/>
        <stop offset="50%" stopColor="#FFDD00"/>
        <stop offset="75%" stopColor="#FF9300"/>
        <stop offset="100%" stopColor="#FF0000"/>
      </linearGradient>
      <linearGradient id="fShapeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#00C0FF"/>
        <stop offset="100%" stopColor="#19D896"/>
      </linearGradient>
    </defs>
    <path
      d="M 100 150 C 100 100, 150 100, 200 150 L 200 250 C 200 300, 150 300, 100 250 Z M 150 150 H 100 V 100 H 150 Z"
      fill="url(#fShapeGradient)"
      stroke="rgba(255,255,255,0.2)" strokeWidth="3"
    />
    <g>
      <rect x="220" y="120" width="80" height="8" rx="2" fill="url(#heatmapLinesGradient)" />
      <rect x="230" y="135" width="100" height="8" rx="2" fill="url(#heatmapLinesGradient)" />
      <rect x="240" y="150" width="120" height="8" rx="2" fill="url(#heatmapLinesGradient)" />
      <rect x="250" y="165" width="110" height="8" rx="2" fill="url(#heatmapLinesGradient)" />
      <rect x="260" y="180" width="90" height="8" rx="2" fill="url(#heatmapLinesGradient)" />
      <rect x="270" y="195" width="100" height="8" rx="2" fill="url(#heatmapLinesGradient)" />
      <rect x="280" y="210" width="115" height="8" rx="2" fill="url(#heatmapLinesGradient)" />
    </g>
  </svg>
);

export default Logo;