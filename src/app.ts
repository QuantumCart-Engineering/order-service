import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import routes from "./routes";

import {
    errorMiddleware
} from "./middleware/error.middleware";

import {
    swaggerSpec
} from "./docs/swagger";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check service health
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Order service is healthy.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     service:
 *                       type: string
 *                       example: order-service
 *                     status:
 *                       type: string
 *                       example: UP
 */
app.get(
    "/health",
    (_request, response) => {
        response.status(200).json({
            success: true,
            data: {
                service: "order-service",
                status: "UP"
            }
        });
    }
);

/*
 * Swagger UI
 *
 * serveFiles() serves Swagger UI static assets.
 * generateHTML() generates the Swagger UI HTML.
 */
const swaggerHtml = swaggerUi.generateHTML(swaggerSpec);

app.use(
    "/api-docs",
    swaggerUi.serveFiles(swaggerSpec)
);

app.get(
    "/api-docs",
    (_request, response) => {
        response.type("html").send(swaggerHtml);
    }
);

app.use(routes);

app.use(errorMiddleware);

export default app;