import React from 'react';
import './Banner.css';
import { useTranslation } from '../../../shared/i18n';

const Banner = () => {
  const { t } = useTranslation();
  return (
    <>
        <div className='banner'>
            <div className='conteudo-interno'>
                <h3 className='width-50 mobile-width-100'>{t("home.title2")}</h3>
                <br />
                <h1 className='width-50 mobile-width-100'>{t("home.title1")}</h1>
                <br />
                <a href="/#services" className="btn">
                    {t("hero.button.text")}
                </a>
            </div>
        </div>
    </>
  );
};

export default Banner;
