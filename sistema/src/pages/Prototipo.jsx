import React, { useRef, useState, useCallback, useEffect } from "react";
import * as THREE from "three";
import { guardarPrototipo } from "../utils/prototipoStore";

const SRGB = THREE.SRGBColorSpace;

// Aleatoriedad con semilla: las texturas y las luces de las ventanas se
// generan igual en cada reconstruccion, en vez de re-sortearse (lo que
// hacia parpadear las luces del entorno). resetRng() se llama al inicio
// de cada armado del entorno para que la secuencia sea siempre la misma.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let _rng = mulberry32(0x9e3779b9);
function rnd() { return _rng(); }
function resetRng() { _rng = mulberry32(0x9e3779b9); }

/* ================================================================
   MASCARA Y TRAZADO
   Convierte el logo en una mascara de blanco/negro y de ahi extrae
   los contornos vectoriales de cada pieza.
   ================================================================ */
function buildMask(imageData, threshold, invert, detect) {
  const { width: w, height: h, data } = imageData;
  const n = w * h;
  const mask = new Uint8Array(n);
  const lum = (i) => data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
  if (detect === "alpha") {
    const cut = (threshold / 255) * 200 + 25;
    for (let i = 0; i < n; i++) mask[i] = data[i * 4 + 3] > cut ? 1 : 0;
  } else if (detect === "dark") {
    for (let i = 0; i < n; i++) mask[i] = data[i * 4 + 3] > 40 && lum(i) < threshold ? 1 : 0;
  } else {
    for (let i = 0; i < n; i++) mask[i] = data[i * 4 + 3] > 40 && lum(i) > 255 - threshold ? 1 : 0;
  }
  if (invert) for (let i = 0; i < n; i++) mask[i] = mask[i] ? 0 : 1;
  let on = 0;
  for (let i = 0; i < n; i++) on += mask[i];
  return { mask, coverage: on / n };
}

function polyArea(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}
function polyLen(pts) {
  let L = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    L += Math.hypot(x2 - x1, y2 - y1);
  }
  return L;
}
function bboxOf(pts) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

/* Cada vertice guarda TODAS sus aristas salientes. Donde dos formas se
   tocan en diagonal salen dos del mismo punto; si se guardara una sola,
   se fusionarian y desaparecerian letras. */
function traceLoops(mask, w, h) {
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]);
  const key = (x, y) => x + "," + y;
  const out = new Map();
  const push = (x1, y1, x2, y2) => {
    const k = key(x1, y1);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push([x2, y2]);
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!at(x, y)) continue;
    if (!at(x, y - 1)) push(x, y, x + 1, y);
    if (!at(x + 1, y)) push(x + 1, y, x + 1, y + 1);
    if (!at(x, y + 1)) push(x + 1, y + 1, x, y + 1);
    if (!at(x - 1, y)) push(x, y + 1, x, y);
  }
  const used = new Set();
  const eid = (a, b) => a[0] + "," + a[1] + ">" + b[0] + "," + b[1];
  const loops = [];
  for (const [k0, dests] of out) for (const d0 of dests) {
    const a0 = k0.split(",").map(Number);
    if (used.has(eid(a0, d0))) continue;
    const loop = [];
    let a = a0, b = d0, g = 0;
    while (g++ < 2000000) {
      used.add(eid(a, b));
      loop.push([a[0], a[1]]);
      const cands = (out.get(key(b[0], b[1])) || []).filter((c) => !used.has(eid(b, c)));
      if (!cands.length) break;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      cands.sort((p, q) => {
        const cp = dx * (p[1] - b[1]) - dy * (p[0] - b[0]);
        const cq = dx * (q[1] - b[1]) - dy * (q[0] - b[0]);
        if (cp !== cq) return cq - cp;
        return (dx * (q[0] - b[0]) + dy * (q[1] - b[1])) - (dx * (p[0] - b[0]) + dy * (p[1] - b[1]));
      });
      a = b; b = cands[0];
      if (a[0] === a0[0] && a[1] === a0[1]) break;
    }
    if (loop.length > 8) loops.push(loop);
  }
  return loops;
}

function pointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function traceContours(imageData, threshold, invert, detect) {
  const { width: w, height: h } = imageData;
  const { mask } = buildMask(imageData, threshold, invert, detect);
  const loops = traceLoops(mask, w, h);
  const minArea = w * h * 0.00012;
  const outers = loops.filter((l) => polyArea(l) > minArea);
  const holes = loops.filter((l) => polyArea(l) < -minArea);
  return outers.map((outer) => ({
    outer,
    holes: holes.filter((hp) => {
      const cont = outers.filter((o) => pointInPoly(hp[0], o));
      if (!cont.length) return false;
      return cont.reduce((a, b) => (Math.abs(polyArea(a)) < Math.abs(polyArea(b)) ? a : b)) === outer;
    }),
  }));
}

function simplify(points, tol = 0.5) {
  if (points.length < 6) return points;
  const sq = tol * tol;
  const d2 = (p, a, b) => {
    let x = a[0], y = a[1], dx = b[0] - x, dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = b[0]; y = b[1]; } else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = p[0] - x; dy = p[1] - y;
    return dx * dx + dy * dy;
  };
  const dp = (pts) => {
    if (pts.length <= 2) return pts;
    let m = 0, idx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = d2(pts[i], pts[0], pts[pts.length - 1]);
      if (d > m) { m = d; idx = i; }
    }
    if (m > sq) return dp(pts.slice(0, idx + 1)).slice(0, -1).concat(dp(pts.slice(idx)));
    return [pts[0], pts[pts.length - 1]];
  };
  return dp(points.concat([points[0]])).slice(0, -1);
}

/* Un contorno que domina el area y llena su rectangulo es una placa
   (circular ~0.785 del bbox, rectangular ~1.0). */
function suggestProduct(contours) {
  if (!contours.length) return { product: "letters", form: "rect" };
  const items = contours.map((c) => ({ area: Math.abs(polyArea(c.outer)), bb: bboxOf(c.outer) }));
  const total = items.reduce((a, b) => a + b.area, 0);
  const big = items.reduce((a, b) => (a.area > b.area ? a : b));
  const dominance = big.area / total;
  const fill = big.area / Math.max(1, big.bb.w * big.bb.h);
  const ratio = big.bb.w / Math.max(1, big.bb.h);
  const isCircle = fill > 0.7 && fill < 0.87 && Math.abs(ratio - 1) < 0.18;
  const isRect = fill > 0.9;
  if (dominance > 0.7 && (isCircle || isRect)) return { product: "lightbox", form: isCircle ? "circle" : "rect" };
  return { product: "letters", form: "rect" };
}

function buildLetters(imageData, opts) {
  const { threshold, invert, detect, anchoM, altoM } = opts;
  const contours = traceContours(imageData, threshold, invert, detect);
  if (!contours.length) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const { outer } of contours) {
    const b = bboxOf(outer);
    if (b.minX < minX) minX = b.minX; if (b.maxX > maxX) maxX = b.maxX;
    if (b.minY < minY) minY = b.minY; if (b.maxY > maxY) maxY = b.maxY;
  }
  const pxW = Math.max(1, maxX - minX), pxH = Math.max(1, maxY - minY);
  const mPerPx = Math.min(anchoM / pxW, altoM / pxH);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const toVec = (p) => new THREE.Vector2((p[0] - cx) * mPerPx, -(p[1] - cy) * mPerPx);
  const shapes = [];
  let perim = 0, faceArea = 0;
  for (const { outer, holes } of contours) {
    const shape = new THREE.Shape(simplify(outer).map(toVec));
    holes.forEach((hp) => shape.holes.push(new THREE.Path(simplify(hp).map(toVec))));
    shapes.push(shape);
    perim += polyLen(outer) * mPerPx;
    faceArea += Math.abs(polyArea(outer)) * mPerPx * mPerPx;
    holes.forEach((hp) => { perim += polyLen(hp) * mPerPx; faceArea -= Math.abs(polyArea(hp)) * mPerPx * mPerPx; });
  }
  return { shapes, mPerPx, cx, cy, realW: pxW * mPerPx, realH: pxH * mPerPx, perim, faceArea, count: shapes.length };
}

function panelShape(form, w, h) {
  const shape = new THREE.Shape();
  if (form === "circle") {
    shape.absarc(0, 0, Math.min(w, h) / 2, 0, Math.PI * 2, false);
  } else {
    const r = Math.min(w, h) * 0.04, x = w / 2, y = h / 2;
    shape.moveTo(-x + r, -y); shape.lineTo(x - r, -y);
    shape.quadraticCurveTo(x, -y, x, -y + r); shape.lineTo(x, y - r);
    shape.quadraticCurveTo(x, y, x - r, y); shape.lineTo(-x + r, y);
    shape.quadraticCurveTo(-x, y, -x, y - r); shape.lineTo(-x, -y + r);
    shape.quadraticCurveTo(-x, -y, -x + r, -y);
  }
  return shape;
}

/* Escala de dibujo: por encima de 150 cm se trabaja 1:10, como en plano. */
const LIMITE_1A1_CM = 150;

function drawingScale(anchoM, altoM) {
  const largoCm = Math.max(anchoM, altoM) * 100;
  return largoCm > LIMITE_1A1_CM ? 10 : 1;
}

/* Resolucion del lienzo de arte. Se agranda en paneles grandes para que no
   caiga la densidad de px/cm y el arte quede borroso. */
function panelPixels(panelW, panelH) {
  const largoCm = Math.max(panelW, panelH) * 100;
  return Math.round(Math.max(1400, Math.min(2400, largoCm * 8)));
}

function panelMetrics(panelW, panelH) {
  const PX = panelPixels(panelW, panelH);
  const aspect = panelW / panelH;
  const pxW = aspect >= 1 ? PX : Math.round(PX * aspect);
  const pxH = aspect >= 1 ? Math.round(PX / aspect) : PX;
  return { pxW, pxH, pxPorCm: pxW / (panelW * 100), escala: drawingScale(panelW, panelH) };
}

/* Espejo horizontal y/o vertical del logo de origen. Se aplica sobre el
   canvas ORIGINAL (nunca sobre uno ya volteado), para que prender y
   apagar el espejo sea reversible en vez de acumularse. */
function flipCanvas(src, fh, fv) {
  if (!fh && !fv) return src;
  const c = document.createElement("canvas");
  c.width = src.width; c.height = src.height;
  const g = c.getContext("2d");
  g.translate(fh ? c.width : 0, fv ? c.height : 0);
  g.scale(fh ? -1 : 1, fv ? -1 : 1);
  g.drawImage(src, 0, 0);
  return c;
}

/* Devuelve la caja del contenido real del logo, ignorando el margen vacio
   del archivo. Sin esto, un PNG con aire alrededor se dibuja mas chico de
   lo que el usuario pidio. */
function contentBounds(canvas) {
  const w = canvas.width, h = canvas.height;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  const d = g.getImageData(0, 0, w, h).data;

  let opaque = 0;
  for (let i = 0; i < w * h; i++) if (d[i * 4 + 3] > 200) opaque++;
  const hasAlpha = opaque / (w * h) < 0.95;

  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] < 20) continue;
      if (!hasAlpha) {
        const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        if (lum > 247) continue; // fondo blanco del archivo
      }
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return { x: 0, y: 0, w, h };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/* artScale al 100% llena el panel de borde a borde. En la caja circular lo
   que sobresale no se dibuja, porque la placa ya es un circulo. offX/offY
   (-1..1) desplazan el arte dentro del margen que deja el escalado, sin
   sacarlo nunca del panel. */
function panelCanvas(srcCanvas, form, panelW, panelH, artScale = 1, offX = 0, offY = 0) {
  const { pxW, pxH } = panelMetrics(panelW, panelH);
  const c = document.createElement("canvas");
  c.width = pxW; c.height = pxH;
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, c.width, c.height);

  const b = contentBounds(srcCanvas);
  const k = Math.min((c.width * artScale) / b.w, (c.height * artScale) / b.h);
  const dw = b.w * k, dh = b.h * k;
  const slackX = (c.width - dw) / 2, slackY = (c.height - dh) / 2;
  const px = slackX + offX * slackX, py = slackY + offY * slackY;
  g.drawImage(srcCanvas, b.x, b.y, b.w, b.h, px, py, dw, dh);
  return c;
}

function buildLightbox({ form, anchoM, altoM }) {
  let w = anchoM, h = altoM;
  if (form === "circle") { const d = Math.min(anchoM, altoM); w = d; h = d; }
  return {
    shape: panelShape(form, w, h), realW: w, realH: h,
    perim: form === "circle" ? Math.PI * Math.min(w, h) : 2 * (w + h),
    faceArea: form === "circle" ? Math.PI * Math.pow(Math.min(w, h) / 2, 2) : w * h,
    count: 1,
  };
}

