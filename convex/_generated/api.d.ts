/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as cues from "../cues.js";
import type * as health from "../health.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_playlists from "../lib/playlists.js";
import type * as lib_tapes from "../lib/tapes.js";
import type * as playlists from "../playlists.js";
import type * as stats from "../stats.js";
import type * as subcategories from "../subcategories.js";
import type * as tapes from "../tapes.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  cues: typeof cues;
  health: typeof health;
  "lib/auth": typeof lib_auth;
  "lib/playlists": typeof lib_playlists;
  "lib/tapes": typeof lib_tapes;
  playlists: typeof playlists;
  stats: typeof stats;
  subcategories: typeof subcategories;
  tapes: typeof tapes;
  users: typeof users;
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
