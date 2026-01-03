import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { TableAggregate } from "@convex-dev/aggregate";
import { Doc } from "./_generated/dataModel";

/**
 * Aggregate for counting members per organization
 * Uses orgaId as namespace to keep data from different organizations separate
 */
export const aggregateMembers = new TableAggregate<
  {
    Namespace: string; // orgaId as string
    Key: null; // We only need counts, not sorted by key
    DataModel: DataModel;
    TableName: "members";
  }
>(components.aggregateMembers, {
  namespace: (doc: Doc<"members">) => doc.orgaId,
  sortKey: () => null, // No sorting needed for simple counts
});

/**
 * Aggregate for counting teams per organization
 * Uses orgaId as namespace to keep data from different organizations separate
 */
export const aggregateTeams = new TableAggregate<
  {
    Namespace: string; // orgaId as string
    Key: null; // We only need counts, not sorted by key
    DataModel: DataModel;
    TableName: "teams";
  }
>(components.aggregateTeams, {
  namespace: (doc: Doc<"teams">) => doc.orgaId,
  sortKey: () => null, // No sorting needed for simple counts
});

/**
 * Aggregate for counting roles per organization
 * Uses orgaId as namespace to keep data from different organizations separate
 */
export const aggregateRoles = new TableAggregate<
  {
    Namespace: string; // orgaId as string
    Key: null; // We only need counts, not sorted by key
    DataModel: DataModel;
    TableName: "roles";
  }
>(components.aggregateRoles, {
  namespace: (doc: Doc<"roles">) => doc.orgaId,
  sortKey: () => null, // No sorting needed for simple counts
});

