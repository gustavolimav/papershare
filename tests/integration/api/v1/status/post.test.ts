import orchestrator from "../../../../orchestrator.ts";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("POST /api/v1/status", () => {
  describe("Anonymous User", () => {
    test("Attempting to use POST method", async () => {
      const response = await fetch("http://localhost:3000/api/v1/status", {
        method: "POST",
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
