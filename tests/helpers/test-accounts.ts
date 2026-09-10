/**
 * Test account credentials are read from the environment, never committed —
 * a public repo previously had the salesperson/approver demo passwords
 * hardcoded directly in test source. Set these in `.env.local` (see
 * `.env.example`); tests that need them already skip gracefully when
 * Supabase credentials are absent, and will do the same here.
 */
function requireTestEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} — set it in .env.local (see .env.example) to run this test.`);
  }
  return value;
}

export function salesTestAccount() {
  return {
    email: requireTestEnv("TEST_SALES_EMAIL"),
    password: requireTestEnv("TEST_SALES_PASSWORD"),
  };
}

export function approverTestAccount() {
  return {
    email: requireTestEnv("TEST_APPROVER_EMAIL"),
    password: requireTestEnv("TEST_APPROVER_PASSWORD"),
  };
}

export function hasTestAccountCredentials(): boolean {
  return Boolean(
    process.env.TEST_SALES_EMAIL &&
      process.env.TEST_SALES_PASSWORD &&
      process.env.TEST_APPROVER_EMAIL &&
      process.env.TEST_APPROVER_PASSWORD
  );
}
