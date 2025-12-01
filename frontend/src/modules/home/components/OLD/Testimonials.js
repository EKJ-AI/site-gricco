// import React from 'react';
// import PropTypes from 'prop-types';
// import { useTranslation } from '../../../../shared/i18n';
// import "../styles/Testimonials.css";

// const TestimonialsCard = ({ quote, author, company }) => (
//   <article className="testimonial-card" tabIndex="0" aria-label={`Testimonial by ${author}`}>
//     <blockquote>"{quote}"</blockquote>
//     <p className="author">— {author}</p>
//     <p className="author">{company}</p>
//   </article>
// );

// TestimonialsCard.propTypes = {
//   quote: PropTypes.string.isRequired,
//   author: PropTypes.string.isRequired,
//   company: PropTypes.string.isRequired,
// };

// const TestimonialsSection = () => {
//   const { t } = useTranslation();

//   const testimonialsData = [
//     {
//       id: 1,
//       quote: t('testimonial1'),
//       author: t('client.name.testimonial1'),
//       company: t('client.company.name.testimonial1'),
//     },
//     {
//       id: 2,
//       quote: t('testimonial2'),
//       author: t('client.name.testimonial2'),
//       company: t('client.company.name.testimonial2'),
//     },
//   ];

//   return (
//     <section className="testimonials" aria-labelledby="testimonials-title">
//       <div className="container">
//         <h2 id="testimonials-title" className="testimonials-title">{t('testimonials.title')}</h2>
//         <p className="testimonials-subtitle">{t('testimonials.subtitle')}</p>
//         <div className="testimonials-grid">
//           {testimonialsData.map(({ id, quote, author, company }) => (
//             <TestimonialsCard key={id} quote={quote} author={author} company={company} />
//           ))}
//         </div>
//       </div>
//     </section>
//   );
// };

// export default TestimonialsSection;
