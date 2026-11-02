import { useEffect, useRef } from "react";

export type EndCallCopy = {
  title: string;
  finish: string;
  finishingHint: string;
  leave: string;
  keepGoing: string;
};

/** End-call flow: finish with a report, leave without concluding, or go back to the call. Copy comes from the room. */
export function EndCallDialog({ open, canFinish, copy, onClose, onFinish, onLeave }: { open: boolean; canFinish: boolean; copy: EndCallCopy; onClose: () => void; onFinish: () => void; onLeave: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={dialogRef} className="mt-dialog" aria-labelledby="end-call-title" onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="mt-dialog-body">
        <h2 id="end-call-title" className="mt-dialog-title">{copy.title}</h2>
        <button type="button" className="mt-dialog-btn mt-dialog-primary" onClick={onFinish} disabled={!canFinish} autoFocus={canFinish}>
          {copy.finish}{!canFinish && <small>{copy.finishingHint}</small>}
        </button>
        <button type="button" className="mt-dialog-btn mt-dialog-danger" onClick={onLeave}>{copy.leave}</button>
        <button type="button" className="mt-dialog-btn" onClick={onClose} autoFocus={!canFinish}>{copy.keepGoing}</button>
      </div>
    </dialog>
  );
}
