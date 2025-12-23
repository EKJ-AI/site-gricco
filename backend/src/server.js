import express from 'express';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

import setupSwagger from './utils/swagger.js';

import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/user/user.routes.js';
import permissionRoutes from './modules/permission/permission.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import passwordRoutes from './modules/user/password.routes.js';
import email from './modules/email/email.routes.js';

import translationRoutes from './modules/translation/translation.routes.js';
import publicI18nRoutes from './modules/translation/public-i18n.routes.js';

import blogRoutes from './modules/blog/blog.routes.js';

import config from './config/index.js';
import logger from './utils/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------- i18n ----------------
i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'pt',
    backend: {
      loadPath: path.join(__dirname, 'i18n/{{lng}}.json'),
    },
  });

const app = express();

// --------------- Request ID ---------------
app.use((req, res, next) => {
  const rid = req.get('X-Request-Id') || Math.random().toString(36).slice(2);
  res.setHeader('X-Request-Id', rid);
  req.requestId = rid;
  next();
});

app.set('trust proxy', 1);

// --------------- Middlewares básicos ---------------
app.use(express.json());
app.use(morgan('dev'));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// --------------- CORS ---------------
if (process.env.NODE_ENV !== 'production') {
  const allowedOrigins = process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:3001'];

  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    }),
  );
} else {
  const allowedOrigins = process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(',').map((o) => o.trim())
    : ['https://gricco.com.br', 'https://www.gricco.com.br'];

  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    }),
  );
}

app.use(cookieParser());

// --------------- Rate limits ---------------
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
});
app.use(globalLimiter);

const forgotLimiter = rateLimit({
  windowMs: parseInt(process.env.FORGOT_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.FORGOT_LIMIT_MAX || '5', 10),
  message:
    'Muitas tentativas de recuperação de senha. Tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/password/forgot', forgotLimiter);

// --------------- Rotas da API ---------------
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/email', email);

// i18n (admin + public)
app.use('/api/translations', translationRoutes);
app.use('/api/public', publicI18nRoutes);

// 🔹 Blog / CMS
app.use('/api/blog', blogRoutes);

// --------------- Swagger ---------------
const swaggerDocument = JSON.parse(
  readFileSync(new URL('./docs/swagger.json', import.meta.url)),
);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
setupSwagger(app);

// --------------- Healthcheck ---------------
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'backend is running 🚀' });
});

// --------------- i18n middleware ---------------
// (mantido no fim, como estava; se quiser req.t nas rotas, mover pra cima)
app.use(middleware.handle(i18next));

// --------------- 404 handler (JSON) ---------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// --------------- Error handler global ---------------
app.use((err, req, res, next) => {
  logger.error(
    `❌ [UNHANDLED] ${req.method} ${req.originalUrl} • ${err.stack || err}`,
  );
  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// --------------- Boot ---------------
if (!config.jwtSecret || !config.refreshSecret) {
  logger.error('❌ JWT_SECRET ou REFRESH_SECRET faltando no .env!');
  process.exit(1);
}

const listenHost = process.env.NODE_ENV !== 'production' ? '0.0.0.0' : '127.0.0.1';

app.listen(config.port, listenHost, () => {
  logger.info(`🚀 Server rodando em http://${listenHost}:${config.port}`);
});
