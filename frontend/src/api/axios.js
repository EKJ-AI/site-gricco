// src/api/axios.js
import axios from 'axios';

const isProd = process.env.NODE_ENV === 'production';

// Sempre tenta pegar da env primeiro (produção E desenvolvimento)
const fromEnv = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.trim()
  : '';

// Fallback em dev se a env não estiver setada
const fallbackDevBaseURL = 'http://localhost:3000'; // ajuste se seu backend usar outra porta

const resolvedBaseURL = fromEnv || (isProd ? '' : fallbackDevBaseURL);

// Logs úteis só em dev
if (!isProd) {
  // eslint-disable-next-line no-console
  console.log('NODE_ENV:', process.env.NODE_ENV, 'API baseURL:', resolvedBaseURL);
}

// Falha cedo se esquecer a env em produção
if (isProd && !resolvedBaseURL) {
  throw new Error(
    'REACT_APP_API_URL não definida para produção. Verifique seu .env.production'
  );
}

const api = axios.create({
  baseURL: resolvedBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // para enviar/receber cookies (refreshToken)
});

export default api;
