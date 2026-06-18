import { Router, Request, Response, NextFunction } from 'express';
import * as jobService from '../../services/jobService';
import * as attemptRepository from '../../repositories/attemptRepository';
import { AppError } from '../middlewares/errorHandler';
import { JobStatus } from '../../types';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, payload, idempotencyKey } = req.body;

    if (!type || !payload || !idempotencyKey) {
      throw new AppError(400, 'type, payload, and idempotencyKey are required');
    }

    const { job, deduplicated } = await jobService.createJob({
      type,
      payload,
      idempotencyKey,
    });

    if (deduplicated) {
      res.status(200).json({
        jobId: job.id,
        status: job.status,
        deduplicated: true,
      });
      return;
    }

    res.status(201).json({
      jobId: job.id,
      status: job.status,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as JobStatus | undefined;
    const limit = parseInt((req.query.limit as string) ?? '50', 10);
    const offset = parseInt((req.query.offset as string) ?? '0', 10);

    const jobs = await jobService.listJobs(status, limit, offset);
    const attemptCounts = await attemptRepository.countByJobIds(jobs.map((j) => j.id));

    res.json({
      jobs: jobs.map((job) => ({
        ...job,
        attemptCount: attemptCounts.get(job.id) ?? 0,
      })),
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await jobService.getJob(String(req.params.id));
    if (!job) {
      throw new AppError(404, 'Job not found');
    }

    const attempts = await attemptRepository.findByJobId(job.id);

    res.json({
      id: job.id,
      type: job.type,
      payload: job.payload,
      status: job.status,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      attempts: attempts.map((a) => ({
        attemptNumber: a.attemptNumber,
        workerId: a.workerId,
        status: a.status,
        error: a.errorMessage,
        durationMs: a.durationMs,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
      })),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      nextRetryAt: job.nextRetryAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/replay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newJob, originalJobId } = await jobService.replayDeadLetterJob(
      String(req.params.id),
    );

    res.status(201).json({
      newJobId: newJob.id,
      originalJobId,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not in DEAD_LETTER')) {
      next(new AppError(400, err.message));
      return;
    }
    if (err instanceof Error && err.message.includes('not found')) {
      next(new AppError(404, err.message));
      return;
    }
    next(err);
  }
});

export default router;
