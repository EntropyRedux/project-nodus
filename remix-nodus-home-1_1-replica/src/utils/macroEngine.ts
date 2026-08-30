export interface MacroStep {
  id: string;
  type: 'kill_process' | 'launch_app' | 'free_ram' | 'copy_clip' | 'notify';
  targetDevice?: string;
  targetApp?: string;
  payload?: any;
  delayMs?: number;
}

export interface ClusterMacro {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  steps: MacroStep[];
}

export const DEFAULT_CLUSTER_MACROS: ClusterMacro[] = [
  {
    id: 'macro-focus-work',
    name: 'Work Focus Mode',
    description: 'Launches VS Code and closes background media',
    icon: 'Briefcase',
    color: '#007AFF',
    steps: [
      { id: 's1', type: 'kill_process', targetDevice: 'dev-desktop', payload: { name: 'Spotify.exe' } },
      { id: 's2', type: 'launch_app', targetApp: 'vscode', delayMs: 150 },
      { id: 's3', type: 'notify', payload: { title: 'Focus Workspace Armed', message: 'Workstation RIG-01 configured.' } },
    ],
  },
  {
    id: 'macro-flush-ram',
    name: 'Cluster Deep Clean',
    description: 'Flushes RAM cache across tablet and PC nodes',
    icon: 'Zap',
    color: '#34C759',
    steps: [
      { id: 's1', type: 'free_ram', targetDevice: 'dev-tablet' },
      { id: 's2', type: 'free_ram', targetDevice: 'dev-desktop', delayMs: 200 },
      { id: 's3', type: 'notify', payload: { title: 'RAM Freed', message: 'Recovered ~1.8GB memory across cluster.' } },
    ],
  },
];

export async function runClusterMacro(macro: ClusterMacro): Promise<boolean> {
  for (const step of macro.steps) {
    if (step.delayMs) {
      await new Promise((res) => setTimeout(res, step.delayMs));
    }
  }
  return true;
}
