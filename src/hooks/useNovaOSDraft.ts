'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  clearNovaOsDraft,
  isDraftMeaningful,
  loadNovaOsDraft,
  saveNovaOsDraft,
  type NovaOSDraftData,
} from '@/lib/novaOsDraft';

interface UseNovaOSDraftOptions {
  empresaId: string | undefined;
  usuarioAuthId: string | undefined;
  enabled: boolean;
  getSnapshot: () => NovaOSDraftData | null;
  onRestore: (draft: NovaOSDraftData) => void;
  onClearForm: () => void;
}

export function useNovaOSDraft({
  empresaId,
  usuarioAuthId,
  enabled,
  getSnapshot,
  onRestore,
  onClearForm,
}: UseNovaOSDraftOptions) {
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);

  const loadedRef = useRef(false);
  const skipSaveRef = useRef(false);
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;

  const persistDraft = useCallback(() => {
    if (!empresaId || !loadedRef.current || skipSaveRef.current) {
      if (skipSaveRef.current) skipSaveRef.current = false;
      return;
    }
    const snapshot = getSnapshotRef.current();
    if (!snapshot || !isDraftMeaningful(snapshot)) {
      clearNovaOsDraft(empresaId, usuarioAuthId);
      setDraftUpdatedAt(null);
      return;
    }
    saveNovaOsDraft(empresaId, usuarioAuthId, snapshot);
    setDraftUpdatedAt(snapshot.updatedAt || new Date().toISOString());
  }, [empresaId, usuarioAuthId]);

  useLayoutEffect(() => {
    if (!enabled || !empresaId || loadedRef.current) return;

    const draft = loadNovaOsDraft(empresaId, usuarioAuthId);
    loadedRef.current = true;

    if (draft && isDraftMeaningful(draft)) {
      onRestore(draft);
      setDraftRestored(true);
      setDraftUpdatedAt(draft.updatedAt);
    }
  }, [enabled, empresaId, usuarioAuthId, onRestore]);

  const clearDraft = useCallback(() => {
    if (!empresaId) return;
    skipSaveRef.current = true;
    clearNovaOsDraft(empresaId, usuarioAuthId);
    onClearForm();
    setDraftRestored(false);
    setDraftUpdatedAt(null);
  }, [empresaId, usuarioAuthId, onClearForm]);

  return {
    draftRestored,
    draftUpdatedAt,
    clearDraft,
    persistDraft,
  };
}
