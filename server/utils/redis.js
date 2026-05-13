import { createClient } from 'redis';

// Simplified Redis wrapper for HudumaLynk
export const redis = {
  get: async (key) => null,
  set: async (key, val) => {},
  setEx: async (key, seconds, val) => {},
  del: async (key) => {},
};

export const redisKeys = {
  refreshToken: (userId) => `refresh_token:${userId}`,
  mpesaToken: 'mpesa:global_token',
};
