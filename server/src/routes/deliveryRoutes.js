import { Router } from "express";
import { handleGetDeliveries, handleGetDeliveryById, handleAssignDelivery, handleBulkAssign, handleGetDeliveryStats, handleAssignGroup, handleGetGroupAssignments, handleGetMyAssignments, handleGetMyGroups, handleGetAssignedDates, handleGetAssignedPostings } from "../controllers/deliveryController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

// User-accessible routes (before admin-only middleware)
router.get("/my-assignments", handleGetMyAssignments);
router.get("/my-groups", handleGetMyGroups);

// Admin-only routes below
router.use(authorize("super_admin", "admin"));

router.get("/stats", handleGetDeliveryStats);
router.get("/assigned-dates", handleGetAssignedDates);
router.get("/assigned-postings", handleGetAssignedPostings);
router.get("/group-assignments", handleGetGroupAssignments);
router.get("/", handleGetDeliveries);
router.get("/:id", handleGetDeliveryById);
router.put("/assign-group", handleAssignGroup);
router.put("/bulk-assign", handleBulkAssign);
router.put("/:id/assign", handleAssignDelivery);

export default router;
