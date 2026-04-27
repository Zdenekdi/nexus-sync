/**
 * Nexus Hub Test Helpers
 * Shared utilities for testing against the live production API.
 */

import axios from 'axios';

export const API_BASE = process.env.NEXUS_API_URL || 'https://nexus-api.myvnc.com/api';
export const DEVICE_SECRET = process.env.NEXUS_DEVICE_SECRET || '0321f04b30c9fd5dd501bc6b5b9247867ddd7b26d265faca48a79dd5271e6929';

/**
 * Test user credentials (seeded in production DB).
 * NOTE: appOwner has a real password different from the seed default.
 * alice@nexus.sync is seeded as 'Senior Operator', not 'Manager'.
 */
export const TEST_USERS = {
  appOwner:    { email: process.env.TEST_OWNER_EMAIL || 'dias.zd@gmail.com',  password: process.env.TEST_OWNER_PASSWORD || 'Nexus2024!',   roleName: 'App Owner'       },
  agencyAdmin: { email: 'mark@nexus.sync',    password: 'password123',  roleName: 'Agency Admin'    },
  manager:     { email: 'alice@nexus.sync',   password: 'password123',  roleName: 'Senior Operator' },
  model:       { email: 'diana@nexus.sync',   password: 'password123',  roleName: 'Model'           },
};

/**
 * Login a user and return { token, user }.
 * Returns null on failure instead of throwing — lets beforeAll skip gracefully.
 */
export async function loginAs(credentials) {
  try {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: credentials.email,
      password: credentials.password,
    }, { validateStatus: () => true });

    if (res.status !== 200 || !res.data.token) {
      console.error(`[auth] Login FAILED for ${credentials.email}: HTTP ${res.status} – ${res.data?.message}`);
      return null;
    }
    return { token: res.data.token, user: res.data.user };
  } catch (err) {
    console.error(`[auth] Login ERROR for ${credentials.email}: ${err.message}`);
    return null;
  }
}

/**
 * Create an authorized axios instance for a given token.
 */
export function authClient(token) {
  return axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true,
  });
}

/**
 * Unauthenticated axios client (for testing 401 responses).
 */
export const anonClient = axios.create({
  baseURL: API_BASE,
  validateStatus: () => true,
});
