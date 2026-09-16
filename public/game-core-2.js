function relocateEvolutionGates(announceMove=false){
  if(!mods.evolution){evoGates={w:null,b:null};return}
  const w=pickHardEvolutionGate("w",null),b=pickHardEvolutionGate("b",w);
  evoGates={w:w?{r:w.r,c:w.c}:null,b:b?{r:b.r,c:b.c}:null};
  if(announceMove&&evoGates[turn])toast(`✦ ${turn==="w"?"White":"Black"} gate moved to ${coord(evoGates[turn].r,evoGates[turn].c)}`);
}
function isOwnEvolutionGate(color,r,c){
  const g=evoGates[color];return !!g&&g.r===r&&g.c===c;
}
function randomMutation(){
  const keys=Object.keys(mutationDefs);return keys[Math.floor(gameRandom()*keys.length)];
}
function normalizeMutationSquares(list){return (list||[]).map((x,i)=>Array.isArray(x)?{r:x[0],c:x[1],type:Object.keys(mutationDefs)[i%Object.keys(mutationDefs).length]}:{r:x.r,c:x.c,type:mutationDefs[x.type]?x.type:randomMutation()})}
function mutationAt(r,c){return mutationSquares.find(x=>x.r===r&&x.c===c)||null}
function seedMutationSquares(){
  const positions=shuffleGame([[2,2],[2,5],[5,2],[5,5],[3,1],[3,6],[4,1],[4,6]]).slice(0,ruleConfig.mutationSquareCount),types=shuffleGame(Object.keys(mutationDefs));
  mutationSquares=positions.map(([r,c],i)=>({r,c,type:types[i%types.length]}));
}
function relocateMutationSquares(){
  if(!mods.mutation)return;
  const pool=[];for(let r=1;r<7;r++)for(let c=0;c<8;c++)if(!board[r][c])pool.push([r,c]);
  const shuffled=shuffleGame(pool),types=shuffleGame(Object.keys(mutationDefs));
  mutationSquares=shuffled.slice(0,ruleConfig.mutationSquareCount).map(([r,c],i)=>({r,c,type:types[i%types.length]}));
  toast("☢ Mutation squares shifted.");
}
function exportGameState(){
  return {version:GAME_STATE_VERSION,board,turn,mutationSquares,powerUsed,gameOver,outcome,ep,halfmove,fullmove,lastMove,moveLog,mods:{...mods},powers:{...powers},botEnabled,botColor,botDifficulty,viewColor,evoGates,turnTimerSeconds,turnRemaining:currentTurnRemaining(),stats,boardSkin,pieceSkin,announcerText,positionCount:[...positionCount],allowUndo,currentPreset,hapticsOn};
}
function importGameState(s){
  if(!s||s.version!==GAME_STATE_VERSION)throw new Error("incompatible-save");
  board=s.board;turn=s.turn;mutationSquares=normalizeMutationSquares(s.mutationSquares);powerUsed=s.powerUsed||{w:false,b:false};gameOver=!!s.gameOver;outcome=s.outcome||"";ep=s.ep;halfmove=s.halfmove||0;fullmove=s.fullmove||1;lastMove=s.lastMove;moveLog=s.moveLog||[];
  Object.assign(mods,s.mods||{});powers=s.powers||{w:"blink",b:"blink"};botEnabled=!!s.botEnabled;botColor=s.botColor||"b";botDifficulty=s.botDifficulty||"normal";viewColor=s.viewColor||"w";evoGates=s.evoGates||{w:null,b:null};turnTimerSeconds=s.turnTimerSeconds||0;stats=s.stats||freshStats();boardSkin=s.boardSkin||boardSkin;pieceSkin=s.pieceSkin||pieceSkin;announcerText=s.announcerText||announcerText;positionCount=new Map(s.positionCount||[]);allowUndo=s.allowUndo!==false;currentPreset=s.currentPreset||"custom";hapticsOn=s.hapticsOn!==false;pausedTurnRemaining=s.turnRemaining??null;
}
function stateHash(){
  const s=exportGameState();
  const gameplay={version:s.version,board:s.board,turn:s.turn,mutationSquares:s.mutationSquares,powerUsed:s.powerUsed,gameOver:s.gameOver,outcome:s.outcome,ep:s.ep,halfmove:s.halfmove,fullmove:s.fullmove,lastMove:s.lastMove,mods:s.mods,powers:s.powers,evoGates:s.evoGates,positionCount:s.positionCount};
  let h=2166136261,str=JSON.stringify(gameplay);for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,"0");
}
const gameState={version:GAME_STATE_VERSION,get data(){return exportGameState()},replace(s){importGameState(s);render()},hash:stateHash};
window.gameState=gameState;window.WeirdChessState=gameState;
function saveGame(){
  if(gameOver)return clearSavedMatch();
  try{localStorage.setItem("weirdChess.savedMatch",JSON.stringify(exportGameState()));$("#resumeBanner")?.classList.remove("hidden")}catch(_){}
}
function clearSavedMatch(){
  try{localStorage.removeItem("weirdChess.savedMatch")}catch(_){}
  $("#resumeBanner")?.classList.add("hidden");
}
function hasSavedMatch(){
  try{const s=JSON.parse(localStorage.getItem("weirdChess.savedMatch")||"null");if(!s)return false;if(s.version!==GAME_STATE_VERSION){localStorage.removeItem("weirdChess.savedMatch");return false}return true}catch(_){return false}
}
function resumeSavedMatch(){
  try{
    const s=JSON.parse(localStorage.getItem("weirdChess.savedMatch")||"null");if(!s)return;importGameState(s);
    syncModButtons();markPreset(currentPreset);history=[];pendingPromotion=null;pendingEvolution=null;sel=null;
    $("#opponent").value=botEnabled?"bot":"human";$("#botOptions").classList.toggle("hidden",!botEnabled);$("#botSide").value=botColor;$("#botDifficulty").value=botDifficulty;$("#turnTimer").value=String(turnTimerSeconds);$("#allowUndo").value=allowUndo?"yes":"no";$("#whitePower").value=powers.w;$("#blackPower").value=powers.b;$("#boardSkin").value=boardSkin;$("#pieceSkin").value=pieceSkin;applySkins();loadHapticPref();
    $("#setup").classList.add("hidden");$("#game").classList.remove("hidden");$("#endDialog").classList.add("hidden");render();startTurnClock(s.turnRemaining||null);maybeBotMove();
  }catch(e){clearSavedMatch();toast(e.message==="incompatible-save"?"Old save cleared after the v3.3 upgrade.":"Saved match was corrupted. Very on-brand.")}
}
function freshStats(){
  return {moves:0,captures:0,checks:0,evolutions:0,mutations:0,fusions:0,startedAt:Date.now()};
}

