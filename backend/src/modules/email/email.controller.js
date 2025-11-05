import nodemailer from 'nodemailer';

const toBool = (v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return ['true','1','on','yes','sim'].includes(v.trim().toLowerCase());
  return false;
};

const requiredEnv = (name) => {
  const val = process.env[name];
  if (!val || String(val).trim() === '') throw new Error(`Env ${name} não configurada`);
  return val;
};

/**
 * Espera req.body:
 * {
 *   nome, email, telefone, tipo, mensagem, anexos, anonimato, politica
 * }
 * - anexos: [{ filename, content (base64), contentType }]
 */
export async function sendMail(req, res) {
  // Extrai e normaliza inputs
  const {
    nome = '',
    email = '',
    telefone = '',
    tipo = '',
    mensagem = '',
    anexos = [],
    anonimato: _anonimato = false,
    politica: _politica = false,
  } = req.body || {};

  const anonimato = toBool(_anonimato);
  const politica  = toBool(_politica);

  try {
    // Validações de entrada
    if (!politica) {
      return res.status(400).json({ ok: false, error: 'Você deve aceitar a política de privacidade.' });
    }
    if (!mensagem || String(mensagem).trim().length < 5) {
      return res.status(400).json({ ok: false, error: 'Mensagem muito curta.' });
    }
    if (!anonimato) {
      const emailOk = email && /^\S+@\S+\.\S+$/.test(String(email));
      if (!emailOk) {
        return res.status(400).json({ ok: false, error: 'E-mail inválido.' });
      }
    }

    // Valida variáveis de ambiente exigidas
    const SMTP_HOST = requiredEnv('SMTP_HOST');
    const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
    const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').trim().toLowerCase() === 'true';
    const SMTP_USER = requiredEnv('SMTP_USER');
    const SMTP_PASS = requiredEnv('SMTP_PASS');
    const MAIL_FROM = requiredEnv('MAIL_FROM'); // ex: "Contato <contato@seu-dominio.com>"
    const MAIL_TO   = requiredEnv('MAIL_TO');   // destinatário interno


    console.log('Enviando e-mail via SMTP:', {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      user: SMTP_USER,
      from: MAIL_FROM,
      to: MAIL_TO,
    });

    // Cria transporter e verifica SMTP (melhor diagnóstico)
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE, // true para 465
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      requireTLS: true, 
      tls: {
        ciphers:'SSLv3', // Pode ajudar em alguns casos específicos
        rejectUnauthorized: false // Habilite apenas temporariamente para diagnóstico se o problema for certificado
      }
    });

    console.log('0');

    // Diagnóstico de conexão (opcional mas útil)
    try {
      console.log('v1');
      await transporter.verify();
      console.log('v2');
    } catch (verr) {

      console.error('❌ VERIFY FAIL', {
        code: verr?.code,        // EAUTH, ETLS, ENOTFOUND...
        command: verr?.command,  // AUTH LOGIN, STARTTLS...
        message: verr?.message,
        response: verr?.response
      });
      // Falha de autenticação/porta/domínio → já retorna 500 com detalhe
      return res.status(500).json({
        ok: false,
        error: 'Falha ao conectar ao servidor SMTP (verify).',
        details: verr?.message || String(verr),
      });
    }

    console.log('1');
    // Monta e-mail interno (vai para sua caixa de entrada)
    const remetenteVisivel = anonimato ? 'Remetente anônimo' : `${nome || '(sem nome)'} <${email}>`;
    const linhas = [
      `Tipo: ${tipo || '(não informado)'}`,
      `Telefone: ${anonimato ? '(anônimo)' : (telefone || '(não informado)')}`,
      `Anonimato: ${anonimato ? 'Sim' : 'Não'}`,
      '',
      'Mensagem:',
      String(mensagem || '').trim(),
    ];

    console.log('2');

    const attachments = Array.isArray(anexos)
      ? anexos
          .filter(a => a && a.filename && a.content)
          .map(a => ({
            filename: a.filename,
            content: Buffer.from(a.content, 'base64'),
            contentType: a.contentType || undefined,
          }))
      : [];


    console.log('3');
    const internalMail = {
      from: MAIL_FROM,             // seu remetente autenticado
      to: MAIL_TO,                 // destino interno
      subject: `[Formulário] ${tipo || 'Contato'} - ${anonimato ? 'Anônimo' : (nome || email)}`,
      text: linhas.join('\n'),
      attachments,
    };
    if (!anonimato && email) {
      internalMail.replyTo = email; // responder vai ao usuário
    }
    console.log('4');
    const infoInternal = await transporter.sendMail(internalMail);
    console.log('5');
    // Auto-reply para o usuário (se não for anônimo e e-mail válido)
    let infoReply = null;
    if (!anonimato && email) {
      const html = `
        Olá, <b>${nome || 'Usuário'}</b>.<br><br>
        Recebemos sua solicitação e retornaremos em breve.<br><br>
        <b>Resumo:</b><br>
        Tipo: ${tipo || '(não informado)'}<br>
        Telefone: ${telefone || '(não informado)'}<br>
        Mensagem:<br>
        <pre style="white-space:pre-wrap;">${String(mensagem || '').trim()}</pre><br>
        Atenciosamente,<br>
        <b>Equipe</b>
      `;

      console.log('6', html);

      const replyMail = {
        from: MAIL_FROM,            // mesmo remetente autenticado
        to: email,                  // resposta ao usuário
        subject: `Recebemos sua mensagem`,
        text:
          `Olá, ${nome || 'Usuário'}.\n\n` +
          `Recebemos sua solicitação e retornaremos em breve.\n\n` +
          `Resumo:\n` +
          `Tipo: ${tipo || '(não informado)'}\n` +
          `Telefone: ${telefone || '(não informado)'}\n\n` +
          `Mensagem:\n${String(mensagem || '').trim()}\n\n` +
          `Atenciosamente,\nEquipe`,
        html,
      };

      console.log('7');
      infoReply = await transporter.sendMail(replyMail);
      console.log('8');
    }

    return res.status(200).json({
      ok: true,
      internalMessageId: infoInternal?.messageId,
      autoReplyMessageId: infoReply?.messageId || null,
      accepted: {
        internal: infoInternal?.accepted || [],
        autoReply: infoReply?.accepted || [],
      },
      rejected: {
        internal: infoInternal?.rejected || [],
        autoReply: infoReply?.rejected || [],
      },
    });
  } catch (err) {
    // Loga detalhes no servidor e retorna mensagem útil ao cliente
    console.error('Erro ao enviar e-mail:', err);
    return res.status(500).json({
      ok: false,
      error: 'Falha ao enviar e-mail.',
      details: err?.message || String(err),
    });
  }
}
