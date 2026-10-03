import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('login tidak memakai fingerprint fallback statis', () => {
  const source = read('backend/features/login/login.service.js');
  assert.doesNotMatch(source, /0f763f4c50ed799123456789abcdef01/);
  assert.match(source, /\[a-f0-9\]\{64\}/);
});

test('device binding hanya mengizinkan device yang terverifikasi', () => {
  const source = read('backend/features/login/login.repository.js');
  assert.match(source, /existingDevice\.is_verified === true/);
  assert.match(source, /FOR UPDATE/);
});

test('OTP disimpan sebagai hash dengan expiry', () => {
  const source = read('backend/features/login/login.repository.js');
  assert.match(source, /activation_code_hash/);
  assert.match(source, /activation_expires_at/);
  assert.doesNotMatch(source, /SET is_verified = TRUE[\\s\\S]{0,300}WHERE activation_code = \\$1/);
});

test('browser token tidak menggunakan localStorage', () => {
  const files = [
    'electron/preloads/login.preload.js',
    'electron/preloads/dashboard.preload.js',
    'frontend/pages/sub-settings-register/sub-settings-register.js',
    'frontend/pages/sub-settings-password/sub-settings-password.js'
  ];
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /vps_(access|refresh)_token/);
  }
});

test('hardware fingerprint key tidak hardcoded', () => {
  const source = read('backend/features/security/hardware-fingerprint/hardware-fingerprint.service.js');
  assert.doesNotMatch(source, /createHmac\('sha256',\s*['\"]/);
  assert.match(source, /HARDWARE_FINGERPRINT_KEY/);
});

test('migration membuat unique constraint device', () => {
  const source = read('backend/database/migrations/002_security_hardening.sql');
  assert.match(source, /uq_users_devices_user_fingerprint/);
});
