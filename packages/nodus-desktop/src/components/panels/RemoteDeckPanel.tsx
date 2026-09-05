import React, { useState, useRef, type CSSProperties, type MouseEvent } from 'react';
import { useDesktop } from '../../context/DesktopContext';
import { TauriService } from '../../services/TauriCommands';

function Icon({ name, size = 18, style }: { name: string; size?: number; style?: CSSProperties }) {
  return (
    <span className="material-symbols-rounded" style={{ fontSize: size, lineHeight: 1, ...style }}>
      {name}
    </span>
  );
}

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Icon name={icon} size={16} style={{ color: 'var(--m3-primary)' }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m3-on-surface)', letterSpacing: 0.2 }}>
        {label}
      </span>
    </div>
  );
}

function ClickButton({ label, icon, primary, onClick }: { label: string; icon: string; primary?: boolean; onClick?: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '10px 0',
        borderRadius: 10,
        border: primary ? 'none' : '1px solid var(--m3-outline-variant)',
        background: primary
          ? 'var(--m3-primary)'
          : pressed
          ? 'var(--m3-surface-container-high)'
          : 'var(--m3-surface-container-low)',
        color: primary ? 'var(--m3-on-primary)' : 'var(--m3-on-surface)',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'Roboto, sans-serif',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        boxShadow: pressed ? 'none' : primary ? 'var(--m3-elevation-1)' : 'none',
        transition: 'transform 80ms ease, box-shadow 80ms ease, background 100ms ease',
      }}
    >
      <Icon name={icon} size={16} style={{ color: primary ? 'var(--m3-on-primary)' : 'var(--m3-on-surface-variant)' }} />
      {label}
    </button>
  );
}

function MediaButton({
  icon,
  label,
  primary,
  onClick,
}: {
  icon: string;
  label?: string;
  primary?: boolean;
  onClick?: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '9px 0',
        borderRadius: 10,
        border: 'none',
        background: primary
          ? pressed
            ? 'color-mix(in srgb, var(--m3-primary) 85%, black)'
            : 'var(--m3-primary)'
          : pressed
          ? 'var(--m3-surface-container-high)'
          : 'var(--m3-surface-container)',
        color: primary ? 'var(--m3-on-primary)' : 'var(--m3-on-surface)',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'Roboto, sans-serif',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        boxShadow: primary && !pressed ? 'var(--m3-elevation-1)' : 'none',
        transition: 'transform 80ms ease, background 100ms ease',
      }}
    >
      <Icon
        name={icon}
        size={16}
        style={{ color: primary ? 'var(--m3-on-primary)' : 'var(--m3-on-surface-variant)' }}
      />
      {label}
    </button>
  );
}

const ACCELERATORS = [
  { label: 'Task Manager', shortcut: 'Ctrl+Shift+Esc', icon: 'monitoring', keys: ['ctrl', 'shift', 'esc'] },
  { label: 'Desktop', shortcut: 'Win+D', icon: 'desktop_windows', keys: ['win', 'd'] },
  { label: 'Explorer', shortcut: 'Win+E', icon: 'folder_open', keys: ['win', 'e'] },
  { label: 'Run Dialog', shortcut: 'Win+R', icon: 'terminal', keys: ['win', 'r'] },
  { label: 'Snipping Tool', shortcut: 'Win+Shift+S', icon: 'scissors', keys: ['win', 'shift', 's'] },
  { label: 'Switch App', shortcut: 'Alt+Tab', icon: 'flip_to_front', keys: ['alt', 'tab'] },
];

