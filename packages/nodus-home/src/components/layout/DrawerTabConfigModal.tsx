import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Layers, 
  Search, 
  CheckSquare, 
  Square,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { DynamicIcon } from '../common/DynamicIcon';
import { audio } from '../../utils/audio';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';

interface DrawerTabConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SYSTEM_TABS = ['recents', 'productivity', 'media', 'tools', 'social', 'games'];

export const DrawerTabConfigModal: React.FC<DrawerTabConfigModalProps> = ({ isOpen, onClose }) => {
  const {
    apps,
    recentApps,
    drawerTabs,
    customTabAppMap,
    addDrawerTab,
    removeDrawerTab,
    renameDrawerTab,
    assignAppsToTab,
    showToast,
    settings,
  } = useLauncher();

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  const [newTabName, setNewTabName] = useState('');
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [editingInput, setEditingInput] = useState('');
  const [assigningTab, setAssigningTab] = useState<string | null>(null);
  const [appSearch, setAppSearch] = useState('');

  const customTabs = useMemo(() => {
    return (drawerTabs || []).filter(
      (t) => typeof t === 'string' && !['all', 'running', 'system', ...SYSTEM_TABS].includes(t.toLowerCase())
    );
  }, [drawerTabs]);

  if (!isOpen) return null;

  const handleCreateTab = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTabName.trim().toLowerCase();
    if (!clean) return;
    if (['all', 'running', 'system', ...SYSTEM_TABS].includes(clean)) {
      showToast(`"${clean}" is already a system tab`);
      return;
    }
    audio.playTap();
    addDrawerTab(newTabName.trim());
    setNewTabName('');
  };

  const handleStartRename = (tab: string) => {
    audio.playTap();
    setEditingTab(tab);
    setEditingInput(tab);
  };

  const handleSaveRename = (oldName: string) => {
    if (!editingInput.trim() || editingInput.trim().toLowerCase() === oldName.toLowerCase()) {
      setEditingTab(null);
      return;
    }
    audio.playTap();
    renameDrawerTab(oldName, editingInput.trim());
    setEditingTab(null);
  };

  const currentAssignedApps = assigningTab ? (customTabAppMap[assigningTab] || []) : [];

  const handleToggleAppAssignment = (appId: string) => {
    if (!assigningTab) return;
    audio.playTap();
    const current = customTabAppMap[assigningTab] || [];
    const next = current.includes(appId)
      ? current.filter((id) => id !== appId)
      : [...current, appId];
    assignAppsToTab(assigningTab, next);
  };

  const filteredAppsForAssignment = apps.filter((app) =>
    app.name.toLowerCase().includes(appSearch.toLowerCase())
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${Math.min(0.55, ((settings.taskbarOpacity ?? 92) / 100) * 0.45).toFixed(2)})`,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg backdrop-blur-2xl ${currentTheme.classes.modalContainer} ${currentTheme.cardRadius} p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]`}
        style={{
          backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity ?? 92, 'popup'),
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            {assigningTab ? (
              <button
                onClick={() => {
                  audio.playTap();
                  setAssigningTab(null);
                  setAppSearch('');
                }}
                className={`p-1.5 ${currentTheme.buttonRadius} ${currentTheme.classes.actionButton}`}
                title="Back to Tabs List"
              >
                <ArrowLeft size={16} />
              </button>
            ) : (
              <div
                className={`w-8 h-8 ${currentTheme.buttonRadius} flex items-center justify-center`}
                style={{ backgroundColor: currentAccent.badgeBg, border: `1px solid ${currentAccent.badgeBorder}` }}
              >
                <Layers size={16} style={{ color: currentAccent.hex }} />
              </div>
            )}
            <div>
              <h3 className={`font-extrabold text-sm sm:text-base ${currentTheme.classes.textPrimary} tracking-wide`}>
                {assigningTab ? `Assign Apps: "${assigningTab.toUpperCase()}"` : 'Organize App Drawer Tabs'}
              </h3>
              <p className={`text-[11px] ${currentTheme.classes.textSecondary}`}>
                {assigningTab
                  ? 'Select apps to display when this tab is selected'
                  : 'Add, rename, or customize categories in the app drawer'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              audio.playTap();
              onClose();
            }}
            className={`p-1.5 ${currentTheme.buttonRadius} ${currentTheme.classes.actionButton}`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content View: Main Tabs List or App Assignment Picker */}
        {!assigningTab ? (
          <div className="space-y-4 overflow-y-auto pr-1 scrollbar-thin flex-1">
            {/* Create New Tab Form */}
            <form onSubmit={handleCreateTab} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="New tab name (e.g. Work, Finance, Dev)..."
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  className={`w-full ${currentTheme.classes.inputField} px-3 py-2 text-xs rounded-xl transition`}
                />
              </div>
              <button
                type="submit"
                disabled={!newTabName.trim()}
                style={{
                  backgroundColor: newTabName.trim() ? currentAccent.hex : undefined,
                  color: newTabName.trim() ? '#090B10' : undefined,
                }}
                className={`px-3 py-2 ${currentTheme.buttonRadius} text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-30 disabled:cursor-not-allowed shadow-md`}
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Add Tab</span>
              </button>
            </form>

            {/* Custom Tabs Section */}
            <div className="space-y-2">
              <div className={`text-[11px] font-bold ${currentTheme.classes.textSecondary} uppercase tracking-wider flex items-center gap-1.5`}>
                <Sparkles size={12} style={{ color: currentAccent.hex }} />
                <span>Custom Tabs ({customTabs.length})</span>
              </div>

              {customTabs.length === 0 ? (
                <div className={`p-4 rounded-xl text-center text-xs ${currentTheme.classes.textMuted} border border-dashed ${currentTheme.isLight ? 'border-[#CBD5E1]' : 'border-white/10'}`}>
                  No custom tabs yet. Type a name above to create your first tab!
                </div>
              ) : (
                <div className="space-y-1.5">
                  {customTabs.map((tab) => {
                    const isEditing = editingTab === tab;
                    const assignedCount = (customTabAppMap[tab] || []).length;

                    return (
                      <div
                        key={tab}
                        className={`flex items-center justify-between p-2.5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} border ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'} transition`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1 mr-2">
                            <input
                              type="text"
                              value={editingInput}
                              onChange={(e) => setEditingInput(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(tab);
                                if (e.key === 'Escape') setEditingTab(null);
                              }}
                              className={`flex-1 ${currentTheme.classes.inputField} px-2.5 py-1 text-xs rounded-lg`}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(tab)}
                              className="p-1 rounded bg-[#10B981] text-[#090B10]"
                            >
                              <Check size={14} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTab(null)}
                              className={`p-1 ${currentTheme.buttonRadius} ${currentTheme.classes.actionButton}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-xs font-bold capitalize ${currentTheme.classes.textPrimary}`}>
                              {tab}
                            </span>
                            <span
                              className="text-[10px] font-mono px-1.5 py-0.2 rounded-full font-semibold border"
                              style={{
                                backgroundColor: currentAccent.badgeBg,
                                color: currentAccent.hex,
                                borderColor: currentAccent.badgeBorder,
                              }}
                            >
                              {assignedCount} apps
                            </span>
                          </div>
                        )}

                        {!isEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                audio.playTap();
                                setAssigningTab(tab);
                              }}
                              className={`px-2 py-1 ${currentTheme.pillRadius} text-[11px] font-semibold ${currentTheme.classes.actionButton} transition`}
                              title="Assign apps to this tab"
                            >
                              Assign Apps
                            </button>
                            <button
                              onClick={() => handleStartRename(tab)}
                              className={`p-1.5 ${currentTheme.buttonRadius} ${currentTheme.classes.actionButton}`}
                              title="Rename tab"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => removeDrawerTab(tab)}
                              className={`p-1.5 ${currentTheme.buttonRadius} ${currentTheme.classes.actionButton} hover:text-[#FF3B30] transition`}
                              title="Delete tab"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Standard System Tabs Section */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className={`text-[11px] font-bold ${currentTheme.classes.textSecondary} uppercase tracking-wider`}>
                Default System Tabs (Auto-Managed)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SYSTEM_TABS.map((tab) => {
                  const count = tab === 'recents'
                    ? recentApps.length
                    : apps.filter((a) => a.category === tab).length;
                  return (
                    <div
                      key={tab}
                      className={`p-2.5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} border ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'} flex items-center justify-between`}
                    >
                      <span className={`text-xs font-semibold capitalize ${currentTheme.classes.textPrimary}`}>
                        {tab}
                      </span>
                      <span className={`text-[10px] font-mono ${currentTheme.classes.textMuted}`}>
                        {count} apps
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* App Assignment Picker Sub-View */
          <div className="space-y-3 overflow-y-auto flex-1 pr-1 scrollbar-thin">
            <div className="relative">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${currentTheme.classes.textMuted}`} />
              <input
                type="text"
                placeholder="Filter apps to assign..."
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                className={`w-full ${currentTheme.classes.inputField} pl-9 pr-3 py-2 text-xs rounded-xl transition`}
              />
            </div>

            <div className="space-y-1.5 max-h-[48vh] overflow-y-auto pr-1 scrollbar-thin">
              {filteredAppsForAssignment.length === 0 ? (
                <p className={`text-xs text-center py-6 ${currentTheme.classes.textMuted}`}>No apps found</p>
              ) : (
                filteredAppsForAssignment.map((app) => {
                  const isAssigned = currentAssignedApps.includes(app.id);

                  return (
                    <div
                      key={app.id}
                      onClick={() => handleToggleAppAssignment(app.id)}
                      className={`flex items-center justify-between p-2.5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} border ${
                        isAssigned
                          ? 'border-transparent'
                          : currentTheme.isLight
                          ? 'border-[#E2E8F0]'
                          : 'border-white/5'
                      } cursor-pointer transition`}
                      style={
                        isAssigned
                          ? {
                              backgroundColor: currentAccent.badgeBg,
                              borderColor: currentAccent.badgeBorder,
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 ${currentTheme.buttonRadius} flex items-center justify-center overflow-hidden shrink-0`}
                          style={{ backgroundColor: app.customIcon ? 'transparent' : app.color || currentAccent.hex }}
                        >
                          {app.customIcon ? (
                            <img src={app.customIcon} alt={app.name} className="w-7 h-7 object-contain rounded" />
                          ) : (
                            <DynamicIcon name={app.iconName} size={15} strokeWidth={2.2} />
                          )}
                        </div>
                        <span className={`text-xs font-semibold ${currentTheme.classes.textPrimary} truncate`}>
                          {app.name}
                        </span>
                      </div>

                      <div className="shrink-0" style={{ color: isAssigned ? currentAccent.hex : undefined }}>
                        {isAssigned ? (
                          <CheckSquare size={16} strokeWidth={2.5} />
                        ) : (
                          <Square size={16} className={currentTheme.classes.textMuted} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  audio.playTap();
                  setAssigningTab(null);
                }}
                style={{ backgroundColor: currentAccent.hex, color: '#090B10' }}
                className={`px-4 py-1.5 ${currentTheme.pillRadius} text-xs font-bold shadow-md transition`}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
