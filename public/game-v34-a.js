/* Weird Chess v3.4: replay, deterministic chaos, profiles, history, accessibility,
   Chess960 shuffle, multiplayer-ready state envelopes, no-scroll mobile shell. */

function loadV34Prefs(){
  try{
    const p=JSON.parse(localStorage.getItem(PREFS34)||"null");if(!p)return;
    if(p.ruleConfig)Object.assign(ruleConfig,p.ruleConfig);
    if(p.profiles)profiles=p.profiles;
    if(p.accessibility)Object.assign(accessibility,p.accessibility);
    if(p.startingPosition)startingPosition=p.startingPosition;
  }catch(_){}
  $("#whiteName").value=profiles.w.name;$("#blackName").value=profiles.b.name;
  $("#whiteAvatar").value=profiles.w.avatar;$("#blackAvatar").value=profiles.b.avatar;
  $("#startingPosition").value=startingPosition;
  syncRuleEditor();syncA11y();applyA11y();
}
function saveV34Prefs(){
  profiles={w:{name:$("#whiteName").value.trim()||"White Player",avatar:$("#whiteAvatar").value},b:{name:$("#blackName").value.trim()||"Black Player",avatar:$("#blackAvatar").value}};
  startingPosition=$("#startingPosition").value||"standard";
  try{localStorage.setItem(PREFS34,JSON.stringify({ruleConfig,profiles,accessibility,startingPosition}))}catch(_){}
}
function syncRuleEditor(){
  $("#ruleEvolutionCaptures").value=ruleConfig.evolutionCaptures;$("#ruleGateReroll").value=ruleConfig.gateRerollPlies;
  $("#ruleMutationReroll").value=ruleConfig.mutationRerollPlies;$("#ruleMutationCount").value=ruleConfig.mutationSquareCount;
}
function syncA11y(){
  $("#a11yContrast").checked=accessibility.contrast;$("#a11yLargePieces").checked=accessibility.largePieces;
  $("#a11yReducedMotion").checked=accessibility.reducedMotion;$("#a11yDanger").checked=accessibility.dangerPreview;$("#a11yConfirm").checked=accessibility.confirmSpecial;
}
function applyA11y(){
  const r=document.documentElement;r.dataset.a11yContrast=accessibility.contrast?"1":"0";r.dataset.a11yLarge=accessibility.largePieces?"1":"0";r.dataset.a11yReduce=accessibility.reducedMotion?"1":"0";
}
function showDialog(id){$("#"+id)?.classList.remove("hidden")}
function closeDialog(id){$("#"+id)?.classList.add("hidden")}
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeDialog(b.dataset.close)));

["whiteName","blackName","whiteAvatar","blackAvatar","startingPosition"].forEach(id=>$("#"+id)?.addEventListener("change",saveV34Prefs));
$("#newSeed").addEventListener("click",()=>{$("#matchSeed").value=randomSeed()});

$("#rulesEditorBtn").addEventListener("click",()=>{syncRuleEditor();showDialog("rulesDialog")});
$("#saveRules").addEventListener("click",()=>{
  ruleConfig={evolutionCaptures:+$("#ruleEvolutionCaptures").value,gateRerollPlies:+$("#ruleGateReroll").value,mutationRerollPlies:+$("#ruleMutationReroll").value,mutationSquareCount:+$("#ruleMutationCount").value};
  currentPreset="custom";markPreset("custom");saveV34Prefs();closeDialog("rulesDialog");toast("Custom rules saved.");
});
$("#resetRules").addEventListener("click",()=>{ruleConfig={evolutionCaptures:2,gateRerollPlies:1,mutationRerollPlies:4,mutationSquareCount:4};syncRuleEditor();saveV34Prefs()});
$("#accessibilityBtn").addEventListener("click",()=>showDialog("accessibilityDialog"));
["a11yContrast","a11yLargePieces","a11yReducedMotion","a11yDanger","a11yConfirm"].forEach(id=>$("#"+id).addEventListener("change",()=>{
  accessibility={contrast:$("#a11yContrast").checked,largePieces:$("#a11yLargePieces").checked,reducedMotion:$("#a11yReducedMotion").checked,dangerPreview:$("#a11yDanger").checked,confirmSpecial:$("#a11yConfirm").checked};
  applyA11y();saveV34Prefs();render();
}));

