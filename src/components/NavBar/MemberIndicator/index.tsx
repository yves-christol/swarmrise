import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useFocus } from "../../../tools/orgaStore/hooks";

export const MemberIndicator = () => {
  const { focus } = useFocus();

  const memberId = focus.type === "member" ? focus.memberId : undefined;
  const member = useQuery(
    api.members.functions.getMemberById,
    memberId ? { memberId } : "skip"
  );

  if (!member) {
    return (
      <span className="px-3 py-1.5 rounded-md text-sm font-medium bg-slate-100 dark:bg-slate-800 text-transparent animate-pulse w-24 h-7" />
    );
  }

  return (
    <span className="px-3 py-1.5 rounded-md text-sm font-medium bg-slate-100 dark:bg-slate-800 text-dark dark:text-light truncate max-w-[180px]">
      {member.firstname} {member.surname}
    </span>
  );
};
