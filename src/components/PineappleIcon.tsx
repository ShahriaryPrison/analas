type PineappleIconProps = {
  className?: string;
  title?: string;
};

export default function PineappleIcon({ className, title }: PineappleIconProps) {
  const svgClassName = ["block", className].filter(Boolean).join(" ");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={svgClassName}
      role={title ? "img" : undefined}
      aria-label={title}
      fill="none"
    >
      {title ? <title>{title}</title> : null}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="rotate(40 50 50)"
      >
        <rect x="25" y="35" width="50" height="60" rx="25" />
        <path d="M 32 42 C 20 22 40 15 44 28 C 45 10 55 10 56 28 C 60 15 80 22 68 42" />
        <path d="M 44 50 L 50 56 L 56 50" strokeWidth="4" />
        <path d="M 34 62 L 40 68 L 46 62" strokeWidth="4" />
        <path d="M 54 62 L 60 68 L 66 62" strokeWidth="4" />
        <path d="M 44 74 L 50 80 L 56 74" strokeWidth="4" />
      </g>
    </svg>
  );
}
