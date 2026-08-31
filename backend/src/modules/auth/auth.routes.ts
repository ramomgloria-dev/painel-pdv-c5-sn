import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { loginRateLimiter } from '../../middlewares/rateLimit.js';
import { getMe, postLogin, postLogout, postRefresh } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, asyncHandler(postLogin));
authRouter.post('/refresh', asyncHandler(postRefresh));
authRouter.post('/logout', asyncHandler(postLogout));
authRouter.get('/me', authenticate, asyncHandler(getMe));
