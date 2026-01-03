import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getAdmin = internalQuery({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      firstname: v.string(),
      surname: v.string(),
      email: v.string(),
      pictureURL: v.optional(v.string()),
      contactInfos: v.array(
        v.object({
          type: v.union(
            v.literal("LinkedIn"),
            v.literal("Facebook"),
            v.literal("Instagram"),
            v.literal("Whatsapp"),
            v.literal("Mobile"),
            v.literal("Address")
          ),
          value: v.string(),
        })
      ),
      orgaIds: v.array(v.id("orgas")),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    try {
      return await ctx.db.query("users").withIndex('by_email', (q) => q.eq('email', 'yves.christol@gmail.com')).unique();
    } catch {
      return null;
    }
  },
});
