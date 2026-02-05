import React from 'react';
import './Dashboard.css';

interface GameTypeSelectorProps {
  selectedType: 'bullet' | 'blitz' | 'rapid' | 'custom' | null;
  onSelectType: (type: 'bullet' | 'blitz' | 'rapid' | 'custom') => void;
  disabled?: boolean;
  showCustomButton?: boolean;
}

const GAME_MODE_LABELS: Record<'bullet' | 'blitz' | 'rapid', string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
};

export const GameTypeSelector: React.FC<GameTypeSelectorProps> = ({
  selectedType,
  onSelectType,
  disabled = false,
  showCustomButton = true,
}) => {
  return (
    <>
      <div className="mode-buttons">
        {Object.entries(GAME_MODE_LABELS).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            className={`mode-btn ${selectedType === mode ? 'active' : ''}`}
            onClick={() => onSelectType(mode as 'bullet' | 'blitz' | 'rapid')}
            disabled={disabled}
          >
            {label}
          </button>
        ))}
      </div>
      {showCustomButton && (
        <div className="custom-row">
          <button
            type="button"
            className={`mode-btn custom-btn ${selectedType === 'custom' ? 'active' : ''}`}
            onClick={() => onSelectType('custom')}
            disabled={disabled}
          >
            Custom
          </button>
        </div>
      )}
    </>
  );
};
