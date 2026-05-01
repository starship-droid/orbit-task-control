export const COLORS = ['p-high', 'p-med', 'p-low'];

export const TASK_COLORS = [
  { fill: '#b060ff', glow: 'rgba(176,96,255,0.8)' },
  { fill: '#4dc9ff', glow: 'rgba(77,201,255,0.8)' },
  { fill: '#00ffcc', glow: 'rgba(0,255,204,0.8)' },
  { fill: '#ff9d3d', glow: 'rgba(255,157,61,0.8)' },
  { fill: '#ff5cf7', glow: 'rgba(255,92,247,0.8)' },
  { fill: '#7df9ff', glow: 'rgba(125,249,255,0.8)' },
];

export const state = {
  tasks: JSON.parse(localStorage.getItem('orbit-tasks') || '[]'),
  selectedIdx: -1,
  mode: 'normal',
  currentView: 'saturn',
  addingSubtaskFor: -1,
};

export function save() {
  localStorage.setItem('orbit-tasks', JSON.stringify(state.tasks));
}
