"use node";

import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Webhook } from "svix";

type ClerkUserEventData = {
  id: string;
  email_addresses: Array<{
    email_address: string;
    id: string;
    verification: { status: string } | null;
  }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  primary_email_address_id: string | null;
};

type ClerkWebhookEvent = {
  type: string;
  data: ClerkUserEventData;
};

/**
 * Clerk webhook handler for syncing user data to Convex.
 * Handles user.created and user.updated events.
 */
export const clerkWebhook = httpAction(async (ctx, request) => {
  // Get the webhook secret from environment
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET environment variable is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Get the svix headers for verification
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("Missing svix headers");
    return new Response("Missing svix headers", { status: 400 });
  }

  // Get the raw body
  const body = await request.text();

  // Verify the webhook signature
  const wh = new Webhook(webhookSecret);
  let event: ClerkWebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Handle user.created and user.updated events
  if (event.type === "user.created" || event.type === "user.updated") {
    const userData = event.data;

    // Get the primary email
    const primaryEmail = userData.email_addresses.find(
      (email) => email.id === userData.primary_email_address_id
    );

    if (!primaryEmail) {
      console.error("No primary email found for user:", userData.id);
      return new Response("No primary email found", { status: 400 });
    }

    // Call the internal mutation to create or update the user
    try {
      await ctx.runMutation(internal.webhooks.clerkInternal.createOrUpdateUser, {
        email: primaryEmail.email_address,
        firstname: userData.first_name ?? "",
        surname: userData.last_name ?? "",
        pictureURL: userData.image_url ?? undefined,
      });

      console.log(
        `Successfully processed ${event.type} for user:`,
        primaryEmail.email_address
      );
    } catch (err) {
      console.error("Failed to create/update user:", err);
      return new Response("Failed to process user data", { status: 500 });
    }
  }

  return new Response("Webhook processed", { status: 200 });
});
