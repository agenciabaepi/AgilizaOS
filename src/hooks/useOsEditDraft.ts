'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  clearOsEditDraft,
  loadOsEditDraft,
  saveOsEditDraft,
  type OsEditDraftKind,
} from '@/lib/osEditDraft';

interface UseOsEditDraftOptions<T> {
  osId: string | undefined;
  kind: OsEditDraftKind;
  usuarioAuthId?: string | null;
  /** true após carregar dados iniciais do servidor */
  ready: boolean;
  getSnapshot: () => T;
  onRestore: (data: T) => void;
  isMeaningful: (data: T) => boolean;
}

function snapshotsEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function useOsEditDraft<T>({
  osId,
  kind,
  usuarioAuthId,
  ready,
  getSnapshot,
  onRestore,
  isMeaningful,
}: UseOsEditDraftOptions<T>) {
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState(false);

  const appliedRef = useRef(false);
  const skipSaveRef = useRef(false);
  const baselineRef = useRef<T | null>(null);
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;

  useEffect(() => {
    appliedRef.current = false;
    baselineRef.current = null;
    setDraftRestored(false);
    setDraftUpdatedAt(null);
    setHasUnsavedDraft(false);
  }, [osId, kind]);

  useLayoutEffect(() => {
    if (!ready || !osId || appliedRef.current) return;
    appliedRef.current = true;

    const serverSnapshot = getSnapshotRef.current();
    baselineRef.current = serverSnapshot;

    const envelope = loadOsEditDraft<T>(osId, kind, usuarioAuthId);
    if (
      envelope &&
      isMeaningful(envelope.data) &&
      !snapshotsEqual(envelope.data, serverSnapshot)
    ) {
      onRestore(envelope.data);
      setDraftRestored(true);
      setDraftUpdatedAt(envelope.updatedAt);
      setHasUnsavedDraft(true);
    }
  }, [ready, osId, kind, usuarioAuthId, onRestore, isMeaningful]);

  const isDirty = useCallback((): boolean => {
    if (baselineRef.current === null) return false;
    return !snapshotsEqual(getSnapshotRef.current(), baselineRef.current);
  }, []);

  const persistDraft = useCallback(() => {
    if (!osId || !appliedRef.current || skipSaveRef.current) {
      if (skipSaveRef.current) skipSaveRef.current = false;
      return;
    }

    const snapshot = getSnapshotRef.current();
    const dirty = isDirty();

    if (!dirty) {
      clearOsEditDraft(osId, kind, usuarioAuthId);
      setDraftUpdatedAt(null);
      setHasUnsavedDraft(false);
      return;
    }

    if (!isMeaningful(snapshot)) return;

    saveOsEditDraft(osId, kind, usuarioAuthId, snapshot);
    setDraftUpdatedAt(new Date().toISOString());
    setHasUnsavedDraft(true);
  }, [osId, kind, usuarioAuthId, isMeaningful, isDirty]);

  useEffect(() => {
    if (!ready || !osId) return;
    setHasUnsavedDraft(isDirty());
    const timer = setTimeout(() => persistDraft(), 600);
    return () => clearTimeout(timer);
  });

  useEffect(() => {
    if (!ready || !osId) return;
    const flush = () => persistDraft();
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [ready, osId, persistDraft]);

  const clearDraft = useCallback(() => {
    if (!osId) return;
    skipSaveRef.current = true;
    clearOsEditDraft(osId, kind, usuarioAuthId);
    baselineRef.current = getSnapshotRef.current();
    setDraftRestored(false);
    setDraftUpdatedAt(null);
    setHasUnsavedDraft(false);
  }, [osId, kind, usuarioAuthId]);

  return {
    draftRestored,
    draftUpdatedAt,
    hasUnsavedDraft,
    clearDraft,
    persistDraft,
  };
}
