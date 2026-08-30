import React from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import { TranslationKey } from '../i18n/translations';
import { TimeControlRating } from '../api';

const CATEGORY_I18N: Record<string, TranslationKey> = {
  bullet: 'bullet',
  blitz: 'blitz',
  rapid: 'rapid',
  classical: 'classic',
  classic: 'classic',
};

const CATEGORY_ORDER = ['bullet', 'blitz', 'rapid', 'classical', 'classic'];

type Props = {
  ratings: TimeControlRating[];
  compact?: boolean;
};

export const TimeControlRatings: React.FC<Props> = ({ ratings, compact = false }) => {
  const { t } = useTranslation();

  if (!ratings.length) {
    return null;
  }

  const sorted = [...ratings].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  );

  return (
    <div className={`tc-ratings${compact ? ' tc-ratings--compact' : ''}`}>
      {sorted.map((entry) => {
        const labelKey = CATEGORY_I18N[entry.category] ?? 'rating';
        return (
          <span key={entry.category} className="tc-rating-badge">
            <span className="tc-rating-badge__label">{t(labelKey)}</span>
            <span className="tc-rating-badge__value">{entry.rating}</span>
          </span>
        );
      })}
    </div>
  );
};
