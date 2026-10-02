import { useEffect, useRef } from 'react';

// Дополнительный экран получает свою запись в истории: системная «Назад» и свайп возвращают
// на предыдущий экран, а не закрывают всё приложение. Кнопка «Назад» Telegram работает так же.
export function useBackNav(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    history.pushState({ screen: true }, '');
    const onPop = () => closeRef.current();
    window.addEventListener('popstate', onPop);

    const webApp = window.Telegram?.WebApp;
    const button = webApp?.isVersionAtLeast?.('6.1') ? webApp.BackButton : undefined;
    const onTelegramBack = () => history.back();
    button?.onClick(onTelegramBack);
    button?.show();

    return () => {
      window.removeEventListener('popstate', onPop);
      button?.offClick(onTelegramBack);
      button?.hide();
      // Экран закрыт кнопкой в самом приложении: убираем свою запись из истории
      if (history.state?.screen) history.back();
    };
  }, [open]);
}
