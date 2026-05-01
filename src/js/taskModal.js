import { state, COLORS, TASK_COLORS, save } from './taskStore.js';
import { ringRotation, setNewTaskAnimating } from './orbitRenderer.js';

// ─── SETTINGS ────────────────────────────────────────────────────────────────
let settingsOpen = false;

export function toggleSettings() {
  settingsOpen = !settingsOpen;
  document.getElementById('settings-modal').classList.toggle('open', settingsOpen);
  document.getElementById('settings-btn').classList.toggle('open', settingsOpen);
}

export function isSettingsOpen() { return settingsOpen; }

document.addEventListener('click', e => {
  if (!settingsOpen) return;
  if (!document.getElementById('settings-modal').contains(e.target) && !document.getElementById('settings-btn').contains(e.target)) toggleSettings();
});

// ─── MODE ────────────────────────────────────────────────────────────────────
export function setMode(m) {
  state.mode = m;
  const ind = document.getElementById('mode-indicator');
  ind.className = m !== 'normal' ? m : '';
  ind.textContent = { normal: 'ORBIT CONTROL', adding: 'ADDING MISSION', 'adding-sub': 'ADD SUBTASK', ring: 'RING NAVIGATION', editing: 'EDITING MISSION' }[m] || 'ORBIT CONTROL';
}

// ─── VIEW TOGGLE ─────────────────────────────────────────────────────────────
export function toggleView() {
  state.selectedSubIdx = -1;
  const sv = document.getElementById('saturn-view'), lv = document.getElementById('list-view');
  if (state.currentView === 'saturn') {
    sv.className = 'view offleft'; lv.className = 'view active';
    state.currentView = 'list'; renderList();
  } else {
    sv.className = 'view active'; lv.className = 'view offright';
    state.currentView = 'saturn';
  }
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
let toastTimer;
export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
}

