import fs from "fs";
import path from "path";
import pool from "../config/database";
import {
    acquireMigrationLock,
    applyMigration,
    ensureMigrationTable,
    getAppliedMigrations,
    loadMigrationFiles,
    releaseMigrationLock,
    validateMigrationHistory
} from "../utils/migration.utils";

const runMigrations = async (): Promise<void> => {
    const connection = await pool.getConnection();

    try {
        const migrationsDirectory = path.resolve(process.cwd(), "migrations");

        if (!fs.existsSync(migrationsDirectory)) {
            throw new Error(`Migrations directory not found: ${migrationsDirectory}`);
        }

        await acquireMigrationLock(connection);

        try {
            await ensureMigrationTable(connection);

            const migrationFiles = loadMigrationFiles(migrationsDirectory);
            const appliedMigrations = await getAppliedMigrations(connection);

            validateMigrationHistory(
                migrationFiles,
                appliedMigrations
            );

            const appliedNames = new Set(
                appliedMigrations.map((migration) => migration.name)
            );

            for (const migration of migrationFiles) {
                if (appliedNames.has(migration.name)) {
                    console.log(`Skipping applied migration: ${migration.name}`);
                    continue;
                }

                console.log(`Applying migration: ${migration.name}`);

                await applyMigration(connection, migration);

                console.log(`Applied migration: ${migration.name}`);
            }

            console.log("Database migrations completed successfully.");
        } finally {
            await releaseMigrationLock(connection);
        }
    } finally {
        connection.release();
        await pool.end();
    }
};

runMigrations().catch((error: unknown) => {
    console.error("Database migration failed:", error);
    process.exit(1);
});