function generate960(){
  for(let tries=0;tries<100;tries++){
    const out=Array(8).fill(null),dark=[0,2,4,6],light=[1,3,5,7];
    out[dark[Math.floor(gameRandom()*dark.length)]]="b";out[light[Math.floor(gameRandom()*light.length)]]="b";
    let rem=out.map((x,i)=>x?null:i).filter(x=>x!=null);
    let q=rem.splice(Math.floor(gameRandom()*rem.length),1)[0];out[q]="q";
    rem=shuffleGame(rem);out[rem.pop()]="n";out[rem.pop()]="n";
    rem=rem.sort((a,b)=>a-b);out[rem[0]]="r";out[rem[1]]="k";out[rem[2]]="r";
    const king=rem[1],rooks=[rem[0],rem[2]];
    if(king===2||king===6||rooks.includes(2)||rooks.includes(6))continue;
    return out;
  }
  return ["r","n","b","q","k","b","n","r"];
}
const _exportGameState=exportGameState;
exportGameState=function(){
  const s=_exportGameState();
  return {...s,version:GAME_STATE_VERSION,rulesVersion:RULES_VERSION,matchSeed,rngState,startingPosition,castleState:deepCopy(castleState),ruleConfig:deepCopy(ruleConfig),profiles:deepCopy(profiles)};
};
const _importGameState=importGameState;
importGameState=function(s){
  _importGameState(s);matchSeed=s.matchSeed||"legacy";rngState=s.rngState??seedHash(matchSeed);startingPosition=s.startingPosition||"standard";castleState=s.castleState||castleState;
  if(s.ruleConfig)Object.assign(ruleConfig,s.ruleConfig);if(s.profiles)profiles=s.profiles;
};
stateHash=function(){
  const s=exportGameState(),gameplay={rulesVersion:s.rulesVersion,matchSeed:s.matchSeed,rngState:s.rngState,startingPosition:s.startingPosition,castleState:s.castleState,ruleConfig:s.ruleConfig,board:s.board,turn:s.turn,mutationSquares:s.mutationSquares,powerUsed:s.powerUsed,gameOver:s.gameOver,outcome:s.outcome,ep:s.ep,halfmove:s.halfmove,fullmove:s.fullmove,lastMove:s.lastMove,mods:s.mods,powers:s.powers,evoGates:s.evoGates,positionCount:s.positionCount};
  let h=2166136261,str=JSON.stringify(gameplay);for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,"0");
};
gameState.version=GAME_STATE_VERSION;gameState.hash=stateHash;

const _fresh=fresh;
fresh=function(){
  saveV34Prefs();setGameSeed($("#matchSeed").value||randomSeed());$("#matchSeed").value=matchSeed;startingPosition=$("#startingPosition").value||"standard";
  _fresh();
  if(startingPosition==="chess960"){
    const back=generate960();setCastleStateFromBack(back);pieceSeq=0;
    for(let c=0;c<8;c++){board[0][c]=P("b",back[c]);board[1][c]=P("b","p");board[6][c]=P("w","p");board[7][c]=P("w",back[c])}
    positionCount=new Map();seedMutationSquares();relocateEvolutionGates();recordPosition();
  }else setCastleStateFromBack(["r","n","b","q","k","b","n","r"]);
  replayFrames=[];eventLog=[];matchStartedState=deepCopy(exportGameState());
  recordEvent("start",`${startingPosition==="chess960"?"Chess960 Shuffle":"Standard"} match • seed ${matchSeed}`);
  recordReplay("Start");
  saveCurrentReplay();
};
const _restore=restore;
restore=function(s){_restore(s);if(s.matchSeed){matchSeed=s.matchSeed;rngState=s.rngState??seedHash(matchSeed);startingPosition=s.startingPosition||"standard";castleState=s.castleState||castleState;if(s.ruleConfig)Object.assign(ruleConfig,s.ruleConfig)}};

