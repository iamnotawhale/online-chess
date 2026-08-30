export type AvatarPreset = {
  id: string;
  icon: string;
  gradient: string;
};

export const DEFAULT_AVATARS: AvatarPreset[] = [
  { id: 'king-gold', icon: '♔', gradient: 'linear-gradient(135deg, #C9A46A, #B58B52)' },
  { id: 'queen-purple', icon: '♕', gradient: 'linear-gradient(135deg, #9B8CCB, #7E6FB1)' },
  { id: 'rook-blue', icon: '♖', gradient: 'linear-gradient(135deg, #7C93B8, #5F779C)' },
  { id: 'bishop-green', icon: '♗', gradient: 'linear-gradient(135deg, #7FAF9B, #5E8F7C)' },
  { id: 'knight-red', icon: '♘', gradient: 'linear-gradient(135deg, #C98686, #AA6A6A)' },
  { id: 'pawn-gray', icon: '♙', gradient: 'linear-gradient(135deg, #808895, #6B7380)' },
  { id: 'king-dark', icon: '♚', gradient: 'linear-gradient(135deg, #404552, #2F3440)' },
  { id: 'queen-pink', icon: '♛', gradient: 'linear-gradient(135deg, #C58FA6, #AA718C)' },
  { id: 'rook-cyan', icon: '♜', gradient: 'linear-gradient(135deg, #7DA9B3, #5C8D98)' },
  { id: 'bishop-orange', icon: '♝', gradient: 'linear-gradient(135deg, #C79B7A, #B07E5C)' },
  { id: 'knight-teal', icon: '♞', gradient: 'linear-gradient(135deg, #7BA9A4, #5E8F8A)' },
  { id: 'pawn-indigo', icon: '♟', gradient: 'linear-gradient(135deg, #7B84A6, #5F688D)' },
  { id: 'king-emerald', icon: '♔', gradient: 'linear-gradient(135deg, #8CB8A0, #6F9A84)' },
  { id: 'queen-amber', icon: '♕', gradient: 'linear-gradient(135deg, #C7A36E, #B08956)' },
  { id: 'rook-rose', icon: '♖', gradient: 'linear-gradient(135deg, #C18A8A, #A86F6F)' },
  { id: 'bishop-violet', icon: '♗', gradient: 'linear-gradient(135deg, #9E8CBF, #806FA6)' },
  { id: 'knight-lime', icon: '♘', gradient: 'linear-gradient(135deg, #9CB579, #7F985E)' },
  { id: 'pawn-slate', icon: '♙', gradient: 'linear-gradient(135deg, #7A8699, #5E6B80)' },
  { id: 'king-sky', icon: '♚', gradient: 'linear-gradient(135deg, #7FA6B9, #5F8CA3)' },
  { id: 'queen-fuchsia', icon: '♛', gradient: 'linear-gradient(135deg, #B98AA9, #A06E90)' },
];

export function findAvatarPreset(avatarUrl?: string | null): AvatarPreset | undefined {
  if (!avatarUrl) return undefined;
  return DEFAULT_AVATARS.find((avatar) => avatar.id === avatarUrl);
}

export function isExternalAvatarUrl(avatarUrl?: string | null): boolean {
  if (!avatarUrl) return false;
  return (
    avatarUrl.startsWith('http://') ||
    avatarUrl.startsWith('https://') ||
    avatarUrl.startsWith('data:')
  );
}

export function getInitials(username?: string): string {
  return (username || '')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
