import "./Timeline.css";
import React from "react";
import { useTranslation } from '../../../shared/i18n';

const Timeline = () => {
  const { t } = useTranslation();
  const timelineItems = [
    {
      year: t("home.ourstory.2019.title"),
      text: t("home.ourstory.2019.description"),
    },
    {
      year: t("home.ourstory.2023.title"),
      text: t("home.ourstory.2023.description"),
    },
    {
      year: t("home.ourstory.2024.title1"),
      text: t("home.ourstory.2024.description1"),
    },
    {
      year: t("home.ourstory.2024.title2"),
      text: t("home.ourstory.2024.description2"),
    },
    {
      year: t("home.ourstory.2025.title1"),
      text: t("home.ourstory.2025.description1"),
    },
    {
      year: t("home.ourstory.2025.title2"),
      text: t("home.ourstory.2025.description2"),
    },
  ];

  return (
    <section id="about-us" className="conteudo bg-color-gray">
        <div className="conteudo-interno">
            <header className="timeline-header">
                <h1 className="timeline-title">{t("home.ourstory.title")}</h1>
            </header>

            <div className="timeline">
                <div
                className="timeline-grid"
                style={{
                    gridTemplateColumns: `repeat(${timelineItems.length}, minmax(0, 1fr))`,
                }}
                >
                {/* linha central (desktop) */}
                <div
                    className="timeline-line"
                    aria-hidden="true"
                    style={{ gridColumn: "1 / -1", gridRow: 2 }}
                />

                {timelineItems.map((item, index) => {
                    const column = index + 1;
                    const isBottom = index % 2 === 1;

                    return (
                    <React.Fragment key={`${item.year}-${index}`}>
                        {/* ponto na linha central */}
                        <div
                        className="timeline-dot-wrapper"
                        style={{ gridColumn: column, gridRow: 2 }}
                        aria-hidden="true"
                        >
                        <span className="timeline-dot" />
                        </div>

                        {/* card em cima ou embaixo */}
                        <article
                        className={`timeline-card-wrapper ${
                            isBottom ? "bottom" : "top"
                        }`}
                        style={{ gridColumn: column, gridRow: isBottom ? 3 : 1 }}
                        >
                        <div className="timeline-card">
                            <h2 className="timeline-year">{item.year}</h2>
                            <p className="timeline-text">{item.text}</p>
                        </div>
                        </article>
                    </React.Fragment>
                    );
                })}
                </div>
            </div>
        </div>
    </section>
  );
};

export default Timeline;
