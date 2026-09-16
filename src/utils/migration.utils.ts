import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import type { PoolConnection } from "mysql2/promise";

export interface MigrationFile {
    name: string;
    sql: string;
    checksum: string;
}

export interface MigrationRecord {
    name: string;
    checksum: string;
}

type QueryConnection = Pick<PoolConnection, "execute">;

type TransactionConnection = Pick<
    PoolConnection,
    "execute" | "beginTransaction" | "query" | "commit" | "rollback"
>;

export const getMigrationChecksum = (sql: string): string => {
    return createHash("sha256").update(sql).digest("hex");
};

export const loadMigrationFiles = (
    migrationsDirectory: string
): MigrationFile[] => {
    const files = fs
        .readdirSync(migrationsDirectory)
        .filter((file) => /^\d+_.+\.sql$/.test(file))
        .sort();

    return files.map((file) => {
        const filePath = path.join(migrationsDirectory, file);
        const sql = fs.readFileSync(filePath, "utf8");

        return {
            name: file,
            sql,
            checksum: getMigrationChecksum(sql)
        };
    });
};

export const ensureMigrationTable = async (
    connection: QueryConnection
): Promise<void> => {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            migration_name VARCHAR(255) NOT NULL,
            checksum CHAR(64) NOT NULL,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (id),
            UNIQUE KEY uq_schema_migrations_name (migration_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

export const getAppliedMigrations = async (
    connection: QueryConnection
): Promise<MigrationRecord[]> => {
    const [rows] = await connection.execute(
        `
            SELECT migration_name, checksum
            FROM schema_migrations
            ORDER BY id ASC
        `
    );

    return (rows as Array<{
        migration_name: string;
        checksum: string;
    }>).map((row) => ({
        name: row.migration_name,
        checksum: row.checksum
    }));
};

export const validateMigrationHistory = (
    migrationFiles: MigrationFile[],
    appliedMigrations: MigrationRecord[]
): void => {
    const migrationMap = new Map(
        migrationFiles.map((migration) => [
            migration.name,
            migration.checksum
        ])
    );

    for (const applied of appliedMigrations) {
        const currentChecksum = migrationMap.get(applied.name);

        if (!currentChecksum) {
            throw new Error(
                `Applied migration is missing from filesystem: ${applied.name}`
            );
        }

        if (currentChecksum !== applied.checksum) {
            throw new Error(
                `Migration checksum mismatch: ${applied.name}`
            );
        }
    }
};

export const acquireMigrationLock = async (
    connection: QueryConnection
): Promise<void> => {
    const [rows] = await connection.execute(
        `SELECT GET_LOCK('quantumcart_order_migrations', 30) AS acquired`
    );

    const result = rows as Array<{ acquired: number }>;

    if (result[0]?.acquired !== 1) {
        throw new Error("Could not acquire migration lock");
    }
};

export const releaseMigrationLock = async (
    connection: QueryConnection
): Promise<void> => {
    await connection.execute(
        `SELECT RELEASE_LOCK('quantumcart_order_migrations')`
    );
};

export const applyMigration = async (
    connection: TransactionConnection,
    migration: MigrationFile
): Promise<void> => {
    await connection.beginTransaction();

    try {
        await connection.execute(migration.sql);

        await connection.execute(
            `
                INSERT INTO schema_migrations
                    (migration_name, checksum)
                VALUES (?, ?)
            `,
            [migration.name, migration.checksum]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    }
};