function inside(r,c){return r>=0&&r<8&&c>=0&&c<8}
function enemy(c){return c==="w"?"b":"w"}
function coord(r,c){return files[c]+(8-r)}
function hasWeirdRules(){return Object.values(mods).some(Boolean)}
function usesStockfish(){return botEnabled&&["high","storkpiss"].includes(botDifficulty)&&!hasWeirdRules()&&startingPosition==="standard"}
function botLabel(){
  if(!botEnabled)return "";
  return {easy:"Easy Bot",normal:"Normal Bot",high:"High • 1500",storkpiss:"StorkPiss • 3000"}[botDifficulty];
}

function saveSkinPrefs(){
  try{
    localStorage.setItem("weirdChess.boardSkin",boardSkin);
    localStorage.setItem("weirdChess.pieceSkin",pieceSkin);
  }catch(_){}
}
function loadSkinPrefs(){
  try{
    const b=localStorage.getItem("weirdChess.boardSkin");
    const p=localStorage.getItem("weirdChess.pieceSkin");
    if(boardSkins[b])boardSkin=b;
    if(pieceSkins[p])pieceSkin=p;
  }catch(_){}
  $("#boardSkin").value=boardSkin;
  $("#pieceSkin").value=pieceSkin;
  applySkins();
}
function applySkins(){
  document.documentElement.dataset.boardSkin=boardSkin;
  document.documentElement.dataset.pieceSkin=pieceSkin;
  $("#boardSkinDesc").textContent=boardSkins[boardSkin].desc;
  $("#pieceSkinDesc").textContent=pieceSkins[pieceSkin].desc;
  renderSkinPreviews();
}
function renderSkinPreviews(){
  const b=$("#boardPreview"),p=$("#piecePreview");
  const bs=boardSkins[boardSkin];
  b.style.setProperty("--preview-light",bs.light);
  b.style.setProperty("--preview-dark",bs.dark);
  b.style.setProperty("--preview-white","#fffaff");
  b.style.setProperty("--preview-black","#120c17");
  b.innerHTML=Array.from({length:16},(_,i)=>`<span>${[1,6,9,14].includes(i)?(i<8?"♞":"♘"):""}</span>`).join("");

  const ps=pieceSkin;
  const skinColors={
    "classic-funny":["#cbb4e6","#725099","#fffaff","#120c17"],
    "cartoon-royals":["#e5c9f3","#7b539d","#fffaff","#17101d"],
    "arcane":["#3c254d","#1f1329","#f7e7ff","#0b0710"],
    "cyber":["#24304c","#11151f","#eaffff","#090d13"],
    "minimal-elite":["#d9dbe2","#7e8490","#ffffff","#151019"]
  }[ps];
  p.style.setProperty("--preview-light",skinColors[0]);
  p.style.setProperty("--preview-dark",skinColors[1]);
  p.style.setProperty("--preview-white",skinColors[2]);
  p.style.setProperty("--preview-black",skinColors[3]);
  const pieces=["","♜","","♝","","♛","","♞","","♘","","♕","","♗","","♖"];
  p.innerHTML=pieces.map((g,i)=>`<span>${g?`<span class="preview-piece ${i<8?"preview-black":"preview-white"}">${g}</span>`:""}</span>`).join("");
}
function randomizeSkins(){
  const boards=Object.keys(boardSkins),pieces=Object.keys(pieceSkins);
  boardSkin=boards[Math.floor(visualRandom()*boards.length)];
  pieceSkin=pieces[Math.floor(visualRandom()*pieces.length)];
  $("#boardSkin").value=boardSkin;$("#pieceSkin").value=pieceSkin;
  applySkins();saveSkinPrefs();
}

