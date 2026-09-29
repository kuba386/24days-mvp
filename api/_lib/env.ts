export function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

export const appUrl = () => process.env.APP_URL ?? 'https://24days-mvp.vercel.app';
