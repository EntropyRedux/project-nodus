import React, { useState } from 'react';
import { useDesktop } from '../../context/DesktopContext';
import { 
  Crosshair, 
  Sparkles, 
  MousePointer, 
  Lock, 
  Check, 
  AppWindow, 
  Clipboard, 
  Radio, 
  Zap, 
  ToggleLeft, 
  ToggleRight,
  Sliders
} from 'lucide-react';

const CORNER_ACTION_OPTIONS = [
  { id: 'fleet', label: 'Open Fleet Mesh', icon: Radio, color: '#34C759' },
  { id: 'clipboard', label: 'Show Clipboard Hub', icon: Clipboard, color: '#007AFF' },
  { id: 'shortcuts', label: 'Remote Shortcuts', icon: Zap, color: '#BF5AF2' },
  { id: 'processes', label: 'Process Manager', icon: Crosshair, color: '#FF9500' },
  { id: 'lock', label: 'Lock Workstation', icon: Lock, color: '#FF3B30' },
  { id: 'none', label: 'Disabled (None)', icon: Crosshair, color: '#636366' },
];

export const HotCornerConfigPanel: React.FC = () => {
  const { hotCornerConfig, updateHotCornerConfig, lockWorkstation } = useDesktop();
  const [selectedCorner, setSelectedCorner] = useState<'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'>('topLeft');
  const [toast, setToast] = useState(false);

  const triggerToast = () => {
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  const getActionObj = (actionId: string) => {
    return CORNER_ACTION_OPTIONS.find((opt) => opt.id === actionId) || CORNER_ACTION_OPTIONS[0];
  };

  return (
    <div className="w-full h-full flex flex-col gap-5 overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Crosshair size={20} className="text-[#FF9500]" />
            <span>Hot-Corner Gestures & Assistive Triggers</span>
          </h2>
          <p className="text-xs text-[#8E8E93]">
            Trigger instant cross-device actions by moving the cursor to display corners.
          </p>
        </div>
        {toast && (
          <span className="px-3 py-1 rounded-xl bg-[#34C759]/20 text-[#34C759] text-xs font-bold border border-[#34C759]/40 flex items-center gap-1.5">
            <Check size={13} />
            <span>Config Updated</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ─── Left: Interactive Visual Display Map (7 cols) ───────── */}
        <section className="lg:col-span-7 bg-[#121218] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 className="text-sm font-bold text-white">Visual Screen Interactive Map</h3>
            <span className="text-[11px] text-[#8E8E93]">Click a corner to map actions</span>
          </div>

          {/* Monitor Graphic Frame */}
          <div className="p-4 bg-black/50 border border-white/10 rounded-2xl flex flex-col items-center justify-center relative min-h-[280px]">
            {/* Screen Inner Bezel */}
            <div className="w-full max-w-lg aspect-[16/10] bg-[#0E0E14] border-2 border-[#2C2C34] rounded-2xl relative shadow-2xl overflow-hidden flex flex-col justify-between p-3">
              {/* Screen Top Row */}
              <div className="flex justify-between items-start">
                {/* Top-Left Corner */}
                <button
                  onClick={() => setSelectedCorner('topLeft')}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-start gap-1 ${
                    selectedCorner === 'topLeft'
                      ? 'border-[#34C759] bg-[#34C759]/20 shadow-[0_0_15px_#34C759]'
                      : 'border-white/20 bg-white/5 hover:border-white/40'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase text-[#8E8E93]">Top-Left ↖</span>
                  <span className="text-xs font-bold text-white">
                    {getActionObj(hotCornerConfig.corners.topLeft).label}
                  </span>
                </button>

                {/* Top-Right Corner */}
                <button
                  onClick={() => setSelectedCorner('topRight')}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-end gap-1 ${
                    selectedCorner === 'topRight'
                      ? 'border-[#007AFF] bg-[#007AFF]/20 shadow-[0_0_15px_#007AFF]'
                      : 'border-white/20 bg-white/5 hover:border-white/40'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase text-[#8E8E93]">Top-Right ↗</span>
                  <span className="text-xs font-bold text-white">
                    {getActionObj(hotCornerConfig.corners.topRight).label}
                  </span>
                </button>
              </div>

              {/* Center Screen Mock Content */}
              <div className="flex flex-col items-center justify-center gap-1.5 opacity-60">
                <MousePointer size={24} className="text-white animate-pulse" />
                <span className="text-[11px] font-mono text-[#8E8E93]">
                  Dwell Time: {hotCornerConfig.dwellTimeMs}ms
                </span>
              </div>

              {/* Screen Bottom Row */}
              <div className="flex justify-between items-end">
                {/* Bottom-Left Corner */}
                <button
                  onClick={() => setSelectedCorner('bottomLeft')}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-start gap-1 ${
                    selectedCorner === 'bottomLeft'
                      ? 'border-[#BF5AF2] bg-[#BF5AF2]/20 shadow-[0_0_15px_#BF5AF2]'
                      : 'border-white/20 bg-white/5 hover:border-white/40'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase text-[#8E8E93]">Bottom-Left ↙</span>
                  <span className="text-xs font-bold text-white">
                    {getActionObj(hotCornerConfig.corners.bottomLeft).label}
                  </span>
                </button>

                {/* Bottom-Right Corner */}
                <button
                  onClick={() => setSelectedCorner('bottomRight')}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-end gap-1 ${
                    selectedCorner === 'bottomRight'
                      ? 'border-[#FF3B30] bg-[#FF3B30]/20 shadow-[0_0_15px_#FF3B30]'
                      : 'border-white/20 bg-white/5 hover:border-white/40'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase text-[#8E8E93]">Bottom-Right ↘</span>
                  <span className="text-xs font-bold text-white">
                    {getActionObj(hotCornerConfig.corners.bottomRight).label}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Right: Action Selector & Timing Sliders (5 cols) ────── */}
        <section className="lg:col-span-5 bg-[#121218] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 className="text-sm font-bold text-white">
              Selected: <span className="text-[#34C759] uppercase">{selectedCorner}</span>
            </h3>
            <span className="text-[11px] text-[#8E8E93]">Choose action to bind</span>
          </div>

          {/* Action Options List */}
          <div className="space-y-2">
            {CORNER_ACTION_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = hotCornerConfig.corners[selectedCorner] === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    updateHotCornerConfig({
                      corners: {
                        ...hotCornerConfig.corners,
                        [selectedCorner]: option.id,
                      },
                    });
                    triggerToast();
                  }}
                  className={`w-full p-2.5 px-3 rounded-2xl border flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-white/10 border-[#34C759] text-white shadow-md'
                      : 'bg-[#181822] hover:bg-[#20202C] border-white/5 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${option.color}25`, color: option.color }}
                    >
                      <Icon size={14} />
                    </div>
                    <span className="text-xs font-bold">{option.label}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-[#34C759]" />}
                </button>
              );
            })}
          </div>

          {/* Timing & Exemption Sliders */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <div>
              <div className="flex justify-between text-xs font-bold text-[#8E8E93] mb-1">
                <span>Dwell Delay Trigger</span>
                <span className="text-white font-mono">{hotCornerConfig.dwellTimeMs} ms</span>
              </div>
              <input
                type="range"
                min="100"
                max="500"
                step="20"
                value={hotCornerConfig.dwellTimeMs}
                onChange={(e) => {
                  updateHotCornerConfig({ dwellTimeMs: parseInt(e.target.value, 10) });
                  triggerToast();
                }}
                className="w-full accent-[#34C759] cursor-pointer"
              />
            </div>

            <div 
              onClick={() => {
                updateHotCornerConfig({ disableInFullscreen: !hotCornerConfig.disableInFullscreen });
                triggerToast();
              }}
              className="p-3 rounded-2xl bg-[#181822] hover:bg-[#1E1E2A] border border-white/5 flex items-center justify-between cursor-pointer transition"
            >
              <div>
                <h4 className="text-xs font-bold text-white">Disable in Fullscreen / Gaming</h4>
                <p className="text-[10.5px] text-[#8E8E93]">Avoid accidental triggers during full-screen apps</p>
              </div>
              {hotCornerConfig.disableInFullscreen ? (
                <ToggleRight size={26} className="text-[#34C759]" />
              ) : (
                <ToggleLeft size={26} className="text-[#636366]" />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
