/**
 * Browser file storage for uploaded documents. Files live in IndexedDB until
 * the backend exists; callers only see this interface, so swapping to server
 * uploads later changes this file alone.
 */

export type StoredFileMeta = {
  key: string;
  name: string;
  type: string;
  size: number;
  uploadedOn: string;
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const ACCEPT_ATTRIBUTE = ".pdf,.jpg,.jpeg,.png,.webp";

const DB_NAME = "bmg-files";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

/** Returns an error message for files that should be refused, or null. */
export function uploadProblem(file: { size: number; type: string }) {
  if (!ACCEPTED_UPLOAD_TYPES.includes(file.type)) return "Only PDF, JPG, PNG or WEBP files can be uploaded.";
  if (file.size > MAX_UPLOAD_BYTES) return `File is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  if (file.size === 0) return "The file is empty.";
  return null;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export async function saveFile(key: string, file: File, uploadedOn: string): Promise<StoredFileMeta> {
  await run("readwrite", store => store.put(file, key));
  return { key, name: file.name, type: file.type, size: file.size, uploadedOn };
}

export function loadFile(key: string) {
  return run<Blob | undefined>("readonly", store => store.get(key));
}

export function deleteFile(key: string) {
  return run<undefined>("readwrite", store => store.delete(key));
}

/** Opens the stored file in a new tab (PDFs and images render natively). */
export async function openFile(meta: StoredFileMeta) {
  const blob = await loadFile(meta.key);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

export async function downloadFile(meta: StoredFileMeta) {
  const blob = await loadFile(meta.key);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = meta.name;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}
