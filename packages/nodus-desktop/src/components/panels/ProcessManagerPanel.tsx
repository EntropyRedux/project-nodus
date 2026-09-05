import React, { useState, useMemo, type CSSProperties } from 'react';
import { useProcessStore } from '../../stores/useProcessStore';
import { DeviceProcess } from '../../types/desktop';

function Icon({ name, size = 18, style }: { name: string; size?: number; style?: CSSProperties }) {
  return (
    <span className="material-symbols-rounded" style={{ fontSize: size, lineHeight: 1, ...style }}>
      {name}
    </span>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div style={{ width: 48, height: 4, background: 'var(--m3-surface-container-high)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 600ms ease' }} />
    </div>
  );
}

export const ProcessManagerPanel: React.FC = () => {
  const { 
    processes, 
    systemStats,
    isLoading: isRefreshing, 
    loadProcesses: refreshProcesses, 
    terminateProcess: killProcess 
  } = useProcessStore();
  const [filterQuery, setFilterQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<'memory' | 'cpu'>('memory');

  React.useEffect(() => {
    refreshProcesses();
  }, [refreshProcesses]);

  const handleRefresh = async () => {
    await refreshProcesses();
  };

  const toggleCollapse = (label: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return processes;
    return processes.filter(
      p => p.name.toLowerCase().includes(q) || p.pid.toString().includes(q)
    );
  }, [processes, filterQuery]);

  const groups = useMemo(() => {
    const apps: DeviceProcess[] = [];
    const bg: DeviceProcess[] = [];
    const sys: DeviceProcess[] = [];

    for (const p of filtered) {
      if (p.category === 'system') sys.push(p);
      else if (p.category === 'daemon' || p.category === 'service') bg.push(p);
      else apps.push(p);
    }

    const sortFn = (a: DeviceProcess, b: DeviceProcess) =>
      sortCol === 'memory' ? (b.memoryMb || 0) - (a.memoryMb || 0) : (b.cpu || 0) - (a.cpu || 0);

    return [
      { label: 'Apps', icon: 'apps', iconColor: 'var(--m3-primary)', processes: apps.sort(sortFn) },
      { label: 'Background Processes', icon: 'settings_applications', iconColor: '#F57C00', processes: bg.sort(sortFn) },
      { label: 'Windows System Processes', icon: 'shield', iconColor: '#7B68EE', processes: sys.sort(sortFn) },
    ];
  }, [filtered, sortCol]);

  const totalCpu = systemStats?.cpu_load_percent || processes.reduce((s, p) => s + (p.cpu || 0), 0);
  const totalMemMb = systemStats?.ram_used_mb || processes.reduce((s, p) => s + (p.memoryMb || 0), 0);
  const maxMemGb = systemStats ? Math.round((systemStats.ram_total_mb / 1024) * 10) / 10 : 32;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--m3-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="monitoring" size={16} style={{ color: 'var(--m3-on-primary-container)' }} />
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 400, color: 'var(--m3-on-background)' }}>
              Process &amp; Task Manager
            </h1>
          </div>
          <p style={{ fontSize: 12, color: 'var(--m3-on-surface-variant)', marginLeft: 40 }}>
            Direct Win32 process enumeration, resource telemetry, and task termination
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--m3-on-surface-variant)', pointerEvents: 'none' }} />
            <input
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder="Search apps or process..."
              style={{
                background: 'var(--m3-surface-container-low)',
                border: '1px solid var(--m3-outline-variant)',
                borderRadius: 10,
                padding: '8px 12px 8px 30px',
                fontSize: 13,
                fontFamily: 'Roboto, sans-serif',
                color: 'var(--m3-on-surface)',
                outline: 'none',
                width: 220,
              }}
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              background: 'var(--m3-secondary-container)',
              color: 'var(--m3-on-secondary-container)',
              border: 'none',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'Roboto, sans-serif',
            }}
          >
            <Icon name="refresh" size={15} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Resource Gauge Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <div style={{ background: 'var(--m3-surface-container-lowest)', border: '1px solid var(--m3-surface-container-high)', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--m3-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="memory" size={16} style={{ color: 'var(--m3-on-primary-container)' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: 'var(--m3-on-surface-variant)' }}>CPU LOAD</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 700, color: 'var(--m3-on-surface)' }}>
              {Math.round(totalCpu)}%
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--m3-surface-container-high)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, totalCpu)}%`, height: '100%', background: 'var(--m3-primary)', borderRadius: 3, transition: 'width 600ms ease' }} />
          </div>
        </div>

        <div style={{ background: 'var(--m3-surface-container-lowest)', border: '1px solid var(--m3-surface-container-high)', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: 'color-mix(in srgb, #0078D4 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="storage" size={16} style={{ color: '#0078D4' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: 'var(--m3-on-surface-variant)' }}>MEMORY IN-USE</span>
          </div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 18, fontWeight: 700, color: 'var(--m3-on-surface)', marginBottom: 8 }}>
            {(totalMemMb / 1024).toFixed(1)} <span style={{ fontSize: 14, color: 'var(--m3-on-surface-variant)' }}>/ {maxMemGb} GB</span>
          </div>
          <div style={{ height: 6, background: 'var(--m3-surface-container-high)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (totalMemMb / 1024 / maxMemGb) * 100)}%`, height: '100%', background: '#0078D4', borderRadius: 3, transition: 'width 600ms ease' }} />
          </div>
        </div>

        <div style={{ background: 'var(--m3-surface-container-lowest)', border: '1px solid var(--m3-surface-container-high)', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: 'color-mix(in srgb, #7B68EE 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="layers" size={16} style={{ color: '#7B68EE' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: 'var(--m3-on-surface-variant)' }}>ACTIVE PROCESSES</span>
          </div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 700, color: 'var(--m3-on-surface)', marginBottom: 8 }}>
            {processes.length} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--m3-on-surface-variant)' }}>Tasks</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34A853', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#34A853', fontWeight: 600 }}>Telemetry Live</span>
          </div>
        </div>
      </div>

      {/* Process Table */}
      <div style={{ background: 'var(--m3-surface-container-lowest)', border: '1px solid var(--m3-surface-container-high)', borderRadius: 12, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 100px 100px 56px',
            padding: '8px 12px',
            background: 'var(--m3-surface-container-low)',
            borderBottom: '1px solid var(--m3-surface-container-high)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            color: 'var(--m3-on-surface-variant)',
          }}
        >
          <span>APPLICATION / PROCESS</span>
          <span>STATE</span>
          <button
            onClick={() => setSortCol('cpu')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: sortCol === 'cpu' ? 'var(--m3-primary)' : 'var(--m3-on-surface-variant)', padding: 0, display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'Roboto, sans-serif' }}
          >
            CPU (%) {sortCol === 'cpu' && <Icon name="arrow_downward" size={12} />}
          </button>
          <button
            onClick={() => setSortCol('memory')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: sortCol === 'memory' ? 'var(--m3-primary)' : 'var(--m3-on-surface-variant)', padding: 0, display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'Roboto, sans-serif' }}
          >
            Memory {sortCol === 'memory' && <Icon name="arrow_downward" size={12} />}
          </button>
          <span>ACTION</span>
        </div>

        {groups.map(group => {
          const isCollapsed = collapsed.has(group.label);
          if (group.processes.length === 0 && filterQuery) return null;

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleCollapse(group.label)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 16px',
                  background: 'var(--m3-surface-container-low)',
                  border: 'none',
                  borderBottom: '1px solid var(--m3-surface-container-high)',
                  cursor: 'pointer',
                  fontFamily: 'Roboto, sans-serif',
                }}
              >
                <Icon name={isCollapsed ? 'chevron_right' : 'expand_more'} size={16} style={{ color: 'var(--m3-on-surface-variant)' }} />
                <Icon name={group.icon} size={16} style={{ color: group.iconColor }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m3-on-surface)' }}>{group.label}</span>
                <span style={{ fontSize: 11, color: 'var(--m3-on-surface-variant)', marginLeft: 4 }}>{group.processes.length} apps</span>
              </button>

              {!isCollapsed &&
                group.processes.map((proc, i) => (
                  <div
                    key={`${proc.pid}-${proc.name}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 120px 100px 100px 56px',
                      padding: '8px 12px',
                      alignItems: 'center',
                      borderBottom: i < group.processes.length - 1 ? '1px solid var(--m3-surface-container-high)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Space Mono, monospace',
                        fontSize: 13,
                        color: proc.category === 'system' ? 'var(--m3-primary)' : 'var(--m3-on-surface)',
                        paddingLeft: 24,
                      }}
                    >
                      {proc.name} <span style={{ fontSize: 10, opacity: 0.6 }}>(PID {proc.pid})</span>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34A853', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'var(--m3-on-surface-variant)' }}>Running</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MiniBar value={proc.cpu || 0} max={20} color={(proc.cpu || 0) > 10 ? '#EA4335' : 'var(--m3-primary)'} />
                      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: (proc.cpu || 0) > 10 ? '#EA4335' : 'var(--m3-on-surface)' }}>
                        {(proc.cpu || 0).toFixed(1)}%
                      </span>
                    </div>
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: (proc.memoryMb || 0) > 1000 ? '#F57C00' : 'var(--m3-on-surface)' }}>
                      {proc.memoryMb || 0} MB
                    </span>
                    <button
                      onClick={() => killProcess(proc.pid)}
                      disabled={proc.category === 'system'}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: proc.category === 'system' ? 'not-allowed' : 'pointer',
                        color: proc.category === 'system' ? 'var(--m3-outline)' : 'var(--m3-error)',
                        borderRadius: 8,
                        width: 30,
                        height: 30,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: proc.category === 'system' ? 0.4 : 1,
                      }}
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

