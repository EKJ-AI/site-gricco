import React from "react";
import "./FormularioSimples.css";
import { useTranslation } from "../i18n";

const FormularioSimples = () => {
    const { t } = useTranslation();

    return (
        <div id="contact" className="conteudo-interno" style={{"padding-bottom":"0px"}}>
            <div className="formularioSimples">
                <div className="titulo">
                    <h1>{t("contactus.title")}</h1>
                </div>
                <div className="campos">
                    <form>
                        <div className="form-group">
                            <label htmlFor="name">{t("contactus.label.name")}</label>
                            <input type="text" id="name" name="name" placeholder={t("contactus.label.name.placeholder")} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">{t("contactus.label.email")}</label>
                            <input type="email" id="email" name="email" placeholder={t("contactus.label.email.placeholder")} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="subject">{t("contactus.label.subject")}</label>
                            <input type="text" id="subject" name="subject" placeholder={t("contactus.label.subject.placeholder")} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="message">{t("contactus.label.message")}</label>
                            <textarea id="message" name="message" rows="5" placeholder={t("contactus.label.message.placeholder")} required></textarea>
                        </div>
                        <button type="submit" className="btn">{t("contactus.button.send")}</button>
                    </form>
                </div>
            </div>
        </div>
    );
}   
export default FormularioSimples;