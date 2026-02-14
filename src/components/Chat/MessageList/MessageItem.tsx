import { useTranslation } from "react-i18next";
import { Id } from "../../../../convex/_generated/dataModel";
import { TopicTool } from "../TopicTool";
import { VotingTool } from "../VotingTool";
import { ElectionTool } from "../ElectionTool";
import { ReactionBar, ReactionButton } from "../Reactions";
import type { EmbeddedVoting } from "../VotingTool";
import type { EmbeddedElection } from "../ElectionTool";

type EmbeddedTool = {
  type: "topic";
  title: string;
  description: string;
  phase: "proposition" | "clarification" | "consent" | "resolved";
  outcome?: "accepted" | "modified" | "withdrawn";
  decisionId?: Id<"decisions">;
} | {
  type: "voting";
  question: string;
  options: { id: string; label: string }[];
  mode: "single" | "approval" | "ranked";
  isAnonymous: boolean;
  deadline?: number;
  isClosed: boolean;
} | {
  type: "election";
  roleTitle: string;
  roleId?: Id<"roles">;
  teamId: Id<"teams">;
  phase: "nomination" | "discussion" | "change_round" | "consent" | "elected" | "cancelled";
  proposedCandidateId?: Id<"members">;
  electedMemberId?: Id<"members">;
  outcome?: "elected" | "no_election";
  decisionId?: Id<"decisions">;
};

type ReactionGroup = {
  emoji: string;
  count: number;
  reacted: boolean;
  memberNames: string[];
};

type MessageItemProps = {
  message: {
    _id: Id<"messages">;
    _creationTime: number;
    authorId: Id<"members">;
    text: string;
    isEdited: boolean;
    embeddedTool?: EmbeddedTool;
    author: {
      firstname: string;
      surname: string;
      pictureURL?: string;
    };
  };
  isCompact: boolean;
  replyCount?: number;
  onReply?: (messageId: Id<"messages">) => void;
  currentMemberId?: Id<"members">;
  reactions?: ReactionGroup[];
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export const MessageItem = ({ message, isCompact, replyCount, onReply, currentMemberId, reactions }: MessageItemProps) => {
  const { t } = useTranslation("chat");
  const initials = `${message.author.firstname[0] ?? ""}${message.author.surname[0] ?? ""}`.toUpperCase();
  const messageReactions = reactions ?? [];

  const threadIndicator = onReply && (
    <div className="flex items-center gap-2 mt-1">
      {replyCount !== undefined && replyCount > 0 && (
        <button
          onClick={() => onReply(message._id)}
          className="text-xs text-[#996800] dark:text-[#eac840] hover:underline"
        >
          {t("replies", { count: replyCount })}
        </button>
      )}
      <button
        onClick={() => onReply(message._id)}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {t("reply")}
      </button>
      <ReactionButton messageId={message._id} />
    </div>
  );

  // Reaction bar shown below content when there are existing reactions,
  // or on hover to allow adding a first reaction.
  const reactionBar = (
    <ReactionBar
      messageId={message._id}
      reactions={messageReactions}
      showAddButton={!onReply}
    />
  );

  const isAuthor = currentMemberId === message.authorId;
  const topicTool = message.embeddedTool?.type === "topic" ? message.embeddedTool : null;
  const votingTool = message.embeddedTool?.type === "voting" ? (message.embeddedTool as EmbeddedVoting) : null;
  const electionTool = message.embeddedTool?.type === "election" ? (message.embeddedTool as EmbeddedElection) : null;
  const hasEmbeddedTool = topicTool || votingTool || electionTool;

  if (isCompact) {
    return (
      <div className="group flex items-start gap-3 px-3 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <div className="w-8 shrink-0 flex items-center justify-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message._creationTime)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          {!hasEmbeddedTool && (
            <p className="text-sm text-dark dark:text-light whitespace-pre-wrap break-words">
              {message.text}
            </p>
          )}
          {topicTool && <TopicTool messageId={message._id} tool={topicTool} />}
          {votingTool && <VotingTool messageId={message._id} tool={votingTool} />}
          {electionTool && <ElectionTool messageId={message._id} tool={electionTool} isAuthor={isAuthor} />}
          {reactionBar}
          {threadIndicator}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <div className="w-8 h-8 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center overflow-hidden">
        {message.author.pictureURL ? (
          <img
            src={message.author.pictureURL}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            {initials}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-dark dark:text-light">
            {message.author.firstname} {message.author.surname}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatTime(message._creationTime)}
          </span>
          {message.isEdited && (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">(edited)</span>
          )}
        </div>
        {!hasEmbeddedTool && (
          <p className="text-sm text-dark dark:text-light whitespace-pre-wrap break-words">
            {message.text}
          </p>
        )}
        {topicTool && <TopicTool messageId={message._id} tool={topicTool} />}
        {votingTool && <VotingTool messageId={message._id} tool={votingTool} />}
        {electionTool && <ElectionTool messageId={message._id} tool={electionTool} isAuthor={isAuthor} />}
        {reactionBar}
        {threadIndicator}
      </div>
    </div>
  );
};
