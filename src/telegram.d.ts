export {};

// Минимальные типы для того, что мы реально используем из Telegram WebApp SDK.
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        colorScheme: 'light' | 'dark';
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            username?: string;
          };
        };
        CloudStorage: {
          getItem: (key: string, cb: (err: any, value: string | null) => void) => void;
          setItem: (key: string, value: string, cb?: (err: any, ok: boolean) => void) => void;
          getItems: (keys: string[], cb: (err: any, values: Record<string, string>) => void) => void;
        };
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          setText: (text: string) => void;
        };
      };
    };
  }
}
