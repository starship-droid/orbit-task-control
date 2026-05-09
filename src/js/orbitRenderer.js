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
const CX = 350, CY = 230, RING_TILT = -0.18, RING_PARTICLES = 26;
const STATUS_RINGS = {
  todo:       { rx: 158, ry: 40, col: 'rgba(77,201,255,'  }, // inner — closest to saturn
  inprogress: { rx: 222, ry: 56, col: 'rgba(0,255,204,'   }, // outer
};
const RING_RX = STATUS_RINGS.todo.rx; // default radius (used by ellipsePoint)
const RING_RY = STATUS_RINGS.todo.ry;
const MINI_RX = 28, MINI_RY = 7;
const SELECTED_ANGLE = Math.PI / 2;

export let ringRotation = 0;
export let subTaskRotation = 0;
export let newTaskAnimating = null;

export function setNewTaskAnimating(val) {
  newTaskAnimating = val;
}

// ─── COMPLETION ANIMATIONS ────────────────────────────────────────────────────
export let completionAnimations = [];

export function addCompletionAnimation(taskIdx, n) {
  const task = state.tasks[taskIdx];
  if (!task) return;
  const ring = STATUS_RINGS[task.status] || STATUS_RINGS.todo;
  completionAnimations.push({
    taskId: task.id,
    angleOffset: (taskIdx / n) * Math.PI * 2,
    ringRx: ring.rx,
    ringRy: ring.ry,
    color: TASK_COLORS[taskIdx % TASK_COLORS.length],
    targetPos: starPos(task.id),
    progress: 0,
    ringExitPt: null,
  });
}

export function cancelCompletionAnimation(taskId) {
  completionAnimations = completionAnimations.filter(a => a.taskId !== taskId);
}

export function ellipsePoint(angle, rx = RING_RX, ry = RING_RY) {
  const x = CX + rx * Math.cos(angle), y = CY + ry * Math.sin(angle);
  const dx = x - CX, dy = y - CY;
  return { x: CX + dx * Math.cos(RING_TILT) - dy * Math.sin(RING_TILT), y: CY + dx * Math.sin(RING_TILT) + dy * Math.cos(RING_TILT) };
}

function getRotationForSelected(idx) {
  if (state.tasks.length === 0) return 0;
  const task = state.tasks[idx];
  if (!task || task.done) return ringRotation; // completed tasks leave the ring; don't snap
  return SELECTED_ANGLE - (idx / state.tasks.length) * Math.PI * 2;
}

// ─── COMPLETED TASK STARS ─────────────────────────────────────────────────────
function starPos(id) {
  let h = ((id * 1664525 + 1013904223) >>> 0);
  for (let attempt = 0; attempt < 30; attempt++) {
    const r1 = (h % 65536) / 65536;
    h = ((h * 1664525 + 1013904223) >>> 0);
    const r2 = (h % 65536) / 65536;
    h = ((h * 1664525 + 1013904223) >>> 0);
    const x = 30 + r1 * 640;
    const y = 25 + r2 * 410;
    const dx = (x - CX) / 260, dy = (y - CY) / 125;
    if (dx * dx + dy * dy > 1) return { x, y };
  }
  return { x: 40, y: 40 };
}

