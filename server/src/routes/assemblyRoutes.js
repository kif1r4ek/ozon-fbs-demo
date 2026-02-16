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
} from "../controllers/assemblyController.js";

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

export default assemblyRouter;
