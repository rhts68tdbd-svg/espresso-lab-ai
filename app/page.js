"use client";
import { useEffect, useMemo, useState } from "react";

const DB="espresso-lab-ai", KEY="state";
const defaultState={coffees:[],activeId:null};

function id(){return crypto.randomUUID()}
function num(v){return parseFloat(String(v).replace(",","."))||0}
function ratio(d,y){return d>0&&y>0?(y/d).toFixed(2).replace(".",","):"—"}
function fmt(v){return Number(v).toLocaleString("de-DE",{maximumFractionDigits:1})}
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function dbGet(){const db=await openDB();return new Promise(res=>{const tx=db.transaction("kv","readonly");const r=tx.objectStore("kv").get(KEY);r.onsuccess=()=>res(r.result||defaultState);r.onerror=()=>res(defaultState)})}
async function dbSet(v){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction("kv","readwrite");tx.objectStore("kv").put(v,KEY);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function compressImage(file){
  if(!file)return null;
  const objectUrl=URL.createObjectURL(file);
  try{
    const img=await new Promise((resolve,reject)=>{
      const el=new Image();
      el.onload=()=>resolve(el);
      el.onerror=()=>reject(new Error("Das Fotoformat konnte auf diesem iPhone nicht gelesen werden."));
      el.src=objectUrl;
    });
    const max=1024;
    const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
    const c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(img.naturalWidth*scale));
    c.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=c.getContext("2d",{alpha:false});
    if(!ctx)throw new Error("Bildverarbeitung ist in diesem Browser nicht verfügbar.");
    ctx.drawImage(img,0,0,c.width,c.height);
    const dataUrl=c.toDataURL("image/jpeg",0.68);
    if(!dataUrl||!dataUrl.startsWith("data:image/jpeg;base64,"))throw new Error("Das Foto konnte nicht in JPEG umgewandelt werden.");
    if(dataUrl.length>3000000)throw new Error("Das Foto ist trotz Komprimierung noch zu groß. Bitte näher an die Packung herangehen und erneut fotografieren.");
    return dataUrl;
  }finally{URL.revokeObjectURL(objectUrl)}
}
const tasteOptions=["zu sauer / spitz","angenehme Säure","zu bitter","trocken / adstringierend","zu dünn","zu kräftig","süß","rund","guter Körper","unausgewogen","sehr gut"];

