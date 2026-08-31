import React, { useState } from 'react';
import { X, Sparkles, Terminal, Code, Gamepad2, Globe, FileCode, Check, RefreshCw } from 'lucide-react';
import { RemoteExecutable, DeviceInfo } from '../../types/launcher';
import { getSystemTheme, getAccentColor } from '../../utils/themes';
import { useLauncher } from '../../context/LauncherContext';
import { fetchRemoteShortcutIcon } from '../../services/RemoteShortcutsService';
import { audio } from '../../utils/audio';
import { ThemedSelect } from '../common/ThemedSelect';

interface AddRemoteShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDevice: DeviceInfo;
}

const PRESETS = [
  { name: 'VS Code', cmd: 'code .', icon: 'Code', color: '#007ACC', category: 'tools' as const },
  { name: 'Windows Terminal', cmd: 'wt', icon: 'Terminal', color: '#4EC9B0', category: 'tools' as const },
  { name: 'Steam', cmd: 'steam://open/main', icon: 'Gamepad2', color: '#171A21', category: 'games' as const },
  { name: 'Task Manager', cmd: 'taskmgr.exe', icon: 'Activity', color: '#34C759', category: 'system' as const },
  { name: 'Lock Workstation', cmd: 'rundll32.exe user32.dll,LockWorkStation', icon: 'Lock', color: '#F43F5E', category: 'system' as const },
  { name: 'File Explorer', cmd: 'explorer.exe', icon: 'Folder', color: '#F59E0B', category: 'productivity' as const },
];

export const AddRemoteShortcutModal: React.FC<AddRemoteShortcutModalProps> = ({
  isOpen,
  onClose,
  targetDevice,
}) => {
  const { settings, updateSettings, showToast } = useLauncher();
  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  const [name, setName] = useState('');
  const [cmd, setCmd] = useState('');
  const [args, setArgs] = useState('');
  const [category, setCategory] = useState<'tools' | 'productivity' | 'games' | 'media' | 'system' | 'custom'>('tools');
  const [iconName, setIconName] = useState('Terminal');
  const [iconColor, setIconColor] = useState(currentAccent.hex);
  const [iconBase64, setIconBase64] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    audio.playTap();
    setName(preset.name);
    setCmd(preset.cmd);
    setIconName(preset.icon);
    setIconColor(preset.color);
    setCategory(preset.category);
    setIconBase64(null);
  };

  const handleExtractIcon = async () => {
    if (!cmd.trim()) {
      showToast('Enter a command or path first');
      return;
    }
    audio.playTap();
    setIsExtracting(true);
    const extracted = await fetchRemoteShortcutIcon(targetDevice.ipAddress || '127.0.0.1', cmd.trim());
    setIsExtracting(false);

    if (extracted) {
      setIconBase64(extracted);
      showToast('Extracted native icon from Windows');
    } else {
      showToast('Could not extract native icon — using themed icon');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cmd.trim()) {
      showToast('Name and command are required');
      return;
    }

    audio.playTap();

    const newExec: RemoteExecutable = {
      id: `exec-${Date.now()}`,
      deviceId: targetDevice.id,
      deviceName: targetDevice.name,
      deviceType: targetDevice.type,
      deviceOs: (targetDevice.os.toLowerCase().includes('windows') ? 'windows' : 'linux'),
      name: name.trim(),
      commandOrPackage: cmd.trim(),
      args: args.trim() || undefined,
      category,
      iconName,
      iconColor,
      iconBase64: iconBase64 || undefined,
      execType: cmd.startsWith('http://') || cmd.startsWith('https://') || cmd.includes('://') ? 'url_protocol' : 'command',
      enabled: true,
      pinnedToDrawer: true,
    };

    const currentList = settings.remoteExecutables || [];
    updateSettings({
      remoteExecutables: [newExec, ...currentList],
    });

    showToast(`Added ${name} to ${targetDevice.name}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div 
        className={`w-full max-w-lg ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} border border-white/10 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: `${currentAccent.hex}25`, color: currentAccent.hex }}
            >
              +
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Add Shortcut to {targetDevice.name}</h2>
              <p className="text-[11px] text-[#94A3B8]">Configures a remote executable on this PC node</p>
            </div>
          </div>
          <button 
            onClick={() => {
              audio.playTap();
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-[#94A3B8] hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase text-[#94A3B8] tracking-wider">Quick Presets</label>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="p-2 rounded-lg bg-black/30 hover:bg-white/10 border border-white/5 text-left transition group text-xs"
              >
                <div className="font-semibold text-white group-hover:text-[#38BDF8] truncate">{p.name}</div>
                <div className="text-[9px] font-mono text-[#64748B] truncate">{p.cmd}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-white block mb-1">Shortcut Name</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Visual Studio Code"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-[#64748B] text-xs focus:outline-none focus:border-[#38BDF8]"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-white">Command, Executable Path, or URI</label>
              <button
                type="button"
                onClick={handleExtractIcon}
                disabled={isExtracting}
                className="text-[10px] font-mono flex items-center gap-1 text-[#38BDF8] hover:underline disabled:opacity-50"
              >
                <Sparkles size={11} />
                {isExtracting ? 'Extracting...' : 'Auto-Extract Icon'}
              </button>
            </div>
            <input 
              type="text"
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              placeholder="e.g. code . or wt or steam://run/730"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-[#64748B] text-xs font-mono focus:outline-none focus:border-[#38BDF8]"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white block mb-1">Arguments (Optional)</label>
            <input 
              type="text"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="e.g. -p PowerShell -d C:\Projects"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-[#64748B] text-xs font-mono focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-white block mb-1">Category</label>
              <ThemedSelect
                value={category}
                onChange={(val: any) => setCategory(val)}
                options={[
                  { value: 'tools', label: 'Tools' },
                  { value: 'productivity', label: 'Productivity' },
                  { value: 'games', label: 'Games' },
                  { value: 'media', label: 'Media' },
                  { value: 'system', label: 'System' },
                  { value: 'custom', label: 'Custom' },
                ]}
                className="w-full"
              />
            </div>

            {/* Icon Preview */}
            <div>
              <label className="text-xs font-semibold text-white block mb-1">Icon Preview</label>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-black/30 border border-white/5">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-white/10"
                  style={{ backgroundColor: iconColor }}
                >
                  {iconBase64 ? (
                    <img src={iconBase64} alt="icon" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs font-bold text-black">{name.charAt(0) || 'P'}</span>
                  )}
                </div>
                <div className="text-[10px] text-[#94A3B8] truncate">
                  {iconBase64 ? 'Extracted PNG' : 'Themed Tile'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-[#94A3B8] hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-lg active:scale-95"
              style={{ backgroundColor: currentAccent.hex, color: '#090B10' }}
            >
              <Check size={14} />
              <span>Add Shortcut</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
