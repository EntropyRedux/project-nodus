import { useClipboardStore } from '../stores/useClipboardStore';
import { useFleetStore } from '../stores/useFleetStore';
import { TauriService } from './TauriCommands';
import { ClipboardBroadcastService } from './ClipboardBroadcastService';

export class DaemonManager {
  private static clipboardInterval: any = null;
  private static fleetInterval: any = null;
  private static lastClipSignature = '';

  static start(token: string) {
    if (this.clipboardInterval) return;

    // Headless clipboard polling
    this.clipboardInterval = setInterval(async () => {
      try {
        const content = await TauriService.getClipboardContent();
        if (content.text || content.image_data) {
          const sig = content.image_data
            ? `img_${content.image_data.length}_${content.image_data.slice(20, 60)}_${content.image_data.slice(-40)}`
            : `txt_${content.text?.trim() || ''}`;

          if (sig !== this.lastClipSignature) {
            this.lastClipSignature = sig;
            const clipText = content.text || (content.image_data ? 'Image' : '');
            useClipboardStore.getState().pushClip(clipText, 'this-pc', content.image_data);

            const devices = useFleetStore.getState().devices;
            ClipboardBroadcastService.queueBroadcast(content.text || null, content.image_data, devices, token);
          }
        }
      } catch {}
    }, 1200);

    // Headless fleet peer polling
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
  }
}
