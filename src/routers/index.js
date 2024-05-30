import express from 'express';
import { authRouter } from './auth.router.js';
import { usersRouter } from './users.router.js';
import { resumesRouter } from './resumes.router.js';
import { requireAccessToken } from '../middlewares/require-access-token.middleware.js';

const apiRouter = express.Router();

apiRouter.use('/auth', authRouter); // 회원가입, 로그인 라우터
apiRouter.use('/users', usersRouter); // 내 정보 조회 라우터
apiRouter.use('/resumes', requireAccessToken, resumesRouter); // 이력서라우터에 들어가기전에 엑세스 토큰이 인증되어 들어간다

export { apiRouter };