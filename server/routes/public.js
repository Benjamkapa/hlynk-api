import express from "express";
import { getPublicStayListing, submitPublicOrder } from "../controllers/public.js";

const router = express.Router();

// No authentication middleware — these are public endpoints
router.get("/stay/:slug", getPublicStayListing);
router.get("/shop/:slug", getPublicStayListing);
router.get("/store/:slug", getPublicStayListing);
router.post("/order", submitPublicOrder);

export default router;
