import React, { useRef, memo, useCallback } from 'react';
import { X } from 'lucide-react';
import { AppItem } from '../../types/launcher';
import { DynamicIcon } from '../common/DynamicIcon';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';

interface AppIconProps {
  app: AppItem;
  size?: 'normal' | 'dock' | 'list';
}

export const AppIcon: React.FC<AppIconProps> = memo(({ app, size = 'normal' }) => {
  const { launchApp, isEditing, setIsEditing, uninstallApp, settings } = useLauncher();
  const timerRef = useRef<number | null>(null);

  const handleTouchStart = useCallback(() => {
    timerRef.current = window.setTimeout(() => {
      audio.playTap();
      setIsEditing(true);
    }, 600);
  }, [setIsEditing]);

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) {
      return;
    }
    launchApp(app.id);
  }, [isEditing, launchApp, app.id]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    audio.playTap();
    setIsEditing(true);
  }, [setIsEditing]);

  const iconStyle = settings.iconStyle;

  // Icon container visual styling based on IconStyle preset
  const getIconClass = () => {
    const base = 'rounded-[1.75rem] transition-all duration-200 flex items-center justify-center relative shadow-xl border border-white/5';
    
    switch (iconStyle) {
      case 'material-you':
        return `${base} bg-[#1C1C1E] text-white hover:bg-[#2C2C2E]`;
      case 'monochrome':
        return `${base} bg-[#1C1C1E] text-[#F0F0F2] hover:bg-[#2C2C2E]`;
      case 'outline':
        return `${base} bg-[#1C1C1E]/80 border-2 border-[#4A4A4F] text-[#F0F0F2] hover:border-[#8E8E93]`;
      case 'neon':
        return `${base} bg-[#0A0A0C] border border-[#34C759]/60 text-[#34C759] shadow-lg shadow-[#34C759]/20`;
      case 'squircle-color':
        return `${base} text-white shadow-lg`;
      case 'minimal-text':
        return `${base} bg-[#1C1C1E] text-[#8E8E93] hover:text-[#F0F0F2]`;
      default:
        return `${base} bg-[#1C1C1E] text-white hover:bg-[#2C2C2E]`;
    }
  };

  const isSquircle = iconStyle === 'squircle-color';

  if (size === 'list') {
    return (
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#1C1C1E]/40 hover:bg-[#1C1C1E] border border-white/5 cursor-pointer active:scale-98 transition group mb-1.5"
      >
        <div className="flex items-center gap-3.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition"
            style={{ backgroundColor: app.color }}
          />
          <span className="text-sm font-medium text-[#F0F0F2] group-hover:text-white">
            {app.name}
          </span>
        </div>
        {settings.notificationBadges && (app.badgeCount ?? 0) > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-[#34C759] text-[#0A0A0C] font-bold text-[10px]">
            {app.badgeCount}
          </span>
        )}
      </div>
    );
  }

  const dimensions = size === 'dock' ? 'w-14 h-14 shrink-0' : 'w-14 h-14 shrink-0';

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      className={`flex flex-col items-center justify-start w-full min-w-[72px] max-w-[88px] relative cursor-pointer group active:scale-90 transition-transform select-none ${
        isEditing ? 'animate-wiggle' : ''
      }`}
    >
      {/* Edit Mode Delete Badge */}
      {isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            uninstallApp(app.id);
          }}
          className="absolute -top-1.5 right-1 w-5 h-5 rounded-full bg-[#FF3B30] text-white flex items-center justify-center shadow-md z-30 hover:scale-110 active:scale-90 transition"
        >
          <X size={12} strokeWidth={3} />
        </button>
      )}

      {/* Notification Dot Badge */}
      {!isEditing && settings.notificationBadges && (app.badgeCount ?? 0) > 0 && (
        <span className="absolute -top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-[#34C759] text-[#0A0A0C] font-bold text-[9px] flex items-center justify-center z-20 shadow-md">
          {app.badgeCount}
        </span>
      )}

      {/* Icon Body */}
      <div
        className={`${dimensions} ${size === 'dock' ? 'bg-[#2C2C2E] rounded-[1.5rem] flex items-center justify-center shadow-lg hover:bg-[#3A3A3C] transition-colors border border-white/5' : getIconClass()}`}
        style={isSquircle ? { backgroundColor: app.color } : {}}
      >
        {iconStyle === 'minimal-text' ? (
          <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] group-hover:text-white">
            {app.name.slice(0, 2)}
          </span>
        ) : (
          <div style={{ color: isSquircle ? '#FFFFFF' : app.color }}>
            <DynamicIcon name={app.iconName} size={22} strokeWidth={2.2} />
          </div>
        )}
      </div>

      {/* App Label */}
      {settings.showLabels && size !== 'dock' && (
        <span className="text-[11px] font-medium text-[#8E8E93] group-hover:text-[#F0F0F2] transition-colors mt-1.5 truncate w-full max-w-[76px] text-center tracking-tight leading-tight select-none">
          {app.name}
        </span>
      )}
    </div>
  );
});

AppIcon.displayName = 'AppIcon';

