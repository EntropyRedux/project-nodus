import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';
import { getNoteColorStyle, NOTE_COLOR_KEYS } from '../../utils/noteTheme';
import { audio } from '../../utils/audio';
import {
  X,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Search,
  StickyNote,
  Pin,
  Palette,
  Check,
  Calendar,
  Clock,
  LayoutGrid,
  List,
  Edit3,
  ListChecks,
  Video,
  ExternalLink,
  RefreshCw,
  MapPin,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';
import { NoteItem, NoteCategory, NoteColor, ChecklistItem, CalendarEventItem } from '../../types/launcher';
import { NoteEditorDialog } from '../common/NoteEditorDialog';

export const NotesWidgetModal: React.FC = () => {
  const {
    isNotesModalOpen,
    setNotesModalOpen,
    notes,
    addNote,
    updateNote,
    deleteNote,
    toggleTodo,
    toggleChecklistItem,
    calendarEvents,
    isCalendarPermissionGranted,
    fetchCalendarEvents,
    requestCalendarAccess,
    notesActiveTab,
    settings,
  } = useLauncher();

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'notes' | 'todos' | 'checklists' | 'pinned' | 'calendar'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (isNotesModalOpen && notesActiveTab) {
      if (notesActiveTab === 'calendar') {
        setActiveFilter('calendar');
      }
    }
  }, [isNotesModalOpen, notesActiveTab]);

  // Creator ("Take a note...") State
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState<NoteCategory>('note');
  const [newColor, setNewColor] = useState<NoteColor>('amber');
  const [newPinned, setNewPinned] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  const [showColorPickerForNew, setShowColorPickerForNew] = useState(false);

  // Checklist Items in Composer
  const [newChecklistItems, setNewChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistItemInput, setNewChecklistItemInput] = useState('');

  // Active Dialog Editing Note
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);

  // Card hovered color palette popover
  const [colorPopoverNoteId, setColorPopoverNoteId] = useState<string | null>(null);

  const composerRef = useRef<HTMLDivElement>(null);
  const newChecklistInputRef = useRef<HTMLInputElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!editingNote && isNotesModalOpen) {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotesModalOpen, editingNote]);

  // Close composer on click outside if empty
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(e.target as Node)) {
        if (
          isComposerExpanded &&
          !newTitle.trim() &&
          !newText.trim() &&
          newChecklistItems.length === 0 &&
          !newChecklistItemInput.trim()
        ) {
          setIsComposerExpanded(false);
          setShowColorPickerForNew(false);
        }
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [isComposerExpanded, newTitle, newText, newChecklistItems, newChecklistItemInput]);

  if (!isNotesModalOpen) return null;

  const handleClose = () => {
    audio.playTap();
    setNotesModalOpen(false);
  };

  const handleOpenEdit = (note: NoteItem) => {
    audio.playTap();
    setEditingNote(note);
  };

  const handleAddChecklistItemToComposer = () => {
    if (!newChecklistItemInput.trim()) return;
    audio.playTap();
    setNewChecklistItems((prev) => [
      ...prev,
      {
        id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        text: newChecklistItemInput.trim(),
        completed: false,
      },
    ]);
    setNewChecklistItemInput('');
    setTimeout(() => newChecklistInputRef.current?.focus(), 10);
  };

  const handleCreateNote = () => {
    let finalItems = [...newChecklistItems];
    if (newType === 'checklist' && newChecklistItemInput.trim()) {
      finalItems.push({
        id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        text: newChecklistItemInput.trim(),
        completed: false,
      });
    }

    if (!newText.trim() && !newTitle.trim() && finalItems.length === 0) {
      setIsComposerExpanded(false);
      return;
    }
    audio.playTap();

    addNote({
      title: newTitle.trim() || undefined,
      text: newType === 'checklist'
        ? `${finalItems.length} checklist items`
        : newText.trim() || 'Untitled Note',
      type: newType,
      color: newColor,
      dueDate: newType === 'todo' && newDueDate.trim() ? newDueDate.trim() : undefined,
      checklist: newType === 'checklist' ? finalItems : undefined,
    });

    // Reset
    setNewTitle('');
    setNewText('');
    setNewType('note');
    setNewColor('amber');
    setNewPinned(false);
    setNewDueDate('');
    setNewChecklistItems([]);
    setNewChecklistItemInput('');
    setIsComposerExpanded(false);
    setShowColorPickerForNew(false);
  };

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    const q = searchQuery.toLowerCase().trim();
    const checklistMatch = n.checklist?.some((item) => item.text.toLowerCase().includes(q));
    const matchesSearch =
      q === '' ||
      (n.title && n.title.toLowerCase().includes(q)) ||
      n.text.toLowerCase().includes(q) ||
      (n.dueDate && n.dueDate.toLowerCase().includes(q)) ||
      Boolean(checklistMatch);

    if (!matchesSearch) return false;

    if (activeFilter === 'notes') return n.type === 'note';
    if (activeFilter === 'todos') return n.type === 'todo';
    if (activeFilter === 'checklists') return n.type === 'checklist';
    if (activeFilter === 'pinned') return n.pinned;
    return true;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const otherNotes = filteredNotes.filter((n) => !n.pinned);

  const notesCount = notes.filter((n) => n.type === 'note').length;
  const todosCount = notes.filter((n) => n.type === 'todo').length;
  const checklistsCount = notes.filter((n) => n.type === 'checklist').length;
  const pinnedCount = notes.filter((n) => n.pinned).length;

  const composerColorStyle = getNoteColorStyle(newColor, settings.theme, settings.taskbarOpacity);

  const getNextType = (current: NoteCategory): NoteCategory => {
    if (current === 'note') return 'todo';
    if (current === 'todo') return 'checklist';
    return 'note';
  };

  // Render a Single Keep Card
  const renderNoteCard = (note: NoteItem) => {
    const colorStyle = getNoteColorStyle(note.color || 'amber', settings.theme, settings.taskbarOpacity);
    const isTodo = note.type === 'todo';
    const isChecklist = note.type === 'checklist';
    const checklistItems = note.checklist || [];
    const completedItemsCount = checklistItems.filter((i) => i.completed).length;

    return (
      <div
        key={note.id}
        id={`keep-note-card-${note.id}`}
        onClick={() => handleOpenEdit(note)}
        className={`group relative p-2.5 sm:p-3 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
          settings.theme === 'neobrutalism'
            ? 'rounded-xl border-2 shadow-[3px_3px_0px_#000000] hover:shadow-[5px_5px_0px_#000000] hover:-translate-y-0.5'
            : settings.theme === 'cyberpunk-hud'
            ? 'rounded-none border hover:border-cyan-400/60 shadow-[0_0_10px_rgba(0,240,255,0.06)]'
            : settings.theme === 'nordic-minimal'
            ? 'rounded-none border hover:border-white/20'
            : settings.theme === 'material-light'
            ? 'rounded-2xl border shadow-sm hover:shadow-md'
            : 'rounded-xl border hover:border-white/25 backdrop-blur-xl shadow-md hover:shadow-xl'
        } ${colorStyle.cardBorder} ${note.completed ? 'opacity-60' : ''}`}
        style={{
          backgroundColor: colorStyle.cardBg,
        }}
      >
        <div>
          {/* Card Top: Title & Pin Button */}
          <div className="flex items-start justify-between gap-1.5 mb-1.5">
            {note.title ? (
              <div className="flex flex-col min-w-0">
                <h4 className={`font-semibold text-xs leading-snug tracking-tight truncate ${colorStyle.textColor} ${note.completed ? 'line-through opacity-70' : ''}`}>
                  {note.title}
                </h4>
                {isChecklist && (
                  <span className="text-[9px] font-mono text-[#8E8E93] flex items-center gap-1 mt-0.5">
                    <ListChecks size={10} className="text-emerald-400" />
                    <span>
                      {completedItemsCount}/{checklistItems.length} completed
                    </span>
                  </span>
                )}
              </div>
            ) : (
              <div className="text-[10px] font-mono text-[#8E8E93] uppercase tracking-wider flex items-center gap-1">
                {isChecklist ? (
                  <>
                    <ListChecks size={11} className="text-emerald-400" />
                    <span>Checklist ({completedItemsCount}/{checklistItems.length})</span>
                  </>
                ) : isTodo ? (
                  <>
                    <CheckSquare size={11} />
                    <span>Task</span>
                  </>
                ) : (
                  <>
                    <StickyNote size={11} />
                    <span>Note</span>
                  </>
                )}
              </div>
            )}

            {/* Pin / Unpin Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                audio.playTap();
                updateNote(note.id, { pinned: !note.pinned });
              }}
              className={`p-1 ${currentTheme.buttonRadius} transition opacity-80 hover:opacity-100 ${
                note.pinned
                  ? 'text-[#F59E0B] opacity-100'
                  : 'text-[#8E8E93] group-hover:opacity-100 sm:opacity-0'
              }`}
              title={note.pinned ? 'Unpin note' : 'Pin note to top'}
            >
              <Pin size={12} className={note.pinned ? 'fill-current' : ''} />
            </button>
          </div>

          {/* Card Body: Checklist vs Task vs Note */}
          {isChecklist ? (
            <div className="space-y-1 my-1">
              {checklistItems.length === 0 ? (
                <p className="text-[11px] text-[#8E8E93] italic">No items in checklist</p>
              ) : (
                <div className="space-y-0.5">
                  {checklistItems.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleChecklistItem(note.id, item.id);
                      }}
                      className="flex items-start gap-1.5 py-0.5 group/item cursor-pointer"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleChecklistItem(note.id, item.id);
                        }}
                        className="mt-0.5 shrink-0 text-[#8E8E93] hover:text-white transition"
                        title={item.completed ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {item.completed ? (
                          <CheckSquare size={12} className="text-[#10B981] fill-[#10B981]/20" />
                        ) : (
                          <Square size={12} className="opacity-70 group-hover/item:opacity-100" />
                        )}
                      </button>
                      <span
                        className={`text-[11px] leading-relaxed break-words ${colorStyle.textColor} ${
                          item.completed ? 'line-through opacity-50' : ''
                        }`}
                      >
                        {item.text}
                      </span>
                    </div>
                  ))}
                  {checklistItems.length > 5 && (
                    <p className="text-[9.5px] font-mono text-[#8E8E93] pl-4 pt-0.5">
                      +{checklistItems.length - 5} more items
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : isTodo ? (
            <div className="space-y-1 my-1">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  audio.playTap();
                  toggleTodo(note.id);
                }}
                className="flex items-start gap-1.5 group/todo py-0.5 cursor-pointer"
              >
                <div className="mt-0.5 shrink-0 text-[#8E8E93] hover:text-white transition">
                  {note.completed ? (
                    <CheckSquare size={13} className="text-[#10B981] fill-[#10B981]/20" />
                  ) : (
                    <Square size={13} />
                  )}
                </div>
                <p className={`text-[11px] leading-relaxed break-words ${colorStyle.textColor} ${note.completed ? 'line-through opacity-60' : ''}`}>
                  {note.text}
                </p>
              </div>

              {note.dueDate && (
                <div className="flex items-center gap-1 text-[10px] pt-0.5">
                  <span className={`px-1.5 py-0.5 rounded-full font-mono text-[9px] flex items-center gap-1 ${colorStyle.badgeBg}`}>
                    <Clock size={9} />
                    <span>{note.dueDate}</span>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className={`text-[11px] leading-relaxed whitespace-pre-wrap break-words line-clamp-5 my-1 ${colorStyle.textColor}`}>
              {note.text}
            </p>
          )}
        </div>

        {/* Card Footer Toolbar (Visible on Hover/Focus) */}
        <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-black/5 dark:border-white/5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-0.5 relative">
            {/* Color Palette Picker Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                audio.playTap();
                setColorPopoverNoteId(colorPopoverNoteId === note.id ? null : note.id);
              }}
              className={`p-1 ${currentTheme.buttonRadius} hover:bg-black/10 dark:hover:bg-white/10 text-[#8E8E93] hover:text-white transition`}
              title="Change note color"
            >
              <Palette size={11} />
            </button>

            {/* Color Popover Menu */}
            {colorPopoverNoteId === note.id && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute left-0 bottom-7 z-30 p-1 flex items-center gap-1 bg-[#161B26] border border-white/15 rounded-lg shadow-xl animate-in zoom-in-95`}
              >
                {NOTE_COLOR_KEYS.map((c) => {
                  const cInfo = getNoteColorStyle(c, settings.theme);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        audio.playTap();
                        updateNote(note.id, { color: c });
                        setColorPopoverNoteId(null);
                      }}
                      className={`w-4 h-4 rounded-full transition-transform hover:scale-125 border ${
                        note.color === c ? 'ring-1.5 ring-white border-white scale-110' : 'border-black/20'
                      }`}
                      style={{ backgroundColor: cInfo.dotColor }}
                      title={cInfo.label}
                    />
                  );
                })}
              </div>
            )}

            {/* Cycle Category Switch: Note -> Task -> Checklist */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                audio.playTap();
                const next = getNextType(note.type);
                let updates: Partial<NoteItem> = { type: next };
                if (next === 'checklist' && (!note.checklist || note.checklist.length === 0)) {
                  const lines = (note.text || '').split('\n').filter((l) => l.trim().length > 0);
                  const items: ChecklistItem[] = lines.length > 0
                    ? lines.map((l, idx) => ({ id: `chk-${Date.now()}-${idx}`, text: l.trim(), completed: false }))
                    : [{ id: `chk-${Date.now()}-0`, text: note.text || 'Item 1', completed: false }];
                  updates.checklist = items;
                }
                updateNote(note.id, updates);
              }}
              className={`p-1 ${currentTheme.buttonRadius} hover:bg-black/10 dark:hover:bg-white/10 text-[#8E8E93] hover:text-white transition`}
              title={`Switch type (Current: ${note.type})`}
            >
              {isChecklist ? (
                <ListChecks size={11} className="text-emerald-400" />
              ) : isTodo ? (
                <CheckSquare size={11} />
              ) : (
                <StickyNote size={11} />
              )}
            </button>
          </div>

          <div className="flex items-center gap-0.5">
            {/* Delete Note Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                audio.playTap();
                deleteNote(note.id);
              }}
              className={`p-1 ${currentTheme.buttonRadius} hover:bg-[#FF453A]/15 text-[#8E8E93] hover:text-[#FF453A] transition`}
              title="Delete note"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      id="notes-widget-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        id="notes-widget-modal-card"
        data-theme={settings.theme}
        className={`w-full max-w-3xl h-[78vh] max-h-[620px] flex flex-col overflow-hidden shadow-2xl transition-all duration-200 animate-in zoom-in-95 ${
          currentTheme.classes.containerFont
        } ${currentTheme.classes.textPrimary} ${
          settings.theme === 'neobrutalism'
            ? 'rounded-xl border-2 border-black shadow-[8px_8px_0px_#000000]'
            : settings.theme === 'cyberpunk-hud'
            ? 'rounded-none border-2 border-cyan-500/40 shadow-[0_0_35px_rgba(0,240,255,0.15)] bg-black/90'
            : settings.theme === 'nordic-minimal'
            ? 'rounded-none border border-white/20 bg-[#131822]'
            : settings.theme === 'material-light'
            ? 'rounded-3xl border border-[#E0E2EC] shadow-[0_20px_60px_rgba(0,0,0,0.12)]'
            : 'rounded-2xl border border-white/15 bg-black/50 backdrop-blur-3xl'
        }`}
        style={{
          backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'window'),
        }}
      >
        {/* Header Bar */}
        <div
          className={`flex items-center justify-between px-4 py-2.5 border-b ${currentTheme.classes.cardBorder} select-none shrink-0`}
          style={{
            backgroundColor: getSurfaceRgba(settings.theme, Math.min(100, (settings.taskbarOpacity ?? 92) + 5), 'card'),
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-6 h-6 rounded-lg ${settings.theme === 'material-light' ? 'bg-amber-100 border border-amber-300 text-amber-700' : 'bg-amber-500/20 border border-amber-500/30 text-amber-400'} flex items-center justify-center`}>
              <StickyNote size={14} />
            </div>
            <div>
              <h3 className={`font-bold text-xs tracking-tight ${currentTheme.classes.textPrimary} flex items-center gap-1.5`}>
                <span>Notes & Checklists</span>
                <span className={`text-[9px] font-mono font-normal px-1.5 py-0.2 rounded-full ${settings.theme === 'material-light' ? 'bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]' : 'bg-white/10 text-[#8E8E93]'}`}>
                  {notes.length} total
                </span>
              </h3>
              <p className={`text-[10px] ${currentTheme.classes.textMuted}`}>
                Capture thoughts, to-do lists, and clickable checklists
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className={`p-1 ${currentTheme.buttonRadius} ${settings.theme === 'material-light' ? 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]' : 'text-[#8E8E93] hover:text-white hover:bg-white/10'} transition`}
            title="Close (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div
          className={`px-4 py-2 border-b ${currentTheme.classes.cardBorder} flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0`}
          style={{
            backgroundColor: getSurfaceRgba(settings.theme, Math.min(100, (settings.taskbarOpacity ?? 92) + 2), 'card'),
          }}
        >
          {/* Search Box */}
          <div className="flex-1 max-w-sm relative">
            <Search size={12} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${settings.theme === 'material-light' ? 'text-[#64748B]' : 'text-[#8E8E93]'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes, tasks & checklists..."
              className={`w-full ${currentTheme.classes.inputField} pl-7 pr-6 py-1 text-[11px] focus:outline-none`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 ${settings.theme === 'material-light' ? 'text-[#64748B] hover:text-[#0F172A]' : 'text-[#8E8E93] hover:text-white'}`}
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Filter Chips & View Mode Toggle */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 overflow-x-auto">
            <div className={`flex items-center gap-0.5 p-0.5 rounded-lg shrink-0 ${settings.theme === 'material-light' ? 'bg-[#F1F5F9] border border-[#E2E8F0]' : 'bg-black/20 border border-white/5'}`}>
              <button
                type="button"
                onClick={() => {
                  audio.playTap();
                  setActiveFilter('all');
                }}
                className={`px-1.5 py-0.5 ${currentTheme.buttonRadius} text-[10px] font-semibold transition ${
                  activeFilter === 'all'
                    ? settings.theme === 'material-light' ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs border border-[#CBD5E1]' : 'bg-white/20 text-white shadow-sm'
                    : settings.theme === 'material-light' ? 'text-[#475569] hover:text-[#0F172A]' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                All ({notes.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  audio.playTap();
                  setActiveFilter('notes');
                }}
                className={`px-1.5 py-0.5 ${currentTheme.buttonRadius} text-[10px] font-semibold transition flex items-center gap-1 ${
                  activeFilter === 'notes'
                    ? settings.theme === 'material-light' ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs border border-[#CBD5E1]' : 'bg-white/20 text-white shadow-sm'
                    : settings.theme === 'material-light' ? 'text-[#475569] hover:text-[#0F172A]' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                <StickyNote size={10} />
                <span>Notes ({notesCount})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  audio.playTap();
                  setActiveFilter('todos');
                }}
                className={`px-1.5 py-0.5 ${currentTheme.buttonRadius} text-[10px] font-semibold transition flex items-center gap-1 ${
                  activeFilter === 'todos'
                    ? settings.theme === 'material-light' ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs border border-[#CBD5E1]' : 'bg-white/20 text-white shadow-sm'
                    : settings.theme === 'material-light' ? 'text-[#475569] hover:text-[#0F172A]' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                <CheckSquare size={10} />
                <span>Tasks ({todosCount})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  audio.playTap();
                  setActiveFilter('checklists');
                }}
                className={`px-1.5 py-0.5 ${currentTheme.buttonRadius} text-[10px] font-semibold transition flex items-center gap-1 ${
                  activeFilter === 'checklists'
                    ? settings.theme === 'material-light' ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs border border-[#CBD5E1]' : 'bg-white/20 text-white shadow-sm'
                    : settings.theme === 'material-light' ? 'text-[#475569] hover:text-[#0F172A]' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                <ListChecks size={10} className={activeFilter === 'checklists' ? 'text-emerald-400' : ''} />
                <span>Checklists ({checklistsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  audio.playTap();
                  setActiveFilter('pinned');
                }}
                className={`px-1.5 py-0.5 ${currentTheme.buttonRadius} text-[10px] font-semibold transition flex items-center gap-1 ${
                  activeFilter === 'pinned'
                    ? settings.theme === 'material-light' ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs border border-[#CBD5E1]' : 'bg-white/20 text-white shadow-sm'
                    : settings.theme === 'material-light' ? 'text-[#475569] hover:text-[#0F172A]' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                <Pin size={10} />
                <span>Pinned ({pinnedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  audio.playTap();
                  setActiveFilter('calendar');
                }}
                className={`px-1.5 py-0.5 ${currentTheme.buttonRadius} text-[10px] font-semibold transition flex items-center gap-1 ${
                  activeFilter === 'calendar'
                    ? settings.theme === 'material-light' ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs border border-[#CBD5E1]' : 'bg-white/20 text-white shadow-sm'
                    : settings.theme === 'material-light' ? 'text-[#475569] hover:text-[#0F172A]' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                <Calendar size={10} style={{ color: activeFilter === 'calendar' ? currentAccent.hex : undefined }} />
                <span>Schedule ({calendarEvents.length})</span>
              </button>
            </div>

            {/* Grid / List View Toggle */}
            <div className={`flex items-center gap-0.5 p-0.5 rounded-lg shrink-0 ${settings.theme === 'material-light' ? 'bg-[#F1F5F9] border border-[#E2E8F0]' : 'bg-black/20 border border-white/5'}`}>
              <button
                type="button"
                onClick={() => {
                  audio.playTap();
                  setViewMode('grid');
                }}
                className={`p-1 ${currentTheme.buttonRadius} transition ${
                  viewMode === 'grid'
                    ? settings.theme === 'material-light' ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs border border-[#CBD5E1]' : 'bg-white/20 text-white'
                    : settings.theme === 'material-light' ? 'text-[#64748B] hover:text-[#0F172A]' : 'text-[#8E8E93] hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={11} />
              </button>
              <button
                type="button"
                onClick={() => {
                  audio.playTap();
                  setViewMode('list');
                }}
                className={`p-1 ${currentTheme.buttonRadius} transition ${
                  viewMode === 'list'
                    ? settings.theme === 'material-light' ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs border border-[#CBD5E1]' : 'bg-white/20 text-white'
                    : settings.theme === 'material-light' ? 'text-[#64748B] hover:text-[#0F172A]' : 'text-[#8E8E93] hover:text-white'
                }`}
                title="List View"
              >
                <List size={11} />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4 scrollbar-thin">
          {/* Calendar Agenda View when activeFilter === 'calendar' */}
          {activeFilter === 'calendar' ? (
            <div className="space-y-4">
              {/* Calendar Header / Actions */}
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 ${currentTheme.buttonRadius} flex items-center justify-center`}
                    style={{ backgroundColor: currentAccent.badgeBg, border: `1px solid ${currentAccent.badgeBorder}` }}
                  >
                    <CalendarDays size={15} style={{ color: currentAccent.hex }} />
                  </div>
                  <div>
                    <h4 className={`font-bold text-xs ${currentTheme.classes.textPrimary}`}>Google Calendar Agenda</h4>
                    <p className={`text-[10px] ${currentTheme.classes.textSecondary}`}>
                      {isCalendarPermissionGranted
                        ? `${calendarEvents.length} events synced across the next 7 days`
                        : 'Connect local Google Calendar to view upcoming meetings'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      fetchCalendarEvents();
                    }}
                    className={`px-2 py-1 ${currentTheme.pillRadius} text-[10px] font-semibold ${currentTheme.classes.actionButton} flex items-center gap-1 transition`}
                    title="Refresh Calendar"
                  >
                    <RefreshCw size={11} />
                    <span>Sync</span>
                  </button>
                  {!isCalendarPermissionGranted && (
                    <button
                      type="button"
                      onClick={requestCalendarAccess}
                      style={{ backgroundColor: currentAccent.hex, color: '#090B10' }}
                      className={`px-2.5 py-1 ${currentTheme.pillRadius} text-[10px] font-bold shadow-sm transition`}
                    >
                      Grant Access
                    </button>
                  )}
                </div>
              </div>

              {/* If permission not granted: Banner */}
              {!isCalendarPermissionGranted ? (
                <div
                  className={`p-6 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} border text-center space-y-3`}
                  style={{ backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity ?? 92, 'card') }}
                >
                  <CalendarDays size={32} className="mx-auto" style={{ color: currentAccent.hex }} />
                  <div>
                    <h4 className={`text-sm font-bold ${currentTheme.classes.textPrimary}`}>Google Calendar Not Connected</h4>
                    <p className={`text-xs ${currentTheme.classes.textSecondary} max-w-sm mx-auto mt-1`}>
                      Grant calendar permission so Nodus Home can display your meetings, deadlines, and video links right on your desktop.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={requestCalendarAccess}
                    style={{ backgroundColor: currentAccent.hex, color: '#090B10' }}
                    className={`px-4 py-2 ${currentTheme.pillRadius} text-xs font-bold shadow-md transition`}
                  >
                    Connect Android Calendar
                  </button>
                </div>
              ) : calendarEvents.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8E8E93]">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">No Upcoming Events</p>
                    <p className="text-[11px] text-[#8E8E93] max-w-xs mt-0.5">
                      {searchQuery
                        ? `No calendar events matching "${searchQuery}"`
                        : 'No meetings or events scheduled for the next 7 days in Google Calendar.'}
                    </p>
                  </div>
                </div>
              ) : (
                /* Event cards list */
                <div className="space-y-2">
                  {calendarEvents
                    .filter((e) => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        e.title.toLowerCase().includes(q) ||
                        (e.description && e.description.toLowerCase().includes(q)) ||
                        (e.location && e.location.toLowerCase().includes(q))
                      );
                    })
                    .map((event) => {
                      const now = Date.now();
                      const isOngoing = event.startTime <= now && event.endTime > now;
                      const startDate = new Date(event.startTime);
                      const endDate = new Date(event.endTime);
                      const isToday = startDate.toDateString() === new Date().toDateString();
                      const formattedTime = event.allDay
                        ? 'All Day'
                        : `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                      const formattedDay = isToday
                        ? 'Today'
                        : startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

                      return (
                        <div
                          key={event.id}
                          className={`p-3 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                            isOngoing ? 'border-red-500/40 shadow-sm' : ''
                          }`}
                          style={{
                            backgroundColor: isOngoing
                              ? 'rgba(244, 63, 94, 0.08)'
                              : getSurfaceRgba(settings.theme, Math.max(15, (settings.taskbarOpacity ?? 92) - 15), 'card'),
                          }}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Date/Time Badge */}
                            <div
                              className={`px-2.5 py-1.5 ${currentTheme.buttonRadius} flex flex-col items-center justify-center shrink-0 min-w-[65px] border`}
                              style={{
                                backgroundColor: isOngoing ? 'rgba(244, 63, 94, 0.2)' : currentAccent.badgeBg,
                                borderColor: isOngoing ? '#F43F5E' : currentAccent.badgeBorder,
                              }}
                            >
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider"
                                style={{ color: isOngoing ? '#F43F5E' : currentAccent.hex }}
                              >
                                {formattedDay}
                              </span>
                              <span
                                className="text-[11px] font-mono font-semibold"
                                style={{ color: isOngoing ? '#F43F5E' : currentAccent.hex }}
                              >
                                {event.allDay ? 'All Day' : startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className={`font-bold text-xs ${currentTheme.classes.textPrimary} truncate`}>
                                  {event.title}
                                </h4>
                                {isOngoing && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                                    LIVE NOW
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[10px] text-[#8E8E93] flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  <span>{formattedTime}</span>
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1 truncate max-w-xs">
                                    <MapPin size={10} />
                                    <span>{event.location}</span>
                                  </span>
                                )}
                              </div>

                              {event.description && (
                                <p className={`text-[10.5px] ${currentTheme.classes.textSecondary} line-clamp-1 pt-0.5`}>
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Button: Join Meeting */}
                          {event.meetLink && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                audio.playTap();
                                const bridge = (window as any).NodusNativeBridge;
                                if (bridge && typeof bridge.openExternalUrl === 'function') {
                                  bridge.openExternalUrl(event.meetLink);
                                } else {
                                  window.open(event.meetLink, '_blank');
                                }
                              }}
                              className={`px-3 py-1.5 ${currentTheme.pillRadius} text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm transition hover:scale-105 active:scale-95`}
                              style={{
                                backgroundColor: isOngoing ? '#F43F5E' : currentAccent.hex,
                                color: isOngoing ? '#FFFFFF' : '#090B10',
                              }}
                            >
                              <Video size={12} strokeWidth={2.5} />
                              <span>Join Call</span>
                              <ExternalLink size={10} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Creator: Sticky Notes & Checklist Composer */}
              <div className="mb-4 flex justify-center">
                <div
                  ref={composerRef}
                  className={`w-full max-w-xl transition-all duration-200 ${
                    settings.theme === 'neobrutalism'
                      ? 'rounded-xl border-2 border-black shadow-[3px_3px_0px_#000000]'
                      : settings.theme === 'cyberpunk-hud'
                      ? 'rounded-none border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                      : settings.theme === 'nordic-minimal'
                      ? 'rounded-none border border-white/20'
                      : settings.theme === 'material-light'
                      ? 'rounded-2xl border shadow-sm'
                      : 'rounded-xl border border-white/10 backdrop-blur-xl shadow-lg'
                  } ${composerColorStyle.cardBorder}`}
                  style={{
                    backgroundColor: composerColorStyle.cardBg,
                  }}
                >
                  {!isComposerExpanded ? (
                    <div
                      onClick={() => {
                        audio.playTap();
                        setIsComposerExpanded(true);
                      }}
                      className="p-3 flex items-center justify-between cursor-text select-none"
                    >
                      <span className="text-xs text-[#8E8E93] font-medium">Take a note or create a checklist...</span>
                      <div className="flex items-center gap-1 text-[#8E8E93]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            audio.playTap();
                            setNewType('todo');
                            setIsComposerExpanded(true);
                          }}
                          className={`p-1.5 ${currentTheme.buttonRadius} hover:bg-black/10 dark:hover:bg-white/10 transition`}
                          title="New Task"
                        >
                          <CheckSquare size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            audio.playTap();
                            setNewType('checklist');
                            setIsComposerExpanded(true);
                          }}
                          className={`p-1.5 ${currentTheme.buttonRadius} hover:bg-black/10 dark:hover:bg-white/10 transition`}
                          title="New Checklist"
                        >
                          <ListChecks size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 space-y-2.5 animate-in fade-in duration-150">
                      {/* Composer Header: Title & Pin */}
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Title"
                          className={`w-full bg-transparent font-semibold text-xs leading-none ${composerColorStyle.textColor} placeholder:text-[#64748B] focus:outline-none`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            audio.playTap();
                            setNewPinned(!newPinned);
                          }}
                          className={`p-1 ${currentTheme.buttonRadius} transition ${
                            newPinned ? 'text-[#F59E0B]' : 'text-[#8E8E93] hover:text-white'
                          }`}
                          title={newPinned ? 'Unpin' : 'Pin note'}
                        >
                          <Pin size={13} className={newPinned ? 'fill-current' : ''} />
                        </button>
                      </div>

                      {/* Composer Body */}
                      {newType === 'checklist' ? (
                        <div className="space-y-1.5 my-1">
                          {/* List of current items */}
                          {newChecklistItems.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-1.5 py-0.5 group/item">
                              <button
                                type="button"
                                onClick={() => {
                                  audio.playTap();
                                  setNewChecklistItems((prev) =>
                                    prev.map((i, iIdx) => (iIdx === idx ? { ...i, completed: !i.completed } : i))
                                  );
                                }}
                                className="text-[#8E8E93] hover:text-white transition"
                              >
                                {item.completed ? (
                                  <CheckSquare size={13} className="text-[#10B981] fill-[#10B981]/20" />
                                ) : (
                                  <Square size={13} />
                                )}
                              </button>
                              <input
                                type="text"
                                value={item.text}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewChecklistItems((prev) =>
                                    prev.map((i, iIdx) => (iIdx === idx ? { ...i, text: val } : i))
                                  );
                                }}
                                className={`flex-1 bg-transparent text-[11px] ${composerColorStyle.textColor} placeholder:text-[#64748B] focus:outline-none ${
                                  item.completed ? 'line-through opacity-50' : ''
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  audio.playTap();
                                  setNewChecklistItems((prev) => prev.filter((_, iIdx) => iIdx !== idx));
                                }}
                                className="p-0.5 text-[#8E8E93] hover:text-[#FF453A] transition opacity-60 hover:opacity-100"
                                title="Remove item"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ))}

                          {/* Add Item Row */}
                          <div className="flex items-center gap-1.5 pt-1 border-t border-black/10 dark:border-white/10">
                            <Plus size={12} className="text-[#8E8E93] shrink-0" />
                            <input
                              ref={newChecklistInputRef}
                              type="text"
                              value={newChecklistItemInput}
                              onChange={(e) => setNewChecklistItemInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddChecklistItemToComposer();
                                }
                              }}
                              placeholder="Add checklist item (press Enter)..."
                              className={`flex-1 bg-transparent text-[11px] ${composerColorStyle.textColor} placeholder:text-[#64748B] focus:outline-none`}
                            />
                            {newChecklistItemInput.trim() && (
                              <button
                                type="button"
                                onClick={handleAddChecklistItemToComposer}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${settings.theme === 'material-light' ? 'bg-[#0B57D0] text-white hover:bg-[#0842A0]' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                              >
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <textarea
                          value={newText}
                          onChange={(e) => setNewText(e.target.value)}
                          rows={3}
                          autoFocus
                          placeholder={newType === 'todo' ? 'Task description...' : 'Take a note...'}
                          className={`w-full bg-transparent text-[11px] leading-relaxed ${composerColorStyle.textColor} placeholder:text-[#64748B] focus:outline-none resize-y`}
                        />
                      )}

                      {/* Due Date if To-Do */}
                      {newType === 'todo' && (
                        <div className="flex items-center gap-1.5 pt-1 border-t border-black/10 dark:border-white/10 text-[11px] text-[#8E8E93]">
                          <Calendar size={11} />
                          <input
                            type="text"
                            value={newDueDate}
                            onChange={(e) => setNewDueDate(e.target.value)}
                            placeholder="Due time (e.g. Today 5:00 PM, Tomorrow)"
                            className={`bg-transparent border-b border-black/20 dark:border-white/20 px-1 py-0.5 text-[11px] ${composerColorStyle.textColor} placeholder:text-[#64748B] focus:outline-none w-56`}
                          />
                        </div>
                      )}

                      {/* Bottom Toolbar & Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-black/10 dark:border-white/10">
                        <div className="flex items-center gap-1 relative">
                          {/* Category Switcher */}
                          <div className="flex items-center gap-0.5 bg-black/20 p-0.5 rounded-lg border border-white/10">
                            <button
                              type="button"
                              onClick={() => setNewType('note')}
                              className={`px-1.5 py-0.5 ${currentTheme.buttonRadius} text-[9px] font-semibold flex items-center gap-1 transition ${
                                newType === 'note' ? 'bg-white/20 text-white' : 'text-[#8E8E93] hover:text-white'
                              }`}
                            >
                              <StickyNote size={10} />
                              <span>Note</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewType('todo')}
                              className={`px-1.5 py-0.5 ${currentTheme.buttonRadius} text-[9px] font-semibold flex items-center gap-1 transition ${
                                newType === 'todo' ? 'bg-white/20 text-white' : 'text-[#8E8E93] hover:text-white'
                              }`}
                            >
                              <CheckSquare size={10} />
                              <span>Task</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewType('checklist')}
                              className={`px-1.5 py-0.5 ${currentTheme.buttonRadius} text-[9px] font-semibold flex items-center gap-1 transition ${
                                newType === 'checklist' ? 'bg-white/20 text-white' : 'text-[#8E8E93] hover:text-white'
                              }`}
                            >
                              <ListChecks size={10} />
                              <span>Checklist</span>
                            </button>
                          </div>

                          {/* Color Palette Trigger */}
                          <button
                            type="button"
                            onClick={() => setShowColorPickerForNew(!showColorPickerForNew)}
                            className={`p-1.5 ${currentTheme.buttonRadius} hover:bg-black/10 dark:hover:bg-white/10 text-[#8E8E93] hover:text-white transition`}
                            title="Note Color"
                          >
                            <Palette size={13} />
                          </button>

                          {/* Color Palette Popover */}
                          {showColorPickerForNew && (
                            <div className="absolute left-0 bottom-full mb-1.5 p-1.5 rounded-xl bg-[#1E2330] border border-white/10 shadow-2xl flex items-center gap-1.5 z-30 animate-in zoom-in-95 duration-100">
                              {NOTE_COLOR_KEYS.map((c) => {
                                const cInfo = getNoteColorStyle(c, settings.theme, settings.taskbarOpacity);
                                return (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => {
                                      setNewColor(c);
                                      setShowColorPickerForNew(false);
                                    }}
                                    className={`w-4 h-4 rounded-full transition-transform hover:scale-125 border ${
                                      newColor === c ? 'ring-1.5 ring-white border-white scale-110' : 'border-black/20'
                                    }`}
                                    style={{ backgroundColor: cInfo.dotColor }}
                                    title={cInfo.label}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsComposerExpanded(false);
                              setNewTitle('');
                              setNewText('');
                              setNewChecklistItems([]);
                              setNewChecklistItemInput('');
                            }}
                            className="px-2 py-0.5 text-[11px] text-[#8E8E93] hover:text-white transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateNote}
                            className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[11px] font-bold transition flex items-center gap-1 shadow-md`}
                            style={{
                              backgroundColor: currentAccent.hex,
                              color: '#090B10',
                            }}
                          >
                            <Plus size={11} className="stroke-[3]" />
                            <span>Done</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Cards Display */}
              {filteredNotes.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8E8E93]">
                    <StickyNote size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">No items found</p>
                    <p className="text-[11px] text-[#8E8E93] max-w-xs mt-0.5">
                      {searchQuery
                        ? `No notes matching "${searchQuery}"`
                        : 'Capture thoughts, tasks, and clickable checklists with the composer above.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pinned Notes Section */}
                  {pinnedNotes.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 px-0.5">
                        <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#8E8E93]">
                          PINNED ({pinnedNotes.length})
                        </span>
                      </div>
                      <div
                        className={
                          viewMode === 'grid'
                            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 items-start'
                            : 'flex flex-col space-y-2'
                        }
                      >
                        {pinnedNotes.map((note) => renderNoteCard(note))}
                      </div>
                    </div>
                  )}

                  {/* Other Notes Section */}
                  {otherNotes.length > 0 && (
                    <div className="space-y-2">
                      {pinnedNotes.length > 0 && (
                        <div className="flex items-center gap-1.5 px-0.5 pt-1">
                          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#8E8E93]">
                            OTHERS ({otherNotes.length})
                          </span>
                        </div>
                      )}
                      <div
                        className={
                          viewMode === 'grid'
                            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 items-start'
                            : 'flex flex-col space-y-2'
                        }
                      >
                        {otherNotes.map((note) => renderNoteCard(note))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Consolidated Note Editor Dialog */}
        <NoteEditorDialog
          note={editingNote}
          isOpen={Boolean(editingNote)}
          onClose={() => setEditingNote(null)}
        />
      </div>
    </div>
  );
};

