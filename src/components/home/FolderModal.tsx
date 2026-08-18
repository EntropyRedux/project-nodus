import React, { useState } from 'react';
import { X, Trash2, Edit3 } from 'lucide-react';
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
    deleteFolder 
  } = useLauncher();

  const folder = folders.find((f) => f.id === activeFolderId);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder?.name || '');

  if (!folder) return null;

  const folderApps = apps.filter((app) => folder.appIds.includes(app.id));

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    audio.playTap();
    renameFolder(folder.id, newName.trim());
    setIsRenaming(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#0A0A0C]/80 backdrop-blur-2xl flex items-center justify-center p-6 select-none animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-xs bg-[#1C1C1E] border border-white/5 rounded-[2rem] p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          {isRenaming ? (
            <form onSubmit={handleSaveName} className="flex-1 mr-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleSaveName}
                autoFocus
                className="w-full bg-[#0A0A0C] border border-[#34C759] rounded-xl px-2.5 py-1 text-sm text-[#F0F0F2] focus:outline-none"
              />
            </form>
          ) : (
            <div
              onClick={() => setIsRenaming(true)}
              className="flex items-center gap-1.5 cursor-pointer hover:text-[#34C759] transition-colors"
            >
              <h3 className="text-base font-semibold text-[#F0F0F2]">{folder.name}</h3>
              <Edit3 size={13} className="text-[#8E8E93]" />
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                audio.playTap();
                deleteFolder(folder.id);
              }}
              className="p-1.5 text-[#8E8E93] hover:text-[#FF3B30] rounded-xl hover:bg-white/5 transition"
              title="Delete folder"
            >
              <Trash2 size={15} />
            </button>
            <button
              onClick={() => {
                audio.playTap();
                setActiveFolderId(null);
              }}
              className="p-1.5 text-[#8E8E93] hover:text-[#F0F0F2] rounded-xl hover:bg-white/5 transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Folder App Grid */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-[#0A0A0C]/60 rounded-2xl border border-white/5 min-h-[160px] items-center justify-items-center">
          {folderApps.length === 0 ? (
            <div className="col-span-3 text-xs text-[#8E8E93] text-center py-6">
              Folder is empty
            </div>
          ) : (
            folderApps.map((app) => (
              <AppIcon key={app.id} app={app} size="normal" />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