export default function Page(){
  const [state,setState]=useState(defaultState),[loaded,setLoaded]=useState(false),[tab,setTab]=useState("home"),[modal,setModal]=useState(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{dbGet().then(s=>{setState(s);setLoaded(true)})},[]);
  useEffect(()=>{if(loaded)dbSet(state)},[state,loaded]);
  const active=state.coffees.find(c=>c.id===state.activeId)||null;
  const setS=fn=>setState(s=>typeof fn==="function"?fn(s):fn);

  if(!loaded)return <div className="shell"><div className="loading"><i className="dot"/><i className="dot"/><i className="dot"/></div></div>;

  function header(title,sub){return <div className="header"><div><div className="eyebrow">ESPRESSO LAB AI</div><h1>{title}</h1><p>{sub}</p></div><button className="iconbtn" onClick={()=>setTab("settings")}>⋯</button></div>}
  function coffeeCard(c){const final=c.finalId&&c.shots.find(s=>s.id===c.finalId);return <div key={c.id} className="card coffee" onClick={()=>{setS(s=>({...s,activeId:c.id}));setTab("coffee")}}>
    <div className="thumb">{c.image?<img src={c.image} alt=""/>:<>{c.roaster}<br/>{c.name}</>}</div>
    <div><strong>{c.roaster} – {c.name}</strong><div className={"badge "+(final?"green":"orange")}>{final?"✓ Finale Einstellung gespeichert":`${c.shots.length} Shots`}</div><div className="meta">{c.tasting||"Noch kein Rösterprofil"}</div></div><div className="chev">›</div>
  </div>}

  function Home(){
    const current=state.coffees.find(c=>!c.finalId&&c.shots.length);
    return <>{header("Espresso Lab","KI-gestütztes Dial-in für deine Bohnen.")}
      <button className="primary wide" onClick={()=>setModal({type:"newCoffee"})}>＋ Neuer Kaffee</button>
      {current&&<><div className="section"><h3>Aktueller Dial-in</h3></div><div className="card"><strong>{current.roaster} – {current.name}</strong><p>Shot {current.shots.length} gespeichert. Weiter mit dem nächsten Versuch.</p><button className="primary wide" onClick={()=>{setS(s=>({...s,activeId:current.id}));setModal({type:"shot",coffee:current})}}>Weiter mit Shot {current.shots.length+1}</button></div></>}
      <div className="section"><h3>Meine Kaffees</h3><button className="secondary" onClick={()=>setTab("coffees")}>Alle</button></div>
      <div className="grid">{state.coffees.slice(0,4).map(coffeeCard)}{!state.coffees.length&&<div className="card"><h3>Noch leer</h3><p>Lege deinen ersten Kaffee per Foto oder Namen an.</p></div>}</div>
    </>
  }

  function Coffees(){return <>{header("Kaffees","Gespeicherte Profile und Referenzrezepte.")}
    <button className="primary wide" onClick={()=>setModal({type:"newCoffee"})}>＋ Neuer Kaffee</button>
    <div className="grid" style={{marginTop:14}}>{state.coffees.map(coffeeCard)}</div>
  </>}

  function Coffee(){
    if(!active){setTab("home");return null}
    const final=active.finalId&&active.shots.find(s=>s.id===active.finalId);
    return <>{header(`${active.roaster} – ${active.name}`,active.tasting||"")}
      <div className="hero">{active.image?<img src={active.image} alt="Kaffeepackung"/>:<div className="bag">{active.roaster}<br/><br/>{active.name}</div>}</div>
      <div className="card">
        <div className="profile"><strong>Rösterprofil</strong><div className="meta">{active.tasting||"Nicht hinterlegt"}</div></div>
        <div className="profile"><strong>Zielprofil</strong><div className="meta">{active.target||"Nicht hinterlegt"}</div></div>
        <div className="profile"><strong>Röstgrad</strong><div className="meta">{active.roast||"Nicht angegeben"}</div></div>
      </div>
      {final&&<><div className="section"><h3>Bewährte Einstellung</h3><span className="badge green">✓ gespeichert</span></div><ShotKpis s={final} c={active}/><button className="primary wide" style={{marginTop:10}} onClick={()=>setModal({type:"shot",coffee:active,preset:final})}>Mit dieser Einstellung starten</button></>}
      <div className="section"><h3>Shot-Verlauf</h3><button className="secondary" onClick={()=>setModal({type:"shot",coffee:active,preset:active.shots.at(-1)})}>＋ Shot</button></div>
      <div className="card">{active.shots.length?active.shots.slice().reverse().map((s,ri)=><ShotRow key={s.id} s={s} n={active.shots.length-ri} onEdit={()=>setModal({type:"editShot",coffee:active,shot:s})}/>):<p>Noch keine Shots.</p>}</div>
      <div className="actions"><button className="secondary" onClick={()=>setModal({type:"editCoffee",coffee:active})}>Bearbeiten</button><button className="danger" onClick={()=>deleteCoffee(active.id)}>Kaffee löschen</button></div>
    </>
  }

  function Settings(){return <>{header("Einstellungen","Daten, KI und Backup.")}
    <div className="card"><h3>KI-Coach</h3><p>Die App nutzt serverseitig OpenAI und die fest integrierte Espresso-Lab-Knowledge-Base. Dein API-Key liegt nur in Vercel als Environment Variable.</p><div className="notice">Ohne <strong>OPENAI_API_KEY</strong> funktionieren App und Datenspeicherung weiter, KI-Analyse und Packungsanalyse jedoch nicht.</div></div>
    <div className="card" style={{marginTop:12}}><h3>Lokale Daten</h3><p>Kaffees, Shots und komprimierte Packungsbilder werden in IndexedDB auf diesem Gerät gespeichert.</p><div className="actions"><button className="secondary" onClick={exportData}>Backup exportieren</button><label className="secondary" style={{textAlign:"center"}}>Backup importieren<input hidden type="file" accept="application/json" onChange={importData}/></label></div></div>
    <div className="card" style={{marginTop:12}}><h3>Knowledge Base</h3><p>Integriert: Rocket Giotto Evoluzione R, Backyard-basierter 1:2-Startpunkt, sensorischer Zielkorridor, Mahlgrad-/Ratio-Logik, Channeling-Prüfung, Shot-Historie und finale Referenzrezepte.</p></div>
  </>}

  function ShotKpis({s,c}){return <div className="card"><div className="kpis">
    <div className="kpi"><small>Dose</small><strong>{fmt(s.dose)} g</strong></div><div className="kpi"><small>Yield</small><strong>{fmt(s.yield)} g</strong></div><div className="kpi"><small>Ratio</small><strong>1:{ratio(s.dose,s.yield)}</strong></div>
    <div className="kpi"><small>Zeit</small><strong>{fmt(s.time)} s</strong></div><div className="kpi"><small>Mahlgrad</small><strong>{s.grind||"—"}</strong></div><div className="kpi"><small>Sieb</small><strong>{c.basket||"—"}</strong></div>
  </div>{s.note&&<p>{s.note}</p>}</div>}
  function ShotRow({s,n,onEdit}){return <div className="shot" onClick={onEdit}><span>Shot {n}</span><span>{fmt(s.dose)} g → {fmt(s.yield)} g · {fmt(s.time)} s · 1:{ratio(s.dose,s.yield)}<div className="meta">{(s.tastes||[]).join(", ")}{s.note?` · ${s.note}`:""}</div></span><span className="mood">{s.ai?.ready_to_finalize?"☺":"›"}</span></div>}

  async function analyzeShot(coffee,shot){
    setBusy(true);setError("");
    try{
      const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({coffee:{...coffee,image:undefined},history:coffee.shots,shot})});
      const data=await res.json();if(!res.ok)throw new Error(data.error||"Analyse fehlgeschlagen");
      return data
    }catch(e){setError(e.message);return null}finally{setBusy(false)}
  }
  async function extractCoffee(image,description){
    setBusy(true);setError("");
    try{const res=await fetch("/api/extract-coffee",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image,description})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Analyse fehlgeschlagen");return data}
    catch(e){setError(e.message);return null}finally{setBusy(false)}
  }
  function deleteCoffee(cid){if(!confirm("Kaffee und alle Shots wirklich löschen?"))return;setS(s=>({...s,coffees:s.coffees.filter(c=>c.id!==cid),activeId:null}));setTab("home")}
  function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="espresso-lab-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  async function importData(e){try{const t=await e.target.files[0].text();const d=JSON.parse(t);if(!Array.isArray(d.coffees))throw new Error();setState(d);alert("Backup importiert.")}catch{alert("Ungültiges Backup.")}}

  function Modal(){
    if(!modal)return null;
    if(modal.type==="newCoffee")return <NewCoffee/>;
    if(modal.type==="shot")return <NewShot coffee={modal.coffee} preset={modal.preset}/>;
    if(modal.type==="result")return <Result coffee={modal.coffee} shot={modal.shot}/>;
    if(modal.type==="editCoffee")return <EditCoffee coffee={modal.coffee}/>;
    if(modal.type==="editShot")return <EditShot coffee={modal.coffee} shot={modal.shot}/>;
  }
  function Close(){return <button className="secondary" onClick={()=>{setModal(null);setError("")}}>Abbrechen</button>}

  function NewCoffee(){
    const [image,setImage]=useState(null),[desc,setDesc]=useState(""),[draft,setDraft]=useState({roaster:"",name:"",origin:"",roast:"",tasting:"",target:"",basket:"15 g"}),[step,setStep]=useState(1);
    async function photo(e){
      setError("");
      try{
        const file=e.target.files?.[0];
        if(!file)return;
        const x=await compressImage(file);
        setImage(x);
      }catch(err){
        console.error(err);
        setImage(null);
        setError(err?.message||"Foto konnte nicht verarbeitet werden.");
      }
    }
    async function aiRead(){const d=await extractCoffee(image,desc);if(!d)return;setDraft(v=>({...v,roaster:d.roaster,name:d.coffee_name,origin:d.origin,roast:d.roast_level,tasting:d.tasting_notes.join(", "),target:d.target_profile}));setStep(2)}
    function saveCoffee(){const c={id:id(),...draft,image,shots:[],finalId:null,created:Date.now()};setS(s=>({...s,coffees:[c,...s.coffees],activeId:c.id}));setModal({type:"shot",coffee:c})}
    return <div className="sheet"><div className="panel"><div className="grab"/><h2>Neuer Kaffee</h2>
      {step===1?<><p>Packung fotografieren oder Kaffee beschreiben. Die KI liest nur sicher erkennbare Angaben aus.</p>
        <div className="fields"><div className="field"><label>Packungsfoto</label><input type="file" accept="image/*" capture="environment" onChange={photo}/></div>{image&&<div className="hero"><img src={image} alt=""/></div>}<div className="field"><label>Name / Beschreibung optional</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="z. B. Backyard Coffee, dunkle Röstung"/></div></div>
        {error&&<div className="notice error">{error}</div>}<div className="actions"><Close/><button className="primary" disabled={busy||(!image&&!desc)} onClick={aiRead}>{busy?"Analysiere…":"Mit KI analysieren"}</button></div>
        <button className="secondary wide" style={{marginTop:10}} onClick={()=>setStep(2)}>Ohne KI manuell eingeben</button>
      </>:<><p>Bitte prüfen und korrigieren. Das Rösterprofil ist der Zielkorridor für das spätere Dial-in.</p>
        <div className="fields">
          {["roaster","name","origin","roast","tasting","target","basket"].map(k=><div className="field" key={k}><label>{{roaster:"Röster",name:"Kaffee",origin:"Herkunft",roast:"Röstgrad",tasting:"Tasting Notes laut Röster",target:"Sensorisches Zielprofil",basket:"Sieb"}[k]}</label>{["tasting","target"].includes(k)?<textarea value={draft[k]} onChange={e=>setDraft({...draft,[k]:e.target.value})}/>:<input value={draft[k]} onChange={e=>setDraft({...draft,[k]:e.target.value})}/>}</div>)}
        </div>
        {!draft.tasting&&<div className="notice">Das Geschmacksprofil fehlt. Bitte Tasting Notes von der Verpackung ergänzen, bevor du startest.</div>}
        <div className="actions"><Close/><button className="primary" onClick={saveCoffee} disabled={!draft.name||!draft.roaster||!draft.tasting}>Kaffee anlegen</button></div>
      </>}
    </div></div>
  }

  function NewShot({coffee,preset}){
    const [dose,setDose]=useState(preset?.dose??17.5),[yieldV,setYield]=useState(preset?.yield??35),[time,setTime]=useState(preset?.time??30),[grind,setGrind]=useState(preset?.grind??""),[pressure,setPressure]=useState(""),[tastes,setTastes]=useState([]),[note,setNote]=useState("");
    const toggle=t=>setTastes(v=>v.includes(t)?v.filter(x=>x!==t):[...v,t]);
    async function go(){
      const shot={id:id(),dose:num(dose),yield:num(yieldV),time:num(time),grind,pressure,tastes,note,created:Date.now()};
      const latest=state.coffees.find(c=>c.id===coffee.id)||coffee;
      const ai=await analyzeShot(latest,shot);
      const withAi={...shot,ai};
      setS(s=>({...s,coffees:s.coffees.map(c=>c.id===coffee.id?{...c,shots:[...c.shots,withAi]}:c),activeId:coffee.id}));
      setModal({type:"result",coffee:{...latest,shots:[...latest.shots,withAi]},shot:withAi});
    }
    return <div className="sheet"><div className="panel"><div className="grab"/><h2>Shot {coffee.shots.length+1}</h2><p>{coffee.roaster} – {coffee.name}</p>
      {preset&&<div className="notice">Werte vom letzten bzw. finalen Shot wurden vorausgefüllt. Ändere nur, was du tatsächlich verändert hast.</div>}
      <div className="fields">
        <div className="field"><label>Dose (g)</label><input inputMode="decimal" value={dose} onChange={e=>setDose(e.target.value)}/></div>
        <div className="field"><label>Yield (g)</label><input inputMode="decimal" value={yieldV} onChange={e=>setYield(e.target.value)}/></div>
        <div className="field"><label>Zeit ab 1. Tropfen (s)</label><input inputMode="decimal" value={time} onChange={e=>setTime(e.target.value)}/></div>
        <div className="field"><label>Mahlgrad</label><input value={grind} onChange={e=>setGrind(e.target.value)} placeholder="z. B. 0,8"/></div>
        <div className="field"><label>Brühdruck optional</label><input value={pressure} onChange={e=>setPressure(e.target.value)} placeholder="z. B. 9 bar"/></div>
      </div>
      <div className="card ratio" style={{marginTop:12}}><div><small>Brew Ratio</small><strong>1:{ratio(num(dose),num(yieldV))}</strong></div><span>berechnet</span></div>
      <div className="section"><h3>Wie schmeckt er?</h3></div><div className="pills">{tasteOptions.map(t=><button key={t} className={"pill "+(tastes.includes(t)?"on":"")} onClick={()=>toggle(t)}>{t}</button>)}</div>
      <div className="field" style={{marginTop:12}}><label>Eigene Beschreibung</label><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="z. B. Säure deutlich runder, Schokolade kommt, hinten noch leicht trocken"/></div>
      {error&&<div className="notice error">{error}</div>}<div className="actions"><Close/><button className="primary" disabled={busy||(!tastes.length&&!note)} onClick={go}>{busy?"KI analysiert…":"Shot analysieren"}</button></div>
    </div></div>
  }

  function Result({coffee,shot}){
    const ai=shot.ai;
    return <div className="sheet"><div className="panel"><div className="grab"/><h2>KI-Auswertung</h2>
      <ShotKpis s={shot} c={coffee}/>
      {ai?<><div className="section"><h3>Nächster Shot</h3></div><div className="card reco"><h3>{ai.next_change}</h3><p>{ai.diagnosis}</p><div className="keep"><strong>Unverändert:</strong> {ai.keep_constant}</div><div className="keep"><strong>Beim Tasting beachten:</strong> {ai.tasting_focus}</div><div className="keep"><strong>Warum:</strong> {ai.rationale}</div><div className="confidence">Konfidenz: {ai.confidence}{ai.channeling_suspected?" · Channeling als Möglichkeit berücksichtigen":""}</div></div>
      {coffee.shots.length>1&&<div className="card" style={{marginTop:12}}><h3>Vergleich</h3><div className="compare"><div className="mini">vorher<br/><strong>{fmt(coffee.shots.at(-2).time)} s</strong></div><div className="arrow">→</div><div className="mini">jetzt<br/><strong>{fmt(shot.time)} s</strong></div></div></div>}</>:<div className="notice error">Keine KI-Auswertung verfügbar. Der Shot wurde trotzdem lokal gespeichert.</div>}
      <div className="actions"><button className="secondary" onClick={()=>{setModal(null);setTab("coffee")}}>Zum Kaffee</button><button className="primary" onClick={()=>setModal({type:"shot",coffee,preset:shot})}>Nächster Shot</button></div>
      <button className="secondary wide" style={{marginTop:10}} onClick={()=>{setS(s=>({...s,coffees:s.coffees.map(c=>c.id===coffee.id?{...c,finalId:shot.id}:c)}));setModal(null);setTab("coffee")}}>Als finale Einstellung speichern</button>
    </div></div>
  }

  function EditCoffee({coffee}){
    const [d,setD]=useState({...coffee});
    function save(){setS(s=>({...s,coffees:s.coffees.map(c=>c.id===coffee.id?d:c)}));setModal(null)}
    return <div className="sheet"><div className="panel"><div className="grab"/><h2>Kaffee bearbeiten</h2><div className="fields">{["roaster","name","roast","tasting","target","basket"].map(k=><div className="field" key={k}><label>{{roaster:"Röster",name:"Kaffee",roast:"Röstgrad",tasting:"Tasting Notes",target:"Zielprofil",basket:"Sieb"}[k]}</label>{["tasting","target"].includes(k)?<textarea value={d[k]||""} onChange={e=>setD({...d,[k]:e.target.value})}/>:<input value={d[k]||""} onChange={e=>setD({...d,[k]:e.target.value})}/>}</div>)}</div><div className="actions"><Close/><button className="primary" onClick={save}>Speichern</button></div></div></div>
  }

  function EditShot({coffee,shot}){
    const [d,setD]=useState({...shot});
    function save(){setS(s=>({...s,coffees:s.coffees.map(c=>c.id===coffee.id?{...c,shots:c.shots.map(x=>x.id===shot.id?d:x)}:c)}));setModal(null)}
    function del(){if(!confirm("Shot löschen?"))return;setS(s=>({...s,coffees:s.coffees.map(c=>c.id===coffee.id?{...c,shots:c.shots.filter(x=>x.id!==shot.id),finalId:c.finalId===shot.id?null:c.finalId}:c)}));setModal(null)}
    return <div className="sheet"><div className="panel"><div className="grab"/><h2>Shot bearbeiten</h2><div className="fields">{["dose","yield","time","grind","note"].map(k=><div className="field" key={k}><label>{k}</label><input value={d[k]??""} onChange={e=>setD({...d,[k]:["dose","yield","time"].includes(k)?num(e.target.value):e.target.value})}/></div>)}</div><div className="actions"><button className="danger" onClick={del}>Löschen</button><button className="primary" onClick={save}>Speichern</button></div></div></div>
  }

  let content=tab==="home"?<Home/>:tab==="coffees"?<Coffees/>:tab==="coffee"?<Coffee/>:<Settings/>;
  return <div className="shell">{content}<nav className="tabs"><button className={"tab "+(tab==="home"?"active":"")} onClick={()=>setTab("home")}><span>⌂</span><small>Home</small></button><button className={"tab "+(["coffees","coffee"].includes(tab)?"active":"")} onClick={()=>setTab("coffees")}><span>◉</span><small>Kaffees</small></button><button className={"tab "+(tab==="settings"?"active":"")} onClick={()=>setTab("settings")}><span>⚙</span><small>Einstellungen</small></button></nav><Modal/></div>
}
