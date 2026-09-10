"use client";
import { useEffect, useMemo, useState } from "react";

const DB="espresso-lab-ai", KEY="state";

const defaultState={
  coffees:[],
  activeCoffeeId:null,
  activeBatchId:null,
  equipment:{
    machine:"Rocket Espresso Milano Giotto Evoluzione R",
    grinder:"",
    grinderType:"",
    finerDirection:"",
    machineResearch:null,
    grinderResearch:null,
    baskets:["15 g"],
    defaultDose:17.5
  }
};

function uid(){return crypto.randomUUID()}
function num(v){return parseFloat(String(v).replace(",","."))||0}
function ratio(d,y){return d>0&&y>0?(y/d).toFixed(2).replace(".",","):"—"}
function fmt(v){return Number(v).toLocaleString("de-DE",{maximumFractionDigits:1})}
function norm(s=""){return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim()}
function tokenScore(a,b){
  const A=new Set(norm(a).split(/\s+/).filter(Boolean)), B=new Set(norm(b).split(/\s+/).filter(Boolean));
  if(!A.size||!B.size)return 0;
  let hit=0;for(const x of A)if(B.has(x))hit++;
  return hit/Math.max(A.size,B.size);
}
function findExistingCoffee(coffees,roaster,name){
  let best=null,bestScore=0;
  for(const c of coffees){
    const sr=norm(c.roaster)===norm(roaster)?1:tokenScore(c.roaster,roaster);
    const sn=norm(c.name)===norm(name)?1:tokenScore(c.name,name);
    const score=.4*sr+.6*sn;
    if(score>bestScore){bestScore=score;best=c}
  }
  return bestScore>=.8?best:null;
}

function migrateState(raw){
  if(!raw||!Array.isArray(raw.coffees)) return defaultState;
  const equipment={...defaultState.equipment,...(raw.equipment||{})};
  const coffees=raw.coffees.map(c=>{
    if(Array.isArray(c.batches)) return c;
    const batchId=uid();
    return {
      id:c.id||uid(),
      roaster:c.roaster||"",
      name:c.name||"",
      origin:c.origin||"",
      roast:c.roast||"",
      tasting:c.tasting||"",
      target:c.target||"",
      images:c.image?[c.image]:[],
      coverImageIndex:0,
      created:c.created||Date.now(),
      batches:[{
        id:batchId,
        roastDate:"",
        label:"Importierte Charge",
        basket:c.basket||"",
        shots:Array.isArray(c.shots)?c.shots:[],
        finalId:c.finalId||null,
        created:c.created||Date.now()
      }]
    };
  });
  return {
    coffees,
    activeCoffeeId:raw.activeCoffeeId||raw.activeId||coffees[0]?.id||null,
    activeBatchId:raw.activeBatchId||coffees[0]?.batches?.[0]?.id||null,
    equipment
  };
}

function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("kv"))r.result.createObjectStore("kv")};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function dbGet(){const db=await openDB();return new Promise(res=>{const tx=db.transaction("kv","readonly");const r=tx.objectStore("kv").get(KEY);r.onsuccess=()=>res(migrateState(r.result));r.onerror=()=>res(defaultState)})}
async function dbSet(v){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction("kv","readwrite");tx.objectStore("kv").put(v,KEY);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}

async function compressImage(file){
  if(!file)return null;
  const objectUrl=URL.createObjectURL(file);
  try{
    const img=await new Promise((resolve,reject)=>{const el=new Image();el.onload=()=>resolve(el);el.onerror=()=>reject(new Error("Das Fotoformat konnte nicht gelesen werden."));el.src=objectUrl});
    const max=1024, scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
    const c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=c.getContext("2d",{alpha:false});if(!ctx)throw new Error("Bildverarbeitung nicht verfügbar.");
    ctx.drawImage(img,0,0,c.width,c.height);
    const data=c.toDataURL("image/jpeg",.68);
    if(data.length>3_000_000)throw new Error("Foto ist trotz Komprimierung zu groß.");
    return data;
  }finally{URL.revokeObjectURL(objectUrl)}
}

const tasteGroups=[
  {key:"acidity",label:"Säure",options:["zu spitz","angenehm","zu wenig"]},
  {key:"bitterness",label:"Bitterkeit / Trockenheit",options:["zu bitter","trocken","angenehm"]},
  {key:"body",label:"Körper",options:["zu dünn","gut","zu schwer"]},
  {key:"sweetness",label:"Süße",options:["wenig","gut","sehr süß"]},
  {key:"overall",label:"Gesamteindruck",options:["unausgewogen","okay","gut","sehr gut"]}
];

function Header({title,sub,onSettings}){return <div className="header"><div><div className="eyebrow">ESPRESSO LAB AI</div><h1>{title}</h1><p>{sub}</p></div><button className="iconbtn" onClick={onSettings}>⋯</button></div>}
function Tabs({tab,setTab}){return <nav className="tabs">
  <button className={"tab "+(tab==="home"?"active":"")} onClick={()=>setTab("home")}><span>⌂</span><small>Home</small></button>
  <button className={"tab "+(["coffees","coffee"].includes(tab)?"active":"")} onClick={()=>setTab("coffees")}><span>◉</span><small>Kaffees</small></button>
  <button className={"tab "+(tab==="settings"?"active":"")} onClick={()=>setTab("settings")}><span>⚙</span><small>Einstellungen</small></button>
</nav>}
function CloseButton({close}){return <button className="secondary" onClick={close}>Abbrechen</button>}

