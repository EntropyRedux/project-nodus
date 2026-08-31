import React, { useState, useEffect, useMemo } from 'react';
import { 
  Battery, 
  Zap, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Monitor,
  CheckSquare,
  Square,
  StickyNote,
  Plus,
  Calendar,
  Pin,
  ListChecks,
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';
import { getSystemTheme, getAccentColor } from '../../utils/themes';
import { NoteColor } from '../../types/launcher';

const DARK_NOTE_COLOR_MAP: Record<NoteColor, { bg: string; border: string; text: string; dot: string }> = {
  emerald: {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.32)',
    text: '#10B981',
    dot: '#10B981',
  },
  sapphire: {
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.32)',
    text: '#38BDF8',
    dot: '#38BDF8',
  },
  amber: {
    bg: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(245, 158, 11, 0.36)',
    text: '#F59E0B',
    dot: '#F59E0B',
  },
  purple: {
    bg: 'rgba(168, 85, 247, 0.14)',
    border: 'rgba(168, 85, 247, 0.34)',
    text: '#C084FC',
    dot: '#A855F7',
  },
  rose: {
    bg: 'rgba(244, 63, 94, 0.14)',
    border: 'rgba(244, 63, 94, 0.34)',
    text: '#FB7185',
    dot: '#F43F5E',
  },
};

const LIGHT_NOTE_COLOR_MAP: Record<NoteColor, { bg: string; border: string; text: string; dot: string }> = {
  emerald: {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    text: '#065F46',
    dot: '#059669',
  },
  sapphire: {
    bg: '#F0F9FF',
    border: '#BAE6FD',
    text: '#0369A1',
    dot: '#0284C7',
  },
  amber: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#92400E',
    dot: '#D97706',
  },
  purple: {
    bg: '#FAF5FF',
    border: '#E9D5FF',
    text: '#6B21A8',
    dot: '#9333EA',
  },
  rose: {
    bg: '#FFF1F2',
    border: '#FECDD3',
    text: '#9F1239',
    dot: '#E11D48',
  },
};

