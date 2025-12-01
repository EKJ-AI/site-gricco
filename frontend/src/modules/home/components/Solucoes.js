import './Solucoes.css';
import { useTranslation } from '../../../shared/i18n';
import html from 'html-react-parser';

const Solucoes = () => {
  const { t } = useTranslation();
  return (
    <>
        <div id="services" className='solucoes'>
            <div className='conteudo-interno'>
                <h2 className='titulo'>{html(t("home.soluctions"))}</h2>
                <div className='display-flex mobile-display-flex-none item-solucoes'>
                    <h2 className='titulo'>{t("home.soluctions.humanfactors.title")}</h2>
                    <p>{t("home.soluctions.humanfactors.description")}</p>
                </div>
                <div className='display-flex mobile-display-flex-none item-solucoes'>
                    <h2 className='titulo'>{t("home.soluctions.integratedmanagement.title")}</h2>
                    <p>{t("home.soluctions.integratedmanagement.description")}</p>
                </div>
                <div className='display-flex mobile-display-flex-none item-solucoes'>
                    <h2 className='titulo'>{t("home.soluctions.quickexecution.title")}</h2>
                    <p>{t("home.soluctions.quickexecution.description")}</p>
                </div>
                <div className='display-flex mobile-display-flex-none item-solucoes'>
                    <h2 className='titulo'>{t("home.soluctions.security.title")}</h2>
                    <p>{t("home.soluctions.security.description")}</p>
                </div>
                <div className='display-flex mobile-display-flex-none item-solucoes'>
                    <h2 className='titulo'>{t("home.soluctions.technology.title")}</h2>
                    <p>{t("home.soluctions.technology.description")}</p>
                </div>
            </div>
        </div>
    </>
  );
};

export default Solucoes;
