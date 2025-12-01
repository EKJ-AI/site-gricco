import './Testimonials.css';
import { useTranslation } from '../../../shared/i18n';
import html from 'html-react-parser';

const Testimonials = () => {
    const { t } = useTranslation();
    return (
        <>
            <div className='conteudo testimonials bg-color-gray'>
                <div className='conteudo-interno'>
                    <div className='testimony'>
                        <div>
                            <h1 className='titulo'>{t("home.testimonials.title")}</h1>
                            <br />
                            <p className='descricao'>{t("home.testimonials.description")}</p>
                        </div>
                        <div className='testimony-peoples'>
                            <div>
                                {html(t("home.testimonials.testimony1"))}
                            </div>
                            <div>
                                {html(t("home.testimonials.testimony2"))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Testimonials;