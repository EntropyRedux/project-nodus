import React, { useRef, memo, useCallback, useMemo } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { AppItem } from '../../types/launcher';
import { DynamicIcon } from '../common/DynamicIcon';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';
import { getSystemTheme, getAccentColor } from '../../utils/themes';

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
    openAppContextMenu,
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
      hasTriggeredDrag.current = true;
      setDraggedAppId(app.id);
      setDragPosition({ x: e.clientX, y: e.clientY });
      audio.playTap();
    } else {
      longPressTimerRef.current = window.setTimeout(() => {
        audio.playTap();
        openAppContextMenu(app.id, e.clientX, e.clientY);
        longPressTimerRef.current = null;
      }, 400);
    }
  }, [isEditing, app.id, setDraggedAppId, setDragPosition, size, openAppContextMenu]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointerStartPos.current || hasTriggeredDrag.current) return;
    const dist = Math.hypot(e.clientX - pointerStartPos.current.x, e.clientY - pointerStartPos.current.y);

    if (dist > 8) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerStartPos.current = null;
    hasTriggeredDrag.current = false;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) return;
    launchApp(app.id);
  }, [isEditing, launchApp, app.id]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openAppContextMenu(app.id, e.clientX, e.clientY);
  }, [app.id, openAppContextMenu]);

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  const iconStyle = settings.iconStyle;
  const iconSize = settings.iconSize || 'medium';

  const radiusByArchetype = {
    glass: {
      small: 'rounded-xl',
      medium: 'rounded-2xl',
      large: 'rounded-2xl',
      xlarge: 'rounded-[1.25rem]',
    },
    hud: {
      small: 'rounded-none',
      medium: 'rounded-none',
      large: 'rounded-none',
      xlarge: 'rounded-none',
    },
    brutalist: {
      small: 'rounded-md',
      medium: 'rounded-lg',
      large: 'rounded-xl',
      xlarge: 'rounded-xl',
    },
    minimal: {
      small: 'rounded-none',
      medium: 'rounded-none',
      large: 'rounded-none',
      xlarge: 'rounded-none',
    },
    material: {
      small: 'rounded-xl',
      medium: 'rounded-2xl',
      large: 'rounded-3xl',
      xlarge: 'rounded-[1.75rem]',
    },
  }[currentTheme.archetype];

  const sizeMap = {
    small: {
      box: `w-12 h-12 ${radiusByArchetype.small}`,
      img: 'w-7 h-7 rounded-lg',
      icon: 18,
      text: 'text-[10px] max-w-[64px]',
      wrapper: 'min-w-[60px] max-w-[74px]',
    },
    medium: {
      box: `w-14 h-14 ${radiusByArchetype.medium}`,
      img: 'w-9 h-9 rounded-xl',
      icon: 22,
      text: 'text-[11px] max-w-[78px]',
      wrapper: 'min-w-[72px] max-w-[88px]',
    },
    large: {
      box: `w-16 h-16 ${radiusByArchetype.large}`,
      img: 'w-11 h-11 rounded-xl',
      icon: 26,
      text: 'text-xs max-w-[90px]',
      wrapper: 'min-w-[80px] max-w-[100px]',
    },
    xlarge: {
      box: `w-20 h-20 ${radiusByArchetype.xlarge}`,
      img: 'w-14 h-14 rounded-xl',
      icon: 32,
      text: 'text-xs font-medium max-w-[104px]',
      wrapper: 'min-w-[92px] max-w-[115px]',
    },
  };

  const currentSize = size === 'dock' ? sizeMap.medium : sizeMap[iconSize];

  const getIconClass = () => {
    const base = `${currentSize.box} transition-all duration-200 flex items-center justify-center relative ${currentTheme.classes.iconBorder} ${currentTheme.classes.iconShadow}`;

    switch (iconStyle) {
      case 'material-you':
        return `${base} ${currentTheme.classes.iconBg} text-[#F1F5F9] ${currentTheme.classes.iconHover}`;
      case 'monochrome':
        return `${base} ${currentTheme.classes.iconBg} text-[#E2E8F0] ${currentTheme.classes.iconHover}`;
      case 'outline':
        return `${base} ${currentTheme.classes.iconBg} ${currentTheme.classes.iconHover}`;
      case 'neon':
        return `${base} ${currentTheme.classes.iconBg} ${currentTheme.classes.iconHover}`;
      case 'squircle-color':
        return `${base} text-white`;
      case 'minimal-text':
        return `${base} ${currentTheme.classes.iconBg} text-[#94A3B8] ${currentTheme.classes.iconHover}`;
      default:
        return `${base} ${currentTheme.classes.iconBg} text-white ${currentTheme.classes.iconHover}`;
    }
  };

  const isSquircle = iconStyle === 'squircle-color';
  const dockIconClass = `w-14 h-14 ${radiusByArchetype.medium} ${currentTheme.classes.iconBg} ${currentTheme.classes.iconBorder} ${currentTheme.classes.iconHover} ${currentTheme.classes.iconShadow} flex items-center justify-center transition-all duration-200`;

  if (size === 'list') {
    return (
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={`w-full flex items-center justify-between p-3 ${currentTheme.buttonRadius} ${currentTheme.classes.itemCard} cursor-pointer active:scale-98 transition group mb-1.5 shadow-sm`}
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
          <span className={`text-xs font-semibold ${settings.theme === 'material-light' ? 'text-[#1E293B] group-hover:text-[#0F172A]' : 'text-[#E2E8F0] group-hover:text-white'} truncate`}>
            {app.name}
          </span>
        </div>
        {settings.notificationBadges && unreadCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-[#F43F5E] text-white font-mono font-bold text-[10px] shadow-sm">
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
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`flex flex-col items-center justify-start w-full ${currentSize.wrapper} relative cursor-pointer group active:scale-95 transition-all select-none ${
        isEditing ? 'animate-wiggle touch-none' : ''
      } ${draggedAppId === app.id ? 'opacity-20 scale-90 pointer-events-none' : ''}`}
    >
      <div className="relative">
        <div
          className={`${size === 'dock' ? dockIconClass : getIconClass()} ${
            hoverTargetAppId === app.id ? 'ring-2 ring-[#38BDF8] scale-110 shadow-[0_0_20px_rgba(56,189,248,0.5)] bg-[#38BDF8]/10' : ''
          }`}
          style={
            isSquircle
              ? { backgroundColor: app.color }
              : iconStyle === 'neon'
              ? { borderColor: `${currentAccent.hex}99`, boxShadow: `0 0 15px ${currentAccent.glowRgba}` }
              : iconStyle === 'material-you'
              ? { borderColor: `${currentAccent.hex}55` }
              : {}
          }
        >
          {app.customIcon ? (
            <img
              src={app.customIcon}
              alt={app.name}
              className={`${currentSize.img} object-contain drop-shadow pointer-events-none`}
              loading="lazy"
            />
          ) : iconStyle === 'minimal-text' ? (
            <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] group-hover:text-white font-mono">
              {app.name.slice(0, 2)}
            </span>
          ) : (
            <div style={{ color: isSquircle ? '#FFFFFF' : iconStyle === 'neon' ? currentAccent.hex : iconStyle === 'monochrome' ? (settings.theme === 'material-light' ? '#334155' : '#E2E8F0') : app.color || currentAccent.hex }}>
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
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#F43F5E] text-white flex items-center justify-center shadow-md z-30 hover:scale-110 active:scale-90 transition border-2 border-[#090B10]"
            title={`Uninstall ${app.name}`}
          >
            <X size={11} strokeWidth={3} />
          </button>
        )}

        {/* Notification Dot / Counter Badge */}
        {!isEditing && settings.notificationBadges && unreadCount > 0 && (
          <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F43F5E] text-white font-mono font-extrabold text-[9px] flex items-center justify-center z-30 shadow-lg border-2 border-[#090B10] pointer-events-none leading-none animate-in zoom-in duration-150">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}

        {/* Drop Target Indicator */}
        {hoverTargetAppId === app.id && (
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#38BDF8] text-[#090B10] flex items-center justify-center shadow-lg z-40 animate-bounce">
            <FolderPlus size={13} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* App Label */}
      {settings.showLabels && size !== 'dock' && (
        <span className={`${currentSize.text} desktop-icon-label transition-all mt-1.5 truncate w-full text-center tracking-tight leading-tight select-none`}>
          {app.name}
        </span>
      )}
    </div>
  );
});

AppIcon.displayName = 'AppIcon';