function drawCompletedStars(t) {
  const group = document.getElementById('completed-stars');
  group.innerHTML = '';
  const mk = (tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; };

  state.tasks.forEach((task, i) => {
    if (!task.done) return;
    if (completionAnimations.some(a => a.taskId === task.id)) return; // still animating in
    const { x, y } = starPos(task.id);
    const isSel = i === state.selectedIdx && state.mode === 'ring';
    const twinkle = 0.55 + 0.45 * Math.sin(t * 1.8 + (task.id % 100) * 0.37);

    // Outer glow
    group.appendChild(mk('circle', { cx: x, cy: y, r: isSel ? 18 : 9, fill: `rgba(0,255,204,${((isSel ? 0.22 : 0.07) * twinkle).toFixed(3)})`, filter: 'url(#taskGlow)' }));

    // 4-pointed star rays (+ and ×)
    const rl = isSel ? 11 : 6.5;
    [[1, 0], [0, 1], [0.707, 0.707], [-0.707, 0.707]].forEach(([dx, dy]) => {
      group.appendChild(mk('line', {
        x1: (x - dx * rl).toFixed(1), y1: (y - dy * rl).toFixed(1),
        x2: (x + dx * rl).toFixed(1), y2: (y + dy * rl).toFixed(1),
        stroke: '#00ffcc', 'stroke-width': isSel ? 1.3 : 0.8,
        opacity: ((isSel ? 0.95 : 0.5) * twinkle).toFixed(3),
      }));
    });

    // Core
    group.appendChild(mk('circle', { cx: x, cy: y, r: isSel ? 3.5 : 2.2, fill: '#00ffcc', opacity: (isSel ? 1 : (0.8 * twinkle)).toFixed(3) }));
  });
}