export const TopWidgetRow: React.FC = () => {
  const { activeDevice, launchApp, settings, notes, openNotesModal, openSingleNote, toggleTodo } = useLauncher();
  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);
  const noteColorMap = settings.theme === 'material-light' ? LIGHT_NOTE_COLOR_MAP : DARK_NOTE_COLOR_MAP;

  // 1. Real-time Date & Time State (Big)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = currentTime.getHours().toString().padStart(2, '0');
  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  const seconds = currentTime.getSeconds().toString().padStart(2, '0');
  const formattedDay = currentTime.toLocaleDateString(undefined, { weekday: 'long' });
  const formattedDate = currentTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  // 2. Battery Status & Percentage State (Small)
  const [batteryLevel, setBatteryLevel] = useState<number>(activeDevice?.battery ?? 88);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  useEffect(() => {
    let batteryObj: any = null;
    let onLevelChange: any = null;
    let onChargingChange: any = null;

    try {
      if (typeof navigator !== 'undefined' && typeof (navigator as any).getBattery === 'function') {
        (navigator as any).getBattery().then((battery: any) => {
          if (!battery) return;
          batteryObj = battery;
          if (typeof battery.level === 'number') {
            setBatteryLevel(Math.round(battery.level * 100));
          }
          setIsCharging(Boolean(battery.charging));

          onLevelChange = () => {
            if (typeof battery.level === 'number') {
              setBatteryLevel(Math.round(battery.level * 100));
            }
          };
          onChargingChange = () => setIsCharging(Boolean(battery.charging));

          battery.addEventListener('levelchange', onLevelChange);
          battery.addEventListener('chargingchange', onChargingChange);
        }).catch(() => {});
      } else if (activeDevice?.battery) {
        setBatteryLevel(activeDevice.battery);
      }
    } catch (_) {
      if (activeDevice?.battery) {
        setBatteryLevel(activeDevice.battery);
      }
    }

    return () => {
      if (batteryObj) {
        if (onLevelChange) batteryObj.removeEventListener('levelchange', onLevelChange);
        if (onChargingChange) batteryObj.removeEventListener('chargingchange', onChargingChange);
      }
    };
  }, [activeDevice?.battery]);

  // Battery icon & badge colors
  const batteryColor = useMemo(() => {
    if (isCharging) return 'text-[#F59E0B]';
    if (batteryLevel > 35) return 'text-[#10B981]';
    if (batteryLevel > 15) return 'text-[#38BDF8]';
    return 'text-[#F43F5E]';
  }, [batteryLevel, isCharging]);

  // Device icon helper
  const DeviceIcon = useMemo(() => {
    const type = activeDevice?.type;
    if (type === 'phone') return Smartphone;
    if (type === 'tablet') return Tablet;
    if (type === 'desktop') return Monitor;
    return Laptop;
  }, [activeDevice?.type]);

  const deviceName = activeDevice?.name || 'Local Workstation';

  // Pill styling based on archetype
  const pillStyleClass = {
    glass: 'rounded-full bg-white/[0.04] hover:bg-white/[0.09] backdrop-blur-md border border-white/[0.08]',
    hud: 'rounded-none bg-black/80 hover:bg-black/95 border border-cyan-500/40 font-mono tracking-wider',
    brutalist: 'rounded-md bg-[#181C26] hover:bg-[#202534] border-2 border-black shadow-[2px_2px_0px_#000000]',
    minimal: 'rounded-none bg-transparent hover:bg-white/[0.04] border border-white/[0.08]',
    material: 'rounded-full bg-[#FFFFFF]/90 hover:bg-[#FFFFFF] backdrop-blur-md border border-[#E0E2EC] shadow-sm',
  }[currentTheme.archetype];

  const showClock = settings.enableClockWidget !== false;
  const showDeviceName = settings.enableDeviceNameWidget !== false;
  const showBattery = settings.enableBatteryWidget !== false;
  const showNotesWidget = settings.enableNotesWidget !== false;

  const hasTopStats = showDeviceName || showBattery;
  const hasLeftContent = hasTopStats || showClock;
  const hasAnyWidget = hasLeftContent || showNotesWidget;

  if (!hasAnyWidget) {
    return null;
  }

  return (
    <section 
      aria-label="System Overview Widget"
      className="w-full shrink-0 mb-3 select-none animate-in fade-in slide-in-from-top-1 duration-200"
    >
      {/* SINGLE UNIFIED WIDGET: Clock & Compact Stats on Left, 2-Row Sticky Notes & To-Dos on Center/Right */}
      <div className={`w-full py-2 px-1 sm:px-2 flex flex-col md:flex-row ${hasLeftContent && showNotesWidget ? 'md:items-center justify-between' : hasLeftContent ? 'items-start' : 'items-center'} gap-3 sm:gap-4 transition-all duration-200`}>
        
        {/* 1. LEFT: COMPACT DEVICE/BATTERY STATS (ON TOP), CLOCK NUMBERS & DATE */}
        {hasLeftContent && (
          <div className="flex flex-col shrink-0 min-w-0">
            {/* Top Row: Mini Device Name & Battery Stat Badges */}
            {hasTopStats && (
              <div className="flex items-center gap-1.5 mb-1 select-none">
                {/* Mini Device Name Pill */}
                {showDeviceName && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      audio.playTap();
                      launchApp('settings');
                    }}
                    className={`flex items-center gap-1.5 ${pillStyleClass} px-2.5 py-1 text-[10px] transition cursor-pointer hover:border-white/30`}
                    title="Connected Device (Open Settings)"
                  >
                    <DeviceIcon size={11} style={{ color: currentAccent.hex }} />
                    <span className={`font-semibold ${settings.theme === 'material-light' ? 'text-[#0F172A]' : 'text-white'} max-w-[90px] sm:max-w-[120px] truncate`}>
                      {deviceName}
                    </span>
                  </div>
                )}

                {/* Mini Battery Stat Pill */}
                {showBattery && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      audio.playTap();
                      launchApp('settings');
                    }}
                    className={`flex items-center gap-1.5 ${pillStyleClass} px-2.5 py-1 text-[10px] font-mono transition cursor-pointer hover:border-white/30`}
                    title={`Battery: ${batteryLevel}% ${isCharging ? '(Charging)' : '(On Battery)'}`}
                  >
                    {isCharging ? (
                      <Zap size={11} className="text-[#F59E0B] fill-current animate-pulse shrink-0" />
                    ) : (
                      <Battery size={12} className={`${batteryColor} shrink-0`} />
                    )}
                    <span className={`font-bold ${settings.theme === 'material-light' ? 'text-[#0F172A]' : 'text-white'}`}>
                      {batteryLevel}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Big Digital Clock Numbers (Clicking opens Clock app) */}
            {showClock && (
              <>
                <div 
                  id="widget-clock-numbers"
                  onClick={() => {
                    audio.playTap();
                    launchApp('clock');
                  }}
                  className="flex items-baseline gap-1.5 leading-none cursor-pointer group/clock select-none"
                  title="Open Clock & Alarms"
                >
                  <span className="font-mono text-3xl sm:text-4xl md:text-[44px] font-bold tracking-tight desktop-clock-text group-hover/clock:opacity-90 transition-opacity">
                    {hours}:{minutes}
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold desktop-clock-muted tracking-wider">
                    :{seconds}
                  </span>
                </div>

                {/* Clickable Date Display */}
                <div 
                  onClick={() => {
                    audio.playTap();
                    launchApp('clock');
                  }}
                  className="flex items-center gap-1.5 text-xs mt-1.5 cursor-pointer hover:opacity-85 transition-opacity desktop-clock-subtext"
                  title="Open Clock & Date details"
                >
                  <span className="font-semibold text-xs text-white">{formattedDay}</span>
                  <span className="opacity-50 text-white">•</span>
                  <span className="text-xs text-white/95 font-medium">{formattedDate}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* 2. CENTER / RIGHT: 2 ROWS OF TO-DO / STICKY NOTES PILLS WITH AMPLE SPACE */}
        {showNotesWidget && (
          <div 
            id="top-widget-notes-row"
            className="flex-1 min-w-0 max-w-full flex items-center"
          >
            {notes.length === 0 ? (
              /* When NO to-dos / sticky notes exist yet: Show prominent + button */
              <button
                id="btn-add-initial-note"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  audio.playTap();
                  openNotesModal(undefined, 'todo');
                }}
                className={`flex items-center gap-2 ${pillStyleClass} px-3 py-1.5 text-xs font-semibold transition border border-dashed hover:border-solid hover:scale-105 active:scale-95 group shadow-sm`}
                style={{
                  borderColor: currentAccent.badgeBorder,
                  backgroundColor: currentAccent.badgeBg,
                }}
                title="Create your first checklist task or text note"
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: currentAccent.hex, color: '#090B10' }}
                >
                  <Plus size={10} className="stroke-[3] group-hover:rotate-90 transition-transform duration-200" />
                </div>
                <span className={`text-[11px] sm:text-xs font-semibold ${currentTheme.classes.textPrimary}`}>
                  + Add Note / To-Do
                </span>
              </button>
            ) : (
              /* When notes exist: 2 rows of compact pills scrolling horizontally */
              <div className="w-full grid grid-rows-2 grid-flow-col auto-cols-max gap-1.5 overflow-x-auto py-1 px-0.5 max-h-[62px] scrollbar-thin select-none items-center">
                {/* Compact + button spanning the 2 rows */}
                <button
                  id="btn-add-note-inline"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    audio.playTap();
                    openNotesModal(undefined, 'todo');
                  }}
                  className={`row-span-2 flex flex-col items-center justify-center w-8 h-full min-h-[48px] shrink-0 ${pillStyleClass} text-xs font-bold transition hover:scale-105 active:scale-95 border group/add shadow-sm`}
                  style={{
                    backgroundColor: currentAccent.badgeBg,
                    borderColor: currentAccent.badgeBorder,
                    color: currentAccent.hex,
                  }}
                  title="Add new checklist task or sticky note"
                >
                  <Plus size={13} className="group-hover/add:rotate-90 transition-transform duration-200 stroke-[2.5]" />
                  <span className="text-[8px] font-mono uppercase mt-0.5 opacity-80">New</span>
                </button>

                {/* Individual Note Pills in 2 compact rows */}
                {notes.map((note) => {
                  const colorStyle = noteColorMap[note.color || 'emerald'] || noteColorMap.emerald;
                  const isTodo = note.type === 'todo';
                  const isChecklist = note.type === 'checklist';
                  const checklistItems = note.checklist || [];
                  const completedItems = checklistItems.filter((i) => i.completed).length;
                  const displayText = note.title || note.text;

                  return (
                    <div
                      key={note.id}
                      id={`note-pill-${note.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        audio.playTap();
                        openSingleNote(note.id);
                      }}
                      className={`flex items-center gap-1.5 ${pillStyleClass} px-2 py-0.5 text-xs shrink-0 transition cursor-pointer hover:border-white/30 active:scale-95 group shadow-sm max-w-[150px] sm:max-w-[180px] h-[24px] ${
                        note.completed ? 'opacity-50' : ''
                      }`}
                      style={{
                        borderColor: colorStyle.border,
                        backgroundColor: colorStyle.bg,
                      }}
                      title={
                        isChecklist
                          ? `Checklist: ${displayText} (${completedItems}/${checklistItems.length} completed)`
                          : isTodo
                          ? `Task: ${displayText}${note.completed ? ' (Completed)' : ''}`
                          : `Sticky Note: ${displayText}`
                      }
                    >
                      {isChecklist ? (
                        <ListChecks size={11} className="shrink-0 text-emerald-400" />
                      ) : isTodo ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTodo(note.id);
                          }}
                          className="shrink-0 hover:scale-110 transition-transform cursor-pointer p-0.5"
                          style={{ color: colorStyle.text }}
                          title={note.completed ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                          {note.completed ? (
                            <CheckSquare size={11} className="fill-current/20" />
                          ) : (
                            <Square size={11} className="opacity-75 group-hover:opacity-100" />
                          )}
                        </button>
                      ) : (
                        <StickyNote size={11} className="shrink-0" style={{ color: colorStyle.text }} />
                      )}

                      <span
                        className={`text-[10.5px] sm:text-[11px] font-medium truncate ${
                          note.completed ? 'line-through opacity-70' : currentTheme.classes.textPrimary
                        }`}
                      >
                        {displayText}
                      </span>

                      {isChecklist && checklistItems.length > 0 && (
                        <span className={`text-[8.5px] font-mono font-bold shrink-0 ${settings.theme === 'material-light' ? 'text-emerald-800' : 'text-emerald-300 opacity-80'}`}>
                          {completedItems}/{checklistItems.length}
                        </span>
                      )}

                      {note.pinned && (
                        <Pin size={9} className="shrink-0 text-[#F59E0B]" />
                      )}

                      {note.dueDate && (
                        <span className="text-[8.5px] font-mono opacity-70 shrink-0 hidden sm:inline" style={{ color: colorStyle.text }}>
                          • {note.dueDate.split(',')[0]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
};


