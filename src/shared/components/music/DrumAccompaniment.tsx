import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import type { TimeSignature } from '../../rhythm/types';
import { parseRhythm } from '../../rhythm/rhythmParser';
import { getRhythmTemplatePresets, getTemplatePresetVariationIndex, getTemplatePresetVariations } from '../../rhythm/presetDatabase';
import { buildDarbukaEditUrl } from '../../rhythm/buildDarbukaEditUrl';
import { RhythmTemplateVariationControls } from '../../notation/RhythmTemplateVariationControls';
import DrumNotationMini, { type NotationStyle } from '../../notation/DrumNotationMini';
import DarbukaTrainerIconLink from './DarbukaTrainerIconLink';
import DiceIcon from '../DiceIcon';
import { DRUM_SAMPLE_URLS } from '../../audio/drumSampleUrls';
import { resolveDrumPlaybackNotePointer } from '../../rhythm/drumPlaybackNotePointer';
import { scheduleDrumPatternWindow } from '../../audio/platform/scheduling/scheduleDrumPatternWindow';
import AnchoredPopover from '../AnchoredPopover';
import {
  resolveDarbukaLinkPlacement,
  resolvePatternEditingMode,
  type InlineDarbukaLinkPlacement,
  type DeprecatedInlineDarbukaLinkPlacement,
  type InlineDrumPatternEditing,
} from './inlineDrumUxDefaults';
import {
  DRUM_PATTERN_EDIT_MENU_CLASS,
  DRUM_PATTERN_EDIT_MENU_OPEN_BODY_CLASS,
  DRUM_PATTERN_EDIT_MENU_ROOT_CLASS,
  DRUM_PATTERN_EDIT_MENU_Z_INDEX,
  DRUM_PATTERN_EDIT_TIP_Z_INDEX,
  drumPatternEditMenuAnchorPosition,
} from './drumPatternEditMenu';
import './darbukaTrainerIconLink.css';
import './drumAccompaniment.css';

/** Precise drum scheduling via the playback engine's look-ahead scheduler */
export interface DrumScheduler {
  loadSound(name: string, url: string): Promise<void>;
  playAt(soundName: string, audioTime: number, volume: number): void;
  setCallback(cb: ((scheduledUpTo: number, scheduleEnd: number, startTime: number, tempo: number, audioCtx: AudioContext) => void) | null): void;
}

export interface DrumTemplateButtonProps {
  isActive: boolean;
  onClick: () => void;
  className: string;
  ariaLabel?: string;
  title?: string;
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLButtonElement>;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
}

interface DrumAccompanimentProps {
  bpm: number;
  timeSignature: TimeSignature;
  isPlaying: boolean;
  currentBeatTime: number;
  currentBeat: number;
  metronomeEnabled?: boolean;
  volume?: number;
  notationStyle?: NotationStyle;
  notationWidth?: number;
  /** Override the rendered notation staff height (px). Default uses an internal heuristic. */
  notationHeight?: number;
  /** Hide the Darbuka Trainer deep-link (used by host apps that don't want to send users
   * into a separate tool). */
  hideDarbukaLink?: boolean;
  /** Where to render the Darbuka link. Defaults from {@link resolveDarbukaLinkPlacement}. */
  darbukaLinkPlacement?: InlineDarbukaLinkPlacement | DeprecatedInlineDarbukaLinkPlacement;
  /** Tooltip / aria-label for the inline icon link. Below-notation uses its own default label. */
  darbukaLinkTooltip?: string;
  /** Optional class for the Darbuka deep-link (app-specific styling). */
  darbukaLinkClassName?: string;
  /** Optional class on the notation frame wrapping variation controls + mini renderer. */
  notationFrameClassName?: string;
  /** Optional footer below the mini renderer (e.g. calibration hint). */
  notationFooter?: React.ReactNode;
  /** Replaces the preset summary row in the notation toolbar (e.g. inherit-source caption). */
  notationToolbarLeading?: React.ReactNode;
  /** Extra controls before Edit / Darbuka in the notation toolbar trail. */
  notationToolbarExtra?: React.ReactNode;
  /** Metronome dots under the staff in mini notation. Defaults to `metronomeEnabled`. */
  notationShowMetronomeDots?: boolean;
  /** Scale for drum symbols above noteheads (default 0.6). */
  drumSymbolScale?: number;
  /** Hide dice randomize controls (rare; prefer {@link getInlineDrumUxProps} profiles). */
  showRandomizeButtons?: boolean;
  /** Hide the raw Darbuka notation text field (preset + notation preview only). */
  hidePatternInput?: boolean;
  scheduler?: DrumScheduler;
  TemplateButtonComponent?: React.ComponentType<DrumTemplateButtonProps>;
  templateButtonClassName?: string;
  randomizeButtonClassName?: string;
  /** Controlled Darbuka notation (e.g. chart playback settings). */
  notationValue?: string;
  onNotationValueChange?: (notation: string) => void;
  /** When false, skips local AudioPlayer init (notation picker only). */
  audioEnabled?: boolean;
  /** Grid shows all preset pills; compact uses a single picker menu (sidebars). */
  presetLayout?: 'grid' | 'compact';
  /**
   * How preset/pattern editors appear.
   * - `menu` (default via profiles) — notation first; Edit / click opens a dropdown
   * - `inline` — always-expanded (deprecated)
   * - `popover` — deprecated alias for `menu`
   */
  patternEditing?: InlineDrumPatternEditing;
  /** Notation-only (no Edit control / pattern menu). Used for view-only section playback. */
  readOnly?: boolean;
}

