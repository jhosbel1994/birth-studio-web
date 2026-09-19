export const MIN_DIM_M = 0.1;
export const MAX_DIM_M = 20;

export function formatDimension(value, unit = "cm") {
  return String(Number((value * (unit === "cm" ? 100 : 1)).toFixed(8)));
}

export function parseDimension(raw, unit = "cm") {
  const text = String(raw).trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const value = Number(text) / (unit === "cm" ? 100 : 1);
  return Number.isFinite(value) && value >= MIN_DIM_M && value <= MAX_DIM_M ? value : null;
}

export function fitAvailableSpace(width, height, facadeWidth, facadeHeight, ratio = 0.5) {
  const factor = Math.min(facadeWidth * ratio / width, facadeHeight * ratio / height);
  const result = { width: width * factor, height: height * factor };
  return [result.width, result.height].every(v => v >= MIN_DIM_M && v <= MAX_DIM_M) ? result : null;
}
