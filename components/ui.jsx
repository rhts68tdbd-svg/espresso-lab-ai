"use client";
import { useEffect, useId, useRef, useState } from "react";
import { fmt, ratio, ageDays } from "../lib/domain.mjs";
export function Icon({ name, size = 22 }) {
  const paths = {
    back: <path d="m14 5-7 7 7 7M7 12h14" />,
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    check: <path d="m5 12 4 4 10-10" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    tune: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" />
        <circle cx="15" cy="17" r="3" />
      </>
    ),
    collection: (
      <>
        <rect x="4" y="4" width="6" height="16" rx="2" />
        <rect x="14" y="4" width="6" height="16" rx="2" />
        <path d="M4 9h6M14 9h6" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" />
      </>
    ),
    bean: (
      <>
        <ellipse cx="12" cy="12" rx="7" ry="10" transform="rotate(35 12 12)" />
        <path d="M16 5c-6 3-2 11-8 14" />
      </>
    ),
    star: (
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L2.3 9.4l6.1-.9Z" />
    ),
    photo: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="3" />
        <circle cx="12" cy="12" r="4" />
        <path d="M8 5 9 3h6l1 2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.bean}
    </svg>
  );
}
export function Button({
  variant = "secondary",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type="button"
      {...props}
      className={`button ${variant} ${className}`}
    >
      {children}
    </button>
  );
}
export function IconButton({ name, label, ...props }) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={name} />
    </button>
  );
}
export function Header({ title, subtitle, onBack, onSettings }) {
  return (
    <header className="page-header">
      <div className="header-top">
        {onBack ? (
          <IconButton name="back" label="Zurück" onClick={onBack} />
        ) : (
          <div className="brand">
            <Icon name="bean" size={18} />
            <span>ESPRESSO LAB</span>
          </div>
        )}
        {onSettings && (
          <IconButton
            name="settings"
            label="Einstellungen"
            onClick={onSettings}
          />
        )}
      </div>
      <h1>{title}</h1>
      {subtitle && <p className="lede">{subtitle}</p>}
    </header>
  );
}
export function Tabs({ active, navigate }) {
  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      {[
        ["dial", "tune", "Einstellen"],
        ["collection", "collection", "Kaffees"],
      ].map(([view, icon, label]) => (
        <button
          key={view}
          className={active === view ? "active" : ""}
          aria-current={active === view ? "page" : undefined}
          onClick={() => navigate({ view })}
        >
          <Icon name={icon} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
export function Field({ label, hint, error, children, ...props }) {
  const generated = useId(),
    inputId = props.id || generated;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      {children ? (
        children(inputId)
      ) : (
        <input
          {...props}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={hint || error ? inputId + "-hint" : undefined}
        />
      )}
      {(hint || error) && (
        <small
          id={inputId + "-hint"}
          className={error ? "field-error" : "field-hint"}
        >
          {error || hint}
        </small>
      )}
    </div>
  );
}
export function TextArea({ label, hint, ...props }) {
  return (
    <Field label={label} hint={hint}>
      {(inputId) => (
        <textarea
          {...props}
          id={inputId}
          aria-describedby={hint ? inputId + "-hint" : undefined}
        />
      )}
    </Field>
  );
}
export function Notice({ children, kind = "info" }) {
  return (
    <div
      className={`notice ${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <Icon name="bean" size={38} />
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Identity({ coffee, batch, large = false, onPhoto }) {
  const images = batch?.images?.length ? batch.images : coffee.images || [],
    image = images[coffee.coverImageIndex || 0] || images[0];
  const graphic = image ? (
    <img src={image} alt={`Verpackung von ${coffee.name}`} />
  ) : (
    <Icon name="bean" size={large ? 42 : 28} />
  );
  return (
    <div className={`identity ${large ? "large" : ""}`}>
      {image && onPhoto ? (
        <button
          type="button"
          className="coffee-image"
          aria-label="Verpackungsfoto vergrößern"
          onClick={() => onPhoto(image)}
        >
          {graphic}
        </button>
      ) : (
        <div className="coffee-image">{graphic}</div>
      )}
      <div>
        <div className="roaster">{coffee.roaster || "Röster noch offen"}</div>
        <h2>{coffee.name}</h2>
        {batch && (
          <p className="metadata">
            {batch.label || "Packung"}
            {batch.roastDate ? ` · Röstung ${batch.roastDate}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
export function Recipe({ recipe, title = "Dein Rezept", reference = false }) {
  const r = recipe?.settings || recipe;
  if (!r) return null;
  return (
    <section className={`recipe ${reference ? "reference" : ""}`}>
      <div className="section-heading">
        <h2>{title}</h2>
        {!reference && (
          <span className="status">
            <Icon name="check" size={16} />
            Bestätigt
          </span>
        )}
      </div>
      <dl className="recipe-values">
        {[
          ["Dosis", `${fmt(r.dose)} g`],
          ["Yield", `${fmt(r.yield)} g`],
          ["Ratio", ratio(r.dose, r.yield)],
          ["Mahlgrad", r.grind || "—"],
          ["Zeit", r.time == null ? "—" : `${fmt(r.time)} s`],
          ["Sieb", r.basket || "—"],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {r.time != null && (
        <p className="metadata">
          Zeit {r.timeBasis === "pump" ? "ab Pumpenstart" : "ab erstem Tropfen"}
        </p>
      )}
      {recipe.equipment?.grinder && (
        <p className="metadata">Mühle: {recipe.equipment.grinder}</p>
      )}
      {recipe.equipment === null && (
        <p className="metadata">Historisches Equipment nicht dokumentiert</p>
      )}
      {recipe.note && <p className="recipe-note">{recipe.note}</p>}
      {recipe.target && <p className="metadata">Ziel: {recipe.target}</p>}
    </section>
  );
}
export function PackAge({ batch }) {
  const roast = ageDays(batch.roastDate),
    open = ageDays(batch.openedDate);
  return (
    <div className="inline-meta">
      {roast != null && <span>{roast} Tage seit Röstung</span>}
      {open != null && <span>{open} Tage geöffnet</span>}
    </div>
  );
}
export function Dialog({ title, children, onClose }) {
  const ref = useRef(null),
    heading = useId();
  useEffect(() => {
    const previous = document.activeElement,
      dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={heading}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-content">
        <div className="section-heading">
          <h2 id={heading}>{title}</h2>
          <IconButton name="close" label="Schließen" onClick={onClose} />
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function Analysis({ shot, onRetry, busy = false, current = true }) {
  const ai = shot.ai;
  if (busy)
    return (
      <Notice>
        Shot lokal gespeichert. KI wertet Geschmack und Ziel aus …
      </Notice>
    );
  if (!ai)
    return (
      <div className="analysis-missing">
        <Notice kind={shot.analysisStatus === "failed" ? "error" : "info"}>
          {shot.analysisError || "Shot gespeichert. Noch keine KI-Auswertung."}
        </Notice>
        {onRetry && <Button onClick={onRetry}>KI-Auswertung starten</Button>}
      </div>
    );
  if (!current)
    return (
      <div className="analysis-missing">
        <Notice>
          Diese Auswertung gehört zu früheren Angaben. Bitte den aktuellen Stand
          erneut auswerten.
        </Notice>
        {onRetry && <Button onClick={onRetry}>KI-Auswertung starten</Button>}
        <details>
          <summary>Frühere Auswertung ansehen</summary>
          <p>{ai.diagnosis}</p>
          <p>{ai.next_change}</p>
          <p>{ai.keep_constant}</p>
          <p>{ai.tasting_focus}</p>
        </details>
      </div>
    );
  return (
    <section className="analysis">
      <span className="eyebrow">NÄCHSTER SCHRITT</span>
      <h2>{ai.next_change}</h2>
      <p>{ai.diagnosis}</p>
      <dl className="advice-lines">
        <div>
          <dt>Unverändert</dt>
          <dd>{ai.keep_constant}</dd>
        </div>
        <div>
          <dt>Beim nächsten Tasting</dt>
          <dd>{ai.tasting_focus}</dd>
        </div>
      </dl>
      <details>
        <summary>Begründung und Unsicherheit</summary>
        <p>{ai.rationale}</p>
        {ai.trend_summary && <p>{ai.trend_summary}</p>}
        <p className="metadata">
          Einschätzung der KI: {ai.confidence}.{" "}
          {ai.channeling_suspected
            ? "Mögliche ungleichmäßige Extraktion; Diagnose ist keine Messung."
            : ""}
        </p>
      </details>
      {ai.recommend_confirmation_shot && (
        <p className="metadata">
          Optional: gleiche Einstellung noch einmal bestätigen.
        </p>
      )}
    </section>
  );
}
export function PhotoPicker({
  images = [],
  onChange,
  onError,
  cover = 0,
  onCover,
}) {
  const input = useRef(null),
    camera = useRef(null),
    [busy, setBusy] = useState(false);
  async function add(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    try {
      const items = [];
      for (const file of files.slice(0, 4 - images.length))
        items.push(await compressImage(file));
      onChange([...images, ...items]);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="photo-picker">
      <div className="photo-actions">
        <Button
          disabled={busy || images.length >= 4}
          onClick={() => camera.current.click()}
        >
          <Icon name="photo" />
          Foto aufnehmen
        </Button>
        <Button
          disabled={busy || images.length >= 4}
          onClick={() => input.current.click()}
        >
          Foto auswählen
        </Button>
      </div>
      <input
        className="visually-hidden"
        ref={camera}
        aria-label="Verpackung fotografieren"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={add}
      />
      <input
        className="visually-hidden"
        ref={input}
        aria-label="Verpackungsfoto auswählen"
        type="file"
        accept="image/*"
        multiple
        onChange={add}
      />
      {busy && <p role="status">Foto wird vorbereitet …</p>}
      {!!images.length && (
        <div className="photo-grid">
          {images.map((src, i) => (
            <div key={i}>
              <button
                type="button"
                className="photo-preview"
                aria-label={`Foto ${i + 1}${cover === i ? ", Titelbild" : ", als Titelbild verwenden"}`}
                onClick={() => onCover?.(i)}
              >
                <img src={src} alt={`Packungsfoto ${i + 1}`} />
                {cover === i && <span>Titelbild</span>}
              </button>
              <Button
                className="text-button"
                onClick={() => {
                  onChange(images.filter((_, n) => n !== i));
                  onCover?.(0);
                }}
              >
                Entfernen
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
async function compressImage(file) {
  if (file.size > 25_000_000)
    throw new Error(
      "Das Foto ist zu groß. Bitte ein kleineres Bild auswählen.",
    );
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(
          new Error(
            "Dieses Bildformat ließ sich nicht öffnen. Bitte JPEG/PNG wählen oder ein neues Foto aufnehmen.",
          ),
        );
      image.src = url;
    });
    const scale = Math.min(
        1,
        1024 / Math.max(img.naturalWidth, img.naturalHeight),
      ),
      canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Bildverarbeitung ist nicht verfügbar.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.72);
    if (data.length > 3_000_000)
      throw new Error("Das vorbereitete Foto ist zu groß.");
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
