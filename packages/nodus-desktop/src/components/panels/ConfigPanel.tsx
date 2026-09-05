import React, { useState, type CSSProperties, type ReactNode } from 'react';
import { useDesktop } from '../../context/DesktopContext';

function Icon({ name, size = 18, style }: { name: string; size?: number; style?: CSSProperties }) {
  return (
    <span className="material-symbols-rounded" style={{ fontSize: size, lineHeight: 1, ...style }}>
      {name}
    </span>
  );
}

function Toggle({ checked, onChange, accent }: { checked: boolean; onChange: (v: boolean) => void; accent?: string }) {
  const bg = checked ? (accent ?? 'var(--m3-primary)') : 'var(--m3-surface-variant)';
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 52,
        height: 32,
        borderRadius: 100,
        border: 'none',
        background: bg,
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 200ms ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 4,
          left: checked ? 24 : 4,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: checked ? 'var(--m3-on-primary)' : 'var(--m3-outline)',
          transition: 'left 200ms ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

function SectionCard({
  icon,
  iconBg,
  title,
  subtitle,
  children,
}: {
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div style={{ background: 'var(--m3-surface-container-lowest)', border: '1px solid var(--m3-surface-container-high)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--m3-surface-container-high)', background: 'var(--m3-surface-container-low)' }}>
        <div style={{ width: 30, height: 30, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={icon} size={16} style={{ color: 'var(--m3-on-primary-container)' }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--m3-on-surface)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--m3-on-surface-variant)' }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
  accent,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--m3-on-surface)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--m3-on-surface-variant)' }}>{desc}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} accent={accent} />
    </div>
  );
}

type Permission = 'remoteExec' | 'clipboardSync' | 'powerControl';

const PERMISSION_LABELS: Record<Permission, string> = {
  remoteExec: 'Remote Exec',
  clipboardSync: 'Clipboard',
  powerControl: 'Power/Lock',
};

