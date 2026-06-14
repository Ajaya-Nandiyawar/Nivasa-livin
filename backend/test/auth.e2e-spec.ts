import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import * as bcrypt from 'bcrypt';

/**
 * Auth Integration Tests — POST /api/v1/auth/login
 *
 * These tests run against a REAL database (test DB configured via TEST_DATABASE_URL
 * or DATABASE_URL env var). They seed a test user before running and clean up after.
 *
 * Run with: npm run test:e2e
 */
describe('AuthController (integration)', () => {
  let app: INestApplication<App>;
  let db: DatabaseService;

  const TEST_EMAIL = `test-auth-${Date.now()}@nivasatest.com`;
  const TEST_PASSWORD = 'TestPassword@123';
  let testUserId: string;

  // ─── Setup ─────────────────────────────────────────────────────────────────
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Mirror the exact same middleware pipeline as main.ts
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    db = moduleFixture.get<DatabaseService>(DatabaseService);

    // Seed a dedicated test user
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const inserted = await db
      .insertInto('users')
      .values({
        email: TEST_EMAIL,
        password_hash: passwordHash,
        full_name: 'Auth Test User',
        role: 'MANAGER',
        is_active: true,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    testUserId = inserted.id;
  });

  // ─── Teardown ──────────────────────────────────────────────────────────────
  afterAll(async () => {
    if (testUserId) {
      // Clean up: revoke tokens then delete user
      await db
        .deleteFrom('refresh_tokens')
        .where('user_id', '=', testUserId)
        .execute();
      await db.deleteFrom('users').where('id', '=', testUserId).execute();
    }
    await app.close();
  });

  // ─── Tests ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('should return 200 with accessToken and user object for valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body.accessToken.length).toBeGreaterThan(20);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        email: TEST_EMAIL,
        role: 'MANAGER',
      });
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('fullName');
    });

    it('should set an httpOnly refresh_token cookie on successful login', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(200);

      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();

      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [setCookieHeader];
      const refreshCookie = cookies.find((c: string) =>
        c.startsWith('refresh_token='),
      );

      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
    });

    it('should return 401 for an invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: 'WrongPassword!999' })
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 401 for a non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@nobody.com', password: 'anything' })
        .expect(401);
    });

    it('should return 400 for a missing email field (validation)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ password: 'SomePassword123' })
        .expect(400);
    });

    it('should return 400 for an invalid email format (validation)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'SomePassword123' })
        .expect(400);
    });

    it('should return 400 for a missing password field (validation)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL })
        .expect(400);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should return the current user profile for a valid token', async () => {
      // First log in to get a token
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(200);

      const token = loginRes.body.accessToken;

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toMatchObject({ email: TEST_EMAIL });
    });
  });
});
