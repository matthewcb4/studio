import type { SVGProps } from 'react';

const Logo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M4 6h16" />
    <path d="M12 6v12" />
    <path d="M8 18h8" />
    <path d="M4 6v0a2 2 0 01-2-2V4a2 2 0 012-2h0a2 2 0 012 2v0" />
    <path d="M20 6v0a2 2 0 002-2V4a2 2 0 00-2-2h0a2 2 0 00-2 2v0" />
  </svg>
);

export default Logo;
