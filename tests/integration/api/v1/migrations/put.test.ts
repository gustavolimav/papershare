import orchestrator from "../../../../orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
});

describe("PUT /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("Attempting to update migrations", async () => {
      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        method: "PUT",
      });

      expect(response.status).toBe(405);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        status: 405,
        name: "MethodNotAllowedError",
        message: "Method Not Allowed",
        action: "Please check the API documentation for the correct usage.",
      });
    });
  });
});
