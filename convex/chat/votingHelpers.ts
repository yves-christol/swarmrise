import type { Message } from ".";

/**
 * Validate that a message has a voting embedded tool that is still open.
 * Throws if the message doesn't have a voting tool, is closed, or is past deadline.
 */
export function requireVotingOpen(message: Message): void {
  if (!message.embeddedTool) {
    throw new Error("Message has no embedded tool");
  }
  if (message.embeddedTool.type !== "voting") {
    throw new Error("Message embedded tool is not a voting tool");
  }
  if (message.embeddedTool.isClosed) {
    throw new Error("Voting is closed");
  }
  if (message.embeddedTool.deadline && message.embeddedTool.deadline < Date.now()) {
    throw new Error("Voting deadline has passed");
  }
}

/**
 * Validate choices against voting mode rules.
 * - single: exactly 1 choice
 * - approval: at least 1 choice, all must be valid option IDs
 * - ranked: exactly all options, each used once (a full ranking)
 */
export function validateChoices(
  choices: string[],
  mode: "single" | "approval" | "ranked",
  optionIds: string[]
): void {
  if (choices.length === 0) {
    throw new Error("Must provide at least one choice");
  }

  // All choices must be valid option IDs
  for (const choice of choices) {
    if (!optionIds.includes(choice)) {
      throw new Error(`Invalid choice: ${choice}`);
    }
  }

  // Check for duplicates
  const uniqueChoices = new Set(choices);
  if (uniqueChoices.size !== choices.length) {
    throw new Error("Duplicate choices are not allowed");
  }

  if (mode === "single") {
    if (choices.length !== 1) {
      throw new Error("Single mode requires exactly one choice");
    }
  } else if (mode === "ranked") {
    if (choices.length !== optionIds.length) {
      throw new Error("Ranked mode requires ranking all options");
    }
  }
  // approval: any non-zero subset is valid (already checked above)
}
