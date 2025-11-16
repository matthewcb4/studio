import type { SVGProps } from 'react';

const Logo = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="250 250 450 450" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
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
      d="M 300 350 H 400 V 400 H 350 V 500 H 400 V 550 H 300 Z M 350 450 H 300 V 400 H 350 Z"
      fill="url(#fShapeGradient)"
      stroke="rgba(255,255,255,0.2)"
      strokeWidth="3"
    />
    <g>
      <rect x="420" y="320" width="80" height="8" rx="2" fill="url(#heatmapLinesGradient)" />
      <rect x="430" y="335" width="100" height="8" rx="2" fill="url(#heatmapLinesGradient)" />
      <rect x="440" y="350" width="120" height="8" rx="2" fill="url(#heatmapLinesGradient)" />
      <rect x="450" y="365" width="110" height="8" rx="2" fill="url(#heatmapLinesGradient)" />
      <rect x="460" y="380" width="90" height="8" rx="2" fill="url(#heatmapLinesGradient)" />
      <rect x="470" y="395" width="100" height="8" rx="2" fill="url(#heatmapLinesGradient)" />
      <rect x="480" y="410" width="115" height="8" rx="2" fill="url(#heatmapLinesGradient)" />
    </g>
  </svg>
);

export default Logo;
