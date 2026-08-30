export type PieceSet = 'default' | 'neo';

const STORAGE_KEY = 'pieceSet';

export function getPieceSet(): PieceSet {
  if (typeof window === 'undefined') return 'default';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'neo' ? 'neo' : 'default';
}

export function setPieceSet(set: PieceSet): void {
  localStorage.setItem(STORAGE_KEY, set);
  window.dispatchEvent(new Event('pieceSetChanged'));
}