function recordEvent(type,text){
  eventLog.push({ply:stats?.moves||0,type,text:String(text),at:Date.now()});
  if(eventLog.length>400)eventLog.shift();
}
function replayState(){
  const s=exportGameState();return {board:deepCopy(s.board),turn:s.turn,lastMove:deepCopy(s.lastMove),evoGates:deepCopy(s.evoGates),mutationSquares:deepCopy(s.mutationSquares),outcome:s.outcome,gameOver:s.gameOver};
}
function recordReplay(label){
  replayFrames.push({label,ply:stats?.moves||0,state:replayState()});if(replayFrames.length>300)replayFrames.shift();
}
function saveCurrentReplay(){try{localStorage.setItem("weirdChess.currentReplay.v34",JSON.stringify({frames:replayFrames,events:eventLog,seed:matchSeed}))}catch(_){}}
const _endTurn=endTurn;
endTurn=function(){
  const beforeTurn=turn,beforeGates=deepCopy(evoGates),beforeMuts=deepCopy(mutationSquares);
  _endTurn();
  const lm=moveLog.at(-1)?.text||`Ply ${stats?.moves||0}`;
  recordEvent("move",`${beforeTurn==="w"?"White":"Black"} • ${lm}`);
  recordReplay(lm);
  if(JSON.stringify(beforeGates)!==JSON.stringify(evoGates)&&mods.evolution)recordEvent("gate",`Evolution Gates moved • White ${evoGates.w?coord(evoGates.w.r,evoGates.w.c):"—"} • Black ${evoGates.b?coord(evoGates.b.r,evoGates.b.c):"—"}`);
  if(JSON.stringify(beforeMuts)!==JSON.stringify(mutationSquares)&&mods.mutation)recordEvent("mutation-square","Mutation squares relocated");
  updateChaosMeter();saveCurrentReplay();
};

const _applyEvolutionChoice=applyEvolutionChoice;
applyEvolutionChoice=function(p,r,c,newType,label){recordEvent("evolution",`${p.color==="w"?"White":"Black"} ${name(p.type)} evolved into ${label}`);unlockAchievement("first_evolution");return _applyEvolutionChoice(p,r,c,newType,label)};
const _performFusion=performFusion;
performFusion=function(sr,sc,tr,tc){
  if(accessibility.confirmSpecial&&(!botEnabled||turn!==botColor)&&!confirm(`Fuse ${name(board[sr][sc]?.type)} into ${name(board[tr][tc]?.type)}? This cannot be undone by another fusion.`))return false;
  const ok=_performFusion(sr,sc,tr,tc);if(ok){recordEvent("fusion",`${coord(sr,sc)} fused into ${coord(tr,tc)}`);unlockAchievement("first_fusion")}return ok;
};
const _executeMove=executeMove;
executeMove=function(sr,sc,r,c,promotionType=null){
  const moving=board[sr]?.[sc],beforeMut=moving?.mut,beforeKills=moving?.kills||0,target=board[r]?.[c];
  const result=_executeMove(sr,sc,r,c,promotionType);
  const moved=board[r]?.[c];
  if(target&&target.color!==moving?.color)recordEvent("capture",`${coord(sr,sc)} captured on ${coord(r,c)}`);
  if(moved&&!beforeMut&&moved.mut){recordEvent("mutation",`${coord(r,c)} gained ${mutationDefs[moved.mut]?.name||moved.mut}`);unlockAchievement("first_mutation")}
  if(moved?.evoReady&&beforeKills<ruleConfig.evolutionCaptures)recordEvent("ready",`${coord(r,c)} became Evolution Ready`);
  return result;
};

const _renderPieceInfo=renderPieceInfo;
renderPieceInfo=function(){_renderPieceInfo();if(sel){const p=board[sel[0]]?.[sel[1]];if(p?.evoName){const el=$("#pieceInfo .piece-info-sub");if(el)el.textContent=`${coord(sel[0],sel[1])} • ${p.evoName} • Evolution Lv.${p.evoLevel||0}`}}};

