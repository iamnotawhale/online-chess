const ctx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function beep(freq: number, duration = 0.08, volume = 0.15) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playMoveSound() {
  if (localStorage.getItem('soundEnabled') === 'false') return;
  beep(440, 0.06, 0.1);
}

export function playCaptureSound() {
  if (localStorage.getItem('soundEnabled') === 'false') return;
  beep(220, 0.1, 0.15);
}

export function playCheckSound() {
  if (localStorage.getItem('soundEnabled') === 'false') return;
  beep(880, 0.12, 0.12);
}

export function playGameEndSound() {
  if (localStorage.getItem('soundEnabled') === 'false') return;
  beep(330, 0.2, 0.12);
  setTimeout(() => beep(440, 0.25, 0.12), 150);
}

export function isSoundEnabled(): boolean {
  return localStorage.getItem('soundEnabled') !== 'false';
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem('soundEnabled', enabled ? 'true' : 'false');
}
