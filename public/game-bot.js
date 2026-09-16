function botMoveScore(m){
  const p=board[m.sr][m.sc],target=board[m.tr][m.tc];
  let score=gameRandom()*.75;
  if(target)score+=pieceValue[target.type]*12-pieceValue[p.type]*.25;
  if(p.type==="p"&&!target&&m.sc!==m.tc&&ep)score+=12;
  if(p.type==="p"&&(m.tr===0||m.tr===7))score+=75;
  const dist=Math.abs(3.5-m.tr)+Math.abs(3.5-m.tc);score+=(7-dist)*.35;
  if(p.type==="k"&&Math.abs(m.tc-m.sc)===2)score+=6;
  if(p.fused)score+=pieceValue[p.fused]*.6;
  if(mods.evolution&&p.evoReady&&evoGates[p.color]){
    const g=evoGates[p.color];
    const before=Math.abs(m.sr-g.r)+Math.abs(m.sc-g.c);
    const after=Math.abs(m.tr-g.r)+Math.abs(m.tc-g.c);
    score+=(before-after)*4;
    if(m.tr===g.r&&m.tc===g.c)score+=95;
  }
  if(mods.mutation&&!p.mut&&mutationAt(m.tr,m.tc))score+=14;
  const b=cloneBoard(board);applyMoveToState(b,m);
  if(inCheck(enemy(p.color),b))score+=8;
  const king=findKing(p.color,b);if(king){let danger=0;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(inside(king[0]+dr,king[1]+dc)&&isSquareAttacked(king[0]+dr,king[1]+dc,enemy(p.color),b))danger++;score-=danger*(botDifficulty==="normal"?1.2:.55)}
  return score;
}
function chooseCustomBotMove(strong=false){
  let moves=allLegalMovesFor(botColor).map(m=>({...m,kind:"move"}));
  if(mods.fusion){for(let sr=0;sr<8;sr++)for(let sc=0;sc<8;sc++){const p=board[sr][sc];if(!p||p.color!==botColor)continue;for(let tr=0;tr<8;tr++)for(let tc=0;tc<8;tc++)if(canFuse(sr,sc,tr,tc))moves.push({sr,sc,tr,tc,kind:"fusion"})}}
  if(!moves.length)return null;
  const scored=moves.map(m=>({m,score:m.kind==="fusion"?(pieceValue[board[m.sr][m.sc].type]+pieceValue[board[m.tr][m.tc].type])*.9+8:botMoveScore(m)})).sort((a,b)=>b.score-a.score);
  if(botDifficulty==="easy"){
    if(gameRandom()<.72){const bottom=scored.slice(Math.floor(scored.length*.45));return (bottom[Math.floor(gameRandom()*bottom.length)]||scored.at(-1)).m}
    return scored[Math.floor(gameRandom()*Math.min(5,scored.length))].m;
  }
  if(strong){for(const x of scored.slice(0,Math.min(12,scored.length))){if(x.m.kind==="fusion")continue;const b=cloneBoard(board);applyMoveToState(b,x.m);const original=board;board=b;try{x.score-=allLegalMovesFor(enemy(botColor)).length*.025}finally{board=original}}scored.sort((a,b)=>b.score-a.score)}
  return scored[0].m;
}

