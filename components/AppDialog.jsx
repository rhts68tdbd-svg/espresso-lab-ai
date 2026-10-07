"use client";
import { Dialog, Button, Notice } from "./ui";
export default function AppDialog({ modal, error, busy, onClose, onConfirm }) {
  const type = modal.type,
    photo = type === "photo",
    final = type === "finalize",
    finish = type === "finishPack";
  const title = photo
    ? "Verpackungsfoto"
    : final
      ? "Als dein Rezept bestätigen?"
      : finish
        ? "Packung aufgebraucht?"
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
          <p>
            {final
              ? "Diese Einstellung und dein Geschmackseindruck werden als unabhängiges Rezept gespeichert. Damit schließt du den aktiven Dial-in ab."
              : finish
                ? "Rezepte und Versuche bleiben erhalten. Für einen Wiederkauf legst du eine neue Packung an."
                : "Alle Daten bleiben erhalten und lassen sich wieder zurückholen. Ein bestätigtes Rezept bleibt unverändert."}
          </p>
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
                  : "Archivieren"}
            </Button>
          </div>
        </>
      )}
      {error && <Notice kind="error">{error}</Notice>}
    </Dialog>
  );
}
