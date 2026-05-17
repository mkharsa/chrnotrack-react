import { Router, type IRouter } from "express";
import healthRouter from "./health";
import participantsRouter from "./participants";
import sessionsRouter from "./sessions";
import seriesRouter from "./series";
import progressionRouter from "./progression";

const router: IRouter = Router();

router.use(healthRouter);
router.use(participantsRouter);
router.use(sessionsRouter);
router.use(seriesRouter);
router.use(progressionRouter);

export default router;