const DRUM_SOUNDS = { ...DRUM_SAMPLE_URLS } as const;

const DefaultTemplateButton: React.FC<DrumTemplateButtonProps> = ({
  isActive,
  onClick,
  className,
  ariaLabel,
  title,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  children,
}) => (
  <button
    onClick={onClick}
    className={`${className}${isActive ? ' active' : ''}`}
    aria-label={ariaLabel}
    title={title}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    onFocus={onFocus}
    onBlur={onBlur}
    type="button"
  >
    {children}
  </button>
);

const DrumAccompaniment: React.FC<DrumAccompanimentProps> = ({
  bpm,
  timeSignature,
  isPlaying,
  currentBeatTime,
  currentBeat,
  metronomeEnabled = false,
  volume = 70,
  notationStyle,
  notationWidth,
  notationHeight,
  hideDarbukaLink = false,
  darbukaLinkPlacement,
  darbukaLinkTooltip = 'Customize in Darbuka trainer',
  darbukaLinkClassName,
  notationFrameClassName,
  notationFooter,
  notationToolbarLeading,
  notationToolbarExtra,
  notationShowMetronomeDots,
  drumSymbolScale = 0.6,
  showRandomizeButtons = true,
  hidePatternInput = false,
  scheduler,
  TemplateButtonComponent,
  templateButtonClassName,
  randomizeButtonClassName,
  notationValue,
  onNotationValueChange,
  presetLayout = 'grid',
  patternEditing = 'menu',
  readOnly = false,
}) => {
  const isControlled = onNotationValueChange !== undefined;
  const editingMode = resolvePatternEditingMode(patternEditing);
  const denseMenuEditing = editingMode === 'menu' && !readOnly;
  const showInlineEditing = editingMode === 'inline' && !readOnly;
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [presetMenuAnchor, setPresetMenuAnchor] = useState<HTMLElement | null>(null);
  const [patternEditOpen, setPatternEditOpen] = useState(false);
  const [patternMenuAnchor, setPatternMenuAnchor] = useState<HTMLElement | null>(null);
  const [patternMenuPosition, setPatternMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const patternEditorPanelId = React.useId();
  const notationFrameRef = useRef<HTMLDivElement | null>(null);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);
  const [customNotation, setCustomNotation] = useState<string | null>(null);
  const [hoverTip, setHoverTip] = useState<{
    text: string;
    x: number;
    y: number;
    placement: 'above' | 'below';
  } | null>(null);
  const presetRhythms = useMemo(() => getRhythmTemplatePresets(timeSignature), [timeSignature]);

  const internalNotation = useMemo(() => {
    if (customNotation !== null) {
      return customNotation;
    }
    return presetRhythms[selectedPreset]?.notation ?? presetRhythms[0]?.notation ?? '';
  }, [customNotation, selectedPreset, presetRhythms]);

  const notation =
    isControlled && notationValue !== undefined ? notationValue : internalNotation;

  const effectiveDarbukaPlacement = resolveDarbukaLinkPlacement(
    darbukaLinkPlacement,
    hidePatternInput,
  );

  const darbukaHref = useMemo(() => {
    if (hideDarbukaLink) return null;
    return buildDarbukaEditUrl({ notation, timeSignature, bpm, metronomeEnabled });
  }, [hideDarbukaLink, notation, timeSignature, bpm, metronomeEnabled]);

  const showInlinePatternDarbukaLink =
    darbukaHref !== null && effectiveDarbukaPlacement === 'inline-pattern';
  const showInlineNotationDarbukaLink =
    darbukaHref !== null && effectiveDarbukaPlacement === 'inline-notation';

  const syncPresetFromNotation = useCallback(
    (value: string) => {
      const matchingPresetIndex = presetRhythms.findIndex((preset) => {
        if (preset.notation === value) return true;
        return getTemplatePresetVariations(preset.id, timeSignature).some(
          (variation) => variation.notation === value,
        );
      });
      if (matchingPresetIndex >= 0) {
        setSelectedPreset(matchingPresetIndex);
        if (value === presetRhythms[matchingPresetIndex]?.notation) {
          setCustomNotation(null);
        } else {
          setCustomNotation(value);
        }
      } else {
        setCustomNotation(value);
        setSelectedPreset(-1);
      }
    },
    [presetRhythms, timeSignature],
  );

  useEffect(() => {
    if (!isControlled || notationValue === undefined) return;
    syncPresetFromNotation(notationValue);
  }, [isControlled, notationValue, syncPresetFromNotation]);

  const handleNotationChange = useCallback(
    (value: string) => {
      syncPresetFromNotation(value);
      if (isControlled) onNotationValueChange?.(value);
    },
    [isControlled, onNotationValueChange, syncPresetFromNotation],
  );

  const selectedPresetData =
    selectedPreset >= 0 ? presetRhythms[selectedPreset] : undefined;

  const templateVariations = useMemo(
    () =>
      selectedPresetData
        ? getTemplatePresetVariations(selectedPresetData.id, timeSignature)
        : [],
    [selectedPresetData, timeSignature],
  );

  const activeVariationIndex = useMemo(() => {
    if (!selectedPresetData || templateVariations.length === 0) return -1;
    return getTemplatePresetVariationIndex(selectedPresetData.id, notation, timeSignature);
  }, [notation, selectedPresetData, templateVariations.length, timeSignature]);

  const cycleTemplateVariation = useCallback(
    (delta: -1 | 1) => {
      if (templateVariations.length === 0) return;
      const current = activeVariationIndex >= 0 ? activeVariationIndex : 0;
      const nextIndex =
        (current + delta + templateVariations.length) % templateVariations.length;
      handleNotationChange(templateVariations[nextIndex]?.notation ?? notation);
    },
    [activeVariationIndex, handleNotationChange, notation, templateVariations],
  );

  const parsedRhythm = useMemo(() => {
    return parseRhythm(notation, timeSignature);
  }, [notation, timeSignature]);
  const sixteenthsPerMeasure = useMemo(
    () => Math.max(4, Math.round((timeSignature.numerator * 16) / timeSignature.denominator)),
    [timeSignature]
  );
  const TemplateButton = TemplateButtonComponent ?? DefaultTemplateButton;

  // Load drum sounds into the engine's AudioContext when scheduler is provided
  useEffect(() => {
    if (!scheduler) return;
    for (const [name, url] of Object.entries(DRUM_SOUNDS)) {
      scheduler.loadSound(name, url);
    }
  }, [scheduler]);

  // Precise scheduling via the engine's look-ahead scheduler
  const parsedRhythmRef = useRef(parsedRhythm);
  parsedRhythmRef.current = parsedRhythm;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const timeSignatureRef = useRef(timeSignature);
  timeSignatureRef.current = timeSignature;

  useEffect(() => {
    if (!scheduler || !isPlaying) {
      scheduler?.setCallback(null);
      return;
    }

    scheduler.setCallback((scheduledUpTo, scheduleEnd, startTime, tempo) => {
      const rhythm = parsedRhythmRef.current;
      if (!rhythm.isValid || rhythm.measures.length === 0) return;

      scheduleDrumPatternWindow({
        rhythm,
        timeSignature: timeSignatureRef.current,
        tempo,
        volume: volumeRef.current,
        scheduledUpToBeats: scheduledUpTo,
        scheduleEndBeats: scheduleEnd,
        startAudioTime: startTime,
        playAt: (sound, audioTime, vol) => {
          scheduler.playAt(sound, audioTime, vol);
        },
      });
    });

    return () => { scheduler.setCallback(null); };
  }, [scheduler, isPlaying]);

  const playbackPointer = useMemo(() => {
    if (!isPlaying || currentBeatTime < 0) return null;
    return resolveDrumPlaybackNotePointer(parsedRhythm, timeSignature, bpm, currentBeatTime);
  }, [isPlaying, currentBeatTime, bpm, timeSignature, parsedRhythm]);

  const currentMeasureIndex = playbackPointer?.measureIndex ?? 0;
  const currentNoteIndex = playbackPointer?.noteIndex ?? null;

  const displayRhythm = useMemo(() => {
    if (!parsedRhythm.isValid || parsedRhythm.measures.length === 0) return parsedRhythm;
    const measure = parsedRhythm.measures[currentMeasureIndex] ?? parsedRhythm.measures[0];
    return {
      ...parsedRhythm,
      measures: measure ? [measure] : [],
    };
  }, [parsedRhythm, currentMeasureIndex]);

  const showValidNotation = parsedRhythm.isValid && parsedRhythm.measures.length > 0;
  /** Keep last good staff while the edit menu is open so invalid keystrokes don't reflow the rail. */
  const lastValidDisplayRhythmRef = useRef(displayRhythm);
  if (showValidNotation) {
    lastValidDisplayRhythmRef.current = displayRhythm;
  }
  const stageDisplayRhythm =
    patternEditOpen && !showValidNotation ? lastValidDisplayRhythmRef.current : displayRhythm;
  const stageShowValidNotation =
    showValidNotation ||
    (patternEditOpen &&
      lastValidDisplayRhythmRef.current.isValid &&
      lastValidDisplayRhythmRef.current.measures.length > 0);

  const handlePresetChange = useCallback(
    (index: number) => {
      setSelectedPreset(index);
      setCustomNotation(null);
      const next = presetRhythms[index]?.notation ?? '';
      if (isControlled) onNotationValueChange?.(next);
    },
    [isControlled, onNotationValueChange, presetRhythms],
  );

  const randomizePresetTemplate = useCallback(() => {
    if (presetRhythms.length === 0) return;
    const notationPool: string[] = [];
    presetRhythms.forEach((preset) => {
      const variations = getTemplatePresetVariations(preset.id, timeSignature);
      if (variations.length > 0) {
        variations.forEach((variation) => notationPool.push(variation.notation));
      } else {
        notationPool.push(preset.notation);
      }
    });
    const uniquePool = [...new Set(notationPool)];
    const nextNotation =
      uniquePool[Math.floor(Math.random() * uniquePool.length)] ??
      presetRhythms[0]?.notation ??
      '';
    handleNotationChange(nextNotation);
  }, [handleNotationChange, presetRhythms, timeSignature]);
  const randomizeFullTemplate = useCallback(() => {
    const tokens = ['D', 'T', 'K', 'S', '-', '-'];
    let nextNotation = '';
    for (let i = 0; i < sixteenthsPerMeasure; i += 1) {
      nextNotation += tokens[Math.floor(Math.random() * tokens.length)];
    }
    if (!/[DTKS]/.test(nextNotation)) {
      const randomIndex = Math.floor(Math.random() * nextNotation.length);
      nextNotation = `${nextNotation.slice(0, randomIndex)}D${nextNotation.slice(randomIndex + 1)}`;
    }
    handleNotationChange(nextNotation);
  }, [handleNotationChange, sixteenthsPerMeasure]);
  const showTip = useCallback(
    (event: React.MouseEvent<HTMLButtonElement> | React.FocusEvent<HTMLButtonElement>, text: string) => {
      const rect = event.currentTarget.getBoundingClientRect();
      // Inside the edit menu, tip below the dice sits under the paper — place above instead.
      const placeAbove = patternEditOpen;
      setHoverTip({
        text,
        x: rect.left + rect.width / 2,
        y: placeAbove ? rect.top - 8 : rect.bottom + 10,
        placement: placeAbove ? 'above' : 'below',
      });
    },
    [patternEditOpen],
  );
  const hideTip = useCallback(() => setHoverTip(null), []);

  useEffect(() => {
    if (selectedPreset < 0) return;
    if (selectedPreset >= presetRhythms.length) {
      setSelectedPreset(0);
    }
  }, [selectedPreset, presetRhythms.length]);

  /**
   * Parse a Darbuka Trainer URL and extract the rhythm notation
   * Returns the rhythm notation if found, or null if not a valid URL
   */
  const parseRhythmFromUrl = useCallback((text: string): string | null => {
    try {
      // Check if it looks like a URL (absolute or relative path to drums)
      const trimmed = text.trim();
      
      // Handle both absolute URLs and relative paths
      let url: URL;
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        url = new URL(trimmed);
      } else if (trimmed.startsWith('/drums') || trimmed.includes('/drums?')) {
        // Relative URL - construct with dummy base
        url = new URL(trimmed, 'http://localhost');
      } else {
        return null;
      }

      // Check if it's a drums app URL
      if (!url.pathname.includes('/drums')) {
        return null;
      }

      // Extract rhythm parameter
      const rhythm = url.searchParams.get('rhythm');
      if (!rhythm) {
        return null;
      }

      return rhythm;
    } catch {
      // Not a valid URL
      return null;
    }
  }, []);

  /**
   * Handle paste events - detect Darbuka app URLs and extract rhythm
   */
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const extractedRhythm = parseRhythmFromUrl(pastedText);

    if (extractedRhythm) {
      // Prevent default paste and use extracted rhythm instead
      e.preventDefault();
      handleNotationChange(extractedRhythm);
    }
    // If not a URL, allow normal paste behavior
  }, [parseRhythmFromUrl, handleNotationChange]);

  const closePatternEditor = useCallback(() => {
    setPatternEditOpen(false);
    setPatternMenuAnchor(null);
    setPatternMenuPosition(null);
  }, []);

  const openPatternEditor = useCallback((anchor?: HTMLElement | null) => {
    if (readOnly) return;
    void anchor; // Call sites may pass a node; we always prefer Edit for stable popover placement.
    // Prefer the Edit control — the staff resizes as the pattern changes and would jump the popover.
    const nextAnchor = editButtonRef.current ?? notationFrameRef.current;
    if (nextAnchor) {
      // Freeze screen coords so MUI’s every-render reposition can’t chase a moving Edit button.
      setPatternMenuPosition(drumPatternEditMenuAnchorPosition(nextAnchor));
    } else {
      setPatternMenuPosition(null);
    }
    setPatternMenuAnchor(nextAnchor);
    setPatternEditOpen(true);
  }, [readOnly]);

  useEffect(() => {
    if (!patternEditOpen) return undefined;
    document.body.classList.add(DRUM_PATTERN_EDIT_MENU_OPEN_BODY_CLASS);
    return () => {
      document.body.classList.remove(DRUM_PATTERN_EDIT_MENU_OPEN_BODY_CLASS);
    };
  }, [patternEditOpen]);

  const togglePatternEditor = useCallback(() => {
    if (patternEditOpen) {
      closePatternEditor();
      return;
    }
    openPatternEditor(editButtonRef.current);
  }, [closePatternEditor, openPatternEditor, patternEditOpen]);

  const activePreset = selectedPreset >= 0 ? presetRhythms[selectedPreset] : undefined;
  const activePresetLabel = activePreset?.label ?? 'Custom';

  const randomizeButtons = showRandomizeButtons ? (
    <>
      <TemplateButton
        onClick={randomizePresetTemplate}
        isActive={false}
        className={`preset-btn preset-btn-icon ${randomizeButtonClassName ?? ''}`.trim()}
        ariaLabel="Random preset template"
        onMouseEnter={(event) => showTip(event, 'Random preset template')}
        onMouseLeave={hideTip}
        onFocus={(event) => showTip(event, 'Random preset template')}
        onBlur={hideTip}
      >
        <DiceIcon variant="single" size={15} />
      </TemplateButton>
      <TemplateButton
        onClick={randomizeFullTemplate}
        isActive={false}
        className={`preset-btn preset-btn-icon ${randomizeButtonClassName ?? ''}`.trim()}
        ariaLabel="Fully randomize template"
        onMouseEnter={(event) => showTip(event, 'Fully randomize template')}
        onMouseLeave={hideTip}
        onFocus={(event) => showTip(event, 'Fully randomize template')}
        onBlur={hideTip}
      >
        <DiceIcon variant="multiple" size={15} />
      </TemplateButton>
    </>
  ) : null;

  const randomizeRow =
    randomizeButtons != null ? (
      <div
        className="drum-presets__random-row"
        role="group"
        aria-label="Randomize drum pattern"
      >
        {randomizeButtons}
      </div>
    ) : null;

  const presetSelector =
    presetLayout === 'compact' ? (
      <div className="drum-presets drum-presets--compact">
        <button
          type="button"
          className={`preset-btn preset-btn--picker ${templateButtonClassName ?? ''}`.trim()}
          aria-label={`Choose rhythm preset, currently ${activePresetLabel}`}
          aria-haspopup="listbox"
          aria-expanded={Boolean(presetMenuAnchor)}
          onClick={(event) => setPresetMenuAnchor(event.currentTarget)}
        >
          <span className="preset-btn-label">{activePresetLabel}</span>
          <ArrowDropDownIcon className="preset-btn-chevron" aria-hidden />
        </button>
        <Menu
          anchorEl={presetMenuAnchor}
          open={Boolean(presetMenuAnchor)}
          onClose={() => setPresetMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              className: 'stanza-drums-preset-menu',
              sx: {
                minWidth: presetMenuAnchor?.offsetWidth ?? undefined,
                maxWidth: presetMenuAnchor ? presetMenuAnchor.offsetWidth + 48 : undefined,
              },
            },
          }}
        >
          {presetRhythms.map((preset, index) => (
            <MenuItem
              key={preset.id}
              selected={selectedPreset === index}
              onClick={() => {
                handlePresetChange(index);
                setPresetMenuAnchor(null);
              }}
            >
              {preset.label}
            </MenuItem>
          ))}
        </Menu>
        {randomizeRow}
      </div>
    ) : (
      <div className="drum-presets-block">
        <div className="drum-presets">
          {presetRhythms.map((preset, index) => (
            <TemplateButton
              key={preset.id}
              onClick={() => handlePresetChange(index)}
              isActive={selectedPreset === index}
              className={`preset-btn ${templateButtonClassName ?? ''}`.trim()}
              ariaLabel={`Use ${preset.label} drum preset`}
            >
              {preset.label}
            </TemplateButton>
          ))}
        </div>
        {randomizeRow}
      </div>
    );

  // Hosts may own an outer pattern field (`hidePatternInput`), but the Edit menu always
  // includes the notation string so users can tweak while picking presets.
  const patternInputInner = (
    <div className="drum-pattern-input">
      <input
        type="text"
        placeholder="D-T-K-T- or paste Darbuka Trainer URL"
        value={notation}
        onChange={(e) => handleNotationChange(e.target.value)}
        onPaste={handlePaste}
      />
    </div>
  );
  const patternInputForMenu =
    showInlinePatternDarbukaLink && !hidePatternInput ? (
      <div className="drum-pattern-input-row">
        {patternInputInner}
        <DarbukaTrainerIconLink
          href={darbukaHref}
          className={darbukaLinkClassName}
          tooltip={darbukaLinkTooltip}
        />
      </div>
    ) : (
      patternInputInner
    );
  const patternInput = hidePatternInput ? null : patternInputForMenu;

  const patternEditToolbarButton = denseMenuEditing ? (
    <button
      ref={editButtonRef}
      type="button"
      className="drum-pattern-edit-btn"
      aria-expanded={patternEditOpen}
      aria-controls={patternEditorPanelId}
      aria-haspopup="dialog"
      aria-label="Edit drum pattern"
      onClick={togglePatternEditor}
    >
      Edit
    </button>
  ) : null;

  const patternEditTriggerHit =
    denseMenuEditing && !patternEditOpen ? (
      <button
        type="button"
        className="stanza-drums-notation-trigger__hit"
        aria-expanded={false}
        aria-controls={patternEditorPanelId}
        aria-haspopup="dialog"
        aria-label={
          showValidNotation
            ? `Drum pattern: ${activePresetLabel}. Edit pattern.`
            : 'Enter a drum pattern'
        }
        onClick={() => openPatternEditor(editButtonRef.current ?? notationFrameRef.current)}
      />
    ) : null;

  const variationControls =
    selectedPresetData && templateVariations.length > 1 ? (
      <RhythmTemplateVariationControls
        presetLabel={selectedPresetData.label}
        variations={templateVariations}
        activeVariationIndex={activeVariationIndex}
        onPrevious={() => cycleTemplateVariation(-1)}
        onNext={() => cycleTemplateVariation(1)}
      />
    ) : null;

  // Named preset / variations only — never a redundant "Rhythm" placeholder over the staff.
  // Prefer variation prev/next on the stage; do not show a bare preset-name header in dense mode.
  const notationToolbarMain = notationToolbarLeading ? (
    notationToolbarLeading
  ) : variationControls ? (
    variationControls
  ) : selectedPresetData && !readOnly && !denseMenuEditing ? (
    <span className="drum-pattern-active-summary" title={selectedPresetData.label}>
      {selectedPresetData.label}
    </span>
  ) : null;

  const showNotationToolbar =
    Boolean(notationToolbarMain) ||
    Boolean(notationToolbarExtra) ||
    showInlineNotationDarbukaLink ||
    Boolean(patternEditToolbarButton);

  const notationToolbar = showNotationToolbar ? (
    <div className="drum-notation-mini-header-row stanza-drums-notation-toolbar">
      <div className="drum-notation-mini-header-row__main">{notationToolbarMain}</div>
      <div className="stanza-drums-notation-toolbar__trail">
        {notationToolbarExtra}
        {showInlineNotationDarbukaLink ? (
          <DarbukaTrainerIconLink
            href={darbukaHref}
            className={darbukaLinkClassName}
            tooltip={darbukaLinkTooltip}
          />
        ) : null}
        {patternEditToolbarButton}
      </div>
    </div>
  ) : null;

  const resolvedNotationStyle: NotationStyle =
    notationStyle ??
    ({
      inkColor: '#c8c4d8',
      highlightColor: '#22c55e',
    } as NotationStyle);

  const renderNotationMini = (opts: {
    width: number;
    height: number;
    showMetronomeDots: boolean;
    rhythm: typeof displayRhythm;
    valid: boolean;
    /** Multi-measure dots — omit in the edit menu so preview height stays fixed. */
    showMeasureIndicator?: boolean;
  }) =>
    opts.valid ? (
      <>
        {opts.showMeasureIndicator && parsedRhythm.measures.length > 1 ? (
          <div className="measure-indicator">
            {parsedRhythm.measures.map((_, idx) => (
              <span
                key={idx}
                className={`measure-dot ${idx === currentMeasureIndex ? 'active' : ''}`}
                title={`Measure ${idx + 1}`}
              />
            ))}
          </div>
        ) : null}
        <DrumNotationMini
          rhythm={opts.rhythm}
          currentNoteIndex={opts.valid && showValidNotation ? currentNoteIndex : null}
          width={opts.width}
          height={opts.height}
          style={resolvedNotationStyle}
          showDrumSymbols={true}
          drumSymbolScale={drumSymbolScale}
          showMetronomeDots={opts.showMetronomeDots}
          currentBeat={currentBeat}
          isPlaying={isPlaying && showValidNotation}
        />
      </>
    ) : (
      <div className="drum-display-error drum-display-error--inline">
        <p>Enter a valid rhythm pattern</p>
        {parsedRhythm.error ? <span className="error-detail">{parsedRhythm.error}</span> : null}
      </div>
    );

  const stageNotationWidth = notationWidth ?? 320;
  const stageNotationHeight = notationHeight ?? (metronomeEnabled ? 120 : 100);
  // Menu preview needs room for articulations + end bar; keep fixed so the popover doesn’t jump.
  // Width > 300 so DrumNotationMini uses the wider stave side pad (less flush barlines).
  const menuNotationWidth = Math.min(Math.max(stageNotationWidth, 304), 340);
  const menuNotationHeight = 132;

  const notationMini = renderNotationMini({
    width: stageNotationWidth,
    height: stageNotationHeight,
    showMetronomeDots: notationShowMetronomeDots ?? metronomeEnabled,
    rhythm: stageDisplayRhythm,
    valid: stageShowValidNotation,
    showMeasureIndicator: true,
  });

  const patternEditMenu =
    denseMenuEditing && patternEditOpen ? (
      <AnchoredPopover
        open
        anchorEl={patternMenuAnchor}
        anchorReference={patternMenuPosition ? 'anchorPosition' : 'anchorEl'}
        anchorPosition={patternMenuPosition ?? undefined}
        onClose={closePatternEditor}
        placement="bottom-end"
        paperClassName={DRUM_PATTERN_EDIT_MENU_CLASS}
        disableRestoreFocus
        disableScrollLock
        marginThreshold={12}
        slotProps={{
          root: {
            className: DRUM_PATTERN_EDIT_MENU_ROOT_CLASS,
            sx: { zIndex: DRUM_PATTERN_EDIT_MENU_Z_INDEX },
          },
        }}
      >
        <div
          id={patternEditorPanelId}
          role="dialog"
          aria-label="Drum pattern editor"
          className="drum-pattern-edit-menu__body"
        >
          <div
            className="drum-pattern-edit-menu__preview"
            aria-live="polite"
            style={
              {
                '--drum-edit-menu-preview-height': `${menuNotationHeight}px`,
              } as React.CSSProperties
            }
          >
            {renderNotationMini({
              width: menuNotationWidth,
              height: menuNotationHeight,
              showMetronomeDots: false,
              rhythm: displayRhythm,
              valid: showValidNotation,
              showMeasureIndicator: false,
            })}
          </div>
          {presetSelector}
          {/* Always reserve the variations row so preset switches don’t resize the menu. */}
          <div
            className="drum-pattern-edit-menu__variations"
            aria-hidden={variationControls ? undefined : true}
          >
            {variationControls ?? (
              <div className="drum-pattern-edit-menu__variations-spacer" />
            )}
          </div>
          {patternInputForMenu}
          <div className="drum-pattern-edit-menu__footer">
            <button
              type="button"
              className="labs-btn drum-pattern-edit-menu__done"
              onClick={closePatternEditor}
            >
              Done
            </button>
          </div>
        </div>
      </AnchoredPopover>
    ) : null;

  return (
    <div
      className={[
        'drum-accompaniment',
        denseMenuEditing || readOnly ? 'drum-accompaniment--playback-focus' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showInlineEditing ? presetSelector : null}
      {showInlineEditing ? patternInput : null}

      {/* Dense / read-only: notation first; edit controls live in a dropdown menu. */}
      {denseMenuEditing || readOnly ? (
        <div
          className={['vexflow-mini-container', notationFrameClassName].filter(Boolean).join(' ')}
        >
          {notationToolbar}
          <div
            ref={notationFrameRef}
            className={[
              'stanza-drums-notation-stage',
              denseMenuEditing ? 'stanza-drums-notation-trigger' : '',
              patternEditOpen ? 'is-editing' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={
              patternEditOpen
                ? { minHeight: stageNotationHeight }
                : undefined
            }
          >
            {patternEditTriggerHit}
            {notationMini}
          </div>
          {notationFooter}
          {patternEditMenu}
        </div>
      ) : showValidNotation ? (
        <div
          className={['vexflow-mini-container', notationFrameClassName].filter(Boolean).join(' ')}
        >
          {selectedPresetData && templateVariations.length > 1 ? (
            <div className="drum-notation-mini-header-row stanza-drums-notation-toolbar">
              <div className="drum-notation-mini-header-row__main">
                <RhythmTemplateVariationControls
                  presetLabel={selectedPresetData.label}
                  variations={templateVariations}
                  activeVariationIndex={activeVariationIndex}
                  onPrevious={() => cycleTemplateVariation(-1)}
                  onNext={() => cycleTemplateVariation(1)}
                />
              </div>
              <div className="stanza-drums-notation-toolbar__trail">
                {showInlineNotationDarbukaLink ? (
                  <DarbukaTrainerIconLink
                    href={darbukaHref}
                    className={darbukaLinkClassName}
                    tooltip={darbukaLinkTooltip}
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="drum-notation-mini-header-row stanza-drums-notation-toolbar">
              <span className="drum-pattern-active-summary" title={activePresetLabel}>
                {activePresetLabel}
              </span>
              <div className="stanza-drums-notation-toolbar__trail">
                {showInlineNotationDarbukaLink ? (
                  <DarbukaTrainerIconLink
                    href={darbukaHref}
                    className={darbukaLinkClassName}
                    tooltip={darbukaLinkTooltip}
                  />
                ) : null}
              </div>
            </div>
          )}
          <div className="stanza-drums-notation-stage">
            {parsedRhythm.measures.length > 1 ? (
              <div className="measure-indicator">
                {parsedRhythm.measures.map((_, idx) => (
                  <span
                    key={idx}
                    className={`measure-dot ${idx === currentMeasureIndex ? 'active' : ''}`}
                    title={`Measure ${idx + 1}`}
                  />
                ))}
              </div>
            ) : null}
            <DrumNotationMini
              rhythm={displayRhythm}
              currentNoteIndex={currentNoteIndex}
              width={notationWidth ?? 320}
              height={notationHeight ?? (metronomeEnabled ? 120 : 100)}
              style={
                notationStyle ??
                ({
                  inkColor: '#c8c4d8',
                  highlightColor: '#22c55e',
                } as NotationStyle)
              }
              showDrumSymbols={true}
              drumSymbolScale={drumSymbolScale}
              showMetronomeDots={notationShowMetronomeDots ?? metronomeEnabled}
              currentBeat={currentBeat}
              isPlaying={isPlaying}
            />
          </div>
          {notationFooter}
        </div>
      ) : (
        <div className="drum-display-error">
          <p>Enter a valid rhythm pattern</p>
          {parsedRhythm.error && <span className="error-detail">{parsedRhythm.error}</span>}
        </div>
      )}

      {hoverTip && typeof document !== 'undefined'
        ? createPortal(
            <div
              data-testid="drum-accompaniment-hover-tip"
              style={{
                position: 'fixed',
                left: `${hoverTip.x}px`,
                top: `${hoverTip.y}px`,
                transform:
                  hoverTip.placement === 'above'
                    ? 'translate(-50%, -100%)'
                    : 'translateX(-50%)',
                background: '#374151',
                color: '#f9fafb',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                lineHeight: 1.2,
                padding: '8px 10px',
                zIndex: DRUM_PATTERN_EDIT_TIP_Z_INDEX,
                pointerEvents: 'none',
                boxShadow: '0 8px 18px rgba(15, 23, 42, 0.28)',
                whiteSpace: 'nowrap',
              }}
            >
              {hoverTip.text}
            </div>,
            document.body
          )
        : null}

    </div>
  );
};

export default DrumAccompaniment;
