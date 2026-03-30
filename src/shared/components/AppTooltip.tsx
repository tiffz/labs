import React from 'react';
import Tooltip, { type TooltipProps } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';

const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(() => ({
  // Keep tooltips above in-app overlays/modals like the piano Exercise Picker.
  zIndex: 4000,
  [`& .MuiTooltip-tooltip`]: {
    backgroundColor: '#202124',
    color: '#fff',
    fontSize: '0.78rem',
    lineHeight: 1.35,
    borderRadius: 8,
    padding: '7px 10px',
    maxWidth: 320,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.24)',
    whiteSpace: 'pre-line',
  },
  [`& .MuiTooltip-arrow`]: {
    color: '#202124',
  },
}));

interface AppTooltipProps {
  title: React.ReactNode;
  children: React.ReactElement;
  placement?: TooltipProps['placement'];
  describeChild?: boolean;
  disabled?: boolean;
}

/**
 * Shared tooltip primitive with consistent delays, styling, and disabled-child handling.
 */
export default function AppTooltip({
  title,
  children,
  placement = 'top',
  describeChild = true,
  disabled = false,
}: AppTooltipProps): React.ReactElement {
  const hasContent =
    !disabled &&
    title !== null &&
    title !== undefined &&
    !(typeof title === 'string' && title.trim() === '');

  if (!hasContent) {
    return children;
  }

  const strippedChild = React.cloneElement(
    children as React.ReactElement<{ title?: string; 'data-tooltip'?: string }>,
    {
    title: undefined,
    'data-tooltip': undefined,
    }
  );

  const childProps = strippedChild.props as {
    disabled?: boolean;
    'aria-disabled'?: boolean | 'true' | 'false';
  };
  const needsWrapper =
    childProps.disabled === true || childProps['aria-disabled'] === true || childProps['aria-disabled'] === 'true';

  return (
    <StyledTooltip
      title={title}
      placement={placement}
      arrow
      describeChild={describeChild}
      enterDelay={350}
      enterNextDelay={120}
      leaveDelay={80}
      disableInteractive
      slotProps={{
        popper: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 8],
              },
            },
          ],
        },
      }}
    >
      {needsWrapper ? <span>{strippedChild}</span> : strippedChild}
    </StyledTooltip>
  );
}
