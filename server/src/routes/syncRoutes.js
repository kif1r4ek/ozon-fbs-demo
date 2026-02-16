import { Router } from "express";
import { handleTriggerSync, handleGetSyncStatus } from "../controllers/syncController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);
router.use(authorize("super_admin", "admin"));

router.post("/trigger", handleTriggerSync);
router.get("/status", handleGetSyncStatus);

export default router;
