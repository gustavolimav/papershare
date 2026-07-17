import database from "infra/database";
import password from "models/password";
import user from "models/user";
import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/users", () => {
  describe("Running as anonymous user", () => {
    test("With unique and valid data", async () => {
      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "testuser1",
          password: "password123",
          email: "email@gmail.com",
        }),
      });

      expect(response.status).toBe(201);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "testuser1",
        email: "email@gmail.com",
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
        is_superadmin: false,
        active_workspace_id: responseBody.active_workspace_id,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(responseBody.active_workspace_id).not.toBeNull();

      const userFromDatabase = await user.findOneByUsername("testuser1");

      const correctPasswordCompare = await password.compare(
        "password123",
        userFromDatabase.password,
      );

      expect(correctPasswordCompare).toBeTruthy();

      const incorrectPasswordCompare = await password.compare(
        "wrongpassword",
        userFromDatabase.password,
      );

      expect(incorrectPasswordCompare).toBeFalsy();
    });

    test("Creates a personal workspace with the new user as its owner", async () => {
      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "workspaceowner",
          password: "password123",
          email: "workspaceowner@gmail.com",
        }),
      });

      expect(response.status).toBe(201);

      const responseBody = await response.json();

      const results = await database.query({
        text: `
          SELECT
            workspaces.id,
            workspaces.is_personal,
            workspaces.created_by,
            workspace_members.role,
            users.active_workspace_id
          FROM
            users
          JOIN
            workspaces ON workspaces.id = users.active_workspace_id
          JOIN
            workspace_members ON workspace_members.workspace_id = workspaces.id
            AND workspace_members.user_id = users.id
          WHERE
            users.id = $1
          ;`,
        values: [responseBody.id],
      });

      expect(results.rowCount).toBe(1);

      const row = results.rows[0];

      expect(row.is_personal).toBe(true);
      expect(row.created_by).toBe(responseBody.id);
      expect(row.role).toBe("owner");
      expect(row.active_workspace_id).toBe(row.id);
    });

    test("Re-running migrations after a user already exists does not error or duplicate their workspace", async () => {
      const createdUser = await orchestrator.createUser({
        username: "migrationidempotent",
        email: "migrationidempotent@gmail.com",
      });

      await expect(orchestrator.runPendingMigrations()).resolves.not.toThrow();

      const results = await database.query({
        text: `
          SELECT
            count(*)::int AS count
          FROM
            workspaces
          WHERE
            created_by = $1
          ;`,
        values: [createdUser.id],
      });

      expect(results.rows[0].count).toBe(1);
    });

    test("With duplicated email", async () => {
      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "testuser2",
          password: "password123",
          email: "Email@gmail.com",
        }),
      });

      expect(response.status).toBe(400);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O email informado já está sendo utilizado.",
        action: "Utilize outro email para realizar esta operação.",
        status: 400,
      });
    });

    test("With duplicated username", async () => {
      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "testuser1",
          password: "password123",
          email: "novoEmail@gmail.com",
        }),
      });

      expect(response.status).toBe(400);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        action: "Utilize outro username para realizar esta operação.",
        message: "O username informado já está sendo utilizado.",
        status: 400,
      });
    });
  });
});
