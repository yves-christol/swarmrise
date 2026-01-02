import { v } from "convex/values";

export const contactValidator = v.object({
  type: v.union(
    v.literal("LinkedIn"),
    v.literal("Facebook"),
    v.literal("Instagram"),
    v.literal("Whatsapp"),
    v.literal("Mobile"),
    v.literal("Address")
  ),
  value: v.string(),
})

export const userValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  firstname: v.string(),
  surname: v.string(),
  email: v.string(),
  pictureURL: v.optional(v.string()),
  contactInfos: v.array(contactValidator),
  orgaIds: v.array(v.id("orgas")),
})

export const rgbColorValidator = v.object({
  r: v.number(),
  g: v.number(),
  b: v.number(),
})

export const colorSchemeValidator = v.object({
  primary: rgbColorValidator,
  secondary: rgbColorValidator,
})

export const orgaValidator = v.object({
  _id: v.id("orgas"),
  _creationTime: v.number(),
  name: v.string(),
  logoUrl: v.optional(v.string()),
  colorScheme: colorSchemeValidator,
  owner: v.id("members"),
})

export const memberValidator = v.object({
  _id: v.id("members"),
  _creationTime: v.number(),
  orgaId: v.id("orgas"),
  personId: v.id("users"),
  firstname: v.string(),
  surname: v.string(),
  email: v.string(),
  pictureURL: v.optional(v.string()),
  contactInfos: v.array(contactValidator),
  roleIds: v.array(v.id("roles")),
})

export const teamValidator = v.object({
  _id: v.id("teams"),
  _creationTime: v.number(),
  orgaId: v.id("orgas"),
  name: v.string(),
  parentTeamId: v.optional(v.id("teams")),
  mission: v.optional(v.string()),
  isFirstTeam: v.boolean(),
})

export const roleValidator = v.object({
  _id: v.id("roles"),
  _creationTime: v.number(),
  teamId: v.id("teams"),
  title: v.string(),
  mission: v.string(),
  duties: v.array(v.string()),
  memberId: v.id("members"),
})

export const invitationValidator = 
v.object({
  _id: v.id("invitations"),
  _creationTime: v.number(),
  orgaId: v.id("orgas"),
  emitterMemberId: v.id("members"),
  email: v.string(),
  status: v.union(v.literal("pending"), v.literal("rejected"), v.literal("accepted")),
  sentDate: v.number(),
})

export const invitationStatusValidator = v.union(
  v.literal("pending"), v.literal("rejected"), v.literal("accepted")
)

export const policyValidator = v.object({
  _id: v.id("policies"),
  _creationTime: v.number(),
  orgaId: v.id("orgas"),
  teamId: v.id("teams"),
  roleId: v.id("roles"),
  issuedDate: v.number(),
  title: v.string(),
  text: v.string(),
  visibility: v.union(v.literal("private"), v.literal("public")),
  expirationDate: v.optional(v.number()),
})

export const decisionValidator = v.object({
  _id: v.id("decisions"),
  _creationTime: v.number(),
  orgaId: v.id("orgas"),
  timestamp: v.number(),
  authorEmail: v.string(),
  roleName: v.string(),
  teamName: v.string(),
  targetId: v.string(),
  targetType: v.string(),
  diff: v.union(
    v.object({
      type: v.literal("Organization"),
      before: v.optional(v.object({
        name: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
        colorScheme: v.optional(v.object({
          primary: v.object({ r: v.number(), g: v.number(), b: v.number() }),
          secondary: v.object({ r: v.number(), g: v.number(), b: v.number() }),
        })),
      })),
      after: v.optional(v.object({
        name: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
        colorScheme: v.optional(v.object({
          primary: v.object({ r: v.number(), g: v.number(), b: v.number() }),
          secondary: v.object({ r: v.number(), g: v.number(), b: v.number() }),
        })),
      })),
    }),
    v.object({
      type: v.literal("Team"),
      before: v.optional(v.object({
        orgaId: v.optional(v.id("orgas")),
        name: v.optional(v.string()),
        parentTeamId: v.optional(v.id("teams")),
        mission: v.optional(v.string()),
        isFirstTeam: v.optional(v.boolean()),
      })),
      after: v.optional(v.object({
        orgaId: v.optional(v.id("orgas")),
        name: v.optional(v.string()),
        parentTeamId: v.optional(v.id("teams")),
        mission: v.optional(v.string()),
        isFirstTeam: v.optional(v.boolean()),
      })),
    }),
    v.object({
      type: v.literal("Role"),
      before: v.optional(v.object({
        teamId: v.optional(v.id("teams")),
        title: v.optional(v.string()),
        mission: v.optional(v.string()),
        duties: v.optional(v.array(v.string())),
        memberId: v.optional(v.id("members")),
      })),
      after: v.optional(v.object({
        teamId: v.optional(v.id("teams")),
        title: v.optional(v.string()),
        mission: v.optional(v.string()),
        duties: v.optional(v.array(v.string())),
        memberId: v.optional(v.id("members")),
      })),
    }),
    v.object({
      type: v.literal("Invitation"),
      before: v.optional(v.object({
        orgaId: v.optional(v.id("orgas")),
        emitterMemberId: v.optional(v.id("members")),
        email: v.optional(v.string()),
        status: v.optional(v.union(v.literal("pending"), v.literal("rejected"), v.literal("accepted"))),
        sentDate: v.optional(v.number()),
      })),
      after: v.optional(v.object({
        orgaId: v.optional(v.id("orgas")),
        emitterMemberId: v.optional(v.id("members")),
        email: v.optional(v.string()),
        status: v.optional(v.union(v.literal("pending"), v.literal("rejected"), v.literal("accepted"))),
        sentDate: v.optional(v.number()),
      })),
    }),
    v.object({
      type: v.literal("Policy"),
      before: v.optional(v.object({
        orgaId: v.optional(v.id("orgas")),
        teamId: v.optional(v.id("teams")),
        roleId: v.optional(v.id("roles")),
        issuedDate: v.optional(v.number()),
        title: v.optional(v.string()),
        text: v.optional(v.string()),
        visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
        expirationDate: v.optional(v.number()),
      })),
      after: v.optional(v.object({
        orgaId: v.optional(v.id("orgas")),
        teamId: v.optional(v.id("teams")),
        roleId: v.optional(v.id("roles")),
        issuedDate: v.optional(v.number()),
        title: v.optional(v.string()),
        text: v.optional(v.string()),
        visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
        expirationDate: v.optional(v.number()),
      })),
    })
  ),
})