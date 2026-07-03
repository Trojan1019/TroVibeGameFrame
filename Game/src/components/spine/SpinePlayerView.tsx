import { SpinePlayer, type SpinePlayerConfig } from '@esotericsoftware/spine-player';
import '@esotericsoftware/spine-player/dist/spine-player.css';
import React, { useEffect, useEffectEvent, useRef, useState } from 'react';

type PlayerStatus = 'loading' | 'ready' | 'error';

export interface SpinePlayerViewProps {
  skeleton: string;
  atlas: string;
  className?: string;
  animation?: string;
  backgroundColor?: string;
  interactive?: boolean;
  scale?: number;
  showControls?: boolean;
  skin?: string | string[];
  viewport?: SpinePlayerConfig['viewport'];
  onReady?: (player: SpinePlayer) => void;
  onError?: (message: string) => void;
}

export function SpinePlayerView({
  skeleton,
  atlas,
  className,
  animation,
  backgroundColor = '#00000000',
  interactive = true,
  scale,
  showControls = true,
  skin,
  viewport,
  onReady,
  onError,
}: SpinePlayerViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<SpinePlayer | null>(null);
  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleReady = useEffectEvent((player: SpinePlayer) => {
    setStatus('ready');
    setErrorMessage(null);
    onReady?.(player);
  });

  const handleError = useEffectEvent((message: string) => {
    setStatus('error');
    setErrorMessage(message);
    onError?.(message);
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setStatus('loading');
    setErrorMessage(null);
    container.innerHTML = '';

    const player = new SpinePlayer(container, {
      animation,
      atlas,
      backgroundColor,
      interactive,
      preserveDrawingBuffer: false,
      scale,
      showControls,
      skin,
      viewport,
      skeleton,
      success: handleReady,
      error: (_player, message) => handleError(message),
    });

    playerRef.current = player;

    return () => {
      player.dispose();
      playerRef.current = null;
      container.innerHTML = '';
    };
  }, [
    animation,
    atlas,
    backgroundColor,
    interactive,
    scale,
    showControls,
    skeleton,
    skin,
    viewport,
  ]);

  return (
    <div className={className}>
      <div ref={containerRef} className="h-full min-h-0 w-full min-w-0 overflow-hidden rounded-[24px]" />
      {status !== 'ready' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[24px] bg-black/45 px-6 text-center">
          <div className="max-w-md rounded-2xl border border-white/10 bg-[#16130f]/90 px-5 py-4 text-sm text-[#f8ead9] shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
            {status === 'loading' ? 'Spine runtime 正在加载资源…' : errorMessage || 'Spine 资源加载失败'}
          </div>
        </div>
      )}
    </div>
  );
}
