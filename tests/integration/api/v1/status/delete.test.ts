import orchestrator from "../../../../orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("DELETE /api/v1/status", () => {
  describe("Anonymous User", () => {
    test("Attempting to use DELETE method", async () => {
      const response = await fetch("http://localhost:3000/api/v1/status", {
        method: "DELETE",
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
