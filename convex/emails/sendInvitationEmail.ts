"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

export const send = internalAction({
  args: {
    recipientEmail: v.string(),
    orgaName: v.string(),
    inviterName: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured, skipping invitation email");
      return null;
    }

    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: "swarmrise <invitations@swarmrise.com>",
      to: args.recipientEmail,
      subject: `${args.inviterName} invited you to join ${args.orgaName} on swarmrise`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 24px; color: #212121; margin-bottom: 16px;">
            You've been invited!
          </h1>
          <p style="font-size: 16px; color: #444; line-height: 1.5; margin-bottom: 8px;">
            <strong>${args.inviterName}</strong> has invited you to join
            <strong>${args.orgaName}</strong> on swarmrise.
          </p>
          <p style="font-size: 14px; color: #666; line-height: 1.5; margin-bottom: 24px;">
            swarmrise is a light governance tool that brings clarity and traceability
            to organizational decision-making.
          </p>
          <a
            href="https://swarmrise.com"
            style="display: inline-block; padding: 12px 24px; background-color: #eac840; color: #212121; font-weight: bold; text-decoration: none; border-radius: 8px; font-size: 14px;"
          >
            Get started on swarmrise
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 32px; line-height: 1.4;">
            Once you sign up or log in, your pending invitation will be waiting for you.
          </p>
        </div>
      `,
    });

    return null;
  },
});
