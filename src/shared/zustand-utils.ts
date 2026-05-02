/**
 * Zustand utilities
 *
 * Helpers for migrating React Context stores → Zustand while preserving the
 * `Dispatch<SetStateAction<T>>` setter API used by existing call sites.
 */

import type { Dispatch, SetStateAction } from "react";

/**
 * Build a setter that mimics React's `Dispatch<SetStateAction<T>>` for one
 * field of a Zustand store. Lets existing call sites use both forms:
 *   setX(value)
 *   setX(prev => next)
 *
 * Usage:
 *   const _store = create<S>((set, get) => ({
 *       foo: 0,
 *       setFoo: zSetter("foo", set, get),
 *   }));
 */
export function zSetter<S, K extends keyof S>(
    key: K,
    set: (partial: Partial<S>) => void,
    get: () => S,
): Dispatch<SetStateAction<S[K]>> {
    return ((updater: SetStateAction<S[K]>) => {
        const prev = get()[key];
        const next =
            typeof updater === "function"
                ? (updater as (prev: S[K]) => S[K])(prev)
                : updater;
        set({ [key]: next } as unknown as Partial<S>);
    }) as Dispatch<SetStateAction<S[K]>>;
}
