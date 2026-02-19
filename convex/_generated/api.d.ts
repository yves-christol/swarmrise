/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as chat_access from "../chat/access.js";
import type * as chat_channelFunctions from "../chat/channelFunctions.js";
import type * as chat_dmFunctions from "../chat/dmFunctions.js";
import type * as chat_electionFunctions from "../chat/electionFunctions.js";
import type * as chat_electionHelpers from "../chat/electionHelpers.js";
import type * as chat_functions from "../chat/functions.js";
import type * as chat_index from "../chat/index.js";
import type * as chat_messageFunctions from "../chat/messageFunctions.js";
import type * as chat_reactionFunctions from "../chat/reactionFunctions.js";
import type * as chat_searchFunctions from "../chat/searchFunctions.js";
import type * as chat_topicFunctions from "../chat/topicFunctions.js";
import type * as chat_topicHelpers from "../chat/topicHelpers.js";
import type * as chat_votingFunctions from "../chat/votingFunctions.js";
import type * as chat_votingHelpers from "../chat/votingHelpers.js";
import type * as crons from "../crons.js";
import type * as dataTest_createDemoOrga from "../dataTest/createDemoOrga.js";
import type * as dataTest_demoOrgaConfig from "../dataTest/demoOrgaConfig.js";
import type * as dataTest_infomaxLogo from "../dataTest/infomaxLogo.js";
import type * as dataTest_orga from "../dataTest/orga.js";
import type * as dataTest_users from "../dataTest/users.js";
import type * as decisions_functions from "../decisions/functions.js";
import type * as decisions_index from "../decisions/index.js";
import type * as emails_sendInvitationEmail from "../emails/sendInvitationEmail.js";
import type * as http from "../http.js";
import type * as invitations_functions from "../invitations/functions.js";
import type * as invitations_index from "../invitations/index.js";
import type * as kanban_access from "../kanban/access.js";
import type * as kanban_functions from "../kanban/functions.js";
import type * as kanban_index from "../kanban/index.js";
import type * as legal_versions from "../legal/versions.js";
import type * as members_functions from "../members/functions.js";
import type * as members_index from "../members/index.js";
import type * as notificationPreferences_functions from "../notificationPreferences/functions.js";
import type * as notificationPreferences_index from "../notificationPreferences/index.js";
import type * as notifications_functions from "../notifications/functions.js";
import type * as notifications_helpers from "../notifications/helpers.js";
import type * as notifications_index from "../notifications/index.js";
import type * as orgas_functions from "../orgas/functions.js";
import type * as orgas_index from "../orgas/index.js";
import type * as orgas_migrations from "../orgas/migrations.js";
import type * as policies_functions from "../policies/functions.js";
import type * as policies_index from "../policies/index.js";
import type * as roles_functions from "../roles/functions.js";
import type * as roles_iconDefaults from "../roles/iconDefaults.js";
import type * as roles_iconKeys from "../roles/iconKeys.js";
import type * as roles_index from "../roles/index.js";
import type * as storage from "../storage.js";
import type * as teams_functions from "../teams/functions.js";
import type * as teams_index from "../teams/index.js";
import type * as topics_index from "../topics/index.js";
import type * as users_functions from "../users/functions.js";
import type * as users_index from "../users/index.js";
import type * as utils from "../utils.js";
import type * as webhooks_clerk from "../webhooks/clerk.js";
import type * as webhooks_clerkInternal from "../webhooks/clerkInternal.js";
import type * as webhooks_clerkVerify from "../webhooks/clerkVerify.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "chat/access": typeof chat_access;
  "chat/channelFunctions": typeof chat_channelFunctions;
  "chat/dmFunctions": typeof chat_dmFunctions;
  "chat/electionFunctions": typeof chat_electionFunctions;
  "chat/electionHelpers": typeof chat_electionHelpers;
  "chat/functions": typeof chat_functions;
  "chat/index": typeof chat_index;
  "chat/messageFunctions": typeof chat_messageFunctions;
  "chat/reactionFunctions": typeof chat_reactionFunctions;
  "chat/searchFunctions": typeof chat_searchFunctions;
  "chat/topicFunctions": typeof chat_topicFunctions;
  "chat/topicHelpers": typeof chat_topicHelpers;
  "chat/votingFunctions": typeof chat_votingFunctions;
  "chat/votingHelpers": typeof chat_votingHelpers;
  crons: typeof crons;
  "dataTest/createDemoOrga": typeof dataTest_createDemoOrga;
  "dataTest/demoOrgaConfig": typeof dataTest_demoOrgaConfig;
  "dataTest/infomaxLogo": typeof dataTest_infomaxLogo;
  "dataTest/orga": typeof dataTest_orga;
  "dataTest/users": typeof dataTest_users;
  "decisions/functions": typeof decisions_functions;
  "decisions/index": typeof decisions_index;
  "emails/sendInvitationEmail": typeof emails_sendInvitationEmail;
  http: typeof http;
  "invitations/functions": typeof invitations_functions;
  "invitations/index": typeof invitations_index;
  "kanban/access": typeof kanban_access;
  "kanban/functions": typeof kanban_functions;
  "kanban/index": typeof kanban_index;
  "legal/versions": typeof legal_versions;
  "members/functions": typeof members_functions;
  "members/index": typeof members_index;
  "notificationPreferences/functions": typeof notificationPreferences_functions;
  "notificationPreferences/index": typeof notificationPreferences_index;
  "notifications/functions": typeof notifications_functions;
  "notifications/helpers": typeof notifications_helpers;
  "notifications/index": typeof notifications_index;
  "orgas/functions": typeof orgas_functions;
  "orgas/index": typeof orgas_index;
  "orgas/migrations": typeof orgas_migrations;
  "policies/functions": typeof policies_functions;
  "policies/index": typeof policies_index;
  "roles/functions": typeof roles_functions;
  "roles/iconDefaults": typeof roles_iconDefaults;
  "roles/iconKeys": typeof roles_iconKeys;
  "roles/index": typeof roles_index;
  storage: typeof storage;
  "teams/functions": typeof teams_functions;
  "teams/index": typeof teams_index;
  "topics/index": typeof topics_index;
  "users/functions": typeof users_functions;
  "users/index": typeof users_index;
  utils: typeof utils;
  "webhooks/clerk": typeof webhooks_clerk;
  "webhooks/clerkInternal": typeof webhooks_clerkInternal;
  "webhooks/clerkVerify": typeof webhooks_clerkVerify;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
