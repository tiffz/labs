import { useCallback, useEffect, useRef, useState, type DragEvent, type RefObject } from 'react';

import {
  collectDataTransferDropSnapshot,
  readDataTransferDropFromSnapshot,
} from '../../shared/utils/readDataTransferEntryFiles';
import { createVisualDevAsset } from '../db/lyreflyProjectMutations';
import { buildConceptShelfCreateInput } from './conceptShelfUtils';
import { extractConceptShelfImageUrl, extractImageUrlFromHtml, fetchRemoteImageAsFile } from './conceptShelfRemoteImage';

export function collectFilesFromDataTransfer(dataTransfer: DataTransfer): File[] {
  const fromFiles = dataTransfer.files?.length ? Array.from(dataTransfer.files) : [];
  const usableFiles = fromFiles.filter((file) => file.size > 0 || file.type.startsWith('image/'));
  if (usableFiles.length > 0) return usableFiles;

  const out: File[] = [];
  for (const item of Array.from(dataTransfer.items ?? [])) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (file && (file.size > 0 || file.type.startsWith('image/'))) out.push(file);
  }
  return out;
}

export function collectImageFilesFromDataTransfer(dataTransfer: DataTransfer): File[] {
  const fromItems: File[] = [];
  for (const item of Array.from(dataTransfer.items ?? [])) {
    if (item.kind !== 'file') continue;
    const type = item.type?.toLowerCase() ?? '';
    const looksLikeImage =
      !type || type.startsWith('image/') || type === 'public.png' || type === 'public.jpeg';
    if (!looksLikeImage) continue;
    const file = item.getAsFile();
    if (file) fromItems.push(file);
  }
  if (fromItems.length > 0) return fromItems;

  return collectFilesFromDataTransfer(dataTransfer).filter(
    (file) => !file.type || file.type.startsWith('image/'),
  );
}

export type ConceptShelfPasteDecision = {
  intercept: boolean;
  files: File[];
  imageUrl: string | null;
};

/** Decide whether a paste should upload to the concept shelf vs stay in the focused field. */
export function resolveConceptShelfPaste(
  target: EventTarget | null,
  clipboardData: DataTransfer,
): ConceptShelfPasteDecision {
  const files = collectImageFilesFromDataTransfer(clipboardData);
  const plain = clipboardData.getData('text/plain')?.trim() ?? '';
  const html = clipboardData.getData('text/html')?.trim() ?? '';
  const htmlImageUrl = html ? extractImageUrlFromHtml(html) : null;

  if (target instanceof Element) {
    const formField =
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLInputElement ||
      target.closest(
        'input:not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea',
      );
    if (formField) {
      if (files.length === 0) return { intercept: false, files: [], imageUrl: null };
      if (plain || (html && !htmlImageUrl)) return { intercept: false, files: [], imageUrl: null };
      return { intercept: true, files, imageUrl: null };
    }

    const editable = target.closest('.ProseMirror, [contenteditable="true"]');
    if (editable) {
      if (files.length > 0) return { intercept: true, files, imageUrl: null };
      if (htmlImageUrl && !plain) return { intercept: true, files: [], imageUrl: htmlImageUrl };
      return { intercept: false, files: [], imageUrl: null };
    }
  }

  if (files.length > 0) return { intercept: true, files, imageUrl: null };

  const imageUrl = extractConceptShelfImageUrl(clipboardData);
  if (!imageUrl) return { intercept: false, files: [], imageUrl: null };
  if (plain && plain !== imageUrl) return { intercept: false, files: [], imageUrl: null };
  return { intercept: true, files: [], imageUrl };
}

export function isFileDrag(dataTransfer: DataTransfer): boolean {
  const types = Array.from(dataTransfer.types);
  if (types.includes('Files')) return true;
  return types.some((type) => type === 'application/x-moz-file' || type.startsWith('image/'));
}

export function isConceptShelfIntakeDrag(dataTransfer: DataTransfer): boolean {
  if (isFileDrag(dataTransfer)) return true;
  const types = Array.from(dataTransfer.types);
  if (types.includes('text/html')) return true;
  if (types.includes('text/uri-list')) return true;
  if (types.includes('text/plain')) {
    const plain = dataTransfer.getData('text/plain')?.trim() ?? '';
    if (/^https?:\/\//i.test(plain)) return true;
  }
  return false;
}

export function clipboardHasImageFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  if (collectFilesFromDataTransfer(dataTransfer).some((file) => file.type.startsWith('image/'))) return true;
  return Boolean(extractConceptShelfImageUrl(dataTransfer));
}

export async function uploadConceptShelfFiles(projectId: string, files: File[]): Promise<void> {
  for (const file of files) {
    if (!file.type.startsWith('image/') && file.size === 0) continue;
    const input = buildConceptShelfCreateInput('', '', '', file);
    if (!input) continue;
    await createVisualDevAsset(projectId, input);
  }
}

