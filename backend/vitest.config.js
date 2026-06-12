'use strict';
const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    env: {
      JWT_SECRET: 'test_jwt_secret_for_vitest_only',
      COOKIE_SECRET: 'test_cookie_secret_for_vitest_only',
    },
  },
});
