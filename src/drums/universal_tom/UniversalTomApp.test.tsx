import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UniversalTomApp from './UniversalTomApp';

// Mock VexFlowRenderer to avoid canvas issues and simplify props testing
vi.mock('../components/VexFlowRenderer', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: (props: any) => (
        <div data-testid="vexflow-renderer">
            <span data-testid="vf-rhythm-json">{JSON.stringify(props.rhythm)}</span>
            <span data-testid="vf-timesig-num">{props.timeSignature?.numerator}</span>
            <span data-testid="vf-timesig-den">{props.timeSignature?.denominator}</span>
            <span data-testid="vf-compact">{props.compactMode ? 'true' : 'false'}</span>
        </div>
    ),
}));

// Mock Parser
vi.mock('../utils/universalTomParser', () => ({
    parseUniversalTom: vi.fn((input) => {
        if (input.includes('a')) return 'D---';
        // If input contains '3.4J' but no 'a', it should still return something for the renderer to activate
        // For '3.4J a', it should return 'D---'
        // For '2.4J a', it should return 'D---'
        return ''; // Default empty
    }),
    detectTimeSignature: vi.fn((input) => {
        if (input.includes('3.4J')) return { numerator: 3, denominator: 4 };
        if (input.includes('2.4J')) return { numerator: 2, denominator: 4 };
        return null;
    })
}));

describe('UniversalTomApp', () => {
    it('renders the header and input area', () => {
        render(<UniversalTomApp />);
        expect(screen.getByText('Universal Tom Importer')).toBeInTheDocument();
        expect(screen.getByText('Source Text')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Paste Universal Tom/i)).toBeInTheDocument();
    });

    it('updates converted notation and preview when input changes', () => {
        render(<UniversalTomApp />);
        const textarea = screen.getByPlaceholderText(/Paste Universal Tom/i);

        // Input 'a' -> Mock returns 'D---'
        fireEvent.change(textarea, { target: { value: 'a' } });

        // Check Textarea value
        expect(textarea).toHaveValue('a');

        // Check Converted Notation (mocked return)
        expect(screen.getByText('D---')).toBeInTheDocument();
    });

    it('detects time signature and passes it to renderer', () => {
        render(<UniversalTomApp />);
        const textarea = screen.getByPlaceholderText(/Paste Universal Tom/i);

        // Input "3.4J" -> Mock detects 3/4
        // Also input 'a' so that VexFlowRenderer actually renders! (Condition: parsedNotation)
        fireEvent.change(textarea, { target: { value: '3.4J a' } });

        expect(screen.getByTestId('vf-timesig-num')).toHaveTextContent('3');
        expect(screen.getByTestId('vf-timesig-den')).toHaveTextContent('4');
    });

    it('renders in compact mode by default', () => {
        render(<UniversalTomApp />);
        const textarea = screen.getByPlaceholderText(/Paste Universal Tom/i);
        // Needs input to render the renderer
        fireEvent.change(textarea, { target: { value: 'a' } });

        expect(screen.getByTestId('vf-compact')).toHaveTextContent('true');
    });

    it('enables "Open in Trainer" button when valid input exists', () => {
        render(<UniversalTomApp />);
        const button = screen.getByText(/Open in Trainer/i).closest('button');
        expect(button).toBeDisabled();

        const textarea = screen.getByPlaceholderText(/Paste Universal Tom/i);
        fireEvent.change(textarea, { target: { value: 'a' } }); // Mock returns D---

        expect(button).toBeEnabled();
    });

    it('opens new tab with correct URL when button clicked', () => {
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
        render(<UniversalTomApp />);

        const textarea = screen.getByPlaceholderText(/Paste Universal Tom/i);
        fireEvent.change(textarea, { target: { value: '2.4J a' } });
        // Mock Logic:
        // parseUniversalTom('2.4J a') -> includes 'a', returns 'D---'.
        // detectTimeSignature('2.4J a') -> includes '2.4J', returns { numerator: 2, denominator: 4 }.

        const button = screen.getByText(/Open in Trainer/i);
        fireEvent.click(button);

        expect(openSpy).toHaveBeenCalled();
        // Verify URL basics
        const url = openSpy.mock.calls[0][0] as string;
        expect(url).toContain('/drums/?rhythm=');
        expect(url).toContain('time=2/4');
    });
});
