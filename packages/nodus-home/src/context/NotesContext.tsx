import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NoteItem, NoteCategory, NoteColor, ChecklistItem, CalendarEventItem } from '../types/launcher';
import { INITIAL_NOTES } from '../utils/constants';
import { audio } from '../utils/audio';
import { useSystemSettings } from './SystemSettingsContext';

export interface NotesContextType {
  notes: NoteItem[];
  calendarEvents: CalendarEventItem[];
  isCalendarPermissionGranted: boolean;
  nextAlarm: { triggerTime: number; formattedTime?: string } | null;
  isNotesModalOpen: boolean;
  selectedNoteId: string | null;
  singleViewingNoteId: string | null;
  notesActiveTab: 'all' | 'todo' | 'note' | 'checklist' | 'calendar';
  setNotesModalOpen: (open: boolean) => void;
  setSelectedNoteId: (id: string | null) => void;
  setNotesActiveTab: (tab: 'all' | 'todo' | 'note' | 'checklist' | 'calendar') => void;
  toggleNotesModal: () => void;
  openNotesModal: (noteId?: string, tab?: 'all' | 'todo' | 'note' | 'checklist' | 'calendar') => void;
  openSingleNote: (noteId: string) => void;
  closeSingleNote: () => void;
  fetchCalendarEvents: () => void;
  requestCalendarAccess: () => void;
  fetchNextAlarm: () => void;
  openClockApp: () => void;
  addNote: (noteData: {
    text: string;
    title?: string;
    type?: NoteCategory;
    color?: NoteColor;
    dueDate?: string;
    checklist?: ChecklistItem[];
  }) => void;
  toggleTodo: (id: string) => void;
  toggleChecklistItem: (noteId: string, itemId: string) => void;
  updateChecklistItem: (noteId: string, itemId: string, text: string) => void;
  addChecklistItemToNote: (noteId: string, text: string) => void;
  removeChecklistItemFromNote: (noteId: string, itemId: string) => void;
  updateNote: (id: string, updates: Partial<NoteItem>) => void;
  deleteNote: (id: string) => void;
  clearCompletedTodos: () => void;
}

