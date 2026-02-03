import React, { useState, useEffect } from 'react';
import { apiService } from '../api';
import './Dashboard.css';

interface User {
  id: string;
  email: string;
  username: string;
}

interface Game {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  status: string;
  result?: string;
}

export const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [opponentId, setOpponentId] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [userData, ratingData, gamesData, usersData] = await Promise.all([
        apiService.getMe(),
        apiService.getCurrentRating(),
        apiService.getMyGames(),
        apiService.getAllUsers(),
      ]);
      setUser(userData);
      setRating(ratingData.rating);
      setGames(gamesData);
      setUsers(usersData.filter(u => u.id !== userData.id)); // Исключить себя
    } catch (err: any) {
      setError('Ошибка загрузки данных');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createInvite(inviteEmail);
      setInviteEmail('');
      alert('Приглашение отправлено!');
      loadDashboard();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка отправки приглашения');
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponentId) {
      alert('Введите ID противника');
      return;
    }
    try {
      const game = await apiService.createGame(opponentId);
      alert(`Игра создана! ID: ${game.id}`);
      setOpponentId('');
      loadDashboard();
      // Перенаправить на игру
      window.location.href = `/game/${game.id}`;
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка создания игры');
    }
  };

  if (loading) {
    return <div className="dashboard-container"><p>Загрузка...</p></div>;
  }

  if (error) {
    return <div className="dashboard-container"><p className="error">{error}</p></div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Добро пожаловать, {user?.username}!</h1>
        <div className="rating-box">
          <span className="rating-label">Рейтинг:</span>
          <span className="rating-value">{rating}</span>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="section">
          <h2>Создать игру</h2>
          <form onSubmit={handleCreateGame} className="invite-form">
            <select
              value={opponentId}
              onChange={(e) => setOpponentId(e.target.value)}
              required
              style={{ padding: '12px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '16px' }}
            >
              <option value="">Выберите противника</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} (рейтинг: {u.rating})
                </option>
              ))}
            </select>
            <button type="submit">Создать игру</button>
          </form>
        </div>

        <div className="section">
          <h2>Отправить приглашение</h2>
          <form onSubmit={handleSendInvite} className="invite-form">
            <input
              type="email"
              placeholder="Email противника"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <button type="submit">Отправить приглашение</button>
          </form>
        </div>

        <div className="section">
          <h2>Мои игры ({games.length})</h2>
          {games.length === 0 ? (
            <p>У вас пока нет игр</p>
          ) : (
            <div className="games-list">
              {games.map((game) => (
                <div key={game.id} className="game-card">
                  <div className="game-status">{game.status}</div>
                  {game.result && <div className="game-result">{game.result}</div>}
                  <a href={`/game/${game.id}`} className="game-link">Посмотреть игру</a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
