import { Id } from "../../../../convex/_generated/dataModel";

type MessageItemProps = {
  message: {
    _id: Id<"messages">;
    _creationTime: number;
    authorId: Id<"members">;
    text: string;
    isEdited: boolean;
    author: {
      firstname: string;
      surname: string;
      pictureURL?: string;
    };
  };
  isCompact: boolean;
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export const MessageItem = ({ message, isCompact }: MessageItemProps) => {
  const initials = `${message.author.firstname[0] ?? ""}${message.author.surname[0] ?? ""}`.toUpperCase();

  if (isCompact) {
    return (
      <div className="group flex items-start gap-3 px-3 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <div className="w-8 shrink-0 flex items-center justify-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message._creationTime)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-dark dark:text-light whitespace-pre-wrap break-words">
            {message.text}
          </p>
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
        <p className="text-sm text-dark dark:text-light whitespace-pre-wrap break-words">
          {message.text}
        </p>
      </div>
    </div>
  );
};