function CoffeeCard({coffee,onOpen}){
  const latestBatch=coffee.batches?.at(-1);
  const final=latestBatch?.finalId&&latestBatch.shots.find(s=>s.id===latestBatch.finalId);
  const image=coffee.images?.[coffee.coverImageIndex ?? 0] || coffee.images?.[0];
  return <div className="card coffee" onClick={()=>onOpen(coffee)}>
    <div className="thumb">{image?<img src={image} alt=""/>:<>{coffee.roaster}<br/>{coffee.name}</>}</div>
    <div>
      <strong>{coffee.roaster} – {coffee.name}</strong>
      <div className={"badge "+(final?"green":"orange")}>{final?"✓ Finale Einstellung gespeichert":`${latestBatch?.shots?.length||0} Shots`}</div>
      <div className="meta">{coffee.tasting||"Noch kein Rösterprofil"}</div>
    </div><div className="chev">›</div>
  </div>
}

function ShotKpis({shot,batch}){
  return <div className="card"><div className="kpis">
    <div className="kpi"><small>Dose</small><strong>{fmt(shot.dose)} g</strong></div>
    <div className="kpi"><small>Yield</small><strong>{fmt(shot.yield)} g</strong></div>
    <div className="kpi"><small>Ratio</small><strong>1:{ratio(shot.dose,shot.yield)}</strong></div>
    <div className="kpi"><small>Zeit</small><strong>{fmt(shot.time)} s</strong></div>
    <div className="kpi"><small>Mahlgrad</small><strong>{shot.grind||"—"}</strong></div>
    <div className="kpi"><small>Sieb</small><strong>{batch?.basket||"—"}</strong></div>
  </div>{shot.note&&<p>{shot.note}</p>}</div>
}

function ShotRow({shot,n,onEdit}){
  const sensory=Object.values(shot.sensory||{}).filter(Boolean).join(", ");
  return <div className="shot" onClick={onEdit}><span>Shot {n}</span><span>{fmt(shot.dose)} g → {fmt(shot.yield)} g · {fmt(shot.time)} s · 1:{ratio(shot.dose,shot.yield)}<div className="meta">{sensory}{shot.note?` · ${shot.note}`:""}</div></span><span>›</span></div>
}

function HomeView({state,search,setSearch,onNew,onOpen,setTab,onContinue,onSettings}){
  const q=norm(search);
  const results=q?state.coffees.filter(c=>{
    const hay=norm(`${c.roaster} ${c.name} ${c.origin||""} ${c.tasting||""} ${c.target||""}`);
    return hay.includes(q)||tokenScore(`${c.roaster} ${c.name}`,search)>.35
  }):state.coffees.slice(0,4);

  const current=state.coffees.find(c=>{
    const b=c.batches?.at(-1);return b&&b.shots?.length&&!b.finalId
  });

  return <><Header title="Espresso Lab" sub="KI-gestütztes Dial-in für deine Bohnen." onSettings={onSettings}/>
    <button className="primary wide" onClick={onNew}>＋ Neuer Kaffee</button>
    <div className="searchwrap"><input autoComplete="off" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Kaffees durchsuchen …"/>{search&&<button className="searchclear" onClick={()=>setSearch("")}>×</button>}</div>

    {current&&!q&&<><div className="section"><h3>Aktueller Dial-in</h3></div><div className="card">
      <strong>{current.roaster} – {current.name}</strong><p>{current.batches.at(-1).shots.length} Shot(s) gespeichert.</p>
      <button className="primary wide" onClick={()=>onContinue(current)}>Weiter dialen</button>
    </div></>}

    <div className="section"><h3>{q?"Suchergebnisse":"Meine Kaffees"}</h3>{!q&&<button className="secondary" onClick={()=>setTab("coffees")}>Alle</button>}</div>
    <div className="grid">{results.map(c=><CoffeeCard key={c.id} coffee={c} onOpen={onOpen}/>)}
      {q&&!results.length&&<div className="card"><h3>Kein Treffer</h3><p>Kein gespeicherter Kaffee passt zu „{search}“.</p><button className="primary wide" onClick={onNew}>Als neuen Kaffee anlegen</button></div>}
      {!q&&!state.coffees.length&&<div className="card"><h3>Noch leer</h3><p>Lege deinen ersten Kaffee per Foto oder Namen an.</p></div>}
    </div>
  </>
}

function CoffeesView({state,onNew,onOpen,onSettings}){
  return <><Header title="Kaffees" sub="Produkte, Chargen und Referenzrezepte." onSettings={onSettings}/>
    <button className="primary wide" onClick={onNew}>＋ Neuer Kaffee</button>
    <div className="grid" style={{marginTop:14}}>{state.coffees.map(c=><CoffeeCard key={c.id} coffee={c} onOpen={onOpen}/>)}</div>
  </>
}

