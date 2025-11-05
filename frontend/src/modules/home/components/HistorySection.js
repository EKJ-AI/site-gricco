import React from 'react';
import '../styles/HistorySection.css';
import Timeline from './Timeline';
import { useTranslation } from '../../../shared/i18n';

const HistorySection = () => {
  const { t } = useTranslation();
  return (
    <section id="about-us" className="history-section">
      <h1 className="section-title">{t("history_title")}</h1>

      <div className="history-content">
        {/* Linha do tempo à esquerda */}
        <div className="timeline-column">
          <Timeline />
        </div>

        {/* Texto à direita */}
        <div className="text-column">
          <p>
            {t('history_paragraph1')}
          </p>
          <p>
            {t('history_paragraph2')}
          </p>
          <h2>
            {t('history_mission')}
          </h2>
          <p>
            {t('history_mission_text')}
          </p>
          <h2>
            {t('history_vision')}
          </h2>
          <p>
            {t('history_vision_text')}
          </p>
          <h2>
            {t('history_goals')}
          </h2>
          <p>
            {t('history_goals_text')}
          </p>
        </div>
      </div>
    </section>
  );
};

export default HistorySection;
