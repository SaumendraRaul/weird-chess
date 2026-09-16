/* Weird Chess v3.5 — real alternate game modes. */

let gameMode="classic";
let modeState={};
let modeConfig={
  suddenDeath:{startPly:12,ringEvery:8},
  evolutionRace:{target:3},
  horde:{hordeColor:"w"},
  boss:{bossColor:"b"},
  draft:{
    budget:30,
    w:{q:1,r:2,b:2,n:2,p:8},
    b:{q:1,r:2,b:2,n:2,p:8}
  }
};

const modeMeta={
  classic:{name:"Classic",icon:"♟",desc:"Standard chess objective. Weird modifiers can still be layered on top."},
  "king-hunt":{name:"King Hunt",icon:"👑",desc:"No check or checkmate. The King may move into danger; physically capture the enemy King to win."},
  horde:{name:"Horde",icon:"🧟",desc:"White's huge pawn swarm faces Black's normal army. Checkmate rules still apply."},
  "sudden-death":{name:"Sudden Death",icon:"🔥",desc:"After the opening, outer rings collapse inward. Occupied collapsing squares may be escaped, but empty burned squares become walls."},
  "evolution-race":{name:"Evolution Race",icon:"🧬",desc:"First side to complete the target number of Evolutions wins immediately. Kings never evolve."},
  draft:{name:"Draft Chess",icon:"🎲",desc:"Build both armies from a point budget. Each side always receives exactly one King."},
  boss:{name:"Boss Battle",icon:"👹",desc:"White has a normal army. Black controls a super-powered Boss King plus minions. Capture the opposing King to win."},
  infection:{name:"Infection",icon:"☠",desc:"Capture a non-King and it converts to your color, reappearing on the square your attacker came from."},
  "random-army":{name:"Random Army",icon:"🔀",desc:"Both sides receive the same randomly generated material set, arranged differently using the match seed."}
};

function isCaptureKingMode(){return gameMode==="king-hunt"||gameMode==="boss"}
function isModeBlocked(r,c){
  if(gameMode!=="sudden-death")return false;
  const ring=modeState.burnRing||0;if(ring<=0)return false;
  const edge=Math.min(r,c,7-r,7-c);
  if(edge>=ring)return false;
  return !board?.[r]?.[c];
}
function modeWinnerName(color){return color==="w"?"White":"Black"}
function modePieceValue(t){return ({p:1,n:3,b:3,r:5,q:9,k:0})[t]||0}
function draftCost(side){return Object.entries(side).reduce((n,[t,c])=>n+modePieceValue(t)*(+c||0),0)}
function modeDefaults(){
  return JSON.parse(JSON.stringify({
    suddenDeath:{startPly:12,ringEvery:8},evolutionRace:{target:3},horde:{hordeColor:"w"},boss:{bossColor:"b"},
    draft:{budget:30,w:{q:1,r:2,b:2,n:2,p:8},b:{q:1,r:2,b:2,n:2,p:8}}
  }));
}
function loadModePrefs(){
  try{
    const x=JSON.parse(localStorage.getItem("weirdChess.modes.v35")||"null");
    if(x?.modeConfig)modeConfig={...modeDefaults(),...x.modeConfig};
    if(x?.gameMode&&modeMeta[x.gameMode])gameMode=x.gameMode;
  }catch(_){}
  $("#gameMode").value=gameMode;renderModeDescription();
}
function saveModePrefs(){try{localStorage.setItem("weirdChess.modes.v35",JSON.stringify({gameMode,modeConfig}))}catch(_){}}
function renderModeDescription(){
  const m=modeMeta[$("#gameMode").value]||modeMeta.classic;
  $("#modeDesc").textContent=m.desc;
  $("#modeConfigure").disabled=!["sudden-death","evolution-race","draft","horde","boss"].includes($("#gameMode").value);
}
$("#gameMode").addEventListener("change",()=>{gameMode=$("#gameMode").value;saveModePrefs();renderModeDescription()});

