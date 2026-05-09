import { state } from './taskStore.js';
import { startAnimLoop } from './orbitRenderer.js';
import {
  toggleSettings, isSettingsOpen, setMode, toggleView,
  updateTaskBox, renderList, moveHighlight,
  addTask, addSubtask, completeSubtask, deleteSubtask, deleteLastSubtask,
  completeTask, deleteTask, startEditTask, commitEdit,
  exportTasks, importTasks, cycleTaskStatus, toggleImportant,
} from './taskModal.js';

// ─── FOCUS / TAB MANAGEMENT ──────────────────────────────────────────────────
const taskInput = document.getElementById('task-input');
const taskBoxEdit = document.getElementById('task-box-edit');
let suppressInputBlur = false;

// Find the next index (dir=+1 forward, dir=-1 backward) that satisfies filter.
// Returns `from` unchanged if no match exists.
function nextIdx(from, dir, filter) {
  const n = state.tasks.length;
  if (!n) return from;
  let idx = (from + dir + n) % n;
  for (let steps = 0; steps < n; steps++) {
    if (filter(state.tasks[idx])) return idx;
    idx = (idx + dir + n) % n;
  }
  return from;
}

function firstActiveIdx() {
  const i = state.tasks.findIndex(t => !t.done);
  return i >= 0 ? i : 0;
}

function goToRing() {
  if (!state.tasks.length) return;
  suppressInputBlur = true; taskInput.blur(); suppressInputBlur = false;
  if (state.selectedIdx < 0) state.selectedIdx = firstActiveIdx();
  setMode('ring');
}

function goToInput() { setMode('adding'); taskInput.focus(); }

function resetInputToNormal() {
  state.addingSubtaskFor = -1;
  taskInput.placeholder = 'New mission directive…';
}

taskInput.addEventListener('focus', () => { if (!suppressInputBlur && state.addingSubtaskFor < 0) setMode('adding'); });
taskInput.addEventListener('blur', () => {
  if (suppressInputBlur) return;
  if (state.mode === 'adding' || state.mode === 'adding-sub') { resetInputToNormal(); setMode('normal'); }
});

taskInput.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault(); e.stopPropagation();
    if (e.shiftKey) { resetInputToNormal(); toggleView(); return; }
    resetInputToNormal(); goToRing();
  } else if (e.key === 'Enter') {
    const val = taskInput.value.trim();
    if (val) {
      if (state.addingSubtaskFor >= 0) {
        addSubtask(state.addingSubtaskFor, val);
        taskInput.value = '';
        return; // stay in adding-sub mode so user can keep adding subtasks
      }
      addTask(val);
      taskInput.value = '';
    }
    resetInputToNormal(); suppressInputBlur = true; taskInput.blur(); suppressInputBlur = false; setMode('normal');
  } else if (e.key === 'Escape') {
    taskInput.value = '';
    if (state.addingSubtaskFor >= 0) { resetInputToNormal(); setMode('adding'); }
    else { resetInputToNormal(); suppressInputBlur = true; taskInput.blur(); suppressInputBlur = false; setMode('normal'); }
  }
}, true);

taskBoxEdit.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.stopPropagation(); commitEdit(state.selectedIdx); }
  else if (e.key === 'Escape') { e.stopPropagation(); if (state.tasks[state.selectedIdx]) state.tasks[state.selectedIdx].editing = false; setMode('ring'); }
});
taskBoxEdit.addEventListener('blur', () => { if (state.mode === 'editing' && state.selectedIdx >= 0 && state.tasks[state.selectedIdx]?.editing) commitEdit(state.selectedIdx); });

