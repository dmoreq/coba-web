export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size * 3}
      height={size}
      viewBox="0 0 120 40"
      fill="none"
      style={{ display: "block" }}
    >
      <rect width={120} height={40} rx={10} fill="#EBF4FF" />
      {/* arm 1 – email */}
      <rect x={10} y={24} width={6} height={10} rx={2} fill="#228be6" opacity={0.35} />
      <rect x={10} y={20} width={6} height={4} rx={1} fill="#228be6" opacity={0.75} />
      <circle cx={13} cy={19} r={2.5} fill="#228be6" />
      <line
        x1={13}
        y1={13}
        x2={13}
        y2={19}
        stroke="#228be6"
        strokeWidth={1.5}
        strokeDasharray="1.5 1"
      />
      {/* arm 2 – sms (best, chosen) */}
      <rect x={22} y={14} width={6} height={20} rx={2} fill="#12b886" opacity={0.35} />
      <rect x={22} y={11} width={6} height={3} rx={1} fill="#12b886" opacity={0.75} />
      <circle cx={25} cy={10} r={2.5} fill="#12b886" />
      <line
        x1={25}
        y1={5}
        x2={25}
        y2={10}
        stroke="#12b886"
        strokeWidth={1.5}
        strokeDasharray="1.5 1"
      />
      <circle cx={25} cy={4} r={2} fill="#12b886" />
      {/* arm 3 – push */}
      <rect x={34} y={18} width={6} height={16} rx={2} fill="#fd7e14" opacity={0.35} />
      <rect x={34} y={14} width={6} height={4} rx={1} fill="#fd7e14" opacity={0.75} />
      <circle cx={37} cy={13} r={2.5} fill="#fd7e14" />
      <line
        x1={37}
        y1={7}
        x2={37}
        y2={13}
        stroke="#fd7e14"
        strokeWidth={1.5}
        strokeDasharray="1.5 1"
      />
      {/* wordmark */}
      <text
        x={50}
        y={26}
        fontFamily="Inter, -apple-system, sans-serif"
        fontSize={16}
        fontWeight={700}
        fill="#1864ab"
        letterSpacing="-0.5"
      >
        coba
      </text>
    </svg>
  );
}
