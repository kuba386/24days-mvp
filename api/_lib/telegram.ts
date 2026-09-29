import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from './env.js';

export type TelegramUser = { id: number; first_name?: string };

const INIT_DATA_MAX_AGE_SEC = 24 * 60 * 60;

// Проверка подписи initData по алгоритму из документации Mini Apps:
// secret = HMAC_SHA256("WebAppData", bot_token); hash = HMAC_SHA256(secret, data_check_string)
export function validateInitData(initData: string): TelegramUser | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = createHmac('sha256', 'WebAppData').update(env('TELEGRAM_BOT_TOKEN')).digest();
  const expected = createHmac('sha256', secret).update(dataCheckString).digest('hex');
  if (expected.length !== hash.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) return null;

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > INIT_DATA_MAX_AGE_SEC) return null;

  try {
    const user = JSON.parse(params.get('user') ?? 'null');
    return user && typeof user.id === 'number' ? { id: user.id, first_name: user.first_name } : null;
  } catch {
    return null;
  }
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const openAppKeyboard = (url: string) => ({
  inline_keyboard: [[{ text: 'Открыть 24 дня', web_app: { url } }]],
});

// Возвращает HTTP-статус ответа Telegram: 403 означает, что пользователь заблокировал бота
export async function sendMessage(chatId: number, text: string, replyMarkup?: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: replyMarkup }),
  });
  return res.status;
}
