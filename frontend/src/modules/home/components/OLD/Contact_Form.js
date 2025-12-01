// import React from "react";
// import "../styles/Contact_Form.css";
// import { useTranslation } from "../../../../shared/i18n";

// const ContactForm = () => {
//   const { t } = useTranslation();

//   return (
//     <section id="contact" className="contact-section">
//       <div className="contact-container">
//         <div className="contact-info">
//           <h2>{t('contact.form.title')}</h2>
//           <h3>{t('contact.form.subtitle')}</h3>
//         </div>

//         <form className="contact-form">
//           <div className="form-group">
//             <label htmlFor="name">{t('contact.form.name')}</label>
//             <input type="text" id="name" name="name" placeholder={t("contact.form.name.placeholder")} required />
//           </div>

//           <div className="form-group">
//             <label htmlFor="email">{t('contact.form.mail')}</label>
//             <input type="email" id="email" name="email" placeholder={t("contact.form.mail.placeholder")} required />
//           </div>

//           <div className="form-group">
//             <label htmlFor="subject">{t('contact.form.subject')}</label>
//             <input type="text" id="subject" name="subject" placeholder={t("contact.form.subject.placeholder")} />
//           </div>

//           <div className="form-group">
//             <label htmlFor="message">{t('contact.form.msg')}</label>
//             <textarea id="message" name="message" rows="5" placeholder={t("contact.form.msg.placeholder")} required></textarea>
//           </div>

//           <button type="submit" className="contact-btn">{t('contact.form.button.text')}</button>
//         </form>
//       </div>
//     </section>
//   );
// };

// export default ContactForm;
