import React from "react";
import "../styles/Timeline.css";
import { useTranslation } from "../../../shared/i18n";

export default function Timeline() {
    const { t } = useTranslation();
    const milestones = [
  { year: "2005", description: t('timeline_card1') },
  { year: "2015", description: t('timeline_card2') },
  { year: "2019", description: t('timeline_card3') },
  { year: "2023", description: t('timeline_card4') },
];


  return (
    <div className="timeline-container">
      <div className="timeline-line"></div>

      {milestones.map((milestone, i) => (
        <div
          key={milestone.year}
          className={`timeline-item ${i % 2 === 0 ? "left" : "right"}`}
          style={{ animationDelay: `${i * 0.3 + 0.2}s` }}
        >
          <div className="timeline-year">{milestone.year}</div>
          <div className="timeline-desc">{milestone.description}</div>
        </div>
      ))}
    </div>
  );
}
