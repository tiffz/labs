import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

const wordsSoundPanel = fs.readFileSync(
  path.join(root, 'src/words/components/WordsSoundSettingsPanel.tsx'),
  'utf8',
);

if (!wordsSoundPanel.includes('PlaybackVolumeRow')) {
  failures.push('WordsSoundSettingsPanel must use PlaybackVolumeRow for volume controls');
}

if (/AppSlider[\s\S]*volume|volume[\s\S]*AppSlider/i.test(wordsSoundPanel)) {
  failures.push('WordsSoundSettingsPanel must not use AppSlider for volume — use PlaybackVolumeRow');
}

const pianoPlayback = fs.readFileSync(
  path.join(root, 'src/piano/components/PlaybackControls.tsx'),
  'utf8',
);
if (!pianoPlayback.includes('AppLinearVolumeSlider')) {
  failures.push('Piano PlaybackControls must use AppLinearVolumeSlider for mix rails');
}
if (/AppSlider/.test(pianoPlayback) && /volume-slider/.test(pianoPlayback)) {
  // AppSlider may still appear for non-volume; flag only if still driving volume-slider class.
  const volumeBlocks = pianoPlayback.match(/volume-slider[\s\S]{0,120}/g) ?? [];
  for (const block of volumeBlocks) {
    if (block.includes('AppSlider') || !pianoPlayback.includes('AppLinearVolumeSlider')) {
      failures.push('Piano PlaybackControls volume-slider rows must use AppLinearVolumeSlider');
      break;
    }
  }
}

const drumsSettings = fs.readFileSync(
  path.join(root, 'src/drums/components/SettingsMenu.tsx'),
  'utf8',
);
if (!drumsSettings.includes('AppLinearVolumeSlider')) {
  failures.push('Drums SettingsMenu must use AppLinearVolumeSlider for volume controls');
}
if (/from ['"].*AppSlider['"]/.test(drumsSettings) || /\bAppSlider\b/.test(drumsSettings)) {
  failures.push(
    'Drums SettingsMenu must not import AppSlider — use AppLinearVolumeSlider for every settings rail (including reverb) so thumb geometry matches',
  );
}
if (
  !/id="reverb-strength"[\s\S]{0,400}AppLinearVolumeSlider/.test(drumsSettings) &&
  !/AppLinearVolumeSlider[\s\S]{0,400}id="reverb-strength"/.test(drumsSettings)
) {
  failures.push('Drums reverb-strength must use AppLinearVolumeSlider');
}
if (!drumsSettings.includes('settings-slider-wrapper--capped')) {
  failures.push(
    'Drums SettingsMenu must mark capped accent sliders with settings-slider-wrapper--capped (soft cap cue, not a solid gray bar)',
  );
}

if (!fs.existsSync(path.join(root, 'src/shared/components/AppLinearVolumeSlider.tsx'))) {
  failures.push('AppLinearVolumeSlider is missing');
}

if (!fs.existsSync(path.join(root, 'src/shared/styles/labsVolumeSlider.css'))) {
  failures.push('labsVolumeSlider.css is missing');
}

if (!fs.readFileSync(path.join(root, 'src/shared/styles/labsChrome.css'), 'utf8').includes('labsVolumeSlider.css')) {
  failures.push('labsChrome.css must import labsVolumeSlider.css');
}

if (failures.length > 0) {
  console.error('Volume slider contract check failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Volume slider contract check passed.');
