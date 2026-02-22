import { useTranslation } from "react-i18next";
import { Id } from "../../../../convex/_generated/dataModel";

type LotteryMember = {
  _id: Id<"members">;
  firstname: string;
  surname: string;
  pictureURL?: string;
};

type LotteryPendingProps = {
  pool: LotteryMember[];
  onDraw: () => void;
  isDrawing: boolean;
};

export const LotteryPending = ({ pool, onDraw, isDrawing }: LotteryPendingProps) => {
  const { t } = useTranslation("chat");

  return (
    <div className="space-y-2">
      {/* Avatar row */}
      {pool.length > 0 && (
        <div className="flex items-center gap-1">
          {pool.slice(0, 8).map((m) => {
            const initials = `${m.firstname[0] ?? ""}${m.surname[0] ?? ""}`.toUpperCase();
            return (
              <div
                key={m._id}
                className="w-6 h-6 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center overflow-hidden"
              >
                {m.pictureURL ? (
                  <img src={m.pictureURL} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[8px] font-medium text-text-description">{initials}</span>
                )}
              </div>
            );
          })}
          {pool.length > 8 && (
            <span className="text-xs text-text-tertiary ml-1">
              +{pool.length - 8}
            </span>
          )}
          <span className="text-xs text-text-secondary ml-auto">
            {t("lotteryPoolCount", { count: pool.length })}
          </span>
        </div>
      )}

      {pool.length === 0 && (
        <p className="text-xs text-text-tertiary italic">
          {t("lotteryNoEligibleMembers")}
        </p>
      )}

      <button
        onClick={onDraw}
        disabled={pool.length === 0 || isDrawing}
        className="w-full py-2 text-sm font-medium rounded-md bg-highlight text-dark hover:bg-highlight-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDrawing ? t("lotteryDrawing") : t("lotteryDraw")}
      </button>
    </div>
  );
};
