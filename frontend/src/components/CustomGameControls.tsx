import React from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import './Dashboard.css';

interface CustomGameControlsProps {
  minutes: number;
  increment: number;
  color: 'white' | 'black' | 'random';
  isRated: boolean;
  onMinutesChange: (value: number) => void;
  onIncrementChange: (value: number) => void;
  onColorChange: (color: 'white' | 'black' | 'random') => void;
  onRatedChange: (rated: boolean) => void;
  disabled?: boolean;
  minMinutes?: number;
  maxMinutes?: number;
  minIncrement?: number;
  maxIncrement?: number;
}

export const CustomGameControls: React.FC<CustomGameControlsProps> = ({
  minutes,
  increment,
  color,
  isRated,
  onMinutesChange,
  onIncrementChange,
  onColorChange,
  onRatedChange,
  disabled = false,
  minMinutes = 1,
  maxMinutes = 120,
  minIncrement = 0,
  maxIncrement = 120,
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="custom-controls">
      <div className="color-buttons">
        {[
          { key: 'random', label: t('random') },
          { key: 'white', label: t('white') },
          { key: 'black', label: t('black') },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            className={`color-btn ${color === item.key ? 'active' : ''}`}
            onClick={() => onColorChange(item.key as 'white' | 'black' | 'random')}
            disabled={disabled}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="slider-group">
        <div className="slider-row">
          <div className="slider-label">{t('minutes')}: {minutes}</div>
          <input
            type="range"
            min={minMinutes}
            max={maxMinutes}
            value={minutes}
            onChange={(e) => onMinutesChange(Number(e.target.value))}
            disabled={disabled}
          />
        </div>
        <div className="slider-row">
          <div className="slider-label">{t('increment')}: {increment} {t('sec')}</div>
          <input
            type="range"
            min={minIncrement}
            max={maxIncrement}
            value={increment}
            onChange={(e) => onIncrementChange(Number(e.target.value))}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isRated}
            onChange={(e) => onRatedChange(e.target.checked)}
            disabled={disabled}
          />
          <span>{t('ratedGame')}</span>
        </label>
      </div>
    </div>
  );
};
