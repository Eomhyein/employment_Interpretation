import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { MESSAGES } from '../constants/message.constant.js';

// 선택1. Transaction 역할 인가 미들웨어
export const requireRoles = (roles) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      // 1-1. roles가 user에 포함하고 있는지 확인한다
      const hasPermission = user && roles.includes(user.role);

      if (!hasPermission) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          status: HTTP_STATUS.FORBIDDEN,
          message: MESSAGES.AUTH.COMMON.FORBIDDEN,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
