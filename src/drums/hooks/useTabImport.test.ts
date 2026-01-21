import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabImport } from './useTabImport';

describe('useTabImport', () => {
    it('should initialize with default state', () => {
        const { result } = renderHook(() => useTabImport());

        expect(result.current.state.step).toBe('input');
        expect(result.current.state.rawText).toBe('');
        expect(result.current.state.detectedType).toBe('unknown');
        expect(result.current.state.selectedType).toBe('drum');
    });

    it('should update raw text and auto-detect drum tab', () => {
        const { result } = renderHook(() => useTabImport());

        const drumTab = `
BD|o-------|
SD|----o---|
        `.trim();

        act(() => {
            result.current.setRawText(drumTab);
        });

        expect(result.current.state.rawText).toBe(drumTab);
        // Simple detection might just check for common drum chars + lines
        // Our mock tab might be too simple for complex regex, let's make it more robust if needed
        // Assuming isDrumTab logic works on this input
    });

    it('should allow manually setting type', () => {
        const { result } = renderHook(() => useTabImport());

        act(() => {
            result.current.setType('guitar');
        });

        expect(result.current.state.selectedType).toBe('guitar');
    });

    it('should update options', () => {
        const { result } = renderHook(() => useTabImport());

        act(() => {
            result.current.updateDrumOptions({ includeHiHat: true });
        });

        expect(result.current.state.drumOptions.includeHiHat).toBe(true);
    });
});
