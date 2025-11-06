// Footer.jsx
import React from 'react';
import logo from '../assets/images/lgGricco_white.svg';
import "./../styles/Footer.css"
import { useTranslation } from '../i18n';

const Footer = () => {
    const { t } = useTranslation();

  return (
    <footer className="footer">
        <div className="footer-container">
            <div className="footer-logo">
            <img src={logo} alt={t("footer_logo_alt")} />
            </div>

            <div className="footer-column">
            <h4>{t("footer_info_title")}</h4>
            <p>{t("footer_info_location")}</p>
            <p>
                <a href="mailto:operational@ekj-corp.com">{t("footer_info_email")}</a>
            </p>
            <p>{t("footer_info_phone")}</p>
            </div>

            <div className="footer-column">
            <h4>{t("footer_services_title")}</h4>
            <p><a href="/qsms">{t("footer_services_qsms")}</a></p>
            <p><a href="/offshore">{t("footer_services_maritime")}</a></p>
            <p><a href="/qsmsmanagement">{t("footer_services_operational")}</a></p>
            <p><a href="/sustainability">{t("footer_services_sustainability")}</a></p>
            <p><a href="/business">{t("footer_services_business")}</a></p>
            </div>

            <div className="footer-column">
            <h4>{t("footer_company_title")}</h4>
            <p><a href="/#services">{t("footer_company_services")}</a></p>
            <p><a href="/#about-us">{t("footer_company_about")}</a></p>
            <p><a href="/#blog">{t("footer_company_articles")}</a></p>
            <p><a href="/#contact">{t("footer_company_contact")}</a></p>
            </div>
        </div>
    </footer>
  );
};

export default Footer;
