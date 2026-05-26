"use client";

interface BetaCurveProps {
  successes: number;
  failures: number;
  color: string;
  width?: number;
  height?: number;
}

/**
 * SVG-based Beta distribution curve using normal approximation.
 */
export function BetaCurve({ successes, failures, color, width = 80, height = 32 }: BetaCurveProps) {
  const alpha = successes + 1;
  const beta = failures + 1;
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  const std = Math.sqrt(Math.max(variance, 0.001));

  // Generate curve points
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = i / 40;
    const pdf = Math.exp(-0.5 * ((x - mean) / std) ** 2) / (std * Math.sqrt(2 * Math.PI));
    points.push({ x: x * width, y: pdf });
  }

  const maxY = Math.max(...points.map((p) => p.y), 0.01);
  const pts = points
    .map((p) => `${p.x.toFixed(1)},${(height - (p.y / maxY) * (height - 4) - 2).toFixed(1)}`)
    .join(" ");

  const area =
    `M${points[0].x.toFixed(1)},${height} ` +
    points
      .map((p) => `L${p.x.toFixed(1)},${(height - (p.y / maxY) * (height - 4) - 2).toFixed(1)}`)
      .join(" ") +
    ` L${width},${height} Z`;

  const meanX = mean * width;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path d={area} fill={color} opacity={0.15} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
      <line
        x1={meanX}
        y1={2}
        x2={meanX}
        y2={height}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="2 2"
        opacity={0.7}
      />
    </svg>
  );
}
