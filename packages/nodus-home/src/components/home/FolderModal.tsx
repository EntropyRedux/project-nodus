import React, { useState } from 'react';
import { X, Trash2, Edit3, Plus, Minus, Search, Check } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { AppIcon } from './AppIcon';
import { audio } from '../../utils/audio';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';

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

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

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
      className="fixed inset-0 z-50 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200"
      style={{ backgroundColor: `rgba(0, 0, 0, ${Math.min(0.55, ((settings.taskbarOpacity ?? 92) / 100) * 0.45).toFixed(2)})` }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md sm:max-w-lg backdrop-blur-2xl ${currentTheme.classes.modalContainer} ${currentTheme.cardRadius} p-6 shadow-2xl space-y-4 animate-in zoom-in-75 fade-in duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`}
        style={{
          backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity ?? 92, 'popup'),
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
                className={`w-full ${currentTheme.classes.inputField} rounded-xl px-3 py-1.5 text-base font-semibold focus:outline-none`}
              />
            </form>
          ) : (
            <div
              onClick={() => {
                setNewName(folder.name);
                setIsRenaming(true);
              }}
              className="flex items-center gap-2 cursor-pointer transition-colors group"
            >
              <h3 className={`text-lg font-bold ${currentTheme.classes.textPrimary}`}>{folder.name}</h3>
              <Edit3 size={14} className={`${currentTheme.classes.textMuted} group-hover:text-[#10B981]`} />
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {/* Toggle Add Apps View */}
            <button
              onClick={() => {
                audio.playTap();
                setIsAddingApps(!isAddingApps);
              }}
              style={isAddingApps ? { backgroundColor: currentAccent.hex, color: '#090B10' } : undefined}
              className={`px-2.5 py-1 ${currentTheme.pillRadius} text-xs font-semibold flex items-center gap-1 border transition ${
                isAddingApps
                  ? 'border-transparent shadow-md'
                  : `${currentTheme.classes.actionButton}`
              }`}
              title="Add apps to this folder"
            >
              {isAddingApps ? <Check size={13} strokeWidth={2.5} /> : <Plus size={13} strokeWidth={2.5} />}
              <span>{isAddingApps ? 'Done' : 'Add'}</span>
            </button>

            {/* Delete folder */}
            <button
              onClick={() => {
                audio.playTap();
                deleteFolder(folder.id);
              }}
              className={`p-1.5 ${currentTheme.buttonRadius} ${currentTheme.classes.actionButton} hover:text-[#FF3B30] transition`}
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
              className={`p-1.5 ${currentTheme.buttonRadius} ${currentTheme.classes.actionButton}`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body: Folder Apps or Add Apps Picker */}
        {!isAddingApps ? (
          <div 
            style={{
              backgroundColor: getSurfaceRgba(settings.theme, Math.max(10, (settings.taskbarOpacity ?? 92) - 25), 'card'),
            }}
            className={`grid grid-cols-4 sm:grid-cols-4 gap-4 p-4 ${currentTheme.isLight ? 'border-[#CBD5E1]' : 'border-white/5'} ${currentTheme.cardRadius} border min-h-[220px] max-h-[50vh] overflow-y-auto items-start justify-items-center scrollbar-thin`}
          >
            {folderApps.length === 0 ? (
              <div className={`col-span-4 text-xs ${currentTheme.classes.textMuted} text-center py-12`}>
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
          <div 
            style={{
              backgroundColor: getSurfaceRgba(settings.theme, Math.max(10, (settings.taskbarOpacity ?? 92) - 25), 'card'),
            }}
            className={`space-y-3 p-4 ${currentTheme.isLight ? 'border-[#CBD5E1]' : 'border-white/5'} ${currentTheme.cardRadius} border max-h-[50vh] flex flex-col`}
          >
            {/* Search Input */}
            <div className={`flex items-center gap-2 ${currentTheme.classes.inputField} px-3 py-2 ${currentTheme.cardRadius}`}>
              <Search size={14} className={currentTheme.classes.textMuted} />
              <input
                type="text"
                placeholder="Filter apps to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-transparent border-none text-xs ${currentTheme.classes.textPrimary} focus:outline-none placeholder-[#94A3B8]`}
              />
            </div>

            {/* List of Available Apps to Add */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin max-h-56">
              {availableApps.length === 0 ? (
                <p className={`text-xs ${currentTheme.classes.textMuted} text-center py-6`}>No matching apps found</p>
              ) : (
                availableApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => {
                      addAppToFolder(folder.id, app.id);
                    }}
                    className={`flex items-center justify-between p-2 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} hover:opacity-90 cursor-pointer transition group`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 ${currentTheme.buttonRadius} flex items-center justify-center overflow-hidden shrink-0`}
                        style={{ backgroundColor: app.customIcon ? 'transparent' : app.color || currentAccent.hex }}
                      >
                        {app.customIcon ? (
                          <img src={app.customIcon} alt={app.name} className="w-7 h-7 object-contain rounded" />
                        ) : (
                          <span className="text-[10px] text-white font-bold">{app.name.charAt(0)}</span>
                        )}
                      </div>
                      <span className={`text-xs font-medium ${currentTheme.classes.textPrimary} truncate`}>{app.name}</span>
                    </div>

                    <span 
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition border`}
                      style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
                    >
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
