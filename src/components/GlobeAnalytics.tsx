/**
 * GlobeAnalytics — interactive 3D globe rendered by the `cobe` library.
 *
 * Adapted from the 21st.dev `GlobeAnalytics` component Babak shared.
 * Differences from the reference:
 *   - RealSight mint marker palette (#18D6A4) instead of generic green.
 *   - No live-updating fake numbers — markers receive real metrics from
 *     the parent (UKHPI YoY, Case-Shiller YoY, project counts).
 *   - Tooltips are NOT rendered here (the reference used CSS Anchor
 *     Positioning which isn't broadly supported yet). The page that
 *     embeds the globe renders a clickable card grid below it that
 *     serves the same purpose with better cross-browser support.
 *
 * Pointer drag rotates the globe; releasing the pointer resumes auto
 * rotation. Pure visual element — interactivity (clicks) handled by
 * the card grid in the parent.
 */
import { useEffect, useRef, useCallback } from 'react';
import createGlobe from 'cobe';

export interface GlobeMarker {
  id: string;
  /** [lat, lng] tuple. */
  location: [number, number];
  /** Marker size as fraction of globe radius (default 0.04). */
  size?: number;
}

interface GlobeAnalyticsProps {
  markers: GlobeMarker[];
  /** Spin speed in radians per frame. Default = subtle drift. */
  speed?: number;
  className?: string;
}

export function GlobeAnalytics({
  markers,
  speed = 0.003,
  className = '',
}: GlobeAnalyticsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    isPausedRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        };
      }
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId: number;
    let phi = 0;

    function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta: 0.2,
        // Dark cinematic globe — matches RealSight's bg palette.
        dark: 1,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 6,
        // Base: deep navy. Marker: RealSight mint. Glow: subtle mint halo.
        baseColor: [0.08, 0.12, 0.22],
        markerColor: [0.094, 0.84, 0.643], // #18D6A4
        glowColor: [0.094, 0.84, 0.643],
        markerElevation: 0,
        markers: markers.map((m) => ({
          location: m.location,
          size: m.size ?? 0.05,
        })),
        arcs: [],
        arcColor: [0.094, 0.84, 0.643],
        arcWidth: 0.5,
        arcHeight: 0.25,
        opacity: 0.85,
      });

      function animate() {
        if (!isPausedRef.current) phi += speed;
        globe!.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          theta: 0.2 + thetaOffsetRef.current + dragOffset.current.theta,
        });
        animationId = requestAnimationFrame(animate);
      }
      animate();
      setTimeout(() => canvas && (canvas.style.opacity = '1'));
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect();
          init();
        }
      });
      ro.observe(canvas);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (globe) globe.destroy();
    };
  }, [markers, speed]);

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
          opacity: 0,
          transition: 'opacity 1.2s ease',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
