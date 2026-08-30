import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';

export const ArenaPage: React.FC = () => {
  const { arenaId } = useParams<{ arenaId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [arena, setArena] = useState<any>(null);
  const [standings, setStandings] = useState<any[]>([]);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);

  const load = async () => {
    if (!arenaId) return;
    try {
      const [a, s, me] = await Promise.all([
        apiService.getArena(arenaId),
        apiService.getArenaStandings(arenaId),
        apiService.getMe().catch(() => null),
      ]);
      setArena(a);
      setStandings(s);
      if (me) setJoined(s.some((p: any) => p.userId === me.id));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [arenaId]);

  const handleJoin = async () => {
    if (!arenaId) return;
    setJoining(true);
    try {
      await apiService.joinArena(arenaId);
      load();
    } finally {
      setJoining(false);
    }
  };

  if (!arena) return <div className="page-wrapper"><p>{t('loading')}</p></div>;

  return (
    <div className="page-wrapper page-wrapper--wide arena-page">
      <div className="page-hero">
        <div>
          <h1 className="page-title">{arena.name}</h1>
          <p className="page-subtitle">{arena.timeControl} · {arena.status}</p>
        </div>
        {joined ? (
          <button type="button" className="btn btn-primary" onClick={() => navigate('/play')}>{t('findOpponent')}</button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={handleJoin} disabled={joining}>{joining ? t('loading') : t('joinArena')}</button>
        )}
      </div>

      <div className="cc-card">
        <div className="cc-card__head">
          <h2 className="cc-card__title">{t('standings')}</h2>
        </div>
        {standings.length === 0 ? (
          <p className="empty-state">{t('noGames')}</p>
        ) : (
          <table className="arena-standings">
            <thead><tr><th>#</th><th>{t('username')}</th><th>{t('score')}</th></tr></thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.userId}><td>{i + 1}</td><td>{s.username}</td><td>{s.score}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
