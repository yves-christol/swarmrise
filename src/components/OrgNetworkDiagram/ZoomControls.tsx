import { memo } from "react";

type ZoomControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export const ZoomControls = memo(function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
}: ZoomControlsProps) {
  const buttonClass = `
    w-10 h-10 bg-gray-800 rounded-lg shadow-lg
    flex items-center justify-center text-xl
    hover:bg-gray-700 transition-colors
    text-gray-200 border border-gray-700
    focus:outline-none focus:ring-2 focus:ring-[#a2dbed]
  `;

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2">
      <button
        onClick={onZoomIn}
        className={buttonClass}
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        onClick={onZoomOut}
        className={buttonClass}
        aria-label="Zoom out"
      >
        -
      </button>
      <button
        onClick={onReset}
        className={buttonClass + " text-xs"}
        aria-label="Reset view"
      >
        1:1
      </button>
    </div>
  );
});
