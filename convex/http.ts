import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { clerkWebhook } from "./webhooks/clerk";

const http = httpRouter();

http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: clerkWebhook,
});

/**
 * Authenticated file serving endpoint.
 * Verifies org membership via the storageFiles tracking table before
 * returning the file blob. URL format: /files/{storageId}
 */
http.route({
  pathPrefix: "/files/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const storageId = url.pathname.replace("/files/", "") as Id<"_storage">;

    if (!storageId) {
      return new Response("Missing storageId", { status: 400 });
    }

    const result = await ctx.runQuery(
      internal.storage.functions.verifyFileAccess,
      { storageId },
    );

    if (!result.allowed) {
      return new Response("Forbidden", { status: 403 });
    }

    const blob = await ctx.storage.get(storageId);
    if (!blob) {
      return new Response("Not Found", { status: 404 });
    }

    const contentType = result.mimeType ?? "application/octet-stream";
    const isImage = contentType.startsWith("image/");
    const disposition = isImage
      ? "inline"
      : `attachment; filename="${result.fileName ?? "download"}"`;

    return new Response(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }),
});

export default http;
