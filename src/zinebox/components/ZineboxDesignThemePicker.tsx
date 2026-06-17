import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';

import { ZINEBOX_DESIGN_THEME_GROUPS } from '../design/zineboxDesignThemes';
import { useZineboxDesignTheme } from '../context/useZineboxDesignTheme';

export default function ZineboxDesignThemePicker(): React.ReactElement {
  const { themeId, setThemeId, theme } = useZineboxDesignTheme();

  return (
    <div className="zinebox-design-picker" role="region" aria-label="Design preview picker">
      <Typography component="span" className="zinebox-design-picker__label">
        Design preview
      </Typography>
      <Select
        size="small"
        value={themeId}
        onChange={(e) => setThemeId(e.target.value as typeof themeId)}
        aria-label="Choose design theme"
        className="zinebox-design-picker__select"
        MenuProps={{ disablePortal: true }}
      >
        {ZINEBOX_DESIGN_THEME_GROUPS.map((group) => [
          <ListSubheader key={`header-${group.id}`}>{group.label}</ListSubheader>,
          ...group.themes.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.label}
            </MenuItem>
          )),
        ])}
      </Select>
      <Typography component="span" className="zinebox-design-picker__tagline">
        {theme.tagline}
      </Typography>
    </div>
  );
}