function applyUV(geo, kind, p) {
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    let u, v;
    if (kind === "letters") {
      u = (x / p.mPerPx + p.cx) / p.imgW;
      v = 1 - (-y / p.mPerPx + p.cy) / p.imgH;
    } else {
      u = (x + p.w / 2) / p.w;
      v = (y + p.h / 2) / p.h;
    }
    uv[i * 2] = u; uv[i * 2 + 1] = v;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

/* ================================================================
   HALO DE RETROILUMINACION
   La luz sale por detras de la pieza y cae en degradado sobre el muro.
   Se dibuja la silueta y se desenfoca en dos capas: una ancha y tenue,
   otra angosta y brillante. El radio crece con la separacion del muro.
   ================================================================ */
function silhouetteCanvas(mask, w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  const img = g.createImageData(w, h);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    img.data[i * 4] = 255; img.data[i * 4 + 1] = 255;
    img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function shapeSilhouetteCanvas(form, w, h) {
  const PX = 900;
  const c = document.createElement("canvas");
  const aspect = w / h;
  c.width = aspect >= 1 ? PX : Math.round(PX * aspect);
  c.height = aspect >= 1 ? Math.round(PX / aspect) : PX;
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff";
  if (form === "circle") {
    g.beginPath();
    g.arc(c.width / 2, c.height / 2, Math.min(c.width, c.height) / 2, 0, Math.PI * 2);
    g.fill();
  } else {
    g.fillRect(0, 0, c.width, c.height);
  }
  return c;
}

function haloCanvas(silhouette, radiusPx) {
  const pad = Math.ceil(radiusPx * 3) + 8;
  const c = document.createElement("canvas");
  c.width = silhouette.width + pad * 2;
  c.height = silhouette.height + pad * 2;
  const g = c.getContext("2d");
  // capa ancha y tenue
  g.filter = `blur(${Math.max(2, radiusPx * 2)}px)`;
  g.globalAlpha = 0.5;
  g.drawImage(silhouette, pad, pad);
  // capa angosta y brillante junto al borde
  g.filter = `blur(${Math.max(1, radiusPx * 0.7)}px)`;
  g.globalAlpha = 0.85;
  g.drawImage(silhouette, pad, pad);
  g.filter = "none"; g.globalAlpha = 1;
  return { canvas: c, pad };
}

/* ================================================================
   MATERIALES DE FACHADA
   ================================================================ */
// Rango calmo (0.3-0.7) salvo donde el material real lo justifique — el
// negro mate 0.94 y el blanco brillante 0.14 originales eran extremos
// que, junto al vidrio, hacian ver todo mas plastico/videojuego.
const FINISHES = [
  { id: "madera", label: "Madera", hex: "#8b5e3c", rough: 0.72, metal: 0.0 },
  { id: "metal", label: "Metal", hex: "#9aa1a9", rough: 0.36, metal: 0.82 },
  { id: "negro", label: "Negro mate", hex: "#191a1d", rough: 0.82, metal: 0.02 },
  { id: "blanco", label: "Blanco brillante", hex: "#f1f2f4", rough: 0.22, metal: 0.05 },
];

const MATERIALS = [
  { id: "acanalada", label: "Acanalada" },
  { id: "acm", label: "Aluminio compuesto" },
  { id: "wallpanel", label: "Wall panel" },
  { id: "internit", label: "Internit" },
  { id: "madera", label: "Madera" },
  { id: "lisa", label: "Lisa" },
];

function shade(hex, amount) {
  const c = new THREE.Color(hex);
  const t = amount > 0 ? new THREE.Color(0xffffff) : new THREE.Color(0x000000);
  return "#" + c.lerp(t, Math.abs(amount)).getHexString();
}

function facadeTexture(material, hex, dir = "h", slatPx = 102) {
  const W = 1024, H = 1024;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = hex; g.fillRect(0, 0, W, H);

  if (material === "acanalada") {
    const pitch = 64;
    for (let x = 0; x < W; x += pitch) {
      const grad = g.createLinearGradient(x, 0, x + pitch, 0);
      grad.addColorStop(0, shade(hex, -0.30));
      grad.addColorStop(0.30, shade(hex, 0.16));
      grad.addColorStop(0.55, shade(hex, 0.05));
      grad.addColorStop(1, shade(hex, -0.34));
      g.fillStyle = grad; g.fillRect(x, 0, pitch, H);
    }
  } else if (material === "acm") {
    const p = 341;
    for (let y = 0; y < H; y += p) for (let x = 0; x < W; x += p) {
      g.fillStyle = shade(hex, (rnd() - 0.5) * 0.05);
      g.fillRect(x, y, p - 5, p - 5);
    }
    g.fillStyle = shade(hex, -0.55);
    for (let y = p - 5; y < H; y += p) g.fillRect(0, y, W, 5);
    for (let x = p - 5; x < W; x += p) g.fillRect(x, 0, 5, H);
  } else if (material === "wallpanel") {
    const slat = slatPx;
    const seam = Math.max(3, Math.round(slat * 0.07));
    if (dir === "v") {
      for (let x = 0; x < W; x += slat) {
        const grad = g.createLinearGradient(x, 0, x + slat, 0);
        grad.addColorStop(0, shade(hex, 0.14));
        grad.addColorStop(0.75, shade(hex, -0.05));
        grad.addColorStop(1, shade(hex, -0.22));
        g.fillStyle = grad; g.fillRect(x, 0, slat - seam, H);
        g.fillStyle = shade(hex, -0.62);
        g.fillRect(x + slat - seam, 0, seam, H);
      }
    } else {
      for (let y = 0; y < H; y += slat) {
        const grad = g.createLinearGradient(0, y, 0, y + slat);
        grad.addColorStop(0, shade(hex, 0.14));
        grad.addColorStop(0.75, shade(hex, -0.05));
        grad.addColorStop(1, shade(hex, -0.22));
        g.fillStyle = grad; g.fillRect(0, y, W, slat - seam);
        g.fillStyle = shade(hex, -0.62);
        g.fillRect(0, y + slat - seam, W, seam);
      }
    }
  } else if (material === "internit") {
    const p = 256;
    for (let i = 0; i < 26000; i++) {
      g.fillStyle = shade(hex, (rnd() - 0.5) * 0.13);
      g.fillRect(rnd() * W, rnd() * H, 2.5, 2.5);
    }
    g.fillStyle = shade(hex, -0.40);
    for (let y = p; y < H; y += p) g.fillRect(0, y - 2, W, 3);
    for (let x = p; x < W; x += p) g.fillRect(x - 2, 0, 3, H);
  } else if (material === "madera") {
    const plank = 128;
    for (let x = 0; x < W; x += plank) {
      g.fillStyle = shade(hex, (rnd() - 0.5) * 0.14);
      g.fillRect(x, 0, plank - 3, H);
      g.strokeStyle = shade(hex, -0.30);
      g.lineWidth = 1;
      for (let i = 0; i < 22; i++) {
        const gx = x + rnd() * plank;
        g.beginPath(); g.moveTo(gx, 0);
        for (let y = 0; y < H; y += 40) g.lineTo(gx + Math.sin(y * 0.02 + x) * 4, y);
        g.stroke();
      }
      g.fillStyle = shade(hex, -0.55);
      g.fillRect(x + plank - 3, 0, 3, H);
    }
  }
  return c;
}

/* Mapa de relieve en escala de grises. Sin esto la chapa acanalada se ve
   como rayas pintadas y la madera como lineas dibujadas: el color solo no
   alcanza, hace falta que la luz reaccione al volumen. */
function facadeBump(material, dir = "h", slatPx = 102) {
  const W = 1024, H = 1024;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#808080"; g.fillRect(0, 0, W, H);

  if (material === "acanalada") {
    const pitch = 64;
    for (let x = 0; x < W; x += pitch) {
      const grad = g.createLinearGradient(x, 0, x + pitch, 0);
      grad.addColorStop(0, "#101010");
      grad.addColorStop(0.35, "#f2f2f2");
      grad.addColorStop(0.62, "#c8c8c8");
      grad.addColorStop(1, "#0a0a0a");
      g.fillStyle = grad; g.fillRect(x, 0, pitch, H);
    }
  } else if (material === "acm") {
    const p = 341;
    g.fillStyle = "#9a9a9a";
    for (let y = 0; y < H; y += p) for (let x = 0; x < W; x += p) g.fillRect(x, y, p - 5, p - 5);
    g.fillStyle = "#0d0d0d";
    for (let y = p - 5; y < H; y += p) g.fillRect(0, y, W, 5);
    for (let x = p - 5; x < W; x += p) g.fillRect(x, 0, 5, H);
  } else if (material === "wallpanel") {
    const slat = slatPx;
    const seam = Math.max(3, Math.round(slat * 0.07));
    if (dir === "v") {
      for (let x = 0; x < W; x += slat) {
        const grad = g.createLinearGradient(x, 0, x + slat, 0);
        grad.addColorStop(0, "#f0f0f0");
        grad.addColorStop(0.8, "#9c9c9c");
        grad.addColorStop(1, "#2a2a2a");
        g.fillStyle = grad; g.fillRect(x, 0, slat - seam, H);
        g.fillStyle = "#080808"; g.fillRect(x + slat - seam, 0, seam, H);
      }
    } else {
      for (let y = 0; y < H; y += slat) {
        const grad = g.createLinearGradient(0, y, 0, y + slat);
        grad.addColorStop(0, "#f0f0f0");
        grad.addColorStop(0.8, "#9c9c9c");
        grad.addColorStop(1, "#2a2a2a");
        g.fillStyle = grad; g.fillRect(0, y, W, slat - seam);
        g.fillStyle = "#080808"; g.fillRect(0, y + slat - seam, W, seam);
      }
    }
  } else if (material === "internit") {
    for (let i = 0; i < 30000; i++) {
      const v = 110 + rnd() * 80;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(rnd() * W, rnd() * H, 3, 3);
    }
    g.fillStyle = "#2a2a2a";
    for (let y = 256; y < H; y += 256) g.fillRect(0, y - 2, W, 3);
    for (let x = 256; x < W; x += 256) g.fillRect(x - 2, 0, 3, H);
  } else if (material === "madera") {
    const plank = 128;
    for (let x = 0; x < W; x += plank) {
      const base = 120 + rnd() * 50;
      g.fillStyle = `rgb(${base},${base},${base})`;
      g.fillRect(x, 0, plank - 3, H);
      g.lineWidth = 2;
      for (let i = 0; i < 24; i++) {
        const v = 60 + rnd() * 60;
        g.strokeStyle = `rgb(${v},${v},${v})`;
        const gx = x + rnd() * plank;
        g.beginPath(); g.moveTo(gx, 0);
        for (let y = 0; y < H; y += 40) g.lineTo(gx + Math.sin(y * 0.02 + x) * 4, y);
        g.stroke();
      }
      g.fillStyle = "#0a0a0a"; g.fillRect(x + plank - 3, 0, 3, H);
    }
  }
  return c;
}

const BUMP_SCALE = { acanalada: 0.06, acm: 0.02, wallpanel: 0.045, internit: 0.012, madera: 0.02, lisa: 0 };

function makeFacadeMaterial(material, hex, rough, metal, spanM, dir = "h", slatM = 0.22) {
  const tile = 2.2; // metros por baldosa de textura
  const reps = Math.max(1, (spanM * 6) / tile);
  // Ancho real de cada tabla de wall panel -> px dentro del canvas de
  // textura (1024px representan "tile" metros reales, siempre).
  const slatPx = Math.round(THREE.MathUtils.clamp((slatM / tile) * 1024, 24, 512));

  const tex = new THREE.CanvasTexture(facadeTexture(material, hex, dir, slatPx));
  tex.colorSpace = SRGB;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.repeat.set(reps, reps);

  const mat = new THREE.MeshStandardMaterial({
    map: tex, roughness: rough, metalness: metal, envMapIntensity: 0.8,
  });

  if (material !== "lisa") {
    const bump = new THREE.CanvasTexture(facadeBump(material, dir, slatPx));
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    bump.anisotropy = 8;
    bump.repeat.set(reps, reps);
    mat.bumpMap = bump;
    mat.bumpScale = BUMP_SCALE[material] ?? 0.02;
  }
  return mat;
}

function floorTexture(kind) {
  const W = 512, H = 512;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  if (kind === "mall") {
    // Porcelanato de formato grande (60cm+), pulido — mas claro y con
    // menos variacion que el piso de interior comun.
    g.fillStyle = "#d8d6d0"; g.fillRect(0, 0, W, H);
    const t = 171;
    for (let y = 0; y < H; y += t) for (let x = 0; x < W; x += t) {
      g.fillStyle = shade("#d8d6d0", (rnd() - 0.5) * 0.035);
      g.fillRect(x + 1, y + 1, t - 2, t - 2);
    }
  } else if (kind === "interior") {
    g.fillStyle = "#3c3f45"; g.fillRect(0, 0, W, H);
    const t = 128;
    for (let y = 0; y < H; y += t) for (let x = 0; x < W; x += t) {
      g.fillStyle = shade("#4a4e56", (rnd() - 0.5) * 0.12);
      g.fillRect(x + 2, y + 2, t - 4, t - 4);
    }
  } else {
    g.fillStyle = "#3a3b3d"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = shade("#3a3b3d", (rnd() - 0.5) * 0.22);
      g.fillRect(rnd() * W, rnd() * H, 3, 3);
    }
  }
  return c;
}

/* ================================================================
   MOCKUPS DE LOCAL
   Cinco tipos de fachada armados con geometria, no con fotos: asi se
   adaptan al tamano real del letrero y giran junto con el.
   ================================================================ */
function shutterTexture() {
  const W = 256, H = 512;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const rib = 16;
  for (let y = 0; y < H; y += rib) {
    const gr = g.createLinearGradient(0, y, 0, y + rib);
    gr.addColorStop(0, "#8e939a");
    gr.addColorStop(0.45, "#c3c8ce");
    gr.addColorStop(0.75, "#7c8188");
    gr.addColorStop(1, "#4e5257");
    g.fillStyle = gr; g.fillRect(0, y, W, rib);
  }
  return c;
}

function pavementTexture() {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S; c.height = S;
  const g = c.getContext("2d");
  g.fillStyle = "#4a4c50"; g.fillRect(0, 0, S, S);
  const t = 64;
  for (let y = 0; y < S; y += t) {
    for (let x = 0; x < S; x += t) {
      const off = (Math.floor(y / t) % 2) * (t / 2);
      const v = 68 + rnd() * 22;
      g.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      g.fillRect(x + off - t, y + 2, t - 4, t - 4);
    }
  }
  return c;
}

function texMat(canvas, repX, repY, opts = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = SRGB;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX, repY);
  t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, metalness: 0.15, ...opts });
}

/* Ajuste tipo "background-size: cover": la foto llena el plano de borde
   a borde sin deformarse, recortando el sobrante por los costados o
   arriba/abajo segun cual aspecto sea mas ancho. */
function fitCoverTexture(tex, imgAspect, planeAspect) {
  if (imgAspect > planeAspect) {
    const sc = planeAspect / imgAspect;
    tex.repeat.set(sc, 1); tex.offset.set((1 - sc) / 2, 0);
  } else {
    const sc = imgAspect / planeAspect;
    tex.repeat.set(1, sc); tex.offset.set(0, (1 - sc) / 2);
  }
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
}

/* Degradado radial blanco->transparente, reutilizable para el resplandor
   nocturno sobre la foto (se tine con el color del LED al usarlo). */
let _glowTex = null;
function glowTexture() {
  if (_glowTex) return _glowTex;
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S; c.height = S;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.4)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  _glowTex = c;
  return c;
}

function glassMat(night) {
  return new THREE.MeshStandardMaterial({
    color: night ? 0x0d1418 : 0x1d2b33,
    roughness: 0.12, metalness: 0.5, envMapIntensity: 1.5,
    transparent: true, opacity: 0.92,
  });
}
const frameMat = () => new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.45, metalness: 0.6 });
const concreteMat = () => new THREE.MeshStandardMaterial({ color: 0x55575c, roughness: 0.8 });

/* Linea oscura fina sobre cada arista dura del volumen — el efecto que
   mas cambia la percepcion de "juego" a "render arquitectonico" (tipo
   SketchUp). Una sola instancia de material compartida entre todas las
   cajas: mas barato que crear un LineBasicMaterial por volumen. */
const edgeLineMat = new THREE.LineBasicMaterial({ color: 0x141519, transparent: true, opacity: 0.5 });

function applyPolygonOffset(mat) {
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = 1;
  mat.polygonOffsetUnits = 1;
}

const addBox = (w, h, d, mat, x, y, z, group) => {
  const geo = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (Array.isArray(mat)) mat.forEach(applyPolygonOffset); else applyPolygonOffset(mat);
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeLineMat));
  group.add(m);
  return m;
};

const FACADE_STYLES = [
  { id: "calle", label: "Local a la calle" },
  { id: "vitrina", label: "Vitrina de vidrio" },
  { id: "esquina", label: "Local en esquina" },
  { id: "marquesina", label: "Con marquesina" },
  { id: "portal", label: "Portal con escalones" },
  { id: "mall", label: "Local en mall / strip center" },
];

/* Devuelve un grupo con el local completo. El centro del letrero queda
   en el origen, para que el encuadre y el giro no cambien. */
function buildStorefront(style, o) {
  const { signW, signH, standoff, wallMat, night, buildingFloors, facadeW, facadeH } = o;
  const g = new THREE.Group();
  const isMall = style === "mall";

  // Tope normal de 1.5 m (2.1 m en mall: la banda es mas protagonista
  // ahi), pero la banda crece si el letrero es mas alto. Local de mall:
  // cielo alto (4-4.5m) en vez de los 2.55m de un local a la calle.
  const bandH = Math.max(signH + 0.35, Math.min(signH * 1.75, isMall ? 2.1 : 1.5));
  // facadeW/facadeH: medidas reales de la fachada (metros), cuando el
  // usuario las fija a mano en vez de dejar que se deriven del letrero.
  // Sin override, comportamiento identico al de siempre.
  const shopH = facadeH != null ? Math.max(1.6, facadeH) : (isMall ? 4.2 : 2.55);
  const facW = facadeW != null ? Math.max(1, facadeW) : Math.max(signW * 1.7, 3.8);
  const upperH = isMall ? 0.5 : 1.9; // mall: solo un remate bajo, sin pano de ventanas
  const zWall = -standoff - 0.07;
  const yBandBot = -bandH / 2;
  const yGround = yBandBot - shopH;
  // Solo "esquina" la usa: baja el suelo real varios pisos, para que el
  // local + banda del letrero queden montados en altura (letrero de
  // parapeto en una esquina de edificio, no un local a nivel de calle).
  // Se calcula aca arriba (no solo dentro de la rama "esquina") porque
  // la vereda/cordon de mas abajo tienen que nacer del suelo real, no
  // del nivel del local.
  const floors = style === "esquina" ? Math.max(0, Math.round(buildingFloors || 0)) : 0;
  const floorH = 3.0;
  let yGroundOut = floors > 0 ? yGround - floors * floorH : yGround;

  const shutter = texMat(shutterTexture(), 1, Math.max(2, shopH * 1.6), { roughness: 0.42, metalness: 0.65 });
  const pave = texMat(pavementTexture(), 8, 8, { roughness: 0.82, metalness: 0 });
  const glass = glassMat(night);
  const frame = frameMat();
  const conc = concreteMat();

  /* Banda del letrero: es la que toma el material y color elegidos.
     Siempre plana y al ras del muro (ninguna fachada queda hueca). */
  addBox(facW, bandH, 0.14, wallMat, 0, 0, zWall - 0.07, g);

  if (!isMall) {
    /* Vereda — un local de mall no tiene calle ni vereda afuera. Nace del
       suelo real (yGroundOut): en un edificio en altura, muchos pisos
       mas abajo que la banda del letrero. */
    const pav = new THREE.Mesh(new THREE.PlaneGeometry(facW * 4, 14), pave);
    pav.rotation.x = -Math.PI / 2;
    pav.position.set(0, yGroundOut, zWall + 7);
    pav.receiveShadow = true;
    g.add(pav);
    addBox(facW * 4, 0.14, 0.3, conc, 0, yGroundOut + 0.07, zWall + 5.6, g); // cordon
  }

  /* Pano superior — con ventanas en un local a la calle; en mall es solo
     un remate solido bajo (arriba sigue el cielo alto del pasillo, sin
     ventanas punzadas tipo residencial). */
  addBox(facW, upperH, 0.12, conc, 0, bandH / 2 + upperH / 2, zWall - 0.06, g);
  if (!isMall) {
    const wW = facW * 0.2, wH = upperH * 0.55;
    for (const dx of [-facW * 0.28, facW * 0.28]) {
      addBox(wW + 0.06, wH + 0.06, 0.05, frame, dx, bandH / 2 + upperH * 0.55, zWall + 0.02, g);
      addBox(wW, wH, 0.03, glass, dx, bandH / 2 + upperH * 0.55, zWall + 0.05, g);
    }
  }

  const shopY = yBandBot - shopH / 2;

  if (style === "calle") {
    // Cortina metalica y acceso lateral, como el local de referencia
    const curtW = facW * 0.56, doorW = facW * 0.26;
    addBox(curtW, shopH, 0.07, shutter, -facW / 2 + curtW / 2 + 0.12, shopY, zWall, g);
    addBox(curtW + 0.1, 0.12, 0.16, frame, -facW / 2 + curtW / 2 + 0.12, yBandBot - 0.06, zWall + 0.04, g);
    addBox(doorW + 0.1, shopH * 0.94 + 0.1, 0.06, frame, facW / 2 - doorW / 2 - 0.25, shopY - shopH * 0.03, zWall + 0.02, g);
    addBox(doorW, shopH * 0.94, 0.04, glass, facW / 2 - doorW / 2 - 0.25, shopY - shopH * 0.03, zWall + 0.05, g);
    addBox(facW * 0.14, shopH, 0.14, conc, facW / 2 - 0.07, shopY, zWall, g);
  } else if (style === "vitrina") {
    // Vidriera completa con montantes
    const glassW = facW - 0.5;
    addBox(glassW, shopH * 0.92, 0.04, glass, 0, shopY, zWall + 0.03, g);
    for (let i = -2; i <= 2; i++) {
      addBox(0.07, shopH * 0.92, 0.09, frame, (glassW / 5) * i, shopY, zWall + 0.05, g);
    }
    addBox(glassW + 0.12, 0.09, 0.12, frame, 0, shopY + shopH * 0.46, zWall + 0.05, g);
    addBox(glassW + 0.12, 0.14, 0.14, frame, 0, shopY - shopH * 0.46, zWall + 0.05, g);
    addBox(0.9, shopH * 0.92, 0.05, frame, glassW * 0.3, shopY, zWall + 0.07, g);
  } else if (style === "esquina") {
    // Segundo pano en angulo recto
    const side = new THREE.Group();
    addBox(facW * 0.8, bandH, 0.14, wallMat, 0, 0, 0, side);
    addBox(facW * 0.8, upperH, 0.12, conc, 0, bandH / 2 + upperH / 2, -0.02, side);
    addBox(facW * 0.8 - 0.4, shopH * 0.9, 0.04, glass, 0, shopY, 0.04, side);
    addBox(facW * 0.8, 0.12, 0.16, frame, 0, yBandBot - 0.06, 0.05, side);
    side.rotation.y = -Math.PI / 2;
    side.position.set(facW / 2, 0, zWall + facW * 0.4);
    g.add(side);
    addBox(facW - 0.6, shopH * 0.9, 0.04, glass, -0.2, shopY, zWall + 0.04, g);
    addBox(facW, 0.12, 0.16, frame, 0, yBandBot - 0.06, zWall + 0.06, g);

    // Edificio en altura (opcional): pisos extra bajo el local, hasta el
    // suelo real (yGroundOut, ya calculado arriba), para que el letrero
    // quede como en una esquina de varios pisos (parapeto), con el mismo
    // entorno de calle de siempre reubicado abajo del todo.
    const postTop = bandH / 2 + upperH;
    let postBot = yGround;
    if (floors > 0) {
      const extraH = floors * floorH;
      postBot = yGroundOut;

      const bodyMat = new THREE.MeshStandardMaterial({ color: night ? 0x191c24 : 0x9198a2, roughness: 0.88 });
      const litMat = new THREE.MeshStandardMaterial({
        color: 0x3a3222, emissive: new THREE.Color(0xffcf87), emissiveIntensity: night ? 0.75 : 0, roughness: 0.4,
      });
      const darkWin = new THREE.MeshStandardMaterial({ color: night ? 0x1a1f2a : 0x2f3946, roughness: 0.5, metalness: 0.2 });
      addBox(facW + 0.1, extraH, 0.3, bodyMat, 0, (yGround + yGroundOut) / 2, zWall - 0.15, g);
      addBox(facW * 0.8 + 0.1, extraH, 0.3, bodyMat, 0, (yGround + yGroundOut) / 2, -0.15, side);

      const winGrid = (w, zFront, target) => {
        const cols = Math.max(3, Math.round(w / 1.1));
        for (let f = 0; f < floors; f++) {
          const fy = yGround - floorH * (f + 0.5);
          for (let cc = 0; cc < cols; cc++) {
            const on = night && rnd() > 0.5;
            const wx = -w / 2 + (w / cols) * (cc + 0.5);
            const win = new THREE.Mesh(new THREE.PlaneGeometry((w / cols) * 0.62, floorH * 0.58), on ? litMat : darkWin);
            win.position.set(wx, fy, zFront);
            target.add(win);
          }
        }
      };
      winGrid(facW, zWall + 0.02, g);
      winGrid(facW * 0.8, 0.04, side);
    }
    addBox(0.35, postTop - postBot, 0.35, conc, facW / 2, (postTop + postBot) / 2, zWall + 0.1, g);
  } else if (style === "marquesina") {
    // Toldo solido que sobresale sobre una fachada plana y cerrada —
    // antes era un marco hueco (se veia el vacio por los costados).
    const proj = 0.85, awningH = 0.12;
    const awningY = bandH / 2 + 0.16;
    addBox(facW, awningH, proj, conc, 0, awningY, zWall + proj / 2, g);
    for (const dx of [-facW / 2 + 0.35, facW / 2 - 0.35]) {
      addBox(0.05, 0.05, proj * 0.92, frame, dx, awningY - awningH / 2 - 0.07, zWall + proj * 0.46, g);
    }
    addBox(facW - 0.7, shopH * 0.9, 0.04, glass, 0, shopY, zWall + 0.03, g);
    for (let i = -1; i <= 1; i++) addBox(0.07, shopH * 0.9, 0.09, frame, (facW / 3.2) * i, shopY, zWall + 0.06, g);
  } else if (style === "portal") {
    // Acceso elevado con peldanos y baranda
    const steps = 4, stepH = 0.16, stepD = 0.34;
    const doorW = facW * 0.3;
    const platY = yGround + steps * stepH;
    for (let i = 0; i < steps; i++) {
      addBox(facW * 0.55, stepH, stepD * (steps - i), conc,
        0, yGround + stepH * (i + 0.5), zWall + 0.2 + (stepD * (steps - i)) / 2, g);
    }
    addBox(facW, platY - yGround, 0.5, conc, 0, (platY + yGround) / 2, zWall + 0.1, g);
    addBox(doorW + 0.12, shopH * 0.8, 0.06, frame, 0, platY + (shopH * 0.8) / 2, zWall + 0.02, g);
    addBox(doorW, shopH * 0.8, 0.04, glass, 0, platY + (shopH * 0.8) / 2, zWall + 0.05, g);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x6f757c, roughness: 0.3, metalness: 0.85 });
    for (const sx of [-1, 1]) {
      addBox(0.05, 0.95, 0.05, railMat, sx * facW * 0.3, platY + 0.47, zWall + 0.55, g);
      addBox(0.05, 0.05, 1.5, railMat, sx * facW * 0.3, platY + 0.92, zWall + 1.0, g);
    }
    for (const sx of [-1, 1]) {
      addBox(facW * 0.2, shopH * 0.5, 0.05, glass, sx * facW * 0.35, platY + shopH * 0.4, zWall + 0.03, g);
    }
  } else if (style === "mall") {
    // Vidriera completa de piso a techo, sin cortina metalica — un local
    // de mall no la tiene. Montantes verticales cada ~90cm.
    const glassW = facW - 0.3;
    addBox(glassW, shopH * 0.97, 0.05, glass, 0, shopY, zWall + 0.03, g);
    const mullions = Math.max(2, Math.round(glassW / 0.9));
    for (let i = 0; i <= mullions; i++) {
      const mx = -glassW / 2 + (glassW / mullions) * i;
      addBox(0.06, shopH * 0.97, 0.09, frame, mx, shopY, zWall + 0.06, g);
    }
    addBox(glassW + 0.1, 0.08, 0.12, frame, 0, shopY - shopH / 2, zWall + 0.05, g); // umbral
    addBox(glassW + 0.1, 0.08, 0.12, frame, 0, shopY + shopH / 2, zWall + 0.05, g); // dintel
  }
  return { group: g, facW, bandH, shopH, upperH, yGround: yGroundOut, zWall, isMall };
}

