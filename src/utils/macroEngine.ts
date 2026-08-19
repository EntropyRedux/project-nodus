import { simulateBridgeRpc, BridgeRpcMessage } from './bridgeProtocol';

export interface MacroStep {
  id: string;
  targetDeviceId: string;
  action: BridgeRpcMessage['action'];
  params?: Record<string, unknown>;
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
    id: 'macro-focus-mode',
    name: 'Focus & Dev Mode',
    description: 'Lock PC workstation & set tablet to quiet telemetry',
    icon: 'ShieldCheck',
    color: '#007AFF',
    steps: [
      {
        id: 'step-1',
        targetDeviceId: 'main-pc',
        action: 'LOCK_WORKSTATION',
        delayMs: 0,
      },
      {
        id: 'step-2',
        targetDeviceId: 'poco-pad',
        action: 'SET_CLIPBOARD',
        params: { text: 'Nodus Focus Mode Initiated' },
        delayMs: 200,
      },
    ],
  },
  {
    id: 'macro-fleet-ping',
    name: 'Fleet Healthcheck',
    description: 'Ping all active cluster nodes and verify telemetry',
    icon: 'Zap',
    color: '#34C759',
    steps: [
      {
        id: 'step-1',
        targetDeviceId: 'poco-pad',
        action: 'PING',
        delayMs: 0,
      },
      {
        id: 'step-2',
        targetDeviceId: 'sm-t230nu',
        action: 'PING',
        delayMs: 100,
      },
    ],
  },
];

export async function runClusterMacro(
  macro: ClusterMacro,
  onStepComplete?: (stepIndex: number, result: unknown) => void
): Promise<boolean> {
  for (let i = 0; i < macro.steps.length; i++) {
    const step = macro.steps[i];
    if (step.delayMs && step.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, step.delayMs));
    }
    try {
      const res = await simulateBridgeRpc(step.action, step.targetDeviceId, step.params);
      if (onStepComplete) {
        onStepComplete(i, res.response);
      }
    } catch (e) {
      console.error(`Macro execution failed at step ${i + 1}`, e);
    }
  }
  return true;
}
