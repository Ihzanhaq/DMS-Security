"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { DownloadSimple, Eye, FileText, Image as ImageIcon, Trash, UploadSimple } from "@phosphor-icons/react";
import {
  ACCEPT_ATTRIBUTE, deleteFile, downloadFile, formatBytes, openFile, saveFile, uploadProblem,
  type StoredFileMeta,
} from "@/lib/file-store";
import { useToast } from "@/components/shared/toast-context";

/**
 * Attach, view, download, replace or remove one file. `storageKey` must be
 * stable for the slot so a replacement overwrites the previous file.
 */
export function FileSlot({ storageKey, file, onChange, label, disabled = false, today = "2026-09-22" }: {
  storageKey: string;
  file?: StoredFileMeta;
  onChange: (file: StoredFileMeta | undefined) => void;
  label: string;
  disabled?: boolean;
  today?: string;
}) {
  const notify = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    const problem = uploadProblem(picked);
    if (problem) { notify(problem); return; }
    setBusy(true);
    try {
      onChange(await saveFile(storageKey, picked, today));
      notify(`${picked.name} uploaded`);
    } catch {
      notify("Upload failed — browser storage may be full or blocked.");
    } finally {
      setBusy(false);
    }
  };

  const missing = () => notify("This file is no longer in this browser's storage. Upload it again.");
  const remove = async () => {
    if (!file) return;
    await deleteFile(file.key);
    onChange(undefined);
    notify(`${file.name} removed`);
  };

  const Icon = file?.type.startsWith("image/") ? ImageIcon : FileText;

  return <span className="file-slot">
    <input ref={inputRef} type="file" accept={ACCEPT_ATTRIBUTE} className="sr-only" onChange={pick} aria-label={`Upload ${label}`} tabIndex={-1} />
    {file ? <>
      <span className="file-chip" title={file.name}><Icon size={14} /><span>{file.name}</span><small>{formatBytes(file.size)}</small></span>
      <button type="button" className="icon-button small" data-allow onClick={async () => { if (!await openFile(file)) missing(); }} aria-label={`View ${label}`}><Eye /></button>
      <button type="button" className="icon-button small" data-allow onClick={async () => { if (!await downloadFile(file)) missing(); }} aria-label={`Download ${label}`}><DownloadSimple /></button>
      {!disabled && <button type="button" className="icon-button small" onClick={() => inputRef.current?.click()} aria-label={`Replace ${label}`}><UploadSimple /></button>}
      {!disabled && <button type="button" className="icon-button small" onClick={remove} aria-label={`Remove ${label}`}><Trash /></button>}
    </> : <button type="button" className="secondary-button compact" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
      <UploadSimple />{busy ? "Uploading…" : "Upload"}
    </button>}
  </span>;
}
