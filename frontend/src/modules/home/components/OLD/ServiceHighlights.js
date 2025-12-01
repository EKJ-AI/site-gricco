// import React from 'react';
// import { useTranslation } from '../../../../shared/i18n';
// import '../styles/ServiceHighlights.css';
// import safetyIcon from '../../../shared/assets/images/home/construction-safety.png';
// import effectiveIcon from '../../../shared/assets/images/home/effective.png';
// import socialIcon from '../../../shared/assets/images/home/social.png';
// import Carousel from '../Carousel';

// const ServiceHighlights = () => {
//   const { t } = useTranslation();

//   return (
//   <div id="services" className='services'>
//     <div className="highlight-intro">
//       <h3>{t("service.highlights.title")}</h3>
//     </div>

//     <div className="service-highlights">
//       <div className="highlight">
//         <img src={socialIcon} alt={t("speed.alt")} className="icon" />
//         <h3>{t("integrated.title")}</h3>
//         <p>{t("integrated.text")}</p>
//       </div>
//       <div className="highlight">
//         <img src={effectiveIcon} alt={t("speed.alt")} className="icon" />
//         <h3>{t("speed.title")}</h3>
//         <p>{t("speed.text")}</p>
//       </div>
//       <div className="highlight">
//         <img src={safetyIcon} alt={t("safety.alt")} className="icon" />
//         <h3>{t("safety.title")}</h3>
//         <p>{t("safety.text")}</p>
//       </div>
//     </div>

//     <div id="products">
//       <h2 className="carousel-title">{t("service.highlights.carousel.title")}</h2>
//       <br />
//       <Carousel/> 
//     </div>
//   </div>
//   );
// };

// export default ServiceHighlights;