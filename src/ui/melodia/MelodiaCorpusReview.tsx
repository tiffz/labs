import { useCallback, useEffect, useRef, useState } from 'react';
import type { NormalizedMelodiaExercise } from '../../shared/music/melodiaPipeline/types';
import { normalizePianoScore } from '../../shared/music/melodiaPipeline/normalize';
import { parseMusicXml } from '../../shared/music/parseMusicXml';
import { drawMelodiaFirstMeasurePreview } from '../../shared/music/melodiaVexFirstMeasure';

export default function MelodiaCorpusReview() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [level, setLevel] = useState(1);
  const [normalized, setNormalized] = useState<NormalizedMelodiaExercise | null>(null);
  const [jsonDraft, setJsonDraft] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const applyNormalized = useCallback((n: NormalizedMelodiaExercise) => {
    setNormalized(n);
    setParseError(null);
    setJsonDraft(JSON.stringify(n, null, 2));
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !normalized) return;
    try {
      drawMelodiaFirstMeasurePreview(el, normalized.score);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : String(e));
    }
  }, [normalized]);

  const onMusicXmlFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result ?? '');
          const score = parseMusicXml(text);
          const id = `preview-${file.name.replace(/\W+/g, '-')}`;
          const n = normalizePianoScore(score, { id, sourceFile: file.name, melodiaLevel: level });
          applyNormalized(n);
        } catch (e) {
          setParseError(e instanceof Error ? e.message : String(e));
          setNormalized(null);
        }
      };
      reader.readAsText(file);
    },
    [applyNormalized, level],
  );

  const onApplyJson = useCallback(() => {
    try {
      const n = JSON.parse(jsonDraft) as NormalizedMelodiaExercise;
      if (!n.score || !n.score.parts) throw new Error('Invalid: missing score.parts');
      applyNormalized(n);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : String(e));
    }
  }, [jsonDraft, applyNormalized]);

  const downloadJson = useCallback(() => {
    if (!normalized) return;
    const blob = new Blob([JSON.stringify(normalized, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${normalized.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [normalized]);

  return (
    <div className="ui-melodia-corpus">
      <h2>Melodia corpus review</h2>
      <p>
        Load MusicXML from your OMR export, run validators, preview with VexFlow, then copy or download JSON
        for committing under <code>src/melodia/curriculum/data/</code>.
      </p>
      <label>
        Melodia level (for interval heuristics){' '}
        <input
          type="number"
          min={1}
          max={10}
          value={level}
          onChange={(e) => setLevel(Math.max(1, parseInt(e.target.value, 10) || 1))}
        />
      </label>
      <p>
        <label>
          MusicXML file{' '}
          <input
            type="file"
            accept=".xml,.musicxml"
            onChange={(e) => onMusicXmlFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </p>
      <div ref={hostRef} className="vexflow-mini-container" style={{ minHeight: 240 }} />
      {parseError && (
        <p className="ui-melodia-error" role="alert">
          {parseError}
        </p>
      )}
      {normalized && (
        <>
          <h3>Flags ({normalized.validation_report.length})</h3>
          <ul>
            {normalized.validation_report.map((f, i) => (
              <li key={`${f.code}-${i}`}>
                <strong>{f.severity}</strong> [{f.code}] measure {f.measure ?? '—'}: {f.message}
              </li>
            ))}
          </ul>
          <h3>HRMF</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{normalized.hrmf}</pre>
          <h3>JSON (editable)</h3>
          <textarea
            value={jsonDraft}
            onChange={(e) => setJsonDraft(e.target.value)}
            rows={14}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
            spellCheck={false}
          />
          <p>
            <button type="button" onClick={onApplyJson}>
              Re-apply JSON
            </button>{' '}
            <button type="button" onClick={downloadJson}>
              Download JSON
            </button>
          </p>
        </>
      )}
    </div>
  );
}
