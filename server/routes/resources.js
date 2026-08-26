import express from "express";
import {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  uploadResourceImage
} from "../controllers/resources.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getResources);
router.post("/upload", uploadResourceImage);
router.get("/:id", getResourceById);
router.post("/", createResource);
router.put("/:id", updateResource);
router.delete("/:id", deleteResource);

export default router;
