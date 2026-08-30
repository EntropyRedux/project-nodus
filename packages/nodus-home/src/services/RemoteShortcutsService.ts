/**
 * Nodus Home — Remote Shortcuts & Icon Service
 * Handles fetching shared shortcuts from Nodus Desktop and Win32 icon extraction.
 */

import { universalNetworkFetch } from './FleetDirectClient';
import { RemoteExecutable } from '../types/launcher';

function normalizeHost(deviceIp: string, defaultPort = 9120): string {
  if (!deviceIp) return '';
  const clean = deviceIp.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
  if (clean.includes(':')) {
    return clean;
  }
  return `${clean}:${defaultPort}`;
}

export function inferLucideIcon(name: string, pathOrAppId: string): { iconName: string; iconColor: string } {
  const lower = `${name} ${pathOrAppId}`.toLowerCase();

  // 1. Code & Development
  if (
    lower.includes('code') ||
    lower.includes('studio') ||
    lower.includes('cursor') ||
    lower.includes('sublime') ||
    lower.includes('idea') ||
    lower.includes('pycharm') ||
    lower.includes('clion') ||
    lower.includes('webstorm') ||
    lower.includes('rider') ||
    lower.includes('git') ||
    lower.includes('vim') ||
    lower.includes('developer')
  ) {
    return { iconName: 'Code', iconColor: '#0EA5E9' };
  }

  // 2. Terminal & CLI
  if (
    lower.includes('terminal') ||
    lower.includes('powershell') ||
    lower.includes('cmd') ||
    lower.includes('prompt') ||
    lower.includes('bash') ||
    lower.includes('wsl') ||
    lower.includes('console')
  ) {
    return { iconName: 'Terminal', iconColor: '#22C55E' };
  }

  // 3. Web Browsers & Internet
  if (
    lower.includes('chrome') ||
    lower.includes('brave') ||
    lower.includes('edge') ||
    lower.includes('firefox') ||
    lower.includes('browser') ||
    lower.includes('opera') ||
    lower.includes('vivaldi') ||
    lower.includes('internet')
  ) {
    return { iconName: 'Globe', iconColor: '#38BDF8' };
  }

  // 4. AI & GenAI
  if (
    lower.includes('antigravity') ||
    lower.includes('ai') ||
    lower.includes('gpt') ||
    lower.includes('claude') ||
    lower.includes('copilot') ||
    lower.includes('gemini') ||
    lower.includes('ollama') ||
    lower.includes('llm')
  ) {
    return { iconName: 'Sparkles', iconColor: '#A855F7' };
  }

  // 5. Screen Capture, OCR, Camera
  if (
    lower.includes('capture') ||
    lower.includes('ocr') ||
    lower.includes('camera') ||
    lower.includes('snip') ||
    lower.includes('screenshot') ||
    lower.includes('scan') ||
    lower.includes('lens')
  ) {
    return { iconName: 'Camera', iconColor: '#F43F5E' };
  }

  // 6. Messaging & Communication
  if (
    lower.includes('discord') ||
    lower.includes('slack') ||
    lower.includes('telegram') ||
    lower.includes('whatsapp') ||
    lower.includes('teams') ||
    lower.includes('messenger') ||
    lower.includes('chat') ||
    lower.includes('signal')
  ) {
    return { iconName: 'MessageSquare', iconColor: '#6366F1' };
  }

  // 7. Audio & Music
  if (
    lower.includes('spotify') ||
    lower.includes('music') ||
    lower.includes('sound') ||
    lower.includes('audio') ||
    lower.includes('itunes') ||
    lower.includes('podcast') ||
    lower.includes('tidal') ||
    lower.includes('audacity')
  ) {
    return { iconName: 'Music', iconColor: '#10B981' };
  }

  // 8. Video & Media Players
  if (
    lower.includes('video') ||
    lower.includes('vlc') ||
    lower.includes('netflix') ||
    lower.includes('youtube') ||
    lower.includes('obs') ||
    lower.includes('stream') ||
    lower.includes('premiere') ||
    lower.includes('davinci') ||
    lower.includes('film') ||
    lower.includes('player')
  ) {
    return { iconName: 'Film', iconColor: '#EF4444' };
  }

  // 9. Gaming & Stores
  if (
    lower.includes('steam') ||
    lower.includes('game') ||
    lower.includes('epic') ||
    lower.includes('xbox') ||
    lower.includes('minecraft') ||
    lower.includes('roblox') ||
    lower.includes('riot') ||
    lower.includes('valorant') ||
    lower.includes('play')
  ) {
    return { iconName: 'Gamepad2', iconColor: '#F97316' };
  }

  // 10. Documents & Office
  if (
    lower.includes('word') ||
    lower.includes('excel') ||
    lower.includes('powerpoint') ||
    lower.includes('office') ||
    lower.includes('pdf') ||
    lower.includes('acrobat') ||
    lower.includes('notion') ||
    lower.includes('obsidian') ||
    lower.includes('notes') ||
    lower.includes('onenote') ||
    lower.includes('docs')
  ) {
    return { iconName: 'FileText', iconColor: '#3B82F6' };
  }

  // 11. Creative & Drawing
  if (
    lower.includes('contextpad') ||
    lower.includes('draw') ||
    lower.includes('paint') ||
    lower.includes('canvas') ||
    lower.includes('photoshop') ||
    lower.includes('figma') ||
    lower.includes('illustrator') ||
    lower.includes('blender') ||
    lower.includes('gimp') ||
    lower.includes('design')
  ) {
    return { iconName: 'PenTool', iconColor: '#EC4899' };
  }

  // 12. Process Manager & HW Monitor
  if (
    lower.includes('taskmgr') ||
    lower.includes('manager') ||
    lower.includes('process') ||
    lower.includes('monitor') ||
    lower.includes('afterburner') ||
    lower.includes('hwmonitor') ||
    lower.includes('cpu') ||
    lower.includes('gpu') ||
    lower.includes('activity')
  ) {
    return { iconName: 'Activity', iconColor: '#06B6D4' };
  }

  // 13. Folders & Explorer
  if (
    lower.includes('explorer') ||
    lower.includes('file') ||
    lower.includes('folder') ||
    lower.includes('7-zip') ||
    lower.includes('winrar') ||
    lower.includes('zip')
  ) {
    return { iconName: 'Folder', iconColor: '#EAB308' };
  }

  // 14. Database
  if (
    lower.includes('database') ||
    lower.includes('sql') ||
    lower.includes('mysql') ||
    lower.includes('postgres') ||
    lower.includes('mongo') ||
    lower.includes('redis') ||
    lower.includes('dbeaver')
  ) {
    return { iconName: 'Database', iconColor: '#8B5CF6' };
  }

  // 15. Security & VPN
  if (
    lower.includes('security') ||
    lower.includes('antivirus') ||
    lower.includes('defender') ||
    lower.includes('vpn') ||
    lower.includes('password') ||
    lower.includes('bitwarden') ||
    lower.includes('1password') ||
    lower.includes('keepass')
  ) {
    return { iconName: 'Shield', iconColor: '#14B8A6' };
  }

  // 16. Mail
  if (
    lower.includes('mail') ||
    lower.includes('outlook') ||
    lower.includes('thunderbird') ||
    lower.includes('email')
  ) {
    return { iconName: 'Mail', iconColor: '#0284C7' };
  }

  // 17. Cloud & Storage
  if (
    lower.includes('cloud') ||
    lower.includes('drive') ||
    lower.includes('dropbox') ||
    lower.includes('onedrive') ||
    lower.includes('sync')
  ) {
    return { iconName: 'Cloud', iconColor: '#38BDF8' };
  }

  // 18. Calculator
  if (lower.includes('calc') || lower.includes('math')) {
    return { iconName: 'Calculator', iconColor: '#F97316' };
  }

  // 19. Settings
  if (
    lower.includes('setting') ||
    lower.includes('config') ||
    lower.includes('control') ||
    lower.includes('panel')
  ) {
    return { iconName: 'Settings', iconColor: '#94A3B8' };
  }

  // Default fallback
  return { iconName: 'AppWindow', iconColor: '#38BDF8' };
}

