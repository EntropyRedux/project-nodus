import React from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { NoteEditorDialog } from '../common/NoteEditorDialog';

export const SingleNoteModal: React.FC = () => {
  const { notes, singleViewingNoteId, closeSingleNote } = useLauncher();
  const activeNote = notes.find((n) => n.id === singleViewingNoteId) || null;

  return (
    <NoteEditorDialog
      note={activeNote}
      isOpen={Boolean(singleViewingNoteId && activeNote)}
      onClose={closeSingleNote}
    />
  );
};
