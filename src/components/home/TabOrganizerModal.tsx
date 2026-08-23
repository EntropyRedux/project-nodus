import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Search, 
  FolderCheck, 
  Layers, 
  Tag, 
  CheckSquare, 
  Square,
  Sparkles
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { DynamicIcon } from '../common/DynamicIcon';
import { audio } from '../../utils/audio';

interface TabOrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TabOrganizerModal: React.FC<TabOrganizerModalProps> = ({ isOpen, onClose }) => {
  const { 
    apps, 
    drawerTabs, 
    customTabAppMap, 
    addDrawerTab, 
    removeDrawerTab, 
    renameDrawerTab, 
    assignAppsToTab, 
    setAppCategory,
    showToast 
  } = useLauncher();

  const [selectedTab, setSelectedTab] = useState<string>('productivity');
  const [newTabName, setNewTabName] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [editingTabName, setEditingTabName] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');
  const [appSearch, setAppSearch] = useState<string>('');

  const builtInTabs = useMemo(() => ['all', 'recents', 'running'], []);
  const defaultCategories = useMemo(() => ['productivity', 'media', 'tools', 'system'], []);

  // Selected tab assigned app IDs
  const assignedAppIds = useMemo(() => {
    if (customTabAppMap[selectedTab]) {
      return customTabAppMap[selectedTab];
    }
    // Fallback: apps with category === selectedTab
    return apps.filter((a) => a.category.toLowerCase() === selectedTab).map((a) => a.id);
  }, [selectedTab, customTabAppMap, apps]);

  // Filtered app list based on search
  const filteredApps = useMemo(() => {
    const q = appSearch.toLowerCase().trim();
    if (!q) return apps;
    return apps.filter((a) => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
  }, [apps, appSearch]);

  if (!isOpen) return null;

  const handleToggleApp = (appId: string) => {
    audio.playTap();
    let nextIds: string[];
    if (assignedAppIds.includes(appId)) {
      nextIds = assignedAppIds.filter((id) => id !== appId);
    } else {
      nextIds = [...assignedAppIds, appId];
    }
    assignAppsToTab(selectedTab, nextIds);
    // Also update app's primary category if it's not a special tab
    if (!builtInTabs.includes(selectedTab)) {
      setAppCategory(appId, selectedTab);
    }
  };

  const handleCreateTab = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTabName.trim().toLowerCase();
    if (!clean) return;
    if (drawerTabs.includes(clean)) {
      showToast(`Tab "${clean}" already exists`);
      return;
    }
    addDrawerTab(clean);
    setSelectedTab(clean);
    setNewTabName('');
    setIsCreatingNew(false);
  };

  const handleRenameSubmit = (oldTab: string) => {
    const clean = renameInput.trim().toLowerCase();
    if (!clean || clean === oldTab) {
      setEditingTabName(null);
      return;
    }
    renameDrawerTab(oldTab, clean);
    if (selectedTab === oldTab) {
      setSelectedTab(clean);
    }
    setEditingTabName(null);
  };

  const isSystemTab = (tab: string) => builtInTabs.includes(tab);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#13131A]/95 border border-white/15 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.9)] flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/30">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F0F0F2] flex items-center gap-2">
                <span>Tab & Category Organizer</span>
                <span className="text-[10px] text-[#34C759] bg-[#34C759]/15 px-2 py-0.5 rounded-full font-mono">
                  {drawerTabs.length} Tabs
                </span>
              </h3>
              <p className="text-xs text-[#8E8E93]">Manage custom app drawer tabs and organize apps per category</p>
            </div>
          </div>

