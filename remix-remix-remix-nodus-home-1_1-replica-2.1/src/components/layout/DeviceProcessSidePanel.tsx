import React, { useState, useMemo, useEffect } from 'react';
import { 
  Activity, 
  X, 
  RotateCcw, 
  Skull, 
  Search, 
  Cpu, 
  HardDrive, 
  Check, 
  Terminal, 
  Play, 
  Flame,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ChevronsDownUp,
  Globe,
  Code,
  Music,
  MessageCircle,
  Layers,
  Folder,
  Box,
  Shield,
  Smartphone,
  Monitor,
  AppWindow,
  Sliders,
  Sparkles,
  Layers2
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';
import { DeviceProcess } from '../../types/launcher';

interface ProcessAppGroup {
  appKey: string;
  appName: string;
  iconName: string;
  iconColor: string;
  section: 'apps' | 'background' | 'system';
  category: string;
  totalCpu: number;
  totalMemoryMb: number;
  processCount: number;
  pids: number[];
  processes: DeviceProcess[];
}

// Intelligent process-to-application resolver
function resolveAppInfo(proc: DeviceProcess): {
  appKey: string;
  appName: string;
  iconName: string;
  iconColor: string;
  section: 'apps' | 'background' | 'system';
} {
  const nameLower = (proc.appName || proc.name || '').toLowerCase();
  const rawName = (proc.name || '').toLowerCase();

  // 1. Google Chrome / Web Browsers
  if (nameLower.includes('chrome') || rawName.includes('chrome') || rawName.includes('chromium')) {
    return {
      appKey: 'chrome',
      appName: 'Google Chrome',
      iconName: 'Globe',
      iconColor: '#38BDF8',
      section: 'apps',
    };
  }

  // 2. Visual Studio Code
  if (nameLower.includes('visual studio code') || nameLower.includes('vscode') || rawName.includes('code.exe') || rawName.includes('code')) {
    return {
      appKey: 'vscode',
      appName: 'Visual Studio Code',
      iconName: 'Code',
      iconColor: '#38BDF8',
      section: 'apps',
    };
  }

  // 3. Spotify
  if (nameLower.includes('spotify') || rawName.includes('spotify')) {
    return {
      appKey: 'spotify',
      appName: 'Spotify',
      iconName: 'Music',
      iconColor: '#10B981',
      section: 'apps',
    };
  }

  // 4. Discord
  if (nameLower.includes('discord') || rawName.includes('discord')) {
    return {
      appKey: 'discord',
      appName: 'Discord',
      iconName: 'MessageCircle',
      iconColor: '#6366F1',
      section: 'apps',
    };
  }

  // 5. Figma
  if (nameLower.includes('figma') || rawName.includes('figma')) {
    return {
      appKey: 'figma',
      appName: 'Figma',
      iconName: 'Sparkles',
      iconColor: '#F43F5E',
      section: 'apps',
    };
  }

  // 6. Terminal / Shells / iTerm
  if (nameLower.includes('iterm') || rawName.includes('iterm') || rawName.includes('zsh') || rawName.includes('bash') || rawName.includes('cmd.exe') || rawName.includes('powershell')) {
    return {
      appKey: 'terminal',
      appName: 'Terminal Shell',
      iconName: 'Terminal',
      iconColor: '#10B981',
      section: 'apps',
    };
  }

  // 7. Nodus Home Launcher
  if (nameLower.includes('nodus home') || rawName.includes('com.nodus.launcher')) {
    return {
      appKey: 'nodus-home',
      appName: 'Nodus Home Workstation',
      iconName: 'Monitor',
      iconColor: '#38BDF8',
      section: 'apps',
    };
  }

  // 8. Docker Desktop
  if (nameLower.includes('docker') || rawName.includes('docker') || rawName.includes('containerd')) {
    return {
      appKey: 'docker',
      appName: 'Docker Desktop',
      iconName: 'Box',
      iconColor: '#06B6D4',
      section: 'background',
    };
  }

  // 9. Android Debug Bridge (ADB)
  if (nameLower.includes('adb') || rawName.includes('adb.exe') || rawName.includes('adb')) {
    return {
      appKey: 'adb',
      appName: 'Android Debug Bridge',
      iconName: 'Smartphone',
      iconColor: '#10B981',
      section: 'background',
    };
  }

  // 10. Nodus Mesh / Daemon Services
  if (nameLower.includes('nodus') || rawName.includes('nodus-daemon') || rawName.includes('nodus_bridge') || rawName.includes('nodusagent') || rawName.includes('nodus_fleet')) {
    return {
      appKey: 'nodus-mesh',
      appName: 'Nodus Mesh Sync Services',
      iconName: 'Activity',
      iconColor: '#A855F7',
      section: 'background',
    };
  }

  // 11. Google Play Services
  if (nameLower.includes('google play') || rawName.includes('com.google.android.gms')) {
    return {
      appKey: 'gms',
      appName: 'Google Play Services',
      iconName: 'Layers',
      iconColor: '#38BDF8',
      section: 'background',
    };
  }

  // 12. Windows Explorer
  if (nameLower.includes('explorer') || rawName.includes('explorer.exe')) {
    return {
      appKey: 'explorer',
      appName: 'Windows Explorer',
      iconName: 'Folder',
      iconColor: '#F59E0B',
      section: 'system',
    };
  }

  // 13. System UI (Android)
  if (nameLower.includes('system ui') || rawName.includes('com.android.systemui')) {
    return {
      appKey: 'systemui',
      appName: 'System UI & Status Bar',
      iconName: 'Sliders',
      iconColor: '#F59E0B',
      section: 'system',
    };
  }

  // 14. Android Core / System Server
  if (nameLower.includes('system_server') || rawName.includes('system_server')) {
    return {
      appKey: 'system_server',
      appName: 'Android System Server',
      iconName: 'Shield',
      iconColor: '#F43F5E',
      section: 'system',
    };
  }

  // Generic / Default Fallback
  const cleanName = proc.appName || proc.name.replace(/\.(exe|app|sh|bin)$/i, '');
  const section: 'apps' | 'background' | 'system' = 
    proc.category === 'user' ? 'apps' :
    proc.category === 'system' ? 'system' : 'background';

  return {
    appKey: cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    appName: cleanName,
    iconName: section === 'apps' ? 'AppWindow' : section === 'system' ? 'Shield' : 'Cpu',
    iconColor: section === 'apps' ? '#38BDF8' : section === 'system' ? '#F59E0B' : '#A855F7',
    section,
  };
}

// Icon rendering helper
const renderAppIcon = (iconName: string, color: string, size = 13) => {
  switch (iconName) {
    case 'Globe': return <Globe size={size} style={{ color }} />;
    case 'Code': return <Code size={size} style={{ color }} />;
    case 'Music': return <Music size={size} style={{ color }} />;
    case 'MessageCircle': return <MessageCircle size={size} style={{ color }} />;
    case 'Terminal': return <Terminal size={size} style={{ color }} />;
    case 'Monitor': return <Monitor size={size} style={{ color }} />;
    case 'Box': return <Box size={size} style={{ color }} />;
    case 'Smartphone': return <Smartphone size={size} style={{ color }} />;
    case 'Activity': return <Activity size={size} style={{ color }} />;
    case 'Layers': return <Layers size={size} style={{ color }} />;
    case 'Folder': return <Folder size={size} style={{ color }} />;
    case 'Sliders': return <Sliders size={size} style={{ color }} />;
    case 'Shield': return <Shield size={size} style={{ color }} />;
    case 'Sparkles': return <Sparkles size={size} style={{ color }} />;
    case 'Cpu': return <Cpu size={size} style={{ color }} />;
    default: return <AppWindow size={size} style={{ color }} />;
  }
};

export const DeviceProcessSidePanel: React.FC = () => {
  const { 
    devices, 
    deviceProcesses, 
    processModalDeviceId, 
    closeProcessManager, 
    killProcess, 
    killProcessGroup,
    killAllUserProcesses, 
    rebootDevice,
    settings 
  } = useLauncher();

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);
  const isLight = settings.theme === 'material-light';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<'all' | 'apps' | 'background' | 'system'>('all');
  const [sortBy, setSortBy] = useState<'cpu' | 'memory' | 'name' | 'count'>('cpu');
  const [customCommand, setCustomCommand] = useState('');
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
  
  // Track expanded state for each app group (Windows Task Manager style)
  const [expandedApps, setExpandedApps] = useState<Record<string, boolean>>({
    'chrome': true,
    'vscode': true,
    'spotify': false,
    'nodus-home': true,
  });

  const isOpen = Boolean(processModalDeviceId);
  const currentDevice = devices.find((d) => d.id === processModalDeviceId);
  const processes: DeviceProcess[] = processModalDeviceId ? (deviceProcesses[processModalDeviceId] || []) : [];

  // Group processes by Application
  const appGroups = useMemo(() => {
    const map = new Map<string, ProcessAppGroup>();

    processes.forEach((proc) => {
      const info = resolveAppInfo(proc);
      const key = info.appKey;

      if (!map.has(key)) {
        map.set(key, {
          appKey: key,
          appName: info.appName,
          iconName: info.iconName,
          iconColor: info.iconColor,
          section: info.section,
          category: proc.category,
          totalCpu: 0,
          totalMemoryMb: 0,
          processCount: 0,
          pids: [],
          processes: [],
        });
      }

      const group = map.get(key)!;
      group.totalCpu += proc.cpu;
      group.totalMemoryMb += proc.memoryMb;
      group.processCount += 1;
      group.pids.push(proc.pid);
      group.processes.push(proc);
    });

    return Array.from(map.values());
  }, [processes]);

  // Filter & Search
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return appGroups.filter((group) => {
      const matchesSection = selectedSection === 'all' || group.section === selectedSection;
      
      if (!q) return matchesSection;

      const groupMatches = 
        group.appName.toLowerCase().includes(q) ||
        group.processes.some(
          (p) => 
            p.name.toLowerCase().includes(q) || 
            p.pid.toString().includes(q) || 
            (p.description && p.description.toLowerCase().includes(q)) ||
            p.user.toLowerCase().includes(q)
        );

      return matchesSection && groupMatches;
    });
  }, [appGroups, searchQuery, selectedSection]);

  // Auto-expand groups when user searches so matched sub-processes are immediately visible
  useEffect(() => {
    if (searchQuery.trim()) {
      const allExpanded: Record<string, boolean> = {};
      filteredGroups.forEach((g) => {
        allExpanded[g.appKey] = true;
      });
      setExpandedApps((prev) => ({ ...prev, ...allExpanded }));
    }
  }, [searchQuery, filteredGroups]);

  // Sort groups
  const sortedGroups = useMemo(() => {
    return [...filteredGroups].sort((a, b) => {
      if (sortBy === 'cpu') return b.totalCpu - a.totalCpu;
      if (sortBy === 'memory') return b.totalMemoryMb - a.totalMemoryMb;
      if (sortBy === 'count') return b.processCount - a.processCount;
      if (sortBy === 'name') return a.appName.localeCompare(b.appName);
      return 0;
    });
  }, [filteredGroups, sortBy]);

  // Breakdown by sections
  const appsSection = useMemo(() => sortedGroups.filter((g) => g.section === 'apps'), [sortedGroups]);
  const backgroundSection = useMemo(() => sortedGroups.filter((g) => g.section === 'background'), [sortedGroups]);
  const systemSection = useMemo(() => sortedGroups.filter((g) => g.section === 'system'), [sortedGroups]);

  // Global Hardware Summary Stats
  const totalRamUsedMb = useMemo(
    () => processes.reduce((acc, p) => acc + p.memoryMb, 0),
    [processes]
  );
  const totalCpuUsed = useMemo(
    () => Math.min(100, Math.round(processes.reduce((acc, p) => acc + p.cpu, 0))),
    [processes]
  );
  const userProcessesCount = useMemo(
    () => processes.filter((p) => p.category === 'user').length,
    [processes]
  );

  const toggleGroupExpand = (appKey: string) => {
    audio.playTap();
    setExpandedApps((prev) => ({
      ...prev,
      [appKey]: !prev[appKey],
    }));
  };

  const handleToggleAllExpand = () => {
    audio.playTap();
    const hasCollapsed = sortedGroups.some((g) => !expandedApps[g.appKey]);
    const newState: Record<string, boolean> = {};
    sortedGroups.forEach((g) => {
      newState[g.appKey] = hasCollapsed;
    });
    setExpandedApps(newState);
  };

  const handleExecuteCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCommand.trim() || !currentDevice) return;

    audio.playTap();
    const cmd = customCommand.trim().toLowerCase();

    if (cmd === 'reboot' || cmd === 'adb reboot' || cmd === 'shutdown -r -t 0') {
      rebootDevice(currentDevice.id);
      setCommandFeedback(`Executing reboot on ${currentDevice.name}...`);
    } else if (cmd.startsWith('kill') || cmd.startsWith('taskkill')) {
      const parts = cmd.split(' ');
      const targetPidStr = parts.find((part) => !isNaN(Number(part)) && part !== '-9' && part !== '/f');
      if (targetPidStr) {
        const pidNum = parseInt(targetPidStr, 10);
        killProcess(currentDevice.id, pidNum);
        setCommandFeedback(`Signal SIGKILL sent to PID ${pidNum}`);
      } else {
        setCommandFeedback(`Usage: kill <pid> or taskkill /F /PID <pid>`);
      }
    } else if (cmd === 'clear' || cmd === 'pkill -u user') {
      killAllUserProcesses(currentDevice.id);
      setCommandFeedback(`Killed all non-system user tasks.`);
    } else {
      setCommandFeedback(`Command '${customCommand}' dispatched to ${currentDevice.ipAddress}`);
    }

    setCustomCommand('');
    setTimeout(() => setCommandFeedback(null), 4000);
  };

  if (!isOpen || !currentDevice) {
    return null;
  }

  // Render an individual App Group row and its child processes
  const renderAppGroupItem = (group: ProcessAppGroup) => {
    const isExpanded = Boolean(expandedApps[group.appKey]);
    const hasMultiple = group.processCount > 1;
    const isHighCpu = group.totalCpu > 10.0;

    return (
      <div 
        key={group.appKey}
        className={`rounded-xl border transition-all duration-150 overflow-hidden ${
          isExpanded 
            ? isLight
              ? 'bg-[#F8FAFD] border-[#CBD5E1] shadow-xs'
              : 'bg-white/[0.035] border-white/15 shadow-sm' 
            : isLight
            ? 'bg-[#FFFFFF] hover:bg-[#F8FAFD] border-[#E2E8F0] hover:border-[#CBD5E1]'
            : 'bg-white/[0.015] hover:bg-white/[0.03] border-white/[0.06] hover:border-white/12'
        }`}
      >
        {/* Parent Application Header Row */}
        <div 
          onClick={() => toggleGroupExpand(group.appKey)}
          className="flex items-center justify-between p-2.5 cursor-pointer group select-none gap-2"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Expand / Collapse Chevron */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleGroupExpand(group.appKey);
              }}
              className={`p-1 rounded-md ${isLight ? 'text-[#475569] group-hover:text-[#0F172A]' : 'text-[#94A3B8] group-hover:text-white'} transition-transform duration-200 ${
                isExpanded ? isLight ? 'rotate-90 text-[#0F172A]' : 'rotate-90 text-white' : ''
              }`}
              title={isExpanded ? 'Collapse app processes' : 'Expand app processes'}
            >
              <ChevronRight size={13} />
            </button>

            {/* App Icon Badge */}
            <div 
              className="w-6 h-6 rounded-lg flex items-center justify-center border shrink-0"
              style={{
                backgroundColor: `${group.iconColor}18`,
                borderColor: `${group.iconColor}35`,
              }}
            >
              {renderAppIcon(group.iconName, group.iconColor, 12)}
            </div>

            {/* App Name & Process Count */}
            <div className="min-w-0 flex-1 font-sans">
              <div className="flex items-center gap-1.5 truncate">
                <span className={`font-bold ${isLight ? 'text-[#0F172A]' : 'text-[#F1F5F9]'} text-xs truncate`}>
                  {group.appName}
                </span>

                {/* Sub-process Count Badge (Windows Task Manager style) */}
                <span 
                  className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded-md shrink-0 border ${
                    hasMultiple 
                      ? isLight
                        ? 'bg-[#0B57D0]/10 text-[#0B57D0] border-[#0B57D0]/20'
                        : 'bg-white/10 text-white border-white/10' 
                      : isLight
                      ? 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]'
                      : 'bg-white/[0.04] text-[#94A3B8] border-transparent'
                  }`}
                >
                  {group.processCount}
                </span>
              </div>

              {/* Sub-label showing primary executable or category */}
              <p className={`text-[10px] ${isLight ? 'text-[#475569]' : 'text-[#94A3B8]'} truncate font-mono`}>
                {group.processes[0]?.name}
                {hasMultiple && ` • ${group.pids.length} active threads`}
              </p>
            </div>
          </div>

          {/* Aggregated Total CPU & RAM Stats */}
          <div className="flex items-center gap-2.5 text-right shrink-0 font-mono">
            <div className="w-12 text-right">
              <span className={`font-bold text-[11px] ${
                isHighCpu 
                  ? 'text-[#F43F5E]' 
                  : group.totalCpu > 3 
                  ? 'text-[#F59E0B]' 
                  : 'text-[#10B981]'
              }`}>
                {group.totalCpu.toFixed(1)}%
              </span>
              <span className={`text-[8px] ${isLight ? 'text-[#64748B]' : 'text-[#64748B]'} block uppercase tracking-wider`}>CPU</span>
            </div>

            <div className="w-14 text-right">
              <span className={`font-bold ${isLight ? 'text-[#0F172A]' : 'text-[#F1F5F9]'} text-[11px]`}>
                {group.totalMemoryMb >= 1024 
                  ? `${(group.totalMemoryMb / 1024).toFixed(1)} GB` 
                  : `${Math.round(group.totalMemoryMb)} MB`}
              </span>
              <span className={`text-[8px] ${isLight ? 'text-[#64748B]' : 'text-[#64748B]'} block uppercase tracking-wider`}>RAM</span>
            </div>

            {/* "End Task" Kill Entire App Group Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                killProcessGroup(currentDevice.id, group.pids, group.appName);
              }}
              disabled={currentDevice.isRebooting}
              className={`px-2 py-1 ${isLight ? 'bg-[#FEE2E2]/60 hover:bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]' : 'bg-white/[0.04] hover:bg-[#F43F5E]/20 text-[#94A3B8] hover:text-[#F43F5E] border-white/10 hover:border-[#F43F5E]/40'} border ${currentTheme.buttonRadius} text-[10px] font-mono font-bold transition flex items-center gap-1 shrink-0 cursor-pointer`}
              title={`End Task: Terminate all ${group.processCount} processes for ${group.appName}`}
            >
              <Skull size={11} className={isLight ? 'text-[#DC2626]' : 'text-[#F43F5E]'} />
              <span className="hidden sm:inline">End task</span>
            </button>
          </div>
        </div>

        {/* Sub-Processes Tree View (Expanded) */}
        {isExpanded && (
          <div className={`border-t ${isLight ? 'border-[#E2E8F0] bg-[#F1F5F9]/80' : 'border-white/[0.07] bg-black/30'} px-2.5 py-1.5 space-y-1 font-mono`}>
            {group.processes.map((proc, idx) => {
              const isChildHighCpu = proc.cpu > 5.0;
              const isLastChild = idx === group.processes.length - 1;

              return (
                <div
                  key={proc.pid}
                  className={`flex items-center justify-between p-1.5 rounded-lg ${isLight ? 'bg-white hover:bg-[#F8FAFD] border-[#CBD5E1]' : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.04]'} border transition group/proc text-xs`}
                >
                  {/* Tree Guide Line & Process Details */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Tree Guideline glyph */}
                    <span className={`${isLight ? 'text-[#94A3B8]' : 'text-[#64748B]'} text-xs select-none pl-1 shrink-0`}>
                      {isLastChild ? '└─' : '├─'}
                    </span>

                    {/* PID Badge */}
                    <span className={`px-1.5 py-0.5 rounded ${isLight ? 'bg-[#E2E8F0] text-[#334155] border-[#CBD5E1]' : 'bg-black/60 text-[#94A3B8] border-white/5'} text-[9px] font-bold border shrink-0`}>
                      {proc.pid}
                    </span>

                    <div className="min-w-0 font-sans flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-semibold ${isLight ? 'text-[#0F172A]' : 'text-[#E2E8F0]'} text-[11px] truncate`}>
                          {proc.description || proc.name}
                        </span>
                      </div>
                      <p className={`text-[9px] ${isLight ? 'text-[#475569]' : 'text-[#94A3B8]'} font-mono truncate`}>
                        {proc.name} {proc.user ? `• User: ${proc.user}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Child Process Individual CPU & Memory */}
                  <div className="flex items-center gap-2.5 text-right shrink-0 font-mono">
                    <div className="w-10 text-right">
                      <span className={`font-semibold text-[10px] ${
                        isChildHighCpu ? 'text-[#F43F5E]' : isLight ? 'text-[#059669]' : 'text-[#10B981]'
                      }`}>
                        {proc.cpu.toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-12 text-right">
                      <span className={`font-semibold ${isLight ? 'text-[#334155]' : 'text-[#94A3B8]'} text-[10px]`}>
                        {proc.memoryMb}M
                      </span>
                    </div>

                    {/* Kill Single Process */}
                    <button
                      type="button"
                      onClick={() => killProcess(currentDevice.id, proc.pid)}
                      disabled={currentDevice.isRebooting}
                      className={`p-1 ${isLight ? 'bg-[#FEE2E2]/60 hover:bg-[#EF4444] text-[#DC2626] hover:text-white border-[#FECACA]' : 'bg-white/[0.04] hover:bg-[#F43F5E] text-[#94A3B8] hover:text-[#090B10] border-white/10 hover:border-[#F43F5E]'} border rounded text-xs transition flex items-center shrink-0 cursor-pointer`}
                      title={`Kill PID ${proc.pid}`}
                    >
                      <X size={10} className={isLight ? 'text-[#DC2626] group-hover/proc:text-white' : 'text-[#F43F5E] group-hover/proc:text-white'} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div 
        onClick={closeProcessManager}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 animate-in fade-in duration-200"
      />

      <aside
        className={`fixed top-0 bottom-0 left-16 sm:left-20 w-[420px] sm:w-[480px] md:w-[520px] h-full ${currentTheme.classes.modalContainer} border-r shadow-2xl flex flex-col z-50 shrink-0 select-none animate-in slide-in-from-left duration-250 ease-out ${currentTheme.classes.containerFont} ${currentTheme.classes.textPrimary} backdrop-blur-3xl transition-colors duration-200`}
        style={{ backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'panel') }}
      >
      {/* Side Panel Header */}
      <div className={`p-3.5 sm:p-4 ${currentTheme.classes.modalHeader} flex items-center justify-between shrink-0 border-b ${isLight ? 'border-[#CBD5E1]' : 'border-white/10'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-2 ${currentTheme.buttonRadius} border shrink-0 shadow-xs`}
            style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
          >
            <Activity size={16} className="animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`text-xs font-bold truncate font-mono uppercase tracking-wider ${isLight ? 'text-[#0F172A]' : 'text-white'}`}>
                {currentDevice.name}
              </h3>
              <span className={`text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 ${currentTheme.buttonRadius} border shrink-0 ${
                currentDevice.isRebooting 
                  ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40 animate-pulse'
                  : isLight
                  ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                  : 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40'
              }`}>
                {currentDevice.isRebooting ? 'Rebooting' : currentDevice.status}
              </span>
            </div>
            <p className={`text-[10px] ${isLight ? 'text-[#475569]' : 'text-[#94A3B8]'} font-mono flex items-center gap-1.5 truncate`}>
              <span className="truncate">{currentDevice.os}</span>
              <span>•</span>
              <span style={{ color: currentAccent.hex }}>{currentDevice.ipAddress}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => rebootDevice(currentDevice.id)}
            disabled={currentDevice.isRebooting}
            className={`px-2 py-1 ${currentTheme.buttonRadius} text-[10px] font-mono font-bold flex items-center gap-1 border transition cursor-pointer ${
              currentDevice.isRebooting
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40 cursor-not-allowed'
                : isLight
                ? 'bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                : 'bg-white/[0.04] hover:bg-[#F59E0B]/20 text-[#F59E0B] hover:border-[#F59E0B]/40 border-white/10'
            }`}
            title={`Reboot ${currentDevice.name}`}
          >
            <RotateCcw size={11} className={currentDevice.isRebooting ? 'animate-spin' : ''} />
            <span>{currentDevice.isRebooting ? '...' : 'Reboot'}</span>
          </button>

          <button
            onClick={closeProcessManager}
            className={`p-1.5 ${currentTheme.buttonRadius} ${isLight ? 'bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] hover:text-[#0F172A] border-[#CBD5E1]' : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-[#F1F5F9] border-white/5'} transition border cursor-pointer`}
            title="Close Processes Panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Live Hardware Stats Banner */}
      <div className={`grid grid-cols-3 gap-2 p-2.5 ${isLight ? 'bg-[#F8FAFD] border-[#CBD5E1]' : 'bg-black/40 border-white/5'} border-b text-xs shrink-0 font-mono`}>
        <div className={`${isLight ? 'bg-white border-[#E2E8F0] shadow-2xs' : 'bg-white/[0.02] border-white/5'} p-2 ${currentTheme.buttonRadius} border flex flex-col justify-between`}>
          <div className={`flex items-center justify-between ${isLight ? 'text-[#475569]' : 'text-[#94A3B8]'} mb-1`}>
            <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold">
              <Cpu size={10} className={isLight ? 'text-[#059669]' : 'text-[#10B981]'} /> CPU
            </span>
            <span className={`font-bold ${isLight ? 'text-[#0F172A]' : 'text-[#F1F5F9]'} text-[11px]`}>{currentDevice.cpuLoad ?? totalCpuUsed}%</span>
          </div>
          <div className={`w-full ${isLight ? 'bg-[#E2E8F0]' : 'bg-white/5'} h-1 rounded-full overflow-hidden`}>
            <div 
              className={`h-full transition-all duration-300 ${
                (currentDevice.cpuLoad ?? totalCpuUsed) > 70 
                  ? 'bg-[#F43F5E]' 
                  : (currentDevice.cpuLoad ?? totalCpuUsed) > 40 
                  ? 'bg-[#F59E0B]' 
                  : 'bg-[#10B981]'
              }`}
              style={{ width: `${Math.min(100, currentDevice.cpuLoad ?? totalCpuUsed)}%` }}
            />
          </div>
        </div>

        <div className={`${isLight ? 'bg-white border-[#E2E8F0] shadow-2xs' : 'bg-white/[0.02] border-white/5'} p-2 ${currentTheme.buttonRadius} border flex flex-col justify-between`}>
          <div className={`flex items-center justify-between ${isLight ? 'text-[#475569]' : 'text-[#94A3B8]'} mb-1`}>
            <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold">
              <HardDrive size={10} style={{ color: currentAccent.hex }} /> RAM
            </span>
            <span className={`font-bold ${isLight ? 'text-[#0F172A]' : 'text-[#F1F5F9]'} text-[11px] truncate`}>{currentDevice.ramUsage || `${(totalRamUsedMb / 1024).toFixed(1)} GB`}</span>
          </div>
          <div className={`w-full ${isLight ? 'bg-[#E2E8F0]' : 'bg-white/5'} h-1 rounded-full overflow-hidden`}>
            <div 
              className="h-full transition-all duration-300"
              style={{ width: '48%', backgroundColor: currentAccent.hex }}
            />
          </div>
        </div>

        <div className={`${isLight ? 'bg-white border-[#E2E8F0] shadow-2xs' : 'bg-white/[0.02] border-white/5'} p-1.5 ${currentTheme.buttonRadius} border flex flex-col justify-between`}>
          <button
            onClick={() => killAllUserProcesses(currentDevice.id)}
            disabled={userProcessesCount === 0 || currentDevice.isRebooting}
            className={`w-full h-full py-1 ${isLight ? 'bg-[#FEE2E2]/70 hover:bg-[#EF4444] text-[#DC2626] hover:text-white border-[#FECACA]' : 'bg-[#F43F5E]/15 hover:bg-[#F43F5E] text-[#F43F5E] hover:text-[#090B10] border-[#F43F5E]/30'} border ${currentTheme.buttonRadius} text-[9px] font-bold uppercase transition flex items-center justify-center gap-1 disabled:opacity-30 cursor-pointer`}
            title="Kill all non-system background tasks"
          >
            <Flame size={10} />
            <span>Kill Apps ({userProcessesCount})</span>
          </button>
        </div>
      </div>

      {/* Filter, Search & Task Manager Toolbar */}
      <div className={`p-2.5 ${isLight ? 'bg-[#F8FAFD] border-[#CBD5E1]' : 'bg-black/20 border-white/5'} border-b flex flex-col gap-2 shrink-0`}>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search size={12} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-[#64748B]' : 'text-[#94A3B8]'}`} />
            <input
              type="text"
              placeholder="Search apps, PIDs, or worker threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isLight ? 'bg-white border-[#CBD5E1] text-[#0F172A] placeholder-[#94A3B8] focus:border-[#0B57D0]' : currentTheme.classes.inputField} border rounded-xl pl-7 pr-7 py-1 text-xs focus:outline-none`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-2 top-1/2 -translate-y-1/2 ${isLight ? 'text-[#64748B] hover:text-[#0F172A]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'}`}
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Expand / Collapse All Toggle Button */}
          <button
            type="button"
            onClick={handleToggleAllExpand}
            className={`p-1.5 ${isLight ? 'bg-white hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] border-[#CBD5E1]' : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-white border-white/10'} border ${currentTheme.buttonRadius} transition flex items-center justify-center shrink-0 cursor-pointer`}
            title="Toggle Expand/Collapse All App Trees"
          >
            <ChevronsUpDown size={13} />
          </button>
        </div>

        {/* Windows Task Manager Category Tabs & Sort */}
        <div className="flex items-center justify-between gap-1.5 text-xs font-mono">
          <div className={`flex items-center ${isLight ? 'bg-[#E2E8F0]/70 border-[#CBD5E1]' : 'bg-white/[0.03] border-white/5'} p-0.5 rounded-lg border overflow-x-auto scrollbar-none gap-0.5`}>
            {[
              { id: 'all', label: `All (${appGroups.length})` },
              { id: 'apps', label: `Apps (${appsSection.length})` },
              { id: 'background', label: `Background (${backgroundSection.length})` },
              { id: 'system', label: `System (${systemSection.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedSection(tab.id as any)}
                className={`px-2 py-0.5 ${currentTheme.buttonRadius} font-medium transition text-[10px] whitespace-nowrap cursor-pointer`}
                style={
                  selectedSection === tab.id
                    ? { backgroundColor: currentAccent.hex, color: '#090B10', fontWeight: 'bold' }
                    : { color: isLight ? '#334155' : '#94A3B8' }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`${isLight ? 'bg-white border-[#CBD5E1] text-[#334155]' : 'bg-white/[0.03] border-white/10 text-[#94A3B8]'} ${currentTheme.buttonRadius} border px-2 py-0.5 text-[10px] focus:outline-none shrink-0`}
          >
            <option value="cpu">Sort: CPU</option>
            <option value="memory">Sort: RAM</option>
            <option value="count">Sort: Sub-Tasks</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </div>

      {/* Windows Task Manager Process Groups (Scrollable List) */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3.5 scrollbar-thin font-mono text-xs">
        {sortedGroups.length === 0 ? (
          <div className={`py-12 text-center ${isLight ? 'text-[#64748B]' : 'text-[#94A3B8]'} font-sans`}>
            <Activity size={24} className="mx-auto mb-2 opacity-30" style={{ color: currentAccent.hex }} />
            <p className="text-xs font-semibold">No active applications matched criteria</p>
          </div>
        ) : selectedSection !== 'all' ? (
          /* Single Selected Category View */
          <div className="space-y-1.5">
            {sortedGroups.map(renderAppGroupItem)}
          </div>
        ) : (
          /* Structured Windows Task Manager View (Apps / Background / Windows Processes) */
          <>
            {/* 1. Apps Section */}
            {appsSection.length > 0 && (
              <div className="space-y-1.5">
                <div className={`flex items-center justify-between px-1 text-[11px] font-bold ${isLight ? 'text-[#0F172A]' : 'text-[#F1F5F9]'} font-sans tracking-wide`}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentAccent.hex }} />
                    Apps ({appsSection.length})
                  </span>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-[#475569]' : 'text-[#94A3B8]'}`}>
                    {appsSection.reduce((acc, g) => acc + g.totalCpu, 0).toFixed(1)}% CPU
                  </span>
                </div>
                <div className="space-y-1.5">
                  {appsSection.map(renderAppGroupItem)}
                </div>
              </div>
            )}

            {/* 2. Background Processes Section */}
            {backgroundSection.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className={`flex items-center justify-between px-1 text-[11px] font-bold ${isLight ? 'text-[#334155]' : 'text-[#94A3B8]'} font-sans tracking-wide`}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]" />
                    Background processes ({backgroundSection.length})
                  </span>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-[#475569]' : 'text-[#94A3B8]'}`}>
                    {backgroundSection.reduce((acc, g) => acc + g.totalCpu, 0).toFixed(1)}% CPU
                  </span>
                </div>
                <div className="space-y-1.5">
                  {backgroundSection.map(renderAppGroupItem)}
                </div>
              </div>
            )}

            {/* 3. System Processes Section */}
            {systemSection.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className={`flex items-center justify-between px-1 text-[11px] font-bold ${isLight ? 'text-[#334155]' : 'text-[#94A3B8]'} font-sans tracking-wide`}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                    Windows / System processes ({systemSection.length})
                  </span>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-[#475569]' : 'text-[#94A3B8]'}`}>
                    {systemSection.reduce((acc, g) => acc + g.totalCpu, 0).toFixed(1)}% CPU
                  </span>
                </div>
                <div className="space-y-1.5">
                  {systemSection.map(renderAppGroupItem)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Command Feedback Toast */}
      {commandFeedback && (
        <div className={`px-3 py-1.5 ${isLight ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]' : 'bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]'} border-t text-[10px] font-mono flex items-center gap-1.5 shrink-0`}>
          <Check size={11} />
          <span className="truncate">{commandFeedback}</span>
        </div>
      )}

      {/* Bottom Interactive Terminal Bar */}
      <form 
        onSubmit={handleExecuteCommand}
        className={`p-2 ${isLight ? 'bg-[#F8FAFD] border-[#CBD5E1]' : 'bg-black/40 border-white/10'} border-t flex items-center gap-1.5 shrink-0 font-mono`}
      >
        <div className={`flex items-center gap-1.5 px-2 py-1 ${isLight ? 'bg-white border-[#CBD5E1]' : 'bg-white/[0.03] border-white/10'} border ${currentTheme.buttonRadius} flex-1 text-xs`}>
          <Terminal size={12} style={{ color: currentAccent.hex }} className="shrink-0" />
          <input
            type="text"
            placeholder="Command (e.g. kill 4820, pkill chrome, reboot)..."
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
            className={`w-full bg-transparent ${isLight ? 'text-[#0F172A] placeholder-[#94A3B8]' : 'text-[#F1F5F9] placeholder-[#64748B]'} font-mono text-[10px] focus:outline-none`}
          />
        </div>

        <button
          type="submit"
          className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-xs cursor-pointer`}
          style={{ backgroundColor: currentAccent.hex, color: '#090B10' }}
        >
          <Play size={10} />
          <span>Exec</span>
        </button>
      </form>
    </aside>
    </>
  );
};

