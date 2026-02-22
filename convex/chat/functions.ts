// Barrel file: re-exports all chat functions from domain-specific files.
// This preserves all api.chat.functions.* paths for frontend consumers.

export { getChannelsForMember, getMessages, getUnreadCounts } from "./channelFunctions";
export {
  sendMessage,
  markAsRead,
  getMessageById,
  getThreadReplies,
  sendThreadReply,
  getThreadCounts,
  editMessage,
  deleteMessage,
} from "./messageFunctions";
export { getOrCreateDMChannel } from "./dmFunctions";
export {
  createTopicMessage,
  askClarification,
  answerClarification,
  advanceTopicPhase,
  submitTopicResponse,
  resolveTopicTool,
  getTopicClarifications,
  getTopicResponses,
  getMyTopicResponse,
  canFacilitate,
} from "./topicFunctions";
export {
  createVotingMessage,
  submitVote,
  closeVote,
  getVoteResults,
  getMyVote,
} from "./votingFunctions";
export {
  createElectionMessage,
  submitNomination,
  advanceElectionPhase,
  changeNomination,
  submitElectionResponse,
  resolveElection,
  cancelElection,
  getElectionNominations,
  getElectionResponses,
  getMyElectionNomination,
  getMyElectionResponse,
  getEligibleNominees,
  canFacilitateElectionQuery,
} from "./electionFunctions";
export { toggleReaction, getReactionsForMessages } from "./reactionFunctions";
export { searchMessages } from "./searchFunctions";
export {
  createLotteryMessage,
  drawLottery,
  getLotteryDetails,
} from "./lotteryFunctions";
