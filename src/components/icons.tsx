import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2c-4.4 0-8 3.6-8 8 0 5.6 8 12 8 12s8-6.4 8-12c0-4.4-3.6-8-8-8z" />
      <g fill="hsl(var(--background))" stroke="hsl(var(--background))">
        <path d="M10.5 12H14" />
        <path d="M10.5 9H13a1.5 1.5 0 0 1 0 3H10.5V9z" />
      </g>
    </svg>
  );
}