function drawCompletionAnimations() {
  if (!completionAnimations.length) return;
  const front = document.getElementById('tasks-front');
  const mk = (tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; };

  completionAnimations.forEach(anim => {
    const { progress, angleOffset, ringRx, ringRy, color, targetPos } = anim;

    if (progress < 0.5) {
      // ── Phase 1: accelerating orbit ──────────────────────────────────────────
      const t = progress / 0.5;
      const extraAngle = t * t * Math.PI * 3; // quadratic ease-in → ~1.5 extra orbits
      const angle = angleOffset + ringRotation + extraAngle;
      const pt = ellipsePoint(angle, ringRx, ringRy);

      // Speed trail — ghost copies at earlier angles, fading out
      for (let i = 3; i >= 1; i--) {
        const ta = angle - i * 0.14 * (1 + t * 4);
        const tp = ellipsePoint(ta, ringRx, ringRy);
        front.appendChild(mk('circle', { cx: tp.x.toFixed(1), cy: tp.y.toFixed(1), r: 9 - i * 1.5, fill: color.fill, opacity: ((0.28 - i * 0.06) * t).toFixed(3) }));
      }
      // Growing glow as it accelerates
      front.appendChild(mk('circle', { cx: pt.x.toFixed(1), cy: pt.y.toFixed(1), r: (20 + t * 8).toFixed(1), fill: color.glow.replace('0.8', (0.1 + t * 0.2).toFixed(2)), filter: 'url(#selectedGlow)' }));
      // Planet body (grows slightly)
      front.appendChild(mk('circle', { cx: pt.x.toFixed(1), cy: pt.y.toFixed(1), r: (10 + t * 3).toFixed(1), fill: color.fill }));

    } else if (progress < 0.8) {
      // ── Phase 2: launch streak toward star position ───────────────────────────
      if (!anim.ringExitPt) {
        // Snapshot the ring position at the moment of launch
        anim.ringExitPt = ellipsePoint(angleOffset + ringRotation + Math.PI * 3, ringRx, ringRy);
      }
      const t = (progress - 0.5) / 0.3;
      const ease = t * t * (3 - 2 * t); // smoothstep
      const x = anim.ringExitPt.x + (targetPos.x - anim.ringExitPt.x) * ease;
      const y = anim.ringExitPt.y + (targetPos.y - anim.ringExitPt.y) * ease;

      // Comet tail pointing back along travel direction
      const dx = targetPos.x - anim.ringExitPt.x, dy = targetPos.y - anim.ringExitPt.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const sl = (1 - ease) * 35;
      front.appendChild(mk('line', {
        x1: x.toFixed(1), y1: y.toFixed(1),
        x2: (x - dx / len * sl).toFixed(1), y2: (y - dy / len * sl).toFixed(1),
        stroke: color.fill, 'stroke-width': (4 - ease * 3).toFixed(1),
        opacity: ((1 - ease) * 0.8).toFixed(3),
      }));
      // Planet shrinking as it flies
      const r = 13 - ease * 10.5;
      front.appendChild(mk('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (r + 7).toFixed(1), fill: color.glow.replace('0.8', '0.2'), filter: 'url(#taskGlow)' }));
      front.appendChild(mk('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r.toFixed(1), fill: color.fill }));

    } else {
      // ── Phase 3: materialize as a star ───────────────────────────────────────
      const t = (progress - 0.8) / 0.2;
      const { x, y } = targetPos;

      // Expanding ring shockwave
      front.appendChild(mk('circle', { cx: x, cy: y, r: (t * 30).toFixed(1), fill: 'none', stroke: '#00ffcc', 'stroke-width': (3 - t * 2.5).toFixed(1), opacity: ((1 - t) * 0.7).toFixed(3) }));
      // Inner implosion glow
      front.appendChild(mk('circle', { cx: x, cy: y, r: (20 * (1 - t)).toFixed(1), fill: `rgba(0,255,204,${(0.25 * (1 - t)).toFixed(3)})`, filter: 'url(#selectedGlow)' }));
      // Star rays crystallising
      const rl = t * 11;
      [[1, 0], [0, 1], [0.707, 0.707], [-0.707, 0.707]].forEach(([vx, vy]) => {
        front.appendChild(mk('line', {
          x1: (x - vx * rl).toFixed(1), y1: (y - vy * rl).toFixed(1),
          x2: (x + vx * rl).toFixed(1), y2: (y + vy * rl).toFixed(1),
          stroke: '#00ffcc', 'stroke-width': 1.3, opacity: t.toFixed(3),
        }));
      });
      // Core snapping into place
      front.appendChild(mk('circle', { cx: x, cy: y, r: 2.5, fill: '#00ffcc', opacity: t.toFixed(3) }));
    }
  });
}

function drawRing(rot) {
  const behind = document.getElementById('ring-behind'), front = document.getElementById('ring-front');
  behind.innerHTML = ''; front.innerHTML = '';

  // Draw one ring band per status, each with its own colour
  Object.values(STATUS_RINGS).forEach(({ rx, ry, col }) => {
    [{ scale: 1.0, op: 0.55, sw: 1.2 }, { scale: 0.88, op: 0.35, sw: 0.8 }, { scale: 1.12, op: 0.25, sw: 0.6 }].forEach(r => {
      const pts = [];
      for (let a = 0; a <= Math.PI * 2; a += 0.05) {
        const px = CX + rx * r.scale * Math.cos(a), py = CY + ry * r.scale * Math.sin(a);
        const dx = px - CX, dy = py - CY;
        pts.push([CX + dx * Math.cos(RING_TILT) - dy * Math.sin(RING_TILT), CY + dx * Math.sin(RING_TILT) + dy * Math.cos(RING_TILT)]);
      }
      const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ') + 'Z';
      const mkP = (stroke, sw) => { const e = document.createElementNS('http://www.w3.org/2000/svg', 'path'); e.setAttribute('d', d); e.setAttribute('fill', 'none'); e.setAttribute('stroke', stroke); e.setAttribute('stroke-width', sw); return e; };
      behind.appendChild(mkP(`${col}${r.op * 0.6})`, r.sw));
      front.appendChild(mkP(`${col}${r.op})`, r.sw));
    });

    for (let i = 0; i < RING_PARTICLES; i++) {
      const angle = (i / RING_PARTICLES) * Math.PI * 2 + rot;
      const rv = Math.sin(i * 7.3) * 0.18 + Math.cos(i * 3.1) * 0.08;
      const px = CX + rx * (1 + rv) * Math.cos(angle), py = CY + ry * (1 + rv * 0.4) * Math.sin(angle);
      const dx = px - CX, dy = py - CY;
      const fx = CX + dx * Math.cos(RING_TILT) - dy * Math.sin(RING_TILT);
      const fy = CY + dx * Math.sin(RING_TILT) + dy * Math.cos(RING_TILT);
      const sz = i % 5 === 0 ? 2.8 : i % 3 === 0 ? 1.8 : 1.0;
      const pcol = i % 5 === 0 ? `${col}0.7)` : i % 3 === 0 ? `${col}0.5)` : `${col}0.35)`;
      const mkC = (op) => { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', fx); c.setAttribute('cy', fy); c.setAttribute('r', sz); c.setAttribute('fill', pcol); c.setAttribute('opacity', op); return c; };
      behind.appendChild(mkC(0.4));
      front.appendChild(mkC(1.0));
    }
  });
}

function drawTasks(rot) {
  const front = document.getElementById('tasks-front'), beh = document.getElementById('tasks-behind');
  front.innerHTML = ''; beh.innerHTML = '';
  if (!state.tasks.length) return;
  const mk = (tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; };

  state.tasks.forEach((task, i) => {
    if (task.done) return; // completed tasks leave the ring and become stars
    const ring = STATUS_RINGS[task.status] || STATUS_RINGS.todo;
    const angle = (i / state.tasks.length) * Math.PI * 2 + rot;
    const pt = ellipsePoint(angle, ring.rx, ring.ry);
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

    // Gold importance aura — drawn before planet so it sits behind
    if (task.important && !task.done) {
      target.appendChild(mk('circle', { cx: pt.x, cy: pt.y, r: r + 16, fill: 'rgba(255,200,87,0.14)', filter: 'url(#selectedGlow)', opacity }));
      target.appendChild(mk('circle', { cx: pt.x, cy: pt.y, r: r + 8, fill: 'none', stroke: '#ffc857', 'stroke-width': '1.5', opacity: opacity * 0.9 }));
    }
    // Task planet body (drawn on top of its ring + subtask dots)
    target.appendChild(mk('circle', { cx: pt.x, cy: pt.y, r: r + 6, fill: col.glow.replace('0.8', '0.18'), filter: 'url(#taskGlow)', opacity }));
    target.appendChild(mk('circle', { cx: pt.x, cy: pt.y, r, fill: task.done ? 'rgba(0,255,204,0.3)' : col.fill, opacity, ...(isSel ? { filter: 'url(#selectedGlow)', stroke: 'rgba(255,255,255,0.6)', 'stroke-width': '1.5' } : {}), ...(task.done ? { stroke: '#00ffcc', 'stroke-width': '1.5' } : {}) }));
    if (task.done) { const ck = mk('text', { x: pt.x, y: pt.y + 3, 'text-anchor': 'middle', 'font-size': '8', fill: '#00ffcc', opacity }); ck.textContent = '✓'; target.appendChild(ck); }
    if (task.important && !task.done) {
      const s = mk('text', { x: pt.x, y: pt.y - r - 7, 'text-anchor': 'middle', 'font-size': '11', fill: '#ffc857', opacity });
      s.textContent = '★'; target.appendChild(s);
    }
  });

  if (newTaskAnimating) {
    const { angle, progress, color } = newTaskAnimating;
    const pt = ellipsePoint(angle, STATUS_RINGS.todo.rx, STATUS_RINGS.todo.ry);
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
    completionAnimations.forEach(a => { a.progress += dt / 1600; });
    completionAnimations = completionAnimations.filter(a => a.progress < 1);
    const es = document.getElementById('empty-svg-state');
    if (es) es.style.display = state.tasks.length === 0 ? 'block' : 'none';
    if (state.currentView === 'saturn') { drawRing(ringRotation); drawCompletedStars(subTaskRotation); drawTasks(ringRotation); drawCompletionAnimations(); }
    onFrame();
    requestAnimationFrame(animLoop);
  }
  requestAnimationFrame(animLoop);
}
