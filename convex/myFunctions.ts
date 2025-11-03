import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// You can read data from the database via a query:
export const listNumbers = query({
  // Validators for arguments.
  args: {
    count: v.number(),
  },

  // Query implementation.
  handler: async (ctx, args) => {
    //// Read the database as many times as you need here.
    //// See https://docs.convex.dev/database/reading-data.
    const numbers = await ctx.db
      .query("numbers")
      // Ordered by _creationTime, return most recent
      .order("desc")
      .take(args.count);
    return {
      viewer: (await ctx.auth.getUserIdentity())?.name ?? null,
      numbers: numbers.reverse().map((number) => number.value),
    };
  },
});

// You can write data to the database via a mutation:
export const addNumber = mutation({
  // Validators for arguments.
  args: {
    value: v.number(),
  },

  // Mutation implementation.
  handler: async (ctx, args) => {
    //// Insert or modify documents in the database here.
    //// Mutations can also read from the database like queries.
    //// See https://docs.convex.dev/database/writing-data.

    const id = await ctx.db.insert("numbers", { value: args.value });

    console.log("Added new document with id:", id);
    // Optionally, return a value from your mutation.
    // return id;
  },
});

// Debug function to check authentication state
export const debugAuth = query({
  args: {},
  returns: v.object({
    hasAuth: v.boolean(),
    userIdentity: v.any(),
    authError: v.optional(v.string()),
    tokenInfo: v.optional(v.any()),
  }),
  handler: async (ctx) => {
    try {
      const userIdentity = await ctx.auth.getUserIdentity();
      
      // Additional debugging info
      let tokenInfo = null;
      try {
        const token = userIdentity?.tokenIdentifier;
        if (token) {
          // Decode JWT header and payload (without verification)
          const parts = token.split('.');
          if (parts.length === 3) {
            const header = JSON.parse(atob(parts[0]));
            const payload = JSON.parse(atob(parts[1]));
            tokenInfo = { header, payload };
          }
        }
      } catch (tokenError) {
        console.log("Token debug error:", tokenError);
      }
      
      return {
        hasAuth: !!userIdentity,
        userIdentity: userIdentity,
        authError: undefined,
        tokenInfo: tokenInfo,
      };
    } catch (error) {
      console.log("Auth debug error:", error);
      return {
        hasAuth: false,
        userIdentity: null,
        authError: error instanceof Error ? error.message : "Unknown error",
        tokenInfo: null,
      };
    }
  },
});

// You can fetch data from and send data to third-party APIs via an action:
export const myAction = action({
  // Validators for arguments.
  args: {
    first: v.number(),
    second: v.string(),
  },

  // Action implementation.
  handler: async (ctx, args) => {
    //// Use the browser-like `fetch` API to send HTTP requests.
    //// See https://docs.convex.dev/functions/actions#calling-third-party-apis-and-using-npm-packages.
    // const response = await ctx.fetch("https://api.thirdpartyservice.com");
    // const data = await response.json();

    //// Query data by running Convex queries.
    const data = await ctx.runQuery(api.myFunctions.listNumbers, {
      count: 10,
    });
    console.log(data);

    //// Write data by running Convex mutations.
    await ctx.runMutation(api.myFunctions.addNumber, {
      value: args.first,
    });
  },
});
