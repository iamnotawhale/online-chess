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
    <div className="page-wrapper page-wrapper--wide arena-page">
      <div className="page-hero">
        <div>
          <h1 className="page-title">{t('navArena')}</h1>
          <p className="page-subtitle">{t('arenaDesc')}</p>
        </div>
      </div>

      <div className="cc-card">
        {arenas.length === 0 ? (
          <p className="empty-state">{t('noArenas')}</p>
        ) : (
          <ul className="arena-list">
            {arenas.map((a) => (
              <li key={a.id}>
                <Link to={`/arena/${a.id}`} className="arena-list-item">
                  <span className="arena-list-item__name">{a.name}</span>
                  <span className="arena-list-item__meta">{a.timeControl}</span>
                  <span className={`arena-status arena-status--${a.status}`}>{a.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
