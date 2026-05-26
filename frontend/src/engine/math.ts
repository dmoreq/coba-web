/** Logistic sigmoid: maps any real to (0,1) */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Normal approximation to Beta(a, b) sampling.
 * Falls back to a clipped normal when alpha/beta are tiny.
 */
export function sampleBeta(a: number, b: number): number {
  const aa = Math.max(a, 0.05);
  const bb = Math.max(b, 0.05);
  const mean = aa / (aa + bb);
  const variance = (aa * bb) / ((aa + bb) ** 2 * (aa + bb + 1));
  const u1 = Math.max(1e-10, Math.random());
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
  return Math.max(0.001, Math.min(0.999, mean + Math.sqrt(variance) * z));
}

/** Invert a 2×2 matrix (returns identity on near-singular) */
export function inv2x2(
  A: [[number, number], [number, number]],
): [[number, number], [number, number]] {
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  if (Math.abs(det) < 1e-10) {
    return [
      [1, 0],
      [0, 1],
    ];
  }
  return [
    [A[1][1] / det, -A[0][1] / det],
    [-A[1][0] / det, A[0][0] / det],
  ];
}

/** Multiply a 2×2 matrix by a 2-vector */
export function matVec2(
  M: [[number, number], [number, number]],
  v: [number, number],
): [number, number] {
  return [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]];
}

/** Dot product of two 2-vectors */
export function dot2(a: [number, number], b: [number, number]): number {
  return a[0] * b[0] + a[1] * b[1];
}
