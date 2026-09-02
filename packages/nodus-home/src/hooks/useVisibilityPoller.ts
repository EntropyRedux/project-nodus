import { useEffect } from 'react';

/**
 * Custom React hook that runs a callback on a specified interval only when the document is visible & focused.
 * Pauses execution when the app is backgrounded or window loses focus to preserve battery and CPU.
 */
export function useVisibilityPoller(
  callback: () => void,
  intervalMs: number,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;
    let timer: NodeJS.Timeout | null = null;

    const isActive = () =>
      document.visibilityState === 'visible' && (typeof document.hasFocus !== 'function' || document.hasFocus());

    const runPoller = () => {
      if (isActive()) {
        callback();
      }
    };

    runPoller();
    timer = setInterval(runPoller, intervalMs);

    const handleActiveStateChange = () => {
      if (isActive()) {
        callback();
      }
    };

    document.addEventListener('visibilitychange', handleActiveStateChange);
    window.addEventListener('focus', handleActiveStateChange);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', handleActiveStateChange);
      window.removeEventListener('focus', handleActiveStateChange);
    };
  }, [callback, intervalMs, enabled]);
}
