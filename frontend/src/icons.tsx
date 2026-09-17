import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(children: React.ReactNode, props: IconProps) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconCompass(props: IconProps) {
  return base(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-2 6-4 2 2-6z" />
    </>,
    props,
  );
}

export function IconTimeline(props: IconProps) {
  return base(
    <>
      <path d="M4 6h16M4 12h10M4 18h6" />
      <circle cx="19" cy="6" r="1.4" fill="currentColor" />
      <circle cx="16" cy="12" r="1.4" fill="currentColor" />
    </>,
    props,
  );
}

export function IconLayers(props: IconProps) {
  return base(
    <>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>,
    props,
  );
}

export function IconTool(props: IconProps) {
  return base(
    <>
      <path d="M14.7 6.3a4 4 0 00-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 005.4-5.4l-2.5 2.5-2-2z" />
    </>,
    props,
  );
}

export function IconSettings(props: IconProps) {
  return base(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.6V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.6 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.6 1z" />
    </>,
    props,
  );
}

export function IconTarget(props: IconProps) {
  return base(
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </>,
    props,
  );
}

export function IconBrain(props: IconProps) {
  return base(
    <>
      <path d="M9 4a3 3 0 00-3 3 3 3 0 00-1 5.8A3 3 0 007 18a3 3 0 005-2.3V6a2 2 0 00-3-1.7z" />
      <path d="M15 4a3 3 0 013 3 3 3 0 011 5.8A3 3 0 0117 18a3 3 0 01-5-2.3V6a2 2 0 013-1.7z" />
    </>,
    props,
  );
}

export function IconWrench(props: IconProps) {
  return base(
    <>
      <path d="M14.7 6.3a4 4 0 00-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 005.4-5.4l-2.5 2.5-2-2z" />
    </>,
    props,
  );
}

export function IconCheck(props: IconProps) {
  return base(<path d="M5 13l4 4L19 7" />, props);
}

export function IconX(props: IconProps) {
  return base(
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>,
    props,
  );
}

export function IconAlertTriangle(props: IconProps) {
  return base(
    <>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17.3" r="0.6" fill="currentColor" />
    </>,
    props,
  );
}

export function IconStop(props: IconProps) {
  return base(<rect x="6" y="6" width="12" height="12" rx="2" />, props);
}

export function IconFlag(props: IconProps) {
  return base(
    <>
      <path d="M6 3v18" />
      <path d="M6 4h11l-3 4 3 4H6" />
    </>,
    props,
  );
}

export function IconChevronRight(props: IconProps) {
  return base(<path d="M9 6l6 6-6 6" />, props);
}

export function IconClock(props: IconProps) {
  return base(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </>,
    props,
  );
}

export function IconInbox(props: IconProps) {
  return base(
    <>
      <path d="M4 12h4l2 3h4l2-3h4" />
      <path d="M4 12l1.5-6h13L20 12" />
      <path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6" />
    </>,
    props,
  );
}
