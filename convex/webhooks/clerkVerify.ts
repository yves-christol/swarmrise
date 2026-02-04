"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Webhook } from "svix";

/**
 * Verify Clerk webhook signature using svix.
 * This is a Node.js action because svix requires Node.js.
 */
export const verifyWebhook = internalAction({
  args: {
    body: v.string(),
    svixId: v.string(),
    svixTimestamp: v.string(),
    svixSignature: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      event: v.object({
        type: v.string(),
        data: v.object({
          id: v.string(),
          email: v.string(),
          firstName: v.union(v.string(), v.null()),
          lastName: v.union(v.string(), v.null()),
          imageUrl: v.union(v.string(), v.null()),
        }),
      }),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (_ctx, args) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return { success: false as const, error: "Webhook secret not configured" };
    }

    const wh = new Webhook(webhookSecret);

    try {
      const event = wh.verify(args.body, {
        "svix-id": args.svixId,
        "svix-timestamp": args.svixTimestamp,
        "svix-signature": args.svixSignature,
      }) as {
        type: string;
        data: {
          id: string;
          email_addresses: Array<{
            email_address: string;
            id: string;
          }>;
          first_name: string | null;
          last_name: string | null;
          image_url: string | null;
          primary_email_address_id: string | null;
        };
      };

      // Extract primary email
      const primaryEmail = event.data.email_addresses.find(
        (email) => email.id === event.data.primary_email_address_id
      );

      if (!primaryEmail) {
        return { success: false as const, error: "No primary email found" };
      }

      return {
        success: true as const,
        event: {
          type: event.type,
          data: {
            id: event.data.id,
            email: primaryEmail.email_address,
            firstName: event.data.first_name,
            lastName: event.data.last_name,
            imageUrl: event.data.image_url,
          },
        },
      };
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return { success: false as const, error: "Invalid signature" };
    }
  },
});
