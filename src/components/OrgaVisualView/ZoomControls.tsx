import { memo } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("teams");
  const buttonClass = `
    w-10 h-10 rounded-lg shadow-lg
    flex items-center justify-center text-xl
    transition-colors
    bg-white dark:bg-gray-800
    text-gray-700 dark:text-gray-200
    border border-gray-300 dark:border-gray-700
    hover:bg-gray-100 dark:hover:bg-gray-700
    focus:outline-none focus:ring-2 focus:ring-[#a2dbed]
  `;

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2">
      <button
        onClick={onZoomIn}
        className={buttonClass}
        aria-label={t("diagram.zoomIn")}
      >
        +
      </button>
      <button
        onClick={onZoomOut}
        className={buttonClass}
        aria-label={t("diagram.zoomOut")}
      >
        -
      </button>
      <button
        onClick={onReset}
        className={buttonClass + " text-xs"}
        aria-label={t("diagram.resetView")}
      >
        1:1
      </button>
    </div>
  );
});
