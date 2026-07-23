const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;

async function hashPassword(password) {
  if (!password) {
    throw new Error('Password is required');
  }
  if (typeof password !== 'string') {
    throw new Error('Password must be a string');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function comparePassword(password, hashedPassword) {
  if (!password || !hashedPassword) {
    return false;
  }
  return await bcrypt.compare(password, hashedPassword);
}

function getBcryptRounds() {
  return BCRYPT_ROUNDS;
}

module.exports = {
  hashPassword,
  comparePassword,
  getBcryptRounds,
  BCRYPT_ROUNDS
};