          <button
            onClick={() => {
              audio.playTap();
              onClose();
            }}
            className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-[#F0F0F2] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[380px]">
          
          {/* Left Column: Tabs List & Actions */}
          <div className="md:col-span-5 border-r border-white/10 p-3 sm:p-4 flex flex-col gap-2.5 bg-[#0D0D12]/60 overflow-y-auto">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">Drawer Tabs</span>
              {!isCreatingNew && (
                <button
                  onClick={() => {
                    audio.playTap();
                    setIsCreatingNew(true);
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-[#34C759] hover:text-[#30D158] bg-[#34C759]/15 px-2 py-1 rounded-xl transition hover:scale-105"
                >
                  <Plus size={12} />
                  <span>New Tab</span>
                </button>
              )}
            </div>

            {/* Create Tab Inline Form */}
            {isCreatingNew && (
              <form onSubmit={handleCreateTab} className="p-2 rounded-2xl bg-[#1C1C26] border border-[#34C759]/40 space-y-2 animate-in fade-in duration-150">
                <input
                  type="text"
                  placeholder="e.g. Games, Work, Design..."
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  className="w-full bg-[#121218] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-[#F0F0F2] placeholder-[#636366] focus:outline-none focus:border-[#34C759]"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      setIsCreatingNew(false);
                    }}
                    className="px-2 py-1 rounded-lg text-[11px] text-[#8E8E93] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-lg bg-[#34C759] text-black text-[11px] font-bold hover:bg-[#30D158]"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            {/* Tab Items List */}
            <div className="space-y-1 overflow-y-auto pr-0.5 flex-1">
              {drawerTabs.map((tab) => {
                const isSelected = selectedTab === tab;
                const isSys = isSystemTab(tab);
                const isEditingThis = editingTabName === tab;

                return (
                  <div
                    key={tab}
                    onClick={() => {
                      if (!isEditingThis) {
                        audio.playTap();
                        setSelectedTab(tab);
                      }
                    }}
                    className={`group flex items-center justify-between px-3 py-2 rounded-2xl cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/40 font-bold shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-[#F0F0F2] border border-transparent'
                    }`}
                  >
                    {isEditingThis ? (
                      <div className="flex items-center gap-1.5 flex-1 mr-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={renameInput}
                          onChange={(e) => setRenameInput(e.target.value)}
                          className="w-full bg-[#121218] border border-[#34C759] rounded-lg px-2 py-0.5 text-xs text-[#F0F0F2]"
                        />
                        <button
                          onClick={() => handleRenameSubmit(tab)}
                          className="p-1 rounded-md bg-[#34C759] text-black"
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 truncate">
                        <Tag size={13} className={isSelected ? 'text-[#34C759]' : 'text-[#636366]'} />
                        <span className="text-xs capitalize truncate">{tab}</span>
                        {isSys && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-[#8E8E93]">sys</span>
                        )}
                      </div>
                    )}

                    {!isSys && !isEditingThis && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            audio.playTap();
                            setEditingTabName(tab);
                            setRenameInput(tab);
                          }}
                          className="p-1 rounded-lg hover:bg-white/10 text-[#8E8E93] hover:text-white"
                          title="Rename Tab"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDrawerTab(tab);
                            if (selectedTab === tab) setSelectedTab('all');
                          }}
                          className="p-1 rounded-lg hover:bg-[#FF3B30]/20 text-[#8E8E93] hover:text-[#FF3B30]"
                          title="Delete Tab"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: App Assignment for Selected Tab */}
          <div className="md:col-span-7 p-3 sm:p-4 flex flex-col gap-3 bg-[#13131A] overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#F0F0F2] capitalize flex items-center gap-1.5">
                  <span>Apps in</span>
                  <span className="text-[#34C759] bg-[#34C759]/15 px-2 py-0.5 rounded-lg">"{selectedTab}"</span>
                </h4>
                <span className="text-[10px] text-[#8E8E93]">{assignedAppIds.length} apps assigned</span>
              </div>

              {/* Search within apps */}
              <div className="relative w-44">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
                <input
                  type="text"
                  placeholder="Filter apps..."
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  className="w-full bg-[#1C1C24] border border-white/10 rounded-xl py-1 pl-7 pr-2 text-xs text-[#F0F0F2] placeholder-[#636366] focus:outline-none focus:border-[#34C759]"
                />
              </div>
            </div>

            {isSystemTab(selectedTab) ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#8E8E93] space-y-2">
                <Sparkles size={28} className="text-[#34C759] opacity-75" />
                <p className="text-xs font-semibold text-[#F0F0F2]">Automatic System Tab</p>
                <p className="text-[11px] max-w-xs text-[#8E8E93]">
                  The <strong>"{selectedTab}"</strong> tab is dynamically managed by the system based on active processes and usage history.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
                {filteredApps.map((app) => {
                  const isAssigned = assignedAppIds.includes(app.id);

                  return (
                    <div
                      key={app.id}
                      onClick={() => handleToggleApp(app.id)}
                      className={`flex items-center justify-between p-2 rounded-2xl border cursor-pointer transition-all duration-150 ${
                        isAssigned
                          ? 'bg-[#1C1C26] border-[#34C759]/40 text-[#F0F0F2]'
                          : 'bg-[#171720]/60 border-white/5 text-[#8E8E93] hover:bg-[#1C1C24]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div 
                          className="w-8 h-8 rounded-xl bg-[#0F0F14] flex items-center justify-center shrink-0 border border-white/5"
                          style={{ color: app.color }}
                        >
                          {app.customIcon ? (
                            <img src={app.customIcon} alt={app.name} className="w-5 h-5 object-contain rounded-md" />
                          ) : (
                            <DynamicIcon name={app.iconName} size={16} strokeWidth={2} />
                          )}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-[#F0F0F2] truncate">{app.name}</p>
                          <p className="text-[10px] text-[#636366] truncate capitalize">{app.category}</p>
                        </div>
                      </div>

                      <div className="shrink-0 pr-1">
                        {isAssigned ? (
                          <div className="w-5 h-5 rounded-lg bg-[#34C759] text-black flex items-center justify-center shadow-sm">
                            <Check size={13} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-lg border border-white/20 hover:border-white/40" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/10 flex items-center justify-between bg-[#0E0E14]">
          <span className="text-[11px] text-[#636366]">Changes persist across launcher sessions</span>
          <button
            onClick={() => {
              audio.playTap();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-[#34C759] hover:bg-[#30D158] text-black text-xs font-bold transition shadow-md shadow-[#34C759]/20"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
