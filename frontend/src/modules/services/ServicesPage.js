import React from "react";
import "./styles/Service.css";
import { useTranslation } from "../../shared/i18n";
import parse from 'html-react-parser';
import BlogSection from '../home/components/BlogSection';

export default function ServicePage({ title, description, services, image, color }) {
  const { t } = useTranslation();

  return (
    <div className="services-page">
      <header className="services-hero" 
        style={{
          '--dynamic-color': color,
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
      }}
      >
        <h1>{t(title)}</h1>
        <p>{parse(t(description))}</p>
        <button className="services-cta-button">{t('services_button')}</button>
      </header>

      <section className="services-section">
        <h2>{t('services_subtitle')}</h2>
        <div className="services-cards" style={{'--dynamic-color': color,}}>
          {services.map((item, index) => (
            <div className="services-card" key={index}>
              <h3>{t(item.title)}</h3>
              <p>{parse(t(item.description))}</p>
            </div>
          ))}
        </div>
        <BlogSection />
      </section>
    </div>
  );
}
