import Button from '@mui/material/Button';
import ShuffleIcon from '@mui/icons-material/Shuffle';

import AppTooltip from '../../shared/components/AppTooltip';
import ZineboxAccountMenu from './ZineboxAccountMenu';
import ZineboxUploadMenu from './ZineboxUploadMenu';

type ZineboxUploadSlotProps = {
  disabled?: boolean;
  tagSuggestions: readonly string[];
  onLocalFiles: (files: File[]) => void;
  onDriveImportComplete?: (summary: string) => void;
  onError: (message: string | null) => void;
};

type ZineboxRandomUnreadProps = {
  disabled: boolean;
  onPick: () => void;
};

type ZineboxAppHeaderProps = {
  upload: ZineboxUploadSlotProps;
  randomUnread?: ZineboxRandomUnreadProps;
  search?: React.ReactNode;
};

export default function ZineboxAppHeader({
  upload,
  randomUnread,
  search,
}: ZineboxAppHeaderProps): React.ReactElement {
  return (
    <header className="zinebox-header">
      <div className="zinebox-header__brand">
        <h1 className="zinebox-header__title">Zine Box</h1>
      </div>
      {search ? <div className="zinebox-header__search">{search}</div> : null}
      <div className="zinebox-header__actions">
        {randomUnread ? (
          <AppTooltip
            title={
              randomUnread.disabled
                ? 'No unread zines in your library'
                : 'Open a random unread zine'
            }
          >
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ShuffleIcon />}
                disabled={randomUnread.disabled}
                onClick={randomUnread.onPick}
                aria-label="Open a random unread zine"
                sx={{ textTransform: 'none', flexShrink: 0 }}
              >
                Random
              </Button>
            </span>
          </AppTooltip>
        ) : null}
        <ZineboxUploadMenu {...upload} />
        <ZineboxAccountMenu />
      </div>
    </header>
  );
}
