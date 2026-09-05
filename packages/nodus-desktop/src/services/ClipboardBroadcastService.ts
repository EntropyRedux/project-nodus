import { DeviceInfo } from '../types/desktop';

export class ClipboardBroadcastService {
  private static debounceTimer: any = null;
  private static lastBroadcastSignature = '';

  static queueBroadcast(
    text: string | null,
    imageData: string | undefined,
    trustedDevices: DeviceInfo[],
    token: string
  ) {
    const signature = `${text || ''}_${(imageData || '').substring(0, 40)}`;
    if (signature === this.lastBroadcastSignature) return;

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(async () => {
      this.lastBroadcastSignature = signature;

      const payload = JSON.stringify({
        text,
        image_data: imageData,
        timestamp: Date.now()
      });

      for (const dev of trustedDevices) {
        if (dev.status !== 'connected' || !dev.ipAddress) continue;
        const host = dev.ipAddress.includes(':') ? dev.ipAddress : `${dev.ipAddress}:9120`;

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000);
          await fetch(`http://${host}/api/clipboard`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Nodus-Auth-Token': token,
            },
            body: payload,
            signal: controller.signal
          });
          clearTimeout(timeout);
        } catch {
          // Gracefully ignore offline node without halting queue
        }
      }
    }, 400);
  }
}
