import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'; // 토큰
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { MESSAGES } from '../constants/message.constant.js'; // 메시지 관리
import { signUpValidator } from '../middlewares/validators/sign-up-validator.middleware.js';
import { prisma } from '../utils/prisma.util.js';
import {
  ACCESS_TOKEN_EXPIRES_IN, // access 토큰 담기
  HASH_SALT_ROUNDS,
  REFRESH_TOKEN_EXPIRES_IN,
} from '../constants/auth.constant.js';
import {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
} from '../constants/env.constant.js';
import { requireRefreshToken } from '../middlewares/require-refresh-token.middleware.js';
import { signInValidator } from '../middlewares/validators/sign-in-validator.middleware.js';

const authRouter = express.Router();

// 1. 회원가입
authRouter.post('/sign-up', signUpValidator, async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    const existedUser = await prisma.user.findUnique({ where: { email } });

    // 1-1 이메일이 중복된 경우
    if (existedUser) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        status: HTTP_STATUS.CONFLICT,
        message: MESSAGES.AUTH.COMMON.EMAIL.DUPLICATED,
      });
    }
    // 1-3. 비밀번호 hash 저장
    const hashedPassword = bcrypt.hashSync(password, HASH_SALT_ROUNDS);
    // 1-2. 회원가입 
    const data = await prisma.user.create({
      data: {
        email,
        password: hashedPassword, // 비밀번호 hash 저장
        name,
      },
    });

    data.password = undefined;

    return res.status(HTTP_STATUS.CREATED).json({
      status: HTTP_STATUS.CREATED,
      message: MESSAGES.AUTH.SIGN_UP.SUCCEED,
      data,
    });
  } catch (error) {
    next(error);
  }
});
// 2. 로그인
authRouter.post('/sign-in', signInValidator, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // 2-1. 비밀번호 일치 여부 확인
    const isPasswordMatched =
      user && bcrypt.compareSync(password, user.password);

    // 2-2. 일치하지 않는 경우 로그인 실패
    if (!isPasswordMatched) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: MESSAGES.AUTH.COMMON.UNAUTHORIZED,
      });
    }

    const payload = { id: user.id };

    const data = await generateAuthTokens(payload);

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: MESSAGES.AUTH.SIGN_IN.SUCCEED,
      data,
    });
  } catch (error) {
    next(error);
  }
});
// 선택1 RefreshToken 로그인 APi에 기능 추가
authRouter.post('/token', requireRefreshToken, async (req, res, next) => {
  try {
    const user = req.user;

    const payload = { id: user.id };

    const data = await generateAuthTokens(payload);

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: MESSAGES.AUTH.TOKEN.SUCCEED,
      data,
    });
  } catch (error) {
    next(error);
  }
});
// 선택2 RefreshToken 로그아웃 APi
authRouter.post('/sign-out', requireRefreshToken, async (req, res, next) => {
  try {
    const user = req.user;

    await prisma.refreshToken.update({
      where: { userId: user.id },
      data: {
        refreshToken: null,
      },
    });

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: MESSAGES.AUTH.SIGN_OUT.SUCCEED,
      data: { id: user.id },
    });
  } catch (error) {
    next(error);
  }
});

const generateAuthTokens = async (payload) => {
  const userId = payload.id;

  const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

  const hashedRefreshToken = bcrypt.hashSync(refreshToken, HASH_SALT_ROUNDS);

  // RefreshToken을 생성 또는 갱신
  await prisma.refreshToken.upsert({
    where: {
      userId,
    },
    update: {
      refreshToken: hashedRefreshToken,
    },
    create: {
      userId,
      refreshToken: hashedRefreshToken,
    },
  });

  return { accessToken, refreshToken };
};

export { authRouter };
