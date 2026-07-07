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
import {
  resolveDarbukaLinkPlacement,
  type InlineDarbukaLinkPlacement,
  type DeprecatedInlineDarbukaLinkPlacement,
} from './inlineDrumUxDefaults';
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
  /** Inline shows preset grid + pattern field in the panel; collapsed hides them behind Edit until expanded (Stanza rail). */
  patternEditing?: 'inline' | 'popover';
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
  patternEditing = 'inline',
}) => {
  const isControlled = onNotationValueChange !== undefined;
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [presetMenuAnchor, setPresetMenuAnchor] = useState<HTMLElement | null>(null);
  const [patternEditOpen, setPatternEditOpen] = useState(false);
  const patternEditorPanelId = React.useId();
  const notationFrameRef = useRef<HTMLDivElement | null>(null);
  const [customNotation, setCustomNotation] = useState<string | null>(null);
  const [hoverTip, setHoverTip] = useState<{ text: string; x: number; y: number } | null>(
    null
  );
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
      setHoverTip({
        text,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 10,
      });
    },
    []
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

  const togglePatternEditor = useCallback(() => {
    setPatternEditOpen((open) => !open);
  }, []);

  const openPatternEditor = useCallback(() => {
    setPatternEditOpen(true);
  }, []);

  const closePatternEditor = useCallback(() => {
    setPatternEditOpen(false);
  }, []);

  useEffect(() => {
    if (!patternEditOpen || patternEditing !== 'popover') return undefined;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      closePatternEditor();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [closePatternEditor, patternEditOpen, patternEditing]);

  const activePreset = presetRhythms[selectedPreset];
  const activePresetLabel = activePreset?.label ?? 'Rhythm';
  const patternEditingPopover = patternEditing === 'popover';
  const showInlineEditing = !patternEditingPopover;

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
        {randomizeButtons}
      </div>
    ) : (
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
        {randomizeButtons}
      </div>
    );

  const patternInput = hidePatternInput ? null : showInlinePatternDarbukaLink ? (
    <div className="drum-pattern-input-row">
      <div className="drum-pattern-input">
        <input
          type="text"
          placeholder="D-T-K-T- or paste Darbuka Trainer URL"
          value={notation}
          onChange={(e) => handleNotationChange(e.target.value)}
          onPaste={handlePaste}
        />
      </div>
      <DarbukaTrainerIconLink
        href={darbukaHref}
        className={darbukaLinkClassName}
        tooltip={darbukaLinkTooltip}
      />
    </div>
  ) : (
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

  const showValidNotation = parsedRhythm.isValid && parsedRhythm.measures.length > 0;

  const patternEditToolbarButton = patternEditingPopover ? (
    <button
      type="button"
      className="drum-pattern-edit-btn"
      aria-expanded={patternEditOpen}
      aria-controls={patternEditorPanelId}
      aria-label={patternEditOpen ? 'Done editing drum pattern' : 'Edit drum pattern'}
      onClick={togglePatternEditor}
    >
      {patternEditOpen ? 'Done' : 'Edit'}
    </button>
  ) : null;

  const patternEditTriggerHit =
    patternEditingPopover && !patternEditOpen ? (
      <button
        type="button"
        className="stanza-drums-notation-trigger__hit"
        aria-expanded={false}
        aria-controls={patternEditorPanelId}
        aria-label={
          showValidNotation
            ? `Drum pattern: ${activePresetLabel}. Edit pattern.`
            : 'Enter a drum pattern'
        }
        onClick={openPatternEditor}
      />
    ) : null;

  const notationToolbarMain = notationToolbarLeading ? (
    notationToolbarLeading
  ) : selectedPresetData && templateVariations.length > 1 ? (
    <RhythmTemplateVariationControls
      presetLabel={selectedPresetData.label}
      variations={templateVariations}
      activeVariationIndex={activeVariationIndex}
      onPrevious={() => cycleTemplateVariation(-1)}
      onNext={() => cycleTemplateVariation(1)}
    />
  ) : (
    <span className="drum-pattern-active-summary" title={activePresetLabel}>
      {activePresetLabel}
    </span>
  );

  const notationToolbar = (
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
  );

  const notationMini = showValidNotation ? (
    <>
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
    </>
  ) : (
    <div className="drum-display-error drum-display-error--inline">
      <p>Enter a valid rhythm pattern</p>
      {parsedRhythm.error ? <span className="error-detail">{parsedRhythm.error}</span> : null}
    </div>
  );

  return (
    <div
      className={[
        'drum-accompaniment',
        patternEditingPopover ? 'drum-accompaniment--playback-focus' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showInlineEditing ? presetSelector : null}
      {showInlineEditing ? patternInput : null}

      {/* Rhythm display — collapsed-edit mode keeps one stable shell across valid/invalid edits. */}
      {patternEditingPopover ? (
        <div
          className={['vexflow-mini-container', notationFrameClassName].filter(Boolean).join(' ')}
        >
          {notationToolbar}
          <div
            ref={notationFrameRef}
            className={[
              'stanza-drums-notation-stage',
              'stanza-drums-notation-trigger',
              patternEditOpen ? 'is-editing' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {patternEditTriggerHit}
            {notationMini}
          </div>
          {notationFooter}
          {patternEditOpen ? (
            <div
              id={patternEditorPanelId}
              role="region"
              aria-label="Drum pattern editor"
              className="stanza-drums-pattern-editor-panel stanza-drums-panel"
            >
              <div className="stanza-drums-pattern-editor">
                {presetSelector}
                {patternInput}
              </div>
            </div>
          ) : null}
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
              style={{
                position: 'fixed',
                left: `${hoverTip.x}px`,
                top: `${hoverTip.y}px`,
                transform: 'translateX(-50%)',
                background: '#374151',
                color: '#f9fafb',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                lineHeight: 1.2,
                padding: '8px 10px',
                zIndex: 420,
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
