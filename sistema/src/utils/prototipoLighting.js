export function lightingLevel(value) {
  const level = Number.isFinite(Number(value)) ? Math.max(1, Math.min(10, Number(value))) : 6;
  const progress = ((level - 1) / 9) ** 2;
  return {
    internal: 1 + 29 * progress,
    // The previous maximum multiplier was 5.96; preserve the low end.
    gain: 0.06 + (3 * 5.96 - 0.06) * progress,
    haloSpread: 0.5 + 3.3 * Math.sqrt(progress),
  };
}

export function haloRadius(radius, width, height) {
  // Bound padding to 25% of the source's longest side, at most 256 px.
  return Math.max(2, Math.min(radius, 256, Math.max(width, height) / 12));
}
