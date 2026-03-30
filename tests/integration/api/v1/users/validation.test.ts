import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/users — input validation", () => {
  test("Missing username returns 400", async () => {
    const response = await fetch("http://localhost:3000/api/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com", password: "password123" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.name).toBe("ValidationError");
  });

  test("Username too short returns 400", async () => {
    const response = await fetch("http://localhost:3000/api/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "ab",
        email: "test@test.com",
        password: "password123",
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.name).toBe("ValidationError");
    expect(body.message).toContain("3 caracteres");
  });

  test("Username with special characters returns 400", async () => {
    const response = await fetch("http://localhost:3000/api/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "user_name",
        email: "test@test.com",
        password: "password123",
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.name).toBe("ValidationError");
    expect(body.message).toContain("letras e números");
  });

  test("Invalid email returns 400", async () => {
    const response = await fetch("http://localhost:3000/api/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "validuser",
        email: "not-an-email",
        password: "password123",
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.name).toBe("ValidationError");
    expect(body.message).toContain("email");
  });

  test("Password too short returns 400", async () => {
    const response = await fetch("http://localhost:3000/api/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "validuser",
        email: "test@test.com",
        password: "short",
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.name).toBe("ValidationError");
    expect(body.message).toContain("8 caracteres");
  });
});

describe("PATCH /api/v1/users/[username] — input validation", () => {
  test("Empty body returns 400", async () => {
    const { user: createdUser, cookie } =
      await orchestrator.createUserSession();

    const response = await fetch(
      `http://localhost:3000/api/v1/users/${createdUser.username}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.name).toBe("ValidationError");
  });

  test("Invalid email format returns 400", async () => {
    const { user: createdUser, cookie } =
      await orchestrator.createUserSession();

    const response = await fetch(
      `http://localhost:3000/api/v1/users/${createdUser.username}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ email: "not-an-email" }),
      },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.name).toBe("ValidationError");
    expect(body.message).toContain("email");
  });

  test("Password too short returns 400", async () => {
    const { user: createdUser, cookie } =
      await orchestrator.createUserSession();

    const response = await fetch(
      `http://localhost:3000/api/v1/users/${createdUser.username}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ password: "short" }),
      },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.name).toBe("ValidationError");
    expect(body.message).toContain("8 caracteres");
  });
});

describe("POST /api/v1/sessions — input validation", () => {
  test("Invalid email format returns 400", async () => {
    const response = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "password123" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.name).toBe("ValidationError");
    expect(body.message).toContain("email");
  });

  test("Missing password returns 400", async () => {
    const response = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.name).toBe("ValidationError");
  });
});
