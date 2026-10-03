## Dependency hardening

- Updated the locked `qs` dependency to `6.16.0`, which is outside the vulnerable `2.2.5–6.15.3` range reported by npm audit.
- Added an npm `overrides` rule for `qs` so transitive dependency resolution cannot fall back to the vulnerable version.

# Enterprise-Invest — Security Hardening

## Perubahan utama

### 1. Device binding
- Menghapus fingerprint fallback statis.
- Electron memakai hardware fingerprint SHA-256/HMAC.
- Browser memakai device ID acak 32-byte yang disimpan sebagai `HttpOnly` cookie.
- Device pending tidak lagi dianggap sebagai device terverifikasi.
- Batas maksimum 5 device dilindungi dengan `SELECT ... FOR UPDATE`.
- Unique index `(user_id, device_fingerprint)` mencegah duplikasi akibat concurrency.

### 2. OTP device approval
- OTP tidak lagi disimpan plaintext.
- Database menyimpan SHA-256 OTP.
- OTP kedaluwarsa setelah 15 menit.
- OTP dihapus setelah berhasil diverifikasi.
- Jalur approval Electron dan Express menggunakan repository yang sama.
- Rate-limit OTP memakai key berbasis actor/IP pada jalur Express.

### 3. Session/token browser
- Access token dan refresh token tidak lagi disimpan di `localStorage`.
- Browser menerima token melalui `HttpOnly; SameSite=Strict` cookie.
- Cookie `Secure` aktif pada production.
- Refresh token tetap opaque dan mengalami rotation.
- Refresh browser berjalan otomatis sebelum access token kedaluwarsa.
- Logout membersihkan auth cookies dan mencabut refresh session.

### 4. Password
- Perubahan password mencabut seluruh session aktif user.
- Password baru minimal 12 karakter.
- Endpoint pembuatan user tidak lagi mengembalikan password plaintext.
- Default password statis `Invest2026` dihapus.
- Frontend menampilkan password yang memang sudah dimasukkan operator, tanpa meminta server mengirimkannya kembali.

### 5. Hardware HMAC secret
- Secret hardware fingerprint dipindahkan dari source code ke `HARDWARE_FINGERPRINT_KEY`.
- Key harus berupa 64 karakter hexadecimal / 32 random bytes.

### 6. Transport security
- Production VPS menolak HTTP ketika `ALLOW_HTTP=false`.
- Enforcement hanya aktif pada `APP_MODE=SERVER_VPS`, sehingga local Electron tidak rusak.
- Security headers tetap diterapkan.

### 7. Regression tests
Ditambahkan:
`tests/security/security-hardening.test.js`

Test mencakup:
- fallback fingerprint
- device verification
- OTP hashing/expiry
- localStorage token
- hardcoded hardware secret
- unique device constraint

## Migrasi database

Jalankan:

```bash
npm run db:migrate
```

Migrasi baru:

`backend/database/migrations/002_security_hardening.sql`

Migrasi:
- menambah `activation_code_hash`
- menambah `activation_expires_at`
- membersihkan OTP plaintext lama
- menambah unique index device fingerprint
- menambah index OTP hash

## Environment wajib

Tambahkan secret berikut pada `.env` production:

```env
HARDWARE_FINGERPRINT_KEY=<64-hex-characters>
ALLOW_HTTP=false
APP_ENV=production
```

Generate key dengan:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Jika server berada di belakang reverse proxy TLS, konfigurasi `TRUST_PROXY=true` hanya jika proxy tersebut memang dipercaya dan dikontrol oleh deployment.

## Verifikasi

Static regression test:

```bash
npm run test:security
```

Hasil audit build ini:
- JavaScript syntax errors: 0
- Security hardening tests: 6/6 passed

Catatan: integration test PostgreSQL dan penetration test runtime tetap perlu dijalankan pada environment staging karena ZIP ini tidak menyertakan `node_modules` maupun database production.
