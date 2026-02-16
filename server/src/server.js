import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { serverPort } from "./config/environment.js";
import assemblyRouter from "./routes/assemblyRoutes.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import deliveryRouter from "./routes/deliveryRoutes.js";
import syncRouter from "./routes/syncRoutes.js";
import auditRouter from "./routes/auditRoutes.js";
import { syncOzonOrders } from "./useCases/syncOzonOrders.js";

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/deliveries", deliveryRouter);
app.use("/api/sync", syncRouter);
app.use("/api/audit", auditRouter);
app.use("/api/assembly", assemblyRouter);

app.get("/api/health", (_request, response) => {
	response.json({ status: "ok" });
});

// Periodic OZON sync (every 5 minutes)
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

async function runPeriodicSync() {
	try {
		const result = await syncOzonOrders();
		console.log(`[SYNC] OK: created=${result.created}, updated=${result.updated}, total=${result.total}`);
	} catch (error) {
		console.error("[SYNC] Error:", error.message);
	}
}

app.listen(serverPort, () => {
	console.log(`Сервер запущен на http://localhost:${serverPort}`);

	// Initial sync with delay
	setTimeout(runPeriodicSync, 5000);
	setInterval(runPeriodicSync, SYNC_INTERVAL_MS);
});
