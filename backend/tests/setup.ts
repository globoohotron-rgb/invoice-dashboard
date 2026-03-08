import 'dotenv/config'

// Ensure test DB is configured. If no .env.test, tests use the same DB as dev.
// To use a separate test DB: create .env.test with a different DATABASE_URL
// and run: dotenv -e .env.test -- vitest run
