import { Router } from "express";
import { handleGetUsers, handleCreateUser, handleUpdateUser, handleDeleteUser } from "../controllers/userController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);
router.use(authorize("super_admin", "admin"));

router.get("/", handleGetUsers);
router.post("/", handleCreateUser);
router.put("/:id", handleUpdateUser);
router.delete("/:id", authorize("super_admin"), handleDeleteUser);

export default router;