function CoffeeView({coffee,batch,onNewShot,onNewBatch,onEditCoffee,onEditShot,onDelete,onSettings}){
  if(!coffee||!batch)return null;
  const final=batch.finalId&&batch.shots.find(s=>s.id===batch.finalId);
  const previousBatch=[...coffee.batches].reverse().find(b=>b.id!==batch.id&&b.finalId);
  const previousFinal=previousBatch?.shots.find(s=>s.id===previousBatch.finalId);

  return <><Header title={`${coffee.roaster} – ${coffee.name}`} sub={coffee.tasting||""} onSettings={onSettings}/>
    {coffee.images?.length?<><div className="hero"><img src={coffee.images[coffee.coverImageIndex ?? 0] || coffee.images[0]} alt="Titelbild der Kaffeepackung"/></div><div className="gallery">{coffee.images.slice(0,4).map((im,i)=><div key={i} className="coverpick"><img src={im} alt="Kaffeepackung"/>{i===(coffee.coverImageIndex ?? 0)&&<span className="coverbadge">Titelbild</span>}</div>)}</div></>:<div className="hero"><div className="bag">{coffee.roaster}<br/><br/>{coffee.name}</div></div>}
    <div className="card" style={{marginTop:14}}>
      <div className="profile"><strong>Rösterprofil</strong><div className="meta">{coffee.tasting||"Nicht hinterlegt"}</div></div>
      <div className="profile"><strong>Zielprofil</strong><div className="meta">{coffee.target||"Nicht hinterlegt"}</div></div>
      <div className="profile"><strong>Aktuelle Charge</strong><div className="meta">{batch.roastDate||batch.label||"ohne Röstdatum"} · {batch.basket||"Sieb nicht angegeben"}</div></div>
    </div>

    {final&&<><div className="section"><h3>Bewährte Einstellung</h3><span className="badge green">✓ gespeichert</span></div><ShotKpis shot={final} batch={batch}/>
      <button className="primary wide" style={{marginTop:10}} onClick={()=>onNewShot(final)}>Mit dieser Einstellung starten</button></>}

    {!final&&previousFinal&&<><div className="section"><h3>Referenz aus vorheriger Charge</h3></div><ShotKpis shot={previousFinal} batch={previousBatch}/></>}

    <div className="section"><h3>Shot-Verlauf</h3><button className="secondary" onClick={()=>onNewShot(batch.shots.at(-1)||previousFinal)}>＋ Shot</button></div>
    <div className="card">{batch.shots.length?batch.shots.slice().reverse().map((s,ri)=><ShotRow key={s.id} shot={s} n={batch.shots.length-ri} onEdit={()=>onEditShot(s)}/>):<p>Noch keine Shots in dieser Charge.</p>}</div>

    <div className="actions"><button className="secondary" onClick={onNewBatch}>Neue Packung/Charge</button><button className="secondary" onClick={onEditCoffee}>Kaffee bearbeiten</button></div>
    <button className="danger wide" style={{marginTop:10}} onClick={onDelete}>Kaffee löschen</button>
  </>
}

