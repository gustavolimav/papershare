import orchestrator from "../../../../orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
});

describe("POST /api/v1/migrations", () => {
  describe("Running as anonymous user", () => {
    test("For the first time", async () => {
      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        method: "POST",
      });

      expect(response.status).toBe(201);

      const responseBody = await response.json();

      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody.length).toBeGreaterThan(0);

      for (let i = 0; i < responseBody.length; i++) {
        expect(Object.keys(responseBody[i])).toStrictEqual([
          "path",
          "name",
          "timestamp",
        ]);
      }
    });

    test("For the second time", async () => {
      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        method: "POST",
      });

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody.length).toBe(0);
    });
  });
});
