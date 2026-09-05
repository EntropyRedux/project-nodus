import React, { useState } from 'react';
import { useHotCornerStore } from '../../stores/useHotCornerStore';
import { TauriService } from '../../services/TauriCommands';

function Icon({ name, size = 18, style }: { name: string; size?: number; style?: React.CSSProperties }) {
  return (
    <span className="material-symbols-rounded" style={{ fontSize: size, lineHeight: 1, ...style }}>
      {name}
    </span>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
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
        background: checked ? 'var(--m3-primary)' : 'var(--m3-surface-variant)',
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

type Corner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

const ACTIONS = [
  { id: 'fleet', label: 'Fleet Mesh Scanner', icon: 'radar' },
  { id: 'remotedeck', label: 'Remote Touch Deck', icon: 'mouse' },
  { id: 'clipboard', label: 'Clipboard Hub', icon: 'content_paste' },
  { id: 'shortcuts', label: 'Quick Shortcuts', icon: 'bolt' },
  { id: 'processes', label: 'Process Manager', icon: 'monitoring' },
  { id: 'lock', label: 'Lock Workstation', icon: 'lock' },
  { id: 'none', label: 'Disabled (None)', icon: 'block' },
];

const CORNER_LABELS: Record<Corner, string> = {
  topLeft: 'TOP-LEFT',
  topRight: 'TOP-RIGHT',
  bottomLeft: 'BOTTOM-LEFT',
  bottomRight: 'BOTTOM-RIGHT',
};

export const HotCornerConfigPanel: React.FC = () => {
  const { config: hotCornerConfig, updateConfig: updateHotCornerConfig } = useHotCornerStore();
  const [selectedCorner, setSelectedCorner] = useState<Corner>('topLeft');

  const getActionLabel = (id: string) => ACTIONS.find(a => a.id === id)?.label ?? 'Disabled';

  const setAction = (actionId: string) => {
    updateHotCornerConfig({
      corners: {
        ...hotCornerConfig.corners,
        [selectedCorner]: actionId,
      },
    });
  };

  const corners: { id: Corner; posStyle: React.CSSProperties }[] = [
    { id: 'topLeft', posStyle: { top: 0, left: 0 } },
    { id: 'topRight', posStyle: { top: 0, right: 0 } },
    { id: 'bottomLeft', posStyle: { bottom: 0, left: 0 } },
    { id: 'bottomRight', posStyle: { bottom: 0, right: 0 } },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--m3-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="rounded_corner" size={16} style={{ color: 'var(--m3-on-primary-container)' }} />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 400, color: 'var(--m3-on-background)' }}>
            Hot-Corner Gestures &amp; Edge Sensors
          </h1>
        </div>
        <p style={{ fontSize: 12, color: 'var(--m3-on-surface-variant)', marginLeft: 40 }}>
          Trigger cross-device actions and workstation commands by moving your cursor to physical display boundaries
        </p>
      </div>

      {/* Display matrix */}
      <div
        style={{
          background: 'var(--m3-surface-container-lowest)',
          border: '1px solid var(--m3-surface-container-high)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--m3-surface-container-high)',
            background: 'var(--m3-surface-container-low)',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m3-on-surface)' }}>Visual Display Boundary Matrix</span>
          <span style={{ fontSize: 11, color: 'var(--m3-on-surface-variant)' }}>Click corner to assign trigger action</span>
        </div>

        <div
          style={{
            position: 'relative',
            height: 210,
            background: `repeating-linear-gradient(
              0deg, transparent, transparent 32px,
              color-mix(in srgb, var(--m3-outline-variant) 20%, transparent) 32px,
              color-mix(in srgb, var(--m3-outline-variant) 20%, transparent) 33px
            ), repeating-linear-gradient(
              90deg, transparent, transparent 32px,
              color-mix(in srgb, var(--m3-outline-variant) 20%, transparent) 32px,
              color-mix(in srgb, var(--m3-outline-variant) 20%, transparent) 33px
            )`,
          }}
        >
          {corners.map(({ id, posStyle }) => {
            const isSelected = selectedCorner === id;
            const action = hotCornerConfig.corners[id];
            const label = getActionLabel(action);
            return (
              <button
                key={id}
                onClick={() => setSelectedCorner(id)}
                style={{
                  position: 'absolute',
                  ...posStyle,
                  width: 140,
                  height: 58,
                  background: isSelected
                    ? 'var(--m3-primary-container)'
                    : 'color-mix(in srgb, var(--m3-surface-container) 80%, transparent)',
                  border: isSelected
                    ? '2px solid var(--m3-primary)'
                    : '1px solid var(--m3-surface-container-high)',
                  cursor: 'pointer',
                  padding: 8,
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: isSelected ? 'var(--m3-primary)' : 'var(--m3-on-surface-variant)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {CORNER_LABELS[id]}
                  <Icon name="edit" size={10} style={{ color: isSelected ? 'var(--m3-primary)' : 'var(--m3-on-surface-variant)' }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? 'var(--m3-on-primary-container)' : 'var(--m3-on-surface)', lineHeight: 1.2 }}>
                  {label}
                </div>
              </button>
            );
          })}

          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon name="arrow_selector_tool" size={28} style={{ color: 'var(--m3-on-surface-variant)', opacity: 0.5 }} />
            <div style={{ fontSize: 12, color: 'var(--m3-on-surface-variant)', fontFamily: 'Space Mono, monospace', textAlign: 'center' }}>
              Dwell: {hotCornerConfig.dwellTimeMs}ms &bull; Margin: 8px
            </div>
            <button
              onClick={() => {
                if (selectedCorner === 'topLeft') TauriService.lockWorkstation();
              }}
              style={{
                background: 'var(--m3-tertiary-container)',
                color: 'var(--m3-on-tertiary-container)',
                border: 'none',
                borderRadius: 100,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: 'Roboto, sans-serif',
              }}
            >
              <Icon name="play_arrow" size={14} />
              Simulate {CORNER_LABELS[selectedCorner]}
            </button>
          </div>
        </div>
      </div>

      {/* Binding editor */}
      <div
        style={{
          background: 'var(--m3-surface-container-lowest)',
          border: '1px solid var(--m3-surface-container-high)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--m3-surface-container-low)',
            borderBottom: '1px solid var(--m3-surface-container-high)',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--m3-on-surface)' }}>
            Binding:{' '}
            <span style={{ color: 'var(--m3-primary)', fontWeight: 600 }}>
              {CORNER_LABELS[selectedCorner]}
            </span>
          </span>
          <span style={{ fontSize: 12, color: 'var(--m3-on-surface-variant)' }}>Select action</span>
        </div>
        <div style={{ padding: '8px' }}>
          {ACTIONS.map(action => {
            const isSelected = hotCornerConfig.corners[selectedCorner] === action.id;
            return (
              <button
                key={action.id}
                onClick={() => setAction(action.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: isSelected ? 'var(--m3-primary-container)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 100ms ease',
                  fontFamily: 'Roboto, sans-serif',
                  marginBottom: 2,
                }}
              >
                <Icon
                  name={action.icon}
                  size={18}
                  style={{ color: isSelected ? 'var(--m3-on-primary-container)' : 'var(--m3-on-surface-variant)' }}
                />
                <span style={{ flex: 1, fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--m3-on-primary-container)' : 'var(--m3-on-surface)', textAlign: 'left' }}>
                  {action.label}
                </span>
                {isSelected && <Icon name="check" size={18} style={{ color: 'var(--m3-primary)' }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dwell + toggle settings */}
      <div
        style={{
          background: 'var(--m3-surface-container-lowest)',
          border: '1px solid var(--m3-surface-container-high)',
          borderRadius: 12,
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--m3-on-surface)', minWidth: 140 }}>Dwell Delay Trigger</span>
          <input
            type="range"
            min={50}
            max={500}
            value={hotCornerConfig.dwellTimeMs}
            onChange={e => updateHotCornerConfig({ dwellTimeMs: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--m3-primary)', cursor: 'pointer', height: 4 }}
          />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: 'var(--m3-on-surface)', minWidth: 52, textAlign: 'right' }}>
            {hotCornerConfig.dwellTimeMs} ms
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--m3-on-surface)', marginBottom: 2 }}>Disable in Fullscreen</div>
            <div style={{ fontSize: 12, color: 'var(--m3-on-surface-variant)' }}>Suppress triggers during fullscreen media or gaming</div>
          </div>
          <Toggle
            checked={hotCornerConfig.disableInFullscreen}
            onChange={v => updateHotCornerConfig({ disableInFullscreen: v })}
          />
        </div>
      </div>
    </div>
  );
};

