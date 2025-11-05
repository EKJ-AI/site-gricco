import React from "react";
import "../styles/Contact_Form.css";
import { useTranslation } from "../../../shared/i18n";

const ContactForm = () => {
  const { t } = useTranslation();

  return (
    <section id="contact" className="contact-section">
      <div className="contact-container">
        <div className="contact-info">
          <h2>{t('contact_form_title')}</h2>
          <h3>{t('contact_form_subtitle')}</h3>
        </div>

        <form className="contact-form">
          <div className="form-group">
            <label htmlFor="name">{t('contact_form_name')}</label>
            <input type="text" id="name" name="name" placeholder={t("contact_form_name_placeholder")} required />
          </div>

          <div className="form-group">
            <label htmlFor="email">{t('contact_form_mail')}</label>
            <input type="email" id="email" name="email" placeholder={t("contact_form_mail_placeholder")} required />
          </div>

          <div className="form-group">
            <label htmlFor="subject">{t('contact_form_subject')}</label>
            <input type="text" id="subject" name="subject" placeholder={t("contact_form_subject_placeholder")} />
          </div>

          <div className="form-group">
            <label htmlFor="message">{t('contact_form_msg')}</label>
            <textarea id="message" name="message" rows="5" placeholder={t("contact_form_msg_placeholder")} required></textarea>
          </div>

          <button type="submit" className="contact-btn">{t('contact_form_button_text')}</button>
        </form>
      </div>
    </section>
  );
};

export default ContactForm;
