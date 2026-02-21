import React from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import './LessonTheoryModal.css';

interface LessonTheoryModalProps {
  isOpen: boolean;
  title: string;
  content: string;
  onClose: () => void;
}

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
          {content.split('\n\n').map((paragraph, idx) => (
            <p key={idx}>
              {paragraph.split('\n').map((line, lineIdx) => (
                <React.Fragment key={lineIdx}>
                  {line}
                  {lineIdx < paragraph.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          ))}
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
