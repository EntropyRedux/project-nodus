import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { SystemSettingsProvider } from '../SystemSettingsContext';
import { FleetProvider } from '../FleetContext';
import { ClipboardProvider, useClipboard } from '../ClipboardContext';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SystemSettingsProvider>
    <FleetProvider>
      <ClipboardProvider>{children}</ClipboardProvider>
    </FleetProvider>
  </SystemSettingsProvider>
);

describe('ClipboardContext', () => {
  it('should initialize with empty or saved clipboard items', () => {
    const { result } = renderHook(() => useClipboard(), { wrapper });
    expect(Array.isArray(result.current.clipboardItems)).toBe(true);
  });

  it('should add a text clipboard item and infer link type', () => {
    const { result } = renderHook(() => useClipboard(), { wrapper });

    act(() => {
      result.current.addClipboardItem({
        text: 'https://github.com/EntropyRedux/project-nodus',
      });
    });

    expect(result.current.clipboardItems.length).toBeGreaterThan(0);
    const added = result.current.clipboardItems[0];
    expect(added.text).toBe('https://github.com/EntropyRedux/project-nodus');
    expect(added.type).toBe('link');
    expect(added.pinned).toBe(false);
  });

  it('should infer code type for shell commands', () => {
    const { result } = renderHook(() => useClipboard(), { wrapper });

    act(() => {
      result.current.addClipboardItem({
        text: 'git commit -m "feat: tests"',
      });
    });

    const added = result.current.clipboardItems[0];
    expect(added.type).toBe('code');
  });

  it('should infer image type when imageData is provided', () => {
    const { result } = renderHook(() => useClipboard(), { wrapper });

    act(() => {
      result.current.addClipboardItem({
        text: '',
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      });
    });

    const added = result.current.clipboardItems[0];
    expect(added.type).toBe('image');
    expect(added.text).toBe('Image');
    expect(added.imageData).toBeDefined();
  });

  it('should toggle pin state and preserve pinned items when clearing history', () => {
    const { result } = renderHook(() => useClipboard(), { wrapper });

    let itemId = '';
    act(() => {
      result.current.addClipboardItem({ text: 'Persistent snippet' });
    });
    itemId = result.current.clipboardItems[0].id;

    act(() => {
      result.current.togglePinClipboardItem(itemId);
    });
    expect(result.current.clipboardItems[0].pinned).toBe(true);

    act(() => {
      result.current.addClipboardItem({ text: 'Temporary snippet' });
    });
    expect(result.current.clipboardItems.length).toBeGreaterThanOrEqual(2);

    act(() => {
      result.current.clearClipboardHistory();
    });

    // Pinned item should survive clearClipboardHistory
    const pinnedSurviving = result.current.clipboardItems.find((c) => c.id === itemId);
    expect(pinnedSurviving).toBeDefined();
  });
});
