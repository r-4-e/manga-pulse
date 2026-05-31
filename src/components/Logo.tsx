interface Props {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 28, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill="currentColor" />
      <g
        fill="var(--background)"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight={800}
        textAnchor="middle"
      >
        <text x="22" y="30" fontSize={26}>M</text>
        <text x="42" y="50" fontSize={26}>H</text>
      </g>
    </svg>
  );
}
