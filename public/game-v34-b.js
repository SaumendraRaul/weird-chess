function renderAchievements(){
  const got=getAchievements();$("#achievementsBody").innerHTML=Object.entries(achievementsCatalog).map(([id,[icon,title,desc]])=>`<div class="achievement ${got[id]?"unlocked":""}"><div class="achievement-icon">${icon}</div><b>${esc(title)}</b><small>${esc(desc)}</small></div>`).join("");
}
function matchWinnerColor(){if(outcome.includes("White wins"))return"w";if(outcome.includes("Black wins"))return"b";return null}
function getHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]")}catch(_){return[]}}
function saveHistory(h){
  try{const clean=h.slice(0,50).map((x,i)=>i<10?x:{...x,replay:null});localStorage.setItem(HISTORY_KEY,JSON.stringify(clean))}catch(_){}
}
let lastFinalizedHash=null;
function finalizeMatchOnce(){
  if(!gameOver)return;
  const key=`${stateHash()}|${outcome}`;if(lastFinalizedHash===key)return;lastFinalizedHash=key;
  if(!replayFrames.length||!replayFrames.at(-1)?.state?.gameOver)recordReplay("Game Over");
  finalizeMatch();
}
function finalizeMatch(){
  const winner=matchWinnerColor(),allChaos=Object.values(mods).every(Boolean);
  if(allChaos)unlockAchievement("chaos_game");
  if(botEnabled&&botDifficulty==="storkpiss"&&winner&&winner!==botColor)unlockAchievement("storkpiss");
  const startingCount=16,loser=winner?enemy(winner):null;if(winner&&allPieces().filter(p=>p.color===winner).length===startingCount)unlockAchievement("clean_win");
  if((stats.checks||0)>=5)unlockAchievement("check_party");
  const h=getHistory(),total=(h.reduce((n,x)=>n+(x.moves||0),0)+(stats.moves||0));if(total>=100)unlockAchievement("century");
  const id=`m-${Date.now().toString(36)}-${matchSeed.slice(0,6)}`,entry={id,date:Date.now(),outcome,moves:stats.moves||0,duration:Date.now()-(stats.startedAt||Date.now()),seed:matchSeed,preset:currentPreset,mods:deepCopy(mods),startingPosition,profiles:deepCopy(profiles),hash:stateHash(),events:eventLog.slice(-120),replay:replayFrames.length<180?replayFrames:null};
  h.unshift(entry);saveHistory(h);try{localStorage.setItem("weirdChess.lastCompleted.v34",JSON.stringify(entry))}catch(_){}
}
function renderHistory(){
  const h=getHistory();$("#historyBody").innerHTML=h.length?h.map((x,i)=>`<div class="history-card"><b>${esc(x.outcome||"Match")}</b><p>${new Date(x.date).toLocaleString()} • ${x.moves} plies • ${esc(x.startingPosition)} • seed ${esc(x.seed)}</p><div class="history-actions">${x.replay?`<button class="btn secondary history-replay" data-i="${i}">▶ Replay</button>`:""}<button class="btn secondary history-events" data-i="${i}">☷ Events</button></div></div>`).join(""):'<div class="empty-moves">No finished games yet.</div>';
  document.querySelectorAll(".history-replay").forEach(b=>b.addEventListener("click",()=>{const x=h[+b.dataset.i];openReplay(x.replay);}));
  document.querySelectorAll(".history-events").forEach(b=>b.addEventListener("click",()=>{const x=h[+b.dataset.i];renderTimeline(x.events||[]);showDialog("timelineDialog")}));
}

function renderTimeline(events=eventLog){
  $("#timelineBody").innerHTML=events.length?events.map(e=>`<div class="timeline-item"><span class="timeline-time">#${e.ply}</span><span class="timeline-text"><span class="event-chip">${esc(e.type)}</span> ${esc(e.text)}</span></div>`).join(""):'<div class="empty-moves">Nothing weird has happened. Concerning.</div>';
}
function renderMiniBoard(frame){
  const st=frame.state,box=$("#replayBoard");box.innerHTML="";
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){const s=document.createElement("div"),p=st.board[r][c];s.className=`mini-sq ${(r+c)%2?"dark":"light"} ${st.lastMove&&((st.lastMove.sr===r&&st.lastMove.sc===c)||(st.lastMove.tr===r&&st.lastMove.tc===c))?"last":""}`;s.textContent=p?glyph[p.color][p.type]:"";box.append(s)}
  $("#replayLabel").textContent=`${frame.label||"Position"} • ply ${frame.ply}`;
}
function openReplay(frames=replayFrames){
  if(!frames?.length){toast("No replay frames yet.");return}replayFramesForDialog=frames;$("#replaySlider").max=String(frames.length-1);$("#replaySlider").value="0";renderMiniBoard(frames[0]);showDialog("replayDialog");
}
let replayFramesForDialog=[],replayIndex=0;
function setReplayIndex(i){if(!replayFramesForDialog.length)return;replayIndex=Math.max(0,Math.min(replayFramesForDialog.length-1,i));$("#replaySlider").value=String(replayIndex);renderMiniBoard(replayFramesForDialog[replayIndex])}
$("#replaySlider").addEventListener("input",e=>setReplayIndex(+e.target.value));$("#replayPrev").addEventListener("click",()=>setReplayIndex(replayIndex-1));$("#replayNext").addEventListener("click",()=>setReplayIndex(replayIndex+1));
$("#replayPlay").addEventListener("click",()=>{if(replayTimer){clearInterval(replayTimer);replayTimer=null;$("#replayPlay").textContent="PLAY";return}$("#replayPlay").textContent="PAUSE";replayTimer=setInterval(()=>{if(replayIndex>=replayFramesForDialog.length-1){clearInterval(replayTimer);replayTimer=null;$("#replayPlay").textContent="PLAY";return}setReplayIndex(replayIndex+1)},550)});

