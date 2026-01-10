import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render } from '@testing-library/react';
import VideoPlayer from './VideoPlayer';

describe('VideoPlayer', () => {
  // Mock HTMLMediaElement methods that jsdom doesn't implement
  beforeAll(() => {
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should render video element', () => {
    const { container } = render(
      <VideoPlayer
        videoUrl="test.mp4"
        isPlaying={false}
        currentTime={0}
      />
    );

    expect(container.querySelector('video')).toBeTruthy();
  });

  it('should set src attribute on video element', () => {
    const { container } = render(
      <VideoPlayer
        videoUrl="https://example.com/video.mp4"
        isPlaying={false}
        currentTime={0}
      />
    );

    const video = container.querySelector('video');
    expect(video?.getAttribute('src')).toBe('https://example.com/video.mp4');
  });

  describe('sync behavior', () => {
    it('should have muted property set for audio from main player', () => {
      const { container } = render(
        <VideoPlayer
          videoUrl="test.mp4"
          isPlaying={false}
          currentTime={0}
        />
      );

      const video = container.querySelector('video') as HTMLVideoElement;
      // React sets muted as a property, not an attribute
      expect(video?.muted).toBe(true);
    });

    it('should have playsInline attribute for mobile compatibility', () => {
      const { container } = render(
        <VideoPlayer
          videoUrl="test.mp4"
          isPlaying={false}
          currentTime={0}
        />
      );

      const video = container.querySelector('video');
      expect(video?.hasAttribute('playsinline')).toBe(true);
    });
  });

  describe('props validation', () => {
    it('should accept all required props without throwing', () => {
      expect(() => {
        render(
          <VideoPlayer
            videoUrl="https://example.com/video.mp4"
            isPlaying={true}
            currentTime={30}
          />
        );
      }).not.toThrow();
    });

    it('should accept optional playbackRate prop', () => {
      expect(() => {
        render(
          <VideoPlayer
            videoUrl="test.mp4"
            isPlaying={false}
            currentTime={0}
            playbackRate={0.5}
          />
        );
      }).not.toThrow();
    });

    it('should accept optional onTimeUpdate prop', () => {
      const onTimeUpdate = vi.fn();
      expect(() => {
        render(
          <VideoPlayer
            videoUrl="test.mp4"
            isPlaying={false}
            currentTime={0}
            onTimeUpdate={onTimeUpdate}
          />
        );
      }).not.toThrow();
    });
  });

  describe('CSS classes', () => {
    it('should have video-player wrapper class', () => {
      const { container } = render(
        <VideoPlayer
          videoUrl="test.mp4"
          isPlaying={false}
          currentTime={0}
        />
      );

      expect(container.querySelector('.video-player')).toBeTruthy();
    });

    it('should have video-element class on video', () => {
      const { container } = render(
        <VideoPlayer
          videoUrl="test.mp4"
          isPlaying={false}
          currentTime={0}
        />
      );

      expect(container.querySelector('.video-element')).toBeTruthy();
    });
  });

  describe('playback state changes', () => {
    it('should not throw when isPlaying changes', () => {
      const { rerender } = render(
        <VideoPlayer
          videoUrl="test.mp4"
          isPlaying={false}
          currentTime={0}
        />
      );

      expect(() => {
        rerender(
          <VideoPlayer
            videoUrl="test.mp4"
            isPlaying={true}
            currentTime={0}
          />
        );
      }).not.toThrow();
    });

    it('should call play when isPlaying becomes true', () => {
      const { rerender } = render(
        <VideoPlayer
          videoUrl="test.mp4"
          isPlaying={false}
          currentTime={0}
        />
      );

      vi.clearAllMocks();

      rerender(
        <VideoPlayer
          videoUrl="test.mp4"
          isPlaying={true}
          currentTime={0}
        />
      );

      expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    });

    it('should not throw when currentTime changes', () => {
      const { rerender } = render(
        <VideoPlayer
          videoUrl="test.mp4"
          isPlaying={false}
          currentTime={0}
        />
      );

      expect(() => {
        rerender(
          <VideoPlayer
            videoUrl="test.mp4"
            isPlaying={false}
            currentTime={30}
          />
        );
      }).not.toThrow();
    });

    it('should not throw when playbackRate changes', () => {
      const { rerender } = render(
        <VideoPlayer
          videoUrl="test.mp4"
          isPlaying={false}
          currentTime={0}
          playbackRate={1.0}
        />
      );

      expect(() => {
        rerender(
          <VideoPlayer
            videoUrl="test.mp4"
            isPlaying={false}
            currentTime={0}
            playbackRate={0.75}
          />
        );
      }).not.toThrow();
    });
  });
});
