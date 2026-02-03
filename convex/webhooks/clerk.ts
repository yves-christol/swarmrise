import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Clerk webhook handler for syncing user data to Convex.
 * Handles user.created and user.updated events.
 */
export const clerkWebhook = httpAction(async (ctx, request) => {
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

  // Verify the webhook signature using Node.js action
  const result = await ctx.runAction(internal.webhooks.clerkVerify.verifyWebhook, {
    body,
    svixId,
    svixTimestamp,
    svixSignature,
  });

  if (!result.success) {
    console.error("Webhook verification failed:", result.error);
    return new Response(result.error, { status: 400 });
  }

  const { event } = result;

  // Handle user.created and user.updated events
  if (event.type === "user.created" || event.type === "user.updated") {
    try {
      await ctx.runMutation(internal.webhooks.clerkInternal.createOrUpdateUser, {
        email: event.data.email,
        firstname: event.data.firstName ?? "",
        surname: event.data.lastName ?? "",
        pictureURL: event.data.imageUrl ?? undefined,
      });

      console.log(
        `Successfully processed ${event.type} for user:`,
        event.data.email
      );
    } catch (err) {
      console.error("Failed to create/update user:", err);
      return new Response("Failed to process user data", { status: 500 });
    }
  }

  return new Response("Webhook processed", { status: 200 });
});
