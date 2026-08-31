import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';
import { getNoteColorStyle, NOTE_COLOR_KEYS } from '../../utils/noteTheme';
import { audio } from '../../utils/audio';
import {
  Search,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  StickyNote,
  Pin,
  ListTodo,
  ListChecks,
  LayoutGrid,
  List,
  Palette,
  X,
  Check,
  Edit3,
  Clock,
  Sparkles,
} from 'lucide-react';
import { NoteItem, NoteCategory, NoteColor, ChecklistItem } from '../../types/launcher';
import { NoteEditorDialog } from '../common/NoteEditorDialog';

export const NotesApp: React.FC = () => {
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    toggleTodo,
    toggleChecklistItem,
    settings,
  } = useLauncher();

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'notes' | 'todos' | 'checklists' | 'pinned'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  // Close composer when clicking outside if fields are empty
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

  // Open note for editing
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

    // Reset composer
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
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
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
  }, [notes, searchQuery, activeFilter]);

  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.pinned), [filteredNotes]);
  const otherNotes = useMemo(() => filteredNotes.filter((n) => !n.pinned), [filteredNotes]);

  const notesCount = useMemo(() => notes.filter((n) => n.type === 'note').length, [notes]);
  const todosCount = useMemo(() => notes.filter((n) => n.type === 'todo').length, [notes]);
  const checklistsCount = useMemo(() => notes.filter((n) => n.type === 'checklist').length, [notes]);
  const pinnedCount = useMemo(() => notes.filter((n) => n.pinned).length, [notes]);

  const composerColorStyle = getNoteColorStyle(newColor, settings.theme, settings.taskbarOpacity);

  // Cycle category helper
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
        className={`group relative p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
          settings.theme === 'neobrutalism'
            ? 'rounded-xl border-2 shadow-[3px_3px_0px_#000000] hover:shadow-[5px_5px_0px_#000000] hover:-translate-y-0.5'
            : settings.theme === 'cyberpunk-hud'
            ? 'rounded-none border hover:border-cyan-400/60 shadow-[0_0_10px_rgba(0,240,255,0.06)]'
            : settings.theme === 'nordic-minimal'
            ? 'rounded-none border hover:border-white/20'
            : 'rounded-2xl border hover:border-white/25 backdrop-blur-xl shadow-md hover:shadow-xl'
        } ${colorStyle.cardBorder} ${note.completed ? 'opacity-60' : ''}`}
        style={{
          backgroundColor: colorStyle.cardBg,
        }}
      >
        <div>
          {/* Card Top: Title & Pin Button */}
          <div className="flex items-start justify-between gap-2 mb-2">
            {note.title ? (
              <div className="flex flex-col">
                <h4 className={`font-semibold text-sm leading-snug tracking-tight ${colorStyle.textColor} ${note.completed ? 'line-through opacity-70' : ''}`}>
                  {note.title}
                </h4>
                {isChecklist && (
                  <span className="text-[10px] font-mono text-[#8E8E93] flex items-center gap-1 mt-0.5">
                    <ListChecks size={11} className="text-emerald-400" />
                    <span>
                      {completedItemsCount}/{checklistItems.length} completed
                    </span>
                  </span>
                )}
              </div>
            ) : (
              <div className="text-[11px] font-mono text-[#8E8E93] uppercase tracking-wider flex items-center gap-1">
                {isChecklist ? (
                  <>
                    <ListChecks size={12} className="text-emerald-400" />
                    <span>Checklist ({completedItemsCount}/{checklistItems.length})</span>
                  </>
                ) : isTodo ? (
                  <>
                    <CheckSquare size={12} />
                    <span>Task</span>
                  </>
                ) : (
                  <>
                    <StickyNote size={12} />
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
              <Pin size={14} className={note.pinned ? 'fill-current' : ''} />
            </button>
          </div>

          {/* Card Body: Checklist vs Single To-Do vs Plain Note */}
          {isChecklist ? (
            <div className="space-y-1.5 my-1.5">
              {checklistItems.length === 0 ? (
                <p className="text-xs text-[#8E8E93] italic">No items in checklist</p>
              ) : (
                <div className="space-y-1">
                  {checklistItems.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleChecklistItem(note.id, item.id);
                      }}
                      className="flex items-start gap-2 py-0.5 group/item cursor-pointer"
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
                          <CheckSquare size={14} className="text-[#10B981] fill-[#10B981]/20" />
                        ) : (
                          <Square size={14} className="opacity-70 group-hover/item:opacity-100" />
                        )}
                      </button>
                      <span
                        className={`text-xs leading-relaxed break-words ${colorStyle.textColor} ${
                          item.completed ? 'line-through opacity-50' : ''
                        }`}
                      >
                        {item.text}
                      </span>
                    </div>
                  ))}
                  {checklistItems.length > 5 && (
                    <p className="text-[10.5px] font-mono text-[#8E8E93] pl-5 pt-0.5">
                      +{checklistItems.length - 5} more items
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : isTodo ? (
            <div className="space-y-1.5 my-1">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  audio.playTap();
                  toggleTodo(note.id);
                }}
                className="flex items-start gap-2 group/todo py-0.5 cursor-pointer"
              >
                <div className="mt-0.5 shrink-0 text-[#8E8E93] hover:text-white transition">
                  {note.completed ? (
                    <CheckSquare size={16} className="text-[#10B981] fill-[#10B981]/20" />
                  ) : (
                    <Square size={16} />
                  )}
                </div>
                <p className={`text-xs leading-relaxed break-words ${colorStyle.textColor} ${note.completed ? 'line-through opacity-60' : ''}`}>
                  {note.text}
                </p>
              </div>

              {note.dueDate && (
                <div className="flex items-center gap-1 text-[11px] pt-1">
                  <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] flex items-center gap-1 ${colorStyle.badgeBg}`}>
                    <Clock size={10} />
                    <span>{note.dueDate}</span>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className={`text-xs leading-relaxed whitespace-pre-wrap break-words line-clamp-6 my-1 ${colorStyle.textColor}`}>
              {note.text}
            </p>
          )}
        </div>

        {/* Card Footer Toolbar (Visible on Hover/Focus) */}
        <div className={`flex items-center justify-between pt-2.5 mt-2 border-t ${cardDividerClass} opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity`}>
          <div className="flex items-center gap-1 relative">
            {/* Color Palette Picker Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                audio.playTap();
                setColorPopoverNoteId(colorPopoverNoteId === note.id ? null : note.id);
              }}
              className={`p-1.5 ${currentTheme.buttonRadius} ${cardActionBtnClass} transition`}
              title="Change note color"
            >
              <Palette size={13} />
            </button>

            {/* Color Popover Menu */}
            {colorPopoverNoteId === note.id && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute left-0 bottom-8 z-30 p-1.5 flex items-center gap-1.5 ${popoverBgClass} rounded-xl shadow-xl animate-in zoom-in-95 border`}
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
                      className={`w-5 h-5 rounded-full transition-transform hover:scale-125 border ${
                        note.color === c ? 'ring-2 ring-primary border-white scale-110' : 'border-black/20'
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
                  // convert lines or text to checklist items
                  const lines = (note.text || '').split('\n').filter((l) => l.trim().length > 0);
                  const items: ChecklistItem[] = lines.length > 0
                    ? lines.map((l, idx) => ({ id: `chk-${Date.now()}-${idx}`, text: l.trim(), completed: false }))
                    : [{ id: `chk-${Date.now()}-0`, text: note.text || 'Item 1', completed: false }];
                  updates.checklist = items;
                }
                updateNote(note.id, updates);
              }}
              className={`p-1.5 ${currentTheme.buttonRadius} ${cardActionBtnClass} transition`}
              title={`Switch type (Current: ${note.type})`}
            >
              {isChecklist ? (
                <ListChecks size={13} className={isLight ? 'text-[#0B57D0]' : 'text-emerald-400'} />
              ) : isTodo ? (
                <CheckSquare size={13} />
              ) : (
                <StickyNote size={13} />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Delete Note Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                audio.playTap();
                deleteNote(note.id);
              }}
              className={`p-1.5 ${currentTheme.buttonRadius} hover:bg-[#FF453A]/15 text-[#8E8E93] hover:text-[#FF453A] transition`}
              title="Delete note"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const isLight = settings.theme === 'material-light';

  // Helper text/bg classes based on isLight
  const searchBgClass = isLight ? 'bg-[#FFFFFF] border-[#CBD5E1] text-[#0F172A] shadow-xs' : `${currentTheme.classes.inputField} text-white`;
  const filterBoxBgClass = isLight ? 'bg-[#F1F5F9] border-[#CBD5E1]' : 'bg-black/20 border-white/5';
  const filterInactiveClass = isLight ? 'text-[#475569] hover:text-[#0F172A] hover:bg-[#E2E8F0]' : 'text-[#8E8E93] hover:text-white';
  const filterActiveClass = isLight ? 'bg-[#D3E3FD] text-[#041E49] shadow-xs font-bold' : 'bg-white/20 text-white shadow-sm font-bold';
  const popoverBgClass = isLight ? 'bg-[#FFFFFF] border-[#CBD5E1] shadow-xl' : 'bg-[#161B26] border-white/15 shadow-xl';
  const cardDividerClass = isLight ? 'border-[#E2E8F0]' : 'border-white/5';
  const cardActionBtnClass = isLight ? 'text-[#64748B] hover:text-[#0F172A] hover:bg-black/5' : 'text-[#8E8E93] hover:text-white hover:bg-white/10';

  return (
    <div
      data-theme={settings.theme}
      className={`h-full w-full flex flex-col overflow-hidden ${currentTheme.classes.containerFont} ${currentTheme.classes.textPrimary} select-none`}
      style={{
        backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'window'),
      }}
    >
      {/* Top Search & Filter Bar */}
      <div
        className={`px-4 sm:px-6 py-3 border-b ${currentTheme.classes.cardBorder} flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0`}
        style={{
          backgroundColor: getSurfaceRgba(settings.theme, Math.min(100, (settings.taskbarOpacity ?? 92) + 5), 'card'),
        }}
      >
        {/* Search Box */}
        <div className="flex-1 max-w-lg relative">
          <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-[#64748B]' : 'text-[#8E8E93]'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, tasks & checklists..."
            className={`w-full ${searchBgClass} pl-9 pr-8 py-2 text-xs rounded-xl border placeholder:text-[#64748B] focus:outline-none transition`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-[#64748B] hover:text-[#0F172A]' : 'text-[#8E8E93] hover:text-white'} p-1`}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Chips & View Mode Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto scrollbar-none">
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${filterBoxBgClass} shrink-0`}>
            <button
              type="button"
              onClick={() => {
                audio.playTap();
                setActiveFilter('all');
              }}
              className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[11px] transition ${
                activeFilter === 'all' ? filterActiveClass : filterInactiveClass
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
              className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[11px] transition flex items-center gap-1 ${
                activeFilter === 'notes' ? filterActiveClass : filterInactiveClass
              }`}
            >
              <StickyNote size={11} />
              <span>Notes ({notesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                audio.playTap();
                setActiveFilter('todos');
              }}
              className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[11px] transition flex items-center gap-1 ${
                activeFilter === 'todos' ? filterActiveClass : filterInactiveClass
              }`}
            >
              <CheckSquare size={11} />
              <span>Tasks ({todosCount})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                audio.playTap();
                setActiveFilter('checklists');
              }}
              className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[11px] transition flex items-center gap-1 ${
                activeFilter === 'checklists' ? filterActiveClass : filterInactiveClass
              }`}
            >
              <ListChecks size={11} className={activeFilter === 'checklists' ? (isLight ? 'text-[#0B57D0]' : 'text-emerald-300') : ''} />
              <span>Checklists ({checklistsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                audio.playTap();
                setActiveFilter('pinned');
              }}
              className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[11px] transition flex items-center gap-1 ${
                activeFilter === 'pinned' ? filterActiveClass : filterInactiveClass
              }`}
            >
              <Pin size={11} />
              <span>Pinned ({pinnedCount})</span>
            </button>
          </div>

          {/* Grid / List View Toggle */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${filterBoxBgClass} shrink-0`}>
            <button
              type="button"
              onClick={() => {
                audio.playTap();
                setViewMode('grid');
              }}
              className={`p-1.5 ${currentTheme.buttonRadius} transition ${
                viewMode === 'grid' ? filterActiveClass : filterInactiveClass
              }`}
              title="Grid View"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                audio.playTap();
                setViewMode('list');
              }}
              className={`p-1.5 ${currentTheme.buttonRadius} transition ${
                viewMode === 'list' ? filterActiveClass : filterInactiveClass
              }`}
              title="List View"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-7 scrollbar-thin">
        {/* Google Keep "Take a note..." Interactive Composer Card */}
        <div className="w-full max-w-xl mx-auto">
          <div
            ref={composerRef}
            id="keep-note-composer"
            onClick={() => {
              if (!isComposerExpanded) {
                audio.playTap();
                setIsComposerExpanded(true);
              }
            }}
            className={`w-full transition-all duration-200 overflow-hidden ${
              settings.theme === 'neobrutalism'
                ? 'rounded-xl border-2 shadow-[4px_4px_0px_#000000]'
                : settings.theme === 'cyberpunk-hud'
                ? 'rounded-none border shadow-[0_0_15px_rgba(0,240,255,0.08)]'
                : settings.theme === 'nordic-minimal'
                ? 'rounded-none border'
                : isLight
                ? 'rounded-2xl border shadow-md'
                : 'rounded-2xl border backdrop-blur-2xl shadow-xl'
            } ${composerColorStyle.cardBorder}`}
            style={{
              backgroundColor: isComposerExpanded
                ? composerColorStyle.cardBg
                : isLight
                ? '#FFFFFF'
                : getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'card'),
            }}
          >
            {!isComposerExpanded ? (
              /* Collapsed Single-line "Take a note..." Bar */
              <div className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer">
                <span className={`text-xs font-medium select-none ${isLight ? 'text-[#64748B]' : 'text-[#8E8E93]'}`}>
                  Take a note, task or checklist...
                </span>
                <div className={`flex items-center gap-1.5 ${isLight ? 'text-[#64748B]' : 'text-[#8E8E93]'}`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      audio.playTap();
                      setNewType('checklist');
                      setIsComposerExpanded(true);
                    }}
                    className={`p-1.5 ${currentTheme.buttonRadius} ${isLight ? 'hover:text-[#0B57D0] hover:bg-black/5' : 'hover:text-emerald-400 hover:bg-white/10'} transition`}
                    title="New checklist"
                  >
                    <ListChecks size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      audio.playTap();
                      setNewType('todo');
                      setIsComposerExpanded(true);
                    }}
                    className={`p-1.5 ${currentTheme.buttonRadius} ${isLight ? 'hover:text-[#0F172A] hover:bg-black/5' : 'hover:text-white hover:bg-white/10'} transition`}
                    title="New task"
                  >
                    <CheckSquare size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      audio.playTap();
                      setNewType('note');
                      setIsComposerExpanded(true);
                    }}
                    className={`p-1.5 ${currentTheme.buttonRadius} ${isLight ? 'hover:text-[#0F172A] hover:bg-black/5' : 'hover:text-white hover:bg-white/10'} transition`}
                    title="New note"
                  >
                    <StickyNote size={16} />
                  </button>
                </div>
              </div>
            ) : (
              /* Expanded Full Note Creation Form */
              <div className="p-4 space-y-3 animate-in fade-in duration-150">
                {/* Title Row + Pin */}
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Title"
                    className={`w-full bg-transparent font-bold text-sm ${composerColorStyle.textColor} placeholder:text-[#64748B] focus:outline-none ${
                      settings.theme === 'neobrutalism' ? 'text-black placeholder:text-black/50' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      setNewPinned(!newPinned);
                    }}
                    className={`p-1.5 ${currentTheme.buttonRadius} transition ${
                      newPinned
                        ? 'text-[#F59E0B] bg-amber-500/15'
                        : isLight
                        ? 'text-[#64748B] hover:text-[#0F172A] hover:bg-black/5'
                        : 'text-[#8E8E93] hover:text-white hover:bg-white/10'
                    }`}
                    title={newPinned ? 'Pinned to top' : 'Pin to top'}
                  >
                    <Pin size={15} className={newPinned ? 'fill-current' : ''} />
                  </button>
                </div>

                {/* Main Content Body: Checklist Builder vs Textarea */}
                {newType === 'checklist' ? (
                  <div className="space-y-2 py-1">
                    {/* Existing Items List */}
                    {newChecklistItems.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2 group/chk">
                        <button
                          type="button"
                          onClick={() => {
                            audio.playTap();
                            setNewChecklistItems((prev) =>
                              prev.map((i, iIdx) =>
                                iIdx === idx ? { ...i, completed: !i.completed } : i
                              )
                            );
                          }}
                          className={`${isLight ? 'text-[#64748B] hover:text-[#0F172A]' : 'text-[#8E8E93] hover:text-white'} transition`}
                        >
                          {item.completed ? (
                            <CheckSquare size={15} className="text-[#10B981] fill-[#10B981]/20" />
                          ) : (
                            <Square size={15} />
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
                          className={`flex-1 bg-transparent text-xs ${composerColorStyle.textColor} placeholder:text-[#64748B] focus:outline-none ${
                            item.completed ? 'line-through opacity-50' : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            audio.playTap();
                            setNewChecklistItems((prev) => prev.filter((_, iIdx) => iIdx !== idx));
                          }}
                          className="p-1 text-[#8E8E93] hover:text-[#FF453A] transition opacity-60 hover:opacity-100"
                          title="Remove item"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {/* New Item Input Row */}
                    <div className={`flex items-center gap-2 pt-1 border-t ${cardDividerClass}`}>
                      <Plus size={14} className={`${isLight ? 'text-[#64748B]' : 'text-[#8E8E93]'} shrink-0`} />
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
                        className={`flex-1 bg-transparent text-xs ${composerColorStyle.textColor} placeholder:text-[#64748B] focus:outline-none`}
                      />
                      {newChecklistItemInput.trim() && (
                        <button
                          type="button"
                          onClick={handleAddChecklistItemToComposer}
                          className={`px-2 py-0.5 ${isLight ? 'bg-[#0B57D0] text-white hover:bg-[#0842A0]' : 'bg-white/10 hover:bg-white/20 text-white'} rounded text-[11px] font-medium transition`}
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
                    rows={4}
                    autoFocus
                    placeholder={newType === 'todo' ? 'Task description...' : 'Take a note...'}
                    className={`w-full bg-transparent text-xs leading-relaxed ${composerColorStyle.textColor} placeholder:text-[#64748B] focus:outline-none resize-y ${
                      settings.theme === 'neobrutalism' ? 'text-black placeholder:text-black/50' : ''
                    }`}
                  />
                )}

                {/* Due Date if To-Do */}
                {newType === 'todo' && (
                  <div className={`flex items-center gap-2 pt-1 border-t ${cardDividerClass} text-xs ${isLight ? 'text-[#475569]' : 'text-[#8E8E93]'}`}>
                    <Calendar size={13} />
                    <input
                      type="text"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      placeholder="Due time (e.g. Today 5:00 PM, Tomorrow)"
                      className={`bg-transparent border-b ${isLight ? 'border-[#CBD5E1] text-[#0F172A]' : 'border-white/20 text-white'} px-1 py-0.5 text-xs placeholder:text-[#64748B] focus:outline-none w-64`}
                    />
                  </div>
                )}

                {/* Bottom Toolbar & Action Buttons */}
                <div className={`flex flex-wrap items-center justify-between gap-2 pt-2 border-t ${cardDividerClass}`}>
                  <div className="flex items-center gap-1.5 relative">
                    {/* Category Switcher */}
                    <div className={`flex items-center gap-0.5 p-0.5 rounded-lg border ${filterBoxBgClass}`}>
                      <button
                        type="button"
                        onClick={() => setNewType('note')}
                        className={`px-2 py-1 ${currentTheme.buttonRadius} text-[10px] font-semibold flex items-center gap-1 transition ${
                          newType === 'note' ? filterActiveClass : filterInactiveClass
                        }`}
                      >
                        <StickyNote size={11} />
                        <span>Note</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewType('todo')}
                        className={`px-2 py-1 ${currentTheme.buttonRadius} text-[10px] font-semibold flex items-center gap-1 transition ${
                          newType === 'todo' ? filterActiveClass : filterInactiveClass
                        }`}
                      >
                        <CheckSquare size={11} />
                        <span>Task</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewType('checklist')}
                        className={`px-2 py-1 ${currentTheme.buttonRadius} text-[10px] font-semibold flex items-center gap-1 transition ${
                          newType === 'checklist' ? filterActiveClass : filterInactiveClass
                        }`}
                      >
                        <ListChecks size={11} className={newType === 'checklist' ? (isLight ? 'text-[#0B57D0]' : 'text-emerald-400') : ''} />
                        <span>Checklist</span>
                      </button>
                    </div>

                    {/* Color Palette Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowColorPickerForNew(!showColorPickerForNew)}
                      className={`p-1.5 ${currentTheme.buttonRadius} ${cardActionBtnClass} transition`}
                      title="Color palette"
                    >
                      <Palette size={14} />
                    </button>

                    {/* Color Palette Popup */}
                    {showColorPickerForNew && (
                      <div className={`absolute left-0 bottom-8 z-30 p-1.5 flex items-center gap-1.5 ${popoverBgClass} rounded-xl shadow-xl animate-in zoom-in-95 border`}>
                        {NOTE_COLOR_KEYS.map((c) => {
                          const cInfo = getNoteColorStyle(c, settings.theme);
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setNewColor(c);
                                setShowColorPickerForNew(false);
                              }}
                              className={`w-5 h-5 rounded-full transition-transform hover:scale-125 border ${
                                newColor === c ? 'ring-2 ring-primary border-white scale-110' : 'border-black/20'
                              }`}
                              style={{ backgroundColor: cInfo.dotColor }}
                              title={cInfo.label}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsComposerExpanded(false);
                        setNewTitle('');
                        setNewText('');
                        setNewChecklistItems([]);
                        setNewChecklistItemInput('');
                      }}
                      className={`px-3 py-1 text-xs ${isLight ? 'text-[#64748B] hover:text-[#0F172A]' : 'text-[#8E8E93] hover:text-white'} transition`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateNote}
                      className={`px-3.5 py-1.5 ${currentTheme.buttonRadius} text-xs font-bold transition flex items-center gap-1 shadow-md`}
                      style={{
                        backgroundColor: currentAccent.hex,
                        color: '#090B10',
                      }}
                    >
                      <Plus size={13} className="stroke-[3]" />
                      <span>Done</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Empty State */}
        {filteredNotes.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
            <div className={`w-14 h-14 rounded-2xl ${isLight ? 'bg-[#F1F5F9] border-[#CBD5E1] text-[#64748B]' : 'bg-white/5 border-white/10 text-[#8E8E93]'} flex items-center justify-center border`}>
              <StickyNote size={26} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${isLight ? 'text-[#0F172A]' : 'text-white'}`}>No items found</p>
              <p className={`text-xs ${isLight ? 'text-[#64748B]' : 'text-[#8E8E93]'} max-w-xs mt-1`}>
                {searchQuery
                  ? `No notes matching "${searchQuery}"`
                  : 'Capture notes, tasks, and clickable checklists with the box above.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pinned Notes Section */}
            {pinnedNotes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className={`text-[11px] font-mono font-bold tracking-wider uppercase ${isLight ? 'text-[#475569]' : 'text-[#8E8E93]'}`}>
                    PINNED ({pinnedNotes.length})
                  </span>
                </div>
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start'
                      : 'flex flex-col space-y-3'
                  }
                >
                  {pinnedNotes.map((note) => renderNoteCard(note))}
                </div>
              </div>
            )}

            {/* Other Notes Section */}
            {otherNotes.length > 0 && (
              <div className="space-y-3">
                {pinnedNotes.length > 0 && (
                  <div className="flex items-center gap-2 px-1 pt-2">
                    <span className={`text-[11px] font-mono font-bold tracking-wider uppercase ${isLight ? 'text-[#475569]' : 'text-[#8E8E93]'}`}>
                      OTHERS ({otherNotes.length})
                    </span>
                  </div>
                )}
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start'
                      : 'flex flex-col space-y-3'
                  }
                >
                  {otherNotes.map((note) => renderNoteCard(note))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Consolidated Note Editor Dialog */}
      <NoteEditorDialog
        note={editingNote}
        isOpen={Boolean(editingNote)}
        onClose={() => setEditingNote(null)}
      />
    </div>
  );
};

