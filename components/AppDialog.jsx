"use client";
import { Dialog, Button, Notice } from "./ui";
export default function AppDialog({ modal, error, busy, onClose, onConfirm }) {
  const type = modal.type,
    photo = type === "photo",
    final = type === "finalize",
    finish = type === "finishPack",
    permanent = type === "deleteCoffee";
  const title = photo
    ? "Verpackungsfoto"
    : final
      ? "Als dein Rezept bestätigen?"
      : finish
        ? "Packung aufgebraucht?"
        : permanent
          ? "Kaffee endgültig löschen?"
          : "Ins Archiv verschieben?";
  return (
    <Dialog
      title={title}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {photo ? (
        <img
          className="dialog-photo"
          src={modal.src}
          alt="Vergrößertes Verpackungsfoto"
        />
      ) : (
        <>
          {permanent && (
            <>
              <p>
                <strong>{modal.coffee.name}</strong>
                {modal.coffee.roaster ? ` · ${modal.coffee.roaster}` : ""}
              </p>
              <p>
                {modal.summary.batches} Packungen · {modal.summary.shots}{" "}
                Versuche · {modal.summary.recipes} Rezepte ·{" "}
                {modal.summary.photos} Fotos
              </p>
              <Notice kind="error">
                Dieser Kaffee und alle zugehörigen Packungen, Versuche, Fotos,
                Rezepte, Bewertungen und Entwürfe werden von diesem Gerät
                gelöscht, auch aus lokalen Sicherungsständen. Zurückholen aus
                dem Archiv ist danach nicht mehr möglich.
              </Notice>
              <p className="metadata">
                Bereits exportierte Backup-Dateien bleiben unverändert. Wenn du
                diese Daten behalten möchtest, brich ab und exportiere zuerst
                ein Backup.
              </p>
            </>
          )}
          {!permanent && (
            <p>
              {final
                ? "Diese Einstellung und dein Geschmackseindruck werden als unabhängiges Rezept gespeichert. Damit schließt du den aktiven Dial-in ab."
                : finish
                  ? "Rezepte und Versuche bleiben erhalten. Für einen Wiederkauf legst du eine neue Packung an."
                  : "Alle Daten bleiben erhalten und lassen sich wieder zurückholen. Ein bestätigtes Rezept bleibt unverändert."}
            </p>
          )}
          <div className="actions">
            <Button disabled={busy} onClick={onClose}>
              {final ? "Weiter einstellen" : "Abbrechen"}
            </Button>
            <Button
              variant={final || finish ? "primary" : "danger"}
              disabled={busy}
              onClick={onConfirm}
            >
              {final
                ? "Rezept bestätigen"
                : finish
                  ? "Als aufgebraucht markieren"
                  : permanent
                    ? "Kaffee endgültig löschen"
                    : "Archivieren"}
            </Button>
          </div>
        </>
      )}
      {error && <Notice kind="error">{error}</Notice>}
    </Dialog>
  );
}
