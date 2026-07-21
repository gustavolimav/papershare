import orchestrator from "tests/orchestrator";
import passwordReset from "models/passwordReset";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/password-reset/[token]", () => {
  test("With a nonexistent token", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/password-reset/nonexistent-token",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "newpassword123" }),
      },
    );

    expect(response.status).toBe(404);
  });

  test("With a valid token but a password shorter than 8 characters", async () => {
    const user = await orchestrator.createUser();
    const token = await passwordReset.create(user.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/password-reset/${token.token}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "short" }),
      },
    );

    expect(response.status).toBe(400);
  });

  test("With a valid token: resets the password, logs out every existing session, and can't be reused", async () => {
    const { user, cookie } = await orchestrator.createUserSession({
      password: "oldpassword123",
    });
    const token = await passwordReset.create(user.id);

    const resetResponse = await fetch(
      `http://localhost:3000/api/v1/password-reset/${token.token}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "newpassword123" }),
      },
    );

    expect(resetResponse.status).toBe(204);

    // The old session must have been invalidated by the reset.
    const meWithOldCookie = await fetch(
      "http://localhost:3000/api/v1/sessions",
      { headers: { Cookie: cookie } },
    );
    expect(meWithOldCookie.status).toBe(401);

    // The old password no longer works...
    const loginWithOldPassword = await fetch(
      "http://localhost:3000/api/v1/sessions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          password: "oldpassword123",
        }),
      },
    );
    expect(loginWithOldPassword.status).toBe(401);

    // ...but the new one does.
    const loginWithNewPassword = await fetch(
      "http://localhost:3000/api/v1/sessions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          password: "newpassword123",
        }),
      },
    );
    expect(loginWithNewPassword.status).toBe(201);

    // The token is single-use.
    const reuseResponse = await fetch(
      `http://localhost:3000/api/v1/password-reset/${token.token}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "anotherpassword123" }),
      },
    );
    expect(reuseResponse.status).toBe(404);
  });

  test("With an expired token", async () => {
    const user = await orchestrator.createUser();
    const token = await passwordReset.create(user.id);

    await orchestrator.expirePasswordResetToken(token.token);

    const response = await fetch(
      `http://localhost:3000/api/v1/password-reset/${token.token}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "newpassword123" }),
      },
    );

    expect(response.status).toBe(404);
  });
});