// ─── PARTICLES ───────────────────────────────────────────────────────────────
export function burst(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div'); p.className = 'particle';
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.5, d = 30 + Math.random() * 55, s = 2 + Math.random() * 4;
    p.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s}px;background:${color};box-shadow:0 0 ${s * 2}px ${color};--tx:${Math.cos(a) * d}px;--ty:${Math.sin(a) * d}px;`;
    document.body.appendChild(p); p.addEventListener('animationend', () => p.remove());
  }
  const ring = document.createElement('div'); ring.className = 'orbit-ring-fx';
  ring.style.cssText = `left:${x}px;top:${y}px;width:30px;height:30px;border-color:${color};`;
  document.body.appendChild(ring); ring.addEventListener('animationend', () => ring.remove());
}

export function warpEffect() {
  for (let i = 0; i < 8; i++) {
    const l = document.createElement('div'); l.className = 'warp-line';
    l.style.cssText = `left:${10 + Math.random() * 80}vw;--x:${(Math.random() - 0.5) * 20}px;animation-delay:${Math.random() * 0.2}s;`;
    document.body.appendChild(l); l.addEventListener('animationend', () => l.remove());
  }
}

// ─── TASK BOX ────────────────────────────────────────────────────────────────
export function updateTaskBox() {
  const box = document.getElementById('selected-task-box');
  const textEl = document.getElementById('task-box-text'), metaEl = document.getElementById('task-box-meta');
  const editEl = document.getElementById('task-box-edit'), lblEl = document.getElementById('task-box-label');
  const subDiv = document.getElementById('task-box-subtasks'), subHint = document.getElementById('task-box-sub-hint');
  if ((state.mode === 'ring' || state.mode === 'editing') && state.selectedIdx >= 0 && state.selectedIdx < state.tasks.length) {
    const task = state.tasks[state.selectedIdx]; box.classList.add('visible');
    if (task.editing) {
      textEl.style.display = 'none'; editEl.style.display = 'block'; lblEl.textContent = 'EDIT MISSION';
      subDiv.style.display = 'none'; subHint.style.display = 'none';
    } else {
      textEl.style.display = 'block'; editEl.style.display = 'none'; textEl.textContent = task.text;
      const done = state.tasks.filter(t => t.done).length;
      const subs = task.subtasks || [];
      const hasSubs = subs.length > 0;
      textEl.classList.toggle('task-title-selected', hasSubs && state.selectedSubIdx < 0);
      textEl.classList.toggle('task-title-dimmed', hasSubs && state.selectedSubIdx >= 0);
      const subDone = subs.filter(s => s.done).length;
      metaEl.textContent = `MISSION ${state.selectedIdx + 1} / ${state.tasks.length} · ${done} COMPLETE`;
      lblEl.textContent = task.done ? 'MISSION COMPLETE' : 'ACTIVE MISSION';
      const col = TASK_COLORS[state.selectedIdx % TASK_COLORS.length];
      box.style.borderColor = col.fill + '99';
      box.style.boxShadow = `0 0 28px ${col.glow.replace('0.8', '0.2')},0 0 0 1px ${col.fill}22 inset`;

      // Subtask list — rebuild when content or selection changes
      const subsKey = JSON.stringify(subs) + '|' + state.selectedSubIdx;
      if (subDiv.dataset.key !== subsKey) {
        subDiv.dataset.key = subsKey;
        subDiv.innerHTML = '';
        if (subs.length > 0) {
          subs.forEach((sub, j) => {
            const row = document.createElement('div'); row.className = 'tbox-sub-item' + (j === state.selectedSubIdx ? ' selected' : '');
            const ck = document.createElement('div'); ck.className = 'tbox-sub-check' + (sub.done ? ' done' : '');
            if (sub.done) ck.textContent = '✓';
            const tx = document.createElement('div'); tx.className = 'tbox-sub-text' + (sub.done ? ' done' : ''); tx.textContent = sub.text;
            row.append(ck, tx);
            subDiv.appendChild(row);
          });
        }
      }
      subDiv.style.display = subs.length > 0 ? 'block' : 'none';
      subHint.style.display = 'block';
      subHint.textContent = subs.length > 0 ? `${subDone}/${subs.length} SUBTASKS · ↑↓ NAV · Space DONE · ^N ADD` : 'Ctrl+N  ADD SUBTASK';
    }
    textEl.style.textDecoration = task.done ? 'line-through' : 'none';
    textEl.style.color = task.done ? 'rgba(0,255,204,0.7)' : '';
  } else {
    box.classList.remove('visible');
    subDiv.dataset.key = '';
  }
}

// ─── LIST RENDER ─────────────────────────────────────────────────────────────
export function renderList() {
  const list = document.getElementById('task-list'), empty = document.getElementById('list-empty'), count = document.getElementById('task-count');
  const done = state.tasks.filter(t => t.done).length;
  count.textContent = `${done} / ${state.tasks.length} done`;
  empty.style.display = state.tasks.length === 0 ? 'flex' : 'none';
  list.innerHTML = '';
  state.tasks.forEach((task, i) => {
    const el = document.createElement('div');
    el.className = `task-item${task.done ? ' done' : ''}`;
    el.dataset.idx = i;
    const check = document.createElement('div'); check.className = 'task-check';
    const num = document.createElement('div'); num.className = 'task-num'; num.textContent = String(i + 1).padStart(2, '0');
    const dot = document.createElement('div'); dot.className = `task-priority ${COLORS[i % 3]}`;
    if (task.editing) {
      const inp = document.createElement('input'); inp.className = 'task-edit-input'; inp.value = task.text; inp.type = 'text';
      el.append(check, num, dot, inp); list.appendChild(el);
      requestAnimationFrame(() => { inp.focus(); inp.selectionStart = inp.value.length; });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.stopPropagation(); task.text = inp.value.trim() || task.text; task.editing = false; setMode('normal'); save(); renderList(); showToast('Mission updated ✎'); }
        else if (e.key === 'Escape') { e.stopPropagation(); task.editing = false; setMode('normal'); renderList(); }
      });
      inp.addEventListener('blur', () => { if (task.editing) { task.text = inp.value.trim() || task.text; task.editing = false; setMode('normal'); save(); renderList(); } });
    } else {
      const text = document.createElement('div'); text.className = 'task-text'; text.textContent = task.text;
      el.append(check, num, dot, text);
    }
    el.addEventListener('click', () => {
      if (state.mode === 'adding' || state.mode === 'adding-sub') return;
      if (state.selectedIdx === i && state.selectedSubIdx < 0) completeTask(i);
      else { state.selectedIdx = i; state.selectedSubIdx = -1; moveHighlight(); }
    });
    list.appendChild(el);

    // Subtask rows beneath the parent task
    const subs = task.subtasks || [];
    subs.forEach((sub, j) => {
      const sr = document.createElement('div');
      sr.className = `subtask-row${sub.done ? ' done' : ''}`;
      sr.dataset.taskIdx = i;
      sr.dataset.subIdx = j;
      const connector = document.createElement('div'); connector.className = 'subtask-connector';
      const sdot = document.createElement('div'); sdot.className = 'subtask-dot';
      const stx = document.createElement('div'); stx.className = 'subtask-text'; stx.textContent = sub.text;
      sr.append(connector, sdot, stx);
      list.appendChild(sr);
    });
  });
  requestAnimationFrame(() => requestAnimationFrame(moveHighlight));
}

export function moveHighlight() {
  const hl = document.getElementById('sel-highlight'), list = document.getElementById('task-list');
  if (state.selectedIdx < 0) { hl.style.opacity = '0'; return; }
  let item;
  if (state.selectedSubIdx >= 0) {
    item = list.querySelector(`.subtask-row[data-task-idx="${state.selectedIdx}"][data-sub-idx="${state.selectedSubIdx}"]`);
  } else {
    const items = list.querySelectorAll(':scope > .task-item');
    item = items[state.selectedIdx];
  }
  if (!item) { hl.style.opacity = '0'; return; }
  hl.style.top = item.offsetTop + 'px'; hl.style.height = item.offsetHeight + 'px'; hl.style.opacity = '1';
  item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ─── ACTIONS ─────────────────────────────────────────────────────────────────
export function addTask(text) {
  if (!text.trim()) return;
  const col = TASK_COLORS[state.tasks.length % TASK_COLORS.length];
  state.tasks.push({ text: text.trim(), done: false, id: Date.now(), subtasks: [] });
  const ni = state.tasks.length - 1;
  setNewTaskAnimating({ angle: (ni / state.tasks.length) * Math.PI * 2 + ringRotation, progress: 0, color: col });
  warpEffect(); burst(innerWidth / 2, innerHeight * 0.5, col.fill, 14);
  showToast('Mission logged 🚀'); save();
  if (state.currentView === 'list') renderList();
}

export function addSubtask(parentIdx, text) {
  if (!text.trim() || parentIdx < 0 || parentIdx >= state.tasks.length) return;
  if (!state.tasks[parentIdx].subtasks) state.tasks[parentIdx].subtasks = [];
  state.tasks[parentIdx].subtasks.push({ text: text.trim(), done: false, id: Date.now() });
  showToast('Subtask added ○'); save();
  if (state.currentView === 'list') renderList();
}

export function completeSubtask(parentIdx, subIdx) {
  const sub = state.tasks[parentIdx]?.subtasks?.[subIdx]; if (!sub) return;
  sub.done = !sub.done;
  burst(innerWidth / 2, innerHeight * 0.5, sub.done ? '#00ffcc' : TASK_COLORS[parentIdx % TASK_COLORS.length].fill, 8);
  showToast(sub.done ? 'Subtask complete ✓' : 'Subtask reopened ○'); save();
  if (state.currentView === 'list') renderList();
}

export function deleteLastSubtask(parentIdx) {
  const subs = state.tasks[parentIdx]?.subtasks; if (!subs || !subs.length) return;
  subs.pop();
  showToast('Subtask removed ✕'); save();
  if (state.currentView === 'list') renderList();
}

export function completeTask(idx) {
  if (idx < 0 || idx >= state.tasks.length) return;
  state.tasks[idx].done = !state.tasks[idx].done;
  burst(innerWidth / 2, innerHeight * 0.5, state.tasks[idx].done ? '#00ffcc' : TASK_COLORS[idx % TASK_COLORS.length].fill, 12);
  showToast(state.tasks[idx].done ? 'Mission complete 🛸' : 'Mission reopened ○'); save();
  if (state.currentView === 'list') renderList();
}

export function deleteTask(idx) {
  if (idx < 0 || idx >= state.tasks.length) return;
  burst(innerWidth / 2, innerHeight * 0.5, '#ff4d6d', 10);
  state.tasks.splice(idx, 1);
  state.selectedSubIdx = -1;
  if (state.selectedIdx >= state.tasks.length) state.selectedIdx = Math.max(0, state.tasks.length - 1);
  if (state.tasks.length === 0) { state.selectedIdx = -1; setMode('normal'); }
  showToast('Mission scrubbed ✕'); save();
  if (state.currentView === 'list') renderList();
}

export function startEditTask(idx) {
  if (idx < 0 || idx >= state.tasks.length || state.tasks[idx].done) return;
  state.tasks[idx].editing = true; setMode('editing');
  if (state.currentView === 'list') { renderList(); return; }
  const editEl = document.getElementById('task-box-edit');
  editEl.value = state.tasks[idx].text; editEl.style.display = 'block';
  document.getElementById('task-box-text').style.display = 'none';
  requestAnimationFrame(() => { editEl.focus(); editEl.selectionStart = editEl.value.length; });
}

export function commitEdit(idx) {
  if (idx < 0 || idx >= state.tasks.length) return;
  const editEl = document.getElementById('task-box-edit');
  const v = editEl.value.trim(); if (v) state.tasks[idx].text = v;
  state.tasks[idx].editing = false; editEl.style.display = 'none';
  setMode('ring'); showToast('Mission updated ✎'); save();
}

// ─── EXPORT / IMPORT ─────────────────────────────────────────────────────────
export function exportTasks() {
  if (!state.tasks.length) { showToast('No missions to export'); return; }
  const blob = new Blob([JSON.stringify({ version: 1, exported: new Date().toISOString(), tasks: state.tasks }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = `orbit-missions-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
  showToast('Missions exported 💾');
}

export function importTasks(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      const imported = Array.isArray(data) ? data : (data.tasks || []);
      if (!Array.isArray(imported)) throw new Error();
      let added = 0;
      imported.forEach(t => { if (t.text && !state.tasks.find(x => x.text === t.text)) { state.tasks.push({ text: t.text, done: !!t.done, id: t.id || Date.now() + added, subtasks: (t.subtasks || []).map(s => ({ id: s.id || Date.now(), text: s.text || '', done: !!s.done })) }); added++; } });
      save();
      if (added > 0) { if (state.selectedIdx < 0 && state.tasks.length > 0) state.selectedIdx = 0; showToast(`${added} mission${added > 1 ? 's' : ''} imported 🚀`); burst(innerWidth / 2, innerHeight * 0.5, '#b060ff', 14); }
      else showToast('No new missions found');
    } catch { showToast('Import failed — invalid file'); }
    event.target.value = '';
    if (state.currentView === 'list') renderList();
  };
  reader.readAsText(file);
}
