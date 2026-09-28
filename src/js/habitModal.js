import { state, TASK_COLORS, save } from './taskStore.js';
import { showToast, burst, setMode } from './taskModal.js';

// ─── DATE HELPERS ────────────────────────────────────────────────────────────
function todayKey() { return new Date().toISOString().slice(0, 10); }

function dateKeyOffset(daysAgo) {
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function currentStreak(checkins) {
  const set = new Set(checkins);
  let streak = 0, offset = set.has(todayKey()) ? 0 : 1;
  while (set.has(dateKeyOffset(offset))) { streak++; offset++; }
  return streak;
}

// ─── ACTIONS ─────────────────────────────────────────────────────────────────
export function addHabit(text) {
  if (!text.trim()) return;
  const col = TASK_COLORS[state.habits.length % TASK_COLORS.length];
  state.habits.push({ text: text.trim(), id: Date.now(), color: col.fill, checkins: [] });
  burst(innerWidth / 2, innerHeight * 0.5, col.fill, 14);
  showToast('Habit seeded ✦'); save();
}

export function deleteHabit(idx) {
  if (idx < 0 || idx >= state.habits.length) return;
  burst(innerWidth / 2, innerHeight * 0.5, '#ff4d6d', 10);
  state.habits.splice(idx, 1);
  if (state.selectedHabitIdx >= state.habits.length) state.selectedHabitIdx = Math.max(0, state.habits.length - 1);
  if (state.habits.length === 0) { state.selectedHabitIdx = -1; setMode('normal'); }
  showToast('Constellation scrubbed ✕'); save();
}

export function startEditHabit(idx) {
  if (idx < 0 || idx >= state.habits.length) return;
  state.habits[idx].editing = true; setMode('editing-habit');
  const editEl = document.getElementById('habit-box-edit');
  editEl.value = state.habits[idx].text; editEl.style.display = 'block';
  document.getElementById('habit-box-text').style.display = 'none';
  requestAnimationFrame(() => { editEl.focus(); editEl.selectionStart = editEl.value.length; });
}

export function commitEditHabit(idx) {
  if (idx < 0 || idx >= state.habits.length) return;
  const editEl = document.getElementById('habit-box-edit');
  const v = editEl.value.trim(); if (v) state.habits[idx].text = v;
  state.habits[idx].editing = false; editEl.style.display = 'none';
  setMode('habit-select'); showToast('Habit updated ✎'); save();
}

export function toggleCheckin(idx) {
  if (idx < 0 || idx >= state.habits.length) return;
  const habit = state.habits[idx];
  const key = todayKey();
  const at = habit.checkins.indexOf(key);
  if (at >= 0) { habit.checkins.splice(at, 1); showToast('Check-in cleared ○'); }
  else { habit.checkins.push(key); burst(innerWidth / 2, innerHeight * 0.5, habit.color, 12); showToast('Logged for today ✦'); }
  save();
}

export function cycleHabitColor(idx) {
  if (idx < 0 || idx >= state.habits.length) return;
  const habit = state.habits[idx];
  const palette = TASK_COLORS.map(c => c.fill);
  const curr = palette.indexOf(habit.color);
  habit.color = palette[(curr + 1) % palette.length];
  burst(innerWidth / 2, innerHeight * 0.5, habit.color, 8);
  showToast('Constellation recoloured'); save();
}

// ─── OVERLAY ─────────────────────────────────────────────────────────────────
export function updateHabitBox() {
  const box = document.getElementById('selected-habit-box');
  if (!box) return;
  if (state.currentView !== 'nebula' || state.selectedHabitIdx < 0 || !state.habits[state.selectedHabitIdx]) {
    box.classList.remove('visible');
    return;
  }
  const habit = state.habits[state.selectedHabitIdx];
  box.classList.add('visible');
  if (!habit.editing) {
    document.getElementById('habit-box-text').textContent = habit.text;
    document.getElementById('habit-box-text').style.display = 'block';
    document.getElementById('habit-box-edit').style.display = 'none';
  }
  const streak = currentStreak(habit.checkins);
  document.getElementById('habit-box-meta').textContent = `${streak} DAY STREAK · ${habit.checkins.length} TOTAL`;
}