/* ================================================================
   ENTORNO DE CALLE
   Cielo con montañas y ciudad al fondo, edificios vecinos a los lados
   y calzada al frente, para que el local se lea como parte de una
   calle real y no como una pieza flotando en el vacío.
   ================================================================ */
function skyTexture(night) {
  const W = 2048, H = 1024;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const horizon = H * 0.72;

  const sky = g.createLinearGradient(0, 0, 0, horizon);
  if (night) {
    sky.addColorStop(0, "#070b1e");
    sky.addColorStop(0.55, "#101838");
    sky.addColorStop(1, "#243056");
  } else {
    sky.addColorStop(0, "#7fb4e6");
    sky.addColorStop(0.55, "#a9cdec");
    sky.addColorStop(1, "#e4eef6");
  }
  g.fillStyle = sky; g.fillRect(0, 0, W, horizon);
  // suelo lejano bajo el horizonte
  g.fillStyle = night ? "#171b26" : "#c7ccd2";
  g.fillRect(0, horizon, W, H - horizon);

  if (night) {
    g.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 160; i++) g.fillRect(rnd() * W, rnd() * horizon * 0.7, 1.6, 1.6);
    g.beginPath(); g.arc(W * 0.82, H * 0.16, 42, 0, Math.PI * 2);
    g.fillStyle = "rgba(240,238,214,0.92)"; g.fill();
  } else {
    // nubes suaves
    g.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 5; i++) {
      const cxp = rnd() * W, cyp = rnd() * horizon * 0.5;
      for (let k = 0; k < 6; k++) {
        g.beginPath();
        g.ellipse(cxp + k * 34 - 90, cyp, 60 - Math.abs(k - 3) * 8, 22, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  // cordillera en dos capas
  const range = (baseY, amp, color) => {
    g.fillStyle = color;
    g.beginPath(); g.moveTo(0, baseY);
    for (let x = 0; x <= W; x += 32) {
      const y = baseY - Math.abs(Math.sin(x * 0.0032 + baseY * 0.5)) * amp
        - Math.abs(Math.sin(x * 0.011 + 2)) * amp * 0.35;
      g.lineTo(x, y);
    }
    g.lineTo(W, horizon); g.lineTo(0, horizon); g.closePath(); g.fill();
  };
  range(horizon - 30, 190, night ? "#141d3c" : "#9aafc6");
  range(horizon - 6, 120, night ? "#0e152e" : "#8298b2");

  // ciudad a lo lejos, contra el horizonte
  let x = 0;
  while (x < W) {
    const bw = 26 + rnd() * 66;
    const bh = 46 + rnd() * 150;
    const by = horizon - bh;
    g.fillStyle = night ? "#0c1226" : "#7c8ba0";
    g.fillRect(x, by, bw - 3, bh);
    if (night) {
      for (let wy = by + 7; wy < horizon - 5; wy += 11)
        for (let wx = x + 4; wx < x + bw - 7; wx += 9)
          if (rnd() > 0.5) { g.fillStyle = "rgba(255,208,128,0.85)"; g.fillRect(wx, wy, 4, 5); }
    }
    x += bw;
  }

  // neblina sobre el horizonte
  const haze = g.createLinearGradient(0, horizon - 60, 0, horizon + 10);
  haze.addColorStop(0, night ? "rgba(20,26,50,0)" : "rgba(232,238,244,0)");
  haze.addColorStop(1, night ? "rgba(20,26,50,0.85)" : "rgba(232,238,244,0.9)");
  g.fillStyle = haze; g.fillRect(0, horizon - 60, W, 70);
  return c;
}

function buildStreetEnv(envGroup, m, opts) {
  const { night, standoff } = opts;
  const { facW, yGround, zWall } = m;
  const span = Math.max(facW, 4);

  // Telón de fondo: cielo + montañas + ciudad, bien atrás
  const tex = new THREE.CanvasTexture(skyTexture(night));
  tex.colorSpace = SRGB;
  const bw = span * 9, bh = span * 5;
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(bw, bh),
    new THREE.MeshBasicMaterial({ map: tex, depthWrite: false, fog: false })
  );
  back.position.set(0, yGround + bh * 0.34, zWall - span * 3.2);
  envGroup.add(back);

  // Calzada frente a la vereda
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(bw, span * 6),
    new THREE.MeshStandardMaterial({ color: night ? 0x111318 : 0x33353b, roughness: 0.82 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, yGround - 0.01, zWall + span * 3.4);
  road.receiveShadow = true;
  envGroup.add(road);
  // línea central de la calzada
  const linMat = new THREE.MeshStandardMaterial({
    color: 0xd9c760, roughness: 0.7,
    emissive: night ? new THREE.Color(0x3a3410) : new THREE.Color(0x000000), emissiveIntensity: night ? 0.4 : 0,
  });
  for (let i = 0; i < 6; i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, span * 0.5), linMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, yGround + 0.005, zWall + span * 1.6 + i * span * 0.75);
    envGroup.add(dash);
  }

  // Edificios vecinos a ambos lados
  const litMat = new THREE.MeshStandardMaterial({
    color: 0x3a3222, emissive: new THREE.Color(0xffcf87), emissiveIntensity: night ? 0.75 : 0, roughness: 0.4,
  });
  const darkWin = new THREE.MeshStandardMaterial({ color: night ? 0x1a1f2a : 0x2f3946, roughness: 0.5, metalness: 0.2 });
  for (const side of [-1, 1]) {
    const w = facW * (0.75 + rnd() * 0.25);
    const h = m.shopH + m.bandH + m.upperH + 1.4 + rnd() * 2.2;
    const depth = 1.4;
    const cx = side * (facW / 2 + w / 2 + 0.12);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth),
      new THREE.MeshStandardMaterial({ color: night ? 0x191c24 : 0x9198a2, roughness: 0.88 }));
    body.position.set(cx, yGround + h / 2, zWall - depth / 2 + 0.02);
    body.castShadow = true; body.receiveShadow = true;
    envGroup.add(body);
    const cols = Math.max(2, Math.round(w / 0.95));
    const rows = Math.max(3, Math.round(h / 1.15));
    const gx = w / (cols + 1), gy = h / (rows + 1);
    for (let r = 1; r <= rows; r++) for (let cc = 1; cc <= cols; cc++) {
      const on = night && rnd() > 0.55;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(gx * 0.58, gy * 0.62), on ? litMat : darkWin);
      win.position.set(cx - w / 2 + gx * cc, yGround + gy * r, zWall + 0.03);
      envGroup.add(win);
    }
  }

  // De noche: postes de alumbrado publico VISIBLES (poste + brazo +
  // cabezal encendido, no solo una luz flotando sin geometria) + brillo
  // interior de la vitrina, para que el local se entienda de noche.
  if (night) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.5, metalness: 0.6 });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff1cf, emissive: new THREE.Color(0xffcf7a), emissiveIntensity: 2.6, roughness: 0.4,
    });
    const poleH = 4.2, armLen = 0.55;
    const streetZ = zWall + 5.0; // sobre la vereda, justo antes del cordon
    for (const side of [-1, 1]) {
      const px = side * (facW / 2 + 0.75);
      const bulbX = px - side * armLen;
      const bulbY = yGround + poleH - 0.14;

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, poleH, 10), poleMat);
      pole.position.set(px, yGround + poleH / 2, streetZ);
      pole.castShadow = true;
      envGroup.add(pole);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.08, 10), poleMat);
      base.position.set(px, yGround + 0.04, streetZ);
      envGroup.add(base);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.05, 0.05), poleMat);
      arm.position.set((px + bulbX) / 2, yGround + poleH - 0.05, streetZ);
      envGroup.add(arm);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), bulbMat);
      bulb.position.set(bulbX, bulbY, streetZ);
      envGroup.add(bulb);

      const farol = new THREE.PointLight(0xffdba0, 3.2, span * 10, 1.9);
      farol.position.set(bulbX, bulbY, streetZ);
      envGroup.add(farol);
    }

    const vitrina = new THREE.Mesh(
      new THREE.PlaneGeometry(facW * 0.92, m.shopH * 0.9),
      new THREE.MeshBasicMaterial({ color: 0xffe6b8, transparent: true, opacity: 0.5 })
    );
    vitrina.position.set(0, m.yGround - m.bandH / 2 - m.shopH / 2, zWall - 0.03);
    envGroup.add(vitrina);
  }
}

/* ================================================================
   ENTORNO DE MALL
   Sin cielo ni vereda: el contexto es un pasillo interior, asi que el
   "fondo" es simplemente el mismo piso pulido continuando hacia los
   costados y hacia la camara — sin modelar locales vecinos ni calle.
   ================================================================ */
function buildMallEnv(envGroup, m) {
  const { facW, yGround, zWall, shopH } = m;
  const span = Math.max(facW, 4);

  const ftex = new THREE.CanvasTexture(floorTexture("mall"));
  ftex.colorSpace = SRGB;
  ftex.wrapS = ftex.wrapT = THREE.RepeatWrapping;
  ftex.repeat.set(span * 2.2, span * 2.2);
  const floorMat = new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.18, metalness: 0.06, envMapIntensity: 1.1 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(span * 16, span * 9), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, yGround, zWall + span * 3.2);
  floor.receiveShadow = true;
  envGroup.add(floor);

  // Cielorraso bajo y parejo, con la luz cenital difusa del pasillo
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xe9e9ec, roughness: 0.9 });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(span * 16, span * 9), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, yGround + shopH + 3.4, zWall + span * 3.2);
  envGroup.add(ceiling);

  // Franjas de luminarias empotradas, referencia visual del pasillo
  const lumMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: new THREE.Color(0xf3f6ff), emissiveIntensity: 1.4, roughness: 0.6,
  });
  for (let i = -2; i <= 2; i++) {
    const lum = new THREE.Mesh(new THREE.PlaneGeometry(span * 0.9, 0.14), lumMat);
    lum.rotation.x = Math.PI / 2;
    lum.position.set(i * span * 1.5, yGround + shopH + 3.38, zWall + span * 1.2);
    envGroup.add(lum);
  }
}

function frameObject(camera, object, fill = 0.82) {
  const bb = new THREE.Box3().setFromObject(object);
  if (bb.isEmpty()) return null;
  const size = bb.getSize(new THREE.Vector3());
  const center = bb.getCenter(new THREE.Vector3());
  const fov = (camera.fov * Math.PI) / 180;
  const dH = size.y / (2 * Math.tan(fov / 2) * fill);
  const dW = size.x / (2 * Math.tan(fov / 2) * camera.aspect * fill);
  const dist = Math.max(dH, dW, 0.5) + size.z * 1.5;
  camera.near = Math.max(0.005, dist / 400);
  camera.far = dist * 40;
  return { center, dist };
}

