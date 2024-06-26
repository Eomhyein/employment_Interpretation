import express from 'express';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { MESSAGES } from '../constants/message.constant.js';
import { createResumeValidator } from '../middlewares/validators/create-resume-validator.middleware.js';
import { prisma } from '../utils/prisma.util.js';
import { updateResumeValidator } from '../middlewares/validators/update-resume-validator.middleware.js';
import { USER_ROLE } from '../constants/user.constant.js';
import { requireRoles } from '../middlewares/require-roles.middleware.js';
import { updateResumeStatusValidator } from '../middlewares/validators/update-resume-status-validator.middleware.js';

const resumesRouter = express.Router();

// 1. 이력서 생성
resumesRouter.post('/', createResumeValidator, async (req, res, next) => {
  try {
    const user = req.user;
    const { title, content } = req.body;
    const authorId = user.id;

    const data = await prisma.resume.create({
      data: {
        authorId,
        title,
        content,
      },
    });

    return res.status(HTTP_STATUS.CREATED).json({
      status: HTTP_STATUS.CREATED,
      message: MESSAGES.RESUMES.CREATE.SUCCEED,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// 2. 이력서 목록 조회
resumesRouter.get('/', async (req, res, next) => {
  try {
    const user = req.user;
    const authorId = user.id;

    let { sort } = req.query;

    sort = sort?.toLowerCase();

    if (sort !== 'desc' && sort !== 'asc') {
      sort = 'desc';
    }
    // 선택 1 역할에 따른 결과 분기, 이력서 목록 조회
    const whereCondition = {};
    // 2-1 채용 담당자인 경우
    if (user.role === USER_ROLE.RECRUITER) {
      // 2-2 status를 받고, query 조건에 추가
      const { status } = req.query;

      if (status) {
        whereCondition.status = status;
      }
    }
    // 2-3 채용 담당자가 아닌 경우(지원자의 경우)
    else {
      // 2-4 자신이 작성한 이력서만 조회
      whereCondition.authorId = authorId;
    }

    let data = await prisma.resume.findMany({
      where: whereCondition,
      orderBy: {
        createdAt: sort,
      },
      include: {
        author: true,
      },
    });

    data = data.map((resume) => {
      return {
        id: resume.id,
        authorName: resume.author.name,
        title: resume.title,
        content: resume.content,
        status: resume.status,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      };
    });

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: MESSAGES.RESUMES.READ_LIST.SUCCEED,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// 3. 이력서 상세 조회
resumesRouter.get('/:id', async (req, res, next) => {
  try {
    const user = req.user;
    const authorId = user.id;

    const { id } = req.params;

    const whereCondition = { id: +id };

    if (user.role !== USER_ROLE.RECRUITER) {
      whereCondition.authorId = authorId;
    }

    let data = await prisma.resume.findUnique({
      where: whereCondition,
      include: { author: true },
    });

    if (!data) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: HTTP_STATUS.NOT_FOUND,
        message: MESSAGES.RESUMES.COMMON.NOT_FOUND,
      });
    }

    data = {
      id: data.id,
      authorName: data.author.name,
      title: data.title,
      content: data.content,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: MESSAGES.RESUMES.READ_DETAIL.SUCCEED,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// 4. 이력서 수정
resumesRouter.put('/:id', updateResumeValidator, async (req, res, next) => {
  try {
    const user = req.user;
    const authorId = user.id;

    const { id } = req.params;

    const { title, content } = req.body;

    let existedResume = await prisma.resume.findUnique({
      where: { id: +id, authorId },
    });

    if (!existedResume) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: HTTP_STATUS.NOT_FOUND,
        message: MESSAGES.RESUMES.COMMON.NOT_FOUND,
      });
    }

    const data = await prisma.resume.update({
      where: { id: +id, authorId },
      data: {
        ...(title && { title }),
        ...(content && { content }),
      },
    });

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: MESSAGES.RESUMES.UPDATE.SUCCEED,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// 5. 이력서 삭제
resumesRouter.delete('/:id', async (req, res, next) => {
  try {
    const user = req.user;
    const authorId = user.id;

    const { id } = req.params;

    // 5-1. 이력서 정보가 없는 경우
    let existedResume = await prisma.resume.findUnique({
      where: { id: +id, authorId },
    });

    if (!existedResume) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: HTTP_STATUS.NOT_FOUND,
        message: MESSAGES.RESUMES.COMMON.NOT_FOUND,
      });
    }
    // 5-2. 이력서가 있는 경우
    const data = await prisma.resume.delete({ where: { id: +id, authorId } });

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: MESSAGES.RESUMES.DELETE.SUCCEED,
      data: { id: data.id },
    });
  } catch (error) {
    next(error);
  }
});



// 선택2 Transaction 이력서 지원 상태 변경
resumesRouter.patch(
  '/:id/status',
  requireRoles([USER_ROLE.RECRUITER]),
  updateResumeStatusValidator,
  async (req, res, next) => {
    try {
      const user = req.user;
      const recruiterId = user.id;

      const { id } = req.params;

      const { status, reason } = req.body;

      // 2-1 트랜잭션
      await prisma.$transaction(async (tx) => {
        // 2-2 이력서 정보 조회
        const existedResume = await tx.resume.findUnique({
          where: { id: +id },
        });

        // 2-3 이력서 정보가 없는 경우
        if (!existedResume) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({
            status: HTTP_STATUS.NOT_FOUND,
            message: MESSAGES.RESUMES.COMMON.NOT_FOUND,
          });
        }

        // 2-4 이력서 지원 상태 수정
        const updatedResume = await tx.resume.update({
          where: { id: +id },
          data: { status },
        });

        // 2-5 이력서 로그 생성
        const data = await tx.resumeLog.create({
          data: {
            recruiterId, // 이력서 로그 ID
            resumeId: existedResume.id, // 채용담당자 ID
            oldStatus: existedResume.status, // 예전 상태
            newStatus: updatedResume.status, // 새로운 상태
            reason, // 사유
          },
        });

        return res.status(HTTP_STATUS.OK).json({
          status: HTTP_STATUS.OK,
          message: MESSAGES.RESUMES.UPDATE.STATUS.SUCCEED,
          data,
        });
      });
    } catch (error) {
      next(error);
    }
  },
);
// 선택3. Transaction 이력서 (Logs)로그 목록 조회
resumesRouter.get(
  '/:id/logs',
  requireRoles([USER_ROLE.RECRUITER]),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      let data = await prisma.resumeLog.findMany({
        where: {
          resumeId: +id,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          recruiter: true, // 채용담당자
        },
      });

      data = data.map((log) => {
        return {
          id: log.id,
          recruiterName: log.recruiter.name,
          resumeId: log.resumeId,
          oldStatus: log.oldStatus,
          newStatus: log.newStatus,
          reason: log.reason,
          createdAt: log.createdAt,
        };
      });

      return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: MESSAGES.RESUMES.READ_LIST.LOG.SUCCEED,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);

export { resumesRouter };
