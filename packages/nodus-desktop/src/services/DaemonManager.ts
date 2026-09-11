import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useClipboardStore } from '../stores/useClipboardStore';
import { useFleetStore } from '../stores/useFleetStore';
import { TauriService } from './TauriCommands';
import { ClipboardBroadcastService } from './ClipboardBroadcastService';

export class DaemonManager {
  private static clipboardInterval: any = null;
  private static fleetInterval: any = null;
  private static lastClipSignature = '';
  private static unlistenClipboard: UnlistenFn | null = null;
  private static unlistenFleet: UnlistenFn | null = null;

  static async start(token: string) {
    if (this.clipboardInterval) return;

    // 1. Reactive listener for remote clipboard clips incoming via HTTP bridge
    try {
      this.unlistenClipboard = await listen<any>('clipboard_updated', (event) => {
        const payload = event.payload;
        if (!payload || !useClipboardStore.getState().isSyncEnabled) return;

        const sig = payload.imageData
          ? `img_${payload.imageData.length}_${payload.imageData.slice(20, 60)}_${payload.imageData.slice(-40)}`
          : `txt_${(payload.text || '').trim()}`;

        // Record signature so the local polling interval won't re-broadcast it
        this.lastClipSignature = sig;
        ClipboardBroadcastService.setLastSignature(sig);

        const clipText = payload.text || (payload.imageData ? 'Image' : '');
        useClipboardStore.getState().pushClip(
          clipText,
          payload.sourceDevice || 'poco-pad',
          payload.imageData,
          payload.deviceName || 'POCO Pad'
        );
      });
    } catch (e) {
      console.warn('[DaemonManager] Failed to attach clipboard_updated listener:', e);
    }

    // 2. Reactive listener for fleet topology/pairing changes
    try {
      this.unlistenFleet = await listen('fleet_devices_updated', async () => {
        try {
          const discovered = await TauriService.getDiscoveredDevices();
          if (discovered && discovered.length > 0) {
            useFleetStore.getState().setDiscoveredNodes(discovered);
          }
        } catch (_) {}
      });
    } catch (e) {
      console.warn('[DaemonManager] Failed to attach fleet_devices_updated listener:', e);
    }

    // 3. Headless local clipboard polling (detects copies in other Windows apps)
    this.clipboardInterval = setInterval(async () => {
      try {
        if (!useClipboardStore.getState().isSyncEnabled) return;
        const content = await TauriService.getClipboardContent();
        if (content.text || content.image_data) {
          const sig = content.image_data
            ? `img_${content.image_data.length}_${content.image_data.slice(20, 60)}_${content.image_data.slice(-40)}`
            : `txt_${content.text?.trim() || ''}`;

          if (sig !== this.lastClipSignature) {
            this.lastClipSignature = sig;
            const clipText = content.text || (content.image_data ? 'Image' : '');
            useClipboardStore.getState().pushClip(clipText, 'this-pc', content.image_data, 'This PC');

            const devices = useFleetStore.getState().devices;
            ClipboardBroadcastService.queueBroadcast(content.text || null, content.image_data, devices, token);
          }
        }
      } catch {}
    }, 1200);

    // 4. Headless fleet peer polling
    this.fleetInterval = setInterval(async () => {
      try {
        const discovered = await TauriService.getDiscoveredDevices();
        if (discovered && discovered.length > 0) {
          useFleetStore.getState().setDiscoveredNodes(discovered);
        }
      } catch {}
    }, 2500);
  }

  static stop() {
    if (this.clipboardInterval) clearInterval(this.clipboardInterval);
    if (this.fleetInterval) clearInterval(this.fleetInterval);
    this.clipboardInterval = null;
    this.fleetInterval = null;

    if (this.unlistenClipboard) {
      this.unlistenClipboard();
      this.unlistenClipboard = null;
    }
    if (this.unlistenFleet) {
      this.unlistenFleet();
      this.unlistenFleet = null;
    }
  }
}

