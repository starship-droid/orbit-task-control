import { state, TASK_COLORS } from './taskStore.js';

// ─── STARS ───────────────────────────────────────────────────────────────────
(function () {
  const cv = document.getElementById('starfield'), ctx = cv.getContext('2d');
  function resize() { cv.width = innerWidth; cv.height = innerHeight; } resize();
  window.addEventListener('resize', resize);
  const stars = Array.from({ length: 200 }, () => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.2,
    op: Math.random() * 0.7 + 0.1, speed: Math.random() * 0.012 + 0.004, phase: Math.random() * Math.PI * 2,
  }));
  const shoots = [];
  function maybeShoot() {
    if (Math.random() < 0.3) shoots.push({ x: Math.random() * cv.width, y: Math.random() * cv.height * 0.5, vx: (Math.random() * 4 + 3) * (Math.random() < 0.5 ? 1 : -1), vy: Math.random() * 2 + 1, op: 0.9 });
    setTimeout(maybeShoot, Math.random() * 4000 + 2000);
  }
  maybeShoot();
  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height); t += 0.016;
    stars.forEach(s => {
      ctx.beginPath(); ctx.arc(s.x * cv.width, s.y * cv.height, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.op * (0.5 + 0.5 * Math.sin(t * s.speed * 60 + s.phase))})`; ctx.fill();
    });
    shoots.forEach((s, i) => {
      s.x += s.vx; s.y += s.vy; s.op -= 0.025;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 10, s.y - s.vy * 10);
      const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 10, s.y - s.vy * 10);
      g.addColorStop(0, `rgba(180,210,255,${s.op})`); g.addColorStop(1, 'transparent');
      ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.stroke();
      if (s.op <= 0) shoots.splice(i, 1);
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ─── NEBULAS ─────────────────────────────────────────────────────────────────
(function () {
  [
    { color: 'rgba(80,0,180,0.18)', size: 500, top: '10%', left: '5%', delay: '0s' },
    { color: 'rgba(0,60,180,0.14)', size: 400, top: '60%', left: '70%', delay: '5s' },
    { color: 'rgba(140,0,180,0.1)', size: 600, top: '40%', left: '40%', delay: '10s' },
  ].forEach(c => {
    const el = document.createElement('div'); el.className = 'nebula-cloud';
    el.style.cssText = `background:radial-gradient(circle,${c.color},transparent 70%);width:${c.size}px;height:${c.size}px;top:${c.top};left:${c.left};animation-delay:${c.delay};`;
    document.getElementById('cosmos').appendChild(el);
  });
})();

// ─── SATURN ENGINE ───────────────────────────────────────────────────────────
const CX = 350, CY = 230, RING_RX = 210, RING_RY = 52, RING_TILT = -0.18, RING_PARTICLES = 80;
const MINI_RX = 28, MINI_RY = 7;
const SELECTED_ANGLE = Math.PI / 2;

export let ringRotation = 0;
export let subTaskRotation = 0;
export let newTaskAnimating = null;

export function setNewTaskAnimating(val) {
  newTaskAnimating = val;
}

export function ellipsePoint(angle) {
  const x = CX + RING_RX * Math.cos(angle), y = CY + RING_RY * Math.sin(angle);
  const dx = x - CX, dy = y - CY;
  return { x: CX + dx * Math.cos(RING_TILT) - dy * Math.sin(RING_TILT), y: CY + dx * Math.sin(RING_TILT) + dy * Math.cos(RING_TILT) };
}

function getRotationForSelected(idx) {
  return state.tasks.length === 0 ? 0 : SELECTED_ANGLE - (idx / state.tasks.length) * Math.PI * 2;
}

function drawRing(rot) {
  const behind = document.getElementById('ring-behind'), front = document.getElementById('ring-front');
  behind.innerHTML = ''; front.innerHTML = '';

  // Ellipse outlines — each drawn in both groups; clipPaths trim them to correct halves
  [{ scale: 1.0, op: 0.55, sw: 1.2 }, { scale: 0.88, op: 0.35, sw: 0.8 }, { scale: 1.12, op: 0.25, sw: 0.6 }].forEach(r => {
    const pts = [];
    for (let a = 0; a <= Math.PI * 2; a += 0.05) {
      const px = CX + RING_RX * r.scale * Math.cos(a), py = CY + RING_RY * r.scale * Math.sin(a);
      const dx = px - CX, dy = py - CY;
      pts.push([CX + dx * Math.cos(RING_TILT) - dy * Math.sin(RING_TILT), CY + dx * Math.sin(RING_TILT) + dy * Math.cos(RING_TILT)]);
    }
    const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ') + 'Z';
    const mk = (col, sw) => { const e = document.createElementNS('http://www.w3.org/2000/svg', 'path'); e.setAttribute('d', d); e.setAttribute('fill', 'none'); e.setAttribute('stroke', col); e.setAttribute('stroke-width', sw); return e; };
    behind.appendChild(mk(`rgba(160,150,200,${r.op * 0.6})`, r.sw));
    front.appendChild(mk(`rgba(200,190,230,${r.op})`, r.sw));
  });

  // Dust particles — add each to BOTH groups; clipPaths handle which half is visible
  for (let i = 0; i < RING_PARTICLES; i++) {
    const angle = (i / RING_PARTICLES) * Math.PI * 2 + rot;
    const rv = Math.sin(i * 7.3) * 0.18 + Math.cos(i * 3.1) * 0.08;
    const px = CX + RING_RX * (1 + rv) * Math.cos(angle), py = CY + RING_RY * (1 + rv * 0.4) * Math.sin(angle);
    const dx = px - CX, dy = py - CY;
    const fx = CX + dx * Math.cos(RING_TILT) - dy * Math.sin(RING_TILT);
    const fy = CY + dx * Math.sin(RING_TILT) + dy * Math.cos(RING_TILT);
    const sz = i % 5 === 0 ? 2.8 : i % 3 === 0 ? 1.8 : 1.0;
    const col = i % 5 === 0 ? 'rgba(200,190,220,0.7)' : i % 3 === 0 ? 'rgba(170,160,200,0.5)' : 'rgba(140,130,170,0.35)';
    const mkC = (op) => { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', fx); c.setAttribute('cy', fy); c.setAttribute('r', sz); c.setAttribute('fill', col); c.setAttribute('opacity', op); return c; };
    behind.appendChild(mkC(0.4));
    front.appendChild(mkC(1.0));
  }
}

function drawTasks(rot) {
  const front = document.getElementById('tasks-front'), beh = document.getElementById('tasks-behind');
  front.innerHTML = ''; beh.innerHTML = '';
  if (!state.tasks.length) return;
  const mk = (tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; };

  state.tasks.forEach((task, i) => {
    const angle = (i / state.tasks.length) * Math.PI * 2 + rot;
    const pt = ellipsePoint(angle);
    const col = TASK_COLORS[i % TASK_COLORS.length];
    const isSel = (i === state.selectedIdx) && state.mode === 'ring';
    const r = isSel ? 11 : (task.done ? 6 : 8);
    const isBehind = pt.y < CY;
    const target = isBehind ? beh : front;
    const opacity = isBehind ? 0.18 : 1.0;
    const subs = task.subtasks || [];

    if (subs.length > 0) {
      // Mini-ring bands around the task planet
      [{ scale: 1.0, op: 0.65, sw: 1.0 }, { scale: 0.78, op: 0.38, sw: 0.55 }, { scale: 1.22, op: 0.28, sw: 0.45 }].forEach(band => {
        const pts = [];
        for (let a = 0; a <= Math.PI * 2; a += 0.22) {
          const px = pt.x + MINI_RX * band.scale * Math.cos(a), py = pt.y + MINI_RY * band.scale * Math.sin(a);
          const dx = px - pt.x, dy = py - pt.y;
          pts.push([pt.x + dx * Math.cos(RING_TILT) - dy * Math.sin(RING_TILT), pt.y + dx * Math.sin(RING_TILT) + dy * Math.cos(RING_TILT)]);
        }
        const d = pts.map((p, j) => (j === 0 ? `M${p[0].toFixed(1)},${p[1].toFixed(1)}` : `L${p[0].toFixed(1)},${p[1].toFixed(1)}`)).join(' ') + 'Z';
        target.appendChild(mk('path', { d, fill: 'none', stroke: `rgba(200,180,235,${band.op * opacity})`, 'stroke-width': band.sw }));
      });

      // Subtask dots orbiting the task planet
      subs.forEach((sub, j) => {
        const sa = (j / subs.length) * Math.PI * 2 + subTaskRotation;
        const sx = pt.x + MINI_RX * Math.cos(sa), sy = pt.y + MINI_RY * Math.sin(sa);
        const sdx = sx - pt.x, sdy = sy - pt.y;
        const spx = pt.x + sdx * Math.cos(RING_TILT) - sdy * Math.sin(RING_TILT);
        const spy = pt.y + sdx * Math.sin(RING_TILT) + sdy * Math.cos(RING_TILT);
        const sc = TASK_COLORS[(i + j + 2) % TASK_COLORS.length];
        const sr = sub.done ? 2.2 : 3.2;
        target.appendChild(mk('circle', { cx: spx, cy: spy, r: sr + 2.5, fill: sc.glow.replace('0.8', '0.15'), opacity }));
        target.appendChild(mk('circle', { cx: spx, cy: spy, r: sr, fill: sub.done ? 'rgba(0,255,204,0.45)' : sc.fill, opacity, ...(sub.done ? { stroke: '#00ffcc', 'stroke-width': '0.8' } : {}) }));
      });
    }

    // Task planet body (drawn on top of its ring + subtask dots)
    target.appendChild(mk('circle', { cx: pt.x, cy: pt.y, r: r + 6, fill: col.glow.replace('0.8', '0.18'), filter: 'url(#taskGlow)', opacity }));
    target.appendChild(mk('circle', { cx: pt.x, cy: pt.y, r, fill: task.done ? 'rgba(0,255,204,0.3)' : col.fill, opacity, ...(isSel ? { filter: 'url(#selectedGlow)', stroke: 'rgba(255,255,255,0.6)', 'stroke-width': '1.5' } : {}), ...(task.done ? { stroke: '#00ffcc', 'stroke-width': '1.5' } : {}) }));
    if (task.done) { const ck = mk('text', { x: pt.x, y: pt.y + 3, 'text-anchor': 'middle', 'font-size': '8', fill: '#00ffcc', opacity }); ck.textContent = '✓'; target.appendChild(ck); }
  });

  if (newTaskAnimating) {
    const { angle, progress, color } = newTaskAnimating;
    const pt = ellipsePoint(angle);
    const r = progress < 0.4 ? (progress / 0.4) * 14 : progress < 0.7 ? 14 - ((progress - 0.4) / 0.3) * 6 : 8;
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); c.setAttribute('r', r); c.setAttribute('fill', color.fill); c.setAttribute('opacity', Math.min(1, progress * 3));
    front.appendChild(c);
  }
}

// ─── ANIMATION LOOP ───────────────────────────────────────────────────────────
export function startAnimLoop(onFrame) {
  let lastTime = 0;
  function animLoop(ts) {
    const dt = ts - lastTime; lastTime = ts;
    ringRotation += 0.0004 * dt;
    subTaskRotation += 0.0014 * dt;
    if (state.mode === 'ring' && state.tasks.length > 0) {
      const target = getRotationForSelected(state.selectedIdx);
      let diff = target - (ringRotation % (Math.PI * 2));
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ringRotation += diff * 0.08;
    }
    if (newTaskAnimating) { newTaskAnimating.progress += dt / 700; if (newTaskAnimating.progress >= 1) newTaskAnimating = null; }
    const es = document.getElementById('empty-svg-state');
    if (es) es.style.display = state.tasks.length === 0 ? 'block' : 'none';
    if (state.currentView === 'saturn') { drawRing(ringRotation); drawTasks(ringRotation); }
    onFrame();
    requestAnimationFrame(animLoop);
  }
  requestAnimationFrame(animLoop);
}