export const NotesContext = createContext<NotesContextType | null>(null);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useSystemSettings();

  const [notes, setNotes] = useState<NoteItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nodus_notes');
        return saved ? JSON.parse(saved) : INITIAL_NOTES;
      } catch {
        return INITIAL_NOTES;
      }
    }
    return INITIAL_NOTES;
  });

  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [nextAlarm, setNextAlarm] = useState<{ triggerTime: number; formattedTime?: string } | null>(null);
  const [isCalendarPermissionGranted, setIsCalendarPermissionGranted] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && (window as any).NodusNativeBridge?.hasCalendarPermission) {
      try {
        return Boolean((window as any).NodusNativeBridge.hasCalendarPermission());
      } catch (_) {}
    }
    return false;
  });
  const [isNotesModalOpen, setNotesModalOpen] = useState<boolean>(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [singleViewingNoteId, setSingleViewingNoteId] = useState<string | null>(null);
  const [notesActiveTab, setNotesActiveTab] = useState<'all' | 'todo' | 'note' | 'checklist' | 'calendar'>('all');

  const fetchCalendarEvents = useCallback(() => {
    if (typeof window === 'undefined') return;
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.hasCalendarPermission === 'function') {
      try {
        const hasPerm = Boolean(bridge.hasCalendarPermission());
        setIsCalendarPermissionGranted(hasPerm);
        if (hasPerm && typeof bridge.getCalendarEvents === 'function') {
          const eventsJson = bridge.getCalendarEvents(7);
          if (eventsJson) {
            const parsed = JSON.parse(eventsJson);
            if (Array.isArray(parsed)) {
              setCalendarEvents(parsed);
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Error fetching native calendar events:', e);
      }
    }
  }, []);

  const fetchNextAlarm = useCallback(() => {
    if (typeof window === 'undefined') return;
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.getNextAlarm === 'function') {
      try {
        const raw = bridge.getNextAlarm();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.triggerTime === 'number' && parsed.triggerTime > Date.now()) {
            setNextAlarm(parsed);
            return;
          }
        }
        setNextAlarm(null);
      } catch (e) {
        console.warn('Error parsing next alarm:', e);
        setNextAlarm(null);
      }
    }
  }, []);

  const openClockApp = useCallback(() => {
    audio.playTap();
    if (typeof window === 'undefined') return;
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.openClockApp === 'function') {
      try {
        bridge.openClockApp();
        return;
      } catch (e) {
        console.warn('Error calling openClockApp:', e);
      }
    }
  }, []);

  const requestCalendarAccess = useCallback(() => {
    audio.playTap();
    if (typeof window === 'undefined') return;
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.requestCalendarPermission === 'function') {
      try {
        bridge.requestCalendarPermission();
        setTimeout(() => {
          fetchCalendarEvents();
        }, 1200);
      } catch (e) {
        console.warn('Error requesting calendar permission:', e);
      }
    }
  }, [fetchCalendarEvents]);

  // Initial fetch and 60-second polling
  useEffect(() => {
    fetchCalendarEvents();
    fetchNextAlarm();
    const interval = setInterval(() => {
      fetchCalendarEvents();
      fetchNextAlarm();
    }, 60000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCalendarEvents();
        fetchNextAlarm();
      }
    };
    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', () => {
      fetchCalendarEvents();
      fetchNextAlarm();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', () => {
        fetchCalendarEvents();
        fetchNextAlarm();
      });
    };
  }, [fetchCalendarEvents, fetchNextAlarm]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nodus_notes', JSON.stringify(notes));
      } catch (_) {}
    }
  }, [notes]);

  const toggleNotesModal = useCallback(() => {
    audio.playTap();
    setNotesModalOpen((prev) => !prev);
  }, []);

  const openNotesModal = useCallback(
    (noteId?: string, tab?: 'all' | 'todo' | 'note' | 'checklist' | 'calendar') => {
      audio.playTap();
      setSingleViewingNoteId(null);
      if (noteId) {
        setSelectedNoteId(noteId);
      } else {
        setSelectedNoteId(null);
      }
      if (tab) {
        setNotesActiveTab(tab);
      }
      setNotesModalOpen(true);
    },
    []
  );

  const openSingleNote = useCallback((noteId: string) => {
    audio.playTap();
    setNotesModalOpen(false);
    setSelectedNoteId(noteId);
    setSingleViewingNoteId(noteId);
  }, []);

  const closeSingleNote = useCallback(() => {
    audio.playTap();
    setSingleViewingNoteId(null);
  }, []);

  const addNote = useCallback(
    (noteData: {
      text: string;
      title?: string;
      type?: NoteCategory;
      color?: NoteColor;
      dueDate?: string;
      checklist?: ChecklistItem[];
    }) => {
      const isChecklist = noteData.type === 'checklist';
      const items = noteData.checklist || [];
      if (!noteData.text.trim() && items.length === 0 && !noteData.title?.trim()) return;
      audio.playTap();
      const allDone = items.length > 0 && items.every((i) => i.completed);

      const newNote: NoteItem = {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: noteData.title?.trim() || undefined,
        text: noteData.text.trim() || (isChecklist ? `${items.length} items` : 'Untitled'),
        completed: isChecklist ? allDone : false,
        type: noteData.type || 'note',
        color: noteData.color || (isChecklist ? 'emerald' : 'amber'),
        createdAt: Date.now(),
        dueDate: noteData.dueDate?.trim() || undefined,
        pinned: false,
        checklist: isChecklist ? items : undefined,
      };
      setNotes((prev) => [newNote, ...prev]);
      showToast(
        newNote.type === 'todo'
          ? 'Task added to checklist'
          : newNote.type === 'checklist'
          ? 'Checklist created'
          : 'Sticky note saved'
      );
    },
    [showToast]
  );

  const toggleTodo = useCallback(
    (id: string) => {
      audio.playTap();
      setNotes((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            const nextCompleted = !item.completed;
            if (nextCompleted) {
              showToast('Task marked as complete');
            }
            return { ...item, completed: nextCompleted };
          }
          return item;
        })
      );
    },
    [showToast]
  );

  const toggleChecklistItem = useCallback((noteId: string, itemId: string) => {
    audio.playTap();
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId || !note.checklist) return note;
        const updatedChecklist = note.checklist.map((item) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        const allCompleted = updatedChecklist.length > 0 && updatedChecklist.every((item) => item.completed);
        return {
          ...note,
          checklist: updatedChecklist,
          completed: allCompleted,
        };
      })
    );
  }, []);

  const updateChecklistItem = useCallback((noteId: string, itemId: string, text: string) => {
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId || !note.checklist) return note;
        const updatedChecklist = note.checklist.map((item) =>
          item.id === itemId ? { ...item, text } : item
        );
        return {
          ...note,
          checklist: updatedChecklist,
        };
      })
    );
  }, []);

  const addChecklistItemToNote = useCallback((noteId: string, text: string) => {
    if (!text.trim()) return;
    audio.playTap();
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId) return note;
        const newItem: ChecklistItem = {
          id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          text: text.trim(),
          completed: false,
        };
        const updatedChecklist = [...(note.checklist || []), newItem];
        return {
          ...note,
          checklist: updatedChecklist,
          completed: false,
        };
      })
    );
  }, []);

  const removeChecklistItemFromNote = useCallback((noteId: string, itemId: string) => {
    audio.playTap();
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId || !note.checklist) return note;
        const updatedChecklist = note.checklist.filter((item) => item.id !== itemId);
        const allCompleted = updatedChecklist.length > 0 && updatedChecklist.every((item) => item.completed);
        return {
          ...note,
          checklist: updatedChecklist,
          completed: allCompleted,
        };
      })
    );
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<NoteItem>) => {
    setNotes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const deleteNote = useCallback(
    (id: string) => {
      audio.playTap();
      setNotes((prev) => prev.filter((item) => item.id !== id));
      showToast('Item deleted');
    },
    [showToast]
  );

  const clearCompletedTodos = useCallback(() => {
    audio.playTap();
    setNotes((prev) => prev.filter((item) => !item.completed));
    showToast('Completed tasks cleared');
  }, [showToast]);

  return (
    <NotesContext.Provider
      value={{
        notes,
        calendarEvents,
        isCalendarPermissionGranted,
        nextAlarm,
        isNotesModalOpen,
        selectedNoteId,
        singleViewingNoteId,
        notesActiveTab,
        setNotesModalOpen,
        setSelectedNoteId,
        setNotesActiveTab,
        toggleNotesModal,
        openNotesModal,
        openSingleNote,
        closeSingleNote,
        fetchCalendarEvents,
        requestCalendarAccess,
        fetchNextAlarm,
        openClockApp,
        addNote,
        toggleTodo,
        toggleChecklistItem,
        updateChecklistItem,
        addChecklistItemToNote,
        removeChecklistItemFromNote,
        updateNote,
        deleteNote,
        clearCompletedTodos,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};