export async function processConceptShelfIntake(
  projectId: string,
  intake: { files: File[]; imageUrl: string | null },
): Promise<void> {
  if (intake.files.length > 0) {
    await uploadConceptShelfFiles(projectId, intake.files);
    return;
  }
  if (!intake.imageUrl) return;

  const file = await fetchRemoteImageAsFile(intake.imageUrl);
  if (file) {
    await uploadConceptShelfFiles(projectId, [file]);
    return;
  }

  const input = buildConceptShelfCreateInput(intake.imageUrl, '', '');
  if (input) await createVisualDevAsset(projectId, input);
}

export type UseConceptShelfFileIntakeOptions = {
  projectId: string;
  /** When false, paste/drop handlers no-op. */
  enabled?: boolean;
  /** Limit paste capture to events inside this subtree (capture phase). */
  scopeRef: RefObject<HTMLElement | null>;
};

export type ConceptShelfFileIntakeHandlers = {
  busy: boolean;
  fileDragActive: boolean;
  fileDragHover: boolean;
  onDragEnter: (e: DragEvent<HTMLElement>) => void;
  onDragLeave: (e: DragEvent<HTMLElement>) => void;
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
  onPaste: (event: ClipboardEvent) => void;
  /** Returns true when the paste was consumed (image / remote art → concept shelf). */
  tryHandlePaste: (event: ClipboardEvent) => boolean;
  uploadFiles: (files: File[]) => Promise<void>;
};

export function useConceptShelfFileIntake({
  projectId,
  enabled = true,
  scopeRef,
}: UseConceptShelfFileIntakeOptions): ConceptShelfFileIntakeHandlers {
  const dragDepthRef = useRef(0);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [fileDragActive, setFileDragActive] = useState(false);
  const [fileDragHover, setFileDragHover] = useState(false);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!enabled || files.length === 0 || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        await uploadConceptShelfFiles(projectId, files);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [enabled, projectId],
  );

  const uploadIntake = useCallback(
    async (intake: { files: File[]; imageUrl: string | null }) => {
      if (!enabled || busyRef.current) return;
      if (intake.files.length === 0 && !intake.imageUrl) return;
      busyRef.current = true;
      setBusy(true);
      try {
        await processConceptShelfIntake(projectId, intake);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [enabled, projectId],
  );

  const endFileDrag = useCallback(() => {
    dragDepthRef.current = 0;
    setFileDragActive(false);
    setFileDragHover(false);
  }, []);

  const onDragEnter = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (!enabled || !isConceptShelfIntakeDrag(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current += 1;
      setFileDragActive(true);
    },
    [enabled],
  );

  const onDragLeave = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (!enabled || !isConceptShelfIntakeDrag(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setFileDragActive(false);
        setFileDragHover(false);
      }
    },
    [enabled],
  );

  const onDragOver = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (!enabled || !isConceptShelfIntakeDrag(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = busyRef.current ? 'none' : 'copy';
      setFileDragHover(true);
    },
    [enabled],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (!enabled || !isConceptShelfIntakeDrag(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      endFileDrag();
      if (busyRef.current) return;

      const imageUrl = extractConceptShelfImageUrl(e.dataTransfer);
      const snapshot = collectDataTransferDropSnapshot(e.dataTransfer);

      void (async () => {
        const drop = await readDataTransferDropFromSnapshot(snapshot);
        const files = drop.files.length > 0 ? drop.files : collectFilesFromDataTransfer(e.dataTransfer);
        await uploadIntake({ files, imageUrl: files.length === 0 ? imageUrl : null });
      })();
    },
    [enabled, endFileDrag, uploadIntake],
  );

  const tryHandlePaste = useCallback(
    (event: ClipboardEvent): boolean => {
      if (!enabled) return false;
      const root = scopeRef.current;
      if (!root) return false;
      const target = event.target;
      if (!(target instanceof Node) || !root.contains(target)) return false;

      const clipboardData = event.clipboardData;
      if (!clipboardData) return false;

      const decision = resolveConceptShelfPaste(target, clipboardData);
      if (!decision.intercept) return false;

      event.preventDefault();
      event.stopPropagation();
      void uploadIntake({ files: decision.files, imageUrl: decision.imageUrl });
      return true;
    },
    [enabled, scopeRef, uploadIntake],
  );

  const onPaste = useCallback(
    (event: ClipboardEvent): void => {
      tryHandlePaste(event);
    },
    [tryHandlePaste],
  );

  useEffect(() => {
    if (!enabled) return undefined;

    document.addEventListener('paste', onPaste, true);
    return () => document.removeEventListener('paste', onPaste, true);
  }, [enabled, onPaste]);

  return {
    busy,
    fileDragActive,
    fileDragHover,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    onPaste,
    tryHandlePaste,
    uploadFiles,
  };
}
