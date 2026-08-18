import React from 'react';
import { X, Trash2, Smartphone } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { DynamicIcon } from '../common/DynamicIcon';
import { audio } from '../../utils/audio';

export const RecentsView: React.FC = () => {
  const { 
    isRecentsOpen, 
    setRecentsOpen, 
    runningApps, 
    apps, 
    launchApp, 
    killApp, 
    clearAllRunningApps 
  } = useLauncher();

  if (!isRecentsOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-[#0A0A0C]/90 backdrop-blur-2xl text-[#F0F0F2] flex flex-col justify-between p-6 select-none animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-widest">Active Apps</h3>
        <button
          onClick={() => setRecentsOpen(false)}
          className="p-2 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-[#F0F0F2] transition border border-white/5"
        >
          <X size={16} />
        </button>
      </div>

      {/* App Cards Carousel */}
      <div className="flex-1 flex items-center gap-4 overflow-x-auto py-6 no-scrollbar snap-x snap-mandatory">
        {runningApps.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center text-[#4A4A4F] space-y-2">
            <Smartphone size={32} />
            <p className="text-xs">No recent apps</p>
          </div>
        ) : (
          runningApps.map((appId) => {
            const app = apps.find((a) => a.id === appId) || {
              id: appId,
              name: appId.toUpperCase(),
              iconName: 'Smartphone',
              color: '#007AFF',
            };

            return (
              <div
                key={appId}
                className="w-64 h-96 rounded-[2rem] bg-[#1C1C1E] border border-white/5 shrink-0 flex flex-col justify-between p-4 shadow-2xl relative group snap-center cursor-pointer hover:border-[#34C759]/50 transition-transform duration-200 hover:scale-[1.02]"
                onClick={() => {
                  setRecentsOpen(false);
                  launchApp(appId);
                }}
              >
                {/* App Card Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: app.color }}
                    >
                      <DynamicIcon name={app.iconName} size={14} />
                    </div>
                    <span className="text-xs font-medium text-[#F0F0F2] truncate">{app.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      audio.playTap();
                      killApp(appId);
                    }}
                    className="p-1 text-[#8E8E93] hover:text-[#FF3B30] rounded-full hover:bg-white/5 transition"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Simulated App Screenshot View */}
                <div className="flex-1 flex flex-col items-center justify-center my-4 bg-[#0A0A0C]/80 rounded-2xl p-4 border border-white/5">
                  <div
                    className="w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl mb-2"
                    style={{ backgroundColor: app.color }}
                  >
                    <DynamicIcon name={app.iconName} size={28} />
                  </div>
                  <span className="text-xs font-medium text-[#8E8E93]">Tap to resume</span>
                </div>

                {/* Card Footer */}
                <div className="text-[10px] text-[#4A4A4F] text-center uppercase tracking-wider font-medium">
                  Swipe up or tap X to close
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Clear All */}
      {runningApps.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              audio.playTap();
              clearAllRunningApps();
            }}
            className="px-5 py-2.5 bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-white/5 text-[#F0F0F2] rounded-full text-xs font-medium flex items-center gap-2 transition shadow-lg"
          >
            <Trash2 size={14} className="text-[#8E8E93]" /> Clear all apps
          </button>
        </div>
      )}
    </div>
  );
};
