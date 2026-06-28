import bcrypt from 'bcryptjs';

// bcryptjs (pure JS) is used instead of native bcrypt so the image builds on
// Alpine without compilation toolchains. 10 rounds is a sane default.
const ROUNDS = 10;

export const hashPassword = (plain) => bcrypt.hash(plain, ROUNDS);

export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

// A real bcrypt hash to compare against when an email isn't found, so signin
// spends the same time whether or not the account exists (avoids a timing
// oracle that would reveal which emails are registered).
export const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', ROUNDS);

// bcrypt truncates silently at 72 bytes; reject longer inputs rather than
// surprise the user with truncation semantics.
export const MAX_PASSWORD_BYTES = 72;
