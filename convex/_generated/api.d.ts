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
import type * as dataModelTest from "../dataModelTest.js";
import type * as decisions_index from "../decisions/index.js";
import type * as invitations_functions from "../invitations/functions.js";
import type * as invitations_index from "../invitations/index.js";
import type * as members_functions from "../members/functions.js";
import type * as members_index from "../members/index.js";
import type * as myFunctions from "../myFunctions.js";
import type * as orgas_functions from "../orgas/functions.js";
import type * as orgas_index from "../orgas/index.js";
import type * as policies_functions from "../policies/functions.js";
import type * as policies_index from "../policies/index.js";
import type * as roles_functions from "../roles/functions.js";
import type * as roles_index from "../roles/index.js";
import type * as teams_functions from "../teams/functions.js";
import type * as teams_index from "../teams/index.js";
import type * as topics_index from "../topics/index.js";
import type * as users_functions from "../users/functions.js";
import type * as users_index from "../users/index.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  dataModelTest: typeof dataModelTest;
  "decisions/index": typeof decisions_index;
  "invitations/functions": typeof invitations_functions;
  "invitations/index": typeof invitations_index;
  "members/functions": typeof members_functions;
  "members/index": typeof members_index;
  myFunctions: typeof myFunctions;
  "orgas/functions": typeof orgas_functions;
  "orgas/index": typeof orgas_index;
  "policies/functions": typeof policies_functions;
  "policies/index": typeof policies_index;
  "roles/functions": typeof roles_functions;
  "roles/index": typeof roles_index;
  "teams/functions": typeof teams_functions;
  "teams/index": typeof teams_index;
  "topics/index": typeof topics_index;
  "users/functions": typeof users_functions;
  "users/index": typeof users_index;
  utils: typeof utils;
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
