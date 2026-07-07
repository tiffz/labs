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
