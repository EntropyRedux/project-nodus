import { DeviceInfo } from '../types/desktop';
import { useClipboardStore } from '../stores/useClipboardStore';
import { useFleetStore } from '../stores/useFleetStore';
import { TauriService } from './TauriCommands';

export class ClipboardBroadcastService {
  private static debounceTimer: any = null;
  private static lastBroadcastSignature = '';

  static setLastSignature(sig: string) {
    this.lastBroadcastSignature = sig;
  }

  static queueBroadcast(
    text: string | null,
    imageData: string | undefined,
    trustedDevices: DeviceInfo[],
    token: string
  ) {
    if (!useClipboardStore.getState().isSyncEnabled) {
      return;
    }

    const signature = imageData
      ? `img_${imageData.length}_${imageData.slice(20, 60)}_${imageData.slice(-40)}`
      : `txt_${(text || '').trim()}`;
    if (signature === this.lastBroadcastSignature) return;

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(async () => {
      if (!useClipboardStore.getState().isSyncEnabled) return;
      this.lastBroadcastSignature = signature;

      const authToken = token || 'NODUS-FLEET-SECURE';
      const targetIps = new Set<string>();

      const addTarget = (rawIp: string | undefined) => {
        if (!rawIp) return;
        const clean = rawIp.split(':')[0].trim();
        if (clean && clean !== '127.0.0.1' && clean !== 'localhost' && clean !== '0.0.0.0') {
          targetIps.add(clean);
        }
      };

      for (const dev of trustedDevices || []) {
        if (!dev.isLocal && dev.id !== 'this-pc' && dev.id !== 'local') {
          addTarget(dev.ipAddress || (dev as any).ip);
        }
      }

      try {
        const storeDevices = useFleetStore.getState().devices;
        for (const dev of storeDevices) {
          if (!dev.isLocal && dev.id !== 'this-pc' && dev.id !== 'local') {
            addTarget(dev.ipAddress || (dev as any).ip);
          }
        }

        const scanned = useFleetStore.getState().scannedPeers;
        for (const peer of scanned) {
          if (peer.hasAgent || peer.isTrusted || peer.isInFleet) {
            addTarget(peer.ip);
          }
        }

        const trustedMap = useFleetStore.getState().trustedDevices;
        for (const ip of Object.keys(trustedMap)) {
          if (trustedMap[ip]?.trusted) {
            addTarget(ip);
          }
        }
      } catch (_) {}

      try {
        const savedPeers = localStorage.getItem('nodus_fleet_paired_devices');
        if (savedPeers) {
          const parsed = JSON.parse(savedPeers);
          if (Array.isArray(parsed)) {
            for (const p of parsed) {
              addTarget(p.ipAddress || p.ip);
            }
          }
        }
      } catch (_) {}

      const ipList = Array.from(targetIps);

      // 1. Native Rust TCP broadcast (bypasses browser sandbox/CORS/CSP completely & auto-merges discovered LAN nodes)
      if (TauriService.isTauri()) {
        try {
          await TauriService.broadcastClipboard(text, imageData, ipList, authToken);
        } catch (_) {}
        return;
      }

      if (ipList.length === 0) return;

      // 2. Browser fetch fallback for non-Tauri / web preview environments
      const payload = JSON.stringify({
        text,
        imageData: imageData,
        image_data: imageData,
        sourceDevice: 'this-pc',
        deviceName: 'Workstation Host',
        timestamp: Date.now(),
      });

      for (const ip of ipList) {
        const host = `${ip}:9120`;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000);
          await fetch(`http://${host}/api/clipboard`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Nodus-Auth-Token': authToken,
              'Authorization': `Bearer ${authToken}`,
            },
            body: payload,
            signal: controller.signal,
          });
          clearTimeout(timeout);
        } catch {
          // Gracefully ignore unreachable node
        }
      }
    }, 250);
  }
}

