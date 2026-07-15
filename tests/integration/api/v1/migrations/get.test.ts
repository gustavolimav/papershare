import orchestrator from "../../../../orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  // The secret-header tests below don't care whether the schema exists yet,
  // but the new session-based superadmin tests need the users/sessions
  // tables to create a test user against.
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("Without migrations secret", async () => {
      const response = await fetch("http://localhost:3000/api/v1/migrations");

      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Acesso não autorizado às migrações.",
        action:
          "Forneça o cabeçalho 'x-migrations-secret' correto ou acesse com uma conta de superadmin.",
        status: 401,
      });
    });

    test("With wrong migrations secret", async () => {
      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        headers: { "x-migrations-secret": "wrong-secret" },
      });

      expect(response.status).toBe(401);
    });

    test("Logged in, but not a superadmin", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        headers: { Cookie: cookie },
      });

      expect(response.status).toBe(401);
    });
  });

  describe("With correct migrations secret", () => {
    test("Retrieving pending migrations", async () => {
      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        headers: { "x-migrations-secret": process.env.MIGRATIONS_SECRET! },
      });

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(Array.isArray(responseBody)).toBe(true);
    });
  });

  describe("Logged in as a superadmin", () => {
    test("Retrieving pending migrations without the secret header", async () => {
      const { cookie } = await orchestrator.createSuperadminUserSession();

      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        headers: { Cookie: cookie },
      });

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(Array.isArray(responseBody)).toBe(true);
    });
  });
});
