import dbPool from '../../../database/pool.js';
import crypto from 'crypto';

const deviceBindingValidationRepository = {
  /**
   * Mengambil semua perangkat terikat berdasarkan ID Pengguna.
   */
  findDevicesByUserId: async (userId) => {
    const sqlText = `
      SELECT
        id,
        user_id,
        device_fingerprint,
        is_verified
      FROM users_devices
      WHERE user_id = $1;
    `;

    try {
      const result = await dbPool.query(sqlText, [userId]);
      return result.rows;
    } catch (error) {
      console.error('🚨 [BINDING REP ERROR - FETCH]:', error.message);
      throw error;
    }
  },

  /**
   * Mendaftarkan stasiun kerja utama sebagai perangkat terverifikasi.
   */
  registerPrimaryDevice: async (userId, fingerprint, userRole = 'USER') => {
    const dynamicName = `Stasiun Kerja (${String(userRole).toUpperCase()})`;

    const insertSql = `
      INSERT INTO users_devices (
        user_id,
        device_fingerprint,
        device_name,
        is_verified
      )
      VALUES ($1, $2, $3, true)
      RETURNING id;
    `;

    try {
      const result = await dbPool.query(insertSql, [
        userId,
        fingerprint,
        dynamicName
      ]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('🚨 [BINDING REP ERROR - INSERT PRIMARY]:', error.message);
      throw error;
    }
  },

  /**
   * Mendaftarkan perangkat baru sebagai pending.
   *
   * Legacy path tetap dipertahankan, tetapi OTP tidak lagi disimpan
   * sebagai plaintext. Database hanya menerima SHA-256 dan masa berlaku.
   */
  registerPendingDevice: async (userId, fingerprint, generatedCode) => {
    const cleanCode = String(generatedCode || '').trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      throw new Error('Kode aktivasi internal harus terdiri dari 6 digit angka.');
    }

    const activationCodeHash = crypto
      .createHash('sha256')
      .update(cleanCode)
      .digest('hex');

    const insertNewSql = `
      INSERT INTO users_devices (
        user_id,
        device_fingerprint,
        device_name,
        is_verified,
        activation_code_hash,
        activation_expires_at
      )
      VALUES (
        $1,
        $2,
        'Perangkat Baru (Pending)',
        false,
        $3,
        NOW() + INTERVAL '15 minutes'
      )
      RETURNING id;
    `;

    try {
      const result = await dbPool.query(insertNewSql, [
        userId,
        fingerprint,
        activationCodeHash
      ]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('🚨 [BINDING REP ERROR - INSERT PENDING]:', error.message);
      throw error;
    }
  }
};

export default deviceBindingValidationRepository;