function renderModeConfig(){
  const mode=$("#gameMode").value,m=modeMeta[mode];$("#modeDialogTitle").textContent=`${m.icon} ${m.name}`;
  $("#modeDialogSub").textContent=m.desc;const body=$("#modeDialogBody");
  if(mode==="sudden-death"){
    body.innerHTML=`<div class="mode-config-grid"><label>Collapse begins after <select id="modeSDStart"><option value="8">8 plies</option><option value="12">12 plies</option><option value="16">16 plies</option><option value="20">20 plies</option></select></label><label>Next ring every <select id="modeSDRing"><option value="4">4 plies</option><option value="6">6 plies</option><option value="8">8 plies</option><option value="10">10 plies</option></select></label></div>`;
    $("#modeSDStart").value=modeConfig.suddenDeath.startPly;$("#modeSDRing").value=modeConfig.suddenDeath.ringEvery;
  }else if(mode==="evolution-race"){
    body.innerHTML=`<div class="mode-config-grid"><label>Evolutions needed to win <select id="modeEvoTarget"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></label></div><div class="draft-budget">Evolution modifier is automatically enabled for this mode. Kings are permanently excluded.</div>`;
    $("#modeEvoTarget").value=modeConfig.evolutionRace.target;
  }else if(mode==="horde"){
    body.innerHTML=`<div class="mode-config-grid"><label>Horde side <select id="modeHordeSide"><option value="w">White</option><option value="b">Black</option></select></label></div>`;
    $("#modeHordeSide").value=modeConfig.horde.hordeColor;
  }else if(mode==="boss"){
    body.innerHTML=`<div class="mode-config-grid"><label>Boss side <select id="modeBossSide"><option value="b">Black</option><option value="w">White</option></select></label></div><div class="draft-budget">Boss King moves like a King + Queen + Knight. This is a King-capture mode.</div>`;
    $("#modeBossSide").value=modeConfig.boss.bossColor;
  }else if(mode==="draft"){
    const d=modeConfig.draft;
    body.innerHTML=`<div class="draft-budget">Budget: <b>${d.budget}</b> points each. King is free and mandatory. Values: Pawn 1, Knight 3, Bishop 3, Rook 5, Queen 9. Max 7 non-pawn drafted back-rank pieces + 8 pawns.</div>
    <div class="draft-grid"><span></span><span class="draft-head">WHITE</span><span class="draft-head">BLACK</span>
    ${["q","r","b","n","p"].map(t=>`<span class="draft-piece">${glyph.w[t]} ${name(t)}</span><input id="draft-w-${t}" type="number" min="0" max="${t==="p"?8:7}" value="${d.w[t]}"><input id="draft-b-${t}" type="number" min="0" max="${t==="p"?8:7}" value="${d.b[t]}">`).join("")}</div>
    <div id="draftBudgetReadout" class="draft-budget"></div>`;
    updateDraftReadout();body.querySelectorAll("input").forEach(i=>i.addEventListener("input",updateDraftReadout));
  }else body.innerHTML='<div class="draft-budget">This mode needs no extra configuration.</div>';
}
function updateDraftReadout(){
  if($("#gameMode").value!=="draft")return;
  const side=c=>Object.fromEntries(["q","r","b","n","p"].map(t=>[t,Math.max(0,+$(`#draft-${c}-${t}`)?.value||0)]));
  const w=side("w"),b=side("b"),wb=draftCost(w),bb=draftCost(b),wn=w.q+w.r+w.b+w.n,bn=b.q+b.r+b.b+b.n;
  $("#draftBudgetReadout").innerHTML=`White: <b>${wb}/${modeConfig.draft.budget}</b> points, ${wn}/7 back-rank slots • Black: <b>${bb}/${modeConfig.draft.budget}</b> points, ${bn}/7 back-rank slots`;
}
$("#modeConfigure").addEventListener("click",()=>{renderModeConfig();showDialog("modeDialog")});
$("#saveModeConfig").addEventListener("click",()=>{
  const mode=$("#gameMode").value;
  if(mode==="sudden-death"){modeConfig.suddenDeath={startPly:+$("#modeSDStart").value,ringEvery:+$("#modeSDRing").value}}
  if(mode==="evolution-race")modeConfig.evolutionRace.target=+$("#modeEvoTarget").value;
  if(mode==="horde")modeConfig.horde.hordeColor=$("#modeHordeSide").value;
  if(mode==="boss")modeConfig.boss.bossColor=$("#modeBossSide").value;
  if(mode==="draft"){
    const side=c=>Object.fromEntries(["q","r","b","n","p"].map(t=>[t,Math.max(0,+$(`#draft-${c}-${t}`).value||0)]));
    const w=side("w"),b=side("b"),wn=w.q+w.r+w.b+w.n,bn=b.q+b.r+b.b+b.n;
    if(draftCost(w)>modeConfig.draft.budget||draftCost(b)>modeConfig.draft.budget){toast("Draft exceeds the point budget.");return}
    if(wn>7||bn>7){toast("Only 7 drafted non-pawns fit beside the King.");return}
    modeConfig.draft.w=w;modeConfig.draft.b=b;
  }
  gameMode=mode;saveModePrefs();closeDialog("modeDialog");toast(`${modeMeta[gameMode].name} configured.`);
});

