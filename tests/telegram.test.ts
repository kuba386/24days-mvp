import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { escapeHtml, validateInitData } from '../api/_lib/telegram';

const TOKEN = '123456:test-token';

function sign(fields: Record<string, string>, token = TOKEN) {
  const params = new URLSearchParams(fields);
  const dcs = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  params.set('hash', createHmac('sha256', secret).update(dcs).digest('hex'));
  return params.toString();
}

const now = () => String(Math.floor(Date.now() / 1000));
const user = JSON.stringify({ id: 42, first_name: 'Аня' });

beforeEach(() => vi.stubEnv('TELEGRAM_BOT_TOKEN', TOKEN));
afterEach(() => vi.unstubAllEnvs());

describe('validateInitData', () => {
  it('принимает корректную подпись и возвращает пользователя', () => {
    expect(validateInitData(sign({ auth_date: now(), user }))).toEqual({ id: 42, first_name: 'Аня' });
  });
  it('отклоняет подделанные данные', () => {
    const tampered = sign({ auth_date: now(), user }).replace('42', '43');
    expect(validateInitData(tampered)).toBeNull();
  });
  it('отклоняет подпись чужим токеном', () => {
    expect(validateInitData(sign({ auth_date: now(), user }, '999:other'))).toBeNull();
  });
  it('отклоняет данные старше суток', () => {
    const old = String(Math.floor(Date.now() / 1000) - 25 * 60 * 60);
    expect(validateInitData(sign({ auth_date: old, user }))).toBeNull();
  });
  it('отклоняет без hash и без пользователя', () => {
    expect(validateInitData(`auth_date=${now()}&user=${encodeURIComponent(user)}`)).toBeNull();
    expect(validateInitData(sign({ auth_date: now() }))).toBeNull();
  });
});

describe('escapeHtml', () => {
  it('экранирует разметку для parse_mode HTML', () => {
    expect(escapeHtml('<b>a & b</b>')).toBe('&lt;b&gt;a &amp; b&lt;/b&gt;');
  });
});