/* Coloca la camara aplicando el factor de zoom sobre la distancia base. */
function applyZoom(camera, center, baseDist, zoom) {
  if (!center) return;
  const d = baseDist / zoom;
  camera.position.set(center.x, center.y, center.z + d);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

/* ================================================================
   MODULO DE TEXTO
   Convierte un nombre escrito en letras corporeas, reutilizando el
   mismo pipeline del logo: solo produce un canvas negro-sobre-blanco
   y lo entrega a loadCanvas().
   ================================================================ */

// Fraccion del alto de la letra que ocupa el trazo, por paso de grosor.
const STROKE_PCT = { 1: 0.04, 2: 0.07, 3: 0.11, 4: 0.16, 5: 0.22 };
const GROSOR_LABEL = { 1: "Muy fina", 2: "Fina", 3: "Media", 4: "Gruesa", 5: "Muy gruesa" };

// El cliente elige grosor (5 pasos) y estilo (3). Por dentro, cada
// combinacion resuelve una familia open-license y un peso concreto.
// Manuscrita no tiene pesos muy gruesos: el paso 5 cae al mas cercano.
const FONT_MATRIX = {
  sans:   { family: "Barlow",         weights: { 1: 100, 2: 300, 3: 500, 4: 700, 5: 900 } },
  serif:  { family: "Roboto Serif",   weights: { 1: 100, 2: 300, 3: 500, 4: 700, 5: 900 } },
  script: { family: "Dancing Script", weights: { 1: 400, 2: 500, 3: 600, 4: 700 } },
};
const ESTILOS = [
  { id: "sans", label: "Sin serifa" },
  { id: "serif", label: "Con serifa" },
  { id: "script", label: "Manuscrita" },
];

function resolverFuente(step, style, custom) {
  if (custom && custom.family) {
    return { family: custom.family, weight: 400, usedStep: custom.step, fell: false, custom: true };
  }
  const fam = FONT_MATRIX[style] || FONT_MATRIX.sans;
  if (fam.weights[step]) return { family: fam.family, weight: fam.weights[step], usedStep: step, fell: false };
  const avail = Object.keys(fam.weights).map(Number);
  let best = avail[0];
  for (const sp of avail) if (Math.abs(sp - step) < Math.abs(best - step)) best = sp;
  return { family: fam.family, weight: fam.weights[best], usedStep: best, fell: true };
}

// Carga diferida de las fuentes web: solo se piden al abrir la
// herramienta Texto, no en el arranque del sistema.
const FONT_LINK_ID = "birth-fuentes-texto";
let fuentesBasePromise = null;
function cargarFuentesBase() {
  if (fuentesBasePromise) return fuentesBasePromise;
  fuentesBasePromise = new Promise((resolve) => {
    const listo = () => {
      const probes = [
        '100 40px "Barlow"', '900 40px "Barlow"',
        '100 40px "Roboto Serif"', '900 40px "Roboto Serif"',
        '400 40px "Dancing Script"', '700 40px "Dancing Script"',
      ];
      Promise.all(probes.map((p) => document.fonts.load(p).catch(() => null)))
        .then(() => resolve()).catch(() => resolve());
    };
    if (document.getElementById(FONT_LINK_ID)) { listo(); return; }
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Barlow:wght@100;300;500;700;900&family=Roboto+Serif:wght@100;300;500;700;900&family=Dancing+Script:wght@400;500;600;700&display=swap";
    link.onload = listo;
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
  return fuentesBasePromise;
}

// Dibuja el texto en negro sobre blanco, a >=1400px de lado largo para
// que el trazado no coma detalle en las serifas finas.
function dibujarTextoCanvas(o) {
  const { lineas, family, weight, align, lineHeight, letterSpacing, upper } = o;
  const txt = lineas.map((l) => (upper ? l.toUpperCase() : l)).filter((l) => l.length);
  if (!txt.length) return null;

  const CAP = 400;
  const fuente = `${weight} ${CAP}px "${family}", sans-serif`;
  const espaciado = `${letterSpacing}em`;

  const meas = document.createElement("canvas").getContext("2d");
  meas.font = fuente;
  try { meas.letterSpacing = espaciado; } catch { /* navegador sin soporte */ }
  let maxW = 1;
  for (const l of txt) maxW = Math.max(maxW, meas.measureText(l).width);

  const lineH = CAP * lineHeight;
  const padX = CAP * 0.18, padY = CAP * 0.16;
  let cw = Math.ceil(maxW + padX * 2);
  let ch = Math.ceil(lineH * txt.length + padY * 2);
  const largo = Math.max(cw, ch);
  const escala = largo < 1400 ? 1400 / largo : 1;
  cw = Math.round(cw * escala); ch = Math.round(ch * escala);

  const c = document.createElement("canvas");
  c.width = cw; c.height = ch;
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, cw, ch);
  g.fillStyle = "#000000";
  g.textBaseline = "alphabetic";
  g.textAlign = align;
  g.font = `${weight} ${Math.round(CAP * escala)}px "${family}", sans-serif`;
  try { g.letterSpacing = espaciado; } catch { /* sin soporte */ }

  const sLineH = lineH * escala;
  const ascent = Math.round(CAP * escala) * 0.8;
  const x = align === "left" ? padX * escala : align === "right" ? cw - padX * escala : cw / 2;
  for (let i = 0; i < txt.length; i++) {
    g.fillText(txt[i], x, padY * escala + sLineH * i + ascent);
  }
  return c;
}

// Mide el grosor real de una fuente (trazo / alto de letra) para ubicar
// una fuente propia en la escala de cinco pasos.
function medirTrazo(family, weight) {
  const SZ = 300;
  const c = document.createElement("canvas");
  c.width = SZ; c.height = SZ;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.fillStyle = "#fff"; g.fillRect(0, 0, SZ, SZ);
  g.fillStyle = "#000"; g.textBaseline = "alphabetic"; g.textAlign = "left";
  g.font = `${weight} ${Math.round(SZ * 0.7)}px "${family}"`;
  g.fillText("l", SZ * 0.4, SZ * 0.82);
  const d = g.getImageData(0, 0, SZ, SZ).data;

  let minY = SZ, maxY = -1;
  for (let y = 0; y < SZ; y++) {
    for (let x = 0; x < SZ; x++) {
      if (d[(y * SZ + x) * 4] < 128) { if (y < minY) minY = y; if (y > maxY) maxY = y; break; }
    }
  }
  const capH = Math.max(1, maxY - minY);
  const midY = Math.round((minY + maxY) / 2);
  let run = 0, best = 0;
  for (let x = 0; x < SZ; x++) {
    if (d[(midY * SZ + x) * 4] < 128) { run++; if (run > best) best = run; } else run = 0;
  }
  const frac = best / capH;
  let step = 3, dmin = Infinity;
  for (const sp of [1, 2, 3, 4, 5]) {
    const dd = Math.abs(STROKE_PCT[sp] - frac);
    if (dd < dmin) { dmin = dd; step = sp; }
  }
  return { frac, step };
}

// Color de la cara (acrilico), independiente del canto.
const FACE_COLORS = [
  { hex: "#F1F2F4", name: "Blanco opal" },
  { hex: "#202024", name: "Negro" },
  { hex: "#C0392B", name: "Rojo Birth" },
  { hex: "#2F6FED", name: "Azul" },
  { hex: "#C9A24B", name: "Dorado" },
];

/* ================================================================
   MARCA E ICONOS DE INTERFAZ
   ================================================================ */
const RED = "#C0392B";
const BLACK = "#0B0B0D";
const PANEL = "#131316";
const LINE = "#242429";
const TXT = "#EDEDF0";
const DIM = "#8A8A93";

/* Iconos de trazo simple, un solo color, legibles a 20px. */
function Icon({ name, size = 16 }) {
  const p = {
    fill: "none", stroke: "currentColor", strokeWidth: 1.7,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  const paths = {
    upload: <><path {...p} d="M12 16V4" /><path {...p} d="m7 9 5-5 5 5" /><path {...p} d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></>,
    product: <><path {...p} d="M4 7V5h16v2" /><path {...p} d="M12 5v14" /><path {...p} d="M9 19h6" /></>,
    text: <><path {...p} d="M3 18 8 6l5 12" /><path {...p} d="M4.7 14h6.6" /><path {...p} d="M20 9.5V18" /><circle {...p} cx="17.5" cy="15" r="2.5" /></>,
    size: <><rect {...p} x="3" y="7" width="18" height="10" rx="1" /><path {...p} d="M7 10v4M11 10v4M15 10v4" /></>,
    wall: <><rect {...p} x="3" y="4" width="18" height="16" rx="1" /><path {...p} d="M3 10h18M3 15h18M9 4v6M15 10v5M9 15v5" /></>,
    light: <><path {...p} d="M9 18h6" /><path {...p} d="M10 21h4" /><path {...p} d="M12 3a6 6 0 0 0-3 11v1h6v-1a6 6 0 0 0-3-11z" /></>,
    depth: <><path {...p} d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z" /><path {...p} d="M4 8.5 12 13l8-4.5M12 13v7" /></>,
    tune: <><path {...p} d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle {...p} cx="16" cy="6" r="2" /><circle {...p} cx="10" cy="12" r="2" /><circle {...p} cx="18" cy="18" r="2" /></>,
    download: <><path {...p} d="M12 4v12" /><path {...p} d="m7 11 5 5 5-5" /><path {...p} d="M4 20h16" /></>,
    send: <><path {...p} d="M4 12h13" /><path {...p} d="m11 6 6 6-6 6" /><path {...p} d="M20 4v16" /></>,
    sun: <><circle {...p} cx="12" cy="12" r="4" /><path {...p} d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></>,
    moon: <><path {...p} d="M20 14.5A8 8 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" /></>,
    plus: <><path {...p} d="M12 6v12M6 12h12" /></>,
    minus: <><path {...p} d="M6 12h12" /></>,
    reset: <><path {...p} d="M4 9a8 8 0 1 1 .5 5" /><path {...p} d="M4 4v5h5" /></>,
    lock: <><rect {...p} x="5" y="11" width="14" height="9" rx="1.5" /><path {...p} d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    unlock: <><rect {...p} x="5" y="11" width="14" height="9" rx="1.5" /><path {...p} d="M8 11V7a4 4 0 0 1 7.5-2.5" /></>,
    spin: <><path {...p} d="M4 12a8 8 0 1 0 3-6.2" /><path {...p} d="M3 4v4h4" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      {paths[name]}
    </svg>
  );
}

/* ================================================================
   DATOS DE INTERFAZ
   ================================================================ */
const PRODUCTS = [
  { id: "letters", label: "Letras corporeas", desc: "Cada letra se corta aparte" },
  { id: "lightbox", label: "Caja de luz", desc: "Una placa con el arte impreso" },
];
const FORMS = [{ id: "rect", label: "Rectangular" }, { id: "circle", label: "Circular" }];
const MODES = [
  { id: "front", label: "Al frente", desc: "La cara se enciende" },
  { id: "back", label: "Retroiluminado", desc: "Halo sobre el muro" },
  { id: "both", label: "Las dos", desc: "Cara y halo" },
];
const SCENES = [
  { id: "fachada", label: "Fachada externa", a: 3, b: 1 },
  { id: "totem", label: "Totem", a: 0.9, b: 2.4 },
  { id: "interior", label: "Interior de pared", a: 0.8, b: 0.4 },
  { id: "foto", label: "Foto de la fachada" }, // sin a/b: la medida real la da la calibracion, no un preset
];

/* Color y acabado del canto (el borde de la pieza) */
const EDGE_COLORS = [
  { hex: "#202024", name: "Negro" },
  { hex: "#9AA0A8", name: "Aluminio" },
  { hex: "#E8E8EA", name: "Blanco" },
  { hex: "#B08D57", name: "Dorado" },
  { hex: "#C0392B", name: "Rojo" },
];
const LED_COLORS = [
  { hex: "#ff3b2f", name: "Rojo" }, { hex: "#3b9dff", name: "Azul" }, { hex: "#4ade80", name: "Verde" },
];
// Temperatura de LED blanco (Kelvin -> RGB, aproximacion de cuerpo negro
// de Tanner Helland — no son colores inventados a ojo). Separado de
// LED_COLORS: la temperatura es solo para blanco, el color es para LED
// de color.
const LIGHT_TEMPS = [
  { k: 6500, label: "Fría", desc: "Comercial, farmacias, tecnología" },
  { k: 4000, label: "Neutra", desc: "Oficinas, clínicas, uso general" },
  { k: 3000, label: "Cálida", desc: "Gastronomía, boutiques, hotelería" },
];
function kelvinToHex(kelvin) {
  const t = kelvin / 100;
  let r, g, b;
  if (t <= 66) r = 255;
  else r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
  if (t <= 66) g = 99.4708025861 * Math.log(t) - 161.1195681661;
  else g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  if (t >= 66) b = 255;
  else if (t <= 19) b = 0;
  else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
}
const TOOLS = [
  { id: "producto", icon: "product", label: "Producto" },
  { id: "texto", icon: "text", label: "Texto" },
  { id: "medidas", icon: "size", label: "Medidas" },
  { id: "fachada", icon: "wall", label: "Fachada" },
  { id: "luz", icon: "light", label: "Luz" },
  { id: "volumen", icon: "depth", label: "Volumen" },
  { id: "ajustes", icon: "tune", label: "Ajustes" },
];

export default function Prototipo() {
  const mountRef = useRef(null);
  const S = useRef({});

  const [tool, setTool] = useState("producto");
  const [fileName, setFileName] = useState(null);
  const [product, setProduct] = useState("letters");
  const [form, setForm] = useState("rect");
  const [suggested, setSuggested] = useState(null);
  const [scene, setScene] = useState("fachada");
  const [facadeStyle, setFacadeStyle] = useState("calle");
  const [buildingFloors, setBuildingFloors] = useState(0); // pisos extra bajo el local, solo estilo "esquina"
  const [facadeAuto, setFacadeAuto] = useState(true); // false = medidas de fachada manuales, no derivadas del letrero
  const [facadeWidthM, setFacadeWidthM] = useState(6);
  const [facadeHeightM, setFacadeHeightM] = useState(2.55);
  const [showFacade, setShowFacade] = useState(true);
  const [material, setMaterial] = useState("acanalada");
  const [wallPanelDir, setWallPanelDir] = useState("h");
  const [wallPanelSize, setWallPanelSize] = useState(22); // ancho real de cada tabla, en cm
  const [finish, setFinish] = useState("negro");
  const [wallColor, setWallColor] = useState("#191a1d");
  const [mode, setMode] = useState("front");
  const [night, setNight] = useState(true);
  const [ledColor, setLedColor] = useState("#ffffff");
  const [useArt, setUseArt] = useState(true);
  const [faceColor, setFaceColor] = useState("#F1F2F4");
  const [edgeColor, setEdgeColor] = useState("#202024");
  const [edgeMetal, setEdgeMetal] = useState(false);
  // origen del arte actual: logo subido o texto escrito
  const [sourceType, setSourceType] = useState(null);
  const [genSeq, setGenSeq] = useState(0);
  // modulo de texto
  const [texto, setTexto] = useState("");
  const [textAlign, setTextAlign] = useState("center");
  const [lineHeightTx, setLineHeightTx] = useState(1.1);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [upper, setUpper] = useState(true);
  const [weightStep, setWeightStep] = useState(4);
  const [fontStyle, setFontStyle] = useState("sans");
  const [customFont, setCustomFont] = useState(null); // { family, step }
  const [fontMsg, setFontMsg] = useState(null);
  const [textAspect, setTextAspect] = useState(null); // pxW/pxH del ultimo canvas de texto dibujado
  const [whLocked, setWhLocked] = useState(true); // candado ancho/alto en Texto: cerrado = sin deformar
  const [unit, setUnit] = useState("cm");
  const [artScale, setArtScale] = useState(0.95);
  const [offsetX, setOffsetX] = useState(0); // caja de luz: -1..1 dentro de la placa
  const [offsetY, setOffsetY] = useState(0);
  const [posX, setPosX] = useState(0); // letras: cm de desplazamiento sobre la fachada
  const [posY, setPosY] = useState(0);
  const [flipH, setFlipH] = useState(false); // espejo del logo de origen
  const [flipV, setFlipV] = useState(false);

  // Foto real de la fachada (escena "foto")
  const [photoImg, setPhotoImg] = useState(null); // { url: dataURL, w, h } — w/h en px de la foto YA reducida/orientada
  const [photoTiltY, setPhotoTiltY] = useState(0); // giro horizontal del letrero, -40..40 grados
  const [photoTiltX, setPhotoTiltX] = useState(0); // giro vertical, -25..25 grados
  const [photoLightDir, setPhotoLightDir] = useState(45); // 0-360, rueda de direccion de luz
  const [photoAmbient, setPhotoAmbient] = useState(0.6); // 0-1, intensidad ambiente
  const [photoCalib, setPhotoCalib] = useState(null); // { metersPerPx } una vez calibrado
  const [calibrating, setCalibrating] = useState(false); // modo "tocar 2 puntos para medir"
  const [calibPts, setCalibPts] = useState([]); // hasta 2 puntos {x,y} en px de la foto original
  const [calibInputM, setCalibInputM] = useState("");
  const [anchoM, setAnchoM] = useState(3);
  const [altoM, setAltoM] = useState(1);
  const [depthCm, setDepthCm] = useState(8);
  const [standoffCm, setStandoffCm] = useState(6);
  const [threshold, setThreshold] = useState(140);
  const [invert, setInvert] = useState(false);
  const [detect, setDetect] = useState("alpha");
  const [autoRotate, setAutoRotate] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ready, setReady] = useState(false);
  const [sent, setSent] = useState(false);

  // Layout responsive: en pantallas angostas el panel lateral (208px) y
  // la barra de herramientas ya no caben junto al visor — se apilan.
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < 860);
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 860);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const ZMIN = 0.45, ZMAX = 5;
  const clampZoom = (z) => Math.max(ZMIN, Math.min(ZMAX, z));

  /* -- Escena base -- */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const isMobile = window.innerWidth < 760;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !isMobile, preserveDrawingBuffer: true });
    } catch {
      setErr("Tu navegador no soporta WebGL.");
      return;
    }

    const W = mount.clientWidth || 720, H = mount.clientHeight || 520;
    const sc = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, W / H, 0.01, 400);
    camera.position.set(0, 0, 6);

    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const onLost = (e) => { e.preventDefault(); setErr("La vista 3D se suspendio. Recarga la pagina."); };
    const onRestored = () => setErr(null);
    renderer.domElement.addEventListener("webglcontextlost", onLost);
    renderer.domElement.addEventListener("webglcontextrestored", onRestored);

    try {
      const ec = document.createElement("canvas");
      ec.width = 512; ec.height = 256;
      const g = ec.getContext("2d");
      const grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, "#4a4f5c"); grad.addColorStop(0.45, "#22242a"); grad.addColorStop(1, "#0c0d10");
      g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
      g.fillStyle = "rgba(255,255,255,0.5)";
      g.fillRect(120, 20, 150, 42); g.fillRect(330, 34, 90, 26);
      const tex = new THREE.CanvasTexture(ec);
      tex.colorSpace = SRGB;
      tex.mapping = THREE.EquirectangularReflectionMapping;
      const pm = new THREE.PMREMGenerator(renderer);
      sc.environment = pm.fromEquirectangular(tex).texture;
      tex.dispose(); pm.dispose();
    } catch {
      /* sin reflejos de entorno */
    }

    const envGroup = new THREE.Group(); sc.add(envGroup);
    const rig = new THREE.Group(); sc.add(rig);
    // La foto de fondo vive aparte de envGroup/rig: esos dos giran con el
    // arrastre (orbit), la foto es un fondo fijo que NO gira.
    const photoGroup = new THREE.Group(); sc.add(photoGroup);

    const ambient = new THREE.AmbientLight(0xffffff, 0.16); sc.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
    keyLight.castShadow = !isMobile;
    keyLight.shadow.mapSize.set(isMobile ? 512 : 1024, isMobile ? 512 : 1024);
    keyLight.shadow.bias = -0.0015; sc.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.28); sc.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0x8899cc, 0.45); sc.add(rimLight);
    const spill = new THREE.PointLight(0xffffff, 0, 5, 2); sc.add(spill);
    const wallWash = new THREE.SpotLight(0xffffff, 0, 40, Math.PI / 3.2, 0.8, 1.4);
    sc.add(wallWash); sc.add(wallWash.target);

    /* Giro con arrastre */
    let dragging = false, lx = 0, ly = 0, dragVel = 0;
    const gp = (e) => e.touches?.[0] ?? e;

    // Arrastre sobre el letrero -> moverlo. Arrastre sobre el fondo ->
    // girar la escena (como antes). Un solo Raycaster reutilizado.
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const toNdc = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      const p = gp(e);
      ndc.set(((p.clientX - r.left) / r.width) * 2 - 1, -((p.clientY - r.top) / r.height) * 2 + 1);
      return ndc;
    };
    const pickSign = (e) => {
      if (!S.current.frameTarget) return false;
      raycaster.setFromCamera(toNdc(e), camera);
      return raycaster.intersectObject(S.current.frameTarget, true).length > 0;
    };
    const pickPhotoPoint = (e) => {
      if (!S.current.photoPlane) return null;
      raycaster.setFromCamera(toNdc(e), camera);
      const hit = raycaster.intersectObject(S.current.photoPlane, false)[0];
      return hit ? { x: hit.point.x, y: hit.point.y, z: hit.point.z } : null;
    };

    const down = (e) => {
      if (e.touches?.length > 1) return;
      // Modo calibracion: cada clic sobre la foto toma un punto de la
      // regla; no dispara ni mover ni girar mientras esta activo.
      if (S.current.calibrating) {
        const pt = pickPhotoPoint(e);
        // setCalibPts es estable entre renders (identidad de useState):
        // seguro de llamar desde este closure creado una sola vez.
        if (pt) setCalibPts((pts) => (pts.length >= 2 ? [pt] : [...pts, pt]));
        return;
      }
      dragging = true; dragVel = 0;
      const p = gp(e); lx = p.clientX; ly = p.clientY;
      if (pickSign(e)) {
        S.current.dragMode = "move";
        S.current.dragStart = { x: S.current.frameTarget.position.x, y: S.current.frameTarget.position.y };
      } else {
        S.current.dragMode = "orbit";
      }
    };
    // Al soltar el orbit, el giro no corta en seco: sigue con inercia y
    // decae solo, como el orbit tool de SketchUp — se frena en el loop.
    const up = () => {
      if (dragging && S.current.dragMode === "move" && S.current.frameTarget) {
        const dxCm = (S.current.frameTarget.position.x - S.current.dragStart.x) * 100;
        const dyCm = (S.current.frameTarget.position.y - S.current.dragStart.y) * 100;
        // setPosX/setPosY tambien son estables: se puede llamar desde
        // este closure sin re-crear los handlers en cada render.
        setPosX((x) => x + dxCm);
        setPosY((y) => y + dyCm);
      }
      dragging = false;
      S.current.dragMode = "orbit";
    };
    const move = (e) => {
      if (!dragging || e.touches?.length > 1) return;
      const p = gp(e);
      if (S.current.dragMode === "move" && S.current.frameTarget) {
        // Conversion pantalla -> mundo a la profundidad del letrero, para
        // que se mueva "pegado" al dedo/cursor, no a una velocidad fija.
        const dist = camera.position.distanceTo(S.current.center || S.current.frameTarget.position);
        const vFov = THREE.MathUtils.degToRad(camera.fov);
        const h = mount.clientHeight || 1;
        const worldPerPxY = (2 * Math.tan(vFov / 2) * dist) / h;
        const worldPerPxX = worldPerPxY * (camera.aspect || 1);
        S.current.frameTarget.position.x += (p.clientX - lx) * worldPerPxX;
        S.current.frameTarget.position.y -= (p.clientY - ly) * worldPerPxY;
      } else {
        const dy = (p.clientX - lx) * 0.009;
        rig.rotation.y += dy; envGroup.rotation.y += dy;
        dragVel = dy;
      }
      lx = p.clientX; ly = p.clientY;
    };
    renderer.domElement.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointermove", move);

    /* Zoom con rueda */
    const onWheel = (e) => {
      e.preventDefault();
      const k = Math.exp(-e.deltaY * 0.0016);
      setZoom((z) => Math.max(0.45, Math.min(5, z * k)));
    };
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    /* Zoom con pellizco */
    let pinch = 0;
    const dist2 = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const tStart = (e) => { if (e.touches.length === 2) pinch = dist2(e.touches); };
    const tMove = (e) => {
      if (e.touches.length !== 2 || !pinch) return;
      e.preventDefault();
      const d = dist2(e.touches);
      setZoom((z) => Math.max(0.45, Math.min(5, z * (d / pinch))));
      pinch = d;
    };
    const tEnd = () => { pinch = 0; };
    renderer.domElement.addEventListener("touchstart", tStart, { passive: false });
    renderer.domElement.addEventListener("touchmove", tMove, { passive: false });
    renderer.domElement.addEventListener("touchend", tEnd);

    const clock = new THREE.Clock();
    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (S.current.autoRotate && !dragging && Math.abs(dragVel) < 0.0002) {
        const a = Math.sin(clock.getElapsedTime() * 0.28) * 0.42;
        rig.rotation.y = a; envGroup.rotation.y = a;
      } else if (!dragging && Math.abs(dragVel) > 0.0002) {
        // Inercia: el giro decae solo tras soltar, no corta en seco.
        rig.rotation.y += dragVel; envGroup.rotation.y += dragVel;
        dragVel *= 0.92;
      }
      if (S.current.haloMat) {
        S.current.haloMat.opacity = S.current.haloBase * (0.95 + Math.sin(clock.getElapsedTime() * 1.5) * 0.05);
      }
      renderer.render(sc, camera);
    };
    loop();

    const resize = () => {
      const w2 = mount.clientWidth, h2 = mount.clientHeight;
      if (!w2 || !h2) return;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
      if (S.current.frameTarget) {
        const f = frameObject(camera, S.current.frameTarget, S.current.fill || 0.6);
        if (f) {
          S.current.center = f.center; S.current.baseDist = f.dist;
          applyZoom(camera, f.center, f.dist, S.current.zoom || 1);
        }
      }
    };
    let ro;
    if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(resize); ro.observe(mount); }
    window.addEventListener("resize", resize);

    S.current = {
      sc, camera, renderer, rig, envGroup, photoGroup, ambient, keyLight, fillLight, rimLight,
      spill, wallWash, autoRotate: true, haloBase: 0, haloMat: null, isMobile, zoom: 1,
      restoreSize: resize, lastInfo: null, calibrating: false, dragMode: "orbit",
    };
    setReady(true);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("touchstart", tStart);
      renderer.domElement.removeEventListener("touchmove", tMove);
      renderer.domElement.removeEventListener("touchend", tEnd);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onRestored);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => { S.current.autoRotate = autoRotate; }, [autoRotate]);
  useEffect(() => { S.current.calibrating = calibrating; }, [calibrating]);

  useEffect(() => {
    // Aplicacion directa e inmediata: nada de interpolar por cuadro en el
    // loop (eso dependia de que el render loop leyera el valor correcto
    // en el momento correcto). Cada cambio de zoom mueve la camara ya.
    S.current.zoom = zoom;
    if (S.current.center && S.current.camera) {
      applyZoom(S.current.camera, S.current.center, S.current.baseDist, zoom);
    }
  }, [zoom]);

  /* -- Construccion de la escena -- */
  const build = useCallback(() => {
    const { rig, envGroup, spill, wallWash, keyLight, fillLight, rimLight, ambient, sc, camera, imageData, srcCanvas } = S.current;
    if (!rig || !imageData) return;
    setBusy(true);

    const clear = (grp) => {
      while (grp.children.length) {
        const o = grp.children.pop();
        o.traverse?.((n) => {
          n.geometry?.dispose();
          if (Array.isArray(n.material)) n.material.forEach((m) => { m.map?.dispose(); m.dispose(); });
          else if (n.material) { n.material.map?.dispose(); n.material.dispose(); }
        });
      }
    };
    clear(rig);
    S.current.haloMat = null;

    // El canto fabricable va de 4 a 12 cm en ambos productos
    const depth = Math.max(4, Math.min(12, depthCm)) / 100;
    const standoff = standoffCm / 100;
    const litFront = mode === "front" || mode === "both";
    let shapes, uvParams, realW, realH, perim, faceArea, tex, sil;

    if (product === "lightbox") {
      const box = buildLightbox({ form, anchoM, altoM });
      shapes = [box.shape];
      ({ realW, realH, perim, faceArea } = box);
      uvParams = { w: realW, h: realH };
      tex = new THREE.CanvasTexture(panelCanvas(srcCanvas, form, realW, realH, artScale, offsetX, offsetY));
      tex.colorSpace = SRGB; tex.anisotropy = 8;
      sil = { canvas: shapeSilhouetteCanvas(form, realW, realH), wM: realW, hM: realH };
    } else {
      let res;
      try { res = buildLetters(imageData, { threshold, invert, detect, anchoM, altoM }); }
      catch { setErr("No se pudo trazar el logo."); setBusy(false); return; }
      if (!res) { setErr("No se detecto ninguna forma."); setInfo(null); setBusy(false); return; }
      shapes = res.shapes;
      ({ realW, realH, perim, faceArea } = res);
      uvParams = { mPerPx: res.mPerPx, cx: res.cx, cy: res.cy, imgW: imageData.width, imgH: imageData.height };
      tex = S.current.logoTex;
      const { mask } = buildMask(imageData, threshold, invert, detect);
      sil = {
        canvas: silhouetteCanvas(mask, imageData.width, imageData.height),
        wM: imageData.width * res.mPerPx, hM: imageData.height * res.mPerPx,
        offX: (imageData.width / 2 - res.cx) * res.mPerPx,
        offY: -(imageData.height / 2 - res.cy) * res.mPerPx,
      };
    }
    setErr(null);

    const face = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: product === "lightbox" ? 0.5 : 0.42,
      metalness: 0, envMapIntensity: 0.4,
    });
    // El texto no lleva mapa (es monocromo): usa color de cara solido.
    // El logo puede ir "con color" (mapa) o "acrilico liso" (color de cara).
    const faceCol = new THREE.Color(faceColor);
    const usarMapa = useArt && tex && sourceType !== "texto";
    if (usarMapa) {
      face.map = tex;
      if (litFront) {
        face.emissiveMap = tex;
        face.emissive = new THREE.Color(ledColor);
        face.emissiveIntensity = mode === "both" ? 0.75 : 1.0;
      }
    } else {
      face.color = faceCol.clone();
      if (litFront) {
        // Acrilico opal de color: la cara emite en su propio color,
        // tenido por el color del LED.
        face.emissive = faceCol.clone().multiply(new THREE.Color(ledColor));
        face.emissiveIntensity = mode === "both" ? 0.85 : 1.15;
      }
    }
    if (mode === "back") { face.emissive = new THREE.Color(0x000000); face.emissiveIntensity = 0; face.color.multiplyScalar(0.45); }

    const edge = new THREE.MeshStandardMaterial({
      color: new THREE.Color(edgeColor),
      roughness: edgeMetal ? 0.32 : 0.6,
      metalness: edgeMetal ? 0.85 : 0.15,
      envMapIntensity: edgeMetal ? 1.2 : 0.9,
    });

    const sign = new THREE.Group();
    let built = 0;
    shapes.forEach((shape) => {
      try {
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth, bevelEnabled: true, bevelThickness: depth * 0.08, bevelSize: depth * 0.05,
          bevelSegments: 2, curveSegments: product === "lightbox" ? 64 : 14,
        });
        applyUV(geo, product, uvParams);
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, [face, edge]);
        m.castShadow = true; m.receiveShadow = true;
        // Umbral alto (20°) para no dibujar cada faceta del bisel — solo
        // las aristas realmente duras, como en un render de SketchUp.
        applyPolygonOffset(face); applyPolygonOffset(edge);
        m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), edgeLineMat));
        sign.add(m);
        built++;
      } catch {
        /* forma degenerada, se omite */
      }
    });
    if (!built) { setErr("Ninguna pieza pudo generarse."); setBusy(false); return; }

    if (mode === "back" || mode === "both") {
      const mPerPxSil = sil.wM / sil.canvas.width;
      const radiusPx = Math.max(2, (standoff * 0.9) / mPerPxSil);
      const { canvas: hc, pad } = haloCanvas(sil.canvas, radiusPx);
      const htex = new THREE.CanvasTexture(hc);
      htex.colorSpace = SRGB;
      const haloMat = new THREE.MeshBasicMaterial({
        map: htex, color: new THREE.Color(ledColor), transparent: true,
        opacity: mode === "back" ? 0.95 : 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const halo = new THREE.Mesh(
        new THREE.PlaneGeometry((sil.canvas.width + pad * 2) * mPerPxSil, (sil.canvas.height + pad * 2) * mPerPxSil),
        haloMat
      );
      halo.position.set(sil.offX || 0, sil.offY || 0, -standoff + Math.max(realW, realH) * 0.003);
      sign.add(halo);
      S.current.haloMat = haloMat;
      S.current.haloBase = haloMat.opacity;
    }

    // Sombra de contacto contra el muro — SIEMPRE presente (no solo en
    // modo retroiluminado). Sin esto el letrero se ve pegado/flotando
    // sobre la pared en vez de apoyado. Reutiliza la misma silueta
    // desenfocada del halo, pero oscura y mucho mas ceñida al muro.
    {
      const mPerPxSh = sil.wM / sil.canvas.width;
      const radiusShPx = Math.max(1.5, (0.025 / mPerPxSh)); // ~2.5cm de difuminado
      const { canvas: shc, pad: shPad } = haloCanvas(sil.canvas, radiusShPx);
      const shTex = new THREE.CanvasTexture(shc);
      shTex.colorSpace = SRGB;
      const contactMat = new THREE.MeshBasicMaterial({
        map: shTex, color: 0x000000, transparent: true, opacity: 0.4,
        depthWrite: false, side: THREE.DoubleSide,
      });
      const contact = new THREE.Mesh(
        new THREE.PlaneGeometry((sil.canvas.width + shPad * 2) * mPerPxSh, (sil.canvas.height + shPad * 2) * mPerPxSh),
        contactMat
      );
      contact.position.set(sil.offX || 0, sil.offY || 0, -standoff + 0.004);
      sign.add(contact);
    }

    // Candado ancho/alto abierto (solo Texto): deformar a proposito para
    // llenar exactamente anchoM x altoM, en vez del ajuste uniforme de
    // buildLetters (que dentro respeta un unico factor y puede dejar aire
    // en un eje). Escala no uniforme sobre el GRUPO, no sobre el trazado
    // — no toca buildLetters ni su calculo de escala en metros. La
    // profundidad (Z) no se toca: el canto no debe estirarse con la cara.
    if (sourceType === "texto" && !whLocked && realW > 0.001 && realH > 0.001) {
      sign.scale.set(anchoM / realW, altoM / realH, 1);
    }

    const sb = new THREE.Box3().setFromObject(sign);
    sign.position.sub(sb.getCenter(new THREE.Vector3()));
    // Posicion del letrero completo sobre la fachada/foto — universal
    // (letras o caja de luz), persistida en React (posX/posY) para que
    // sobreviva a cualquier rebuild. Independiente de offsetX/offsetY,
    // que solo mueve el ARTE dentro del panel de la caja de luz.
    sign.position.x += posX / 100;
    sign.position.y += posY / 100;
    rig.add(sign);
    // Encuadre y calculos con rotacion 0 (el giro lo repone el loop).
    rig.rotation.set(0, 0, 0); envGroup.rotation.set(0, 0, 0);

    const span = Math.max(realW, realH);

    // Firma del entorno: si no cambia, se reutiliza tal cual (no se
    // regenera ni se redibujan sus texturas). El letrero (rig) siempre
    // se reconstruye; el entorno (envGroup) solo cuando cambia algo suyo.
    // Junto con la aleatoriedad con semilla, esto elimina el parpadeo de
    // las luces y evita el trabajo pesado en cada tecla.
    // La escena "foto" no usa el entorno generado (envGroup): el fondo es
    // la foto real, en photoGroup (grupo aparte que no gira). Nos
    // aseguramos de que envGroup quede vacio si se viene de otra escena.
    const envSig = scene === "foto" ? "foto" : !showFacade ? "none" : [
      scene, facadeStyle, material, wallPanelDir, wallPanelSize, finish, wallColor, night,
      facadeStyle === "esquina" ? buildingFloors : 0,
      facadeAuto ? "auto" : `${Math.round(facadeWidthM * 20)}x${Math.round(facadeHeightM * 20)}`,
      Math.round(realW * 4), Math.round(realH * 4), Math.round(standoff * 50),
    ].join("|");

    if (S.current.envSig !== envSig) {
      clear(envGroup);
      S.current.envMeta = null;
      if (showFacade && scene !== "foto") {
        resetRng();
        const fin = FINISHES.find((f) => f.id === finish) || FINISHES[2];
        const wallMat = makeFacadeMaterial(material, wallColor, fin.rough, fin.metal, span, wallPanelDir, wallPanelSize / 100);
        if (scene === "totem") {
          const bodyW = realW + 0.5, bodyH = realH + 1.9, bodyD = 0.36;
          const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyD), wallMat);
          body.position.set(0, 0, -standoff - bodyD / 2);
          body.castShadow = true; body.receiveShadow = true;
          envGroup.add(body);
          const baseH = 0.14;
          const base = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.24, baseH, bodyD + 0.24),
            new THREE.MeshStandardMaterial({ color: 0x2b2c30, roughness: 0.85 }));
          base.position.set(0, -bodyH / 2 - baseH / 2, -standoff - bodyD / 2);
          base.receiveShadow = true; base.castShadow = true;
          envGroup.add(base);
          const gtex = new THREE.CanvasTexture(floorTexture("ext"));
          gtex.colorSpace = SRGB;
          gtex.wrapS = gtex.wrapT = THREE.RepeatWrapping; gtex.repeat.set(14, 14);
          const ground = new THREE.Mesh(new THREE.PlaneGeometry(span * 26, span * 26),
            new THREE.MeshStandardMaterial({ map: gtex, roughness: 0.95 }));
          ground.rotation.x = -Math.PI / 2;
          ground.position.set(0, -bodyH / 2 - baseH, 0);
          ground.receiveShadow = true;
          envGroup.add(ground);
          S.current.envMeta = { type: "totem", bodyH };
        } else if (scene === "interior") {
          const wallH = Math.max(2.7, realH * 3.2), wallW = Math.max(4.2, realW * 3.4);
          const wall = new THREE.Mesh(new THREE.PlaneGeometry(wallW, wallH), wallMat);
          wall.position.set(0, 0, -standoff - 0.02);
          wall.receiveShadow = true;
          envGroup.add(wall);
          const floorY = -wallH / 2;
          const ftex = new THREE.CanvasTexture(floorTexture("interior"));
          ftex.colorSpace = SRGB;
          ftex.wrapS = ftex.wrapT = THREE.RepeatWrapping; ftex.repeat.set(6, 6);
          const floor = new THREE.Mesh(new THREE.PlaneGeometry(wallW, wallW),
            new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.55, metalness: 0.05 }));
          floor.rotation.x = -Math.PI / 2;
          floor.position.set(0, floorY, wallW / 2 - standoff);
          floor.receiveShadow = true;
          envGroup.add(floor);
          const skirt = new THREE.Mesh(new THREE.BoxGeometry(wallW, 0.11, 0.03),
            new THREE.MeshStandardMaterial({ color: 0xe8e8ea, roughness: 0.4 }));
          skirt.position.set(0, floorY + 0.055, -standoff + 0.005);
          skirt.receiveShadow = true;
          envGroup.add(skirt);
          S.current.envMeta = { type: "interior", wallH };
        } else {
          // Fachada externa: local completo + su entorno — calle
          // (cielo/montanas/vecinos) para las 5 fachadas de la vereda,
          // o pasillo de mall (piso continuo, sin calle ni cielo) para
          // el local de centro comercial.
          const store = buildStorefront(facadeStyle, {
            signW: realW, signH: realH, standoff, wallMat, night, buildingFloors,
            facadeW: facadeAuto ? null : facadeWidthM,
            facadeH: facadeAuto ? null : facadeHeightM,
          });
          envGroup.add(store.group);
          if (store.isMall) buildMallEnv(envGroup, store);
          else buildStreetEnv(envGroup, store, { night, standoff });
          S.current.envMeta = { type: "fachada" };
        }
      }
      S.current.envSig = envSig;
    }

    // Reposicion del letrero segun el entorno. Se aplica en cada armado
    // (el letrero se reconstruye siempre, aunque el entorno se reuse).
    const meta = S.current.envMeta;
    if (meta?.type === "totem") sign.position.y += meta.bodyH / 2 - realH / 2 - 0.35;
    else if (meta?.type === "interior") sign.position.y += meta.wallH * 0.12;

    // Correccion de perspectiva sobre foto: el usuario alinea el letrero
    // al plano del muro de la foto a ojo, con dos giros manuales. No hay
    // deteccion automatica de perspectiva (seria fragil y lenta).
    if (scene === "foto") {
      sign.rotation.set(
        THREE.MathUtils.degToRad(photoTiltX),
        THREE.MathUtils.degToRad(photoTiltY),
        0
      );
    }

    // Luz que bana la fachada (uniforme, se ajusta en cada armado)
    if (showFacade) {
      wallWash.color.set(night ? 0xfff0d8 : 0xffffff);
      wallWash.intensity = night ? 2.6 : 1.4;
      wallWash.distance = span * 18;
      wallWash.position.set(span * 0.5, span * 1.5, -standoff + span * 0.35);
      wallWash.target.position.set(0, 0, -standoff);
      wallWash.target.updateMatrixWorld();
    } else {
      wallWash.intensity = 0;
    }

    keyLight.position.set(span * 1.2, span * 1.4, span * 1.8);
    fillLight.position.set(-span, -span * 0.3, span * 1.2);
    rimLight.position.set(-span * 1.3, span * 0.7, -span * 0.5);
    Object.assign(keyLight.shadow.camera, { left: -span * 2, right: span * 2, top: span * 2, bottom: -span * 2, far: span * 14 });
    keyLight.shadow.camera.updateProjectionMatrix();

    if (night) {
      sc.background = new THREE.Color(0x08080a);
      // Noche mas legible: se sube ambiente/relleno para que la fachada no
      // quede negra contra el fondo iluminado, sin perder el ambiente.
      ambient.intensity = 0.34; keyLight.intensity = 0.8;
      fillLight.intensity = 0.32; rimLight.intensity = 0.5;
    } else {
      sc.background = new THREE.Color(0xd9dbe0);
      ambient.intensity = 0.9; keyLight.intensity = 2.3;
      fillLight.intensity = 0.75; rimLight.intensity = 0.3;
    }

    // Mall: luz cenital difusa y pareja, no sol en angulo — se baja el
    // contraste entre la luz principal y el ambiente, y la key light se
    // reposiciona casi directo arriba en vez de venir de un costado.
    if (showFacade && scene === "fachada" && facadeStyle === "mall") {
      keyLight.position.set(span * 0.15, span * 2.6, span * 0.4);
      keyLight.intensity *= night ? 1.3 : 0.55;
      ambient.intensity = night ? 0.55 : 1.05;
      fillLight.intensity = night ? 0.4 : 0.85;
      rimLight.intensity *= 0.4;
    }

    // Foto real: el letrero se ve falso si su luz no coincide con la de
    // la foto. La direccion (rueda 0-360°) y la intensidad ambiente las
    // fija el usuario a ojo, mirando las sombras de la propia foto.
    if (scene === "foto") {
      wallWash.intensity = 0;
      const rad = THREE.MathUtils.degToRad(photoLightDir);
      keyLight.position.set(Math.cos(rad) * span * 2.2, span * 1.6, Math.sin(rad) * span * 2.2);
      keyLight.intensity = night ? 0.7 : 1.9;
      ambient.intensity = photoAmbient;
      fillLight.intensity = photoAmbient * 0.5;
      rimLight.intensity = 0.15;
      sc.background = null; // se ve la foto, no un color de fondo

      // Escala calibrada: si el usuario midio una referencia real sobre
      // la foto, se corrige el tamano del letrero para que la proporcion
      // sea la correcta contra esa foto especifica (el letrero ya viene
      // bien dimensionado en metros — esto solo ajusta cuanto ESPACIO de
      // pantalla ocupa esa medida real, segun el encuadre de la foto).
      // multiplyScalar, no setScalar: si el texto esta con el candado
      // ancho/alto abierto, sign.scale ya trae una deformacion no
      // uniforme (ver mas arriba) — setScalar la borraria por completo.
      sign.scale.multiplyScalar(photoCalib?.scaleFactor || 1);
    }

    // Fondo de foto real: plano fijo (no gira con el letrero) que cubre
    // el cuadro sin deformar la imagen (recorta el sobrante, tipo CSS
    // "cover"). Se reconstruye siempre que cambia algo relevante — es
    // barato, no hace falta el cache de envSig que usan los escenarios
    // generados.
    while (photoGroup.children.length) {
      const o = photoGroup.children.pop();
      o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose();
    }
    S.current.photoPlane = null;
    if (scene === "foto" && photoImg && S.current.photoTex) {
      const imgAspect = photoImg.w / photoImg.h;
      const camAspect = camera.aspect || 1.6;
      const baseSize = Math.max(span * 6, 10);
      const planeW = camAspect >= 1 ? baseSize : baseSize * camAspect;
      const planeH = camAspect >= 1 ? baseSize / camAspect : baseSize;
      fitCoverTexture(S.current.photoTex, imgAspect, planeW / planeH);
      const photoZ = -standoff - Math.max(span * 3, 6);
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(planeW, planeH),
        new THREE.MeshBasicMaterial({ map: S.current.photoTex })
      );
      plane.position.set(0, 0, photoZ);
      photoGroup.add(plane);
      S.current.photoPlane = plane;

      // Resplandor nocturno sobre la foto: lo que "vende" el retroiluminado.
      // Se agrega a "rig" (NO a photoGroup): rig es el mismo grupo que
      // gira con el letrero al arrastrar, asi el resplandor sigue al
      // letrero durante el giro en vez de quedar fijo como la foto.
      if (night && (mode === "back" || mode === "both")) {
        const gtex = new THREE.CanvasTexture(glowTexture());
        gtex.colorSpace = SRGB;
        const glowSize = Math.max(realW, realH) * (photoCalib?.scaleFactor || 1) * 3.2;
        const glow = new THREE.Mesh(
          new THREE.PlaneGeometry(glowSize, glowSize),
          new THREE.MeshBasicMaterial({
            map: gtex, color: new THREE.Color(ledColor), transparent: true,
            opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false,
          })
        );
        glow.position.set(sign.position.x, sign.position.y, photoZ + 0.02);
        rig.add(glow);
      }

      // Marcadores de los puntos de calibracion ya tomados (0, 1 o 2).
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xff5a3c, depthTest: false });
      for (const pt of calibPts) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(Math.max(span * 0.012, 0.02), 10, 8), dotMat);
        dot.position.set(pt.x, pt.y, pt.z + 0.01);
        dot.renderOrder = 10;
        photoGroup.add(dot);
      }
      if (calibPts.length === 2) {
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(calibPts.map((p) => new THREE.Vector3(p.x, p.y, p.z + 0.01))),
          new THREE.LineBasicMaterial({ color: 0xff5a3c, depthTest: false })
        );
        line.renderOrder = 10;
        photoGroup.add(line);
      }
    }

    // Retroiluminado uniforme: en vez de una sola luz puntual al centro
    // (muro fuerte al medio, apagado en las esquinas), se reparten varias
    // luces a lo ancho del letrero.
    spill.intensity = 0;
    if (mode === "front") {
      spill.color = new THREE.Color(ledColor);
      spill.intensity = 0.4;
      spill.distance = span * 4;
      spill.position.set(0, sign.position.y, -standoff * 0.6);
    } else {
      const total = mode === "back" ? 2.2 : 1.4;
      const N = 5;
      const wallZ = -standoff * 0.6;
      for (let i = 0; i < N; i++) {
        const wl = new THREE.PointLight(new THREE.Color(ledColor), total / N, span * 3.5, 2);
        const fx = (i / (N - 1) - 0.5) * realW * 1.05;
        wl.position.set(fx, sign.position.y, wallZ);
        rig.add(wl);
      }
    }

    // En fachada hay que abrir el encuadre: el local es mucho mas grande que el letrero
    const fill = scene === "totem" ? 0.5
      : scene === "interior" ? 0.45
      : showFacade ? 0.3 : 0.75;
    S.current.frameTarget = sign; S.current.fill = fill;
    S.current.lastInfo = { realW, realH };
    const f = frameObject(camera, sign, fill);
    if (f) {
      S.current.center = f.center; S.current.baseDist = f.dist;
      // Reencuadrar (mover la camara) solo cuando cambio algo que
      // realmente lo justifica: escena, producto o medidas reales. Un
      // cambio cosmetico (color de LED, material de fachada, acabado)
      // dispara build() igual (esta en sus dependencias) pero no debe
      // mover la camara si el usuario esta con zoom puesto mirando un
      // detalle. El boton "Encuadrar" (setZoom(1)) sigue siendo el unico
      // que devuelve el zoom a 100% de forma explicita.
      const frameSig = [
        scene, product, form, sourceType, genSeq, whLocked,
        Math.round(realW * 1000), Math.round(realH * 1000), Math.round(depthCm), showFacade,
      ].join("|");
      if (S.current.frameSig !== frameSig) {
        S.current.frameSig = frameSig;
        applyZoom(camera, f.center, f.dist, S.current.zoom || 1);
      }
    }

    setInfo({ realW, realH, perim, faceArea, count: built, product });
    setBusy(false);
  }, [product, form, scene, facadeStyle, buildingFloors, facadeAuto, facadeWidthM, facadeHeightM, showFacade, material, wallPanelDir, wallPanelSize, finish, wallColor, mode, night, ledColor,
      useArt, faceColor, sourceType, genSeq, artScale, offsetX, offsetY, posX, posY, edgeColor, edgeMetal,
      anchoM, altoM, whLocked, depthCm, standoffCm, threshold, invert, detect,
      photoImg, photoCalib, photoTiltX, photoTiltY, photoLightDir, photoAmbient, calibPts]);

  // Micro-retardo: al arrastrar un slider no se reconstruye la escena en
  // cada tick, solo cuando el valor se estabiliza. Evita que se congele.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => build(), 40);
    return () => clearTimeout(t);
  }, [build, ready]);

  /* -- Captura de imagen respetando la orientacion del letrero -- */
  const captureOriented = useCallback((mime = "image/png", quality = 0.92, longSide = 1600) => {
    const st = S.current;
    const { renderer, camera, sc, restoreSize, frameTarget } = st;
    if (!renderer || !camera || !sc) return null;
    const inf = st.lastInfo;
    const aspect = inf && inf.realW && inf.realH
      ? inf.realW / inf.realH
      : (renderer.domElement.width / renderer.domElement.height) || 1.4;
    let tw, th;
    if (aspect >= 1) { tw = longSide; th = Math.max(1, Math.round(longSide / aspect)); }
    else { th = longSide; tw = Math.max(1, Math.round(longSide * aspect)); }
    const dpr = renderer.getPixelRatio();
    try {
      renderer.setPixelRatio(1);
      renderer.setSize(tw, th, false);
      camera.aspect = tw / th;
      const f = frameObject(camera, frameTarget || sc, st.fill || 0.6);
      if (f) applyZoom(camera, f.center, f.dist, st.zoom || 1);
      else camera.updateProjectionMatrix();
      renderer.render(sc, camera);
      return renderer.domElement.toDataURL(mime, quality);
    } catch {
      return null;
    } finally {
      renderer.setPixelRatio(dpr);
      restoreSize && restoreSize();
    }
  }, []);

  /* -- Carga del logo -- */
  const loadCanvas = useCallback((canvas, name, forceDetect) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    S.current.imageData = imageData;
    S.current.srcCanvas = canvas;
    S.current.originalCanvas = canvas; // intacto: el espejo se calcula desde aca
    setFlipH(false); setFlipV(false); // cada logo nuevo empieza sin espejo
    S.current.logoTex?.dispose();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = SRGB; tex.anisotropy = 8;
    S.current.logoTex = tex;

    // Texto: forzamos el modo "tonos oscuros" en vez de dejarlo a la
    // heuristica, porque el canvas es negro sobre blanco. El rebuild lo
    // dispara genSeq (el efecto de build), no una llamada directa.
    if (forceDetect) {
      setSuggested(null);
      setProduct("letters");
      setDetect(forceDetect);
      // El zoom solo se encuadra la PRIMERA vez que se entra a Texto —
      // antes se reseteaba en cada letra escrita, y el usuario perdia el
      // zoom que habia puesto (se sentia como un "salto").
      if (S.current.sourceType !== "texto") setZoom(1);
      S.current.sourceType = "texto";
      setSourceType("texto");
      setFileName(name);
      setGenSeq((n) => n + 1);
      return;
    }

    S.current.sourceType = "logo";
    setSourceType("logo");
    let best = null;
    for (const d of ["alpha", "dark", "light"]) {
      const { coverage } = buildMask(imageData, threshold, false, d);
      if (coverage < 0.004 || coverage > 0.9) continue;
      let cs = [];
      try { cs = traceContours(imageData, threshold, false, d); } catch { continue; }
      if (!cs.length) continue;
      const score = (1 - Math.abs(coverage - 0.2) / 0.6) * 0.6 + (Math.min(cs.length, 15) / 15) * 0.4;
      if (!best || score > best.score) best = { d, score, cs };
    }
    if (best) {
      setDetect(best.d);
      const sug = suggestProduct(best.cs);
      setSuggested(sug);
      setProduct(sug.product);
      if (sug.product === "lightbox") setForm(sug.form);
    }
    setZoom(1);
    setFileName(name);
    build();
  }, [threshold, build]);

  // -- Foto real de la fachada --
  // Se lee con FileReader/dataURL (no URL.createObjectURL: los blob URL
  // se bloquean por CSP en algunos contextos embebidos) y se corrige la
  // orientacion EXIF con createImageBitmap({imageOrientation:'from-image'})
  // — sin esto, una foto vertical de telefono llega acostada.
  const handlePhotoFile = useCallback(async (file) => {
    if (!file) return;
    setErr(null); setBusy(true);
    try {
      let bitmap;
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch {
        // Fallback (navegadores sin soporte): FileReader + Image, sin
        // correccion EXIF explicita (el navegador puede o no aplicarla).
        const dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result));
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        bitmap = await new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = dataUrl;
        });
      }
      const iw = bitmap.width, ih = bitmap.height;
      const longSide = 2000; // una foto de telefono son 12MP, no hace falta mas
      const scale = Math.min(1, longSide / Math.max(iw, ih));
      const cw = Math.max(1, Math.round(iw * scale)), ch = Math.max(1, Math.round(ih * scale));
      const c = document.createElement("canvas");
      c.width = cw; c.height = ch;
      c.getContext("2d").drawImage(bitmap, 0, 0, cw, ch);
      bitmap.close?.();
      // La textura de Three.js se crea ACA, sincronica, para que ya este
      // lista en S.current cuando el proximo build() (disparado por el
      // cambio de estado de abajo) la necesite — evita tener que cargarla
      // de forma asincrona dentro de build().
      S.current.photoTex?.dispose();
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = SRGB;
      S.current.photoTex = tex;
      setPhotoImg({ url: c.toDataURL("image/jpeg", 0.85), w: cw, h: ch });
      setPhotoCalib(null); setCalibPts([]); setCalibrating(false);
    } catch {
      setErr("No se pudo abrir la foto.");
    } finally {
      setBusy(false);
    }
  }, []);

  const loadFromDataUrl = useCallback((dataUrl, name) => {
    setBusy(true);
    const img = new Image();
    img.onload = () => {
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      if (!iw || !ih) { setErr("La imagen no tiene dimensiones legibles."); setBusy(false); return; }
      const targetW = 1000;
      const targetH = Math.max(1, Math.round((ih / iw) * targetW));
      const c = document.createElement("canvas");
      c.width = targetW; c.height = targetH;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);
      loadCanvas(c, name);
    };
    img.onerror = () => { setErr("El navegador no pudo abrir la imagen."); setBusy(false); };
    img.src = dataUrl;
  }, [loadCanvas]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    setErr(null);
    const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
    const reader = new FileReader();
    reader.onerror = () => setErr("No se pudo leer el archivo.");
    if (isSvg) {
      reader.onload = () => {
        let svg = String(reader.result);
        if (!/<svg[^>]*\swidth\s*=/i.test(svg) || !/<svg[^>]*\sheight\s*=/i.test(svg)) {
          const vb = svg.match(/viewBox\s*=\s*["']\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
          svg = svg.replace(/<svg/i, `<svg width="${vb ? vb[3] : 800}" height="${vb ? vb[4] : 800}"`);
        }
        loadFromDataUrl("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg), file.name);
      };
      reader.readAsText(file);
    } else {
      reader.onload = () => loadFromDataUrl(String(reader.result), file.name);
      reader.readAsDataURL(file);
    }
  }, [loadFromDataUrl]);

  const loadSample = useCallback(() => {
    const c = document.createElement("canvas");
    c.width = 1000; c.height = 400;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, 1000, 400);
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = RED; x.font = "bold 200px Arial, Helvetica, sans-serif";
    x.fillText("LOGO", 500, 150);
    x.fillStyle = "#1a3a6b"; x.font = "bold 96px Arial, Helvetica, sans-serif";
    x.fillText("EJEMPLO", 500, 290);
    loadCanvas(c, "Logo de ejemplo");
  }, [loadCanvas]);

  // -- Modulo de texto --
  const regenerarTexto = useCallback(async () => {
    const lineas = texto.split("\n").slice(0, 3).map((l) => l.slice(0, 40));
    if (!lineas.join("").trim()) return;
    const res = resolverFuente(weightStep, fontStyle, customFont);
    await cargarFuentesBase();
    try { await document.fonts.load(`${res.weight} 40px "${res.family}"`); } catch { /* ya cargada o de reemplazo */ }
    const c = dibujarTextoCanvas({
      lineas, family: res.family, weight: res.weight,
      align: textAlign, lineHeight: lineHeightTx, letterSpacing, upper,
    });
    if (!c) return;
    const aspect = c.width / c.height;
    setTextAspect(aspect);

    // Tamano por defecto SOLO la primera vez que se escribe texto (de
    // vacio a algo) — el letrero arranca ocupando ~40% del ancho
    // disponible en vez de heredar el ultimo anchoM/altoM usado (podia
    // venir de una escena de fachada de 3x1m y salir gigante). Ediciones
    // siguientes respetan lo que el usuario haya ajustado a mano, mismo
    // criterio que ya se uso para no resetear el zoom en cada letra.
    if (!S.current.textSizedOnce) {
      const targetFrac = 0.4; // dentro del rango pedido 35%-50%
      const nuevoAlto = Math.max(0.2, Math.min(anchoM, (targetFrac * anchoM) / aspect));
      setAltoM(nuevoAlto);
      S.current.textSizedOnce = true;
    }

    setSourceType("texto");
    loadCanvas(c, "Texto: " + lineas.join(" ").trim().slice(0, 24), "dark");
  }, [texto, weightStep, fontStyle, customFont, textAlign, lineHeightTx, letterSpacing, upper, anchoM, loadCanvas]);

  const cargarFuentePropia = useCallback(async (file) => {
    if (!file) return;
    setFontMsg(null);
    try {
      const buf = await file.arrayBuffer();
      const fam = "Propia-" + Date.now();
      const ff = new FontFace(fam, buf);
      await ff.load();
      document.fonts.add(ff);
      const { step, frac } = medirTrazo(fam, 400);
      setCustomFont({ family: fam, step });
      setWeightStep(step);
      setFontMsg(`Fuente propia cargada. Grosor medido: ${GROSOR_LABEL[step]} (${Math.round(frac * 100)}% del alto).`);
    } catch {
      setFontMsg("No se pudo cargar la fuente. Usa .ttf, .otf o .woff2.");
    }
  }, []);

  // Recalcula el logo al voltearlo. Parte siempre del canvas ORIGINAL
  // (no de uno ya volteado), asi prender/apagar el espejo es reversible.
  // Solo se recalcula cuando el espejo cambia, no en cada build().
  useEffect(() => {
    const original = S.current.originalCanvas;
    if (!original || sourceType !== "logo") return;
    const work = flipCanvas(original, flipH, flipV);
    S.current.imageData = work.getContext("2d", { willReadFrequently: true })
      .getImageData(0, 0, work.width, work.height);
    S.current.srcCanvas = work;
    S.current.logoTex?.dispose();
    const tex = new THREE.CanvasTexture(work);
    tex.colorSpace = SRGB; tex.anisotropy = 8;
    S.current.logoTex = tex;
    setGenSeq((n) => n + 1);
  }, [flipH, flipV, sourceType]);

  // Carga diferida de las fuentes al abrir la herramienta Texto.
  useEffect(() => { if (tool === "texto") cargarFuentesBase(); }, [tool]);

  // Regenera el texto en vivo (con micro-retardo) cuando cambia algo.
  useEffect(() => {
    if (!texto.trim()) {
      // Al borrar el texto, la proxima vez que se escriba algo se vuelve
      // a calcular el tamano inteligente (35%-50%) en vez de arrastrar
      // el ultimo tamano manual de una sesion de texto anterior.
      S.current.textSizedOnce = false;
      return;
    }
    if (tool !== "texto") return;
    const t = setTimeout(() => { regenerarTexto(); }, 200);
    return () => clearTimeout(t);
  }, [tool, texto, weightStep, fontStyle, textAlign, lineHeightTx, letterSpacing, upper, customFont, regenerarTexto]);

  const download = useCallback(() => {
    const url = captureOriented("image/png", 0.95, 1800);
    if (!url) { setErr("No se pudo generar la imagen."); return; }
    const a = document.createElement("a");
    a.href = url;
    a.download = "prototipo-letrero.png";
    a.click();
  }, [captureOriented]);

  const enviarACotizacion = useCallback(() => {
    const url = captureOriented("image/jpeg", 0.82, 1400);
    if (!url) { setErr("No se pudo preparar la imagen."); return; }
    const ok = guardarPrototipo(url);
    if (!ok) { setErr("No se pudo guardar el prototipo en este navegador."); return; }
    setSent(true);
    setTimeout(() => setSent(false), 2400);
  }, [captureOriented]);

  // Aluminio para caja de luz, PVC oscuro para corporeas
  useEffect(() => {
    setEdgeColor(product === "lightbox" ? "#9AA0A8" : "#202024");
    setEdgeMetal(product === "lightbox");
  }, [product]);

  const pickScene = (x) => {
    setScene(x.id);
    if (x.a != null) { setAnchoM(x.a); setAltoM(x.b); } // "foto" no trae preset: la medida real la da la calibracion
    if (x.id === "interior") { setMaterial("lisa"); setFinish("blanco"); setWallColor("#eceef1"); }
    if (x.id === "totem") { setMaterial("acm"); setFinish("negro"); setWallColor("#191a1d"); }
  };
  const pickFinish = (f) => { setFinish(f.id); setWallColor(f.hex); };
  const pickMaterial = (id) => {
    setMaterial(id);
    if (id === "madera" && finish !== "madera") { setFinish("madera"); setWallColor("#8b5e3c"); }
  };

  // Toma los 2 puntos de calibracion (ya en metros del mundo 3D, medidos
  // por raycasting) y la medida real ingresada -> factor de escala.
  const aplicarCalibracion = () => {
    if (calibPts.length !== 2) return;
    const m = parseFloat(String(calibInputM).replace(",", "."));
    if (!m || m <= 0) return;
    const [a, b] = calibPts;
    const worldDist = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    if (worldDist <= 0.0001) return;
    setPhotoCalib({ scaleFactor: m / worldDist });
    setCalibrating(false);
    setCalibInputM("");
  };
  const reiniciarCalibracion = () => {
    setPhotoCalib(null); setCalibPts([]); setCalibInputM(""); setCalibrating(true);
  };

  /* -- Piezas de interfaz -- */
  const Seg = ({ items, value, onPick, cols }) => (
    <div style={{ ...s.seg, gridTemplateColumns: `repeat(${cols || items.length}, 1fr)` }}>
      {items.map((it) => (
        <button key={it.id} onClick={() => onPick(it)} title={it.desc || it.label}
          style={{ ...s.segBtn, ...(value === it.id ? s.segOn : {}) }}>
          {it.dot && <span style={{ ...s.dot, background: it.dot }} />}
          {it.label}
        </button>
      ))}
    </div>
  );

  const Stack = ({ items, value, onPick }) => (
    <div style={s.stack}>
      {items.map((it) => (
        <button key={it.id} onClick={() => onPick(it)}
          style={{ ...s.card, ...(value === it.id ? s.cardOn : {}) }}>
          <span style={s.cardTitle}>{it.label}</span>
          {it.desc && <span style={s.cardDesc}>{it.desc}</span>}
        </button>
      ))}
    </div>
  );

  const Slider = ({ label, value, unit, min, max, step, onChange }) => (
    <div style={s.slider}>
      <div style={s.sliderHead}><span>{label}</span><span style={s.sliderVal}>{value}{unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} style={s.range}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );

  /* El valor vive siempre en metros; el campo muestra y acepta la unidad elegida. */
  const Field = ({ label, value, onChange }) => {
    const k = unit === "cm" ? 100 : 1;
    const shown = unit === "cm" ? Math.round(value * 100) : value;
    return (
      <label style={s.field}>
        <span style={s.fieldLabel}>{label}</span>
        <input type="number" value={shown}
          min={unit === "cm" ? 20 : 0.2} max={unit === "cm" ? 2000 : 20}
          step={unit === "cm" ? 5 : 0.1} style={s.fieldInput}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (isNaN(n)) return;
            onChange(Math.max(0.2, Math.min(20, n / k)));
          }} />
        <span style={s.fieldUnit}>{unit}</span>
      </label>
    );
  };

  const mismatch = suggested && suggested.product !== product;

  const panels = {
    producto: (
      <>
        <div style={s.pTitle}>Producto</div>
        <Stack items={PRODUCTS} value={product} onPick={(p) => setProduct(p.id)} />
        {mismatch && (
          <div style={s.note}>
            {suggested.product === "lightbox"
              ? "Tu logo parece una placa entera. Como corporea se cortaria en muchas piezas."
              : "Tu logo tiene piezas separadas. Como caja se imprime todo sobre una placa."}
          </div>
        )}
        {product === "lightbox" && (
          <>
            <div style={s.pLabel}>Forma</div>
            <Seg items={FORMS} value={form} onPick={(f) => setForm(f.id)} />
            <div style={s.pLabel}>Tamano del logo dentro</div>
            <Slider label="Ocupacion" value={Math.round(artScale * 100)} unit=" %"
              min={30} max={100} step={5} onChange={(v) => setArtScale(v / 100)} />
            <div style={s.pHint}>
              {form === "circle"
                ? "Al 100% el logo llena el disco de borde a borde."
                : "Al 100% el logo llega al borde de la placa."}
            </div>
          </>
        )}
        {sourceType === "logo" && (
          <>
            <div style={s.pLabel}>Voltear el logo</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 3 }}>
              <button onClick={() => setFlipH((v) => !v)} style={{ ...s.segBtn, ...(flipH ? s.segOn : {}) }}>
                Espejo horizontal
              </button>
              <button onClick={() => setFlipV((v) => !v)} style={{ ...s.segBtn, ...(flipV ? s.segOn : {}) }}>
                Espejo vertical
              </button>
            </div>
          </>
        )}
        {product === "lightbox" && (
          <>
            <div style={s.pLabel}>Posición del arte dentro de la placa</div>
            <Slider label="Horizontal" value={Math.round(offsetX * 100)} unit=" %"
              min={-100} max={100} step={5} onChange={(v) => setOffsetX(v / 100)} />
            <Slider label="Vertical" value={Math.round(offsetY * 100)} unit=" %"
              min={-100} max={100} step={5} onChange={(v) => setOffsetY(v / 100)} />
          </>
        )}
        <div style={s.pLabel}>Posición del letrero{scene === "foto" ? " sobre la foto" : " en la fachada"}</div>
        <div style={s.pHint}>También puedes arrastrar el letrero directo con el mouse o el dedo.</div>
        <div style={s.fields}>
          <label style={s.field}>
            <span style={s.fieldLabel}>X</span>
            <input type="number" value={Math.round(posX)} step={5} style={s.fieldInput}
              onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) setPosX(n); }} />
            <span style={s.fieldUnit}>cm</span>
          </label>
          <label style={s.field}>
            <span style={s.fieldLabel}>Y</span>
            <input type="number" value={Math.round(posY)} step={5} style={s.fieldInput}
              onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) setPosY(n); }} />
            <span style={s.fieldUnit}>cm</span>
          </label>
        </div>
        <button onClick={() => { setPosX(0); setPosY(0); }} style={{ ...s.flatBtn, width: "100%", marginTop: 6 }}>
          Centrar
        </button>
        {(product !== "lightbox") && (
          <>
            <div style={s.pLabel}>Color de la cara</div>
            <div style={s.swatches}>
              {FACE_COLORS.map((c) => (
                <button key={c.hex} title={c.name} onClick={() => setFaceColor(c.hex)}
                  style={{ ...s.swatch, background: c.hex,
                    outline: faceColor.toLowerCase() === c.hex.toLowerCase() ? `2px solid ${RED}` : "1px solid #2E2E32",
                    outlineOffset: 2 }} />
              ))}
            </div>
            <label style={s.colorRow}>
              <span style={s.fieldLabel}>Color libre</span>
              <input type="color" value={faceColor} style={s.colorInput}
                onChange={(e) => setFaceColor(e.target.value)} />
              <span style={s.fieldUnit}>{faceColor}</span>
            </label>
          </>
        )}
        <div style={s.pLabel}>Color del canto</div>
        <div style={s.swatches}>
          {EDGE_COLORS.map((c) => (
            <button key={c.hex} title={c.name} onClick={() => setEdgeColor(c.hex)}
              style={{ ...s.swatch, background: c.hex,
                outline: edgeColor.toLowerCase() === c.hex.toLowerCase() ? `2px solid ${RED}` : "1px solid #2E2E32",
                outlineOffset: 2 }} />
          ))}
        </div>
        <label style={s.colorRow}>
          <span style={s.fieldLabel}>Color libre</span>
          <input type="color" value={edgeColor} style={s.colorInput}
            onChange={(e) => setEdgeColor(e.target.value)} />
          <span style={s.fieldUnit}>{edgeColor}</span>
        </label>
        <Seg items={[{ id: "mate", label: "Mate" }, { id: "metal", label: "Metalico" }]}
          value={edgeMetal ? "metal" : "mate"} onPick={(o) => setEdgeMetal(o.id === "metal")} />
        {sourceType !== "texto" && product !== "lightbox" && (
          <>
            <div style={s.pLabel}>Color del logo</div>
            <Seg items={[{ id: "si", label: "Con color" }, { id: "no", label: "Acrilico liso" }]}
              value={useArt ? "si" : "no"} onPick={(o) => setUseArt(o.id === "si")} />
          </>
        )}
      </>
    ),
    texto: (() => {
      const nLines = Math.max(1, texto.split("\n").filter((l) => l.trim()).length);
      const resSel = resolverFuente(weightStep, fontStyle, customFont);
      const pctUsed = STROKE_PCT[resSel.usedStep] || STROKE_PCT[weightStep];
      const letterHmm = (altoM / nLines) * 1000;
      // Candado abierto: el trazo vertical real escala con el eje ancho
      // (X), no con el alto — relScale = proporcion pedida / proporcion
      // natural del texto. Sin este ajuste el aviso de trazo mostraria un
      // grosor que no es el que realmente queda tras deformar (una letra
      // condensada tiene los verticales mas finos de lo que dice la
      // tabla de grosores, calculada para texto sin deformar).
      const relScale = (!whLocked && textAspect) ? (anchoM / altoM) / textAspect : 1;
      const trazoMm = Math.round(pctUsed * letterHmm * relScale);
      const trazoColor = trazoMm < 20 ? "#e8000d" : trazoMm < 30 ? "#d99320" : "#8CE0A6";
      const deformPct = Math.round(relScale * 100);
      const deformFuerte = !whLocked && Math.abs(relScale - 1) > 0.4;
      return (
        <>
          <div style={s.pTitle}>Texto</div>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            maxLength={124}
            placeholder="Escribe el nombre&#10;hasta 3 líneas"
            style={s.textarea}
          />
          <div style={s.pHint}>Hasta 40 caracteres por línea, 3 líneas (Enter para separar).</div>

          <div style={s.pLabel}>Tamaño del letrero</div>
          <div style={s.fields}>
            <Field label="Ancho" value={anchoM}
              onChange={(v) => { setAnchoM(v); if (whLocked && textAspect) setAltoM(v / textAspect); }} />
            <Field label="Alto" value={altoM}
              onChange={(v) => { setAltoM(v); if (whLocked && textAspect) setAnchoM(v * textAspect); }} />
            <button type="button" onClick={() => setWhLocked((v) => !v)}
              title={whLocked ? "Proporción bloqueada — clic para deformar libremente" : "Proporción libre — clic para bloquear"}
              style={{ ...s.zBtn, alignSelf: "flex-end", marginBottom: 7 }}>
              <Icon name={whLocked ? "lock" : "unlock"} size={15} />
            </button>
          </div>
          <div style={s.pHint}>
            Ancho y alto en {unit === "cm" ? "centímetros" : "metros"}.{" "}
            {whLocked
              ? "Candado cerrado: los dos campos mantienen la proporción del texto, sin deformarlo."
              : "Candado abierto: cada campo es independiente y el texto se estira o se comprime para llenar el tamaño."}
          </div>
          {whLocked && textAspect && (() => {
            const neededW = altoM * textAspect;
            if (neededW <= anchoM * 1.01) return null;
            const pct = Math.max(1, Math.round((anchoM / neededW) * 100));
            return (
              <div style={{ ...s.note, borderColor: "#5a4418", color: "#e0c88c" }}>
                A esta altura de letra el texto necesita {neededW.toFixed(2)} m de ancho,
                pero la fachada tiene {anchoM.toFixed(2)} m — se ajustó para que entre
                (queda al {pct}% del tamaño pedido). Sube el Ancho o baja el Alto si lo
                quieres completo.
              </div>
            );
          })()}
          {!whLocked && textAspect && Math.abs(relScale - 1) > 0.02 && (
            <div style={{ ...s.note, borderColor: deformFuerte ? "#5a4418" : LINE, color: deformFuerte ? "#e0c88c" : DIM }}>
              Texto {relScale < 1 ? "condensado" : "extendido"} al {deformPct}% respecto a su proporción natural.
              {deformFuerte && " Deformación fuerte: el trazo queda más fino de lo normal y puede verse mal fabricado."}
            </div>
          )}

          <div style={s.pLabel}>Alineación</div>
          <Seg items={[{ id: "left", label: "Izq." }, { id: "center", label: "Centro" }, { id: "right", label: "Der." }]}
            value={textAlign} onPick={(o) => setTextAlign(o.id)} />
          <Seg items={[{ id: "si", label: "MAYÚSCULAS" }, { id: "no", label: "Normal" }]}
            value={upper ? "si" : "no"} onPick={(o) => setUpper(o.id === "si")} />
          <Slider label="Interlineado" value={lineHeightTx} unit="" min={0.8} max={1.6} step={0.05} onChange={setLineHeightTx} />
          <Slider label="Espaciado" value={Math.round(letterSpacing * 100)} unit=" %" min={-5} max={25} step={1}
            onChange={(v) => setLetterSpacing(v / 100)} />

          <div style={s.pLabel}>Grosor de la letra</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3 }}>
            {[1, 2, 3, 4, 5].map((st) => {
              const r = resolverFuente(st, fontStyle, null);
              const on = weightStep === st && !customFont;
              return (
                <button key={st} onClick={() => { setCustomFont(null); setWeightStep(st); }}
                  title={GROSOR_LABEL[st]}
                  style={{ ...s.segBtn, ...(on ? s.segOn : {}), flexDirection: "column", padding: "5px 2px", gap: 2 }}>
                  <span style={{ fontFamily: `"${r.family}", sans-serif`, fontWeight: r.weight, fontSize: 20, lineHeight: 1 }}>A</span>
                  <span style={{ fontSize: 6.5, letterSpacing: 0 }}>{GROSOR_LABEL[st].split(" ")[0]}</span>
                </button>
              );
            })}
          </div>

          <div style={s.pLabel}>Estilo</div>
          <Seg items={ESTILOS} value={fontStyle} onPick={(o) => { setCustomFont(null); setFontStyle(o.id); }} />

          {resSel.fell && !customFont && (
            <div style={s.note}>
              No hay ese grosor en {ESTILOS.find((e) => e.id === fontStyle)?.label}; se usó el más
              cercano ({GROSOR_LABEL[resSel.usedStep]}).
            </div>
          )}

          <div style={{ ...s.readout, marginTop: 10 }}>
            <div style={s.readLine}>
              <span>Trazo real</span>
              <b style={{ color: trazoColor }}>{trazoMm} mm</b>
            </div>
          </div>
          {trazoMm < 20 ? (
            <div style={{ ...s.note, borderColor: "#5a1a1a", color: "#F0A79C" }}>
              Trazo menor a 20 mm: no es fabricable como letra corpórea a esta medida.
              Sube el grosor o agranda el letrero.
            </div>
          ) : trazoMm < 30 ? (
            <div style={{ ...s.note, borderColor: "#5a4418", color: "#e0c88c" }}>
              Trazo bajo 30 mm: fabricable, pero encarece el armado.
            </div>
          ) : null}

          <div style={s.pLabel}>Fuente propia</div>
          <label style={{ ...s.segBtn, cursor: "pointer", justifyContent: "center", gap: 6 }}>
            <Icon name="upload" size={13} /> Cargar .ttf / .otf / .woff2
            <input type="file" accept=".ttf,.otf,.woff2,font/*" style={{ display: "none" }}
              onChange={(e) => cargarFuentePropia(e.target.files?.[0])} />
          </label>
          {customFont && (
            <button onClick={() => setCustomFont(null)} style={{ ...s.flatBtn, marginTop: 6, width: "100%" }}>
              Quitar fuente propia
            </button>
          )}
          {fontMsg && <div style={s.pHint}>{fontMsg}</div>}
        </>
      );
    })(),
    medidas: (
      <>
        <div style={s.pTitle}>Medidas</div>
        <div style={s.pLabel}>Donde va</div>
        <Seg items={SCENES} value={scene} onPick={pickScene} cols={1} />
        <div style={s.pLabel}>Unidad</div>
        <Seg items={[{ id: "cm", label: "Centimetros" }, { id: "m", label: "Metros" }]}
          value={unit} onPick={(u) => setUnit(u.id)} />
        <div style={s.pLabel}>Dimensiones</div>
        <div style={s.fields}>
          <Field label="Ancho" value={anchoM} onChange={setAnchoM} />
          <Field label="Alto" value={altoM} onChange={setAltoM} />
        </div>
        {(() => {
          const m = panelMetrics(anchoM, altoM);
          return (
            <div style={s.readout}>
              <div style={s.readLine}><span>Real</span><b>{Math.round(anchoM * 100)} x {Math.round(altoM * 100)} cm</b></div>
              <div style={s.readLine}><span>Escala de dibujo</span><b>1:{m.escala}</b></div>
              <div style={s.readLine}><span>Lienzo de arte</span><b>{m.pxW} x {m.pxH} px</b></div>
              <div style={s.readLine}><span>Densidad</span><b>{m.pxPorCm.toFixed(1)} px/cm</b></div>
            </div>
          );
        })()}
        <div style={s.pHint}>
          Sobre {LIMITE_1A1_CM} cm se dibuja a escala 1:10. El logo se ajusta dentro
          de las medidas sin deformarse.
        </div>
      </>
    ),
    fachada: scene === "foto" ? (
      <>
        <div style={s.pTitle}>Foto de la fachada</div>
        <label style={{ ...s.segBtn, cursor: "pointer", justifyContent: "center", gap: 6, display: "flex" }}>
          <Icon name="upload" size={13} /> {photoImg ? "Cambiar foto" : "Subir foto"}
          <input type="file" accept="image/*" capture="environment" style={{ display: "none" }}
            onChange={(e) => handlePhotoFile(e.target.files?.[0])} />
        </label>
        {!photoImg && <div style={s.pHint}>Sube una foto de la fachada real (galería o cámara) para montar el letrero encima.</div>}

        {photoImg && (
          <>
            <div style={s.pLabel}>Inclinación del letrero</div>
            <Slider label="Horizontal" value={photoTiltY} unit="°" min={-40} max={40} step={1} onChange={setPhotoTiltY} />
            <Slider label="Vertical" value={photoTiltX} unit="°" min={-25} max={25} step={1} onChange={setPhotoTiltX} />
            <div style={s.pHint}>Alinea el letrero al plano del muro de la foto, a ojo — no hay detección automática de perspectiva.</div>

            <div style={s.pLabel}>Escala real</div>
            {photoCalib ? (
              <div style={s.note}>
                Calibrado ✓ — toca "Recalibrar" si quieres medir otra referencia.
                <div style={{ marginTop: 6 }}>
                  <button onClick={reiniciarCalibracion} style={{ ...s.flatBtn, width: "100%" }}>Recalibrar</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ ...s.note, borderColor: "#5a4418", color: "#e0c88c" }}>
                  Sin calibrar: el tamaño del letrero sobre la foto es aproximado.
                </div>
                {!calibrating ? (
                  <button onClick={() => { setCalibPts([]); setCalibrating(true); }}
                    style={{ ...s.flatBtn, width: "100%", marginTop: 6 }}>
                    Medir con una referencia real
                  </button>
                ) : (
                  <div style={s.note}>
                    {calibPts.length < 2
                      ? `Toca 2 puntos sobre la foto que marquen algo de medida conocida (una puerta, un ladrillo...) — punto ${calibPts.length + 1} de 2.`
                      : "Listo. ¿Cuánto mide esa distancia real?"}
                    {calibPts.length === 2 && (
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <input type="number" step="0.01" min="0.01" value={calibInputM}
                          onChange={(e) => setCalibInputM(e.target.value)}
                          placeholder="metros" style={{ ...s.fieldInput, background: "#1A1A1E", border: `1px solid ${LINE}`, borderRadius: 5, padding: "4px 6px", width: 70 }} />
                        <button onClick={aplicarCalibracion} style={{ ...s.flatBtn, flex: 1 }}>Aplicar</button>
                      </div>
                    )}
                    <button onClick={() => { setCalibrating(false); setCalibPts([]); }}
                      style={{ ...s.flatBtn, width: "100%", marginTop: 6 }}>
                      Cancelar
                    </button>
                  </div>
                )}
              </>
            )}

            <div style={s.pLabel}>Luz de la foto</div>
            <Slider label="Dirección" value={photoLightDir} unit="°" min={0} max={360} step={5} onChange={setPhotoLightDir} />
            <Slider label="Ambiente" value={Math.round(photoAmbient * 100)} unit=" %" min={10} max={150} step={5}
              onChange={(v) => setPhotoAmbient(v / 100)} />
            <div style={s.pHint}>Ajusta hasta que la sombra del letrero se parezca a las sombras reales de la foto.</div>
          </>
        )}
      </>
    ) : (
      <>
        <div style={s.pTitle}>Fachada</div>
        <Seg items={[{ id: "si", label: "Con fachada" }, { id: "no", label: "Solo letrero" }]}
          value={showFacade ? "si" : "no"} onPick={(o) => setShowFacade(o.id === "si")} />
        {showFacade && (
          <>
            {scene === "fachada" && (
              <>
                <div style={s.pLabel}>Tipo de local</div>
                <Seg items={FACADE_STYLES} value={facadeStyle}
                  onPick={(f) => setFacadeStyle(f.id)} cols={1} />
                {facadeStyle === "esquina" && (
                  <Slider label="Pisos de altura" value={buildingFloors} unit="" min={0} max={14} step={1}
                    onChange={setBuildingFloors} />
                )}
                <div style={s.pLabel}>Medidas de la fachada</div>
                <Seg items={[{ id: "auto", label: "Automática" }, { id: "manual", label: "Personalizada" }]}
                  value={facadeAuto ? "auto" : "manual"} onPick={(o) => setFacadeAuto(o.id === "auto")} />
                {facadeAuto ? (
                  <div style={s.pHint}>El ancho del local se calcula solo, a partir del tamaño del letrero.</div>
                ) : (
                  <>
                    <div style={s.fields}>
                      <Field label="Ancho" value={facadeWidthM} onChange={setFacadeWidthM} />
                      <Field label="Alto" value={facadeHeightM} onChange={setFacadeHeightM} />
                    </div>
                    <div style={s.pHint}>Medida real del muro donde va el letrero — el local se construye a este tamaño, no al revés.</div>
                    {info && (() => {
                      const pctW = Math.round((info.realW / facadeWidthM) * 100);
                      const pctH = Math.round((info.realH / facadeHeightM) * 100);
                      const pct = Math.max(pctW, pctH);
                      if (pct > 100) {
                        return (
                          <div style={{ ...s.note, borderColor: "#5a2020", color: "#e89088" }}>
                            El letrero ({info.realW.toFixed(2)}×{info.realH.toFixed(2)} m) no entra en esta
                            fachada ({facadeWidthM.toFixed(2)}×{facadeHeightM.toFixed(2)} m). Tamaño máximo que
                            cabe: {pctW > 100 ? `${facadeWidthM.toFixed(2)} m de ancho` : ""}
                            {pctW > 100 && pctH > 100 ? " / " : ""}
                            {pctH > 100 ? `${facadeHeightM.toFixed(2)} m de alto` : ""}.
                          </div>
                        );
                      }
                      if (pct > 80) {
                        return (
                          <div style={{ ...s.note, borderColor: "#5a4418", color: "#e0c88c" }}>
                            Justo: el letrero ocupa {pct}% de la fachada, casi sin aire a los costados.
                          </div>
                        );
                      }
                      return <div style={s.pHint}>Entra bien: el letrero ocupa {pct}% de la fachada.</div>;
                    })()}
                  </>
                )}
              </>
            )}
            <div style={s.pLabel}>Material de la banda</div>
            <Seg items={MATERIALS} value={material} onPick={(m) => pickMaterial(m.id)} cols={2} />
            {material === "wallpanel" && (
              <>
                <div style={s.pLabel}>Orientación del panel</div>
                <Seg items={[{ id: "h", label: "Horizontal" }, { id: "v", label: "Vertical" }]}
                  value={wallPanelDir} onPick={(o) => setWallPanelDir(o.id)} />
                <Slider label="Ancho de tabla" value={wallPanelSize} unit=" cm" min={10} max={40} step={1}
                  onChange={setWallPanelSize} />
              </>
            )}
            <div style={s.pLabel}>Acabado</div>
            <Seg items={FINISHES.map((f) => ({ ...f, dot: f.hex }))} value={finish} onPick={pickFinish} cols={2} />
            <label style={s.colorRow}>
              <span style={s.fieldLabel}>Color libre</span>
              <input type="color" value={wallColor} style={s.colorInput}
                onChange={(e) => setWallColor(e.target.value)} />
              <span style={s.fieldUnit}>{wallColor}</span>
            </label>
          </>
        )}
      </>
    ),
    luz: (
      <>
        <div style={s.pTitle}>Luz</div>
        <Stack items={MODES} value={mode} onPick={(m) => setMode(m.id)} />
        <div style={s.pLabel}>Temperatura (LED blanco)</div>
        <Seg items={LIGHT_TEMPS.map((t) => ({ id: String(t.k), label: t.label }))}
          value={String(LIGHT_TEMPS.find((t) => kelvinToHex(t.k) === ledColor)?.k || "")}
          onPick={(o) => setLedColor(kelvinToHex(Number(o.id)))} cols={3} />
        <div style={s.pHint}>
          {LIGHT_TEMPS.find((t) => kelvinToHex(t.k) === ledColor)?.desc
            || "Elige una temperatura o un color de LED abajo — son excluyentes."}
        </div>
        <div style={s.pLabel}>Color del LED</div>
        <div style={s.swatches}>
          {LED_COLORS.map((c) => (
            <button key={c.hex} title={c.name} onClick={() => setLedColor(c.hex)}
              style={{ ...s.swatch, background: c.hex,
                outline: ledColor === c.hex ? `2px solid ${RED}` : "1px solid #2e2e32", outlineOffset: 2 }} />
          ))}
        </div>
      </>
    ),
    volumen: (
      <>
        <div style={s.pTitle}>Volumen</div>
        <Slider label="Canto" value={depthCm} unit=" cm" min={4} max={12} step={1} onChange={setDepthCm} />
        <div style={s.pHint}>
          {product === "lightbox"
            ? "Perfil de la caja, de 4 a 12 cm."
            : "Profundidad de la letra, de 4 a 12 cm."}
        </div>
        <div style={s.pLabel}>Montaje</div>
        <Slider label="Separacion del muro" value={standoffCm} unit=" cm" min={1} max={30} step={1} onChange={setStandoffCm} />
        <div style={s.pHint}>Mas separacion, halo mas ancho y difuso.</div>
      </>
    ),
    ajustes: (
      <>
        <div style={s.pTitle}>Ajustes</div>
        {product === "lightbox" ? (
          <div style={s.pHint}>La caja de luz no traza contornos: no hay nada que ajustar aca.</div>
        ) : (
          <>
            <div style={s.pHint}>Solo si el logo no se detecta bien.</div>
            <div style={s.pLabel}>Que tomar como letra</div>
            <Stack
              items={[
                { id: "alpha", label: "Fondo transparente" },
                { id: "dark", label: "Lo oscuro" },
                { id: "light", label: "Lo claro" },
              ]}
              value={detect} onPick={(d) => setDetect(d.id)} />
            <Slider label="Sensibilidad" value={threshold} unit="" min={30} max={240} step={5} onChange={setThreshold} />
            <Seg items={[{ id: "no", label: "Normal" }, { id: "si", label: "Invertido" }]}
              value={invert ? "si" : "no"} onPick={(o) => setInvert(o.id === "si")} />
          </>
        )}
      </>
    ),
  };

  return (
    <div style={{ padding: 10 }}>
      <div style={s.app}>
        {/* Barra superior */}
        <header style={s.top}>
          <div style={s.brand}>
            <span style={s.brandMark}>Prototipo de letrero</span>
            <span style={s.brandSub}>Vista 3D del logo</span>
          </div>
          <div style={s.topActions}>
            <label style={s.upload}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}>
              <input type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0])} />
              <Icon name="upload" size={16} />
              <span style={s.uploadTxt}>{fileName ? fileName.slice(0, 22) : "Subir logo"}</span>
            </label>
            <button onClick={loadSample} style={s.flatBtn}>Ejemplo</button>
            <div style={s.divider} />
            <button onClick={() => setNight(false)} title="De dia"
              style={{ ...s.iconBtn, ...(!night ? s.iconBtnOn : {}) }}><Icon name="sun" size={17} /></button>
            <button onClick={() => setNight(true)} title="De noche"
              style={{ ...s.iconBtn, ...(night ? s.iconBtnOn : {}) }}><Icon name="moon" size={17} /></button>
            <div style={s.divider} />
            <button onClick={enviarACotizacion} disabled={!fileName}
              style={{ ...s.secondaryBtn, ...(sent ? s.secondaryBtnOk : {}), ...(!fileName ? s.btnOff : {}) }}>
              <Icon name="send" size={15} /> {sent ? "Enviado" : "Enviar a cotización"}
            </button>
            <button onClick={download} disabled={!fileName}
              style={{ ...s.primaryBtn, ...(!fileName ? s.btnOff : {}) }}>
              <Icon name="download" size={15} /> Descargar
            </button>
          </div>
        </header>

        <div style={{ ...s.body, ...(narrow ? { flexDirection: "column" } : {}) }}>
          {/* Barra de herramientas */}
          <nav style={{ ...s.rail, ...(narrow ? s.railNarrow : {}) }}>
            {TOOLS.map((t) => (
              <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
                style={{ ...s.tool, ...(narrow ? s.toolNarrow : {}), ...(tool === t.id ? s.toolOn : {}) }}>
                <Icon name={t.icon} />
                <span style={s.toolLabel}>{t.label}</span>
              </button>
            ))}
          </nav>

          {/* Visor */}
          <main style={s.viewport}>
            <div ref={mountRef} style={{ ...s.canvasHost, ...(narrow ? { height: 360 } : {}) }} />

            {!fileName && !busy && (
              <div style={{ ...s.overlay, ...(narrow ? { height: 360 } : {}) }}>
                <div style={s.emptyTitle}>Sube tu logo</div>
                <div style={s.emptyText}>Arrastralo aqui o usa el boton de arriba</div>
              </div>
            )}
            {err && <div style={s.errBar}>{err}</div>}

            <div style={s.zoomBar}>
              <button onClick={() => setZoom((z) => clampZoom(z / 1.25))} title="Alejar" style={s.zBtn}><Icon name="minus" size={15} /></button>
              <span style={s.zVal}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => clampZoom(z * 1.25))} title="Acercar" style={s.zBtn}><Icon name="plus" size={15} /></button>
              <div style={s.zSep} />
              <button onClick={() => setZoom(1)} title="Encuadrar" style={s.zBtn}><Icon name="reset" size={15} /></button>
              <button onClick={() => setAutoRotate((v) => !v)} title="Giro automatico"
                style={{ ...s.zBtn, ...(autoRotate ? s.zBtnOn : {}) }}><Icon name="spin" size={15} /></button>
            </div>

            {info && (
              <div style={s.specs}>
                <div style={s.spec}><b style={s.specVal}>{info.realW.toFixed(2)} x {info.realH.toFixed(2)}</b><span style={s.specKey}>metros</span></div>
                <div style={s.spec}><b style={s.specVal}>{info.faceArea.toFixed(2)}</b><span style={s.specKey}>m2 de cara</span></div>
                <div style={s.spec}><b style={s.specVal}>{info.perim.toFixed(1)}</b><span style={s.specKey}>{info.product === "lightbox" ? "m de perfil" : "m de canto"}</span></div>
                <div style={s.spec}><b style={s.specVal}>{info.count}</b><span style={s.specKey}>{info.product === "lightbox" ? "placa" : "piezas"}</span></div>
              </div>
            )}
          </main>

          {/* Panel contextual */}
          <aside style={{ ...s.props, ...(narrow ? s.propsNarrow : {}) }}>{panels[tool]}</aside>
        </div>
      </div>
    </div>
  );
}

