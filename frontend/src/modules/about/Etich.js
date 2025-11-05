import React from "react";
import "./styles/About.css";
import "./styles/Etich.css";
import { useTranslation } from "../../shared/i18n";
//import slide1 from '../../shared/assets/images/home/slide1.jpg';
import slide1 from '../../shared/assets/images/about/Etica.jpg';
import parse from 'html-react-parser';

export default function Etich({ title, description, services, image, color }) {
  const { t } = useTranslation();

  const etich = {
    title: "ethic.conduct",
    description: "ethic.conduct.desc",
    services: [
      { title: "sustainability.services.management", description: "sustainability.services.gestao_desc" },
      { title: "sustainability.services.certifications", description: "sustainability.services.certificacoes_desc" },
      { title: "sustainability.services.analyses", description: "sustainability.services.analises_desc" },
      { title: "sustainability.services.compliance", description: "sustainability.services.conformidade_desc" },
    ],
    image: slide1,
    color: "#64a70b"
  };
  const htmlContent = t("ethic.conduct.content") || "";

  return (
    <div className="about-page">
      <header className="about-hero" 
        style={{
          '--dynamic-color': etich.color,
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${etich.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
      }}
      >
        <h1>{t(etich.title)}</h1>
        <p>{t(etich.description)}</p>
        {/* <button className="about-button">{t('services_button')}</button> */}
      </header>

      <section className="about-section">
        {/* <h2>{t('services_subtitle')}</h2> */}
        <div className="about-cards" style={{'--dynamic-color': etich.color, display: 'block'}}>
          {
            // html(doc.body.querySelector('*'))
            parse(htmlContent)
          }
        </div>
      </section>
    </div>
  );
}
