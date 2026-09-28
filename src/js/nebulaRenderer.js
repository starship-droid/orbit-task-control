import { state } from './taskStore.js';

// ─── LAYOUT ──────────────────────────────────────────────────────────────────
const GOLDEN_ANGLE = 2.399963;
const SPIRAL_K = 110;      // spacing between habit "home points"
const SCATTER_R = 42;      // radius stars scatter within around a home point
const BASE_VB_W = 700, BASE_VB_H = 460; // matches Saturn's viewBox proportions
const FOCUS_ZOOM = 0.32;   // zoomed-in-on-one-constellation level
const OVERVIEW_ZOOM = 1;   // default zoom when nothing selected
const EASE = 0.08;
const MIN_ZOOM = 0.15, MAX_ZOOM = 3.5;

export function homePoint(i) {
  const angle = i * GOLDEN_ANGLE;
  const radius = SPIRAL_K * Math.sqrt(i + 1);
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

function hashStr(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

// Deterministic "mystery" scatter — same LCG technique as orbitRenderer.js's starPos().
export function starOffset(habitId, dateStr, radius = SCATTER_R) {
  let h = ((habitId ^ hashStr(dateStr)) >>> 0);
  h = ((h * 1664525 + 1013904223) >>> 0);
  const r1 = (h % 65536) / 65536;
  h = ((h * 1664525 + 1013904223) >>> 0);
  const r2 = (h % 65536) / 65536;
  const r = radius * Math.sqrt(r1);
  const theta = r2 * Math.PI * 2;
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ─── CAMERA ──────────────────────────────────────────────────────────────────
let cam = { x: 0, y: 0, zoom: OVERVIEW_ZOOM };
let camTarget = null;
let autoTrack = true;
let lastTrackedIdx = -2;
let dragging = false;

// ─── DRAW ────────────────────────────────────────────────────────────────────
// Level of detail: from afar a habit is just a nebula cloud (its colour and
// density are all you see). Only the selected habit, as the camera eases in
// on it, resolves into its individual check-in stars and the lines
// connecting them — the "mystery" constellation. Every other habit stays a
// cloud regardless of camera position; the reveal is tied to selection, not
// raw proximity, so it matches the keyboard-driven select-then-zoom flow.
function drawNebula(t) {
  const group = document.getElementById('nebula-stars');
  if (!group) return;
  group.innerHTML = '';
  const mk = (tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; };

  state.habits.forEach((habit, i) => {
    const home = homePoint(i);
    const isSel = i === state.selectedHabitIdx && state.currentView === 'nebula';
    // 1 = fully a cloud (overview zoom), 0 = fully resolved into stars (focus zoom)
    const cloudT = isSel ? clamp((cam.zoom - FOCUS_ZOOM) / (OVERVIEW_ZOOM - FOCUS_ZOOM), 0, 1) : 1;
    const starT = 1 - cloudT;
    const density = Math.min(habit.checkins.length, 30);
    const cloudR = 22 + density * 1.4;

    if (isSel) {
      group.appendChild(mk('circle', { cx: home.x.toFixed(1), cy: home.y.toFixed(1), r: (cloudR + 10).toFixed(1), fill: 'none', stroke: 'rgba(255,255,255,0.35)', 'stroke-width': 1 }));
    }

    // ── Nebula cloud (overview representation) ──
    if (cloudT > 0.02) {
      group.appendChild(mk('circle', { cx: home.x.toFixed(1), cy: home.y.toFixed(1), r: cloudR.toFixed(1), fill: hexToRgba(habit.color, ((0.14 + density * 0.006) * cloudT).toFixed(3)), filter: 'url(#cloudBlur)' }));
      group.appendChild(mk('circle', { cx: home.x.toFixed(1), cy: home.y.toFixed(1), r: (cloudR * 0.5).toFixed(1), fill: hexToRgba(habit.color, ((0.22 + density * 0.008) * cloudT).toFixed(3)), filter: 'url(#cloudBlur)' }));
    }

    // ── Resolved constellation (only the selected habit, once zoomed in) ──
    if (starT > 0.02) {
      const sorted = [...habit.checkins].sort();
      const pts = sorted.map(d => { const off = starOffset(habit.id, d); return { x: home.x + off.x, y: home.y + off.y }; });
      for (let k = 1; k < pts.length; k++) {
        group.appendChild(mk('line', { x1: pts[k - 1].x.toFixed(1), y1: pts[k - 1].y.toFixed(1), x2: pts[k].x.toFixed(1), y2: pts[k].y.toFixed(1), stroke: habit.color, 'stroke-width': 0.6, opacity: (0.35 * starT).toFixed(3) }));
      }
      pts.forEach(p => {
        const twinkle = 0.6 + 0.4 * Math.sin(t * 0.0018 + (habit.id % 100) * 0.31 + p.x);
        group.appendChild(mk('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 5, fill: hexToRgba(habit.color, (0.25 * twinkle * starT).toFixed(3)), filter: 'url(#taskGlow)' }));
        group.appendChild(mk('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 1.8, fill: habit.color, opacity: ((0.7 + 0.3 * twinkle) * starT).toFixed(3) }));
      });
    }
  });
}

function fitAllTarget() {
  if (!state.habits.length) return { x: 0, y: 0, zoom: OVERVIEW_ZOOM };
  const pts = state.habits.map((_, i) => homePoint(i));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs) - SCATTER_R, maxX = Math.max(...xs) + SCATTER_R;
  const minY = Math.min(...ys) - SCATTER_R, maxY = Math.max(...ys) + SCATTER_R;
  const w = Math.max(maxX - minX, 1), h = Math.max(maxY - minY, 1);
  // Floor at OVERVIEW_ZOOM — with few/close-together habits the content
  // bounding box alone can be tighter than the already-zoomed-in focus level,
  // which would make "zoom to fit" fail to actually zoom out. "Fit" should
  // always mean "at least the standard overview," never tighter than that.
  const zoom = Math.min(MAX_ZOOM, Math.max(OVERVIEW_ZOOM, Math.max(w / BASE_VB_W, h / BASE_VB_H) * 1.25));
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom };
}

export function zoomToFit() {
  camTarget = fitAllTarget();
  autoTrack = true;
}

function updateCamera() {
  if (!autoTrack) return;
  if (state.selectedHabitIdx !== lastTrackedIdx) {
    lastTrackedIdx = state.selectedHabitIdx;
    if (state.selectedHabitIdx >= 0 && state.habits[state.selectedHabitIdx]) {
      camTarget = { ...homePoint(state.selectedHabitIdx), zoom: FOCUS_ZOOM };
    } else {
      camTarget = fitAllTarget();
    }
  }
  if (camTarget) {
    cam.x += (camTarget.x - cam.x) * EASE;
    cam.y += (camTarget.y - cam.y) * EASE;
    cam.zoom += (camTarget.zoom - cam.zoom) * EASE;
  }
}

function applyViewBox(svg) {
  const w = BASE_VB_W * cam.zoom, h = BASE_VB_H * cam.zoom;
  svg.setAttribute('viewBox', `${(cam.x - w / 2).toFixed(1)} ${(cam.y - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
}

// ─── MOUSE / WHEEL (secondary to keyboard, for free rearranging) ────────────
function wireInteraction(svg) {
  let last = null;
  svg.addEventListener('mousedown', e => { dragging = true; autoTrack = false; last = { x: e.clientX, y: e.clientY }; svg.style.cursor = 'grabbing'; });
  window.addEventListener('mouseup', () => { dragging = false; svg.style.cursor = 'grab'; });
  window.addEventListener('mousemove', e => {
    if (!dragging || !last) return;
    const rect = svg.getBoundingClientRect();
    const scale = (BASE_VB_W * cam.zoom) / rect.width;
    cam.x -= (e.clientX - last.x) * scale;
    cam.y -= (e.clientY - last.y) * scale;
    last = { x: e.clientX, y: e.clientY };
  });
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    autoTrack = false;
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    cam.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.zoom * factor));
  }, { passive: false });
}

// ─── LOOP ────────────────────────────────────────────────────────────────────
export function startNebulaLoop() {
  const svg = document.getElementById('nebula-canvas');
  if (!svg) return;
  svg.style.cursor = 'grab';
  wireInteraction(svg);

  function loop(t) {
    if (state.currentView === 'nebula') {
      updateCamera();
      applyViewBox(svg);
      drawNebula(t);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
