import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes.js'
import userRoutes from './modules/user/user.routes';
import permissionRoutes from './modules/permission/permission.routes.js';
import profileRoutes from './modules/profile/profile.routes';
import auditRoutes from './modules/audit/audit.routes.js';
import passwordRoutes from './modules/user/password.routes.js';
import email from './modules/email/email.routes.js';

dotenv.config();

// ✅ Carregar Swagger
const swaggerDocument = JSON.parse(
  readFileSync(new URL('./docs/swagger.json', import.meta.url))
);

const app = express();

// ✅ CORS dinâmico via .env
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3001';

// ✅ Middleware padrão
app.use(express.json());
app.use(morgan('dev'));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// app.use(cors({
//   origin: FRONTEND_ORIGIN,
//   credentials: true
// }));

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

// ✅ Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ✅ Healthcheck
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'backend is running 🚀' });
});

console.log('✅ app.js loaded and middlewares configured!');

export default app;
