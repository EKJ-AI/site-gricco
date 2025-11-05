import React from 'react';
import '../home/styles/Home.css';
import Navbar from '../../shared/components/Navbar';
import '../../shared/styles/NavBar.css';
import { useTranslation } from '../../shared/i18n';
import TestimonialsSection from './components/Testimonials';
import ServiceHighlights from './components/ServiceHighlights';
import Hero from './components/Hero';
import HistorySection from './components/HistorySection';
import ContactForm from './components/Contact_Form';
import BlogSection from './components/BlogSection';

const HomePage = () => {

  const { t } = useTranslation();

  return (
     <div className="home-page">
      <div className="hero-section">
        <div className="background-image" />
            <div className="overlay-dark">
                {/* <Navbar /> */}
                <Hero />
            </div>
       </div>
        <ServiceHighlights/>
        <TestimonialsSection />
        <HistorySection/>
        <ContactForm/>
        <BlogSection/>
    </div>
  );
};

export default HomePage;