function clearBoard(){pieceSeq=0;board=Array.from({length:8},()=>Array(8).fill(null))}
function placeStandardSide(color){
  const back=["r","n","b","q","k","b","n","r"],home=color==="w"?7:0,pawn=color==="w"?6:1;
  for(let c=0;c<8;c++){board[home][c]=P(color,back[c]);board[pawn][c]=P(color,"p")}
}
function setupHorde(){
  clearBoard();const hc=modeConfig.horde.hordeColor,nc=enemy(hc);placeStandardSide(nc);
  const back=hc==="w"?7:0,dir=hc==="w"?-1:1;
  board[back][4]=P(hc,"k");
  for(let rr=1;rr<=3;rr++){const r=back+dir*rr;for(let c=0;c<8;c++)board[r][c]=P(hc,"p")}
  const tip=back+dir*4;for(const c of [1,2,5,6])board[tip][c]=P(hc,"p");
}
function setupBoss(){
  clearBoard();const bc=modeConfig.boss.bossColor,hc=enemy(bc);placeStandardSide(hc);
  const home=bc==="w"?7:0,pawn=bc==="w"?6:1;
  const boss=P(bc,"k");boss.boss=true;board[home][4]=boss;
  for(const c of [1,3,5,6])board[pawn][c]=P(bc,c===1||c===6?"n":"p");
}
function randomArmyTypes(){
  const types=["p","n","b","r","q"],out=[],counts={q:0};
  while(out.length<7){
    const t=types[Math.floor(gameRandom()*types.length)];
    if(t==="q"&&counts.q>=2)continue;out.push(t);counts[t]=(counts[t]||0)+1;
  }
  return out;
}
function setupRandomArmy(){
  clearBoard();const army=randomArmyTypes();
  for(const color of ["w","b"]){
    const home=color==="w"?7:0,pawn=color==="w"?6:1,slots=shuffleGame([0,1,2,3,5,6,7]),pieces=shuffleGame(army);
    board[home][4]=P(color,"k");pieces.forEach((t,i)=>board[home][slots[i]]=P(color,t));
    const pawns=Math.max(4,Math.min(8,10-pieces.filter(t=>t==="q"||t==="r").length));
    shuffleGame([0,1,2,3,4,5,6,7]).slice(0,pawns).forEach(c=>board[pawn][c]=P(color,"p"));
  }
}
function setupDraft(){
  clearBoard();
  for(const color of ["w","b"]){
    const cfg=modeConfig.draft[color],home=color==="w"?7:0,pawn=color==="w"?6:1,slots=shuffleGame([0,1,2,3,5,6,7]);
    board[home][4]=P(color,"k");let i=0;
    for(const t of ["q","r","b","n"])for(let n=0;n<(cfg[t]||0)&&i<slots.length;n++)board[home][slots[i++]]=P(color,t);
    shuffleGame([0,1,2,3,4,5,6,7]).slice(0,Math.min(8,cfg.p||0)).forEach(c=>board[pawn][c]=P(color,"p"));
  }
}
function resetModeState(){
  modeState={burnRing:0,evolutions:{w:0,b:0},finished:false};
}
function applyModeStart(){
  resetModeState();
  if(gameMode==="horde")setupHorde();
  if(gameMode==="boss")setupBoss();
  if(gameMode==="random-army")setupRandomArmy();
  if(gameMode==="draft")setupDraft();
  if(gameMode==="evolution-race"){mods.evolution=true;syncModButtons()}
  if(["horde","boss","random-army","draft"].includes(gameMode)){
    positionCount=new Map();ep=null;halfmove=0;fullmove=1;lastMove=null;moveLog=[];stats=freshStats();seedMutationSquares();relocateEvolutionGates();recordPosition();
  }
}