export const RemoteDeckPanel: React.FC = () => {
  const { controlMedia, lockWorkstation, activeDevice } = useDesktop();
  const [sensitivity, setSensitivity] = useState(1.5);
  const [keystroke, setKeystroke] = useState('');
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const padRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // ─── Touch / Mouse Events on Trackpad ─────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (padRef.current) {
      const rect = padRef.current.getBoundingClientRect();
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    if (!isDragging || !lastPos.current) return;
    const dx = Math.round((e.clientX - lastPos.current.x) * sensitivity);
    const dy = Math.round((e.clientY - lastPos.current.y) * sensitivity);
    lastPos.current = { x: e.clientX, y: e.clientY };

    if (dx !== 0 || dy !== 0) {
      TauriService.simulateMouseMove(dx, dy);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    setIsDragging(false);
    lastPos.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const dy = e.deltaY > 0 ? -1 : 1;
    TauriService.simulateMouseScroll(0, dy);
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keystroke.trim()) return;
    await TauriService.simulateText(keystroke.trim());
    setKeystroke('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--m3-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mouse" size={16} style={{ color: 'var(--m3-on-primary-container)' }} />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 400, color: 'var(--m3-on-background)' }}>
            Remote HID &amp; Control Deck
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--m3-on-surface-variant)', marginLeft: 40 }}>
          Direct low-latency virtual trackpad, media controls, and Windows system accelerators
        </p>
      </div>

      {/* Virtual Trackpad */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="touch_app" size={16} style={{ color: 'var(--m3-primary)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m3-on-surface)' }}>
              Virtual Multi-Touch Trackpad Surface
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--m3-on-surface-variant)', fontFamily: 'Space Mono, monospace' }}>
            {cursorPos ? `X: ${Math.round(cursorPos.x)} Y: ${Math.round(cursorPos.y)}` : 'Touch/drag to move cursor'}
          </div>
        </div>

        {/* Trackpad surface */}
        <div
          ref={padRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => setCursorPos(null)}
          onWheel={handleWheel}
          style={{
            height: 180,
            background: 'var(--m3-surface-container-low)',
            cursor: 'crosshair',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(var(--m3-outline-variant) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              opacity: 0.5,
            }}
          />

          {cursorPos && (
            <div
              style={{
                position: 'absolute',
                left: cursorPos.x,
                top: cursorPos.y,
                transform: 'translate(-50%, -50%)',
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'color-mix(in srgb, var(--m3-primary) 20%, transparent)',
                border: '2px solid var(--m3-primary)',
                pointerEvents: 'none',
              }}
            />
          )}

          <div style={{ textAlign: 'center', color: 'var(--m3-on-surface-variant)', pointerEvents: 'none', zIndex: 1 }}>
            <Icon name="gesture" size={32} style={{ opacity: 0.4, display: 'block', margin: '0 auto 6px' }} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>Swipe or drag to control host cursor</span>
          </div>

          <span
            style={{
              position: 'absolute',
              bottom: 8,
              right: 12,
              fontSize: 10,
              fontFamily: 'Space Mono, monospace',
              color: 'var(--m3-on-surface-variant)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34A853', display: 'inline-block' }} />
            Ready ({activeDevice?.name || 'Local PC'})
          </span>
        </div>
      </div>

      {/* Sensitivity & click controls */}
      <div
        style={{
          background: 'var(--m3-surface-container-lowest)',
          border: '1px solid var(--m3-surface-container-high)',
          borderRadius: 12,
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="speed" size={16} style={{ color: 'var(--m3-primary)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--m3-on-surface)', flexShrink: 0 }}>
            Sensitivity:
          </span>
          <span
            style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: 11,
              fontWeight: 700,
              background: 'var(--m3-primary-container)',
              color: 'var(--m3-on-primary-container)',
              padding: '2px 8px',
              borderRadius: 6,
              flexShrink: 0,
            }}
          >
            {sensitivity.toFixed(1)}x
          </span>
          <span style={{ fontSize: 11, color: 'var(--m3-on-surface-variant)', flexShrink: 0 }}>1.0x</span>
          <input
            type="range"
            min={10}
            max={30}
            value={Math.round(sensitivity * 10)}
            onChange={e => setSensitivity(Number(e.target.value) / 10)}
            style={{ flex: 1, accentColor: 'var(--m3-primary)', height: 4, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 11, color: 'var(--m3-on-surface-variant)', flexShrink: 0 }}>3.0x</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <ClickButton label="Left Click" icon="mouse" onClick={() => TauriService.simulateMouseClick('left')} />
          <ClickButton label="Double Click" icon="mouse" onClick={() => TauriService.simulateMouseClick('double')} />
          <ClickButton label="Right Click" icon="mouse" onClick={() => TauriService.simulateMouseClick('right')} />
        </div>

        {/* Text Injection */}
        <form onSubmit={handleSendText} style={{ display: 'flex', gap: 8 }}>
          <input
            value={keystroke}
            onChange={e => setKeystroke(e.target.value)}
            placeholder="Send keystrokes to active Windows window..."
            style={{
              flex: 1,
              background: 'var(--m3-surface-container)',
              border: '1px solid var(--m3-outline-variant)',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 13,
              fontFamily: 'Roboto, sans-serif',
              color: 'var(--m3-on-surface)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!keystroke.trim()}
            style={{
              background: 'var(--m3-primary)',
              color: 'var(--m3-on-primary)',
              border: 'none',
              borderRadius: 10,
              padding: '0 18px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'Roboto, sans-serif',
              opacity: !keystroke.trim() ? 0.5 : 1,
            }}
          >
            <Icon name="send" size={15} />
            Send
          </button>
        </form>
      </div>

      {/* Audio & Media Control */}
      <div
        style={{
          background: 'var(--m3-surface-container-lowest)',
          border: '1px solid var(--m3-surface-container-high)',
          borderRadius: 12,
          padding: '12px',
        }}
      >
        <SectionHeader icon="volume_up" label="Audio & Media Control" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <MediaButton icon="volume_down" label="Vol −" onClick={() => controlMedia('volume_down')} />
            <MediaButton icon="volume_off" label="Mute" onClick={() => controlMedia('volume_mute')} />
            <MediaButton icon="volume_up" label="Vol +" onClick={() => controlMedia('volume_up')} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <MediaButton icon="skip_previous" label="Prev" onClick={() => controlMedia('prev')} />
            <MediaButton icon="play_arrow" label="Play / Pause" primary onClick={() => controlMedia('play_pause')} />
            <MediaButton icon="skip_next" label="Next" onClick={() => controlMedia('next')} />
          </div>
        </div>
      </div>

      {/* Windows Accelerators */}
      <div
        style={{
          background: 'var(--m3-surface-container-lowest)',
          border: '1px solid var(--m3-surface-container-high)',
          borderRadius: 12,
          padding: '12px',
        }}
      >
        <SectionHeader icon="rocket_launch" label="Windows Accelerators" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {ACCELERATORS.map(acc => (
            <button
              key={acc.label}
              onClick={() => TauriService.simulateHotkey(acc.keys)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--m3-surface-container-high)',
                background: 'var(--m3-surface-container-low)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--m3-surface-container)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--m3-surface-container-low)')}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--m3-secondary-container)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name={acc.icon} size={16} style={{ color: 'var(--m3-on-secondary-container)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--m3-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {acc.label}
                </div>
              </div>
              <span
                style={{
                  fontFamily: 'Space Mono, monospace',
                  fontSize: 10,
                  background: 'var(--m3-surface-container-high)',
                  color: 'var(--m3-on-surface-variant)',
                  padding: '2px 7px',
                  borderRadius: 6,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {acc.shortcut}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

