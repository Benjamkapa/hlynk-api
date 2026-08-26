import express from "express";
import { getPublicStayListing } from "../controllers/public.js";

const router = express.Router();

// No authentication middleware — these are public endpoints
router.get("/stay/:slug", getPublicStayListing);

export default router;
