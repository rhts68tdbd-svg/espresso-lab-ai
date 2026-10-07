import {normalizeState,validateState,SCHEMA_VERSION,parseBackup,makeBackup,clone} from "./domain.mjs";
export class ConflictError extends Error {constructor(){super("Der Bestand wurde in einem anderen Fenster geändert. Er wurde neu geladen; dein Entwurf bleibt erhalten. Bitte erneut speichern.");}}
/** Retains DB/store/key and database version; no destructive upgrade. */
export function createStorage(factory=globalThis.indexedDB) {
  let opening=null;
  function open() {
    if(!factory) return Promise.reject(new Error("Lokale Speicherung ist in diesem Browser nicht verfügbar."));
    if(opening) return opening;
    opening=new Promise((resolve,reject)=>{
      const r=factory.open("espresso-lab-ai",1);let blocked=false;
      r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("kv")) r.result.createObjectStore("kv");};
      r.onblocked=()=>{blocked=true;opening=null;reject(new Error("Bitte andere Espresso-Lab-Fenster schließen und erneut laden."));};
      r.onerror=()=>{opening=null;reject(r.error || new Error("Lokaler Speicher konnte nicht geöffnet werden."));};
      r.onsuccess=()=>{const db=r.result;if(blocked){db.close();return;}db.onversionchange=()=>{db.close();opening=null;};resolve(db);};
    });
    return opening;
  }
  async function transaction(mode,run) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      let result,failure;
      const tx=db.transaction("kv",mode),store=tx.objectStore("kv");
      const fail=e=>{failure=e;try{tx.abort();}catch{};};
      tx.oncomplete=()=>resolve(result);
      tx.onabort=()=>reject(failure || tx.error || new Error("Speichern abgebrochen. Deine Eingaben bleiben erhalten."));
      tx.onerror=()=>{failure ||= tx.error || new Error("Lokaler Speicher ist voll oder nicht erreichbar.");};
      try{run(store,v=>{result=v;},fail);}catch(e){fail(e);}
    });
  }
  const readKey=key=>transaction("readonly",(store,done)=>{const r=store.get(key);r.onsuccess=()=>done(r.result);});
  const load=async()=>normalizeState(await readKey("state"));
  async function commit(expectedRevision,reduce) {
    return transaction("readwrite",(store,done,fail)=>{
      const r=store.get("state");
      r.onsuccess=()=>{try{
        const raw=r.result,current=normalizeState(raw);
        if(current.revision !== expectedRevision) throw new ConflictError();
        const next=reduce(clone(current));
        if(next && typeof next.then === "function") throw new Error("Speicheränderungen müssen synchron sein.");
        next.schemaVersion=SCHEMA_VERSION;next.revision=current.revision+1;validateState(next);
        if(raw !== undefined && raw.schemaVersion !== SCHEMA_VERSION) store.put({savedAt:Date.now(),reason:"Vor Datenmigration",state:raw},"pre-migration");
        store.put(next,"state");done(next);
      }catch(e){fail(e);}};
    });
  }
  async function allDrafts() {
    return transaction("readonly",(store,done)=>{const drafts={};const r=store.openCursor();r.onsuccess=()=>{const c=r.result;if(c){if(String(c.key).startsWith("draft:")) drafts[c.key]=c.value;c.continue();}else done(drafts);};});
  }
  async function exportBackup() {
    // One readonly transaction gives a consistent state + draft snapshot.
    return transaction("readonly",(store,done,fail)=>{const values={};const r=store.openCursor();r.onsuccess=()=>{try{const c=r.result;if(c){values[c.key]=c.value;c.continue();}else done(makeBackup(normalizeState(values.state),Object.fromEntries(Object.entries(values).filter(([k])=>k.startsWith("draft:")))));}catch(e){fail(e);}};});
  }
  async function replaceBackup(raw,expectedRevision,{recovery=false}={}) {
    const parsed=parseBackup(raw);
    return transaction("readwrite",(store,done,fail)=>{
      const r=store.get("state");r.onsuccess=()=>{try{
        const previous=r.result;
        let current;
        try{current=normalizeState(previous);}catch(e){if(!recovery)throw e;current={revision:expectedRevision};}
        if(current.revision !== expectedRevision) throw new ConflictError();
        if(previous !== undefined) store.put({savedAt:Date.now(),reason:recovery ? "Vor Wiederherstellung" : "Vor Backup-Import",state:previous},"recovery");
        const next={...parsed.state,revision:current.revision+1};validateState(next);
        // Drafts are restored together; old drafts remain unless they share an imported key.
        for(const [key,value] of Object.entries(parsed.drafts)) store.put(value,key);
        store.put(next,"state");done(next);
      }catch(e){fail(e);}};
    });
  }
  const saveDraft=(key,value)=>transaction("readwrite",(store,done)=>{store.put(clone(value),`draft:${key}`);done(value);});
  const removeDraft=key=>transaction("readwrite",(store,done)=>{store.delete(`draft:${key}`);done(true);});
  const metadata=(key,value)=>transaction("readwrite",(store,done)=>{store.put(value,`meta:${key}`);done(value);});
  return {load,commit,exportBackup,replaceBackup,saveDraft,removeDraft,allDrafts,metadata,readMetadata:key=>readKey(`meta:${key}`),readDraft:key=>readKey(`draft:${key}`),readRecovery:()=>readKey("recovery"),readMigrationBackup:()=>readKey("pre-migration"),readRaw:()=>readKey("state"),close:async()=>{if(opening)(await opening).close();opening=null;}};
}