const _render=render;
render=function(){
  _render();decorateDanger();updateChaosMeter();document.body.classList.toggle("playing",!$("#game").classList.contains("hidden"));
};
function decorateDanger(){
  document.querySelectorAll(".danger-square").forEach(x=>x.classList.remove("danger-square"));
  if(!accessibility.dangerPreview||!sel)return;const p=board[sel[0]]?.[sel[1]];if(p?.type!=="k")return;
  document.querySelectorAll(".sq").forEach(s=>{const r=+s.dataset.r,c=+s.dataset.c;if(isSquareAttacked(r,c,enemy(p.color)))s.classList.add("danger-square")});
}
const _animateMove=animateMove;
animateMove=function(sr,sc,tr,tc,done){if(accessibility.reducedMotion){done();return}_animateMove(sr,sc,tr,tc,done)};

const _playerName=playerName;
playerName=function(color){if(botEnabled&&color===botColor)return _playerName(color);return botEnabled&&color!==botColor?(profiles[color]?.name||"You"):(profiles[color]?.name||_playerName(color))};
playerCard=function(color){
  const timer=turnTimerSeconds?`<span id="timer-${color}" class="timer-chip">${formatTime(turnTimerSeconds*1000)}</span>`:`<span class="turn-dot"></span>`;
  const av=botEnabled&&color===botColor?"🤖":profiles[color]?.avatar||(color==="w"?"⚪":"⚫");
  return `<div class="player-left"><div class="avatar">${av}</div><div><div class="player-name">${esc(playerName(color))}</div><div class="player-desc">${playerDesc(color)}</div></div></div>${timer}`;
};

function chaosScore(){
  if(!stats)return 0;return Math.min(100,(stats.captures||0)*3+(stats.checks||0)*5+(stats.mutations||0)*10+(stats.evolutions||0)*15+(stats.fusions||0)*14+Object.values(mods).filter(Boolean).length*3);
}
function updateChaosMeter(){
  const v=chaosScore(),fill=$("#chaosFill");if(fill)fill.style.width=v+"%";if($("#chaosValue"))$("#chaosValue").textContent=v;
  document.body.dataset.chaosTier=String(Math.min(4,Math.floor(v/25)));
}

function allPieces(){const a=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c])a.push(board[r][c]);return a}
function mvp(){
  const candidates=allPieces().filter(p=>p.type!=="k"||p.captures||p.checks||p.evolutions||p.mutations||p.fusions);
  let best=null,bestScore=-1;for(const p of candidates){const score=(p.captures||0)*3+(p.checks||0)*2+(p.evolutions||0)*5+(p.mutations||0)*2+(p.fusions||0)*4;if(score>bestScore){best=p;bestScore=score}}
  return best?{p:best,score:bestScore}:null;
}
const _showEndDialog=showEndDialog;
showEndDialog=function(){_showEndDialog();const x=mvp(),box=$("#mvpCard");if(x){box.innerHTML=`<div class="mvp-title">MATCH MVP</div><div class="mvp-name">${glyph[x.p.color][x.p.type]} ${esc(x.p.evoName||name(x.p.type))}</div><div class="mvp-sub">${x.p.captures||0} captures • ${x.p.checks||0} checks • ${x.p.evolutions||0} evolutions • ${x.p.mutations||0} mutations • ${x.p.fusions||0} fusions</div>`}else box.innerHTML='<div class="mvp-title">MATCH MVP</div><div class="mvp-name">Nobody earned it 😭</div>';setTimeout(finalizeMatchOnce,0)};

function getAchievements(){try{return JSON.parse(localStorage.getItem(ACH_KEY)||"{}")}catch(_){return{}}}
function unlockAchievement(id){
  const a=getAchievements();if(a[id])return;a[id]=Date.now();try{localStorage.setItem(ACH_KEY,JSON.stringify(a))}catch(_){}
  const item=achievementsCatalog[id];if(item)toast(`🏆 ${item[1]} unlocked`);
}
