import express from 'express';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import setupSwagger from './utils/swagger.js'; 

import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes.js'
import userRoutes from './modules/user/user.routes.js';
import permissionRoutes from './modules/permission/permission.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import passwordRoutes from './modules/user/password.routes.js';

// Importações de arquivos locais com extensão .js
import config from './config/index.js';
import logger from './utils/logger.js';
import email from './modules/email/email.routes.js';

dotenv.config();

// 👇 Necessário para usar __dirname com ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Inicializa o i18n
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
app.set('trust proxy', 1);  
//app.set('trust proxy', 1); // atrás do NGINX

// ✅ Middleware padrão
app.use(express.json());
app.use(morgan('dev'));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

if(process.env.NODE_ENV !== 'production') {
  //>>>>>>>>>>>>> development
  const allowedOrigins = process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3001'];
  
  app.use(cors({
    origin: function(origin, callback) {
      // Permite requests sem origin (ex: Postman, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS']
  }));
} else {
  //>>>>>>>>>>>>> production
  const allowedOrigins = process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(',').map(o => o.trim())
    : ['https://site.gricco.com.br']; // defina sua origem de produção aqui

  console.log('Allowed Origins:', allowedOrigins);

  const corsOptions = {
    origin(origin, cb) {
      if (!origin) return cb(null, true); // curl/postman
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET','PUT','POST','DELETE','PATCH','OPTIONS'],
  };

  // 👉 CORS antes de qualquer rota/limiters
  app.use(cors(corsOptions));

  // const whitelist = ['https://site.gricco.com.br']; // adicione outros se precisar
  // app.use(cors({
  //   origin(origin, cb) {
  //     // permite calls sem origin (ex: curl, healthchecks) e o domínio do site
  //     if (!origin || whitelist.includes(origin)) return cb(null, true);
  //     return cb(new Error('Not allowed by CORS'));
  //   },
  //   methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  //   allowedHeaders: ['Content-Type','Authorization'],
  //   credentials: true,                // só deixe true se realmente precisa enviar cookies/credenciais
  //   optionsSuccessStatus: 204,
  // }));

  // // MUITO IMPORTANTE: responder preflight
  // app.options('*', cors());
}

app.use(cookieParser());

// ✅ Rate Limit Global (config via .env)
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX || '300'),
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.'
});
app.use(globalLimiter);

// ✅ Rate Limit para Esqueci Senha
const forgotLimiter = rateLimit({
  windowMs: parseInt(process.env.FORGOT_LIMIT_WINDOW_MS || '900000'), // 15 min
  max: parseInt(process.env.FORGOT_LIMIT_MAX || '5'),
  message: 'Muitas tentativas de recuperação de senha. Tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/password/forgot', forgotLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/email', email);


// // ✅ Carregar Swagger
const swaggerDocument = JSON.parse(
  readFileSync(new URL('./docs/swagger.json', import.meta.url))
);
// ✅ Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ✅ Healthcheck
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'backend is running 🚀' });
});

setupSwagger(app);

// Usa middleware do i18n para detectar idioma e permitir uso do t()
app.use(middleware.handle(i18next));


// Verifica variáveis obrigatórias
if (!config.jwtSecret || !config.refreshSecret) {
  logger.error('❌ JWT_SECRET ou REFRESH_SECRET faltando no .env!');
  process.exit(1);
}

if(process.env.NODE_ENV !== 'production') {
  //>>>>>>>>>>>>> development
  app.listen(config.port, () => {
    logger.info(`🚀 Server rodando em http://localhost:${config.port}`);
  });
} else {
  //>>>>>>>>>>>>> production
  app.listen(config.port, '127.0.0.1', () => {
    logger.info(`🚀 Server rodando em http://127.0.0.1:${config.port}`);
  });
}

