import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import { RatingChart } from './RatingChart';
import { getBoardTheme, setBoardTheme, BoardTheme } from '../utils/boardTheme';
import './Profile.css';

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  rating: number;
  country?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt?: string;
  stats?: {
    wins: number;
    losses: number;
    draws: number;
    totalGames: number;
  };
}

const COUNTRIES = [
  { code: '', name: 'Select Country' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'CA', name: 'Canada' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'EE', name: 'Estonia' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LY', name: 'Libya' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KP', name: 'North Korea' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PS', name: 'Palestine' },
  { code: 'PA', name: 'Panama' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'KR', name: 'South Korea' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZW', name: 'Zimbabwe' },
];

const DEFAULT_AVATARS = [
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

export const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [boardTheme, setBoardThemeState] = useState<BoardTheme>(getBoardTheme());
  const [editData, setEditData] = useState({
    username: '',
    password: '',
    country: '',
    bio: '',
    avatarUrl: '',
  });

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    if (!username) {
      setError('Username not provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.getUserByUsername(username);
      setProfile(response);

      // Check if this is the current user's profile
      const currentUser = await apiService.getMe();
      setIsOwnProfile(currentUser.id === response.id);

      setEditData({
        username: response.username || '',
        password: '',
        country: response.country || '',
        bio: response.bio || '',
        avatarUrl: response.avatarUrl || '',
      });
      setError('');
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const updateData: any = {};
      
      if (editData.username && editData.username !== profile?.username) {
        updateData.username = editData.username;
      }
      if (editData.password) {
        updateData.password = editData.password;
      }
      if (editData.country) {
        updateData.country = editData.country;
      }
      if (editData.bio !== undefined) {
        updateData.bio = editData.bio;
      }
      if (editData.avatarUrl !== undefined && editData.avatarUrl !== profile?.avatarUrl) {
        updateData.avatarUrl = editData.avatarUrl;
      }

      await apiService.updateProfile(updateData);
      
      // Reload profile after update
      await loadProfile();
      setIsEditing(false);
      setEditData({ ...editData, password: '' });

      window.dispatchEvent(new Event('profileUpdated'));
      
      // If username changed, navigate to new profile URL
      if (updateData.username) {
        navigate(`/profile/${updateData.username}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
      console.error(err);
    }
  };

  const handleBoardThemeChange = (theme: BoardTheme) => {
    setBoardTheme(theme);
    setBoardThemeState(theme);
  };

  if (loading) {
    return <div className="profile-container">{t('loading')}</div>;
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate(-1)} className="back-btn">{t('back')}</button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container">
        <div className="error-message">Profile not found</div>
        <button onClick={() => navigate(-1)} className="back-btn">{t('back')}</button>
      </div>
    );
  }

  const stats = profile.stats || { wins: 0, losses: 0, draws: 0, totalGames: 0 };
  const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;

  const getAvatarDisplay = () => {
    const avatarId = profile.avatarUrl;
    const defaultAvatar = DEFAULT_AVATARS.find(a => a.id === avatarId);
    
    if (defaultAvatar) {
      return (
        <div className="avatar-placeholder" style={{ background: defaultAvatar.gradient }}>
          <span style={{ fontSize: '48px' }}>{defaultAvatar.icon}</span>
        </div>
      );
    } else if (avatarId && !avatarId.startsWith('data:')) {
      return <img src={avatarId} alt={profile.username} />;
    } else {
      return <div className="avatar-placeholder">{profile.username.charAt(0).toUpperCase()}</div>;
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-content">
        <div className="profile-header">
          <div className="profile-avatar">
            {getAvatarDisplay()}
          </div>

          <div className="profile-info">
            <div className="profile-title">
              <h1>
                {profile.username}
                {profile.country && (
                  <img
                    className="country-flag"
                    src={`https://flagcdn.com/w20/${profile.country.toLowerCase()}.png`}
                    srcSet={`https://flagcdn.com/w40/${profile.country.toLowerCase()}.png 2x`}
                    alt={profile.country.toUpperCase()}
                    loading="lazy"
                  />
                )}
              </h1>
            </div>

            <div className="rating-section">
              <div className="rating-display">
                <span className="rating-label">{t('rating')}</span>
                <span className="rating-value">{profile.rating}</span>
              </div>
            </div>

            {profile.bio && !isEditing && (
              <div className="bio-section">
                <p>{profile.bio}</p>
              </div>
            )}

            {isEditing && isOwnProfile && (
              <div className="edit-section">
                <input
                  type="text"
                  placeholder={t('username') || 'Username'}
                  value={editData.username}
                  onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                  maxLength={20}
                  className="edit-input"
                />
                <input
                  type="password"
                  placeholder={t('newPassword')}
                  value={editData.password}
                  onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                  className="edit-input"
                />
                <select
                  value={editData.country}
                  onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                  className="edit-select"
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
                
                <div className="avatar-selector">
                  <label className="avatar-selector-label">{t('chooseAvatar')}</label>
                  <div className="avatar-grid">
                    {DEFAULT_AVATARS.map((avatar) => (
                      <div
                        key={avatar.id}
                        className={`avatar-option ${editData.avatarUrl === avatar.id ? 'selected' : ''}`}
                        style={{ background: avatar.gradient }}
                        onClick={() => setEditData({ ...editData, avatarUrl: avatar.id })}
                        title={avatar.id}
                      >
                        <span className="avatar-icon">{avatar.icon}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="board-theme-section">
                  <label className="section-label">{t('boardTheme')}</label>
                  <div className="board-theme-selector">
                    <div 
                      className={`theme-option ${boardTheme === 'green' ? 'selected' : ''}`}
                      onClick={() => handleBoardThemeChange('green')}
                    >
                      <div className="theme-preview">
                        <div className="square light" style={{ backgroundColor: '#eeeed2' }}></div>
                        <div className="square dark" style={{ backgroundColor: '#739552' }}></div>
                      </div>
                      <span>{t('green')}</span>
                    </div>
                    <div 
                      className={`theme-option ${boardTheme === 'brown' ? 'selected' : ''}`}
                      onClick={() => handleBoardThemeChange('brown')}
                    >
                      <div className="theme-preview">
                        <div className="square light" style={{ backgroundColor: '#f0d9b5' }}></div>
                        <div className="square dark" style={{ backgroundColor: '#b58863' }}></div>
                      </div>
                      <span>{t('brown')}</span>
                    </div>
                    <div 
                      className={`theme-option ${boardTheme === 'blue' ? 'selected' : ''}`}
                      onClick={() => handleBoardThemeChange('blue')}
                    >
                      <div className="theme-preview">
                        <div className="square light" style={{ backgroundColor: '#dee3e6' }}></div>
                        <div className="square dark" style={{ backgroundColor: '#8ca2ad' }}></div>
                      </div>
                      <span>{t('blue')}</span>
                    </div>
                    <div 
                      className={`theme-option ${boardTheme === 'purple' ? 'selected' : ''}`}
                      onClick={() => handleBoardThemeChange('purple')}
                    >
                      <div className="theme-preview">
                        <div className="square light" style={{ backgroundColor: '#e8e1f5' }}></div>
                        <div className="square dark" style={{ backgroundColor: '#9b7bb5' }}></div>
                      </div>
                      <span>{t('purple')}</span>
                    </div>
                  </div>
                </div>

                <textarea
                  placeholder={t('bio') || 'Bio'}
                  value={editData.bio}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  maxLength={200}
                  rows={3}
                  className="edit-textarea"
                />
                <div className="edit-actions">
                  <button onClick={handleSaveProfile} className="save-btn">{t('save')}</button>
                  <button onClick={() => setIsEditing(false)} className="cancel-btn">{t('cancel')}</button>
                </div>
              </div>
            )}

            {isOwnProfile && !isEditing && (
              <button onClick={() => setIsEditing(true)} className="edit-profile-btn">
                {t('editProfile')}
              </button>
            )}
          </div>
        </div>

        {isOwnProfile && <RatingChart />}

        <div className="profile-stats">
          <h2>{t('statistics')}</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">{t('games')}</span>
              <span className="stat-value">{stats.totalGames}</span>
            </div>
            <div className="stat-card win">
              <span className="stat-label">{t('wins')}</span>
              <span className="stat-value">{stats.wins}</span>
            </div>
            <div className="stat-card draw">
              <span className="stat-label">{t('draws')}</span>
              <span className="stat-value">{stats.draws}</span>
            </div>
            <div className="stat-card loss">
              <span className="stat-label">{t('losses')}</span>
              <span className="stat-value">{stats.losses}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t('winRate')}</span>
              <span className="stat-value">{winRate}%</span>
            </div>
          </div>
        </div>

        <button onClick={() => navigate(-1)} className="back-btn">{t('back')}</button>
      </div>
    </div>
  );
};
