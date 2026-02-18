import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migrate orga color fields from old model to new model.
 * - paperColorLight → surfaceColorLight
 * - paperColorDark → surfaceColorDark
 * - highlightColorLight (preferred) or highlightColorDark → accentColor
 *
 * Idempotent: skips orgas that already have the new fields set.
 * Run via Convex dashboard: internal.orgas.migrations.migrateColorFields
 */
export const migrateColorFields = internalMutation({
  args: {},
  returns: v.object({
    total: v.number(),
    migrated: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    const allOrgas = await ctx.db.query("orgas").collect();
    let migrated = 0;
    let skipped = 0;

    for (const orga of allOrgas) {
      const doc = orga as Record<string, unknown>;

      // Skip if already migrated (any new field is set)
      if (doc.accentColor || doc.surfaceColorLight || doc.surfaceColorDark) {
        skipped++;
        continue;
      }

      const patch: Record<string, unknown> = {};

      // Copy paper colors → surface colors
      if (doc.paperColorLight) {
        patch.surfaceColorLight = doc.paperColorLight;
      }
      if (doc.paperColorDark) {
        patch.surfaceColorDark = doc.paperColorDark;
      }

      // Copy highlight color → accent color (prefer light, fall back to dark)
      if (doc.highlightColorLight) {
        patch.accentColor = doc.highlightColorLight;
      } else if (doc.highlightColorDark) {
        patch.accentColor = doc.highlightColorDark;
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(orga._id, patch);
        migrated++;
      } else {
        skipped++;
      }
    }

    return { total: allOrgas.length, migrated, skipped };
  },
});

/**
 * Strip legacy color fields from all orga documents.
 * Run this AFTER all frontend code has been updated to use new fields,
 * and BEFORE narrowing the schema to remove old fields.
 *
 * Run via Convex dashboard: internal.orgas.migrations.stripLegacyColorFields
 */
export const stripLegacyColorFields = internalMutation({
  args: {},
  returns: v.object({
    total: v.number(),
    stripped: v.number(),
  }),
  handler: async (ctx) => {
    const allOrgas = await ctx.db.query("orgas").collect();
    let stripped = 0;

    for (const orga of allOrgas) {
      const doc = orga as Record<string, unknown>;
      const needsStrip =
        doc.colorScheme !== undefined ||
        doc.paperColorLight !== undefined ||
        doc.paperColorDark !== undefined ||
        doc.highlightColorLight !== undefined ||
        doc.highlightColorDark !== undefined;

      if (needsStrip) {
        await ctx.db.patch(orga._id, {
          colorScheme: undefined,
          paperColorLight: undefined,
          paperColorDark: undefined,
          highlightColorLight: undefined,
          highlightColorDark: undefined,
        });
        stripped++;
      }
    }

    return { total: allOrgas.length, stripped };
  },
});