const _fresh35=fresh;
fresh=function(){
  gameMode=$("#gameMode").value||"classic";saveModePrefs();
  _fresh35();
  applyModeStart();
  recordEvent?.("mode",`${modeMeta[gameMode].icon} ${modeMeta[gameMode].name} started`);
  saveGame();render();
};

const _legalMoves35=legalMoves;
legalMoves=function(r,c){
  const p=board[r]?.[c];if(!p)return[];
  if(isCaptureKingMode())return pseudoMoves(r,c,p,false,board).filter(([tr,tc])=>!isModeBlocked(tr,tc));
  return _legalMoves35(r,c).filter(([tr,tc])=>!isModeBlocked(tr,tc));
};

function capturedKingWinner(){
  const w=!!findKing("w"),b=!!findKing("b");
  if(!w&&b)return"b";if(!b&&w)return"w";return null;
}
const _evaluateGame35=evaluateGame;
evaluateGame=function(){
  if(gameOver)return;
  if(isCaptureKingMode()){
    const winner=capturedKingWinner();
    if(winner){gameOver=true;outcome=`${modeWinnerName(winner)} wins by capturing the King 👑`;return}
    const any=hasAnyLegal(turn);if(!any){gameOver=true;outcome="Draw — no legal moves";return}
    if(halfmove>=100){gameOver=true;outcome="Draw by the fifty-move rule";return}
    return;
  }
  if(gameMode==="evolution-race"){
    for(const c of ["w","b"])if((modeState.evolutions?.[c]||0)>=modeConfig.evolutionRace.target){gameOver=true;outcome=`${modeWinnerName(c)} wins the Evolution Race 🧬`;return}
  }
  _evaluateGame35();
};

const _applyEvolution35=applyEvolutionChoice;
applyEvolutionChoice=function(p,r,c,newType,label){
  if(p.type==="k"){p.evoReady=false;p.kills=0;toast("Kings do not evolve.");return}
  modeState.evolutions=modeState.evolutions||{w:0,b:0};modeState.evolutions[p.color]=(modeState.evolutions[p.color]||0)+1;
  const result=_applyEvolution35(p,r,c,newType,label);
  return result;
};

function updateSuddenDeath(){
  if(gameMode!=="sudden-death")return;
  const s=modeConfig.suddenDeath,m=stats?.moves||0;
  let ring=0;if(m>=s.startPly)ring=Math.min(3,1+Math.floor((m-s.startPly)/s.ringEvery));
  if(ring>modeState.burnRing){
    modeState.burnRing=ring;announce("normal",`🔥 Ring ${ring} collapsed. The board is getting smaller.`);
    recordEvent?.("disaster",`Sudden Death collapsed ring ${ring}`);
  }
}
const _endTurn35=endTurn;
endTurn=function(){updateSuddenDeath();_endTurn35();};

