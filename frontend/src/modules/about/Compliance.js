import React, { useEffect } from "react";
import "./styles/About.css";
import "./styles/Compliance.css";

import { useTranslation } from "../../shared/i18n";
import slide1 from "../../shared/assets/images/about/PoliticaCompliance.jpg";
import parse from "html-react-parser";
import { useLayout } from "../../shared/contexts/LayoutContext";
import FormularioSimples from "../../shared/components/FormularioSimples.js";

export default function Compliance() {
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

  const compliance = {
    title: "policy.compliance.ethic",
    description: "policy.compliance.ethic.desc",
    image: slide1,
    color: "#64a70b",
  };

  const htmlContent = t("policy.compliance.ethic.content") || "";

  return (
    <div className="about-page compliance-page">
      <header
        className="about-hero"
        style={{
          "--dynamic-color": compliance.color,
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${compliance.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <h1>{t(compliance.title)}</h1>
        <p>{t(compliance.description)}</p>
      </header>

      <section className="conteudo-interno">
        <div
          className="about-cards"
          style={{ "--dynamic-color": compliance.color, display: "block" }}
        >
          {parse(htmlContent)}
        </div>
      </section>

      <section className="conteudo">
        <FormularioSimples />
      </section>
    </div>
  );
}
