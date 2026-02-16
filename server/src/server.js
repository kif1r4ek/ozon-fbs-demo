import express from "express";
import cors from "cors";
import { serverPort } from "./config/environment.js";
import assemblyRouter from "./routes/assemblyRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/assembly", assemblyRouter);

app.get("/api/health", (_request, response) => {
	response.json({ status: "ok" });
});

app.listen(serverPort, () => {
	console.log(`Сервер запущен на http://localhost:${serverPort}`);
});
