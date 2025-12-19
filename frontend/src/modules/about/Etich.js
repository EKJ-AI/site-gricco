import React, { useEffect } from "react";
import "./styles/About.css";
import "./styles/Etich.css";

import { useTranslation } from "../../shared/i18n";
import slide1 from "../../shared/assets/images/about/Etica.jpg";
import parse from "html-react-parser";
import { useLayout } from "../../shared/contexts/LayoutContext";

export default function Etich() {
  const { t } = useTranslation();
  const { setLayout, resetLayout } = useLayout();

  useEffect(() => {
    setLayout({
      transparentNavbar: false,
      pageTitle: t("dashboard"),
      showTopBar: true,
      showLeftSidebar: true,
      showRightPanel: true,
    });

    return () => {
      resetLayout();
    };
  }, [setLayout, resetLayout, t]);

  const etich = {
    title: "ethic.conduct",
    description: "ethic.conduct.desc",
    image: slide1,
    color: "#64a70b",
  };

  const htmlContent = t("ethic.conduct.content") || "";

  return (
    <div className="about-page etich-page">
      <header
        className="about-hero"
        style={{
          "--dynamic-color": etich.color,
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${etich.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <h1>{t(etich.title)}</h1>
        <p>{t(etich.description)}</p>
      </header>

      <section className="conteudo-interno">
        <div
          className="about-cards"
          style={{ "--dynamic-color": etich.color, display: "block" }}
        >
          {parse(htmlContent)}
        </div>
      </section>
    </div>
  );
}
