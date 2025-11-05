import { Router } from 'express';
import { sendMail } from './email.controller.js';

const router = Router();

// POST /api/email/send
router.post('/send', sendMail);

export default router;
