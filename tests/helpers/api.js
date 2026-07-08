/**
 * Nexus Hub Test Helpers
 * Shared utilities for testing against the live production API.
 */

import axios from 'axios';

const DEFAULT_API_BASE = process.env.CI
  ? 'https://nexus-api.myvnc.com/api'
  : 'http://localhost:3000/api';

export const API_BASE = process.env.NEXUS_API_URL || DEFAULT_API_BASE;
export const DEVICE_SECRET = process.env.NEXUS_DEVICE_SECRET || (process.env.CI ? '' : 'devicesecret12345');
export const HAS_DEVICE_SECRET = Boolean(DEVICE_SECRET);

/**
 * Test user credentials (seeded in production DB).
 * NOTE: appOwner has a real password different from the seed default.
 * alice@nexus.sync is seeded as 'Senior Operator', not 'Manager'.
 */
export const TEST_USERS = {
  appOwner:    { email: process.env.TEST_OWNER_EMAIL || 'owner@nexus.sync',  password: process.env.TEST_OWNER_PASSWORD || 'Nexus2024!',   roleName: 'App Owner'       },
  agencyAdmin: { email: 'mark@nexus.sync',    password: 'password123',  roleName: 'Agency Admin'    },
  manager:     { email: 'jan@nexus.sync',     password: 'password123',  roleName: 'Manager'         },
  seniorOp:    { email: 'alice@nexus.sync',   password: 'password123',  roleName: 'Senior Operator' },
  operator:    { email: 'sarah@nexus.sync',   password: 'password123',  roleName: 'Operator'        },
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
