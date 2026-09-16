module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/src/__tests__"],
    moduleFileExtensions: ["ts", "js"],
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            {
                tsconfig: "tsconfig.json"
            }
        ]
    },
    collectCoverageFrom: [
        "src/**/*.ts",
        "!src/server.ts",
        "!src/scripts/**"
    ]
};