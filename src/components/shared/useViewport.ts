import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { ViewportState } from "./visualTypes";

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const ZOOM_FACTOR = 1.1;

// Helper: compute distance between two touch points
function getTouchDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Helper: compute midpoint between two touch points relative to an element
function getTouchMidpoint(t1: Touch, t2: Touch, rect: DOMRect): { x: number; y: number } {
  return {
    x: (t1.clientX + t2.clientX) / 2 - rect.left,
    y: (t1.clientY + t2.clientY) / 2 - rect.top,
  };
}

/**
 * Shared viewport hook for SVG visual views.
 * Provides pinch-to-zoom, wheel zoom, and mouse/touch pan.
 */
export function useViewport(svgElement: SVGSVGElement | null) {
  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const viewportRef = useRef(viewport);

  // Touch gesture state (refs to avoid re-renders during gesture)
  const touchStateRef = useRef<{
    isPinching: boolean;
    isPanning: boolean;
    initialDistance: number;
    initialScale: number;
    initialMidpoint: { x: number; y: number };
    initialOffsetX: number;
    initialOffsetY: number;
    lastTouchX: number;
    lastTouchY: number;
  }>({
    isPinching: false,
    isPanning: false,
    initialDistance: 0,
    initialScale: 1,
    initialMidpoint: { x: 0, y: 0 },
    initialOffsetX: 0,
    initialOffsetY: 0,
    lastTouchX: 0,
    lastTouchY: 0,
  });

  // Keep viewportRef in sync
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // Attach wheel and touch listeners with { passive: false } to allow preventDefault
  useEffect(() => {
    if (!svgElement) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentViewport = viewportRef.current;
      const zoomFactor = e.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, currentViewport.scale * zoomFactor)
      );

      // Zoom toward cursor position
      const rect = svgElement.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setViewport((prev) => ({
        scale: newScale,
        offsetX: mouseX - (mouseX - prev.offsetX) * (newScale / prev.scale),
        offsetY: mouseY - (mouseY - prev.offsetY) * (newScale / prev.scale),
      }));
    };

    // --- Touch handlers for pinch-to-zoom and single-finger pan ---

    const handleTouchStart = (e: TouchEvent) => {
      const ts = touchStateRef.current;

      if (e.touches.length === 2) {
        // Two-finger pinch-to-zoom start
        e.preventDefault();
        const rect = svgElement.getBoundingClientRect();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const vp = viewportRef.current;

        ts.isPinching = true;
        ts.isPanning = false;
        ts.initialDistance = getTouchDistance(t1, t2);
        ts.initialScale = vp.scale;
        ts.initialMidpoint = getTouchMidpoint(t1, t2, rect);
        ts.initialOffsetX = vp.offsetX;
        ts.initialOffsetY = vp.offsetY;
      } else if (e.touches.length === 1) {
        // Single-finger pan start (only on SVG background, not on nodes)
        const target = e.target as Element;
        const isSvgBackground = target === svgElement || target.tagName === "svg";
        if (isSvgBackground) {
          // Don't preventDefault here -- allow tap/click events to propagate
          const vp = viewportRef.current;
          ts.isPanning = true;
          ts.isPinching = false;
          ts.lastTouchX = e.touches[0].clientX;
          ts.lastTouchY = e.touches[0].clientY;
          ts.initialOffsetX = vp.offsetX;
          ts.initialOffsetY = vp.offsetY;
          setIsPanning(true);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const ts = touchStateRef.current;

      if (ts.isPinching && e.touches.length === 2) {
        // Pinch-to-zoom: scale toward the midpoint between the two fingers
        e.preventDefault();
        const rect = svgElement.getBoundingClientRect();
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const currentDistance = getTouchDistance(t1, t2);
        const scaleFactor = currentDistance / ts.initialDistance;
        const newScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, ts.initialScale * scaleFactor)
        );

        // Current midpoint
        const midpoint = getTouchMidpoint(t1, t2, rect);

        // Zoom toward the midpoint: adjust offset so the graph point under
        // the initial midpoint stays under the current midpoint
        const scaleRatio = newScale / ts.initialScale;
        const newOffsetX = midpoint.x - (ts.initialMidpoint.x - ts.initialOffsetX) * scaleRatio;
        const newOffsetY = midpoint.y - (ts.initialMidpoint.y - ts.initialOffsetY) * scaleRatio;

        setViewport({
          scale: newScale,
          offsetX: newOffsetX,
          offsetY: newOffsetY,
        });
      } else if (ts.isPanning && e.touches.length === 1) {
        // Single-finger pan
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - ts.lastTouchX;
        const dy = touch.clientY - ts.lastTouchY;
        ts.lastTouchX = touch.clientX;
        ts.lastTouchY = touch.clientY;

        setViewport((prev) => ({
          ...prev,
          offsetX: prev.offsetX + dx,
          offsetY: prev.offsetY + dy,
        }));
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const ts = touchStateRef.current;

      if (e.touches.length < 2) {
        ts.isPinching = false;
      }
      if (e.touches.length === 0) {
        ts.isPanning = false;
        setIsPanning(false);
      }
      // If transitioning from pinch (2 fingers) to single finger, start panning
      if (e.touches.length === 1 && !ts.isPanning) {
        const vp = viewportRef.current;
        ts.isPanning = true;
        ts.lastTouchX = e.touches[0].clientX;
        ts.lastTouchY = e.touches[0].clientY;
        ts.initialOffsetX = vp.offsetX;
        ts.initialOffsetY = vp.offsetY;
      }
    };

    svgElement.addEventListener("wheel", handleWheel, { passive: false });
    svgElement.addEventListener("touchstart", handleTouchStart, { passive: false });
    svgElement.addEventListener("touchmove", handleTouchMove, { passive: false });
    svgElement.addEventListener("touchend", handleTouchEnd, { passive: false });
    svgElement.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      svgElement.removeEventListener("wheel", handleWheel);
      svgElement.removeEventListener("touchstart", handleTouchStart);
      svgElement.removeEventListener("touchmove", handleTouchMove);
      svgElement.removeEventListener("touchend", handleTouchEnd);
      svgElement.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [svgElement]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Only pan if clicking on the SVG background (not on nodes)
      if (e.target === svgElement || (e.target as Element).tagName === "svg") {
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX - viewportRef.current.offsetX,
          y: e.clientY - viewportRef.current.offsetY,
        };
      }
    },
    [svgElement]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (isPanning) {
        setViewport((prev) => ({
          ...prev,
          offsetX: e.clientX - panStartRef.current.x,
          offsetY: e.clientY - panStartRef.current.y,
        }));
      }
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  const zoomIn = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      scale: Math.min(MAX_SCALE, prev.scale * 1.2),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      scale: Math.max(MIN_SCALE, prev.scale / 1.2),
    }));
  }, []);

  const resetView = useCallback(() => {
    setViewport({ scale: 1, offsetX: 0, offsetY: 0 });
  }, []);

  // Center the viewport on a specific point in graph coordinates
  const centerOnPoint = useCallback((graphX: number, graphY: number, containerWidth: number, containerHeight: number) => {
    setViewport((prev) => ({
      ...prev,
      offsetX: containerWidth / 2 - graphX * prev.scale,
      offsetY: containerHeight / 2 - graphY * prev.scale,
    }));
  }, []);

  // Memoize handlers and controls to prevent unnecessary re-renders
  const handlers = useMemo(() => ({
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
  }), [handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave]);

  const controls = useMemo(() => ({
    zoomIn,
    zoomOut,
    resetView,
    centerOnPoint,
  }), [zoomIn, zoomOut, resetView, centerOnPoint]);

  return {
    viewport,
    isPanning,
    handlers,
    controls,
  };
}
