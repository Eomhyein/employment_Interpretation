import Joi from 'joi';
import { MESSAGES } from '../../constants/message.constant.js';
import { MIN_PASSWORD_LENGTH } from '../../constants/auth.constant.js';

const schema = Joi.object({
  // required: 필수
  email: Joi.string().email().required().messages({
    'any.required': MESSAGES.AUTH.COMMON.EMAIL.REQUIRED,
    'string.email': MESSAGES.AUTH.COMMON.EMAIL.INVALID_FORMAT,
  }),
  password: Joi.string().required().min(MIN_PASSWORD_LENGTH).messages({
    'any.required': MESSAGES.AUTH.COMMON.PASSWORD.REQURIED,
    'string.min': MESSAGES.AUTH.COMMON.PASSWORD.MIN_LENGTH,
  }), // valid (password) 비교
  passwordConfirm: Joi.string().required().valid(Joi.ref('password')).messages({
    'any.required': MESSAGES.AUTH.COMMON.PASSWORD_CONFIRM.REQURIED,
    'any.only': MESSAGES.AUTH.COMMON.PASSWORD_CONFIRM.NOT_MACHTED_WITH_PASSWORD,
  }),
  name: Joi.string().required().messages({
    'any.required': MESSAGES.AUTH.COMMON.NAME.REQURIED,
  }),
});
// 1. 회원가입 미들웨어 처리
export const signUpValidator = async (req, res, next) => {
  try {
    await schema.validateAsync(req.body);
    next();
  } catch (error) {
    next(error);
  }
};
