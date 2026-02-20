import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { getAuthenticatedUser } from "../utils";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    url: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    orgaId: v.optional(v.id("orgas")),
  },
  returns: v.id("bugReports"),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Resolve org name if orgaId is provided
    let orgaName: string | undefined;
    if (args.orgaId) {
      const orga = await ctx.db.get(args.orgaId);
      if (orga) {
        orgaName = orga.name;
      }
    }

    const bugReportId = await ctx.db.insert("bugReports", {
      userId: user._id,
      userEmail: user.email,
      title: args.title,
      description: args.description,
      url: args.url,
      userAgent: args.userAgent,
      orgaId: args.orgaId,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.emails.sendBugReportEmail.send,
      {
        userEmail: user.email,
        title: args.title,
        description: args.description,
        url: args.url,
        userAgent: args.userAgent,
        orgaName,
      }
    );

    return bugReportId;
  },
});
