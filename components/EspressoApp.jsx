"use client";
import { useEffect, useRef, useState } from "react";
import { useLab, useRoute } from "../lib/hooks";
import {
  createCoffeeOrBatch,
  locate,
  changeBatch,
  shotFromDraft,
  snapshotRecipe,
  latestRecipe,
  parseBackup,
} from "../lib/domain.mjs";
import {
  requestJson,
  analysisContext,
  analysisPayload,
} from "../lib/api-client.mjs";
import { Header, Tabs, Button, Notice, Dialog, Recipe } from "./ui";
import { DialView, CollectionView, CoffeeView } from "./coffee";
import CoffeeForm from "./CoffeeForm";
import { ShotEditor, ShotDetail } from "./Shot";
import Rating from "./Rating";
import Settings from "./Settings";
import Recovery from "./Recovery";
import AppDialog from "./AppDialog";
import {
  coffeeFingerprint,
  equipmentFingerprint,
  ensureUnchanged,
  ratedCoffee,
} from "../lib/edit-contract.mjs";
import { validateAnalysisResult } from "../lib/ai-contract.mjs";

export default function EspressoApp() {
  const lab = useLab(),
    { state, storage, commit } = lab,
    { route, navigate, back } = useRoute();
  const [filters, setFilters] = useState({
      query: "",
      favorites: false,
      sort: "newest",
    }),
    [error, setError] = useState(""),
    [modal, setModal] = useState(null),
    [analysisBusy, setAnalysisBusy] = useState(null),
    [update, setUpdate] = useState(null);
  const requests = useRef(new Map());
  useEffect(() => {
    const report = (e) => setError(e.detail);
    window.addEventListener("espresso-lab-draft-error", report);
    return () => window.removeEventListener("espresso-lab-draft-error", report);
  }, []);
  useEffect(() => {
    if (state)
      document.documentElement.dataset.theme =
        state.preferences.theme || "system";
  }, [state?.preferences.theme]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () =>
      document.documentElement.classList.toggle(
        "keyboard-open",
        window.innerHeight - viewport.height > 160,
      );
    viewport.addEventListener("resize", resize);
    return () => {
      viewport.removeEventListener("resize", resize);
      document.documentElement.classList.remove("keyboard-open");
    };
  }, []);
  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    )
      return;
    let live = true;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (reg.waiting && live) setUpdate(reg);
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          worker?.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller &&
              live
            )
              setUpdate(reg);
          });
        });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const settings = () => navigate({ view: "settings", from: route });
  const safely = async (action) => {
    setError("");
    try {
      return await action();
    } catch (e) {
      setError(e.message);
      return null;
    }
  };
  const detail = (cid, bid) => {
    if (!cid) {
      navigate({ view: "collection" });
      return;
    }
    const c = state.coffees.find((x) => x.id === cid);
    navigate({ view: "coffee", cid, bid: bid || c?.batches.at(-1)?.id });
  };
  async function choose(cid, bid) {
    await safely(() =>
      commit((s) => ({ ...s, activeCoffeeId: cid, activeBatchId: bid })),
    );
    navigate({ view: "dial" });
  }
  async function startShot(cid, bid) {
    const result = await safely(() =>
      commit((s) => {
        const next = changeBatch(s, cid, bid, (b) => ({ ...b, dialing: true }));
        return { ...next, activeCoffeeId: cid, activeBatchId: bid };
      }),
    );
    if (result) navigate({ view: "shot", cid, bid });
  }
  async function saveCoffee(draft, existingId) {
    if (route.view === "editCoffee") {
      await commit((s) => {
        const current = locate(s, route.cid, route.bid);
        ensureUnchanged(
          draft._baseFingerprint,
          coffeeFingerprint(current.coffee, current.batch),
        );
        const next = changeBatch(s, route.cid, route.bid, (b) => ({
          ...b,
          target: draft.target,
          roastDate: draft.roastDate,
          openedDate: draft.openedDate,
          label: draft.label,
          basket: draft.basket,
          images: draft.images,
        }));
        return {
          ...next,
          coffees: next.coffees.map((c) =>
            c.id === route.cid
              ? {
                  ...c,
                  name: draft.name.trim(),
                  roaster: draft.roaster,
                  tasting: draft.tasting,
                  target: draft.target,
                  origin: draft.origin,
                  roast: draft.roast,
                  variety: draft.variety,
                  process: draft.process,
                  roasterRecipe: draft.roasterRecipe,
                  coverImageIndex: draft.coverImageIndex,
                }
              : c,
          ),
        };
      });
      return { cid: route.cid, bid: route.bid, edit: true };
    }
    const next = await commit((s) => createCoffeeOrBatch(s, draft, existingId));
    return { cid: next.activeCoffeeId, bid: next.activeBatchId };
  }
  function coffeeSaved(result) {
    if (!result) {
      back({ view: "dial" });
      return;
    }
    if (result.edit) detail(result.cid, result.bid);
    else navigate({ view: "shot", cid: result.cid, bid: result.bid });
  }
  async function saveShot(draft, existing, analyze) {
    let sid;
    const next = await commit((s) =>
      changeBatch(s, route.cid, route.bid, (b, c) => {
        const found = existing
          ? b.shots.find((x) => x.id === existing.id)
          : null;
        if (
          existing &&
          (!found ||
            (found.revision || 0) !==
              (draft._baseRevision ?? existing.revision ?? 0))
        )
          throw new Error(
            "Dieser Versuch wurde inzwischen geändert. Dein Entwurf bleibt erhalten; bitte den gespeicherten Versuch erneut öffnen.",
          );
        if (!existing && b.shots.some((x) => x.id === draft.id))
          throw new Error(
            "Dieser Versuch ist bereits gespeichert. Bitte aus dem Verlauf öffnen.",
          );
        const shot = shotFromDraft(draft, s.equipment, b, found);
        sid = shot.id;
        return {
          ...b,
          dialing: true,
          shots: found
            ? b.shots.map((x) => (x.id === sid ? shot : x))
            : [...b.shots, shot],
        };
      }),
    );
    if (analyze) analyzeShot(route.cid, route.bid, sid, next);
    return { sid, cid: route.cid, bid: route.bid };
  }
  async function analyzeShot(cid, bid, sid, fromState = null) {
    if (requests.current.has(sid)) return;
    const source = fromState || (await storage.load()),
      { coffee, batch } = locate(source, cid, bid),
      shot = batch.shots.find((s) => s.id === sid);
    if (!shot) return;
    if (!(batch.target || coffee.target)?.trim()) {
      setError("Bitte zuerst ein Geschmacksziel ergänzen.");
      return;
    }
    if (
      !shot.note?.trim() &&
      !Object.values(shot.sensory || {}).some(Boolean)
    ) {
      setError("Bitte den Geschmack dieses Versuchs ergänzen.");
      return;
    }
    const context = analysisContext(coffee, batch, shot),
      token = crypto.randomUUID();
    requests.current.set(sid, token);
    setAnalysisBusy(sid);
    try {
      const received = await requestJson(
        "/api/analyze",
        analysisPayload(coffee, batch, shot, latestRecipe(coffee)?.recipe),
      );
      const ai = validateAnalysisResult(received, shot);
      await commit((s) =>
        changeBatch(s, cid, bid, (b, c) => {
          const target = b.shots.find((x) => x.id === sid);
          if (
            !target ||
            target.archivedAt ||
            analysisContext(c, b, target) !== context
          )
            throw new Error(
              "Die Eingaben wurden während der Auswertung geändert. Bitte den aktuellen Versuch erneut auswerten.",
            );
          return {
            ...b,
            shots: b.shots.map((x) =>
              x.id === sid
                ? {
                    ...x,
                    ai,
                    analysisStatus: "complete",
                    analysisSignature: context,
                    analysisError: null,
                    analyzedAt: Date.now(),
                  }
                : x,
            ),
          };
        }),
      );
    } catch (e) {
      try {
        await commit((s) =>
          changeBatch(s, cid, bid, (b, c) => {
            const target = b.shots.find((x) => x.id === sid);
            if (!target || analysisContext(c, b, target) !== context) return b;
            return {
              ...b,
              shots: b.shots.map((x) =>
                x.id === sid
                  ? { ...x, analysisStatus: "failed", analysisError: e.message }
                  : x,
              ),
            };
          }),
        );
      } catch (storageError) {
        setError(storageError.message);
      }
    } finally {
      if (requests.current.get(sid) === token) requests.current.delete(sid);
      setAnalysisBusy((v) => (v === sid ? null : v));
    }
  }
  const retry = (cid, bid, sid) => safely(() => analyzeShot(cid, bid, sid));
  async function finalize(cid, bid, sid) {
    await commit((s) =>
      changeBatch(s, cid, bid, (b, c) => {
        const shot = b.shots.find((x) => x.id === sid);
        if (!shot || shot.archivedAt)
          throw new Error("Dieser Versuch ist nicht mehr verfügbar.");
        return {
          ...b,
          finalId: sid,
          finalRecipe: snapshotRecipe(c, b, shot),
          dialing: false,
        };
      }),
    );
    setModal(null);
    detail(cid, bid);
  }
  const newCoffee = () => navigate({ view: "newCoffee" });
  const editCoffee = (cid, bid) => navigate({ view: "editCoffee", cid, bid });
  const favorite = (cid) =>
    safely(() =>
      commit((s) => ({
        ...s,
        coffees: s.coffees.map((c) =>
          c.id === cid ? { ...c, favorite: !c.favorite } : c,
        ),
      })),
    );
  const archiveCoffee = (cid) => setModal({ type: "archiveCoffee", cid });
  const archiveShot = (cid, bid, sid) =>
    setModal({ type: "archiveShot", cid, bid, sid });
  async function confirmArchive() {
    const m = modal;
    const result = await safely(() =>
      commit((s) =>
        m.type === "archiveCoffee"
          ? {
              ...s,
              coffees: s.coffees.map((c) =>
                c.id === m.cid ? { ...c, archivedAt: Date.now() } : c,
              ),
              ...(s.activeCoffeeId === m.cid
                ? { activeCoffeeId: null, activeBatchId: null }
                : {}),
            }
          : changeBatch(s, m.cid, m.bid, (b) => ({
              ...b,
              shots: b.shots.map((x) =>
                x.id === m.sid ? { ...x, archivedAt: Date.now() } : x,
              ),
            })),
      ),
    );
    if (result) {
      setModal(null);
      if (m.type === "archiveCoffee") navigate({ view: "collection" });
      else detail(m.cid, m.bid);
    }
  }
  if (lab.loadError)
    return (
      <Recovery
        storage={storage}
        error={lab.loadError}
        retry={() => lab.reload().catch(() => {})}
        restore={(raw) => lab.replace(raw, true)}
      />
    );
  if (!state)
    return (
      <div className="shell">
        <div className="loading" role="status">
          Deine Kaffees laden …
        </div>
      </div>
    );
  const c = state.coffees.find((x) => x.id === route.cid),
    b = c?.batches.find((x) => x.id === route.bid) || c?.batches.at(-1),
    shot = b?.shots.find((x) => x.id === route.sid);
  const coffeeBack = () => detail(c?.id, b?.id);
  let content;
  if (route.view === "dial")
    content = (
      <DialView
        state={state}
        onNew={newCoffee}
        onOpen={detail}
        onShot={startShot}
        onChoose={choose}
        onEdit={editCoffee}
        onRetry={retry}
        analysisBusy={analysisBusy}
        onSettings={settings}
      />
    );
  else if (route.view === "collection")
    content = (
      <CollectionView
        state={state}
        filters={filters}
        setFilters={setFilters}
        onNew={newCoffee}
        onOpen={detail}
        onFavorite={favorite}
        onSettings={settings}
      />
    );
  else if (
    route.view === "newCoffee" ||
    (["newPack", "editCoffee"].includes(route.view) && c && b)
  )
    content = (
      <CoffeeForm
        key={route.view + route.cid + route.bid}
        mode={
          route.view === "newPack"
            ? "pack"
            : route.view === "editCoffee"
              ? "edit"
              : "new"
        }
        coffee={c || null}
        batch={b || null}
        state={state}
        storage={storage}
        onBack={coffeeSaved}
        onSave={saveCoffee}
        extract={(images, description) =>
          requestJson("/api/extract-coffee", { images, description })
        }
      />
    );
  else if (route.view === "coffee" && c && b)
    content = (
      <CoffeeView
        coffee={c}
        batch={b}
        onBack={() => back({ view: "collection" })}
        onSettings={settings}
        onBatch={(bid) => navigate({ ...route, bid }, { replace: true })}
        onShot={startShot}
        onNewBatch={() => navigate({ view: "newPack", cid: c.id, bid: b.id })}
        onShotDetail={(sid) =>
          navigate({ view: "shotDetail", cid: c.id, bid: b.id, sid })
        }
        onEdit={() => editCoffee(c.id, b.id)}
        onRate={() => navigate({ view: "rating", cid: c.id, bid: b.id })}
        onArchive={() => archiveCoffee(c.id)}
        onPhoto={(src) => setModal({ type: "photo", src })}
        onRetry={retry}
        analysisBusy={analysisBusy}
        onFinishPack={() =>
          setModal({ type: "finishPack", cid: c.id, bid: b.id })
        }
      />
    );
  else if (
    ["shot", "editShot"].includes(route.view) &&
    c &&
    b &&
    (route.view === "shot" || shot)
  )
    content = (
      <ShotEditor
        key={route.view + c.id + b.id + (shot?.id || "")}
        coffee={c}
        batch={b}
        equipment={state.equipment}
        storage={storage}
        existing={route.view === "editShot" ? shot : null}
        onSave={saveShot}
        onBack={(result) =>
          result
            ? navigate({ view: "shotDetail", ...result })
            : back({ view: "coffee", cid: c.id, bid: b.id })
        }
      />
    );
  else if (route.view === "shotDetail" && c && b && shot)
    content = (
      <ShotDetail
        key={shot.id}
        coffee={c}
        batch={b}
        shot={shot}
        onBack={() => back({ view: "coffee", cid: c.id, bid: b.id })}
        onSettings={settings}
        onRetry={() => retry(c.id, b.id, shot.id)}
        onNext={() => startShot(c.id, b.id)}
        onEdit={() =>
          navigate({ view: "editShot", cid: c.id, bid: b.id, sid: shot.id })
        }
        onFinalize={() =>
          setModal({ type: "finalize", cid: c.id, bid: b.id, sid: shot.id })
        }
        onArchive={() => archiveShot(c.id, b.id, shot.id)}
        onRestore={() =>
          safely(() =>
            commit((s) =>
              changeBatch(s, c.id, b.id, (pack) => ({
                ...pack,
                shots: pack.shots.map((x) =>
                  x.id === shot.id ? { ...x, archivedAt: null } : x,
                ),
              })),
            ),
          )
        }
        busy={analysisBusy === shot.id}
      />
    );
  else if (route.view === "rating" && c)
    content = (
      <Rating
        key={c.id}
        coffee={c}
        storage={storage}
        onBack={coffeeBack}
        onSave={(d) =>
          commit((s) => ({
            ...s,
            coffees: s.coffees.map((x) =>
              x.id === c.id ? ratedCoffee(x, d) : x,
            ),
          }))
        }
      />
    );
  else if (route.view === "settings")
    content = (
      <Settings
        state={state}
        storage={storage}
        onBack={() => navigate(route.from || { view: "dial" })}
        onSaveEquipment={(changes, theme, fingerprint) =>
          commit((s) => {
            ensureUnchanged(
              fingerprint,
              equipmentFingerprint(s.equipment, s.preferences.theme),
            );
            return {
              ...s,
              equipment: { ...s.equipment, ...changes },
              preferences: { ...s.preferences, ...(theme ? { theme } : {}) },
            };
          })
        }
        onReplace={(raw) => lab.replace(raw)}
        onRestoreCoffee={(cid) =>
          safely(() =>
            commit((s) => ({
              ...s,
              coffees: s.coffees.map((x) =>
                x.id === cid ? { ...x, archivedAt: null } : x,
              ),
            })),
          )
        }
      />
    );
  else
    content = (
      <>
        <Header
          title="Dieser Eintrag ist nicht verfügbar"
          onBack={() => navigate({ view: "collection" })}
        />
        <p>Dein Bestand wurde nicht verändert.</p>
      </>
    );
  return (
    <div className="shell">
      {update && (
        <Notice>
          Ein App-Update ist bereit. Entwürfe werden vorher gesichert.
          <Button
            onClick={async () => {
              setError("");
              try {
                await storage.flushDrafts();
                const worker = update.waiting;
                if (!worker) return;
                const reload = () => location.reload();
                navigator.serviceWorker.addEventListener(
                  "controllerchange",
                  reload,
                  { once: true },
                );
                worker.postMessage({ type: "ACTIVATE" });
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            Update laden
          </Button>
        </Notice>
      )}
      {error && (
        <div className="global-notice">
          <Notice kind="error">{error}</Notice>
          <Button onClick={() => setError("")}>Hinweis schließen</Button>
        </div>
      )}
      <main>{content}</main>
      <Tabs
        active={
          ["collection", "coffee", "rating", "newPack", "editCoffee"].includes(
            route.view,
          )
            ? "collection"
            : "dial"
        }
        navigate={navigate}
      />
      {modal && (
        <AppDialog
          modal={modal}
          error={error}
          busy={lab.saving}
          onClose={() => setModal(null)}
          onConfirm={() => {
            if (modal.type === "finalize")
              return safely(() => finalize(modal.cid, modal.bid, modal.sid));
            if (modal.type === "finishPack")
              return safely(async () => {
                await commit((s) =>
                  changeBatch(s, modal.cid, modal.bid, (pack) => ({
                    ...pack,
                    closedDate: new Date().toISOString().slice(0, 10),
                    dialing: false,
                  })),
                );
                setModal(null);
              });
            return confirmArchive();
          }}
        />
      )}
    </div>
  );
}
