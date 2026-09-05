import React, { useState } from 'react';
import { useFleetStore } from '../../stores/useFleetStore';
import { DeviceInfo, DeviceType } from '../../types/desktop';

function Icon({ name, size = 18, style }: { name: string; size?: number; style?: React.CSSProperties }) {
  return (
    <span className="material-symbols-rounded" style={{ fontSize: size, lineHeight: 1, ...style }}>
      {name}
    </span>
  );
}

function StatusDot({ status }: { status: 'online' | 'connected' | 'offline' }) {
  const colors = {
    online: '#34A853',
    connected: 'var(--m3-primary)',
    offline: 'var(--m3-outline)',
  };
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: colors[status] || colors.offline,
        boxShadow: `0 0 0 2px color-mix(in srgb, ${colors[status] || colors.offline} 20%, transparent)`,
        flexShrink: 0,
      }}
    />
  );
}

export const FleetPanel: React.FC = () => {
  const {
    devices,
    activeDeviceId,
    selectDevice,
    removeDevice,
    connectDeviceManual,
    pingDevice,
    syncDeviceState,
    isScanning: isDiscovering,
    setScanning: startAutoDiscovery,
    serverConfig,
    lockWorkstation,
    systemStats
  } = useFleetStore();

  const activeDevice = devices.find(d => d.id === activeDeviceId);

  // Manual Form State
  const [manualName, setManualName] = useState('');
  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('9120');
  const [manualType, setManualType] = useState<DeviceType>('tablet');
  const [pairSuccess, setPairSuccess] = useState(false);
  const [pingStatus, setPingStatus] = useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const getDeviceIcon = (type: DeviceType) => {
    switch (type) {
      case 'tablet': return 'tablet';
      case 'desktop': return 'computer';
      case 'phone': return 'smartphone';
      default: return 'computer';
    }
  };

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;

    connectDeviceManual({
      name: manualName.trim() || 'Remote Node',
      ip: manualIp.trim(),
      port: parseInt(manualPort, 10) || 9120,
      type: manualType,
    });

    setPairSuccess(true);
    setTimeout(() => setPairSuccess(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--m3-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="radar" size={16} style={{ color: 'var(--m3-on-primary-container)' }} />
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 400, color: 'var(--m3-on-background)', letterSpacing: 0 }}>
              Fleet Mesh &amp; LAN Radar
            </h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--m3-on-surface-variant)', marginLeft: 40 }}>
            Discover and manage linked tablets, phones, and companion computers on your local network
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div
            className="m3-chip"
            style={{ background: 'var(--m3-tertiary-container)', borderColor: 'var(--m3-tertiary-container)', color: 'var(--m3-on-tertiary-container)' }}
          >
            <StatusDot status="online" />
            Direct LAN Mesh
          </div>
          <button
            className="m3-tonal-button m3-ripple"
            onClick={() => startAutoDiscovery(true)}
            disabled={isDiscovering}
            style={{ padding: '8px 18px', opacity: isDiscovering ? 0.6 : 1 }}
          >
            <Icon name="wifi_find" size={16} />
            {isDiscovering ? 'Scanning Subnet...' : 'Scan Subnet'}
          </button>
        </div>
      </div>

      {/* Discovered nodes */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--m3-on-surface-variant)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Active Mesh Nodes
          </span>
          <span
            style={{
              background: 'var(--m3-secondary-container)',
              color: 'var(--m3-on-secondary-container)',
              fontSize: 12,
              fontWeight: 700,
              padding: '1px 8px',
              borderRadius: 100,
            }}
          >
            {devices.length}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {devices.length === 0 ? (
            <div
              className="m3-card"
              style={{
                gridColumn: '1 / -1',
                padding: 32,
                textAlign: 'center',
                color: 'var(--m3-on-surface-variant)',
                border: '1px border-dashed var(--m3-outline-variant)',
              }}
            >
              <Icon name="radar" size={40} style={{ opacity: 0.4, marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--m3-on-surface)' }}>No Remote Nodes Found</div>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                Run subnet scan or manually link a device using the form below.
              </p>
            </div>
          ) : (
            devices.map((device) => {
              const isSelected = activeDeviceId === device.id;
              const isOnline = device.status === 'online' || device.status === 'connected';

              return (
                <div
                  key={device.id}
                  className="m3-card"
                  onClick={() => selectDevice(device.id)}
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isSelected
                      ? '1.5px solid var(--m3-primary)'
                      : '1px solid var(--m3-surface-container-high)',
                    background: 'var(--m3-surface-container-lowest)',
                  }}
                >
                  {/* Card Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px 10px',
                      borderBottom: '1px solid var(--m3-surface-container-high)',
                      background: isSelected
                        ? 'color-mix(in srgb, var(--m3-primary-container) 30%, var(--m3-surface-container-lowest))'
                        : 'var(--m3-surface-container-low)',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 12,
                        background: isOnline ? 'var(--m3-primary-container)' : 'var(--m3-secondary-container)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon
                        name={getDeviceIcon(device.type)}
                        size={18}
                        style={{ color: isOnline ? 'var(--m3-on-primary-container)' : 'var(--m3-on-secondary-container)' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--m3-on-surface)', lineHeight: 1.3 }}>
                          {device.name}
                        </span>
                        {isOnline && (
                          <span
                            style={{
                              background: 'var(--m3-tertiary-container)',
                              color: 'var(--m3-on-tertiary-container)',
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '1px 8px',
                              borderRadius: 100,
                            }}
                          >
                            CONNECTED
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontFamily: 'Space Mono, monospace',
                          fontSize: 11,
                          color: 'var(--m3-on-surface-variant)',
                          marginTop: 2,
                        }}
                      >
                        {device.ipAddress}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StatusDot status={isOnline ? 'online' : 'offline'} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDevice(device.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--m3-on-surface-variant)',
                          borderRadius: 50,
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background 150ms ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--m3-surface-container-high)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Telemetry Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--m3-surface-container-high)' }}>
                    <div style={{ background: 'var(--m3-surface-container-lowest)', padding: '12px 16px' }}>
                      <div style={{ fontSize: 11, color: 'var(--m3-on-surface-variant)', marginBottom: 4, letterSpacing: 0.4 }}>
                        CPU Load
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--m3-on-surface)' }}>
                          {device.cpuLoad ?? 0}%
                        </span>
                      </div>
                    </div>
                    <div style={{ background: 'var(--m3-surface-container-lowest)', padding: '12px 16px' }}>
                      <div style={{ fontSize: 11, color: 'var(--m3-on-surface-variant)', marginBottom: 4, letterSpacing: 0.4 }}>
                        Memory
                      </div>
                      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--m3-on-surface)' }}>
                        {device.ramUsage ?? 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Selected Node */}
                  {isSelected && (
                    <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: 'var(--m3-surface-container-lowest)' }}>
                      <button
                        className="m3-tonal-button m3-ripple"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setPingStatus({ id: device.id, msg: 'Pinging node...', ok: true });
                          const res = await pingDevice(device.id);
                          setPingStatus({
                            id: device.id,
                            msg: res.ok ? `Latency: ${res.latencyMs}ms` : 'Unreachable',
                            ok: res.ok,
                          });
                          setTimeout(() => setPingStatus(null), 3000);
                        }}
                        style={{ flex: 1, justifyContent: 'center', padding: '8px 16px' }}
                      >
                        <Icon name="bolt" size={16} />
                        Ping Node
                      </button>
                      <button
                        className="m3-outlined-button m3-ripple"
                        onClick={(e) => {
                          e.stopPropagation();
                          lockWorkstation();
                        }}
                        style={{ flex: 1, justifyContent: 'center', padding: '8px 16px' }}
                      >
                        <Icon name="lock" size={16} />
                        Lock Host
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Manual Pair Form */}
      <div
        className="m3-card"
        style={{
          border: '1px solid var(--m3-surface-container-high)',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--m3-surface-container-high)',
            background: 'var(--m3-surface-container-low)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="add_circle" size={20} style={{ color: 'var(--m3-primary)' }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--m3-on-surface)' }}>
              Pair New Device Manually
            </span>
          </div>
          {pairSuccess && (
            <span style={{ fontSize: 12, color: 'var(--m3-tertiary)', fontWeight: 600 }}>
              ✓ Device paired successfully
            </span>
          )}
        </div>

        <form onSubmit={handleManualConnect} style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <label style={{ position: 'absolute', top: 6, left: 16, fontSize: 11, color: 'var(--m3-primary)', fontWeight: 500, letterSpacing: 0.5 }}>
              Device Name
            </label>
            <input
              className="m3-input"
              placeholder="e.g. POCO Pad Pro"
              value={manualName}
              onChange={e => setManualName(e.target.value)}
              required
            />
          </div>
          <div style={{ position: 'relative' }}>
            <label style={{ position: 'absolute', top: 6, left: 16, fontSize: 11, color: 'var(--m3-primary)', fontWeight: 500, letterSpacing: 0.5 }}>
              Device Type
            </label>
            <select className="m3-select" value={manualType} onChange={e => setManualType(e.target.value as DeviceType)}>
              <option value="tablet">Android Tablet</option>
              <option value="phone">Android Phone</option>
              <option value="desktop">Windows PC</option>
            </select>
          </div>
          <div style={{ position: 'relative' }}>
            <label style={{ position: 'absolute', top: 6, left: 16, fontSize: 11, color: 'var(--m3-primary)', fontWeight: 500, letterSpacing: 0.5 }}>
              IP Address
            </label>
            <input
              className="m3-input"
              placeholder="192.168.1.105"
              value={manualIp}
              onChange={e => setManualIp(e.target.value)}
              style={{ fontFamily: 'Space Mono, monospace' }}
              required
            />
          </div>
          <div style={{ position: 'relative' }}>
            <label style={{ position: 'absolute', top: 6, left: 16, fontSize: 11, color: 'var(--m3-primary)', fontWeight: 500, letterSpacing: 0.5 }}>
              Port
            </label>
            <input
              className="m3-input"
              value={manualPort}
              onChange={e => setManualPort(e.target.value)}
              style={{ fontFamily: 'Space Mono, monospace' }}
              required
            />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="m3-filled-button m3-ripple">
              <Icon name="link" size={18} />
              Authenticate &amp; Link Node
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

