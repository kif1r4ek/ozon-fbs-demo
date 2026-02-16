import { Router } from "express";
import {
	handleGetAssemblyPostings,
	handleGetAssemblyProducts,
	handleGetAwaitingDeliverPostings,
	handleExportDeliverSheet,
	handleGetLabelsFromS3,
	handleUploadLabelsToS3,
	handleCreateFolderInS3,
	handleTestS3Connection,
	handleVerifyBarcode,
	handleFindProductByBarcode,
	handleGetLabelUrl,
	handleVerifyLabelBarcode,
	handleGetLabelBarcode,
	handleMarkAssembled,
	handleShipGroup,
	handleGetAssembledPostings,
} from "../controllers/assemblyController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const assemblyRouter = Router();

assemblyRouter.get("/postings", handleGetAssemblyPostings);
assemblyRouter.get("/products", handleGetAssemblyProducts);
assemblyRouter.get("/awaiting-deliver", handleGetAwaitingDeliverPostings);
assemblyRouter.get("/export/deliver-sheet", handleExportDeliverSheet);
assemblyRouter.post("/labels", handleGetLabelsFromS3);
assemblyRouter.post("/upload-labels", handleUploadLabelsToS3);
assemblyRouter.post("/create-folder", handleCreateFolderInS3);
assemblyRouter.get("/test-s3", handleTestS3Connection);
assemblyRouter.post("/verify-barcode", handleVerifyBarcode);
assemblyRouter.post("/find-product-by-barcode", handleFindProductByBarcode);
assemblyRouter.post("/label-url", handleGetLabelUrl);
assemblyRouter.post("/verify-label-barcode", handleVerifyLabelBarcode);
assemblyRouter.post("/label-barcode", handleGetLabelBarcode);

// Отметка сборки — доступно любому авторизованному пользователю
assemblyRouter.post("/mark-assembled", authenticate, handleMarkAssembled);

// Получение собранных заказов — доступно админам
assemblyRouter.get("/assembled", authenticate, authorize("super_admin", "admin"), handleGetAssembledPostings);

// Пакетная отгрузка — только админы
assemblyRouter.post("/ship-group", authenticate, authorize("super_admin", "admin"), handleShipGroup);

export default assemblyRouter;