const _render35=render;
render=function(){
  _render35();
  const m=modeMeta[gameMode]||modeMeta.classic;
  if($("#modePill"))$("#modePill").textContent=`${m.icon} ${m.name.toUpperCase()}`;
  document.querySelectorAll(".sq").forEach(s=>{
    const r=+s.dataset.r,c=+s.dataset.c;
    if(gameMode==="sudden-death"&&modeState.burnRing>0&&Math.min(r,c,7-r,7-c)<modeState.burnRing)s.classList.add("mode-blocked");
    const p=board?.[r]?.[c],shell=s.querySelector?.(".piece-shell");if(p?.boss&&shell)shell.classList.add("is-boss");
  });
  renderModeProgress();
};
function renderModeProgress(){
  let text="";
  if(gameMode==="evolution-race")text=`Race: White ${modeState.evolutions?.w||0}/${modeConfig.evolutionRace.target} • Black ${modeState.evolutions?.b||0}/${modeConfig.evolutionRace.target}`;
  if(gameMode==="sudden-death")text=modeState.burnRing?`🔥 Collapsed rings: ${modeState.burnRing}/3`:`🔥 Collapse starts at ply ${modeConfig.suddenDeath.startPly}`;
  if(gameMode==="horde")text=`🧟 Horde: ${modeWinnerName(modeConfig.horde.hordeColor)}`;
  if(gameMode==="boss")text=`👹 Boss: ${modeWinnerName(modeConfig.boss.bossColor)}`;
  if(text&&$("#gateHud"))$("#gateHud").insertAdjacentHTML("beforeend",`<span class="mode-progress">${text}</span>`);
}

const _renderPieceInfo35=renderPieceInfo;
renderPieceInfo=function(){
  _renderPieceInfo35();if(!sel)return;const p=board[sel[0]]?.[sel[1]];if(p?.type!=="k")return;
  const box=$("#pieceInfo");if(!box)return;
  const rows=box.querySelectorAll?.(".info-row");if(rows?.[0])rows[0].innerHTML="<span>Evolution</span><b>IMMUNE — Kings do not evolve</b>";
  const xp=box.querySelector?.(".xp-track");if(xp)xp.style.display="none";
};

const _export35=exportGameState;
exportGameState=function(){return {..._export35(),gameMode,modeState:JSON.parse(JSON.stringify(modeState)),modeConfig:JSON.parse(JSON.stringify(modeConfig))}};
const _import35=importGameState;
importGameState=function(s){_import35(s);gameMode=s.gameMode||"classic";modeState=s.modeState||{};if(s.modeConfig)modeConfig=s.modeConfig;$("#gameMode").value=gameMode;renderModeDescription()};
stateHash=function(){
  const s=exportGameState(),gameplay={rulesVersion:s.rulesVersion,gameMode:s.gameMode,modeState:s.modeState,modeConfig:s.modeConfig,matchSeed:s.matchSeed,rngState:s.rngState,startingPosition:s.startingPosition,castleState:s.castleState,ruleConfig:s.ruleConfig,board:s.board,turn:s.turn,mutationSquares:s.mutationSquares,powerUsed:s.powerUsed,gameOver:s.gameOver,outcome:s.outcome,ep:s.ep,halfmove:s.halfmove,fullmove:s.fullmove,lastMove:s.lastMove,mods:s.mods,powers:s.powers,evoGates:s.evoGates,positionCount:s.positionCount};
  let h=2166136261,str=JSON.stringify(gameplay);for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,"0");
};
gameState.version=GAME_STATE_VERSION;gameState.hash=stateHash;

const _renderEncyclopedia35=renderEncyclopedia;
renderEncyclopedia=function(){
  _renderEncyclopedia35();
  const body=$("#encyclopediaBody");if(!body)return;
  body.insertAdjacentHTML("afterbegin",Object.values(modeMeta).map(m=>`<div class="rule-card"><b>${m.icon} Mode: ${esc(m.name)}</b><p>${esc(m.desc)}</p></div>`).join(""));
  body.insertAdjacentHTML("afterbegin",'<div class="rule-card"><b>👑 Kings & Evolution</b><p>Kings never earn Evolution XP, never become Evolution Ready, never use Evolution Gates, and never evolve. King mutations/powers are separate mechanics.</p></div>');
};

const _stupid35=stupidMatch;
stupidMatch=function(){_stupid35();const choices=["classic","king-hunt","horde","sudden-death","evolution-race","boss","infection","random-army"];gameMode=choices[Math.floor(visualRandom()*choices.length)];$("#gameMode").value=gameMode;renderModeDescription();saveModePrefs()};

function modeBotBonus(m){
  if(!isCaptureKingMode())return 0;const t=board[m.tr]?.[m.tc];return t?.type==="k"?100000:0;
}
const _botMoveScore35=botMoveScore;
botMoveScore=function(m){return _botMoveScore35(m)+modeBotBonus(m)};

loadModePrefs();