import dotenv from "dotenv";

dotenv.config({
    quiet: true
});

if (process.env.NODE_ENV === "test") {
    dotenv.config({
        path: ".env.test",
        quiet: true,
        override: false
    });
}

const requiredEnv = (name: string): string => {
    const value = process.env[name];

    if (value === undefined || value.trim() === "") {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
};

const positiveIntegerEnv = (name: string, defaultValue: number): number => {
    const value = process.env[name];

    if (value === undefined || value.trim() === "") {
        return defaultValue;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`Environment variable ${name} must be a positive integer`);
    }

    return parsed;
};

export const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: positiveIntegerEnv("PORT", 8004),

    db: {
        host: requiredEnv("DB_HOST"),
        port: positiveIntegerEnv("DB_PORT", 3309),
        user: requiredEnv("DB_USER"),
        password: requiredEnv("DB_PASSWORD"),
        name: requiredEnv("DB_NAME"),
        connectionLimit: positiveIntegerEnv("DB_CONNECTION_LIMIT", 10)
    },

    dbRoot: {
        user: requiredEnv("DB_ROOT_USER"),
        password: requiredEnv("DB_ROOT_PASSWORD")
    },

    services: {
        product: requiredEnv("PRODUCT_SERVICE_URL"),
        cart: requiredEnv("CART_SERVICE_URL")
    }
};