"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createStorage, ConflictError } from "./storage.mjs";

export function useLab() {
  const storage = useMemo(() => createStorage(), []),
    [state, setState] = useState(null),
    [loadError, setLoadError] = useState(""),
    [saving, setSaving] = useState(false);
  const current = useRef(null),
    queue = useRef(Promise.resolve()),
    channel = useRef(null);
  const accept = useCallback((next) => {
    if (!current.current || next.revision >= current.current.revision) {
      current.current = next;
      setState(next);
    }
    setLoadError("");
    return next;
  }, []);
  const reload = useCallback(async () => {
    try {
      return accept(await storage.load());
    } catch (e) {
      setLoadError(e.message);
      throw e;
    }
  }, [accept, storage]);
  useEffect(() => {
    let live = true;
    storage
      .load()
      .then((s) => {
        if (live) accept(s);
      })
      .catch((e) => {
        if (live) setLoadError(e.message);
      });
    if (typeof BroadcastChannel !== "undefined") {
      const c = new BroadcastChannel("espresso-lab-state");
      channel.current = c;
      c.onmessage = () => reload().catch(() => {});
    }
    const refresh = () => {
      if (document.visibilityState === "visible") reload().catch(() => {});
    };
    document.addEventListener("visibilitychange", refresh);
    return () => {
      live = false;
      channel.current?.close();
      channel.current = null;
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [accept, reload, storage]);
  const commit = useCallback(
    (reduce) => {
      const task = queue.current
        .catch(() => {})
        .then(async () => {
          if (!current.current)
            throw new Error(
              "Bestand noch nicht geladen. Keine Daten wurden verändert.",
            );
          setSaving(true);
          try {
            const next = await storage.commit(current.current.revision, reduce);
            accept(next);
            channel.current?.postMessage({ revision: next.revision });
            return next;
          } catch (e) {
            if (e instanceof ConflictError) await reload();
            throw e;
          } finally {
            setSaving(false);
          }
        });
      queue.current = task;
      return task;
    },
    [accept, reload, storage],
  );
  const replace = useCallback(
    async (raw, recovery = false) => {
      setSaving(true);
      try {
        const next = await storage.replaceBackup(
          raw,
          current.current?.revision || 0,
          { recovery },
        );
        accept(next);
        channel.current?.postMessage({ revision: next.revision });
        return next;
      } catch (e) {
        if (e instanceof ConflictError) await reload();
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [storage, accept, reload],
  );
  return { state, storage, commit, replace, reload, saving, loadError };
}

/** IDB draft writes are serialized; no draft is cleared before a committed save. */
export function useDraft(storage, key, initial) {
  const [value, setValue] = useState(initial),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false);
  const ref = useRef(initial),
    writer = useRef(null),
    queue = useRef(Promise.resolve()),
    mounted = useRef(true),
    cleared = useRef(false);
  useEffect(() => {
    mounted.current = true;
    try {
      writer.current = sessionStorage.getItem("espresso-lab-tab");
      if (!writer.current) {
        writer.current = crypto.randomUUID();
        sessionStorage.setItem("espresso-lab-tab", writer.current);
      }
    } catch {
      writer.current = crypto.randomUUID();
    }
    let live = true;
    storage
      .readDraft(key, writer.current)
      .then((d) => {
        if (live) {
          if (d) {
            ref.current = d;
            setValue(d);
          }
          setReady(true);
        }
      })
      .catch((e) => {
        if (live) {
          setError(e.message);
          setReady(true);
        }
      });
    return () => {
      live = false;
      mounted.current = false;
    };
  }, [storage, key]);
  function update(next) {
    const v = typeof next === "function" ? next(ref.current) : next;
    ref.current = v;
    setValue(v);
    setDirty(true);
    cleared.current = false;
    queue.current = queue.current
      .catch(() => {})
      .then(() => storage.saveDraft(key, v, writer.current))
      .then(() => {
        if (mounted.current) setError("");
      })
      .catch((e) => {
        window.dispatchEvent(
          new CustomEvent("espresso-lab-draft-error", {
            detail: "Entwurf konnte nicht gesichert werden: " + e.message,
          }),
        );
        if (mounted.current)
          setError("Entwurf konnte nicht gesichert werden: " + e.message);
        throw e;
      });
    // Attach a rejection handler while preserving rejection for flush().
    queue.current.catch(() => {});
  }
  async function flush() {
    await queue.current;
    if (!cleared.current)
      await storage.saveDraft(key, ref.current, writer.current);
  }
  async function clear() {
    await queue.current.catch(() => {});
    await storage.removeDraft(key, writer.current);
    cleared.current = true;
    setDirty(false);
  }
  useEffect(() => {
    const leave = (e) => {
      if (dirty && error) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty, error]);
  return { value, update, ready, error, dirty, flush, clear };
}

export function useRoute() {
  const [route, setRoute] = useState({ view: "dial" });
  useEffect(() => {
    const read = () => {
      try {
        const text = location.hash.slice(1);
        setRoute(
          text ? JSON.parse(decodeURIComponent(text)) : { view: "dial" },
        );
      } catch {
        setRoute({ view: "dial" });
      }
    };
    read();
    window.addEventListener("popstate", read);
    window.addEventListener("hashchange", read);
    return () => {
      window.removeEventListener("popstate", read);
      window.removeEventListener("hashchange", read);
    };
  }, []);
  function navigate(next, { replace = false } = {}) {
    window.history[replace ? "replaceState" : "pushState"](
      {},
      "",
      `#${encodeURIComponent(JSON.stringify(next))}`,
    );
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function back(fallback = { view: "dial" }) {
    if (location.hash && history.length > 1) history.back();
    else navigate(fallback, { replace: true });
  }
  return { route, navigate, back };
}
