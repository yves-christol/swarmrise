import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up pending invitations older than 30 days
// Runs daily at 3:00 AM UTC
crons.daily(
  "cleanup-old-invitations",
  { hourUTC: 3, minuteUTC: 0 },
  internal.invitations.functions.deleteOldPendingInvitations
);

export default crons;