// ─── GLOBAL KEYS ─────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const active = document.activeElement;
  if (active === taskInput) return;
  if (active === taskBoxEdit) return;
  if (active?.classList?.contains('task-edit-input')) return;

  if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); toggleView(); return; }

  // Ctrl+N — add subtask to selected task
  if (e.ctrlKey && (e.key === 'n' || e.key === 'N')) {
    e.preventDefault();
    if (state.selectedIdx >= 0 && state.mode === 'ring') {
      state.addingSubtaskFor = state.selectedIdx;
      setMode('adding-sub');
      taskInput.placeholder = `New subtask for "${state.tasks[state.selectedIdx]?.text || ''}"…`;
      taskInput.focus();
    }
    return;
  }

  const isSaturn = state.currentView === 'saturn';

  switch (e.key) {
    case 'Tab':
      e.preventDefault();
      if (state.mode === 'ring') goToInput(); else if (state.tasks.length > 0) goToRing(); else goToInput();
      break;
    case 'n': case 'N': e.preventDefault(); goToInput(); break;

    // ── j: next active task (saturn) / down (list) ───────────────────────────
    case 'j': {
      e.preventDefault();
      if (!state.tasks.length) break;
      if (isSaturn) {
        if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = firstActiveIdx(); setMode('ring'); break; }
        state.selectedIdx = nextIdx(state.selectedIdx, 1, t => !t.done);
        state.selectedSubIdx = -1;
      } else {
        if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = 0; state.selectedSubIdx = -1; setMode('ring'); moveHighlight(); break; }
        const subs = state.tasks[state.selectedIdx]?.subtasks || [];
        if (state.selectedSubIdx < subs.length - 1) state.selectedSubIdx++;
        else if (state.selectedIdx < state.tasks.length - 1) { state.selectedIdx++; state.selectedSubIdx = -1; }
        moveHighlight();
      }
      break;
    }

    // ── k: prev active task (saturn) / up (list) ─────────────────────────────
    case 'k': {
      e.preventDefault();
      if (!state.tasks.length) break;
      if (isSaturn) {
        if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = firstActiveIdx(); setMode('ring'); break; }
        state.selectedIdx = nextIdx(state.selectedIdx, -1, t => !t.done);
        state.selectedSubIdx = -1;
      } else {
        if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = 0; state.selectedSubIdx = -1; setMode('ring'); moveHighlight(); break; }
        if (state.selectedSubIdx > -1) state.selectedSubIdx--;
        else if (state.selectedIdx > 0) { state.selectedIdx--; state.selectedSubIdx = (state.tasks[state.selectedIdx]?.subtasks?.length || 0) - 1; }
        moveHighlight();
      }
      break;
    }

    // ── Arrow Left: next active task (saturn, flipped) ───────────────────────
    case 'ArrowLeft': {
      e.preventDefault();
      if (!state.tasks.length || !isSaturn) break;
      if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = firstActiveIdx(); setMode('ring'); break; }
      state.selectedIdx = nextIdx(state.selectedIdx, 1, t => !t.done);
      state.selectedSubIdx = -1;
      break;
    }

    // ── Arrow Right: prev active task (saturn, flipped) ───────────────────────
    case 'ArrowRight': {
      e.preventDefault();
      if (!state.tasks.length || !isSaturn) break;
      if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = firstActiveIdx(); setMode('ring'); break; }
      state.selectedIdx = nextIdx(state.selectedIdx, -1, t => !t.done);
      state.selectedSubIdx = -1;
      break;
    }

    // ── C: cycle through completed stars (saturn only) ────────────────────────
    case 'c': case 'C': {
      if (!isSaturn) break;
      e.preventDefault();
      if (!state.tasks.some(t => t.done)) break;
      state.selectedIdx = nextIdx(state.selectedIdx, 1, t => t.done);
      state.selectedSubIdx = -1;
      if (state.mode !== 'ring') setMode('ring');
      break;
    }

    // ── Arrow Down: next subtask (saturn, clamped) / next item (list) ──────────
    case 'ArrowDown': {
      e.preventDefault();
      if (!state.tasks.length) break;
      if (isSaturn) {
        if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = 0; setMode('ring'); break; }
        const subs = state.tasks[state.selectedIdx]?.subtasks || [];
        if (state.selectedSubIdx < subs.length - 1) state.selectedSubIdx++;
      } else {
        if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = 0; state.selectedSubIdx = -1; setMode('ring'); moveHighlight(); break; }
        const subs = state.tasks[state.selectedIdx]?.subtasks || [];
        if (state.selectedSubIdx < subs.length - 1) state.selectedSubIdx++;
        else if (state.selectedIdx < state.tasks.length - 1) { state.selectedIdx++; state.selectedSubIdx = -1; }
        moveHighlight();
      }
      break;
    }

    // ── Arrow Up: prev subtask (saturn, clamped) / prev item (list) ────────────
    case 'ArrowUp': {
      e.preventDefault();
      if (!state.tasks.length) break;
      if (isSaturn) {
        if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = 0; setMode('ring'); break; }
        if (state.selectedSubIdx > -1) state.selectedSubIdx--;
      } else {
        if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = 0; state.selectedSubIdx = -1; setMode('ring'); moveHighlight(); break; }
        if (state.selectedSubIdx > -1) state.selectedSubIdx--;
        else if (state.selectedIdx > 0) { state.selectedIdx--; state.selectedSubIdx = (state.tasks[state.selectedIdx]?.subtasks?.length || 0) - 1; }
        moveHighlight();
      }
      break;
    }

    case ' ':
      e.preventDefault();
      if (state.selectedIdx >= 0) {
        if (state.selectedSubIdx >= 0) completeSubtask(state.selectedIdx, state.selectedSubIdx);
        else completeTask(state.selectedIdx);
      }
      break;

    case 'i': case 'I':
      if (state.selectedIdx >= 0 && state.selectedSubIdx < 0) toggleImportant(state.selectedIdx);
      break;

    case 'p': case 'P':
      if (state.selectedIdx >= 0 && state.selectedSubIdx < 0) cycleTaskStatus(state.selectedIdx);
      break;

    case 'e': case 'E':
      if (state.selectedIdx >= 0 && state.selectedSubIdx < 0) startEditTask(state.selectedIdx);
      break;

    case 'Delete':
      if (state.selectedIdx >= 0) {
        if (state.selectedSubIdx >= 0) deleteSubtask(state.selectedIdx, state.selectedSubIdx);
        else deleteTask(state.selectedIdx);
      }
      break;

    case 'Backspace':
      if (active === document.body && state.selectedIdx >= 0) {
        e.preventDefault();
        if (state.selectedSubIdx >= 0) deleteSubtask(state.selectedIdx, state.selectedSubIdx);
        else deleteTask(state.selectedIdx);
      }
      break;

    case 'Escape':
      if (isSettingsOpen()) { toggleSettings(); break; }
      if (state.mode === 'ring') {
        state.selectedIdx = -1; state.selectedSubIdx = -1; setMode('normal');
        if (!isSaturn) moveHighlight();
      }
      break;
  }
});

// Wire buttons — IDs assigned in the Astro component template
document.getElementById('settings-btn')?.addEventListener('click', toggleSettings);
document.getElementById('export-btn')?.addEventListener('click', exportTasks);
document.getElementById('import-btn')?.addEventListener('click', () => document.getElementById('import-file').click());
document.getElementById('import-file')?.addEventListener('change', importTasks);

// ─── ANIMATION LOOP + INIT ───────────────────────────────────────────────────
startAnimLoop(updateTaskBox);

if (state.tasks.length > 0) state.selectedIdx = 0;
taskInput.focus();
