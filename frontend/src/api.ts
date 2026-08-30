import axios, { AxiosInstance } from 'axios';

interface AuthResponse {
  token: string;
  user: User;
}

interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

export interface User {
  id: string;
  email?: string;
  username: string;
  rating: number;
  online?: boolean;
  avatarUrl?: string;
  country?: string;
  bio?: string;
  createdAt?: string;
  stats?: {
    wins: number;
    losses: number;
    draws: number;
    totalGames: number;
  };
}

interface GameResponse {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  whiteUsername?: string;
  blackUsername?: string;
  status: string;
  result?: string;
  resultReason?: string;
  fenCurrent: string;
  timeControl?: string;
  rated?: boolean;
  whiteTimeLeftMs?: number;
  blackTimeLeftMs?: number;
  lastMoveAt?: string;
  createdAt?: string;
  finishedAt?: string;
  drawOfferedById?: string;
  ratingChange?: number;
}

export interface MatchmakingJoinRequest {
  gameMode: 'bullet' | 'blitz' | 'rapid' | 'classic' | 'custom';
  timeControl: string;
  preferredColor?: 'white' | 'black' | 'random';
  isRated?: boolean;
}

interface LobbyGameResponse {
  id: string;
  creatorId: string;
  creatorUsername: string;
  creatorRating: number;
  gameMode: string;
  timeControl: string;
  preferredColor: string;
  rated: boolean;
  createdAt: string;
}

interface MatchmakingJoinResponse {
  queued: boolean;
  matched: boolean;
  gameId?: string;
  gameMode?: string;
  timeControl?: string;
  message?: string;
}

interface MatchmakingStatusResponse {
  queued: boolean;
  matched?: boolean;
  gameId?: string;
  gameMode?: string;
  timeControl?: string;
  preferredColor?: string;
}

interface InviteResponse {
  id: string;
  code: string;
  inviteUrl: string;
  gameMode: string;
  timeControl?: string;
  rated: boolean;
  preferredColor?: string;
  expiresAt: string;
  used: boolean;
  usedAt?: string;
  creatorUsername: string;
  acceptedByUsername?: string;
  createdAt: string;
}

export interface LessonProgress {
  id: string;
  lessonId: string;
  categoryId: string;
  completed: boolean;
  puzzlesSolved: number;
  puzzlesTotal: number;
  viewedAt?: string | null;
  completedAt?: string | null;
}

export interface LessonProgressRequest {
  lessonId: string;
  categoryId: string;
  puzzlesSolved: number;
  puzzlesTotal: number;
  completed: boolean;
}

