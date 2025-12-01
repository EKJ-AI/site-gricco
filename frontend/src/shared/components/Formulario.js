// src/components/EmailForm.jsx
import { useState } from 'react';
import api from '../../api/axios';
import { useTranslation } from "../../shared/i18n";
import './Formulario.css';

async function fileToBase64Obj(file) {
  const content = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return {
    filename: file.name,
    content,
    contentType: file.type || 'application/octet-stream',
  };
}

export default function EmailForm() {
  const { t } = useTranslation();

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    tipo: '',
    mensagem: '',
    anonimato: false,
    politica: false,
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((s) => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
  };

  const onFiles = (e) => {
    setFiles(Array.from(e.target.files || []));
  };

  const validate = () => {
    if (!form.politica) return 'Você deve aceitar a política de privacidade.';
    if (!form.mensagem || form.mensagem.trim().length < 5) return 'Mensagem muito curta.';
    if (!form.anonimato) {
      const ok = /^\S+@\S+\.\S+$/.test(form.email);
      if (!ok) return 'E-mail inválido.';
    }
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setResp(null);

    const v = validate();
    if (v) {
      setResp({ ok: false, error: v });
      return;
    }

    setLoading(true);
    try {
      const anexos = await Promise.all(files.map(fileToBase64Obj));

      const payload = { ...form, anexos };
      console.log('Payload to send:', payload);

      const { data } = await api.post('/api/email/send', payload);

      setResp({ ok: true, data });
      setForm({
        nome: '',
        email: '',
        telefone: '',
        tipo: '',
        mensagem: '',
        anonimato: false,
        politica: false,
      });
      setFiles([]);
    } catch (err) {
      setResp({
        ok: false,
        error: err.response?.data?.error || err.message || 'Falha ao enviar',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="contact-section">
      <div className="contact-container">
        <div className="contact-info">
          <h2>{t('contact.form.title')}</h2>
          <h3>{t('contact.form.subtitle')}</h3>
        </div>
          <form onSubmit={onSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="nome">{t('contact.form.name')}</label>
                <input
                  name="nome"
                  value={form.nome}
                  onChange={onChange}
                  placeholder={t("contact.form.name.placeholder")}
                  disabled={form.anonimato}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">{t('contact.form.mail')}</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  placeholder={t("contact.form.mail.placeholder")}
                  disabled={form.anonimato}
                />
              </div>
              <div className="form-group">
                <label htmlFor="telefone">{t('contact.form.telefone')}</label>
                <input
                  name="telefone"
                  value={form.telefone}
                  onChange={onChange}
                  placeholder="(00) 00000-0000"
                  disabled={form.anonimato}
                />
              </div>
              <div className="form-group">
                <label htmlFor="tipo">{t('contact.form.tipo')}</label>
                <select
                  name="tipo"
                  value={form.tipo}
                  onChange={onChange}
                >
                  <option value="">Selecione</option>
                  <option value="Dúvida">A</option>
                  <option value="Suporte">B</option>
                  <option value="Orçamento">C</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="mensagem">{t('contact.form.msg')}</label>
                <textarea
                  name="mensagem"
                  value={form.mensagem}
                  onChange={onChange}
                  rows={6}
                  placeholder={t("contact.form.msg.placeholder")}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="anexos">{t('contact.form.anexos')}</label>
                <input type="file" multiple onChange={onFiles} />
                {files.length > 0 && (
                  <p>{files.length} arquivo(s) selecionado(s)</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    name="anonimato"
                    checked={form.anonimato}
                    onChange={onChange}
                  />
                  <span>{t('contact.form.anonimo.placeholder')}</span>
                </label>

                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    name="politica"
                    checked={form.politica}
                    onChange={onChange}
                    required
                  />
                  <span>{t('contact.form.politica.placeholder')}</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="contact-btn"
              >
                {loading ? 'Enviando…' : t('contact.form.button.text')}
              </button>

              {resp && (
                <div className={`text-sm mt-2 ${resp.ok ? 'text-green-700' : 'text-red-700'}`}>
                  {resp.ok ? 'Enviado com sucesso!' : `Erro: ${resp.error}`}
                </div>
              )}
          </form>
      </div>
    </section>
  );
}
