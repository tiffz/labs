import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import IconButton from '@mui/material/IconButton';
import { useState, type MouseEvent, type ReactElement } from 'react';

import AppTooltip from '../../shared/components/AppTooltip';
import AnchoredPopover from '../../shared/components/AnchoredPopover';
import { useLabsDisclosureMenu } from '../../shared/a11y/useLabsDisclosureMenu';

const FORMAT_ROWS: ReadonlyArray<{ indent: string; means: string; example: string }> = [
  { indent: 'Top bullet', means: 'Page', example: 'Page 1, Opening spread' },
  { indent: 'Tab once', means: 'Panel', example: 'Wide shot, Panel 2' },
  { indent: 'Tab again', means: 'Line', example: 'Action, HERO: dialogue, *SFX*' },
];

/** Info popover next to the Source column heading. Explains the nested-bullet script format on demand instead of a fixed paragraph above the editor. */
export function ScriptFormatHelp(): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { menuId, getTriggerA11yProps } = useLabsDisclosureMenu({ hasPopup: 'dialog' });
  const open = Boolean(anchorEl);

  const onOpen = (event: MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const onClose = (): void => {
    setAnchorEl(null);
  };

  return (
    <>
      <AppTooltip title="Script format help">
        <IconButton
          size="small"
          aria-label="Script format help"
          className="lyrefly-script-format-help__trigger"
          data-testid="lyrefly-script-format-help-trigger"
          onClick={onOpen}
          {...getTriggerA11yProps(open)}
        >
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </AppTooltip>

      <AnchoredPopover
        open={open}
        anchorEl={anchorEl}
        onClose={onClose}
        placement="bottom-start"
        paperClassName="lyrefly-script-format-help__popover"
      >
        <div id={menuId} className="lyrefly-script-format-help" data-testid="lyrefly-script-format-help">
          <p className="lyrefly-script-format-help__intro">
            Write nested bullets on the left. Tab to indent from page to panel to line. The
            formatted script on the right updates as you type.
          </p>

          <table className="lyrefly-script-format-help__table">
            <thead>
              <tr>
                <th scope="col">Indent</th>
                <th scope="col">Means</th>
                <th scope="col">Example</th>
              </tr>
            </thead>
            <tbody>
              {FORMAT_ROWS.map((row) => (
                <tr key={row.indent}>
                  <td>{row.indent}</td>
                  <td>{row.means}</td>
                  <td>{row.example}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="lyrefly-script-format-help__conventions">
            <li>Dialogue: CHARACTER: line</li>
            <li>SFX: *CRASH* or SFX: BOOM</li>
            <li>Everything else reads as panel description.</li>
          </ul>

          <p className="lyrefly-script-format-help__keyboard">
            Tab to indent, Shift+Tab to outdent. Changes autosave, so there&#39;s no save button.
          </p>
        </div>
      </AnchoredPopover>
    </>
  );
}
