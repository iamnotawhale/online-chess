export async function fetchGamePgn(gameId: string): Promise<string> {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`/api/games/${encodeURIComponent(gameId)}/pgn`, { headers });
  if (!res.ok) throw new Error('Failed to fetch PGN');
  const data = await res.json();
  return data.pgn as string;
}

export function downloadPgn(pgn: string, filename: string): void {
  const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pgn') ? filename : `${filename}.pgn`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyPgn(pgn: string): Promise<void> {
  await navigator.clipboard.writeText(pgn);
}
