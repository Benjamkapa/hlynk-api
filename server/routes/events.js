import express from "express";
import {
  getEvents,
  getEventById,
  createEvent,
  recordEventPayment,
  updateEventStatus,
  deleteEvent
} from "../controllers/events.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getEvents);
router.get("/:id", getEventById);
router.post("/", createEvent);
router.post("/:id/payments", recordEventPayment);
router.patch("/:id/status", updateEventStatus);
router.delete("/:id", deleteEvent);

export default router;
