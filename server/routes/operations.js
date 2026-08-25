import express from "express";
import {
  getOperations,
  getOperationById,
  createOperation,
  updateOperation,
  deleteOperation
} from "../controllers/operations.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getOperations);
router.get("/:id", getOperationById);
router.post("/", createOperation);
router.put("/:id", updateOperation);
router.delete("/:id", deleteOperation);

export default router;
