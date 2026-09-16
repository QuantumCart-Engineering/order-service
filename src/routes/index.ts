import { Router } from "express";
import orderRoutes from "./order.routes";

const router = Router();

router.use("/api/v1/orders", orderRoutes);

export default router;