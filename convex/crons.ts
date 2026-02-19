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

// Reset the "Infomax Demo" sandbox organization every night
// Runs daily at 2:00 AM UTC (= 3:00 AM CET / 4:00 AM CEST)
// Deletes the existing demo orga with all dependencies and recreates it fresh
crons.daily(
  "reset-demo-orga",
  { hourUTC: 2, minuteUTC: 0 },
  internal.dataTest.createDemoOrga.resetDemoOrga
);

// Check kanban cards for approaching/overdue due dates and send notifications
// Runs every hour
crons.interval(
  "kanban-due-date-notifications",
  { hours: 1 },
  internal.kanban.functions.checkDueDateNotifications
);

export default crons;
