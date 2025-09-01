import orchestrator from "../../../../orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("Get /api/v1/status", () => {
  describe("Anonymous User", () => {
    test("Retrieving current system status", async () => {
      const response = await fetch("http://localhost:3000/api/v1/status");

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      const database_version = responseBody.dependencies.database.version;
      const database_max_connections =
        responseBody.dependencies.database.max_connections;
      const database_opened_connections =
        responseBody.dependencies.database.opened_connections;
      const updated_at = responseBody.updated_at;

      const parsedUpdatedAt = new Date(responseBody.updated_at).toISOString();

      expect(updated_at).toBeDefined();
      expect(updated_at).toEqual(parsedUpdatedAt);
      expect(database_version).toBe("16.0");
      expect(database_max_connections).toBe(100);
      expect(database_opened_connections).toBe(1);
      expect(Object.keys(responseBody)).toStrictEqual([
        "updated_at",
        "dependencies",
      ]);
      expect(Object.keys(responseBody.dependencies)).toStrictEqual([
        "database",
      ]);
      expect(Object.keys(responseBody.dependencies.database)).toStrictEqual([
        "version",
        "max_connections",
        "opened_connections",
      ]);
    });
  });
});
