import { Router, Request, Response, NextFunction } from 'express';
import * as jobService from '../../services/jobService';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await jobService.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

export default router;