function fresh(){
  pieceSeq=0;
  board=Array.from({length:8},()=>Array(8).fill(null));
  const back=["r","n","b","q","k","b","n","r"];
  for(let c=0;c<8;c++){
    board[0][c]=P("b",back[c]);board[1][c]=P("b","p");
    board[6][c]=P("w","p");board[7][c]=P("w",back[c]);
  }
  turn="w";sel=null;history=[];gameOver=false;outcome="";ep=null;halfmove=0;fullmove=1;
  positionCount=new Map();pendingPromotion=null;pendingEvolution=null;lastMove=null;moveLog=[];animating=false;
  powerUsed={w:false,b:false};seedMutationSquares();
  powers={w:$("#whitePower").value,b:$("#blackPower").value};
  boardSkin=$("#boardSkin").value;pieceSkin=$("#pieceSkin").value;applySkins();saveSkinPrefs();
  botEnabled=$("#opponent").value==="bot";botColor=$("#botSide").value;botDifficulty=$("#botDifficulty").value;
  viewColor=botEnabled?enemy(botColor):"w";turnTimerSeconds=Number($("#turnTimer").value)||0;allowUndo=$("#allowUndo").value!=="no";
  stats=freshStats();announcerText="Welcome to Weird Chess. Try not to embarrass your bloodline.";
  botThinking=false;if(botTimer){clearTimeout(botTimer);botTimer=null}
  relocateEvolutionGates();recordPosition();saveSetupPrefs();saveGame();
}

function baseDirs(t){
  if(t==="b")return [[1,1],[1,-1],[-1,1],[-1,-1]];
  if(t==="r")return [[1,0],[-1,0],[0,1],[0,-1]];
  if(t==="q")return [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  return [];
}

function pseudoMoves(r,c,p,attacks=false,bstate=board){
  let out=[];
  const add=(rr,cc)=>{
    if(!inside(rr,cc))return false;
    if(typeof isModeBlocked==="function"&&isModeBlocked(rr,cc))return false;
    const t=bstate[rr][cc];
    if(!t){out.push([rr,cc]);return true}
    if(t.color!==p.color)out.push([rr,cc]);
    return false;
  };
  const slide=dirs=>dirs.forEach(([dr,dc])=>{
    let rr=r+dr,cc=c+dc;
    while(inside(rr,cc)){if(!add(rr,cc))break;rr+=dr;cc+=dc}
  });

  if(p.type==="p"){
    const d=p.color==="w"?-1:1;
    if(attacks){
      [-1,1].forEach(dc=>{const rr=r+d,cc=c+dc;if(inside(rr,cc))out.push([rr,cc])});
    }else{
      const rr=r+d;
      if(inside(rr,c)&&!bstate[rr][c]){
        out.push([rr,c]);
        const home=p.color==="w"?6:1;
        if(r===home&&!p.moved&&inside(r+2*d,c)&&!bstate[r+2*d][c])out.push([r+2*d,c]);
      }
      [-1,1].forEach(dc=>{
        const tr=r+d,tc=c+dc;if(!inside(tr,tc))return;
        if(bstate[tr][tc]&&bstate[tr][tc].color!==p.color)out.push([tr,tc]);
        if(ep&&ep.r===tr&&ep.c===tc&&ep.color!==p.color)out.push([tr,tc]);
      });
    }
  }
  if(p.type==="n")[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([a,b])=>add(r+a,c+b));
  if(["b","r","q"].includes(p.type))slide(baseDirs(p.type));
  if(p.type==="k"){
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if(a||b)add(r+a,c+b);
    if(p.boss){
      slide([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
      [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([a,b])=>add(r+a,c+b));
    }
    if(!attacks&&!p.moved){
      castleMovesFor(r,c,p,bstate).forEach(x=>out.push(x));
    }
  }
  if(p.fused){
    const ghost={...p,type:p.fused,fused:null};
    pseudoMoves(r,c,ghost,attacks,bstate).forEach(x=>out.push(x));
  }
  if(p.mut==="phase"||p.mut===true)[[0,2],[0,-2],[2,0],[-2,0]].forEach(([a,b])=>add(r+a,c+b));
  if(p.mut==="rift")[[2,2],[2,-2],[-2,2],[-2,-2]].forEach(([a,b])=>add(r+a,c+b));
  if(p.mut==="wild")[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2],[3,1],[3,-1],[-3,1],[-3,-1],[1,3],[1,-3],[-1,3],[-1,-3]].forEach(([a,b])=>add(r+a,c+b));
  if(p.mut==="sidewind"){{[[0,1],[0,-1]].forEach(([a,b])=>add(r+a,c+b));if(c===0)add(r,7);if(c===7)add(r,0)}}
  return dedupe(out);
}
