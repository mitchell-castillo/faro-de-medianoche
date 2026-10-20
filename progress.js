import { nights, restoreRun, starsFor } from './engine.js';
export const STORAGE_KEY = 'daily-games:faro-de-medianoche:v1';
export const emptyProgress = () => ({ version: 1, currentLevel: 0, completed: {}, run: null, updatedAt: null });
export function unlockedLevel(progress) {
  for (let i = 0; i < nights.length; i++) if (!progress.completed[i]) return i;
  return nights.length - 1;
}
export function normalizeProgress(value) {
  const result = emptyProgress();
  if (!value || value.version !== 1) return result;
  if (value.completed && typeof value.completed === 'object') {
    for (const [key, item] of Object.entries(value.completed)) {
      const index = Number(key);
      if (Number.isInteger(index) && nights[index] && item && Number.isInteger(item.bestScore) && item.bestScore >= 0 && item.bestScore <= 50000 && Number.isInteger(item.stars) && item.stars >= 1 && item.stars <= 3) result.completed[index] = { bestScore: item.bestScore, stars: item.stars };
    }
  }
  const unlocked = unlockedLevel(result);
  result.currentLevel = Number.isInteger(value.currentLevel) ? Math.max(0, Math.min(value.currentLevel, unlocked)) : 0;
  const run = restoreRun(value.run);
  result.run = run && run.level <= unlocked ? run : null;
  result.updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;
  return result;
}
export function readProgress(storage) {
  try { const raw = (storage ?? globalThis.localStorage).getItem(STORAGE_KEY); try { return { progress: normalizeProgress(JSON.parse(raw)), available: true }; } catch { return { progress: emptyProgress(), available: true }; } }
  catch { return { progress: emptyProgress(), available: false }; }
}
export function saveProgress(progress, storage) {
  try { (storage ?? globalThis.localStorage).setItem(STORAGE_KEY, JSON.stringify({ ...progress, updatedAt: new Date().toISOString() })); return true; } catch { return false; }
}
export function recordWin(progress, run) {
  if (run.status !== 'won') return;
  const previous = progress.completed[run.level];
  progress.completed[run.level] = { bestScore: Math.max(previous?.bestScore || 0, run.score), stars: Math.max(previous?.stars || 0, starsFor(run)) };
  progress.currentLevel = Math.min(run.level + 1, nights.length - 1);
}