const s = {
  app: {
    display: "flex", flexDirection: "column", background: BLACK, borderRadius: 14,
    overflow: "hidden", fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    color: TXT, border: `1px solid ${LINE}`,
  },
  top: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
    padding: "8px 12px", borderBottom: `1px solid ${LINE}`, background: PANEL, flexWrap: "wrap",
  },
  brand: { display: "flex", flexDirection: "column", gap: 1 },
  brandMark: { color: TXT, fontWeight: 700, fontSize: 13, letterSpacing: 0.3 },
  brandSub: { fontSize: 9, color: DIM },
  topActions: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  upload: {
    display: "flex", alignItems: "center", gap: 7, background: "#1A1A1E",
    border: `1px solid ${LINE}`, borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: TXT,
  },
  uploadTxt: { fontSize: 10.5, fontWeight: 500, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  flatBtn: {
    background: "transparent", border: `1px solid ${LINE}`, color: DIM,
    borderRadius: 6, padding: "5px 9px", fontSize: 10, cursor: "pointer",
  },
  divider: { width: 1, height: 18, background: LINE },
  iconBtn: {
    background: "transparent", border: `1px solid ${LINE}`, color: DIM,
    borderRadius: 6, padding: 5, cursor: "pointer", display: "flex",
  },
  iconBtnOn: { borderColor: RED, background: "#1E1211", color: TXT },
  secondaryBtn: {
    display: "flex", alignItems: "center", gap: 7, background: "transparent",
    border: `1px solid ${RED}`, color: "#F0A79C", borderRadius: 6, padding: "6px 10px",
    fontSize: 10.5, fontWeight: 600, cursor: "pointer",
  },
  secondaryBtnOk: { background: "#12301C", borderColor: "#2f9e44", color: "#8CE0A6" },
  primaryBtn: {
    display: "flex", alignItems: "center", gap: 7, background: RED, border: "none",
    color: "#fff", borderRadius: 6, padding: "6px 10px", fontSize: 10.5, fontWeight: 600, cursor: "pointer",
  },
  btnOff: { opacity: 0.45, cursor: "not-allowed" },
  body: { display: "flex", alignItems: "stretch", minHeight: 0 },
  rail: {
    display: "flex", flexDirection: "column", gap: 2, padding: 5,
    borderRight: `1px solid ${LINE}`, background: PANEL, flexShrink: 0,
  },
  railNarrow: {
    flexDirection: "row", borderRight: "none", borderBottom: `1px solid ${LINE}`,
    overflowX: "auto", width: "100%",
  },
  tool: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    width: 48, padding: "6px 3px", background: "transparent", border: "1px solid transparent",
    borderRadius: 7, color: DIM, cursor: "pointer",
  },
  toolNarrow: { flexShrink: 0 },
  toolOn: { background: "#1E1211", borderColor: RED, color: TXT },
  toolLabel: { fontSize: 7.5, letterSpacing: 0.1, fontWeight: 600 },
  viewport: { flex: "1 1 auto", position: "relative", minWidth: 0, display: "flex", flexDirection: "column" },
  canvasHost: { width: "100%", height: 520, background: "#08080A" },
  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, height: 520, display: "flex",
    flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5,
    pointerEvents: "none", fontSize: 13, color: "#6A6A72",
  },
  emptyTitle: { fontSize: 15, color: "#7A7A84", fontWeight: 600 },
  emptyText: { fontSize: 12, color: "#4D4D55" },
  errBar: {
    position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
    background: "rgba(192,57,43,0.14)", border: `1px solid ${RED}`, color: "#F0A79C",
    fontSize: 11.5, padding: "7px 14px", borderRadius: 8, maxWidth: "80%",
  },
  zoomBar: {
    position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 4,
    background: "rgba(11,11,13,0.86)", border: `1px solid ${LINE}`, borderRadius: 7, padding: 3,
  },
  zBtn: { background: "transparent", border: "none", color: DIM, borderRadius: 5, padding: 4, cursor: "pointer", display: "flex" },
  zBtnOn: { background: "#1E1211", color: RED },
  zVal: { fontSize: 9.5, color: TXT, minWidth: 34, textAlign: "center", fontVariantNumeric: "tabular-nums" },
  zSep: { width: 1, height: 18, background: LINE, margin: "0 2px" },
  specs: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1,
    background: LINE, borderTop: `1px solid ${LINE}`,
  },
  spec: { background: PANEL, padding: "6px 8px", display: "flex", flexDirection: "column", gap: 0, alignItems: "center" },
  specVal: { fontSize: 11, fontWeight: 700, color: TXT, whiteSpace: "nowrap" },
  specKey: { fontSize: 8, color: DIM, letterSpacing: 0.2 },
  props: {
    width: 208, flexShrink: 0, borderLeft: `1px solid ${LINE}`, background: PANEL,
    padding: 11, overflowY: "auto", maxHeight: 570,
  },
  propsNarrow: {
    width: "100%", borderLeft: "none", borderTop: `1px solid ${LINE}`, maxHeight: "none",
  },
  pTitle: { fontSize: 11.5, fontWeight: 700, color: TXT, marginBottom: 9 },
  pLabel: {
    fontSize: 8, letterSpacing: 1.1, textTransform: "uppercase", color: RED,
    fontWeight: 700, marginTop: 12, marginBottom: 5,
  },
  pHint: { fontSize: 9.5, color: "#6A6A72", lineHeight: 1.45, marginTop: 8 },
  note: {
    marginTop: 7, fontSize: 9.5, color: DIM, lineHeight: 1.45,
    background: "#0E0E11", border: `1px solid ${LINE}`, borderRadius: 6, padding: "6px 8px",
  },
  seg: { display: "grid", gap: 3 },
  segBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
    background: "#1A1A1E", border: `1px solid ${LINE}`, color: "#B4B4BC",
    borderRadius: 5, padding: "5px 4px", fontSize: 9.5, cursor: "pointer", lineHeight: 1.15,
  },
  segOn: { borderColor: RED, background: "#1E1211", color: "#fff", fontWeight: 600 },
  dot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0, border: "1px solid rgba(255,255,255,0.25)" },
  stack: { display: "flex", flexDirection: "column", gap: 3 },
  card: {
    display: "flex", flexDirection: "column", gap: 2, background: "#1A1A1E",
    border: `1px solid ${LINE}`, borderRadius: 6, padding: "6px 8px",
    textAlign: "left", cursor: "pointer", color: "#C8C8D0", width: "100%",
  },
  cardOn: { borderColor: RED, background: "#1E1211", color: "#fff" },
  cardTitle: { fontSize: 10.5, fontWeight: 600 },
  cardDesc: { fontSize: 8.5, color: "#7D7D86" },
  fields: { display: "flex", gap: 6 },
  readout: {
    marginTop: 9, background: "#0E0E11", border: `1px solid ${LINE}`,
    borderRadius: 8, padding: "8px 10px",
  },
  readLine: {
    display: "flex", justifyContent: "space-between", gap: 8,
    fontSize: 9, color: DIM, padding: "2px 0",
  },
  field: {
    flex: 1, display: "flex", alignItems: "center", gap: 4, background: "#1A1A1E",
    border: `1px solid ${LINE}`, borderRadius: 5, padding: "4px 6px",
  },
  fieldLabel: { fontSize: 8.5, color: "#7D7D86", whiteSpace: "nowrap" },
  fieldInput: { flex: 1, width: "100%", minWidth: 0, background: "transparent", border: "none", color: "#fff", fontSize: 11, fontWeight: 600, outline: "none" },
  textarea: {
    width: "100%", boxSizing: "border-box", background: "#1A1A1E", border: `1px solid ${LINE}`,
    borderRadius: 6, padding: "8px 9px", color: "#fff", fontSize: 12, fontWeight: 600,
    fontFamily: "inherit", resize: "vertical", outline: "none", lineHeight: 1.35,
  },
  fieldUnit: { fontSize: 8.5, color: "#6E6E76" },
  colorRow: {
    display: "flex", alignItems: "center", gap: 8, marginTop: 8, background: "#1A1A1E",
    border: `1px solid ${LINE}`, borderRadius: 5, padding: "4px 6px", cursor: "pointer",
  },
  colorInput: { width: 24, height: 18, border: "none", background: "transparent", cursor: "pointer", padding: 0 },
  slider: { marginBottom: 10 },
  sliderHead: { display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "#9A9AA2", marginBottom: 4 },
  sliderVal: { color: TXT, fontVariantNumeric: "tabular-nums" },
  range: { width: "100%", accentColor: RED },
  swatches: { display: "flex", gap: 7, paddingLeft: 1 },
  swatch: { width: 17, height: 17, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0 },
};
