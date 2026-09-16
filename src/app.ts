import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { errorMiddleware } from "./middleware/error.middleware";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_request, response) => {
    response.status(200).json({
        success: true,
        data: {
            service: "order-service",
            status: "UP"
        }
    });
});

app.use(routes);
app.use(errorMiddleware);

export default app;