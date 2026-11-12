require('dotenv').config();
const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const { buildCookieConfig } = require('../src/config/cookie');
const prisma = require('../src/db/prisma');
const sessionStore = require('../src/session/sessionStore');

const testEmail = `session-test-${process.pid}@example.com`;
const testPassword = 'correct horse battery staple';
let server;
let baseUrl;
let testUser;

before(async () => {
  const passwordHash = await bcrypt.hash(testPassword, 4);
  testUser = await prisma.user.upsert({
    where: { email: testEmail },
    update: { name: 'Session Test', passwordHash },
    create: { name: 'Session Test', email: testEmail, passwordHash },
    select: { id: true, name: true, email: true },
  });

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (testUser) await prisma.user.delete({ where: { id: testUser.id } });
  await prisma.$disconnect();
});

test('session authentication endpoints enforce cookie and session security', async () => {
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `  ${testEmail.toUpperCase()} `, password: testPassword }),
  });
  assert.equal(loginResponse.status, 200);
  const loginBody = await loginResponse.json();
  assert.deepEqual(loginBody.user, testUser);
  assert.equal(Object.prototype.hasOwnProperty.call(loginBody.user, 'passwordHash'), false);

  const setCookie = loginResponse.headers.get('set-cookie');
  assert.ok(setCookie);
  assert.match(setCookie, /^sid=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.match(setCookie, /Max-Age=86400/i);
  assert.doesNotMatch(setCookie, /; Secure/i);

  const cookiePair = setCookie.split(';', 1)[0];
  const signedValue = decodeURIComponent(cookiePair.slice(cookiePair.indexOf('=') + 1));
  assert.match(signedValue, /^s:[a-f0-9]{64}\.[A-Za-z0-9+/]+$/);
  const sessionId = signedValue.slice(2, signedValue.lastIndexOf('.'));

  const meResponse = await fetch(`${baseUrl}/auth/me`, { headers: { Cookie: cookiePair } });
  assert.equal(meResponse.status, 200);
  assert.deepEqual((await meResponse.json()).user, testUser);

  const missingCookie = await fetch(`${baseUrl}/auth/me`);
  assert.equal(missingCookie.status, 401);

  const tamperedValue = encodeURIComponent(`${signedValue}x`);
  const tamperedResponse = await fetch(`${baseUrl}/auth/me`, {
    headers: { Cookie: `sid=${tamperedValue}` },
  });
  assert.equal(tamperedResponse.status, 401);

  const unknownUser = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'unknown@example.com', password: testPassword }),
  });
  const wrongPassword = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'incorrect password' }),
  });
  assert.equal(unknownUser.status, 401);
  assert.equal(wrongPassword.status, 401);
  assert.deepEqual(await unknownUser.json(), await wrongPassword.json());

  sessionStore.create(sessionId, testUser.id, Date.now() - 1);
  const expiredSession = await fetch(`${baseUrl}/auth/me`, { headers: { Cookie: cookiePair } });
  assert.equal(expiredSession.status, 401);

  const orphanLogin = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  const orphanCookie = orphanLogin.headers.get('set-cookie').split(';', 1)[0];
  await prisma.user.delete({ where: { id: testUser.id } });
  try {
    const orphanedSession = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: orphanCookie },
    });
    assert.equal(orphanedSession.status, 401);
  } finally {
    testUser = await prisma.user.create({
      data: {
        name: 'Session Test',
        email: testEmail,
        passwordHash: await bcrypt.hash(testPassword, 4),
      },
      select: { id: true, name: true, email: true },
    });
  }

  const freshLogin = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  const freshCookieHeader = freshLogin.headers.get('set-cookie');
  const freshCookie = freshCookieHeader.split(';', 1)[0];
  const logoutResponse = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: freshCookie },
  });
  assert.equal(logoutResponse.status, 204);
  const clearedCookie = logoutResponse.headers.get('set-cookie');
  assert.match(clearedCookie, /^sid=;/);
  assert.match(clearedCookie, /HttpOnly/i);
  assert.match(clearedCookie, /SameSite=Lax/i);
  assert.doesNotMatch(clearedCookie, /; Secure/i);

  const oldCookieResponse = await fetch(`${baseUrl}/auth/me`, {
    headers: { Cookie: freshCookie },
  });
  assert.equal(oldCookieResponse.status, 401);

  const repeatedLogout = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: freshCookie },
  });
  assert.equal(repeatedLogout.status, 204);

  const productionConfig = buildCookieConfig({
    COOKIE_SECRET: 'a'.repeat(40),
    COOKIE_SECURE: 'false',
    NODE_ENV: 'production',
    SESSION_MAX_AGE_MS: '86400000',
  });
  assert.equal(productionConfig.cookieOptions.secure, true);
  assert.equal(productionConfig.clearCookieOptions.secure, true);
  const developmentConfig = buildCookieConfig({
    COOKIE_SECRET: 'a'.repeat(40),
    COOKIE_SECURE: 'false',
    NODE_ENV: 'development',
    SESSION_MAX_AGE_MS: '86400000',
  });
  assert.equal(developmentConfig.cookieOptions.secure, false);
  assert.throws(() => buildCookieConfig({
    COOKIE_SECRET: 'replace-with-a-long-random-secret',
    SESSION_MAX_AGE_MS: '86400000',
  }), /COOKIE_SECRET/);
});
