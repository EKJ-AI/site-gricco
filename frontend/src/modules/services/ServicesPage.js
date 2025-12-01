import React, {useEffect} from "react";
import "./styles/Service.css";
import { useTranslation } from "../../shared/i18n";
import parse from 'html-react-parser';
import BlogSection from '../home/components/BlogSection';
import { useLayout } from '../../shared/contexts/LayoutContext';

export default function ServicePage({ title, description, services, image, color }) {
  const { t } = useTranslation();
  const { setLayout, resetLayout } = useLayout();

  useEffect(() => {
    // ao entrar na página
    setLayout({
      transparentNavbar: false,
      pageTitle: t('dashboard'),   // título na topbar
      showTopBar: true,
      showLeftSidebar: true,
      showRightPanel: true,        // ex.: painel lateral com filtros
    });

    // ao sair da página (volta pro default)
    return () => {
      resetLayout();
    };
  }, [setLayout, resetLayout, t]);

  return (
    <div>
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
        <h3>{parse(t(description))}</h3>
        <button className="services-cta-button">{t('services.button')}</button>
      </header>

      <section className="conteudo-interno services">
        <h2>{t('services.subtitle')}</h2>
        <br />
        <div className="services-cards" style={{'--dynamic-color': color,}}>
          {services.map((item, index) => (
            <div className="services-card" key={index}>
              <h3>{t(item.title)}</h3>
              <br />
              <p>{parse(t(item.description))}</p>
            </div>
          ))}
        </div>
        <br /><br />
        <BlogSection />
      </section>
    </div>
  );
}
