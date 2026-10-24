import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps): IconProps {
  return {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    </svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 19h16" />
      <path d="M7 19v-5" />
      <path d="M12 19V8" />
      <path d="M17 19v-8" />
    </svg>
  );
}

export function DumbbellIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 9v6" />
      <path d="M7 7v10" />
      <path d="M17 7v10" />
      <path d="M20 9v6" />
      <path d="M7 12h10" />
    </svg>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3c2.5 3 5.5 5 5.5 9a5.5 5.5 0 11-11 0c0-2 1-3.5 2.5-4.5 0 1.5 1 2.5 2 2.5 1.5 0 1.5-3 1-7z" />
    </svg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
    </svg>
  );
}

export function SaladIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 13h16a8 8 0 01-8 8 8 8 0 01-8-8z" />
      <path d="M9.5 9.5c0-2 1.5-3.5 3-4" />
      <path d="M14 10c0-2.2 1.6-4 3.5-4" />
    </svg>
  );
}

export function ScaleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="4.5" width="17" height="15.5" rx="3.5" />
      <path d="M9 9.5a3 3 0 106 0" />
      <path d="M12 9.5l2-2.5" />
    </svg>
  );
}

export function FootstepsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7.5 4.5c1.6 0 2.5 1.4 2.5 3.2 0 1.4-.6 2.3-.6 3.6 0 1.5.7 2.4.7 3.9 0 1.7-1 2.8-2.6 2.8s-2.6-1.1-2.6-2.8c0-1.5.7-2.4.7-3.9 0-1.3-.6-2.2-.6-3.6 0-1.8.9-3.2 2.5-3.2z" />
      <path d="M15.5 8.5c1.4 0 2.2 1.2 2.2 2.8 0 1.2-.5 2-.5 3.1 0 1.3.6 2.1.6 3.4 0 1.5-.9 2.5-2.3 2.5s-2.3-1-2.3-2.5c0-1.3.6-2.1.6-3.4 0-1.1-.5-1.9-.5-3.1 0-1.6.8-2.8 2.2-2.8z" />
    </svg>
  );
}