export async function fetchRemoteShortcuts(
  deviceIp: string,
  timeoutMs = 4000
): Promise<RemoteExecutable[]> {
  if (!deviceIp) return [];

  try {
    const host = normalizeHost(deviceIp, 9120);
    const url = `http://${host}/api/shortcuts`;

    console.log(`[RemoteShortcutsService] Fetching shortcuts from: ${url}`);
    const res = await universalNetworkFetch(url, {
      method: 'GET',
      timeoutMs,
    });

    if (res.ok && res.data && Array.isArray(res.data.shortcuts)) {
      return res.data.shortcuts.map((s: any, idx: number) => {
        const fallback = inferLucideIcon(s.name || '', s.path_or_appid || '');
        return {
          id: s.id || `remote_${idx}`,
          deviceId: 'this-pc',
          deviceName: 'This PC',
          deviceType: 'desktop' as const,
          deviceOs: 'windows' as const,
          name: s.name || 'App',
          category: s.category || 'tools',
          iconName: s.icon_name || fallback.iconName,
          iconColor: s.icon_color || fallback.iconColor,
          iconBase64: s.icon_base64,
          execType: 'command' as const,
          commandOrPackage: s.path_or_appid,
          enabled: true,
          pinnedToDrawer: true,
        };
      });
    }
  } catch (err) {
    console.warn('[RemoteShortcutsService] Failed to fetch remote shortcuts:', err);
  }

  return [];
}

export async function fetchRemoteShortcutIcon(
  deviceIp: string,
  exePath: string,
  timeoutMs = 3500
): Promise<string | null> {
  if (!deviceIp || !exePath) return null;

  try {
    const host = normalizeHost(deviceIp, 9120);
    const url = `http://${host}/api/shortcuts/icon`;
    
    const res = await universalNetworkFetch(url, {
      method: 'POST',
      body: { path: exePath },
      timeoutMs,
    });

    if (res.ok && res.data?.status === 'success' && res.data?.icon) {
      return res.data.icon;
    }
  } catch (err) {
    console.warn('[RemoteShortcutsService] Failed to extract icon for:', exePath, err);
  }

  return null;
}
