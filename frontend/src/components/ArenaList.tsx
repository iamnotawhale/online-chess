import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';

export const ArenaList: React.FC = () => {
  const { t } = useTranslation();
  const [arenas, setArenas] = useState<any[]>([]);

  useEffect(() => {
    apiService.getArenas().then(setArenas).catch(() => setArenas([]));
    const id = setInterval(() => apiService.getArenas().then(setArenas).catch(() => undefined), 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="page-wrapper">
      <h1>{t('navArena')}</h1>
      <p>{t('arenaDesc')}</p>
      {arenas.length === 0 ? <p>{t('noArenas')}</p> : (
        <ul className="arena-list">
          {arenas.map((a) => (
            <li key={a.id}>
              <Link to={`/arena/${a.id}`} className="arena-list-item">
                <strong>{a.name}</strong>
                <span>{a.timeControl} · {a.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
