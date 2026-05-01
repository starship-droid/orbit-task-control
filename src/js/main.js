import { state } from './taskStore.js';
import { startAnimLoop } from './orbitRenderer.js';
import {
  toggleSettings, isSettingsOpen, setMode, toggleView,
  updateTaskBox, renderList, moveHighlight,
  addTask, addSubtask, completeSubtask, deleteLastSubtask,
  completeTask, deleteTask, startEditTask, commitEdit,
  exportTasks, importTasks,
} from './taskModal.js';

// ─── FOCUS / TAB MANAGEMENT ──────────────────────────────────────────────────
const taskInput = document.getElementById('task-input');
const taskBoxEdit = document.getElementById('task-box-edit');
let suppressInputBlur = false;

function goToRing() {
  if (!state.tasks.length) return;
  suppressInputBlur = true; taskInput.blur(); suppressInputBlur = false;
  if (state.selectedIdx < 0) state.selectedIdx = 0;
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
      if (state.addingSubtaskFor >= 0) addSubtask(state.addingSubtaskFor, val);
      else addTask(val);
      taskInput.value = '';
    }
    resetInputToNormal(); suppressInputBlur = true; taskInput.blur(); suppressInputBlur = false; setMode('normal');
  } else if (e.key === 'Escape') {
    taskInput.value = ''; resetInputToNormal(); suppressInputBlur = true; taskInput.blur(); suppressInputBlur = false; setMode('normal');
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

    // ── j: next task (saturn) / down (list) ──────────────────────────────────
    case 'j': {
      e.preventDefault();
      if (!state.tasks.length) break;
      if (isSaturn) {
        if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = 0; setMode('ring'); break; }
        state.selectedIdx = (state.selectedIdx + 1) % state.tasks.length;
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

    // ── k: prev task (saturn) / up (list) ────────────────────────────────────
    case 'k': {
      e.preventDefault();
      if (!state.tasks.length) break;
      if (isSaturn) {
        if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = 0; setMode('ring'); break; }
        state.selectedIdx = (state.selectedIdx - 1 + state.tasks.length) % state.tasks.length;
        state.selectedSubIdx = -1;
      } else {
        if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = 0; state.selectedSubIdx = -1; setMode('ring'); moveHighlight(); break; }
        if (state.selectedSubIdx > -1) state.selectedSubIdx--;
        else if (state.selectedIdx > 0) { state.selectedIdx--; state.selectedSubIdx = (state.tasks[state.selectedIdx]?.subtasks?.length || 0) - 1; }
        moveHighlight();
      }
      break;
    }

    // ── Arrow Left: next task (saturn, flipped) ───────────────────────────────
    case 'ArrowLeft': {
      e.preventDefault();
      if (!state.tasks.length || !isSaturn) break;
      if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = 0; setMode('ring'); break; }
      state.selectedIdx = (state.selectedIdx + 1) % state.tasks.length;
      state.selectedSubIdx = -1;
      break;
    }

    // ── Arrow Right: prev task (saturn, flipped) ──────────────────────────────
    case 'ArrowRight': {
      e.preventDefault();
      if (!state.tasks.length || !isSaturn) break;
      if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = 0; setMode('ring'); break; }
      state.selectedIdx = (state.selectedIdx - 1 + state.tasks.length) % state.tasks.length;
      state.selectedSubIdx = -1;
      break;
    }

    // ── Arrow Down: next subtask (saturn) / next item (list) ─────────────────
    case 'ArrowDown': {
      e.preventDefault();
      if (!state.tasks.length) break;
      if (isSaturn) {
        if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = 0; setMode('ring'); break; }
        const subs = state.tasks[state.selectedIdx]?.subtasks || [];
        if (state.selectedSubIdx < subs.length - 1) state.selectedSubIdx++;
        else { state.selectedIdx = (state.selectedIdx + 1) % state.tasks.length; state.selectedSubIdx = -1; }
      } else {
        if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = 0; state.selectedSubIdx = -1; setMode('ring'); moveHighlight(); break; }
        const subs = state.tasks[state.selectedIdx]?.subtasks || [];
        if (state.selectedSubIdx < subs.length - 1) state.selectedSubIdx++;
        else if (state.selectedIdx < state.tasks.length - 1) { state.selectedIdx++; state.selectedSubIdx = -1; }
        moveHighlight();
      }
      break;
    }

    // ── Arrow Up: prev subtask (saturn) / prev item (list) ───────────────────
    case 'ArrowUp': {
      e.preventDefault();
      if (!state.tasks.length) break;
      if (isSaturn) {
        if (state.mode !== 'ring') { if (state.selectedIdx < 0) state.selectedIdx = 0; setMode('ring'); break; }
        if (state.selectedSubIdx > -1) state.selectedSubIdx--;
        else { state.selectedIdx = (state.selectedIdx - 1 + state.tasks.length) % state.tasks.length; state.selectedSubIdx = (state.tasks[state.selectedIdx]?.subtasks?.length || 0) - 1; }
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

    case 'e': case 'E':
      if (state.selectedIdx >= 0 && state.selectedSubIdx < 0) startEditTask(state.selectedIdx);
      break;

    case 'Delete':
      if (state.selectedIdx >= 0 && state.selectedSubIdx < 0) deleteTask(state.selectedIdx);
      break;

    case 'Backspace':
      if (active === document.body && state.selectedIdx >= 0 && state.selectedSubIdx < 0) {
        e.preventDefault(); deleteTask(state.selectedIdx);
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
