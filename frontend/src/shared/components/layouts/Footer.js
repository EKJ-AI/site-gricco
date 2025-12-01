// Footer.jsx
import React from 'react';
import logo from '../../assets/images/lgGricco_white_002.svg';
import iconFacebook from '../../assets/images/iconFacebook.svg';
import iconInstagram from '../../assets/images/iconInstagram.svg';
import iconYoutube from '../../assets/images/iconYoutube.svg';
import iconLinkedin from '../../assets/images/iconLinkedin.svg';
import "./Footer.css"
import { useTranslation } from '../../i18n';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="conteudo footer">
      <div className="conteudo-interno">
        <div className="footer-logo">
          <img src={logo} alt={t("footer_logo_alt")} />
        </div>

        <div className="footer-column">
          <h4>{t("footer.company.title")}</h4>
          <p><a href="/#services">{t("footer.company.services")}</a></p>
          <p><a href="/#about-us">{t("footer.company.about")}</a></p>
          <p><a href="/#blog">{t("footer.company.articles")}</a></p>
          <p><a href="/#contact">{t("footer.company.contact")}</a></p>
        </div>
        <div className="footer-column">
          <h4>{t("footer.services.title")}</h4>
          <p><a href="/qsms">{t("footer.services.qsms")}</a></p>
          <p><a href="/offshore">{t("footer.services.maritime")}</a></p>
          <p><a href="/qsmsmanagement">{t("footer.services.operational")}</a></p>
          <p><a href="/sustainability">{t("footer.services.sustainability")}</a></p>
          <p><a href="/business">{t("footer.services.business")}</a></p>
        </div>
        <div className="footer-column">
          <h4>{t("footer.info.title")}</h4>
          <p>{t("footer.info.location")}</p>
          <p>
            <a href="mailto:operational@ekj-corp.com">{t("footer.info.email")}</a>
          </p>
          <p>{t("footer.info.phone")}</p>
        </div>        
      </div>
      <div className="footer-bottom conteudo-interno">
        <div className='logos-redes-sociais'>
          <img src={iconFacebook} alt="" />
          <img src={iconInstagram} alt="" />
          <img src={iconYoutube} alt="" />
          <img src={iconLinkedin} alt="" />
        </div>
        <p>{t("footer.copyright")}</p>
      </div>
    </footer>
  );
};

export default Footer;
