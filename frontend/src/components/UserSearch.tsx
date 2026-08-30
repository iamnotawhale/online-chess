import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import './UserSearch.css';

export const UserSearch: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    try {
      const data = await apiService.searchUsers(query.trim());
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-search page-wrapper">
      <h1>{t('searchUsers')}</h1>
      <form onSubmit={handleSearch} className="search-form">
        <input className="form-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('username')} />
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? t('loading') : t('search')}</button>
      </form>
      <ul className="search-results">
        {results.map((u) => (
          <li key={u.id} className="search-result-item">
            <button type="button" onClick={() => navigate(`/user/${u.username}`)}>
              <span className="search-name">{u.username}</span>
              <span className="search-rating">{u.rating}</span>
              {u.online && <span className="online-dot" title={t('online')} />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
