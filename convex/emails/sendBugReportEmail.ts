"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

export const send = internalAction({
  args: {
    userEmail: v.string(),
    title: v.string(),
    description: v.string(),
    url: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    orgaName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured, skipping bug report email");
      return null;
    }

    const resend = new Resend(apiKey);

    const metadataRows = [
      `<tr><td style="padding: 4px 12px 4px 0; color: #999; font-size: 13px;">From</td><td style="padding: 4px 0; font-size: 13px;">${args.userEmail}</td></tr>`,
      args.orgaName
        ? `<tr><td style="padding: 4px 12px 4px 0; color: #999; font-size: 13px;">Organization</td><td style="padding: 4px 0; font-size: 13px;">${args.orgaName}</td></tr>`
        : "",
      args.url
        ? `<tr><td style="padding: 4px 12px 4px 0; color: #999; font-size: 13px;">URL</td><td style="padding: 4px 0; font-size: 13px;">${args.url}</td></tr>`
        : "",
      args.userAgent
        ? `<tr><td style="padding: 4px 12px 4px 0; color: #999; font-size: 13px;">User Agent</td><td style="padding: 4px 0; font-size: 13px; word-break: break-all;">${args.userAgent}</td></tr>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    await resend.emails.send({
      from: "swarmrise <bugs@swarmrise.com>",
      to: "yves@yorga.fr",
      subject: `[Bug Report] ${args.title}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 22px; color: #212121; margin-bottom: 16px;">
            ${args.title}
          </h1>
          <div style="font-size: 15px; color: #444; line-height: 1.6; margin-bottom: 24px; white-space: pre-wrap;">
${args.description}
          </div>
          <table style="border-top: 1px solid #eee; padding-top: 16px; margin-top: 16px;">
            ${metadataRows}
          </table>
          <p style="font-size: 12px; color: #999; margin-top: 32px;">
            This bug report was submitted via swarmrise.
          </p>
        </div>
      `,
    });

    return null;
  },
});
