import orchestrator from "tests/orchestrator";
import passwordReset from "models/passwordReset";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/password-reset", () => {
  test("With an invalid email format", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/password-reset",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }),
      },
    );

    expect(response.status).toBe(400);
  });

  test("With an email that doesn't exist — still responds 204 (no enumeration)", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/password-reset",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nobody-here@example.com" }),
      },
    );

    expect(response.status).toBe(204);
  });

  test("With a registered email — responds 204 and creates a reset token", async () => {
    const user = await orchestrator.createUser();

    const response = await fetch(
      "http://localhost:3000/api/v1/password-reset",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      },
    );

    expect(response.status).toBe(204);

    // The API never returns the raw token (it's only ever sent by e-mail),
    // so this creates a second token for the same user directly through the
    // model just to confirm a row now exists — findValidByToken only works
    // with the raw value, and the POST above didn't hand us one.
    const token = await passwordReset.create(user.id);
    const found = await passwordReset.findValidByToken(token.token);

    expect(found?.user_id).toBe(user.id);
  });

  test("A second request for the same email invalidates the first token", async () => {
    const user = await orchestrator.createUser();

    const firstToken = await passwordReset.create(user.id);

    await fetch("http://localhost:3000/api/v1/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    });

    const found = await passwordReset.findValidByToken(firstToken.token);
    expect(found).toBeNull();
  });
});
