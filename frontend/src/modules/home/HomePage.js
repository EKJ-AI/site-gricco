import React, { useEffect } from 'react';
import './styles/Home.css';
import { useLayout } from '../../shared/contexts/LayoutContext';
import { useTranslation } from '../../shared/i18n';
import Banner from './components/Banner';
import Solucoes from './components/Solucoes';
import Carousel from './components/Carousel';
import Testimonials from './components/Testimonials';
import History from './components/History';
import Timeline from './components/Timeline';
import FormularioSimples from '../../shared/components/FormularioSimples';
//import ContactForm from './components/Contact_Form';
//import BlogSection from './components/BlogSection';

const HomePage = () => {

  const { t } = useTranslation();
  const { setLayout, resetLayout } = useLayout();

  useEffect(() => {
    // ao entrar na página
    setLayout({
      pageTitle: t('Home'),   // título na topbar
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
     <div className="home-page">
      <Banner/>
      <Solucoes />
      <Carousel />
      <Testimonials />
      <Timeline />
      <History />
      <FormularioSimples />
      {/* <div className="hero-section">
        <div className="background-image" />
            <div className="overlay-dark">
                <Hero />
            </div>
       </div>
        <ServiceHighlights/>
        <TestimonialsSection />
        <HistorySection/>
        <ContactForm/>
        <BlogSection/> */}
    </div>
  );
};

export default HomePage;

