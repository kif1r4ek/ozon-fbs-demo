import { Router } from "express";
import { handleGetAuditLogs } from "../controllers/auditController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);
router.use(authorize("super_admin"));

router.get("/", handleGetAuditLogs);

export default router;