// Get API base URL - use backend server for API calls
const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') return '/api';
  
  // In development, use explicit backend URL
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8082/api';
  }
  
  // In production, use same origin
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;
  private unauthorizedHandler: (() => void) | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage if it exists
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      this.token = savedToken;
      this.client.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }

    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          const url = error.config?.url || '';
          const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
          if (!isAuthEndpoint) {
            this.logout();
            this.unauthorizedHandler?.();
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setUnauthorizedHandler(handler: (() => void) | null): void {
    this.unauthorizedHandler = handler;
  }

  login(email: string, password: string): Promise<AuthResponse> {
    return this.client.post('/auth/login', { email, password }).then(res => {
      this.token = res.data.token;
      localStorage.setItem('authToken', res.data.token);
      this.client.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      return res.data;
    });
  }

  register(data: RegisterRequest): Promise<AuthResponse> {
    return this.client.post('/auth/register', data).then(res => {
      this.token = res.data.token;
      localStorage.setItem('authToken', res.data.token);
      this.client.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      return res.data;
    });
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('authToken');
    delete this.client.defaults.headers.common['Authorization'];
  }

  getMe(): Promise<User> {
    return this.client.get('/auth/me').then(res => res.data);
  }

  getUser(userId: string): Promise<User> {
    return this.client.get(`/users/${userId}`).then(res => res.data);
  }

  getUserByUsername(username: string): Promise<any> {
    return this.client.get(`/users/${username}`).then(res => res.data);
  }

  updateProfile(data: { username?: string; password?: string; country?: string; bio?: string; avatarUrl?: string }): Promise<any> {
    return this.client.patch('/users/me', data).then(res => res.data);
  }

  getLessonProgress(): Promise<LessonProgress[]> {
    return this.client.get('/education/progress').then(res => res.data);
  }

  updateLessonProgress(data: LessonProgressRequest): Promise<LessonProgress> {
    return this.client.post('/education/progress', data).then(res => res.data);
  }

  joinMatchmaking(data: MatchmakingJoinRequest): Promise<MatchmakingJoinResponse> {
    return this.client.post('/matchmaking/join', data).then(res => res.data);
  }

  leaveMatchmaking(): Promise<{ message: string }> {
    return this.client.post('/matchmaking/leave').then(res => res.data);
  }

  getMatchmakingStatus(): Promise<MatchmakingStatusResponse> {
    return this.client.get('/matchmaking/status').then(res => res.data);
  }

  getCurrentRating(): Promise<{ rating: number }> {
    return this.client.get('/ratings/me').then(res => res.data);
  }

  getRatingHistory(): Promise<any[]> {
    return this.client.get('/ratings/me/history').then(res => res.data);
  }

  createGame(opponentId: string): Promise<GameResponse> {
    return this.client.post('/games', null, {
      params: { opponentId }
    }).then(res => res.data);
  }

  getGame(gameId: string): Promise<GameResponse> {
    return this.client.get(`/games/by-id/${gameId}`).then(res => res.data);
  }

  getGameMoves(gameId: string): Promise<any[]> {
    return this.client.get(`/games/${gameId}/moves`).then(res => res.data);
  }

  makeMove(gameId: string, move: string): Promise<any> {
    return this.client.post(`/games/${gameId}/moves`, { move }).then(res => res.data);
  }

  resignGame(gameId: string): Promise<GameResponse> {
    return this.client.post(`/games/${gameId}/resign`).then(res => res.data);
  }

  offerDraw(gameId: string): Promise<any> {
    return this.client.post(`/games/${gameId}/offer-draw`).then(res => res.data);
  }

  respondToDraw(gameId: string, accept: boolean): Promise<any> {
    return this.client.post(`/games/${gameId}/respond-draw`, null, { params: { accept } }).then(res => res.data);
  }

  getMyGames(): Promise<GameResponse[]> {
    return this.client.get('/games/my/active').then(res => res.data);
  }

  getMyFinishedGames(): Promise<GameResponse[]> {
    return this.client.get('/games/my/finished').then(res => res.data);
  }

  createInvite(data: { gameMode: string; timeControl: string; expirationHours?: number; isRated?: boolean; preferredColor?: string }): Promise<InviteResponse> {
    return this.client.post('/invites', data).then(res => res.data);
  }

  acceptInvite(inviteCode: string): Promise<GameResponse> {
    return this.client.post(`/invites/${inviteCode}/accept`).then(res => res.data);
  }

  getInvite(inviteCode: string): Promise<InviteResponse> {
    return this.client.get(`/invites/${inviteCode}`).then(res => res.data);
  }

  getMyInvites(): Promise<any[]> {
    return this.client.get('/invites').then(res => res.data);
  }

  createLobbyGame(data: { gameMode: string; timeControl: string; preferredColor: string; isRated: boolean }): Promise<LobbyGameResponse> {
    return this.client.post('/lobby/create', data).then(res => res.data);
  }

  getLobbyGames(): Promise<LobbyGameResponse[]> {
    return this.client.get('/lobby/games').then(res => res.data);
  }

  joinLobbyGame(gameId: string): Promise<{ gameId: string; message: string }> {
    return this.client.post(`/lobby/join/${gameId}`).then(res => res.data);
  }

  cancelLobbyGame(gameId: string): Promise<{ message: string }> {
    return this.client.delete(`/lobby/${gameId}`).then(res => res.data);
  }

  analyzeGame(gameId: string, moves: string[], startFen?: string, depth?: number): Promise<any> {
    return this.client.post(`/games/${gameId}/analyze`, {
      gameId,
      moves,
      startFen: startFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      depth: depth || 20
    }).then(res => res.data);
  }

  // Puzzle endpoints
  getDailyPuzzle(): Promise<any> {
    return this.client.get('/puzzles/daily').then(res => res.data);
  }

  getRandomPuzzle(minRating?: number, maxRating?: number, themes?: string[]): Promise<any> {
    const params = new URLSearchParams();
    if (minRating !== undefined) params.append('minRating', minRating.toString());
    if (maxRating !== undefined) params.append('maxRating', maxRating.toString());
    if (themes && themes.length > 0) params.append('themes', themes.join(','));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.client.get(`/puzzles/random${query}`).then(res => res.data);
  }

  getPuzzleById(puzzleId: string): Promise<any> {
    return this.client.get(`/puzzles/${puzzleId}`).then(res => res.data);
  }

  getLessonPuzzle(openingTag: string, themes: string[] = [], minRating?: number, maxRating?: number): Promise<any> {
    const params = new URLSearchParams();
    params.append('openingTag', openingTag);
    if (themes.length > 0) params.append('themes', themes.join(','));
    if (minRating !== undefined) params.append('minRating', minRating.toString());
    if (maxRating !== undefined) params.append('maxRating', maxRating.toString());
    return this.client.get(`/puzzles/lesson?${params.toString()}`).then(res => res.data);
  }

  checkPuzzleSolution(puzzleId: string, moves: string[], timeSpentSeconds: number, skipRatingUpdate = false): Promise<any> {
    return this.client.post('/puzzles/check', {
      puzzleId,
      moves,
      timeSpentSeconds,
      skipRatingUpdate
    }).then(res => res.data);
  }

  getPuzzleRating(): Promise<{ rating: number }> {
    return this.client.get('/puzzles/me/rating').then(res => res.data);
  }

  getPuzzleRatingHistory(): Promise<any[]> {
    return this.client.get('/puzzles/me/history').then(res => res.data);
  }

  getPuzzleHint(puzzleId: string, currentMoves: string[]): Promise<any> {
    return this.client.post('/puzzles/hint', {
      puzzleId,
      currentMoves
    }).then(res => res.data);
  }

  // Bot endpoints
  getBotDifficulties(): Promise<any[]> {
    return this.client.get('/bot/difficulties').then(res => res.data);
  }

  createBotGame(difficulty: string, playerColor: string = 'random', timeControl: string = '5+3'): Promise<GameResponse> {
    const payload = { difficulty, playerColor, timeControl };
    console.log('📤 Sending bot game request:', payload);
    return this.client.post('/bot/game', payload)
      .then(res => {
        console.log('📥 Bot game response:', res.data);
        return res.data;
      })
      .catch(err => {
        console.error('❌ Bot game request failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message
        });
        throw err;
      });
  }

  getBotMove(gameId: string, difficulty: string = 'INTERMEDIATE'): Promise<{ move: string; game: GameResponse }> {
    return this.client.post(`/bot/move/${gameId}`, null, {
      params: {
        difficulty
      }
    }).then(res => res.data);
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  // Friends endpoints
  getFriends(): Promise<any[]> {
    return this.client.get('/friends').then(res => res.data);
  }

  getPendingFriendRequests(): Promise<any[]> {
    return this.client.get('/friends/requests').then(res => res.data);
  }

  getFriendshipStatus(userId: string): Promise<any | null> {
    return this.client.get(`/friends/status/${userId}`).then(res => res.data);
  }

  sendFriendRequest(userId: string): Promise<any> {
    return this.client.post(`/friends/${userId}`).then(res => res.data);
  }

  acceptFriendRequest(friendshipId: string): Promise<any> {
    return this.client.post(`/friends/accept/${friendshipId}`).then(res => res.data);
  }

  declineFriendRequest(friendshipId: string): Promise<void> {
    return this.client.delete(`/friends/decline/${friendshipId}`).then(res => res.data);
  }

  cancelFriendRequest(friendshipId: string): Promise<void> {
    return this.client.delete(`/friends/cancel/${friendshipId}`).then(res => res.data);
  }

  removeFriend(userId: string): Promise<void> {
    return this.client.delete(`/friends/${userId}`).then(res => res.data);
  }

  // Games endpoints
  getUserGames(userId: string, status: string = 'all'): Promise<GameResponse[]> {
    return this.client.get(`/games/user/${userId}`, {
      params: { status }
    }).then(res => res.data);
  }

  getGamePgn(gameId: string): Promise<{ pgn: string }> {
    return this.client.get(`/games/${gameId}/pgn`).then(res => res.data);
  }

  rematchGame(gameId: string): Promise<GameResponse> {
    return this.client.post(`/games/${gameId}/rematch`).then(res => res.data);
  }

  abortGame(gameId: string): Promise<GameResponse> {
    return this.client.post(`/games/${gameId}/abort`).then(res => res.data);
  }

  offerTakeback(gameId: string): Promise<GameResponse> {
    return this.client.post(`/games/${gameId}/offer-takeback`).then(res => res.data);
  }

  respondTakeback(gameId: string, accept: boolean): Promise<GameResponse> {
    return this.client.post(`/games/${gameId}/respond-takeback`, null, { params: { accept } }).then(res => res.data);
  }

  claimDraw(gameId: string): Promise<GameResponse> {
    return this.client.post(`/games/${gameId}/claim-draw`).then(res => res.data);
  }

  searchUsers(q: string, limit = 20): Promise<any[]> {
    return this.client.get('/users/search', { params: { q, limit } }).then(res => res.data);
  }

  ping(): Promise<void> {
    return this.client.post('/users/me/ping').then(() => undefined);
  }

  createChallenge(userId: string, timeControl = '5+3', rated = true): Promise<any> {
    return this.client.post('/challenges', { userId, timeControl, rated }).then(res => res.data);
  }

  getIncomingChallenges(): Promise<any[]> {
    return this.client.get('/challenges/incoming').then(res => res.data);
  }

  acceptChallenge(id: string): Promise<GameResponse> {
    return this.client.post(`/challenges/accept/${id}`).then(res => res.data);
  }

  declineChallenge(id: string): Promise<any> {
    return this.client.post(`/challenges/decline/${id}`).then(res => res.data);
  }

  getAllRatings(): Promise<any[]> {
    return this.client.get('/ratings/me/all').then(res => res.data);
  }

  startPuzzleRush(): Promise<{ sessionId: string }> {
    return this.client.post('/puzzles/rush/start').then(res => res.data);
  }

  getPuzzleRushNext(sessionId: string): Promise<any> {
    return this.client.get(`/puzzles/rush/${sessionId}/next`).then(res => res.data);
  }

  finishPuzzleRush(sessionId: string, score: number, puzzlesSolved: number): Promise<any> {
    return this.client.post(`/puzzles/rush/${sessionId}/finish`, { score, puzzlesSolved }).then(res => res.data);
  }

  getArenas(): Promise<any[]> {
    return this.client.get('/arenas').then(res => res.data);
  }

  getArena(id: string): Promise<any> {
    return this.client.get(`/arenas/${id}`).then(res => res.data);
  }

  getArenaStandings(id: string): Promise<any[]> {
    return this.client.get(`/arenas/${id}/standings`).then(res => res.data);
  }

  joinArena(id: string): Promise<any> {
    return this.client.post(`/arenas/${id}/join`).then(res => res.data);
  }
}

export const apiService = new ApiService();
