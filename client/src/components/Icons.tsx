import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'search'
  | 'sliders'
  | 'x'
  | 'plus'
  | 'check'
  | 'arrow-up-right'
  | 'refresh'
  | 'fit'
  | 'download'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'info'
  | 'sparkles'
  | 'graph'
  | 'grid'
  | 'layers'
  | 'trash';

const paths: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h10M18 17h2" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="16" cy="17" r="2" />
    </>
  ),
  x: <path d="m6 6 12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4.5 4.5L19 6.5" />,
  'arrow-up-right': <path d="M7 17 17 7M8 7h9v9" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-13.6-5.2L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 13.6 5.2L20 16" />
      <path d="M20 20v-4h-4" />
    </>
  ),
  fit: (
    <>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 19h14" />
    </>
  ),
  'chevron-down': <path d="m6 9.5 6 6 6-6" />,
  'chevron-left': <path d="m14.5 6-6 6 6 6" />,
  'chevron-right': <path d="m9.5 6 6 6-6 6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.6v.2" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.5 13.7 9l5.3 1.8-5.3 1.8L12 18l-1.7-5.4L5 10.8 10.3 9 12 3.5Z" />
      <path d="M19 16.5 19.7 18l1.5.7-1.5.6-.7 1.5-.7-1.5-1.5-.6 1.5-.7.7-1.5Z" />
    </>
  ),
  graph: (
    <>
      <circle cx="6" cy="17" r="2.2" />
      <circle cx="17.5" cy="6" r="2.2" />
      <circle cx="17.5" cy="17" r="2.2" />
      <path d="M8 15.6 15.6 7.6M8.1 17h7.2" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
    </>
  ),
  layers: (
    <>
      <path d="m12 4 8 5-8 5-8-5 8-5Z" />
      <path d="m5 13.5 7 4.3 7-4.3" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V5h5v2M7 7l.8 12h8.4L17 7" />
      <path d="M10.5 10.5v5M13.5 10.5v5" />
    </>
  ),
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 16, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="logo-stroke" x1="8" y1="6" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5eead4" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <path
        d="M24 5.5 39.5 14v20L24 42.5 8.5 34V14L24 5.5Z"
        stroke="url(#logo-stroke)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <ellipse
        cx="24"
        cy="24"
        rx="14.5"
        ry="6.2"
        transform="rotate(-28 24 24)"
        stroke="#5eead4"
        strokeOpacity="0.5"
        strokeWidth="1.1"
      />
      <circle cx="24" cy="24" r="3.4" fill="#5eead4" />
      <circle cx="36.4" cy="14.8" r="1.7" fill="#818cf8" />
      <circle cx="11.6" cy="33.2" r="1.3" fill="#5eead4" fillOpacity="0.8" />
    </svg>
  );
}
