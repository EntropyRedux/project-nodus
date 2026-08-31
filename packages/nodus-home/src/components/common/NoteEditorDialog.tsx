import React, { useState, useEffect, useRef } from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { getSystemTheme, getAccentColor } from '../../utils/themes';
import { getNoteColorStyle, NOTE_COLOR_KEYS } from '../../utils/noteTheme';
import { audio } from '../../utils/audio';
import {
  X,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  StickyNote,
  Pin,
  Palette,
  Check,
  ListChecks,
} from 'lucide-react';
import { NoteItem, NoteColor, ChecklistItem } from '../../types/launcher';

interface NoteEditorDialogProps {
  note: NoteItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export const NoteEditorDialog: React.FC<NoteEditorDialogProps> = ({
  note,
  isOpen,
  onClose,
  onDelete,
}) => {
  const { updateNote, deleteNote, toggleTodo, settings } = useLauncher();

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editColor, setEditColor] = useState<NoteColor>('amber');
  const [editPinned, setEditPinned] = useState(false);
  const [editCompleted, setEditCompleted] = useState(false);
  const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>([]);
  const [editChecklistInput, setEditChecklistInput] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const checklistInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever note opens or changes
  useEffect(() => {
    if (note && isOpen) {
      setEditTitle(note.title || '');
      setEditText(note.text || '');
      setEditDueDate(note.dueDate || '');
      setEditColor(note.color || 'amber');
      setEditPinned(Boolean(note.pinned));
      setEditCompleted(Boolean(note.completed));
      setEditChecklist(note.checklist ? JSON.parse(JSON.stringify(note.checklist)) : []);
      setEditChecklistInput('');
      setShowColorPicker(false);
    }
  }, [note?.id, note?.title, note?.text, note?.dueDate, note?.color, note?.pinned, note?.completed, note?.checklist, isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !note) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSaveAndClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, note, editTitle, editText, editDueDate, editColor, editPinned, editCompleted, editChecklist, editChecklistInput]);

  if (!isOpen || !note) return null;

  const isTodo = note.type === 'todo';
  const isChecklist = note.type === 'checklist';
  const editStyle = getNoteColorStyle(editColor, settings.theme, settings.taskbarOpacity);

  const completedCount = editChecklist.filter((i) => i.completed).length;
  const progressPercent =
    editChecklist.length > 0 ? Math.round((completedCount / editChecklist.length) * 100) : 0;

  const handleAddChecklistItem = () => {
    if (!editChecklistInput.trim()) return;
    audio.playTap();
    setEditChecklist((prev) => [
      ...prev,
      {
        id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        text: editChecklistInput.trim(),
        completed: false,
      },
    ]);
    setEditChecklistInput('');
    setTimeout(() => checklistInputRef.current?.focus(), 10);
  };

  const handleSaveAndClose = () => {
    if (note) {
      let itemsToSave: ChecklistItem[] | undefined = undefined;
      let finalCompleted = editCompleted;

      if (isChecklist) {
        let finalItems = [...editChecklist];
        if (editChecklistInput.trim()) {
          finalItems.push({
            id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            text: editChecklistInput.trim(),
            completed: false,
          });
        }
        itemsToSave = finalItems;
        finalCompleted = finalItems.length > 0 && finalItems.every((i) => i.completed);
      }

      updateNote(note.id, {
        title: editTitle.trim() || undefined,
        text: isChecklist
          ? `${itemsToSave?.length || 0} items`
          : editText.trim() || note.text,
        dueDate: isTodo && editDueDate.trim() ? editDueDate.trim() : undefined,
        color: editColor,
        checklist: itemsToSave,
        completed: finalCompleted,
        pinned: editPinned,
      });
    }
    audio.playTap();
    onClose();
  };

  const handleDelete = () => {
    audio.playTap();
    if (onDelete) {
      onDelete(note.id);
    } else {
      deleteNote(note.id);
    }
    onClose();
  };

  const handleTogglePin = () => {
    audio.playTap();
    const nextPinned = !editPinned;
    setEditPinned(nextPinned);
    updateNote(note.id, { pinned: nextPinned });
  };

  const handleToggleTodoStatus = () => {
    audio.playTap();
    const nextCompleted = !editCompleted;
    setEditCompleted(nextCompleted);
    toggleTodo(note.id);
  };

  const isLight = settings.theme === 'material-light';

  return (
    <div
      id="note-editor-dialog-backdrop"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleSaveAndClose();
        }
      }}
    >
      <div
        id="note-editor-dialog-card"
        data-theme={settings.theme}
        className={`w-full max-w-md max-h-[75vh] flex flex-col overflow-hidden shadow-2xl transition-all duration-200 animate-in zoom-in-95 ${
          currentTheme.classes.containerFont
        } ${currentTheme.classes.textPrimary} ${
          settings.theme === 'neobrutalism'
            ? 'rounded-xl border-2 shadow-[6px_6px_0px_#000000]'
            : settings.theme === 'cyberpunk-hud'
            ? 'rounded-none border-2 shadow-[0_0_25px_rgba(0,240,255,0.15)]'
            : settings.theme === 'nordic-minimal'
            ? 'rounded-none border'
            : settings.theme === 'material-light'
            ? 'rounded-3xl border shadow-2xl'
            : 'rounded-xl border backdrop-blur-3xl'
        } ${editStyle.cardBorder}`}
        style={{
          backgroundColor: editStyle.cardBg,
        }}
      >
        {/* Header with Category Tag, Pin & Close */}
        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isLight ? 'border-[#CBD5E1]' : 'border-black/10 dark:border-white/10'} select-none`}>
          <div className="flex items-center gap-1.5">
            <div className={`text-[10px] font-mono ${isLight ? 'text-[#475569]' : 'text-[#8E8E93]'} uppercase tracking-wider flex items-center gap-1`}>
              {isChecklist ? (
                <>
                  <ListChecks size={12} className={isLight ? 'text-[#0B57D0]' : 'text-emerald-400'} />
                  <span>Checklist</span>
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
          </div>

          <div className="flex items-center gap-1">
            {/* Pin button */}
            <button
              type="button"
              onClick={handleTogglePin}
              className={`p-1 ${currentTheme.buttonRadius} transition ${
                editPinned
                  ? 'text-[#F59E0B] bg-amber-500/15'
                  : isLight
                  ? 'text-[#64748B] hover:text-[#0F172A] hover:bg-black/5'
                  : 'text-[#8E8E93] hover:text-white hover:bg-white/10'
              }`}
              title={editPinned ? 'Pinned to top' : 'Pin to top'}
            >
              <Pin size={13} className={editPinned ? 'fill-current' : ''} />
            </button>

            {/* Close / Save */}
            <button
              type="button"
              onClick={handleSaveAndClose}
              className={`p-1 ${currentTheme.buttonRadius} ${isLight ? 'text-[#64748B] hover:text-[#0F172A] hover:bg-black/5' : 'text-[#8E8E93] hover:text-white hover:bg-white/10'} transition`}
              title="Close and save (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Edit Form Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 scrollbar-thin">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Title"
            className={`w-full bg-transparent font-bold text-xs sm:text-sm ${editStyle.textColor} placeholder:text-[#64748B] focus:outline-none`}
          />

          {/* Single To-Do due date bar */}
          {isTodo && (
            <div className={`flex items-center gap-1.5 py-1 border-y ${isLight ? 'border-[#CBD5E1]' : 'border-black/10 dark:border-white/10'}`}>
              <button
                type="button"
                onClick={handleToggleTodoStatus}
                className={`${isLight ? 'text-[#64748B] hover:text-[#0F172A]' : 'text-[#8E8E93] hover:text-white'} transition cursor-pointer`}
              >
                {editCompleted ? (
                  <CheckSquare size={14} className="text-[#10B981] fill-[#10B981]/20" />
                ) : (
                  <Square size={14} />
                )}
              </button>
              <input
                type="text"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                placeholder="Due date (e.g. Today 5:00 PM)"
                className={`flex-1 bg-transparent text-[11px] ${editStyle.textColor} placeholder:text-[#64748B] focus:outline-none`}
              />
            </div>
          )}

          {/* Checklist Items Management */}
          {isChecklist ? (
            <div className="space-y-2 pt-0.5">
              {/* Progress bar */}
              <div className="space-y-1 py-0.5">
                <div className={`flex items-center justify-between text-[10px] font-mono ${settings.theme === 'material-light' ? 'text-[#64748B]' : 'text-[#8E8E93]'}`}>
                  <span>
                    {completedCount} of {editChecklist.length} completed
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className={`w-full h-1 rounded-full overflow-hidden ${settings.theme === 'material-light' ? 'bg-black/10' : 'bg-white/10'}`}>
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1">
                {editChecklist.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-1.5 group/chk py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        audio.playTap();
                        setEditChecklist((prev) =>
                          prev.map((i, iIdx) =>
                            iIdx === idx ? { ...i, completed: !i.completed } : i
                          )
                        );
                      }}
                      className={`${isLight ? 'text-[#64748B] hover:text-[#0F172A]' : 'text-[#8E8E93] hover:text-white'} transition cursor-pointer`}
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
                        setEditChecklist((prev) =>
                          prev.map((i, iIdx) => (iIdx === idx ? { ...i, text: val } : i))
                        );
                      }}
                      className={`flex-1 bg-transparent text-[11px] ${editStyle.textColor} placeholder:text-[#64748B] focus:outline-none ${
                        item.completed ? 'line-through opacity-50' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        audio.playTap();
                        setEditChecklist((prev) => prev.filter((_, iIdx) => iIdx !== idx));
                      }}
                      className="p-0.5 text-[#8E8E93] hover:text-[#FF453A] transition cursor-pointer"
                      title="Delete item"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Item Row */}
              <div className={`flex items-center gap-1.5 pt-1.5 border-t ${isLight ? 'border-[#CBD5E1]' : 'border-black/10 dark:border-white/10'}`}>
                <Plus size={13} className={`${isLight ? 'text-[#64748B]' : 'text-[#8E8E93]'} shrink-0`} />
                <input
                  ref={checklistInputRef}
                  type="text"
                  value={editChecklistInput}
                  onChange={(e) => setEditChecklistInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  placeholder="Add item (press Enter)..."
                  className={`flex-1 bg-transparent text-[11px] ${editStyle.textColor} placeholder:text-[#64748B] focus:outline-none`}
                />
                {editChecklistInput.trim() && (
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${settings.theme === 'material-light' ? 'bg-[#0B57D0] text-white hover:bg-[#0842A0]' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          ) : (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={6}
              autoFocus
              placeholder="Note text..."
              className={`w-full bg-transparent text-[11px] leading-relaxed ${editStyle.textColor} placeholder:text-[#64748B] focus:outline-none resize-y`}
            />
          )}
        </div>

        {/* Edit Footer Toolbar */}
        <div className={`flex items-center justify-between px-4 py-2 border-t ${isLight ? 'border-[#CBD5E1]' : 'border-black/10 dark:border-white/10'} select-none`}>
          <div className="flex items-center gap-1.5 relative">
            {/* Color Palette Toggle */}
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={`p-1 ${currentTheme.buttonRadius} ${isLight ? 'text-[#64748B] hover:text-[#0F172A] hover:bg-black/5' : 'text-[#8E8E93] hover:text-white hover:bg-white/10'} transition cursor-pointer`}
              title="Change color"
            >
              <Palette size={13} />
            </button>

            {/* Color Palette Popup */}
            {showColorPicker && (
              <div className={`absolute left-0 bottom-7 z-30 p-1.5 flex items-center gap-1.5 ${isLight ? 'bg-[#FFFFFF] border-[#CBD5E1]' : 'bg-[#161B26] border-white/15'} border rounded-xl shadow-xl animate-in zoom-in-95`}>
                {NOTE_COLOR_KEYS.map((c) => {
                  const cInfo = getNoteColorStyle(c, settings.theme);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setEditColor(c);
                        setShowColorPicker(false);
                      }}
                      className={`w-4 h-4 rounded-full transition-transform hover:scale-125 border cursor-pointer ${
                        editColor === c ? 'ring-2 ring-primary border-white scale-110' : 'border-black/20'
                      }`}
                      style={{ backgroundColor: cInfo.dotColor }}
                      title={cInfo.label}
                    />
                  );
                })}
              </div>
            )}

            {/* Delete Note */}
            <button
              type="button"
              onClick={handleDelete}
              className={`p-1 ${currentTheme.buttonRadius} text-[#8E8E93] hover:text-[#FF453A] hover:bg-[#FF453A]/15 transition cursor-pointer`}
              title="Delete note"
            >
              <Trash2 size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleSaveAndClose}
            className={`px-3 py-1 ${currentTheme.buttonRadius} text-[11px] font-bold transition flex items-center gap-1 shadow-md cursor-pointer`}
            style={{
              backgroundColor: currentAccent.hex,
              color: '#090B10',
            }}
          >
            <Check size={12} className="stroke-[3]" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