function b64urlEncode(obj){const bytes=new TextEncoder().encode(JSON.stringify(obj));let bin="";bytes.forEach(b=>bin+=String.fromCharCode(b));return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function b64urlDecode(s){s=s.trim().replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";const bin=atob(s),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return JSON.parse(new TextDecoder().decode(bytes))}
function currentMatchCode(){return "WC35."+b64urlEncode({rulesVersion:RULES_VERSION,state:exportGameState()})}
async function copyCurrentCode(){const code=currentMatchCode();$("#matchCode").value=code;try{await navigator.clipboard.writeText(code);toast("Match code copied.")}catch(_){toast("Code ready to copy.")}}
function loadMatchCode(){
  try{
    const raw=$("#matchCode").value.trim().replace(/^WC35\./,""),payload=b64urlDecode(raw);if(payload.rulesVersion!==RULES_VERSION)throw new Error("Rules version mismatch");
    importGameState(payload.state);syncModButtons();$("#setup").classList.add("hidden");$("#game").classList.remove("hidden");replayFrames=[];eventLog=[];recordEvent("import","Loaded from match code");recordReplay("Imported");render();startTurnClock(payload.state.turnRemaining||null);saveGame();maybeBotMove();closeDialog("shareDialog")
  }catch(e){toast(`Could not load code: ${e.message}`)}
}

function renderEncyclopedia(){
  const cards=[
    ["🧬 Evolution",`Capture ${ruleConfig.evolutionCaptures} piece(s) to become Evolution Ready, then reach your own moving ✦ gate. The gate moves every ${ruleConfig.gateRerollPlies} ply/plies. Evolution branches become permanent named forms.`],
    ["☢ Mutation Squares",`${ruleConfig.mutationSquareCount} squares carry visible mutation types and relocate every ${ruleConfig.mutationRerollPlies} plies. Phase Hop = 2 orthogonal; Rift Step = 2 diagonal; Wild Leaper = knight + long leaps; Sidewinder = sideways/wrap.`],
    ["🔗 Fusion","Move one friendly non-King onto another friendly non-King. The survivor gains both movement sets. A fused piece cannot fuse again."],
    ["👑 King Powers","Blink grants Phase Hop to the King. Revive Pawn restores one pawn if the resulting position is legal. Each side gets one use."],
    ["🌫 Fog of War","You see your own pieces and squares attacked by your pieces. Legal chess/check logic remains authoritative even when enemy pieces are hidden."],
    ["🔀 Chess960 Shuffle","Bishops begin on opposite colors, the King begins between the Rooks, and both sides share the same shuffled back rank. This build uses castling-safe shuffle positions."],
    ["🎲 Seeded Chaos",`Match seed: ${esc(matchSeed||$("#matchSeed").value||"not started")}. Evolution Gates, Mutation squares, and Weird Engine decisions use deterministic seeded randomness.`],
    ["♟ Classic baseline","With Weird modifiers off and Standard starting position selected, normal chess rules apply: check, mate, castling, en passant, promotion, repetition, 50-move rule and insufficient material."]
  ];
  $("#encyclopediaBody").innerHTML=cards.map(([t,p])=>`<div class="rule-card"><b>${t}</b><p>${p}</p></div>`).join("");
}

function stupidMatch(){
  const ids=Object.keys(mods),count=2+Math.floor(visualRandom()*4),chosen=new Set(shuffleGame(ids).slice(0,count));ids.forEach(k=>mods[k]=chosen.has(k));syncModButtons();currentPreset="custom";markPreset("custom");
  ruleConfig={evolutionCaptures:1+Math.floor(visualRandom()*3),gateRerollPlies:1+Math.floor(visualRandom()*3),mutationRerollPlies:[2,4,6][Math.floor(visualRandom()*3)],mutationSquareCount:2+Math.floor(visualRandom()*5)};
  $("#turnTimer").value=["0","30","60"][Math.floor(visualRandom()*3)];$("#whitePower").value=visualRandom()<.5?"blink":"revive";$("#blackPower").value=visualRandom()<.5?"blink":"revive";$("#matchSeed").value=randomSeed();syncRuleEditor();saveSetupPrefs();saveV34Prefs();toast("A questionable ruleset has been generated.");
}

function drawer(open){$("#sideStack").classList.toggle("open",open)}
$("#drawerToggle").addEventListener("click",()=>drawer(true));$("#drawerClose").addEventListener("click",()=>drawer(false));
$("#timelineBtn").addEventListener("click",()=>{renderTimeline();showDialog("timelineDialog")});$("#replayBtn").addEventListener("click",()=>openReplay());$("#shareBtn").addEventListener("click",()=>{copyCurrentCode();showDialog("shareDialog")});$("#rulesQuickBtn").addEventListener("click",()=>{renderEncyclopedia();showDialog("encyclopediaDialog")});
$("#encyclopediaBtn").addEventListener("click",()=>{renderEncyclopedia();showDialog("encyclopediaDialog")});$("#historyBtn").addEventListener("click",()=>{renderHistory();showDialog("historyDialog")});$("#achievementsBtn").addEventListener("click",()=>{renderAchievements();showDialog("achievementsDialog")});$("#importBtn").addEventListener("click",()=>{$("#matchCode").value="";showDialog("shareDialog")});
$("#copyCode").addEventListener("click",copyCurrentCode);$("#loadCode").addEventListener("click",loadMatchCode);$("#stupidMatch").addEventListener("click",stupidMatch);
$("#endReplay").addEventListener("click",()=>openReplay());$("#endShare").addEventListener("click",()=>{copyCurrentCode();showDialog("shareDialog")});

$("#powerBtn").addEventListener("click",e=>{
  if(!accessibility.confirmSpecial||$("#powerBtn").dataset.confirmed==="1")return;
  e.stopImmediatePropagation();if(confirm(`Use ${powers[turn]==="blink"?"Blink":"Revive Pawn"}? Each King power can only be used once.`)){$("#powerBtn").dataset.confirmed="1";$("#powerBtn").click();delete $("#powerBtn").dataset.confirmed}
},{capture:true});

window.WeirdChessNet={
  rulesVersion:RULES_VERSION,
  makeAction(type,payload={},actorColor=turn,seq=stats?.moves||0){return{rulesVersion:RULES_VERSION,type,payload,actorColor,seq,preHash:stateHash(),seed:matchSeed}},
  validateTurnOwnership(action,expectedColor=turn){return !!action&&action.rulesVersion===RULES_VERSION&&action.actorColor===expectedColor},
  spectator(){return{mode:"spectator",canMove:false,rulesVersion:RULES_VERSION,state:exportGameState(),hash:stateHash()}},
  reconnectSnapshot(roomId){const x={roomId,rulesVersion:RULES_VERSION,state:exportGameState(),hash:stateHash(),savedAt:Date.now()};try{localStorage.setItem(`weirdChess.room.${roomId}`,JSON.stringify(x))}catch(_){}return x},
  loadReconnect(roomId){try{return JSON.parse(localStorage.getItem(`weirdChess.room.${roomId}`)||"null")}catch(_){return null}},
  applyAuthoritative(snapshot){
    if(!snapshot||snapshot.rulesVersion!==RULES_VERSION)throw new Error("rules-version-mismatch");
    const before=stateHash();importGameState(snapshot.state);const after=stateHash();render();saveGame();
    if(snapshot.hash&&snapshot.hash!==after)throw new Error("authoritative-snapshot-corrupt");
    if(before!==after)toast("Desync recovered from authoritative state.");return after;
  }
};

const gameVisibilityObserver=new MutationObserver(()=>document.body.classList.toggle("playing",!$("#game").classList.contains("hidden")));
gameVisibilityObserver.observe($("#game"),{attributes:true,attributeFilter:["class"]});
document.body.classList.toggle("playing",!$("#game").classList.contains("hidden"));

const _resumeSavedMatch=resumeSavedMatch;
resumeSavedMatch=function(){
  try{const r=JSON.parse(localStorage.getItem("weirdChess.currentReplay.v34")||"null");if(r){replayFrames=r.frames||[];eventLog=r.events||[];if(r.seed&&!matchSeed)setGameSeed(r.seed)}}catch(_){}
  _resumeSavedMatch();render();
};

$("#resumeGame").addEventListener("click",()=>{
  try{const r=JSON.parse(localStorage.getItem("weirdChess.currentReplay.v34")||"null");if(r){replayFrames=r.frames||[];eventLog=r.events||[];if(r.seed)setGameSeed(r.seed)}}catch(_){}
},{capture:true});

loadV34Prefs();
renderEncyclopedia();
renderAchievements();
