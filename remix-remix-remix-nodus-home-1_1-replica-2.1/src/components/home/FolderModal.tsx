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
    settings,
  } = useLauncher();

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  const folder = folders.find((f) => f.id === activeFolderId);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder?.name || '');
  const [isAddingApps, setIsAddingApps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md sm:max-w-lg ${currentTheme.classes.modalContainer} ${currentTheme.cardRadius} p-5 space-y-4 animate-in zoom-in-95 fade-in duration-200 ${currentTheme.classes.containerFont} ${currentTheme.classes.textPrimary} backdrop-blur-3xl transition-colors duration-200`}
        style={{ backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'modal') }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 ${currentTheme.classes.modalHeader}`}>
          {isRenaming ? (
            <form onSubmit={handleSaveName} className="flex-1 mr-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleSaveName}
                autoFocus
                className={`w-full ${currentTheme.classes.inputField} px-3 py-1 text-sm font-semibold`}
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
              <h3 className="text-sm font-bold tracking-wide font-mono uppercase">
                {currentTheme.archetype === 'hud' ? `[DIR//${folder.name.toUpperCase()}]` : folder.name}
              </h3>
              <Edit3 size={13} className="text-[#94A3B8] group-hover:text-white" />
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                audio.playTap();
                setIsAddingApps(!isAddingApps);
              }}
              className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-xs font-semibold flex items-center gap-1 border transition`}
              style={
                isAddingApps
                  ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex, fontWeight: 'bold' }
                  : { backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }
              }
              title="Add apps to this directory"
            >
              {isAddingApps ? <Check size={13} /> : <Plus size={13} />}
              <span>{isAddingApps ? 'Done' : 'Add'}</span>
            </button>

            <button
              onClick={() => {
                audio.playTap();
                deleteFolder(folder.id);
              }}
              className={`p-1.5 text-[#94A3B8] hover:text-[#F43F5E] ${currentTheme.buttonRadius} hover:bg-white/5 transition`}
              title="Delete folder"
            >
              <Trash2 size={15} />
            </button>

            <button
              onClick={() => {
                audio.playTap();
                setActiveFolderId(null);
              }}
              className={`p-1.5 text-[#94A3B8] hover:text-[#F1F5F9] ${currentTheme.buttonRadius} hover:bg-white/5 transition`}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body: Folder Apps or Add Apps Picker */}
        {!isAddingApps ? (
          <div className={`grid grid-cols-4 gap-4 p-4 ${currentTheme.classes.itemCard} ${currentTheme.cardRadius} min-h-[200px] max-h-[50vh] overflow-y-auto items-start justify-items-center scrollbar-thin`}>
            {folderApps.length === 0 ? (
              <div className="col-span-4 text-xs text-[#94A3B8] text-center py-12 font-mono">
                Directory empty. Click &quot;Add&quot; above to register apps.
              </div>
            ) : (
              folderApps.map((app) => (
                <div key={app.id} className="relative group w-full flex flex-col items-center">
                  <AppIcon app={app} size="normal" />
                  {isEditing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audio.playTap();
                        removeAppFromFolder(folder.id, app.id);
                      }}
                      className="absolute -top-1 right-2 w-5 h-5 rounded-full bg-[#F43F5E] text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition z-30 border border-[#090B10]"
                      title="Remove from directory"
                    >
                      <Minus size={11} strokeWidth={3} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className={`space-y-3 p-4 ${currentTheme.classes.itemCard} ${currentTheme.cardRadius} max-h-[50vh] flex flex-col`}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Filter apps to include..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${currentTheme.classes.inputField} pl-9 pr-3 py-1.5 text-xs`}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin max-h-56">
              {availableApps.length === 0 ? (
                <p className="text-xs text-[#94A3B8] text-center py-6 font-mono">No matching executables found</p>
              ) : (
                availableApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => {
                      addAppToFolder(folder.id, app.id);
                    }}
                    className={`flex items-center justify-between p-2 ${currentTheme.buttonRadius} hover:bg-white/[0.06] cursor-pointer transition group`}
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
                      <span className={`text-xs font-medium ${settings.theme === 'material-light' ? 'text-[#0F172A]' : 'text-[#E2E8F0]'} truncate`}>{app.name}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 ${currentTheme.pillRadius} text-[10px] font-mono font-semibold opacity-0 group-hover:opacity-100 transition`}
                      style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex }}
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
