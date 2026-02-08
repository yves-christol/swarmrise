import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { ViewportState } from "./types";

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const ZOOM_FACTOR = 1.1;

export function useViewport(svgElement: SVGSVGElement | null) {
  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const viewportRef = useRef(viewport);

  // Keep viewportRef in sync
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // Attach wheel listener with { passive: false } to allow preventDefault
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

    svgElement.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      svgElement.removeEventListener("wheel", handleWheel);
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
