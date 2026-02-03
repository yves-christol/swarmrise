import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Create or update a user from Clerk webhook data.
 * If the user exists (by email), update their profile data.
 * If the user doesn't exist, create a new user.
 * Also syncs the updated data to all related member records.
 */
export const createOrUpdateUser = internalMutation({
  args: {
    email: v.string(),
    firstname: v.string(),
    surname: v.string(),
    pictureURL: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    // Check if user already exists by email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        firstname: args.firstname,
        surname: args.surname,
        pictureURL: args.pictureURL,
      });

      // Sync to all related members
      const relatedMembers = await ctx.db
        .query("members")
        .withIndex("by_person", (q) => q.eq("personId", existingUser._id))
        .collect();

      for (const member of relatedMembers) {
        await ctx.db.patch(member._id, {
          firstname: args.firstname,
          surname: args.surname,
          pictureURL: args.pictureURL,
        });
      }

      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      firstname: args.firstname,
      surname: args.surname,
      pictureURL: args.pictureURL,
      contactInfos: [],
      orgaIds: [],
    });

    return userId;
  },
});
