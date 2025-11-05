import dotenv from 'dotenv';

dotenv.config();

export default {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  refreshSecret: process.env.REFRESH_SECRET,
  expiration: process.env.JWT_EXPIRATION || '1h',
  expirationRefresh: process.env.JWT_EXPIRATION_REFRESH || '1d',
  databaseUrl: process.env.DATABASE_URL,
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
  },
};
