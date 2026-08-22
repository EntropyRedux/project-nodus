import React, { useRef, memo, useCallback, useState, useMemo } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { AppItem } from '../../types/launcher';
import { DynamicIcon } from '../common/DynamicIcon';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';

interface AppIconProps {
  app: AppItem;
  size?: 'normal' | 'dock' | 'list';
}

export const AppIcon: React.FC<AppIconProps> = memo(({ app, size = 'normal' }) => {
  const { 
    launchApp, 
    isEditing, 
    setIsEditing, 
    uninstallApp, 
    createFolderFromApps, 
    addAppToFolder,
    moveApp,
    draggedAppId,
    setDraggedAppId,
    setDragPosition,
    hoverTargetAppId,
    settings, 
    showConfirm,
    notifications,
    appBadges,
  } = useLauncher();

  const pointerStartPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const hasTriggeredDrag = useRef<boolean>(false);

  const unreadCount = useMemo(() => {
    if (app.packageName && typeof appBadges[app.packageName] === 'number') {
      return appBadges[app.packageName];
    }
    const directMatches = notifications.filter(
      (n) => !n.read && (n.appId === app.id || (app.packageName && n.packageName === app.packageName))
    ).length;
    return directMatches > 0 ? directMatches : (app.badgeCount ?? 0);
  }, [appBadges, notifications, app.id, app.packageName, app.badgeCount]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (size === 'dock') return;
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    hasTriggeredDrag.current = false;

    if (isEditing) {
      // In Arrange mode: instantly arm dragged item on pointer down
      hasTriggeredDrag.current = true;
      setDraggedAppId(app.id);
      setDragPosition({ x: e.clientX, y: e.clientY });
      audio.playTap();
    } else {
      // In Normal mode: 350ms long-press enters arrange mode and starts drag
      longPressTimerRef.current = window.setTimeout(() => {
        audio.playTap();
        setIsEditing(true);
        hasTriggeredDrag.current = true;
        setDraggedAppId(app.id);
        setDragPosition({ x: e.clientX, y: e.clientY });
        longPressTimerRef.current = null;
      }, 350);
    }
  }, [isEditing, setIsEditing, app.id, setDraggedAppId, setDragPosition, size]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointerStartPos.current || hasTriggeredDrag.current) return;
    const dist = Math.hypot(e.clientX - pointerStartPos.current.x, e.clientY - pointerStartPos.current.y);

    if (dist > 8) {
      // Cancel long press if user is scrolling in normal mode
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!hasTriggeredDrag.current && pointerStartPos.current) {
      const dist = Math.hypot(e.clientX - pointerStartPos.current.x, e.clientY - pointerStartPos.current.y);
      if (dist <= 8) {
        if (!isEditing) {
          launchApp(app.id);
        }
      }
    }
    pointerStartPos.current = null;
    hasTriggeredDrag.current = false;
  }, [isEditing, launchApp, app.id]);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerStartPos.current = null;
    hasTriggeredDrag.current = false;
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
  }, []);

  const iconStyle = settings.iconStyle;
  const iconSize = settings.iconSize || 'medium';

  // Dynamic dimension mapping based on icon size setting
  const sizeMap = {
    small: {
      box: 'w-12 h-12 rounded-[1.25rem]',
      img: 'w-7 h-7 rounded-lg',
      icon: 18,
      text: 'text-[10px] max-w-[64px]',
      wrapper: 'min-w-[60px] max-w-[74px]',
    },
    medium: {
      box: 'w-14 h-14 rounded-[1.5rem]',
      img: 'w-9 h-9 rounded-xl',
      icon: 22,
      text: 'text-[11px] max-w-[78px]',
      wrapper: 'min-w-[72px] max-w-[88px]',
    },
    large: {
      box: 'w-16 h-16 rounded-[1.75rem]',
      img: 'w-11 h-11 rounded-2xl',
      icon: 26,
      text: 'text-xs max-w-[90px]',
      wrapper: 'min-w-[80px] max-w-[100px]',
    },
    xlarge: {
      box: 'w-20 h-20 rounded-[2rem]',
      img: 'w-14 h-14 rounded-2xl',
      icon: 32,
      text: 'text-xs font-medium max-w-[104px]',
      wrapper: 'min-w-[92px] max-w-[115px]',
    },
  };

  const currentSize = size === 'dock' ? sizeMap.medium : sizeMap[iconSize];

  // Icon container visual styling based on IconStyle preset
  const getIconClass = () => {
    const base = `${currentSize.box} transition-all duration-200 flex items-center justify-center relative shadow-xl border border-white/5`;
    
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
        <div className="flex items-center gap-3.5 min-w-0">
          {app.customIcon ? (
            <img src={app.customIcon} alt={app.name} className="w-6 h-6 object-contain rounded-lg shrink-0" />
          ) : (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition"
              style={{ backgroundColor: app.color }}
            />
          )}
          <span className="text-sm font-medium text-[#F0F0F2] group-hover:text-white truncate">
            {app.name}
          </span>
        </div>
        {settings.notificationBadges && unreadCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-[#FF3B30] text-white font-bold text-[10px] shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      data-app-id={app.id}
      draggable={false}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`flex flex-col items-center justify-start w-full ${currentSize.wrapper} relative cursor-pointer group active:scale-95 transition-all select-none ${
        isEditing ? 'animate-wiggle touch-none' : ''
      } ${draggedAppId === app.id ? 'opacity-20 scale-90 pointer-events-none' : ''}`}
    >
      {/* Icon Body Container with Positioned Badges */}
      <div className="relative">
        <div
          className={`${size === 'dock' ? 'w-14 h-14 rounded-[1.5rem] bg-[#2C2C2E] flex items-center justify-center shadow-lg hover:bg-[#3A3A3C] transition-colors border border-white/5' : getIconClass()} ${
            hoverTargetAppId === app.id ? 'ring-4 ring-[#34C759] scale-110 shadow-2xl shadow-[#34C759]/50 bg-[#34C759]/10' : ''
          }`}
          style={isSquircle ? { backgroundColor: app.color } : {}}
        >
          {app.customIcon ? (
            <img
              src={app.customIcon}
              alt={app.name}
              className={`${currentSize.img} object-contain drop-shadow pointer-events-none`}
              loading="lazy"
            />
          ) : iconStyle === 'minimal-text' ? (
            <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] group-hover:text-white">
              {app.name.slice(0, 2)}
            </span>
          ) : (
            <div style={{ color: isSquircle ? '#FFFFFF' : app.color }}>
              <DynamicIcon name={app.iconName} size={currentSize.icon} strokeWidth={2.2} />
            </div>
          )}
        </div>

        {/* Edit Mode Delete Badge */}
        {isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              audio.playTap();
              showConfirm(
                `Uninstall ${app.name}?`,
                `Do you want to uninstall or remove "${app.name}" from your device?`,
                () => uninstallApp(app.id),
                'Uninstall',
                true
              );
            }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#FF3B30] text-white flex items-center justify-center shadow-md z-30 hover:scale-110 active:scale-90 transition border-2 border-[#0A0A0C]"
            title={`Uninstall ${app.name}`}
          >
            <X size={11} strokeWidth={3} />
          </button>
        )}

        {/* Notification Dot / Counter Badge */}
        {!isEditing && settings.notificationBadges && unreadCount > 0 && (
          <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#FF3B30] text-white font-extrabold text-[10px] flex items-center justify-center z-30 shadow-lg border-2 border-[#0A0A0C] pointer-events-none leading-none animate-in zoom-in duration-150">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}

        {/* Drop Target Indicator when an app is hovered over this slot */}
        {hoverTargetAppId === app.id && (
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#34C759] text-[#0A0A0C] flex items-center justify-center shadow-lg z-40 animate-bounce">
            <FolderPlus size={13} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* App Label */}
      {settings.showLabels && size !== 'dock' && (
        <span className={`${currentSize.text} font-medium text-[#8E8E93] group-hover:text-[#F0F0F2] transition-colors mt-1.5 truncate w-full text-center tracking-tight leading-tight select-none`}>
          {app.name}
        </span>
      )}
    </div>
  );
});

AppIcon.displayName = 'AppIcon';
