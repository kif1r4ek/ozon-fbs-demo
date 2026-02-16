import { Router } from "express";
import { handleLogin, handleLogout, handleGetMe } from "../controllers/authController.js";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/login", handleLogin);
router.post("/logout", authenticate, handleLogout);
router.get("/me", optionalAuth, handleGetMe);

export default router;
