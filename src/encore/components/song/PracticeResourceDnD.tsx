import Box from '@mui/material/Box';
import {
  DndContext,
  pointerWithin,
  useDraggable,
  useDroppable,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode, type SyntheticEvent } from 'react';
import { canDropPracticeResource } from '../../repertoire/practiceResourceOrder';
import {
  parsePracticeResourceDragId,
  practiceResourceSectionDragId,
  sectionAcceptsPracticeResourceDrag,
} from '../../repertoire/practiceResourceDragIds';
import type { EncoreSong } from '../../types';
import type { SongMediaUploadSlot } from './songMediaUploadSlot';
import {
  PRACTICE_RESOURCE_DRAG_CLICK_SUPPRESS_MS,
  PracticeResourceDragContext,
  shouldSuppressPracticeResourceChipNavigation,
  usePracticeResourceDragState,
} from './practiceResourceDragContext';
import { usePracticeResourceDnDHandlers, type PracticeResourceSongChange } from './usePracticeResourceDnD';

export type PracticeResourceDnDProps = {
  enabled?: boolean;
  onSongChange: PracticeResourceSongChange;
  song: EncoreSong;
  children: ReactNode;
};

function createPracticeResourceCollisionDetection(getSong: () => EncoreSong): CollisionDetection {
  return (args) => {
    const hits = pointerWithin(args);
    const activeId = String(args.active.id);
    const song = getSong();
    const eligible = hits.filter((hit) => canDropPracticeResource(song, activeId, String(hit.id)));
    const chipHit = eligible.find((hit) => {
      const parsed = parsePracticeResourceDragId(String(hit.id));
      return parsed?.kind === 'link' || parsed?.kind === 'attachment' || parsed?.kind === 'misc';
    });
    return chipHit ? [chipHit] : eligible;
  };
}

export function PracticeResourceDnDProvider(props: PracticeResourceDnDProps): ReactElement {
  const { enabled = true, onSongChange, song, children } = props;
  const { sensors, onDragEnd: handleDragEnd } = usePracticeResourceDnDHandlers(onSongChange);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [blockChipNavigation, setBlockChipNavigation] = useState(false);
  const songRef = useRef(song);
  songRef.current = song;
  const navigationBlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearNavigationBlockTimer = useCallback(() => {
    if (navigationBlockTimerRef.current != null) {
      clearTimeout(navigationBlockTimerRef.current);
      navigationBlockTimerRef.current = null;
    }
  }, []);

  const extendNavigationBlock = useCallback(() => {
    setBlockChipNavigation(true);
    clearNavigationBlockTimer();
    navigationBlockTimerRef.current = setTimeout(() => {
      setBlockChipNavigation(false);
      navigationBlockTimerRef.current = null;
    }, PRACTICE_RESOURCE_DRAG_CLICK_SUPPRESS_MS);
  }, [clearNavigationBlockTimer]);

  useEffect(() => () => clearNavigationBlockTimer(), [clearNavigationBlockTimer]);

  const shouldSuppressChipLinkClick = useCallback(() => blockChipNavigation, [blockChipNavigation]);

  const collisionDetection = useMemo(
    () => createPracticeResourceCollisionDetection(() => songRef.current),
    [],
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    clearNavigationBlockTimer();
    setBlockChipNavigation(false);
    setActiveDragId(String(event.active.id));
  }, [clearNavigationBlockTimer]);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      handleDragEnd(event);
      extendNavigationBlock();
      setActiveDragId(null);
    },
    [extendNavigationBlock, handleDragEnd],
  );

  const onDragCancel = useCallback(() => {
    extendNavigationBlock();
    setActiveDragId(null);
  }, [extendNavigationBlock]);

  const dragState = useMemo(
    () => ({
      dragging: activeDragId != null,
      activeDragId,
      song,
      blockChipNavigation,
      shouldSuppressChipLinkClick,
    }),
    [activeDragId, blockChipNavigation, shouldSuppressChipLinkClick, song],
  );

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <PracticeResourceDragContext.Provider value={dragState}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        {children}
      </DndContext>
    </PracticeResourceDragContext.Provider>
  );
}

type PracticeResourceDraggableChipProps = {
  dragId: string;
  children: ReactNode;
  disabled?: boolean;
};

/** Whole-chip drag + droppable target for one practice resource chip. */
export function PracticeResourceDraggableChip(props: PracticeResourceDraggableChipProps): ReactElement {
  const { dragId, children, disabled = false } = props;
  const { activeDragId, song, blockChipNavigation, dragging } = usePracticeResourceDragState();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    disabled,
  });

  const dropDisabled =
    disabled ||
    !song ||
    (activeDragId != null &&
      activeDragId !== dragId &&
      !canDropPracticeResource(song, activeDragId, dragId));

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: dragId, disabled: dropDisabled });

  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      setNodeRef(node);
      setDropRef(node);
    },
    [setDropRef, setNodeRef],
  );

  const translate = CSS.Translate.toString(transform);

  /** After drop only — do not intercept pointer release while dnd-kit is finishing the drag. */
  const suppressPostDropActivation = shouldSuppressPracticeResourceChipNavigation(
    blockChipNavigation,
    dragging,
  );

  const blockChildActivation = useCallback(
    (event: SyntheticEvent) => {
      if (!suppressPostDropActivation) return;
      event.preventDefault();
      event.stopPropagation();
    },
    [suppressPostDropActivation],
  );

  return (
    <Box
      ref={setRefs}
      className="encore-practice-resource-chip-draggable"
      {...listeners}
      {...attributes}
      onClickCapture={suppressPostDropActivation ? blockChildActivation : undefined}
      onAuxClickCapture={suppressPostDropActivation ? blockChildActivation : undefined}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        maxWidth: 'min(100%, 360px)',
        opacity: isDragging ? 0.35 : 1,
        transform: translate ?? undefined,
        transition: isDragging ? undefined : 'box-shadow 120ms ease',
        outline: isOver && !dropDisabled ? '2px dashed' : undefined,
        outlineColor: isOver && !dropDisabled ? 'primary.main' : undefined,
        outlineOffset: 2,
        borderRadius: 1,
        cursor: disabled ? 'default' : 'grab',
        '&:active': { cursor: 'grabbing' },
      }}
    >
      <Box
        sx={{
          minWidth: 0,
          flex: '1 1 auto',
          pointerEvents: dragging ? 'none' : 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

type PracticeResourceSectionDropZoneProps = {
  section: SongMediaUploadSlot;
  children: ReactNode;
};

export function PracticeResourceSectionDropZone(props: PracticeResourceSectionDropZoneProps): ReactElement {
  const { section, children } = props;
  const { activeDragId, song } = usePracticeResourceDragState();
  const activeParsed = activeDragId ? parsePracticeResourceDragId(activeDragId) : null;
  const acceptsDrop = sectionAcceptsPracticeResourceDrag(section, activeParsed, song);
  const { setNodeRef, isOver } = useDroppable({
    id: practiceResourceSectionDragId(section),
    disabled: activeParsed != null && !acceptsDrop,
  });

  return (
    <Box
      ref={setNodeRef}
      data-testid={`encore-practice-section-drop-${section}`}
      sx={{
        minWidth: 0,
        borderRadius: 0.75,
        outline: isOver && acceptsDrop ? '2px dashed' : undefined,
        outlineColor: isOver && acceptsDrop ? 'primary.main' : undefined,
        outlineOffset: 2,
      }}
    >
      {children}
    </Box>
  );
}
