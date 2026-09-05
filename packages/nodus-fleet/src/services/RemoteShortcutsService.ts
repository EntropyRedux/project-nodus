/**
 * Nodus Fleet — Remote Shortcuts & Icon Service
 * Handles fetching shared shortcuts from companion Nodus Desktop nodes and Win32 icon extraction.
 */

import { universalNetworkFetch } from './FleetDirectClient';

export interface RemoteExecutable {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'laptop' | 'tablet' | 'phone';
  deviceOs: string;
  name: string;
  category: string;
  iconName: string;
  iconColor: string;
  iconBase64?: string;
  execType: 'command';
  commandOrPackage: string;
  enabled: boolean;
}

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

    const res = await universalNetworkFetch(url, {
      method: 'GET',
      timeoutMs,
    });

    if (res.ok && res.data && Array.isArray(res.data.shortcuts)) {
      return res.data.shortcuts.map((s: any, idx: number) => {
        const fallback = inferLucideIcon(s.name || '', s.path_or_appid || '');
        return {
          id: s.id || `remote_${idx}`,
          deviceId: 'remote-pc',
          deviceName: 'Remote PC Host',
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
        };
      });
    }
  } catch (err) {
    console.warn('[RemoteShortcutsService] Failed to fetch remote shortcuts:', err);
  }

  return [];
}
