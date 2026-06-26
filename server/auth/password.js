import bcrypt from 'bcryptjs';

// bcryptjs (pure JS) is used instead of native bcrypt so the image builds on
// Alpine without compilation toolchains. 10 rounds is a sane default.
const ROUNDS = 10;

export const hashPassword = (plain) => bcrypt.hash(plain, ROUNDS);

export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);