function EquipmentResearchCard({title,kind,value,onValue,research,onApply,current}){
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[result,setResult]=useState(current||null);
  async function run(){
    setBusy(true);setError("");
    try{setResult(await research(kind,value))}catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <div className="card" style={{marginTop:12}}>
    <h3>{title}</h3>
    <div className="field" style={{marginTop:10}}><label>Hersteller / Modell</label><input value={value} onChange={e=>onValue(e.target.value)} placeholder={kind==="grinder"?"z. B. Eureka Mignon Specialità":"z. B. Rocket Giotto Evoluzione R"}/></div>
    <button className="secondary wide" style={{marginTop:10}} disabled={busy||!value.trim()} onClick={run}>{busy?"KI recherchiert im Web…":"Mit KI recherchieren"}</button>
    {error&&<div className="notice error" style={{marginTop:10}}>{error}</div>}
    {result?.profile&&<div className="researchResult">
      <div className="profile"><strong>{result.profile.manufacturer} {result.profile.model}</strong><div className="meta">{result.profile.verified_summary}</div></div>
      {result.profile.burrs&&<div className="profile"><strong>Mahlwerk</strong><div className="meta">{result.profile.burrs}</div></div>}
      {result.profile.adjustment_type&&<div className="profile"><strong>Verstellung</strong><div className="meta">{result.profile.adjustment_type}</div></div>}
      {result.profile.finer_direction&&<div className="profile"><strong>Richtung feiner</strong><div className="meta">{result.profile.finer_direction}</div></div>}
      {result.profile.brew_group&&<div className="profile"><strong>Brühgruppe</strong><div className="meta">{result.profile.brew_group}</div></div>}
      {result.profile.pump&&<div className="profile"><strong>Pumpe</strong><div className="meta">{result.profile.pump}</div></div>}
      {result.profile.boiler_system&&<div className="profile"><strong>Kesselsystem</strong><div className="meta">{result.profile.boiler_system}</div></div>}
      {!!result.profile.relevant_notes?.length&&<div className="profile"><strong>Relevante Hinweise</strong><div className="meta">{result.profile.relevant_notes.join(" · ")}</div></div>}
      <div className="meta">Konfidenz: {result.profile.confidence}</div>
      {!!result.sources?.length&&<div className="sources"><strong>Quellen</strong>{result.sources.map((s,i)=><a key={i} href={s.url} target="_blank" rel="noreferrer">{s.title}</a>)}</div>}
      <button className="primary wide" style={{marginTop:10}} onClick={()=>onApply(result)}>Recherchiertes Profil übernehmen & speichern</button>
      <div className="notice success" style={{marginTop:10}}>Nach dem Übernehmen wird dieses Equipment-Profil dauerhaft lokal gespeichert und bei zukünftigen Shot-Analysen als KI-Kontext verwendet.</div>
    </div>}
  </div>
}

function SettingsView({state,onSaveEquipment,onExport,onImport,onSettings,researchEquipment}){
  const [eq,setEq]=useState(state.equipment);
  function apply(kind,result){
    const p=result.profile;
    setEq(v=>{
      const next = kind==="machine"
        ? {...v,machine:[p.manufacturer,p.model].filter(Boolean).join(" ")||v.machine,machineResearch:result}
        : {...v,grinder:[p.manufacturer,p.model].filter(Boolean).join(" ")||v.grinder,grinderType:p.adjustment_type||v.grinderType,finerDirection:p.finer_direction||v.finerDirection,grinderResearch:result};
      onSaveEquipment(next, {silent:true});
      return next;
    });
  }
  return <><Header title="Einstellungen" sub="Equipment, Daten und KI." onSettings={onSettings}/>
    <div className="card"><h3>Equipment-Grunddaten</h3><p>Du kannst Modelle selbst eintragen oder darunter einmalig per KI im Web recherchieren lassen. Gespeicherte Ergebnisse werden anschließend bei jeder Shot-Analyse mitgegeben.</p>
      {(eq.machineResearch||eq.grinderResearch)&&<div className="savedEquipment">
        {eq.machineResearch?.profile&&<div className="savedEquipmentCard"><div className="savedEquipmentText"><strong>{eq.machine}</strong><div className="meta">{eq.machineResearch.profile.brew_group||""}{eq.machineResearch.profile.pump?` · ${eq.machineResearch.profile.pump}`:""}{eq.machineResearch.profile.boiler_system?` · ${eq.machineResearch.profile.boiler_system}`:""}</div></div><span className="badge green">✓ gespeichert</span></div>}
        {eq.grinderResearch?.profile&&<div className="savedEquipmentCard"><div className="savedEquipmentText"><strong>{eq.grinder}</strong><div className="meta">{eq.grinderResearch.profile.burrs||""}{eq.grinderResearch.profile.adjustment_type?` · ${eq.grinderResearch.profile.adjustment_type}`:""}</div></div><span className="badge green">✓ gespeichert</span></div>}
      </div>}
      <div className="fields" style={{marginTop:12}}>
        <div className="field"><label>Siebe (Komma getrennt)</label><input value={eq.baskets.join(", ")} onChange={e=>setEq({...eq,baskets:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></div>
        <div className="field"><label>Standarddosis</label><input inputMode="decimal" value={eq.defaultDose} onChange={e=>setEq({...eq,defaultDose:num(e.target.value)})}/></div>
      </div>
    </div>
    <EquipmentResearchCard title="Espressomaschine" kind="machine" value={eq.machine} onValue={v=>setEq({...eq,machine:v})} research={researchEquipment} current={eq.machineResearch} onApply={r=>apply("machine",r)}/>
    <EquipmentResearchCard title="Mühle" kind="grinder" value={eq.grinder} onValue={v=>setEq({...eq,grinder:v})} research={researchEquipment} current={eq.grinderResearch} onApply={r=>apply("grinder",r)}/>
    <div className="card" style={{marginTop:12}}>
      <div className="field"><label>Mühlentyp / Verstellung</label><input value={eq.grinderType} onChange={e=>setEq({...eq,grinderType:e.target.value})}/></div>
      <div className="field" style={{marginTop:10}}><label>Richtung feiner</label><input value={eq.finerDirection} onChange={e=>setEq({...eq,finerDirection:e.target.value})}/></div>
      <button className="primary wide" style={{marginTop:12}} onClick={()=>onSaveEquipment(eq)}>Equipment speichern</button>
    </div>
    <div className="card" style={{marginTop:12}}><h3>Daten</h3><p>Lokale Speicherung in IndexedDB. Für Geräte-Sync wäre später Supabase sinnvoll.</p><div className="actions"><button className="secondary" onClick={onExport}>Backup exportieren</button><label className="secondary" style={{textAlign:"center"}}>Backup importieren<input hidden type="file" accept="application/json" onChange={onImport}/></label></div></div>
    <div className="card" style={{marginTop:12}}><h3>Knowledge Base</h3><p>Version 1.1 · die kanonische Datei wird serverseitig für jede KI-Analyse eingelesen.</p></div>
  </>
}

function NewCoffeeModal({state,close,extractCoffee,onCreate,onOpenExisting}){
  const [images,setImages]=useState([]),[desc,setDesc]=useState(""),[step,setStep]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState(""),[existing,setExisting]=useState(null);
  const [draft,setDraft]=useState({roaster:"",name:"",origin:"",roast:"",roastDate:"",tasting:"",target:"",basket:state.equipment.baskets[0]||"15 g",uncertainFields:[],uncertaintyNote:"",coverImageIndex:0});

  async function addPhotos(e){
    setError("");
    try{
      const files=[...e.target.files].slice(0,4-images.length);
      const compressed=[];
      for(const f of files) compressed.push(await compressImage(f));
      setImages(v=>[...v,...compressed].slice(0,4));
    }catch(e){setError(e.message)}
  }
  async function analyze(){
    setBusy(true);setError("");
    try{
      const d=await extractCoffee(images,desc);
      const next={
        ...draft,roaster:d.roaster||"",name:d.coffee_name||"",origin:d.origin||"",roast:d.roast_level||"",
        roastDate:d.roast_date||"",tasting:(d.tasting_notes||[]).join(", "),target:d.target_profile||"",
        uncertainFields:d.uncertain_fields||[],uncertaintyNote:d.uncertainty_note||"",
        coverImageIndex:Number.isInteger(d.cover_image_index)?d.cover_image_index:0
      };
      setDraft(next);
      setExisting(findExistingCoffee(state.coffees,d.roaster,d.coffee_name));
      setStep(2);
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  function submit(forceNew=false){
    const match=findExistingCoffee(state.coffees,draft.roaster,draft.name);
    if(match&&!forceNew){setExisting(match);return}
    onCreate(draft,images);
  }

  return <div className="sheet"><div className="panel"><div className="grab"/><h2>Neuer Kaffee</h2>
    {step===1?<><p>Fotografiere Vorderseite, Rückseite oder Röstdatum. Bis zu 4 Fotos werden gemeinsam analysiert.</p>
      <div className="field"><label>Packungsfotos</label>
        <label className="photoAction">📷 Foto aufnehmen oder auswählen
          <input className="hiddenFile" type="file" accept="image/*" capture="environment" multiple onChange={addPhotos}/>
        </label>
        <div className="meta">Öffnet auf iPhone/iPad direkt Kamera bzw. Fotoauswahl.</div>
      </div>
      {!!images.length&&<div className="gallery" style={{marginTop:10}}>{images.map((im,i)=><img src={im} key={i} alt=""/>)}</div>}
      <div className="field" style={{marginTop:12}}><label>Name / Beschreibung optional</label><textarea value={desc} onChange={e=>setDesc(e.target.value)}/></div>
      {error&&<div className="notice error">{error}</div>}
      <div className="actions"><CloseButton close={close}/><button className="primary" disabled={busy||(!images.length&&!desc)} onClick={analyze}>{busy?"Analysiere…":"Mit KI analysieren"}</button></div>
      <button className="secondary wide" style={{marginTop:10}} onClick={()=>setStep(2)}>Manuell eingeben</button>
    </>:<>
      <p>Bitte prüfen. Unsichere Angaben werden markiert.</p>
      {!!images.length&&<><div className="gallery">{images.map((im,i)=><div className="coverpick" key={i}><img src={im} alt=""/><button className={"coverselect "+(draft.coverImageIndex===i?"selected":"")} onClick={()=>setDraft({...draft,coverImageIndex:i})}>{draft.coverImageIndex===i?"✓ Titelbild":"Als Titelbild"}</button></div>)}</div></>}
      <div className="field" style={{marginTop:12}}><label>Weitere Fotos hinzufügen</label>
        <label className="photoAction">📷 Weiteres Foto aufnehmen
          <input className="hiddenFile" type="file" accept="image/*" capture="environment" multiple onChange={addPhotos}/>
        </label>
      </div>
      {!!draft.uncertainFields.length&&<div className="notice"><strong>Bitte prüfen:</strong> {draft.uncertainFields.join(", ")}{draft.uncertaintyNote?` · ${draft.uncertaintyNote}`:""}</div>}
      {existing&&<div className="notice" style={{marginTop:10}}><strong>Diesen Kaffee kenne ich bereits.</strong><br/>{existing.roaster} – {existing.name}
        <div className="actions"><button className="primary" onClick={()=>onOpenExisting(existing)}>Vorhandenen öffnen</button><button className="secondary" onClick={()=>submit(true)}>Als neue Charge anlegen</button></div>
      </div>}
      <div className="fields" style={{marginTop:12}}>
        {[
          ["roaster","Röster"],["name","Kaffee"],["origin","Herkunft"],["roast","Röstgrad"],["roastDate","Röstdatum"],
          ["tasting","Tasting Notes laut Röster"],["target","Sensorisches Zielprofil"],["basket","Sieb"]
        ].map(([k,l])=><div className="field" key={k}><label>{l}</label>{["tasting","target"].includes(k)?<textarea value={draft[k]} onChange={e=>setDraft({...draft,[k]:e.target.value})}/>:<input value={draft[k]} onChange={e=>setDraft({...draft,[k]:e.target.value})}/>}</div>)}
      </div>
      {!draft.tasting&&<div className="notice">Tasting Notes fehlen. Bitte ergänzen, damit die KI einen sinnvollen Zielkorridor hat.</div>}
      <div className="actions"><CloseButton close={close}/><button className="primary" onClick={()=>submit(false)} disabled={!draft.roaster||!draft.name||!draft.tasting}>Kaffee anlegen</button></div>
    </>}
  </div></div>
}

function NewBatchModal({coffee,reference,basketDefault,close,onCreate}){
  const [roastDate,setRoastDate]=useState(""),[label,setLabel]=useState("Neue Packung"),[basket,setBasket]=useState(basketDefault||"");
  return <div className="sheet"><div className="panel"><div className="grab"/><h2>Neue Packung / Charge</h2>
    <p>{coffee.roaster} – {coffee.name}</p>
    {reference&&<div className="notice">Die letzte finale Einstellung wird als Startreferenz verwendet, aber nicht überschrieben.</div>}
    <div className="fields"><div className="field"><label>Röstdatum</label><input value={roastDate} onChange={e=>setRoastDate(e.target.value)} placeholder="z. B. 03.09.2026"/></div><div className="field"><label>Bezeichnung</label><input value={label} onChange={e=>setLabel(e.target.value)}/></div><div className="field"><label>Sieb</label><input value={basket} onChange={e=>setBasket(e.target.value)}/></div></div>
    <div className="actions"><CloseButton close={close}/><button className="primary" onClick={()=>onCreate({id:uid(),roastDate,label,basket,shots:[],finalId:null,created:Date.now()})}>Charge anlegen</button></div>
  </div></div>
}

function NewShotModal({coffee,batch,equipment,preset,close,analyze,onSave}){
  const [dose,setDose]=useState(preset?.dose??equipment.defaultDose??17.5),[yieldV,setYield]=useState(preset?.yield??35),[time,setTime]=useState(preset?.time??30),[grind,setGrind]=useState(preset?.grind??""),[pressure,setPressure]=useState(preset?.pressure??"");
  const [sensory,setSensory]=useState({}),[note,setNote]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function go(){
    setBusy(true);setError("");
    const shot={id:uid(),dose:num(dose),yield:num(yieldV),time:num(time),grind,pressure,sensory,note,created:Date.now()};
    try{const ai=await analyze(coffee,batch,shot);onSave({...shot,ai})}catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <div className="sheet"><div className="panel"><div className="grab"/><h2>Shot {batch.shots.length+1}</h2><p>{coffee.roaster} – {coffee.name}</p>
    {preset&&<div className="notice">Letzte/Referenzwerte sind vorausgefüllt. Ändere nur, was du tatsächlich verändern willst.</div>}
    <div className="fields">
      <div className="field"><label>Dose (g)</label><input inputMode="decimal" value={dose} onChange={e=>setDose(e.target.value)}/></div>
      <div className="field"><label>Yield (g)</label><input inputMode="decimal" value={yieldV} onChange={e=>setYield(e.target.value)}/></div>
      <div className="field"><label>Zeit ab 1. Tropfen (s)</label><input inputMode="decimal" value={time} onChange={e=>setTime(e.target.value)}/></div>
      <div className="field"><label>Mahlgrad</label><input value={grind} onChange={e=>setGrind(e.target.value)} placeholder="z. B. 0,8"/></div>
      <div className="field"><label>Brühdruck optional</label><input value={pressure} onChange={e=>setPressure(e.target.value)} placeholder="z. B. 9 bar"/></div>
    </div>
    <div className="card ratio" style={{marginTop:12}}><div><small>Brew Ratio</small><strong>1:{ratio(num(dose),num(yieldV))}</strong></div><span>berechnet</span></div>

    <div className="section"><h3>Tasting</h3></div>
    {tasteGroups.map(g=><div className="tastegroup" key={g.key}><h4>{g.label}</h4><div className="pills">{g.options.map(o=><button key={o} className={"pill "+(sensory[g.key]===o?"on":"")} onClick={()=>setSensory({...sensory,[g.key]:sensory[g.key]===o?"":o})}>{o}</button>)}</div></div>)}
    <div className="field" style={{marginTop:14}}><label>Eigene Beschreibung</label><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="z. B. Schokolade deutlicher, Säure runder, hinten noch leicht trocken"/></div>
    {error&&<div className="notice error">{error}</div>}
    <div className="actions"><CloseButton close={close}/><button className="primary" disabled={busy||(!Object.values(sensory).some(Boolean)&&!note)} onClick={go}>{busy?"KI analysiert…":"Shot analysieren"}</button></div>
  </div></div>
}

function ResultModal({coffee,batch,shot,close,onNext,onFinalize}){
  const ai=shot.ai;
  const prev=batch.shots.at(-1);
  return <div className="sheet"><div className="panel"><div className="grab"/><h2>KI-Auswertung</h2>
    <ShotKpis shot={shot} batch={batch}/>
    {ai?<><div className="section"><h3>Nächster Schritt</h3></div><div className="card reco"><h3>{ai.next_change}</h3><p>{ai.diagnosis}</p><div className="keep"><strong>Unverändert:</strong> {ai.keep_constant}</div><div className="keep"><strong>Beim Tasting:</strong> {ai.tasting_focus}</div><div className="keep"><strong>Warum:</strong> {ai.rationale}</div><div className="confidence">Konfidenz: {ai.confidence}</div></div>
      {ai.trend_summary&&<div className="card trend" style={{marginTop:12}}><strong>Entwicklung</strong><p>{ai.trend_summary}</p></div>}
      {ai.recommend_confirmation_shot&&<div className="notice" style={{marginTop:12}}><strong>Bestätigungs-Shot empfohlen:</strong> Gleiche Kernparameter noch einmal reproduzieren, bevor du final speicherst.</div>}
    </>:<div className="notice error">Keine KI-Auswertung verfügbar.</div>}

    {prev&&<div className="card" style={{marginTop:12}}><h3>Shot-Vergleich</h3><div className="comparegrid">
      <div className="mini"><small>Zeit vorher</small><strong>{fmt(prev.time)} s</strong></div>
      <div className="mini"><small>Zeit jetzt</small><strong>{fmt(shot.time)} s</strong></div>
      <div className="mini"><small>Ratio</small><strong>1:{ratio(shot.dose,shot.yield)}</strong></div>
    </div></div>}

    <div className="actions"><button className="secondary" onClick={close}>Zum Kaffee</button><button className="primary" onClick={()=>onNext(shot)}>Nächster Shot</button></div>
    <button className="secondary wide" style={{marginTop:10}} onClick={()=>onFinalize(shot)}>Als finale Einstellung speichern</button>
  </div></div>
}

function EditCoffeeModal({coffee,close,onSave}){
  const [d,setD]=useState({...coffee});
  return <div className="sheet"><div className="panel"><div className="grab"/><h2>Kaffee bearbeiten</h2>
    {!!d.images?.length&&<><p>Titelbild für Home und Kaffeeübersicht:</p><div className="gallery">{d.images.map((im,i)=><div className="coverpick" key={i}><img src={im} alt=""/><button className={"coverselect "+((d.coverImageIndex??0)===i?"selected":"")} onClick={()=>setD({...d,coverImageIndex:i})}>{(d.coverImageIndex??0)===i?"✓ Titelbild":"Als Titelbild"}</button></div>)}</div></>}
    <div className="fields" style={{marginTop:12}}>
      {["roaster","name","origin","roast","tasting","target"].map(k=><div className="field" key={k}><label>{k}</label>{["tasting","target"].includes(k)?<textarea value={d[k]||""} onChange={e=>setD({...d,[k]:e.target.value})}/>:<input value={d[k]||""} onChange={e=>setD({...d,[k]:e.target.value})}/>}</div>)}
    </div><div className="actions"><CloseButton close={close}/><button className="primary" onClick={()=>onSave(d)}>Speichern</button></div>
  </div></div>
}

function EditShotModal({shot,close,onSave,onDelete}){
  const [d,setD]=useState({...shot});
  return <div className="sheet"><div className="panel"><div className="grab"/><h2>Shot bearbeiten</h2><div className="fields">
    {["dose","yield","time","grind","pressure","note"].map(k=><div className="field" key={k}><label>{k}</label><input value={d[k]??""} onChange={e=>setD({...d,[k]:["dose","yield","time"].includes(k)?num(e.target.value):e.target.value})}/></div>)}
  </div><div className="actions"><button className="danger" onClick={onDelete}>Löschen</button><button className="primary" onClick={()=>onSave(d)}>Speichern</button></div></div></div>
}

export default function EspressoApp(){
  const [state,setState]=useState(defaultState),[loaded,setLoaded]=useState(false),[tab,setTab]=useState("home"),[modal,setModal]=useState(null),[search,setSearch]=useState("");
  useEffect(()=>{dbGet().then(s=>{setState(s);setLoaded(true)})},[]);
  useEffect(()=>{if(loaded)dbSet(state)},[state,loaded]);

  if(!loaded)return <div className="shell"><div className="loading"><i className="dot"/><i className="dot"/><i className="dot"/></div></div>;

  const coffee=state.coffees.find(c=>c.id===state.activeCoffeeId)||null;
  const batch=coffee?.batches?.find(b=>b.id===state.activeBatchId)||coffee?.batches?.at(-1)||null;

  function setActive(c,b=null){setState(s=>({...s,activeCoffeeId:c.id,activeBatchId:(b||c.batches.at(-1))?.id||null}));setTab("coffee")}
  function close(){setModal(null)}
  async function extractCoffee(images,description){
    const res=await fetch("/api/extract-coffee",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({images,description})});
    const data=await res.json();if(!res.ok)throw new Error(data.error||"Fotoanalyse fehlgeschlagen");return data
  }
  async function analyze(c,b,shot){
    const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      equipment:state.equipment,
      coffee:{id:c.id,roaster:c.roaster,name:c.name,origin:c.origin,roast:c.roast,tasting:c.tasting,target:c.target},
      batch:{id:b.id,roastDate:b.roastDate,label:b.label,basket:b.basket},
      history:b.shots,
      shot
    })});
    const data=await res.json();if(!res.ok)throw new Error(data.error||"Analyse fehlgeschlagen");return data
  }
  function createCoffee(draft,images){
    const c={id:uid(),roaster:draft.roaster,name:draft.name,origin:draft.origin,roast:draft.roast,tasting:draft.tasting,target:draft.target,images,coverImageIndex:draft.coverImageIndex??0,created:Date.now(),batches:[]};
    const b={id:uid(),roastDate:draft.roastDate||"",label:"Erste Packung",basket:draft.basket||state.equipment.baskets[0]||"",shots:[],finalId:null,created:Date.now()};
    c.batches=[b];
    setState(s=>({...s,coffees:[c,...s.coffees],activeCoffeeId:c.id,activeBatchId:b.id}));
    setModal({type:"shot",coffee:c,batch:b});
  }
  function createBatch(b){
    setState(s=>({...s,coffees:s.coffees.map(c=>c.id===coffee.id?{...c,batches:[...c.batches,b]}:c),activeBatchId:b.id}));
    setModal({type:"shot",coffee,batch:b,preset:getLatestFinal(coffee)});
  }
  function getLatestFinal(c){
    for(const b of [...c.batches].reverse()){if(b.finalId){const s=b.shots.find(x=>x.id===b.finalId);if(s)return s}}
    return null
  }
  function saveShot(c,b,shot){
    const updatedBatch={...b,shots:[...b.shots,shot]};
    setState(s=>({...s,coffees:s.coffees.map(x=>x.id===c.id?{...x,batches:x.batches.map(y=>y.id===b.id?updatedBatch:y)}:x)}));
    setModal({type:"result",coffee:c,batch:updatedBatch,shot});
  }
  function finalize(c,b,shot){
    setState(s=>({...s,coffees:s.coffees.map(x=>x.id===c.id?{...x,batches:x.batches.map(y=>y.id===b.id?{...y,finalId:shot.id}:y)}:x)}));
    setModal(null);setTab("coffee");
  }
  function editCoffeeSave(d){setState(s=>({...s,coffees:s.coffees.map(c=>c.id===d.id?d:c)}));close()}
  function editShotSave(d){setState(s=>({...s,coffees:s.coffees.map(c=>c.id===coffee.id?{...c,batches:c.batches.map(b=>b.id===batch.id?{...b,shots:b.shots.map(x=>x.id===d.id?d:x)}:b)}:c)}));close()}
  function deleteShot(sid){if(!confirm("Shot löschen?"))return;setState(s=>({...s,coffees:s.coffees.map(c=>c.id===coffee.id?{...c,batches:c.batches.map(b=>b.id===batch.id?{...b,shots:b.shots.filter(x=>x.id!==sid),finalId:b.finalId===sid?null:b.finalId}:b)}:c)}));close()}
  function deleteCoffee(){if(!confirm("Kaffee mit allen Chargen und Shots löschen?"))return;setState(s=>({...s,coffees:s.coffees.filter(c=>c.id!==coffee.id),activeCoffeeId:null,activeBatchId:null}));setTab("home")}
  async function researchEquipment(kind,query){
    const res=await fetch("/api/research-equipment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,query})});
    const data=await res.json();if(!res.ok)throw new Error(data.error||"Equipment-Recherche fehlgeschlagen");return data
  }
  function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="espresso-lab-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  async function importData(e){try{const raw=JSON.parse(await e.target.files[0].text());setState(migrateState(raw));alert("Backup importiert.")}catch{alert("Ungültiges Backup.")}}

  let content;
  if(tab==="home")content=<HomeView state={state} search={search} setSearch={setSearch} onNew={()=>setModal({type:"newCoffee"})} onOpen={c=>setActive(c)} setTab={setTab} onContinue={c=>{setActive(c);const b=c.batches.at(-1);setModal({type:"shot",coffee:c,batch:b,preset:b.shots.at(-1)||getLatestFinal(c)})}} onSettings={()=>setTab("settings")}/>;
  else if(tab==="coffees")content=<CoffeesView state={state} onNew={()=>setModal({type:"newCoffee"})} onOpen={c=>setActive(c)} onSettings={()=>setTab("settings")}/>;
  else if(tab==="coffee")content=<CoffeeView coffee={coffee} batch={batch} onNewShot={preset=>setModal({type:"shot",coffee,batch,preset})} onNewBatch={()=>setModal({type:"batch",coffee,reference:getLatestFinal(coffee)})} onEditCoffee={()=>setModal({type:"editCoffee",coffee})} onEditShot={shot=>setModal({type:"editShot",shot})} onDelete={deleteCoffee} onSettings={()=>setTab("settings")}/>;
  else content=<SettingsView state={state} onSaveEquipment={(eq,opts={})=>{setState(s=>({...s,equipment:eq}));if(!opts.silent)alert("Equipment gespeichert.")}} onExport={exportData} onImport={importData} onSettings={()=>setTab("settings")} researchEquipment={researchEquipment}/>;

  return <div className="shell">{content}<Tabs tab={tab} setTab={setTab}/>
    {modal?.type==="newCoffee"&&<NewCoffeeModal state={state} close={close} extractCoffee={extractCoffee} onCreate={createCoffee} onOpenExisting={c=>{setActive(c);close()}}/>}
    {modal?.type==="batch"&&<NewBatchModal coffee={modal.coffee} reference={modal.reference} basketDefault={state.equipment.baskets[0]} close={close} onCreate={createBatch}/>}
    {modal?.type==="shot"&&<NewShotModal coffee={modal.coffee} batch={modal.batch} equipment={state.equipment} preset={modal.preset} close={close} analyze={analyze} onSave={shot=>saveShot(modal.coffee,modal.batch,shot)}/>}
    {modal?.type==="result"&&<ResultModal coffee={modal.coffee} batch={modal.batch} shot={modal.shot} close={()=>{close();setTab("coffee")}} onNext={preset=>setModal({type:"shot",coffee:modal.coffee,batch:modal.batch,preset})} onFinalize={shot=>finalize(modal.coffee,modal.batch,shot)}/>}
    {modal?.type==="editCoffee"&&<EditCoffeeModal coffee={modal.coffee} close={close} onSave={editCoffeeSave}/>}
    {modal?.type==="editShot"&&<EditShotModal shot={modal.shot} close={close} onSave={editShotSave} onDelete={()=>deleteShot(modal.shot.id)}/>}
  </div>
}
