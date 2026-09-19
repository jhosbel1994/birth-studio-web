export const MOUNTING_ENVIRONMENTS = [
  { id: "fachada", label: "Fachada exterior", scene: "fachada" },
  { id: "interior", label: "Local interior", scene: "interior" },
  { id: "totem", label: "Tótem publicitario", scene: "totem" },
  { id: "vitrina", label: "Vitrina", scene: "fachada" },
  { id: "foto", label: "Foto de fachada desde Mockup de vidrio", scene: "foto" },
];
const SURFACES = {
  fachada: ["wall", "side"], interior: ["wall", "side", "desk"],
  totem: ["wall"], vitrina: ["wall"], foto: ["wall"],
};
export function compatibleSurfaces(environment) {
  return SURFACES[environment] || [];
}
export function reconcileMounting(items, environment) {
  const allowed = compatibleSurfaces(environment);
  return items.map(item => item.surface == null || allowed.includes(item.surface)
    ? item : { ...item, surface: null });
}
