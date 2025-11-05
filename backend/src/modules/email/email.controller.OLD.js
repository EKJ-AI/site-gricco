// src/email.controller.js
import nodemailer from 'nodemailer';

const bool = (v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return ['true', '1', 'on', 'yes'].includes(v.toLowerCase());
  return false;
};

/**
 * Espera req.body:
 * { nome, email, telefone, tipo, mensagem, anexos, anonimato, politica }
 * - anexos: [{ filename, content (base64), contentType }]
 */
export async function sendMail(req, res) {
  try {
    const {
      nome = '',
      email = '',
      telefone = '',
      tipo = '',
      mensagem = '',
      anexos = [],
      anonimato = false,
      politica = false,
    } = req.body || {};

    // Crie um transportador usando as credenciais do Office 365/Outlook
    const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com', // ou 'smtp-mail.outlook.com' para Outlook.com
      port: 587,
      secure: false, // Use `true` para a porta 465, se aplicável
      auth: {
        user: 'fabiano.bonazza@gricco.com.br', // Seu email completo
        pass: 'F@biMilMax' // Senha de aplicativo para MFA
      },
      tls: {
        ciphers: 'SSLv3'
      }
    });

    let detalhe = "Nome: " + nome + "<br/>";
    detalhe += "Email: " + email + "<br/>";
    detalhe += "Telefone: " + telefone + "<br/>";
    detalhe += "Tipo: " + tipo + "<br/><br/>";
    detalhe += "Mensagem: <br/>" + mensagem;

    // Configurações do e-mail
    const mailOptions = {
      from: 'fabiano.bonazza@gricco.com.br',
      to: email,
      subject: 'Assunto do E-mail',
      html: detalhe
    };

    // Envie o e-mail
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.error('Erro ao enviar o e-mail:', error);
      }
      console.log('E-mail enviado com sucesso:', info.response);
      return res.status(200).json({ok: true});
    });
    
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
    return res.status(500).json({ ok: false, error: 'Falha ao enviar e-mail.' });
  }
}
