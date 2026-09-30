// Telegram CloudStorage с запасным localStorage: вне Telegram и в старых клиентах SDK
// синхронно бросает WebAppMethodUnsupported, тогда до конца сессии пишем локально
let cloudOk = true;

const cloud = () => window.Telegram?.WebApp?.CloudStorage;

type Values = Record<string, string | null | undefined>;

export function loadKeys(keys: string[], cb: (values: Values) => void) {
  const local = () => cb(Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])));
  const storage = cloud();
  if (!storage || !cloudOk) {
    cloudOk = false;
    return local();
  }
  try {
    storage.getItems(keys, (err, values) => cb(err ? {} : values));
  } catch {
    cloudOk = false;
    local();
  }
}

export function saveKey(key: string, value: string) {
  const storage = cloud();
  if (storage && cloudOk) {
    try {
      storage.setItem(key, value);
      return;
    } catch {
      cloudOk = false;
    }
  }
  localStorage.setItem(key, value);
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
