"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Download, Eye, FileText, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import {
  ACCEPT_ATTRIBUTE, deleteFile, downloadFile, formatBytes, openFile, saveFile, uploadProblem,
  type StoredFileMeta,
} from "@/lib/file-store";
import { useToast } from "@/components/shared/toast-context";
import { useConfirm } from "@/components/ui-kit";
import { Button } from "@/components/ui-kit";
import { APP_TODAY } from "@/lib/app-date";

/**
 * Attach, view, download, replace or remove one file. `storageKey` must be
 * stable for the slot so a replacement overwrites the previous file.
 */
export function FileSlot({ storageKey, file, onChange, label, disabled = false, today = APP_TODAY }: {
  storageKey: string;
  file?: StoredFileMeta;
  onChange: (file: StoredFileMeta | undefined) => void;
  label: string;
  disabled?: boolean;
  today?: string;
}) {
  const notify = useToast();
  const confirm = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    const problem = uploadProblem(picked);
    if (problem) { notify({ message: problem, kind: "error" }); return; }
    setBusy(true);
    try {
      onChange(await saveFile(storageKey, picked, today));
      notify(`${picked.name} uploaded`);
    } catch {
      notify({ message: "Upload failed — browser storage may be full or blocked.", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const missing = () => notify({ message: "This file is no longer in this browser's storage. Upload it again.", kind: "error" });
  const remove = async () => {
    if (!file) return;
    const ok = await confirm({ title: `Remove ${label}?`, description: `${file.name} will be deleted from this record.`, confirmLabel: "Remove file", destructive: true });
    if (!ok) return;
    await deleteFile(file.key);
    onChange(undefined);
    notify(`${file.name} removed`);
  };

  const Icon = file?.type.startsWith("image/") ? ImageIcon : FileText;

  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <input ref={inputRef} type="file" accept={ACCEPT_ATTRIBUTE} className="sr-only" onChange={pick} aria-label={`Upload ${label}`} tabIndex={-1} />
      {file ? (
        <>
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 text-xs" title={file.name}>
            <Icon className="h-3.5 w-3.5 shrink-0 text-emerald" />
            <span className="max-w-[140px] truncate">{file.name}</span>
            <small className="text-muted">{formatBytes(file.size)}</small>
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" data-allow onClick={async () => { if (!await openFile(file)) missing(); }} aria-label={`View ${label}`} title="View"><Eye /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" data-allow onClick={async () => { if (!await downloadFile(file)) missing(); }} aria-label={`Download ${label}`} title="Download"><Download /></Button>
          {!disabled && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => inputRef.current?.click()} aria-label={`Replace ${label}`} title="Replace"><Upload /></Button>}
          {!disabled && <Button variant="ghost" size="icon" className="h-8 w-8 text-status-danger" onClick={remove} aria-label={`Remove ${label}`} title="Remove"><Trash2 /></Button>}
        </>
      ) : (
        <Button variant="outline" size="sm" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
          <Upload />{busy ? "Uploading…" : "Upload file"}
        </Button>
      )}
    </span>
  );
}
