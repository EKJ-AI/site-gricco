import React, { useState, useEffect, useRef } from "react";
import "../styles/Carousel.css";
import { useTranslation } from "../../../shared/i18n";
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';

import slide1 from "../../../shared/assets/images/home/slide1.jpg";
import slide2 from "../../../shared/assets/images/home/slide2.jpg";
import slide3 from "../../../shared/assets/images/home/slide3.jpg";
import slide4 from "../../../shared/assets/images/home/slide4.jpg";
import slide5 from "../../../shared/assets/images/home/slide5.jpg";


export default function Carousel() {
  const [current, setCurrent] = useState(0);
  const timeoutRef = useRef(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const slides = [
    { id: 1, image: slide1, title: t("carousel_slide1_title"), description: t("carousel_slide1_subtitle"), route: "qsms" },
    { id: 2, image: slide2, title: t("carousel_slide2_title"), description: t("carousel_slide2_subtitle"), route: "sustainability" },
    { id: 3, image: slide3, title: t("carousel_slide3_title"), description: t("carousel_slide3_subtitle"), route: "business" },
    { id: 4, image: slide4, title: t("carousel_slide4_title"), description: t("carousel_slide4_subtitle"), route: "qsmsmanagement" },
    { id: 5, image: slide5, title: t("carousel_slide5_title"), description: t("carousel_slide5_subtitle"), route: "offshore" },
    ];

  useEffect(() => {
    // Limpa timeout anterior e seta novo autoplay
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 10000);

    return () => clearTimeout(timeoutRef.current);
  }, [current]);

  // Navegação manual
  const prevSlide = () => {
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="carousel-wrapper">
        <div className="carousel">
            <div className="slides" style={{ transform: `translateX(-${current * 100}%)` }}>
                {slides.map(({ id, image, alt, title, description, route }) => (
                    <div key={id} className="slide">
                        <img src={image} alt={alt} />
                        <div className="overlay">
                            <h2>{title}</h2>
                            <p>{description}</p>
                            <button className="cta-button" onClick={() => navigate(`/${route}`)}>{t("carousel_button_text")}</button>
                        </div>
                    </div>
                    ))}
                </div>

                <button className="arrow left-arrow" onClick={prevSlide} aria-label="Anterior">
                    ‹
                </button>
                <button className="arrow right-arrow" onClick={nextSlide} aria-label="Próximo">
                    ›
                </button>

                <div className="dots">
                    {slides.map((_, idx) => (
                    <button
                        key={idx}
                        className={`dot ${current === idx ? "active" : ""}`}
                        onClick={() => setCurrent(idx)}
                        aria-label={`Ir para o slide ${idx + 1}`}
                    />
                    ))}
                </div>
            </div>
        </div>
    );
}