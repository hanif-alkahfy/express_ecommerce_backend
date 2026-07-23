const db = require('../models');
const logger = require('../config/logger');

async function testUserModel() {
  try {
    logger.info('Starting User model test...');

    await db.sequelize.authenticate();
    logger.info('Database connection established');

    logger.info('\n=== Test 1: Create new user with password ===');
    const testUser = await db.User.create({
      email: 'test@example.com',
      password_hash: 'TestPassword123!',
      name: 'Test User',
      role: 'customer',
      is_verified: false
    });
    logger.info('User created:', testUser.toJSON());

    logger.info('\n=== Test 2: Validate password (correct) ===');
    const isValid = await testUser.validatePassword('TestPassword123!');
    logger.info('Password validation result:', isValid);

    logger.info('\n=== Test 3: Validate password (incorrect) ===');
    const isInvalid = await testUser.validatePassword('WrongPassword');
    logger.info('Password validation result:', isInvalid);

    logger.info('\n=== Test 4: Generate auth tokens ===');
    const tokens = testUser.generateAuthTokens();
    logger.info('Access token generated:', tokens.accessToken.substring(0, 50) + '...');
    logger.info('Refresh token generated:', tokens.refreshToken.substring(0, 50) + '...');

    logger.info('\n=== Test 5: Find user by email ===');
    const foundUser = await db.User.findOne({ where: { email: 'test@example.com' } });
    logger.info('User found:', foundUser ? foundUser.email : 'Not found');

    logger.info('\n=== Test 6: Update user verification status ===');
    await foundUser.update({ is_verified: true });
    logger.info('User verification updated:', foundUser.is_verified);

    logger.info('\n=== Test 7: Create OAuth user (no password) ===');
    const oauthUser = await db.User.create({
      email: 'oauth@example.com',
      name: 'OAuth User',
      role: 'customer',
      is_verified: true,
      oauth_provider: 'google',
      oauth_id: '1234567890'
    });
    logger.info('OAuth user created:', oauthUser.toJSON());

    logger.info('\n=== Test 8: Find user by OAuth ===');
    const foundOAuthUser = await db.User.findOne({
      where: {
        oauth_provider: 'google',
        oauth_id: '1234567890'
      }
    });
    logger.info('OAuth user found:', foundOAuthUser ? foundOAuthUser.email : 'Not found');

    logger.info('\n=== Test 9: Update password ===');
    await testUser.update({ password_hash: 'NewPassword456!' });
    const newPasswordValid = await testUser.validatePassword('NewPassword456!');
    logger.info('New password validation:', newPasswordValid);

    logger.info('\n=== Test 10: Count users ===');
    const userCount = await db.User.count();
    logger.info('Total users:', userCount);

    logger.info('\n=== Cleanup: Delete test users ===');
    await db.User.destroy({ where: { email: 'test@example.com' } });
    await db.User.destroy({ where: { email: 'oauth@example.com' } });
    logger.info('Test users deleted');

    logger.info('\n=== All tests completed successfully! ===');

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('Test failed:', error);
    await db.sequelize.close();
    process.exit(1);
  }
}

testUserModel();
