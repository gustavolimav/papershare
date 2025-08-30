import orchestrator from 'tests/orchestrator.ts';
import { version as uuidVersion } from 'uuid';
import session from 'models/session.ts';
import setCookieParser from 'set-cookie-parser';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe('POST /api/v1/sessions', () => {
  describe('Running as anonymous user', () => {
    test('With incorrect `email` but correct `password`', async () => {
      await orchestrator.createUser({
        password: 'password123',
      });

      const response = await fetch('http://localhost:3000/api/v1/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'email@gmail.com',
          password: 'password123',
        }),
      });

      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: 'UnathorizedError',
        message: 'Email ou senha inválidos.',
        action: 'Verifique se o email e a senha estão digitados corretamente.',
        status: 401,
      });
    });

    test('With correct `email` but Incorrect `password`', async () => {
      const userCreated = await orchestrator.createUser({
        email: 'email@email.com',
        password: 'password123',
      });

      const response = await fetch('http://localhost:3000/api/v1/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userCreated.email,
          password: 'wrongpassword',
        }),
      });

      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: 'UnathorizedError',
        message: 'Email ou senha inválidos.',
        action: 'Verifique se o email e a senha estão digitados corretamente.',
        status: 401,
      });
    });

    test('With incorrect `email` and incorrect `password`', async () => {
      await orchestrator.createUser({
        email: 'emailIncorreto@email.com',
        password: 'password123',
      });

      const response = await fetch('http://localhost:3000/api/v1/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'mariaChica@email.com',
          password: 'password1234',
        }),
      });

      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: 'UnathorizedError',
        message: 'Email ou senha inválidos.',
        action: 'Verifique se o email e a senha estão digitados corretamente.',
        status: 401,
      });
    });

    test('With correct `email` and correct `password`', async () => {
      const userCreated = await orchestrator.createUser({
        email: 'emailCorreto@email.com',
        password: 'password123',
      });
      const response = await fetch('http://localhost:3000/api/v1/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userCreated.email,
          password: 'password123',
        }),
      });

      expect(response.status).toBe(201);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        token: responseBody.token,
        user_id: userCreated.id,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
        expires_at: responseBody.expires_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(Date.parse(responseBody.expires_at)).not.toBeNaN();

      // check if expires_at is 30 days after created_at

      const createdAt = new Date(responseBody.created_at);
      const expiresAt = new Date(responseBody.expires_at);

      createdAt.setMilliseconds(0);
      expiresAt.setMilliseconds(0);

      const expectedExpiresAt = new Date(
        createdAt.getTime() + session.EXPIRATION_IN_MILLISECONDS,
      );

      expect(expiresAt.getTime()).toBe(expectedExpiresAt.getTime());

      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: 'session_id',
        value: responseBody.token,
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
        path: '/',
        httpOnly: true,
      });
    });
  });
});
