import { useTranslation } from "react-i18next";
import { Id } from "../../../../convex/_generated/dataModel";

type LotteryMember = {
  _id: Id<"members">;
  firstname: string;
  surname: string;
  pictureURL?: string;
};

type LotteryDrawnProps = {
  selectedMember: LotteryMember;
  drawnByMember?: { _id: Id<"members">; firstname: string; surname: string };
  poolSize: number;
  drawnAt?: number;
};

export const LotteryDrawn = ({ selectedMember, drawnByMember, poolSize, drawnAt }: LotteryDrawnProps) => {
  const { t } = useTranslation("chat");
  const initials = `${selectedMember.firstname[0] ?? ""}${selectedMember.surname[0] ?? ""}`.toUpperCase();

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-10 h-10 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center overflow-hidden">
        {selectedMember.pictureURL ? (
          <img src={selectedMember.pictureURL} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-medium text-text-description">{initials}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-dark dark:text-light truncate">
            {selectedMember.firstname} {selectedMember.surname}
          </span>
          <span className="lottery-badge-enter text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 shrink-0">
            {t("lotterySelectedMember")}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <span>{t("lotteryDrawnFrom", { count: poolSize })}</span>
          {drawnByMember && drawnAt && (
            <>
              <span>&middot;</span>
              <span>
                {t("lotteryDrawnBy", {
                  name: `${drawnByMember.firstname} ${drawnByMember.surname}`,
                  time: new Date(drawnAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
                })}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
