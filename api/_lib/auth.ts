import { validateInitData, type TelegramUser } from './telegram.js';

// Mini App передаёт initData в заголовке: Authorization: tma <initData>
export function userFromRequest(req: Request): TelegramUser | null {
  const header = req.headers.get('authorization') ?? '';
  if (!header.startsWith('tma ')) return null;
  return validateInitData(header.slice(4));
}