function boardToFen(){
  const rows=[];
  for(let r=0;r<8;r++){
    let row="",empty=0;
    for(let c=0;c<8;c++){
      const p=board[r][c];
      if(!p){empty++;continue}
      if(empty){row+=empty;empty=0}
      let ch=p.type; if(p.color==="w")ch=ch.toUpperCase(); row+=ch;
    }
    if(empty)row+=empty;rows.push(row);
  }
  let castle="";
  const wk=board[7][4],bk=board[0][4];
  if(wk?.type==="k"&&wk.color==="w"&&!wk.moved){
    if(board[7][7]?.type==="r"&&board[7][7].color==="w"&&!board[7][7].moved)castle+="K";
    if(board[7][0]?.type==="r"&&board[7][0].color==="w"&&!board[7][0].moved)castle+="Q";
  }
  if(bk?.type==="k"&&bk.color==="b"&&!bk.moved){
    if(board[0][7]?.type==="r"&&board[0][7].color==="b"&&!board[0][7].moved)castle+="k";
    if(board[0][0]?.type==="r"&&board[0][0].color==="b"&&!board[0][0].moved)castle+="q";
  }
  return `${rows.join("/")} ${turn} ${castle||"-"} ${ep?coord(ep.r,ep.c):"-"} ${halfmove} ${fullmove}`;
}
function uciToMove(uci){
  if(!uci||uci==="(none)"||uci.length<4)return null;
  const sc=files.indexOf(uci[0]),sr=8-Number(uci[1]),tc=files.indexOf(uci[2]),tr=8-Number(uci[3]);
  if(!inside(sr,sc)||!inside(tr,tc))return null;
  return {sr,sc,tr,tc,promotion:uci[4]||null};
}
function ensureStockfish(){
  if(sfReady)return Promise.resolve();
  if(sfInitPromise)return sfInitPromise;
  sfInitPromise=new Promise((resolve,reject)=>{
    sfInitResolve=resolve;sfInitReject=reject;
    try{sfWorker=new Worker("./engine/stockfish-18-lite-single.js")}
    catch(err){reject(err);return}
    const timeout=setTimeout(()=>{
      if(!sfReady){sfInitPromise=null;reject(new Error("Stockfish load timeout"))}
    },15000);
    sfWorker.addEventListener("message",e=>{
      const line=typeof e.data==="string"?e.data:String(e.data||"");
      if(line==="uciok"){sfWorker.postMessage("isready");return}
      if(line==="readyok"&&!sfReady){
        clearTimeout(timeout);sfReady=true;if(sfInitResolve)sfInitResolve();return;
      }
      if(line.startsWith("bestmove ")&&sfBestResolve){
        const move=line.split(/\s+/)[1];
        const resolveMove=sfBestResolve;sfBestResolve=null;
        clearTimeout(sfBestTimer);sfBestTimer=null;resolveMove(move);
      }
    });
    sfWorker.addEventListener("error",err=>{
      clearTimeout(timeout);sfInitPromise=null;
      if(sfInitReject)sfInitReject(err);
    });
    sfWorker.postMessage("uci");
  });
  return sfInitPromise;
}
async function getStockfishMove(elo){
  await ensureStockfish();
  sfWorker.postMessage("setoption name UCI_LimitStrength value true");
  sfWorker.postMessage(`setoption name UCI_Elo value ${elo}`);
  sfWorker.postMessage(`position fen ${boardToFen()}`);
  const think=elo>=2500?1100:550;
  return await new Promise(resolve=>{
    sfBestResolve=resolve;
    sfBestTimer=setTimeout(()=>{
      if(sfBestResolve){sfWorker.postMessage("stop")}
    },Math.max(think+2500,5000));
    sfWorker.postMessage(`go movetime ${think}`);
  });
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function maybeBotMove(){
  if(!botEnabled||gameOver||pendingPromotion||pendingEvolution||turn!==botColor||botThinking||animating)return;
  botThinking=true;sel=null;pauseTurnClock();render();
  const start=performance.now();
  const minDelay={
    easy:650+visualRandom()*450,
    normal:850+visualRandom()*550,
    high:950+visualRandom()*500,
    storkpiss:1150+visualRandom()*650
  }[botDifficulty];

  let move=null;
  try{
    if(usesStockfish()){
      const uci=await getStockfishMove(botDifficulty==="high"?1500:3000);
      move=uciToMove(uci);
      if(move&&!legalMoves(move.sr,move.sc).some(x=>x[0]===move.tr&&x[1]===move.tc))move=null;
    }
  }catch(err){
    toast("Stockfish couldn't load — Weird Engine is taking over.");
  }
  if(!move)move=chooseCustomBotMove(["high","storkpiss"].includes(botDifficulty));

  const remaining=Math.max(0,minDelay-(performance.now()-start));
  await sleep(remaining);
  if(!botEnabled||gameOver||turn!==botColor){botThinking=false;render();return}
  botThinking=false;
  if(!move){evaluateGame();render();return}
  if(move.kind==="fusion")performFusion(move.sr,move.sc,move.tr,move.tc);else commitMove(move.sr,move.sc,move.tr,move.tc,move.promotion);
}
function endTurn(){
  sel=null;if(turn==="b")fullmove++;turn=enemy(turn);
  if(mods.evolution&&stats.moves>0&&stats.moves%ruleConfig.gateRerollPlies===0)relocateEvolutionGates(true);
  if(mods.mutation&&stats.moves>0&&stats.moves%ruleConfig.mutationRerollPlies===0)relocateMutationSquares();
  recordPosition();evaluateGame();
  if(!gameOver&&inCheck(turn)){stats.checks++;const lm=lastMove&&board[lastMove.tr]?.[lastMove.tc];if(lm)lm.checks=(lm.checks||0)+1;announce("check");playSfx("check");haptic("check")}
  render();if(gameOver){showEndDialog();return}
  startTurnClock();saveGame();maybeBotMove();
}

$("#soundBtn").addEventListener("click",()=>{
  soundOn=!soundOn;
  try{localStorage.setItem("weirdChess.sound",soundOn?"on":"off")}catch(_){}
  loadSoundPref();
  if(soundOn)playSfx("move");
});

$("#hapticBtn").addEventListener("click",()=>{hapticsOn=!hapticsOn;try{localStorage.setItem("weirdChess.haptics",hapticsOn?"on":"off")}catch(_){}loadHapticPref();if(hapticsOn)haptic("move")});

$("#powerBtn").addEventListener("click",()=>{
  if(powerUsed[turn]||gameOver||pendingPromotion||pendingEvolution||botThinking||animating||(botEnabled&&turn===botColor))return;
  const power=powers[turn];
  if(power==="revive"){
    const row=turn==="w"?6:1,spots=[];
    for(let c=0;c<8;c++)if(!board[row][c])spots.push(c);
    if(!spots.length){toast("No room for your undead pawn.");return}
    snapshot();const c=spots[0];board[row][c]=P(turn,"p");
    if(inCheck(turn)){restore(JSON.parse(history.pop()));toast("Revival can't leave your king in check.");return}
    powerUsed[turn]=true;halfmove=0;ep=null;moveLog.push({color:turn,text:"REVIVE"});toast("🧟 Pawn revived. HR has questions.");endTurn();return;
  }
  if(power==="blink"){
    const k=findKing(turn);if(!k)return;
    board[k[0]][k[1]].mut="phase";powerUsed[turn]=true;sel=k;announce("mutation","The king has learned to blink. This seems unfair.");toast("✨ Blink armed: the king gained Phase Hop.");render();
  }
});

$("#undo").addEventListener("click",()=>{
  if(!history.length||pendingPromotion||pendingEvolution||botThinking||animating)return;
  if(botEnabled){
    if(history.length<2){toast("Make a full turn first, then rewind.");return}
    restore(JSON.parse(history.pop()));restore(JSON.parse(history.pop()));
  }else restore(JSON.parse(history.pop()));
  render();startTurnClock();saveGame();
});

$("#start").addEventListener("click",()=>{
  clearSavedMatch();fresh();$("#setup").classList.add("hidden");$("#game").classList.remove("hidden");$("#endDialog").classList.add("hidden");
  render();startTurnClock();saveGame();maybeBotMove();
});
$("#resumeGame").addEventListener("click",resumeSavedMatch);
$("#rematch").addEventListener("click",()=>{
  $("#endDialog").classList.add("hidden");fresh();render();startTurnClock();saveGame();maybeBotMove();
});
function returnToSetup(){
  if(botTimer){clearTimeout(botTimer);botTimer=null}
  clearInterval(timerInterval);timerInterval=null;botThinking=false;animating=false;dragState=null;
  $("#endDialog").classList.add("hidden");$("#game").classList.add("hidden");$("#setup").classList.remove("hidden");
  $("#resumeBanner").classList.toggle("hidden",!hasSavedMatch());
}
$("#newGame").addEventListener("click",returnToSetup);
$("#endNewGame").addEventListener("click",()=>{clearSavedMatch();returnToSetup()});
$("#resumeBanner").classList.toggle("hidden",!hasSavedMatch());

if("serviceWorker" in navigator&&location.protocol!=="file:"){
  navigator.serviceWorker.register("./sw.js").then(reg=>{
    const show=()=>$("#updateBanner")?.classList.remove("hidden");
    if(reg.waiting)show();
    reg.addEventListener("updatefound",()=>{const w=reg.installing;if(!w)return;w.addEventListener("statechange",()=>{if(w.state==="installed"&&navigator.serviceWorker.controller)show()})});
  }).catch(()=>{});
  navigator.serviceWorker.addEventListener("controllerchange",()=>location.reload());
}
$("#reloadUpdate")?.addEventListener("click",async()=>{const reg=await navigator.serviceWorker.getRegistration();if(reg?.waiting)reg.waiting.postMessage({type:"SKIP_WAITING"});else location.reload()});