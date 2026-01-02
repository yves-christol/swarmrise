/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as dataModelTest from "../dataModelTest.js";
import type * as invitationsFunctions from "../invitationsFunctions.js";
import type * as membersFunctions from "../membersFunctions.js";
import type * as myFunctions from "../myFunctions.js";
import type * as orgsFunctions from "../orgsFunctions.js";
import type * as policiesFunctions from "../policiesFunctions.js";
import type * as rolesFunctions from "../rolesFunctions.js";
import type * as teamsFunctions from "../teamsFunctions.js";
import type * as usersFunctions from "../usersFunctions.js";
import type * as utils from "../utils.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  dataModelTest: typeof dataModelTest;
  invitationsFunctions: typeof invitationsFunctions;
  membersFunctions: typeof membersFunctions;
  myFunctions: typeof myFunctions;
  orgsFunctions: typeof orgsFunctions;
  policiesFunctions: typeof policiesFunctions;
  rolesFunctions: typeof rolesFunctions;
  teamsFunctions: typeof teamsFunctions;
  usersFunctions: typeof usersFunctions;
  utils: typeof utils;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
