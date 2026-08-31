import { describe, it, expect } from 'vitest';
import { getRegisteredIcon, ICON_REGISTRY } from './iconRegistry';
import { Settings, AppWindow, Smartphone, Tablet, Monitor } from 'lucide-react';

describe('iconRegistry', () => {
  it('should return the exact registered icon for PascalCase names', () => {
    const icon = getRegisteredIcon('Settings');
    expect(icon).toBeDefined();
    expect(icon.displayName || (icon as any).render?.name).toEqual(Settings.displayName || (Settings as any).render?.name);
  });

  it('should resolve kebab-case icon names to their PascalCase equivalents', () => {
    const phoneIcon = getRegisteredIcon('smartphone');
    expect(phoneIcon.displayName || (phoneIcon as any).render?.name).toEqual(Smartphone.displayName || (Smartphone as any).render?.name);

    const tabletIcon = getRegisteredIcon('tablet');
    expect(tabletIcon.displayName || (tabletIcon as any).render?.name).toEqual(Tablet.displayName || (Tablet as any).render?.name);

    const monitorIcon = getRegisteredIcon('monitor');
    expect(monitorIcon.displayName || (monitorIcon as any).render?.name).toEqual(Monitor.displayName || (Monitor as any).render?.name);
  });

  it('should return AppWindow fallback for unknown icon names or undefined', () => {
    const fallback1 = getRegisteredIcon(undefined);
    expect(fallback1.displayName || (fallback1 as any).render?.name).toEqual(AppWindow.displayName || (AppWindow as any).render?.name);

    const fallback2 = getRegisteredIcon('');
    expect(fallback2.displayName || (fallback2 as any).render?.name).toEqual(AppWindow.displayName || (AppWindow as any).render?.name);

    const fallback3 = getRegisteredIcon('NonExistentIconXYZ');
    expect(fallback3.displayName || (fallback3 as any).render?.name).toEqual(AppWindow.displayName || (AppWindow as any).render?.name);
  });

  it('should have key core system icons registered', () => {
    expect(ICON_REGISTRY['Settings']).toBeDefined();
    expect(ICON_REGISTRY['Terminal']).toBeDefined();
    expect(ICON_REGISTRY['Calculator']).toBeDefined();
    expect(ICON_REGISTRY['Folder']).toBeDefined();
    expect(ICON_REGISTRY['Search']).toBeDefined();
    expect(ICON_REGISTRY['Zap']).toBeDefined();
    expect(ICON_REGISTRY['Shield']).toBeDefined();
  });
});
