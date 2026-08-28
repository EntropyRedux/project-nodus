import React, { useState } from 'react';
import { X, Trash2, Edit3, Plus, Minus, Search, Check } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { AppIcon } from './AppIcon';
import { audio } from '../../utils/audio';

export const FolderModal: React.FC = () => {
  const { 
    activeFolderId, 
    setActiveFolderId, 
    folders, 
    apps, 
    renameFolder, 
    deleteFolder,
    addAppToFolder,
    removeAppFromFolder,
    isEditing,
    setIsEditing,
    settings,
  } = useLauncher();

  const folder = folders.find((f) => f.id === activeFolderId);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder?.name || '');
  const [isAddingApps, setIsAddingApps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const folderAlpha = (settings.folderOpacity ?? 95) / 100;

  if (!folder) return null;

  const folderApps = apps.filter((app) => folder.appIds.includes(app.id));
  const availableApps = apps.filter(
    (app) => !folder.appIds.includes(app.id) &&
      app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    audio.playTap();
    renameFolder(folder.id, newName.trim());
    setIsRenaming(false);
  };

  return (
    <div 
      onClick={() => setActiveFolderId(null)}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md sm:max-w-lg backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 shadow-2xl space-y-4 animate-in zoom-in-75 fade-in duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          backgroundColor: `rgba(28, 28, 30, ${folderAlpha})`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          {isRenaming ? (
            <form onSubmit={handleSaveName} className="flex-1 mr-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleSaveName}
                autoFocus
                className="w-full bg-[#0A0A0C] border border-[#34C759] rounded-xl px-3 py-1.5 text-base text-[#F0F0F2] font-semibold focus:outline-none"
              />
            </form>
          ) : (
            <div
              onClick={() => {
                setNewName(folder.name);
                setIsRenaming(true);
              }}
              className="flex items-center gap-2 cursor-pointer hover:text-[#34C759] transition-colors group"
            >
              <h3 className="text-lg font-bold text-[#F0F0F2]">{folder.name}</h3>
              <Edit3 size={14} className="text-[#8E8E93] group-hover:text-[#34C759]" />
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {/* Toggle Add Apps View */}
            <button
              onClick={() => {
                audio.playTap();
                setIsAddingApps(!isAddingApps);
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border transition ${
                isAddingApps
                  ? 'bg-[#34C759] text-[#0A0A0C] border-[#34C759]'
                  : 'bg-[#2C2C2E] text-[#8E8E93] hover:text-white border-white/5'
              }`}
              title="Add apps to this folder"
            >
              {isAddingApps ? <Check size={13} /> : <Plus size={13} />}
              <span>{isAddingApps ? 'Done' : 'Add'}</span>
            </button>

            {/* Delete folder */}
            <button
              onClick={() => {
                audio.playTap();
                deleteFolder(folder.id);
              }}
              className="p-1.5 text-[#8E8E93] hover:text-[#FF3B30] rounded-xl hover:bg-white/5 transition"
              title="Delete folder"
            >
              <Trash2 size={16} />
            </button>

            {/* Close modal */}
            <button
              onClick={() => {
                audio.playTap();
                setActiveFolderId(null);
              }}
              className="p-1.5 text-[#8E8E93] hover:text-[#F0F0F2] rounded-xl hover:bg-white/5 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body: Folder Apps or Add Apps Picker */}
        {!isAddingApps ? (
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-4 p-4 bg-[#0A0A0C]/70 rounded-3xl border border-white/5 min-h-[220px] max-h-[50vh] overflow-y-auto items-start justify-items-center scrollbar-thin">
            {folderApps.length === 0 ? (
              <div className="col-span-4 text-xs text-[#8E8E93] text-center py-12">
                This folder is empty. Tap &quot;Add&quot; above to add apps.
              </div>
            ) : (
              folderApps.map((app) => (
                <div key={app.id} className="relative group w-full flex flex-col items-center">
                  <AppIcon app={app} size="normal" />
                  {/* Quick Remove from folder button */}
                  {isEditing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audio.playTap();
                        removeAppFromFolder(folder.id, app.id);
                      }}
                      className="absolute -top-1 right-2 w-5 h-5 rounded-full bg-[#FF3B30] text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition z-30"
                      title="Remove from folder"
                    >
                      <Minus size={12} strokeWidth={3} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* Add Apps Picker */
          <div className="space-y-3 p-4 bg-[#0A0A0C]/70 rounded-3xl border border-white/5 max-h-[50vh] flex flex-col">
            {/* Search Input */}
            <div className="flex items-center gap-2 bg-[#1C1C1E] px-3 py-2 rounded-xl border border-white/10">
              <Search size={14} className="text-[#8E8E93]" />
              <input
                type="text"
                placeholder="Filter apps to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-xs text-[#F0F0F2] focus:outline-none placeholder-[#8E8E93]"
              />
            </div>

            {/* List of Available Apps to Add */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin max-h-56">
              {availableApps.length === 0 ? (
                <p className="text-xs text-[#8E8E93] text-center py-6">No matching apps found</p>
              ) : (
                availableApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => {
                      addAppToFolder(folder.id, app.id);
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                        style={{ backgroundColor: app.customIcon ? 'transparent' : app.color }}
                      >
                        {app.customIcon ? (
                          <img src={app.customIcon} alt={app.name} className="w-7 h-7 object-contain rounded" />
                        ) : (
                          <span className="text-[10px] text-white font-bold">{app.name.charAt(0)}</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-[#F0F0F2] truncate">{app.name}</span>
                    </div>

                    <span className="px-2 py-0.5 bg-[#34C759]/20 text-[#34C759] rounded-full text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition">
                      + Add
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
