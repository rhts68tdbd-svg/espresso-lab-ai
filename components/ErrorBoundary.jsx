"use client";
import { Component } from "react";
import { Header, Notice, Button } from "./ui";
import { createStorage } from "../lib/storage.mjs";
import { downloadJson } from "./Settings";
export default class ErrorBoundary extends Component {
  state = { failed: false, message: "" };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="shell">
        <Header title="Dein Bestand bleibt erhalten" />
        <Notice kind="error">
          Die Oberfläche konnte nicht angezeigt werden. Es wurde kein leerer
          Bestand gespeichert.
        </Notice>
        {this.state.message && (
          <Notice kind="error">{this.state.message}</Notice>
        )}
        <div className="actions">
          <Button onClick={() => location.reload()}>App erneut öffnen</Button>
          <Button
            onClick={async () => {
              try {
                const storage = createStorage(),
                  raw = await storage.readRaw();
                if (raw === undefined)
                  throw new Error("Kein gespeicherter Rohbestand gefunden.");
                downloadJson(raw, "espresso-lab-unveraenderter-bestand.json");
                await storage.close();
              } catch (e) {
                this.setState({ message: e.message });
              }
            }}
          >
            Unveränderten Bestand exportieren
          </Button>
        </div>
      </div>
    );
  }
}
