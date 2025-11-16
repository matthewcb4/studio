import type { SVGProps } from 'react';

const Logo = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="heatmapLinesGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#00C0FF"/>
        <stop offset="25%" stopColor="#19D896"/>
        <stop offset="50%" stopColor="#FFDD00"/>
        <stop offset="75%" stopColor="#FF9300"/>
        <stop offset="100%" stopColor="#FF0000"/>
      </linearGradient>
      <linearGradient id="fShapeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#00C0FF"/>
        <stop offset="100%" stopColor="#19D896"/>
      </linearGradient>
    </defs>
    <g transform="translate(20, 20)">
        <path
            d="M 140 80 L 140 100 L 110 100 L 110 150 L 140 150 L 140 170 L 80 170 L 80 80 L 110 80 C 120 60, 130 60, 140 80 Z"
            fill="url(#fShapeGradient)"
            stroke="rgba(255,255,255,0.2)" strokeWidth="3"
        />
        <g className="data-lines">
            <rect x="160" y="80" width="130" height="10" rx="5" fill="url(#heatmapLinesGradient)" />
            <rect x="160" y="100" width="150" height="10" rx="5" fill="url(#heatmapLinesGradient)" />
            <rect x="160" y="120" width="160" height="10" rx="5" fill="url(#heatmapLinesGradient)" />
            <rect x="160" y="140" width="140" height="10" rx="5" fill="url(#heatmapLinesGradient)" />
            <rect x="160" y="160" width="170" height="10" rx="5" fill="url(#heatmapLinesGradient)" />
            <rect x="160" y="180" width="120" height="10" rx="5" fill="url(#heatmapLinesGradient)" />
            <rect x="160" y="200" width="110" height="10" rx="5" fill="url(#heatmapLinesGradient)" />
        </g>
    </g>
  </svg>
);

export default Logo;
