import React from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import './LessonTheoryModal.css';

interface LessonTheoryModalProps {
  isOpen: boolean;
  title: string;
  content: string;
  onClose: () => void;
}

// Simple markdown parser for **bold**, *italic*, and list items
const parseMarkdown = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Match **bold**
    const boldMatch = remaining.match(/^\*\*([^\*]+)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Match *italic*
    const italicMatch = remaining.match(/^\*([^\*]+)\*/);
    if (italicMatch) {
      parts.push(<em key={key++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Match regular text up to next formatting
    const nextFormatIdx = Math.min(
      remaining.indexOf('**') === -1 ? Infinity : remaining.indexOf('**'),
      remaining.indexOf('*') === -1 ? Infinity : remaining.indexOf('*')
    );

    if (nextFormatIdx === Infinity) {
      // No more formatting, take the rest
      parts.push(remaining);
      remaining = '';
    } else {
      // Take text up to next formatting
      parts.push(remaining.slice(0, nextFormatIdx));
      remaining = remaining.slice(nextFormatIdx);
    }
  }

  return parts;
};

export const LessonTheoryModal: React.FC<LessonTheoryModalProps> = ({
  isOpen,
  title,
  content,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {content.split('\n').map((line, idx) => {
            const trimmed = line.trim();

            // List item
            if (trimmed.startsWith('- ')) {
              return (
                <li key={idx} className="modal-list-item">
                  {parseMarkdown(trimmed.slice(2))}
                </li>
              );
            }

            // Heading (e.g., "**Key idea:**")
            if (trimmed.startsWith('**') && trimmed.includes(':')) {
              return (
                <p key={idx} className="modal-section-title">
                  {parseMarkdown(trimmed)}
                </p>
              );
            }

            // Regular paragraph (skip empty lines)
            if (trimmed) {
              return (
                <p key={idx}>
                  {parseMarkdown(trimmed)}
                </p>
              );
            }

            return null;
          })}
        </div>
        <div className="modal-footer">
          <button className="modal-btn-close" onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
