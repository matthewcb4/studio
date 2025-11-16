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
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" />
    <path d="M12 12H8" />
    <path d="M16 12h-4" />
    <path d="M12 8v8" />
    <path d="M16 16h-4" />
    <path d="M10 8h-1.5" />
    <path d="m9 10-1-2" />
  </svg>
);

export default Logo;
