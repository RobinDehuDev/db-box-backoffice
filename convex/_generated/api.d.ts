/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as categoryTabs from "../categoryTabs.js";
import type * as cues from "../cues.js";
import type * as health from "../health.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_categories from "../lib/categories.js";
import type * as lib_categoryTabs from "../lib/categoryTabs.js";
import type * as lib_playlists from "../lib/playlists.js";
import type * as lib_storage from "../lib/storage.js";
import type * as lib_syncAuth from "../lib/syncAuth.js";
import type * as lib_tapes from "../lib/tapes.js";
import type * as playlists from "../playlists.js";
import type * as stats from "../stats.js";
import type * as subcategories from "../subcategories.js";
import type * as sync from "../sync.js";
import type * as tapes from "../tapes.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  categoryTabs: typeof categoryTabs;
  cues: typeof cues;
  health: typeof health;
  "lib/auth": typeof lib_auth;
  "lib/categories": typeof lib_categories;
  "lib/categoryTabs": typeof lib_categoryTabs;
  "lib/playlists": typeof lib_playlists;
  "lib/storage": typeof lib_storage;
  "lib/syncAuth": typeof lib_syncAuth;
  "lib/tapes": typeof lib_tapes;
  playlists: typeof playlists;
  stats: typeof stats;
  subcategories: typeof subcategories;
  sync: typeof sync;
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
