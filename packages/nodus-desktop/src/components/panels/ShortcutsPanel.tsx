import React, { useState } from 'react';
import { useDesktop } from '../../context/DesktopContext';
import { RemoteExecutable } from '../../types/desktop';
import { 
  Zap, 
  Plus, 
  Terminal, 
  Code, 
  Gamepad2, 
  Camera, 
  Play, 
  Trash2, 
  Check, 
  X, 
  ExternalLink,
  ShieldAlert,
  Edit2,
  FolderOpen
} from 'lucide-react';

const CATEGORIES = ['all', 'productivity', 'tools', 'games', 'system'] as const;

export const ShortcutsPanel: React.FC = () => {
  const { 
    remoteExecutables, 
    addRemoteExecutable, 
    deleteRemoteExecutable, 
    executeShortcut 
  } = useDesktop();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RemoteExecutable['category']>('productivity');
  const [commandOrPackage, setCommandOrPackage] = useState('');
  const [workingDir, setWorkingDir] = useState('C:\\Workspaces');
  const [iconName, setIconName] = useState('Code');
  const [iconColor, setIconColor] = useState('#007ACC');
  const [runAsAdmin, setRunAsAdmin] = useState(false);

  const getShortcutIcon = (icon: string) => {
    switch (icon) {
      case 'Code': return <Code size={18} />;
      case 'Terminal': return <Terminal size={18} />;
      case 'Gamepad2': return <Gamepad2 size={18} />;
      case 'Camera': return <Camera size={18} />;
      default: return <Play size={18} />;
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !commandOrPackage.trim()) return;

    addRemoteExecutable({
      deviceId: 'this-pc',
      deviceName: 'This PC',
      deviceType: 'desktop',
      deviceOs: 'windows',
      name,
      description,
      category,
      iconName,
      iconColor,
      execType: 'command',
      commandOrPackage,
      workingDir,
      runAsAdmin,
      enabled: true,
      pinnedToDrawer: true,
      lastExecuted: 'Never',
    });

    setName('');
    setDescription('');
    setCommandOrPackage('');
    setShowAddModal(false);
  };

  const filteredShortcuts = remoteExecutables.filter(
    (item) => selectedCategory === 'all' || item.category === selectedCategory
  );

  return (
    <div className="w-full h-full flex flex-col gap-5 overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap size={20} className="text-[#BF5AF2]" />
            <span>Remote Shortcuts & Quick Actions Studio</span>
          </h2>
          <p className="text-xs text-[#8E8E93]">
            Manage launchable apps, commands, and scripts callable from the POCO Pad tablet or PC.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-[#BF5AF2] hover:bg-[#AF52DE] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#BF5AF2]/25 transition active:scale-95"
        >
          <Plus size={14} />
          <span>Add Shortcut</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 shrink-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              selectedCategory === cat
                ? 'bg-white/15 text-white border border-white/20'
                : 'bg-white/5 text-[#8E8E93] hover:text-white border border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Shortcuts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShortcuts.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-3xl bg-[#121218] border border-white/10 hover:border-white/20 flex flex-col justify-between gap-3 shadow-xl group transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md"
                  style={{ backgroundColor: item.iconColor }}
                >
                  {getShortcutIcon(item.iconName)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">{item.name}</h3>
                  <span className="text-[10px] text-[#8E8E93] uppercase font-mono">{item.category}</span>
                </div>
              </div>

              <button
                onClick={() => deleteRemoteExecutable(item.id)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-[#FF3B30]/20 text-[#8E8E93] hover:text-[#FF3B30] flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                title="Delete Action"
              >
                <Trash2 size={13} />
              </button>
            </div>

            <p className="text-xs text-[#8E8E93] line-clamp-2 leading-relaxed">
              {item.description || item.commandOrPackage}
            </p>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10.5px] font-mono text-[#8E8E93]">
                Ran: <span className="text-white">{item.lastExecuted || 'Never'}</span>
              </span>

              <button
                onClick={() => executeShortcut(item)}
                className="px-3 py-1 rounded-xl bg-white/10 hover:bg-[#34C759] text-white hover:text-black text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
              >
                <Play size={12} />
                <span>Run</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Add Shortcut Modal ────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121218] border border-white/20 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Create Remote Action</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#8E8E93] uppercase block mb-1">
                  Action Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Build Project Nodus"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-[#BF5AF2]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#8E8E93] uppercase block mb-1">
                  Command or Program
                </label>
                <input
                  type="text"
                  placeholder="e.g. code . or wt.exe or npm run dev"
                  value={commandOrPackage}
                  onChange={(e) => setCommandOrPackage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white outline-none focus:border-[#BF5AF2]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#8E8E93] uppercase block mb-1">
                    Working Directory
                  </label>
                  <input
                    type="text"
                    value={workingDir}
                    onChange={(e) => setWorkingDir(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white outline-none focus:border-[#BF5AF2]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#8E8E93] uppercase block mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#181822] border border-white/10 text-xs text-white outline-none focus:border-[#BF5AF2]"
                  >
                    <option value="productivity">Productivity</option>
                    <option value="tools">Tools</option>
                    <option value="games">Games</option>
                    <option value="system">System</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#8E8E93] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#BF5AF2] hover:bg-[#AF52DE] text-white text-xs font-bold shadow-lg shadow-[#BF5AF2]/25"
                >
                  Save Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
