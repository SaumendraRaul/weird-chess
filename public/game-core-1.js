const defs=[
 ["evolution","🧬","Evolution","2 captures + reach your moving gate"],
 ["mutation","☢️","Mutation Squares","Land there → mutate"],
 ["king","👑","King Abilities","One royal trick each"],
 ["fusion","🔗","Piece Fusion","Merge friendly non-kings"],
 ["fog","🌫️","Fog of War","Vision becomes a resource"]
];

const glyph={w:{k:"♔",q:"♕",r:"♖",b:"♗",n:"♘",p:"♙"},b:{k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"}};
const pieceValue={p:1,n:3,b:3.2,r:5,q:9,k:100};
const files="abcdefgh";
const GAME_STATE_VERSION="3.5.0";
const RULES_VERSION="weird-chess-rules-3.5";
const MUTATION_REROLL_PLIES=4;

const evoBranches={
  p:[["n","Knight Form"],["b","Bishop Form"]],
  n:[["b","Hex Bishop"],["r","Siege Rook"]],
  b:[["n","Rift Knight"],["r","Tower Rook"]],
  r:[["b","Arcane Bishop"],["q","Queen Form"]]
};
const mutationDefs={
  phase:{name:"Phase Hop",icon:"↔",desc:"Hop exactly 2 squares orthogonally."},
  rift:{name:"Rift Step",icon:"✕",desc:"Hop exactly 2 squares diagonally."},
  wild:{name:"Wild Leaper",icon:"♞",desc:"Gain knight jumps plus long 3-by-1 leaps."},
  sidewind:{name:"Sidewinder",icon:"⇆",desc:"Step sideways; from a board edge, wrap to the opposite file."}
};
const announcerLines={
  normal:["A perfectly legal move. Suspicious.","The pieces continue pretending this is chess.","Strategic. Probably.","Nobody panic. Yet."],
  capture:["Violence has entered the position.","That piece had a family.","Material advantage acquired through completely normal means.","The board demands another sacrifice."],
  check:["CHECK. Someone's crown is suddenly very decorative.","Royal panic detected.","The king would like to file a complaint."],
  fusion:["Two pieces entered. One questionable life-form left.","Fusion complete. Ethics review pending.","This is absolutely not in FIDE's handbook."],
  mutation:["Radiation builds character.","That piece has developed a concerning new skill.","Mutation successful. Biology has resigned."],
  evolution:["The gate accepts its offering.","Evolution achieved. HR has no category for this.","It worked. Nature is furious."]
};

const boardSkins={
  "purple-void":{name:"Purple Void",desc:"Signature violet board with a soft magical glow.",light:"#cbb4e6",dark:"#725099"},
  "royal-velvet":{name:"Royal Velvet",desc:"Plum velvet, warm ivory, and restrained gold trim.",light:"#e8d2c5",dark:"#6f3159"},
  "neon-night":{name:"Neon Night",desc:"Dark cyber board with electric cyan and violet highlights.",light:"#342a4a",dark:"#15111f"},
  "office-mode":{name:"Office Mode",desc:"Muted slate tones for suspiciously professional chess breaks.",light:"#d8dce5",dark:"#778094"},
  "corrupted-realm":{name:"Corrupted Realm",desc:"Dark fractured squares leaking unstable purple energy.",light:"#7d5c8f",dark:"#24152d"}
};
const pieceSkins={
  "classic-funny":{name:"Classic Funny",desc:"Recognizable chess pieces with the current goofy faces."},
  "cartoon-royals":{name:"Cartoon Royals",desc:"Chunky badge-like characters with louder expressions."},
  "arcane":{name:"Arcane Set",desc:"Rune circles, magical glows, and a faintly illegal amount of drama."},
  "cyber":{name:"Cyber Set",desc:"Hex frames, neon outlines, and glowing digital faces."},
  "minimal-elite":{name:"Minimal Elite",desc:"Clean modern pieces with the nonsense dial turned down."}
};
let boardSkin="purple-void",pieceSkin="classic-funny";

let mods={};
let board,turn,sel,history=[],mutationSquares=[],powers={},powerUsed={},gameOver=false,outcome="";
let ep=null,halfmove=0,fullmove=1,positionCount=new Map(),pendingPromotion=null,pendingEvolution=null;
let botEnabled=false,botColor="b",botDifficulty="normal",botThinking=false,botTimer=null;
let animating=false,lastMove=null,moveLog=[],viewColor="w";
let dragState=null,suppressClicksUntil=0;
let evoGates={w:null,b:null},turnTimerSeconds=0,turnDeadline=0,timerInterval=null;
let stats=null,announcerText="Welcome to Weird Chess. Try not to embarrass your bloodline.";
let soundOn=true,audioCtx=null,hapticsOn=true,allowUndo=true,currentPreset="classic",pausedTurnRemaining=null,pieceSeq=0;

let sfWorker=null,sfReady=false,sfInitPromise=null,sfInitResolve=null,sfInitReject=null,sfBestResolve=null,sfBestTimer=null;

const $=s=>document.querySelector(s);
const modsEl=$("#mods");

defs.forEach(([id,icon,n,d])=>{
  mods[id]=false;
  const e=document.createElement("button");
  e.type="button";e.className="mod";
  e.innerHTML=`<span class="mod-icon">${icon}</span><b>${n}</b><small>${d}</small>`;
  e.addEventListener("click",()=>{mods[id]=!mods[id];e.classList.toggle("on",mods[id]);currentPreset="custom";markPreset("custom");saveSetupPrefs()});
  modsEl.append(e);
});

$("#chaos").addEventListener("click",()=>{
  const allOn=Object.values(mods).every(Boolean);
  Object.keys(mods).forEach(k=>mods[k]=!allOn);
  [...modsEl.children].forEach(x=>x.classList.toggle("on",!allOn));
  currentPreset=!allOn?"chaos":"classic";markPreset(currentPreset);saveSetupPrefs();
});

$("#opponent").addEventListener("change",()=>{
  $("#botOptions").classList.toggle("hidden",$("#opponent").value!=="bot");
});
$("#boardSkin").addEventListener("change",()=>{
  boardSkin=$("#boardSkin").value;applySkins();saveSkinPrefs();
});
$("#pieceSkin").addEventListener("change",()=>{
  pieceSkin=$("#pieceSkin").value;applySkins();saveSkinPrefs();
});

$("#randomSkin").addEventListener("click",randomizeSkins);
loadSkinPrefs();
loadSoundPref();
loadHapticPref();

const presets={
  classic:[],
  "weird-lite":["evolution","mutation"],
  "evolution-war":["evolution","fusion"],
  "mutation-mayhem":["mutation"],
  "fog-duel":["fog","mutation"],
  chaos:["evolution","mutation","king","fusion","fog"],
  custom:null
};
function syncModButtons(){
  [...modsEl.children].forEach((el,i)=>el.classList.toggle("on",!!mods[defs[i][0]]));
}
function markPreset(id){document.querySelectorAll(".preset-btn").forEach(b=>b.classList.toggle("active",b.dataset.preset===id))}
function saveSetupPrefs(){
  try{localStorage.setItem("weirdChess.setup.v34",JSON.stringify({preset:currentPreset,mods,opponent:$("#opponent").value,botSide:$("#botSide").value,botDifficulty:$("#botDifficulty").value,turnTimer:$("#turnTimer").value,allowUndo:$("#allowUndo").value,whitePower:$("#whitePower").value,blackPower:$("#blackPower").value}))}catch(_){}
}
function loadSetupPrefs(){
  try{
    const s=JSON.parse(localStorage.getItem("weirdChess.setup.v34")||"null");if(!s)return;
    currentPreset=s.preset||"classic";if(s.mods)Object.assign(mods,s.mods);syncModButtons();markPreset(currentPreset);
    [["opponent",s.opponent],["botSide",s.botSide],["botDifficulty",s.botDifficulty],["turnTimer",s.turnTimer],["allowUndo",s.allowUndo],["whitePower",s.whitePower],["blackPower",s.blackPower]].forEach(([id,v])=>{if(v!=null&&$("#"+id))$("#"+id).value=String(v)});
    $("#botOptions").classList.toggle("hidden",$("#opponent").value!=="bot");
  }catch(_){}
}
function applyPreset(id){
  if(id!=="custom"){
    const enabled=new Set(presets[id]||[]);
    Object.keys(mods).forEach(k=>mods[k]=enabled.has(k));
    syncModButtons();
  }
  currentPreset=id;markPreset(id);saveSetupPrefs();
}
document.querySelectorAll(".preset-btn").forEach(b=>b.addEventListener("click",()=>applyPreset(b.dataset.preset)));
["opponent","botSide","botDifficulty","turnTimer","allowUndo","whitePower","blackPower"].forEach(id=>$("#"+id)?.addEventListener("change",saveSetupPrefs));
loadSetupPrefs();

function P(color,type){return {id:`${color}-${++pieceSeq}`,color,type,kills:0,mut:null,fused:null,moved:false,evoReady:false,evoLevel:0,evoName:null,captures:0,checks:0,evolutions:0,mutations:0,fusions:0}}

function cloneBoard(b){return b.map(row=>row.map(p=>p?JSON.parse(JSON.stringify(p)):null))}
function announce(type="normal",custom=null){
  const list=announcerLines[type]||announcerLines.normal;
  announcerText=custom||list[Math.floor(visualRandom()*list.length)];
  const el=$("#announcer");if(el)el.textContent=announcerText;
}
function playSfx(type="move"){
  if(!soundOn)return;
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    const now=audioCtx.currentTime;
    const tone=(freq,start,dur,vol=.035,kind="sine")=>{
      const o=audioCtx.createOscillator(),g=audioCtx.createGain();
      o.type=kind;o.frequency.setValueAtTime(freq,now+start);
      g.gain.setValueAtTime(.0001,now+start);g.gain.exponentialRampToValueAtTime(vol,now+start+.012);
      g.gain.exponentialRampToValueAtTime(.0001,now+start+dur);
      o.connect(g);g.connect(audioCtx.destination);o.start(now+start);o.stop(now+start+dur+.03);
    };
    if(type==="capture"){tone(150,0,.12,.055,"square");tone(95,.05,.16,.035,"sine")}
    else if(type==="check"){tone(520,0,.1,.04,"triangle");tone(680,.1,.14,.04,"triangle")}
    else if(type==="mutation"){tone(330,0,.09,.035,"sawtooth");tone(495,.08,.1,.03,"triangle");tone(740,.16,.14,.025,"sine")}
    else if(type==="evolution"){tone(392,0,.11,.035);tone(523,.09,.11,.035);tone(659,.18,.18,.04)}
    else if(type==="fusion"){tone(210,0,.15,.04,"triangle");tone(315,.05,.18,.035,"sawtooth")}
    else tone(245,0,.07,.025,"triangle");
  }catch(_){}
}
function loadSoundPref(){
  try{soundOn=localStorage.getItem("weirdChess.sound")!=="off"}catch(_){}
  const b=$("#soundBtn");if(b)b.textContent=soundOn?"🔊 Sound":"🔇 Muted";
}
function loadHapticPref(){
  try{hapticsOn=localStorage.getItem("weirdChess.haptics")!=="off"}catch(_){}
  const b=$("#hapticBtn");if(b)b.textContent=hapticsOn?"📳 Haptics":"📴 Haptics";
}
function haptic(type="move"){
  if(!hapticsOn||!navigator.vibrate)return;
  const patterns={move:8,capture:22,check:[28,35,28],mutation:[12,22,12],evolution:[18,28,45],fusion:[18,18,30]};
  try{navigator.vibrate(patterns[type]||8)}catch(_){}
}
function currentTurnRemaining(){
  if(!turnTimerSeconds)return 0;
  if(pausedTurnRemaining!=null)return pausedTurnRemaining;
  return Math.max(0,turnDeadline-Date.now());
}
function pauseTurnClock(){
  if(!turnTimerSeconds)return;
  pausedTurnRemaining=currentTurnRemaining();clearInterval(timerInterval);timerInterval=null;updateTimerDisplays();
}

function formatTime(ms){
  const total=Math.max(0,Math.ceil(ms/1000));
  const m=Math.floor(total/60),s=total%60;
  return `${m}:${String(s).padStart(2,"0")}`;
}
function updateTimerDisplays(){
  if(!turnTimerSeconds)return;
  const remain=currentTurnRemaining();
  ["w","b"].forEach(c=>{
    const el=document.getElementById(`timer-${c}`);if(!el)return;
    if(botEnabled&&c===botColor&&c===turn&&botThinking){el.textContent="BOT";el.classList.remove("danger");return}
    el.textContent=c===turn?formatTime(remain):formatTime(turnTimerSeconds*1000);
    el.classList.toggle("danger",c===turn&&remain<=10000&&!(botEnabled&&c===botColor));
  });
}
function startTurnClock(remainingMs=null){
  clearInterval(timerInterval);timerInterval=null;pausedTurnRemaining=null;
  if(!turnTimerSeconds||gameOver)return;
  if(botEnabled&&turn===botColor){turnDeadline=Date.now()+turnTimerSeconds*1000;updateTimerDisplays();return}
  turnDeadline=Date.now()+(remainingMs??turnTimerSeconds*1000);
  updateTimerDisplays();
  timerInterval=setInterval(()=>{
    const remain=turnDeadline-Date.now();updateTimerDisplays();
    if(remain<=0){
      clearInterval(timerInterval);timerInterval=null;
      gameOver=true;outcome=`${turn==="w"?"White":"Black"} ran out of time — ${turn==="w"?"Black":"White"} wins ⏱`;
      announce("normal","The clock has spoken. Brutally.");haptic("check");clearSavedMatch();render();showEndDialog();
    }
  },250);
}
function ownPieces(color){
  const out=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.color===color)out.push([r,c]);
  return out;
}
function pickHardEvolutionGate(color,banned=null){
  const own=ownPieces(color),ready=[];
  for(const [r,c] of own){const p=board[r][c];if(p?.evoReady&&p.type!=="q"&&p.type!=="k")ready.push([r,c,p])}
  let candidates=[];
  if(ready.length){
    for(const [pr,pc] of ready){
      for(const [r,c] of legalMoves(pr,pc)){
        if(board[r][c])continue;
        if(banned&&banned.r===r&&banned.c===c)continue;
        const enemyControlled=isSquareAttacked(r,c,enemy(color));
        const deep=color==="w"?(7-r):r;
        const edge=(r===0||r===7||c===0||c===7)?1:0;
        candidates.push({r,c,score:deep*.55+edge*.3-(enemyControlled?1.25:0)+gameRandom()*1.4});
      }
    }
  }
  if(!candidates.length){
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      if(board[r][c]||(banned&&banned.r===r&&banned.c===c))continue;
      if(color==="w"&&r>3)continue;if(color==="b"&&r<4)continue;
      const minDist=own.length?Math.min(...own.map(([pr,pc])=>Math.abs(pr-r)+Math.abs(pc-c))):0;
      const controlled=isSquareAttacked(r,c,enemy(color));
      candidates.push({r,c,score:minDist-(controlled?.65:0)+gameRandom()*1.2});
    }
  }
  const unique=new Map();for(const x of candidates){const k=`${x.r},${x.c}`;if(!unique.has(k)||unique.get(k).score<x.score)unique.set(k,x)}
  candidates=[...unique.values()].sort((a,b)=>b.score-a.score);
  const pool=candidates.slice(0,Math.min(6,candidates.length));
  return pool.length?pool[Math.floor(gameRandom()*pool.length)]:null;
}