export const ConfigPanel: React.FC = () => {
  const {
    serverConfig,
    updateServerConfig,
    trustedDevices,
    toggleTrustDevice,
    removeTrustedDevice,
    updateDevicePermissions,
  } = useDesktop();

  const [secretVisible, setSecretVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(serverConfig.pairingSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRegenerate = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newPin = 'NODUS-';
    for (let i = 0; i < 6; i++) {
      newPin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    updateServerConfig({ pairingSecret: newPin });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--m3-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="settings" size={16} style={{ color: 'var(--m3-on-primary-container)' }} />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 400, color: 'var(--m3-on-background)' }}>
            Bridge Daemon &amp; Node Security
          </h1>
        </div>
        <p style={{ fontSize: 12, color: 'var(--m3-on-surface-variant)', marginLeft: 40 }}>
          Local companion daemon endpoints, cryptographic pairing keys, permissions, and directory whitelists
        </p>
      </div>

      {/* Local Bridge Daemon */}
      <SectionCard
        icon="dns"
        iconBg="var(--m3-primary-container)"
        title="Local Bridge Daemon"
        subtitle="HTTP REST & UDP subnet discovery listener"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: 'var(--m3-on-surface-variant)', marginBottom: 6 }}>LISTENING HOST</div>
            <input
              value={serverConfig.host}
              onChange={e => updateServerConfig({ host: e.target.value })}
              style={{
                width: '100%',
                background: 'var(--m3-surface-container)',
                border: '1px solid var(--m3-outline-variant)',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 13,
                fontFamily: 'Space Mono, monospace',
                color: 'var(--m3-on-surface)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: 'var(--m3-on-surface-variant)', marginBottom: 6 }}>BIND PORT</div>
            <input
              value={serverConfig.port}
              onChange={e => updateServerConfig({ port: parseInt(e.target.value, 10) || 9120 })}
              style={{
                width: '100%',
                background: 'var(--m3-surface-container)',
                border: '1px solid var(--m3-outline-variant)',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 13,
                fontFamily: 'Space Mono, monospace',
                color: 'var(--m3-on-surface)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
        <div style={{ height: 1, background: 'var(--m3-surface-container-high)' }} />
        <ToggleRow
          label="Auto-Start on Boot"
          desc="Launch companion daemon on Windows logon"
          checked={serverConfig.autoStartOnBoot}
          onChange={v => updateServerConfig({ autoStartOnBoot: v })}
        />
        <ToggleRow
          label="Broadcast mDNS Beacon"
          desc="Allow tablets on local subnet to automatically detect host"
          checked={serverConfig.broadcastMdns}
          onChange={v => updateServerConfig({ broadcastMdns: v })}
        />
        <ToggleRow
          label="AES-256 Payload Encryption"
          desc="Encrypt clipboard & command packets over local network"
          checked={serverConfig.encryptionEnabled}
          onChange={v => updateServerConfig({ encryptionEnabled: v })}
          accent="#7B68EE"
        />
      </SectionCard>

      {/* Pairing Secret */}
      <SectionCard
        icon="key"
        iconBg="color-mix(in srgb, #7B68EE 18%, transparent)"
        title="Pairing Secret & Security PIN"
        subtitle="Require authenticated PIN for cross-device command execution"
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: 'var(--m3-on-surface-variant)' }}>PAIRING SECRET KEY</div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#34A853' }}>
              <Icon name="verified" size={13} style={{ color: '#34A853' }} />
              Enforced
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--m3-surface-container)',
              border: '1px solid var(--m3-outline-variant)',
              borderRadius: 10,
              padding: '12px 14px',
            }}
          >
            <span style={{ flex: 1, fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700, color: 'var(--m3-on-surface)', letterSpacing: 1 }}>
              {secretVisible ? serverConfig.pairingSecret : '●●●●●-●●●●●-●●●●●●'}
            </span>
            <button
              onClick={() => setSecretVisible(v => !v)}
              title="Show/hide"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--m3-on-surface-variant)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name={secretVisible ? 'visibility_off' : 'visibility'} size={16} />
            </button>
            <button
              onClick={handleCopy}
              title="Copy"
              style={{ background: copied ? 'var(--m3-tertiary-container)' : 'transparent', border: 'none', cursor: 'pointer', color: copied ? 'var(--m3-on-tertiary-container)' : 'var(--m3-on-surface-variant)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name={copied ? 'check' : 'content_copy'} size={16} />
            </button>
            <button
              onClick={handleRegenerate}
              title="Regenerate"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--m3-on-surface-variant)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="autorenew" size={16} />
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--m3-on-surface-variant)', marginTop: 8, lineHeight: 1.5 }}>
            Enter this pairing token in the Nodus Home companion app on your tablet to authorize control.
          </p>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="folder" size={14} style={{ color: 'var(--m3-primary)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: 'var(--m3-on-surface-variant)' }}>EXECUTION PATH WHITELIST</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--m3-on-surface-variant)' }}>Semicolon-delimited</span>
          </div>
          <input
            value={serverConfig.allowedPaths}
            onChange={e => updateServerConfig({ allowedPaths: e.target.value })}
            style={{
              width: '100%',
              background: 'var(--m3-surface-container)',
              border: '1px solid var(--m3-outline-variant)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 12,
              fontFamily: 'Space Mono, monospace',
              color: 'var(--m3-on-surface)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </SectionCard>

      {/* Authorized Nodes */}
      <div style={{ background: 'var(--m3-surface-container-lowest)', border: '1px solid var(--m3-surface-container-high)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--m3-surface-container-high)', background: 'var(--m3-surface-container-low)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 12, background: 'color-mix(in srgb, #34A853 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="verified_user" size={16} style={{ color: '#0D652D' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--m3-on-surface)' }}>Authorized Nodes &amp; Permissions Matrix</div>
              <div style={{ fontSize: 12, color: 'var(--m3-on-surface-variant)' }}>Granular access control per authenticated fleet device</div>
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#34A853' }}>{trustedDevices.length} Authorized</span>
        </div>

        <div style={{ padding: '8px' }}>
          {trustedDevices.map((node, i) => (
            <div
              key={node.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 12px',
                borderRadius: 12,
                borderBottom: i < trustedDevices.length - 1 ? '1px solid var(--m3-surface-container-high)' : 'none',
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--m3-secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={node.os === 'android' ? 'tablet' : 'desktop_windows'} size={20} style={{ color: 'var(--m3-on-secondary-container)' }} />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--m3-on-surface)' }}>{node.name}</span>
                  <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--m3-primary)' }}>{node.ip}</span>
                </div>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'var(--m3-on-surface-variant)', marginTop: 3 }}>{node.fingerprint}</div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                {(['remoteExec', 'clipboardSync', 'powerControl'] as Permission[]).map(perm => {
                  const active = node.permissions[perm];
                  return (
                    <button
                      key={perm}
                      onClick={() =>
                        updateDevicePermissions(node.id, {
                          [perm]: !active,
                        })
                      }
                      style={{
                        padding: '5px 10px',
                        borderRadius: 8,
                        border: 'none',
                        background: active ? 'var(--m3-primary)' : 'var(--m3-surface-container)',
                        color: active ? 'var(--m3-on-primary)' : 'var(--m3-on-surface-variant)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'Roboto, sans-serif',
                      }}
                    >
                      {PERMISSION_LABELS[perm]}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => toggleTrustDevice(node.id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: node.isTrusted ? 'var(--m3-primary)' : 'var(--m3-error)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name={node.isTrusted ? 'lock_open' : 'lock'} size={16} />
                </button>
                <button
                  onClick={() => removeTrustedDevice(node.id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--m3-on-surface-variant)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
            </div>
          ))}

          {trustedDevices.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--m3-on-surface-variant)' }}>
              <Icon name="device_unknown" size={36} style={{ opacity: 0.25, display: 'block', margin: '0 auto 8px' }} />
              <span style={{ fontSize: 13 }}>No authorized nodes</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

