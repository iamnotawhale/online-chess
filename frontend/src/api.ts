import axios, { AxiosInstance } from 'axios';

interface LoginResponse {
  token: string;
  userId: string;
  email: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  rating: number;
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
  whiteTimeLeftMs?: number;
  blackTimeLeftMs?: number;
  lastMoveAt?: string;
  createdAt?: string;
  finishedAt?: string;
  drawOfferedById?: string;
  ratingChange?: number;
}

interface MatchmakingJoinRequest {
  gameMode: 'bullet' | 'blitz' | 'rapid';
  timeControl: string;
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
}

const API_BASE_URL = '/api';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Загрузить токен из localStorage если существует
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      this.token = savedToken;
      this.client.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }

    // Интерцептор для обновления заголовков при изменении токена
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          this.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  login(email: string, password: string): Promise<LoginResponse> {
    return this.client.post('/auth/login', { email, password }).then(res => {
      this.token = res.data.token;
      localStorage.setItem('authToken', res.data.token);
      this.client.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      return res.data;
    });
  }

  register(data: RegisterRequest): Promise<LoginResponse> {
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

  getAllUsers(): Promise<User[]> {
    return this.client.get('/users').then(res => res.data);
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
    return this.client.get(`/games/${gameId}`).then(res => res.data);
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

  createInvite(opponentEmail: string): Promise<any> {
    return this.client.post('/invites', { opponentEmail }).then(res => res.data);
  }

  acceptInvite(inviteCode: string): Promise<GameResponse> {
    return this.client.post(`/invites/${inviteCode}/accept`).then(res => res.data);
  }

  getMyInvites(): Promise<any[]> {
    return this.client.get('/invites').then(res => res.data);
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }
}

export const apiService = new ApiService();
