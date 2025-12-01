import "./History.css";
import { useTranslation } from "../../../shared/i18n";
import html from 'html-react-parser';

const History = () => {
  const { t } = useTranslation();
    return (
        <>
            <div className='conteudo history'>
                <div className='conteudo-interno display-flex mobile-display-flex-none text'>
                    <p>
                        {html(t('home.ourstory.description1'))}
                    </p>
                    <p>
                        {html(t('home.ourstory.description2'))}
                    </p>
                </div>
                <div className='conteudo-interno display-flex mobile-display-flex-none abas'>
                    <div className='aba'>
                        <h2>{t('home.ourstory.mission.title')}</h2>
                        <div>
                            <p>
                                {html(t('home.ourstory.mission.description'))}
                            </p>
                        </div>
                    </div>
                    <div className='aba'>
                        <h2>{t('home.ourstory.vision.title')}</h2>
                        <div>
                            <p>
                                {html(t('home.ourstory.vision.description'))}
                            </p>
                        </div>
                    </div>
                    <div className='aba'>
                        <h2>{t('home.ourstory.values.title')}</h2>
                        <div>
                            <p>
                                {html(t('home.ourstory.values.description'))}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default History;
