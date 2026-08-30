import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Battery, 
  Zap, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Monitor,
  CheckCircle2
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';
import { getSystemTheme, getAccentColor } from '../../utils/themes';

export const TopWidgetRow: React.FC = () => {
  const { activeDevice, launchApp, settings } = useLauncher();
  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

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
    glass: 'rounded-full bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/[0.08]',
    hud: 'rounded-none bg-black/80 hover:bg-black/95 border border-cyan-500/40 font-mono tracking-wider',
    brutalist: 'rounded-md bg-[#181C26] hover:bg-[#202534] border-2 border-black shadow-[2px_2px_0px_#000000]',
    minimal: 'rounded-none bg-transparent hover:bg-white/[0.04] border border-white/[0.08]',
  }[currentTheme.archetype];

  const clockIconClass = {
    glass: 'rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-md border border-white/[0.06]',
    hud: 'rounded-none bg-black/90 border border-cyan-500/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]',
    brutalist: 'rounded-lg bg-[#181C26] border-2 border-black shadow-[3px_3px_0px_#000000]',
    minimal: 'rounded-none bg-transparent border border-white/[0.08]',
  }[currentTheme.archetype];

  return (
    <section 
      aria-label="System Overview Widget"
      className="w-full shrink-0 mb-3 select-none animate-in fade-in slide-in-from-top-1 duration-200"
    >
      {/* SINGLE UNIFIED WIDGET: Seamless Containerless Layout */}
      <div 
        onClick={() => {
          audio.playTap();
          launchApp('clock');
        }}
        className="group w-full py-2 px-1 sm:px-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer transition-all duration-200"
        title="Open Clock & System Information"
      >
        {/* LEFT: DATETIME (BIG) - FLOATING DIRECTLY ON CANVAS */}
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <div
            className={`w-11 h-11 ${clockIconClass} flex items-center justify-center shrink-0 group-hover:scale-105 transition-all`}
            style={{ color: currentAccent.hex }}
          >
            <Clock size={22} className="drop-shadow-sm" />
          </div>

          <div className="flex flex-col min-w-0 justify-center">
            {/* Big Digital Clock */}
            <div className="flex items-baseline gap-1 leading-none">
              <span className={`font-mono text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight ${currentTheme.classes.textPrimary} drop-shadow-md`}>
                {hours}:{minutes}
              </span>
              <span className={`font-mono text-xs sm:text-sm font-semibold ${currentTheme.classes.textMuted} tracking-wider drop-shadow-sm`}>
                :{seconds}
              </span>
            </div>

            {/* Date Display */}
            <div className={`flex items-center gap-1.5 text-xs sm:text-sm ${currentTheme.classes.textSecondary} mt-1 truncate drop-shadow-sm`}>
              <span className={`font-semibold ${currentTheme.classes.textPrimary}`}>{formattedDay}</span>
              <span className="opacity-40">•</span>
              <span className={`truncate ${currentTheme.classes.textSecondary}`}>{formattedDate}</span>
              {currentTheme.archetype === 'hud' && (
                <span className="text-[10px] text-cyan-400/80 font-mono ml-1 hidden md:inline">
                  [SYS//ON]
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: DEVICE NAME (SMALL) & BATTERY STATUS / PERCENTAGE (SMALL) */}
        <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 sm:gap-1.5 pt-1.5 sm:pt-0 shrink-0">
          {/* 1. Device Name (Small Subtle Pill) */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              audio.playTap();
              launchApp('settings');
            }}
            className={`flex items-center gap-1.5 ${pillStyleClass} px-3 py-1 text-xs ${currentTheme.classes.textSecondary} transition`}
            title="Connected Device Name"
          >
            <DeviceIcon size={13} style={{ color: currentAccent.hex }} />
            <span className={`text-[11px] sm:text-xs font-medium ${currentTheme.classes.textPrimary} max-w-[140px] sm:max-w-[180px] truncate`}>
              {deviceName}
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
              style={{ backgroundColor: currentAccent.hex }}
            />
          </div>

          {/* 2. Battery Status & Percentage Icons (Small Subtle Pill) */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              audio.playTap();
              launchApp('settings');
            }}
            className={`flex items-center gap-1.5 ${pillStyleClass} px-3 py-1 text-xs font-mono transition`}
            title={`Battery: ${batteryLevel}% ${isCharging ? '(Charging)' : '(On Battery)'}`}
          >
            {isCharging ? (
              <Zap size={13} className="text-[#F59E0B] fill-current animate-pulse shrink-0" />
            ) : (
              <Battery size={14} className={`${batteryColor} shrink-0`} />
            )}
            <span className={`text-[11px] sm:text-xs font-bold ${currentTheme.classes.textPrimary}`}>
              {batteryLevel}%
            </span>
            {isCharging && (
              <span className="text-[9px] text-[#F59E0B] font-semibold uppercase tracking-wider hidden sm:inline">
                Charging
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

