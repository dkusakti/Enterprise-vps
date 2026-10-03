import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

const read = (rel) =>
  fs.readFileSync(path.join(root, rel), 'utf8');

test('JWT controller tidak mengakses PostgreSQL secara langsung', () => {
  const source = read(
    'backend/features/security/jwt-token/jwt-token.controller.js'
  );

  assert.doesNotMatch(source, /database\/pool\.js/);
  assert.doesNotMatch(source, /\bdb\.(query|connect)\s*\(/);
  assert.match(source, /sessionRepository\./);
  assert.match(source, /loginRepository\./);
});

test('refresh token HTTP hanya diterima dari HttpOnly cookie', () => {
  const source = read(
    'backend/features/security/jwt-token/jwt-token.controller.js'
  );

  assert.match(source, /getCookie\(req, 'ei_refresh_token'\)/);
  assert.doesNotMatch(source, /req\.body\?\.refreshToken/);
});

test('validasi token aktif mengembalikan user context yang dipakai kernel', () => {
  const source = read(
    'backend/features/security/jwt-token/jwt-token.controller.js'
  );

  assert.match(source, /return \{[\s\S]*success: true,[\s\S]*user: \{/);
  assert.match(source, /sessionId: access\.user\.sessionId/);
  assert.match(source, /jti: access\.user\.jti/);
});

test('Electron main tidak menjalankan SQL login secara langsung', () => {
  const source = read('electron/main.js');

  assert.doesNotMatch(source, /import dbPool from/);
  assert.doesNotMatch(
    source,
    /dbPool\.query\(\s*`SELECT id, username, role FROM login/
  );
  assert.match(source, /loginRepository\.findUserById/);
  assert.match(source, /dbEventEmitter\.on\('emergency_logout'/);
});

test('reset hardware memiliki guard Owner sebagai pertahanan lapis kedua', () => {
  const source = read(
    'backend/features/owner/reset-hardware/reset-hardware.controller.js'
  );

  assert.match(source, /userRole !== 'owner'/);
  assert.doesNotMatch(
    source,
    /userRole !== 'owner' && userRole !== 'adminmaster'/
  );
});

test('HTTP layer mengirim Content-Security-Policy', () => {
  const source = read(
    'backend/infrastructure/http/middleware/security.middleware.js'
  );

  assert.match(source, /Content-Security-Policy/);
  assert.match(source, /object-src 'none'/);
  assert.match(source, /frame-ancestors 'none'/);
});

test('JWT controller mencatat logout HTTP melalui AuditService', () => {
  const source = read(
    'backend/features/security/jwt-token/jwt-token.controller.js'
  );

  assert.match(source, /AuditService\.record/);
  assert.match(source, /'LOGOUT'/);
});

test('HTTP logout tidak bergantung pada access token yang mungkin sudah kedaluwarsa', () => {
  const source = read(
    'backend/infrastructure/http/routes/logout.routes.js'
  );

  assert.doesNotMatch(source, /expressAuthenticateToken/);
  assert.match(source, /jwtTokenController\.expressLogout/);
});
