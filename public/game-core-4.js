function renderMoveLog(){
  const box=$("#moveList");
  if(!moveLog.length){box.innerHTML='<div class="empty-moves">No crimes committed yet.</div>';return}
  let html="";
  for(let i=0;i<moveLog.length;i+=2){
    const no=Math.floor(i/2)+1,w=moveLog[i]?.text||"",b=moveLog[i+1]?.text||"";
    html+=`<div class="move-row"><b>${no}.</b><span class="move-cell">${w}</span><span class="move-cell">${b}</span></div>`;
  }
  box.innerHTML=html;box.scrollTop=box.scrollHeight;
}
function snapshot(){history.push(JSON.stringify(exportGameState()))}
function restore(s){
  const keep={botEnabled,botColor,botDifficulty,viewColor,turnTimerSeconds,boardSkin,pieceSkin,allowUndo,currentPreset,hapticsOn};
  importGameState(s);Object.assign(window,{});sel=null;pendingPromotion=null;pendingEvolution=null;
  botEnabled=keep.botEnabled;botColor=keep.botColor;botDifficulty=keep.botDifficulty;viewColor=keep.viewColor;turnTimerSeconds=keep.turnTimerSeconds;boardSkin=keep.boardSkin;pieceSkin=keep.pieceSkin;allowUndo=keep.allowUndo;currentPreset=keep.currentPreset;hapticsOn=keep.hapticsOn;
}
function toast(msg){
  const e=$("#toast");e.textContent=msg;e.classList.remove("hidden");
  clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.add("hidden"),2100);
}
function name(t){return ({p:"Pawn",n:"Knight",b:"Bishop",r:"Rook",q:"Queen",k:"King"})[t]}

function applyEvolutionChoice(p,r,c,newType,label){
  p.type=newType;p.kills=0;p.evoReady=false;p.evoLevel=(p.evoLevel||0)+1;p.evoName=label;p.evolutions=(p.evolutions||0)+1;
  stats.evolutions++;playSfx("evolution");haptic("evolution");moveLog[moveLog.length-1].text+=` 🧬${newType.toUpperCase()}`;
  announce("evolution",`${label} unlocked. The gate relocates immediately after this turn.`);
  pendingEvolution=null;$("#evolutionDialog").classList.add("hidden");
  endTurn();
}
function triggerEvolution(p,r,c){
  if(!p.evoReady||p.type==="q"||p.type==="k")return false;
  const branches=evoBranches[p.type];if(!branches?.length)return false;
  if(botEnabled&&p.color===botColor){
    const best=[...branches].sort((a,b)=>(pieceValue[b[0]]||0)-(pieceValue[a[0]]||0))[0];
    applyEvolutionChoice(p,r,c,best[0],best[1]);return true;
  }
  pendingEvolution={p,r,c};pauseTurnClock();
  $("#evolutionSub").textContent=`${name(p.type)} reached ${p.color==="w"?"White":"Black"}'s moving gate. Choose its next form.`;
  const box=$("#evolutionChoices");box.innerHTML="";
  branches.forEach(([t,label])=>{
    const bt=document.createElement("button");bt.type="button";bt.className="evo-option";
    bt.innerHTML=`<strong>${glyph[p.color][t]}</strong><span>${label}</span><small>${t==="n"?"L-shaped jumps":t==="b"?"Diagonal sliding":t==="r"?"Orthogonal sliding":"Queen movement"}</small>`;
    bt.addEventListener("click",()=>applyEvolutionChoice(p,r,c,t,label));box.append(bt);
  });
  $("#evolutionDialog").classList.remove("hidden");render();return true;
}
function tap(r,c){
  if(gameOver||pendingPromotion||pendingEvolution||botThinking||animating||(botEnabled&&turn===botColor))return;
  const p=board[r][c];
  if(!sel){if(p?.color===turn){sel=[r,c];render()}return}
  attemptFromTo(sel[0],sel[1],r,c);
}
function canFuse(sr,sc,tr,tc){
  if(sr===tr&&sc===tc)return false;
  const a=board[sr]?.[sc],b=board[tr]?.[tc];if(!a||!b||a.color!==b.color)return false;
  return a.type!=="k"&&b.type!=="k"&&!a.fused&&!b.fused;
}
function performFusion(sr,sc,tr,tc){
  if(!canFuse(sr,sc,tr,tc))return false;const sp=board[sr][sc],target=board[tr][tc],test=cloneBoard(board);test[tr][tc].fused=sp.type;test[sr][sc]=null;
  if(inCheck(sp.color,test)){toast("That fusion leaves the king in check.");return false}
  snapshot();animateMove(sr,sc,tr,tc,()=>{target.fused=sp.type;target.fusions=(target.fusions||0)+1;board[sr][sc]=null;halfmove++;ep=null;lastMove={sr,sc,tr,tc};moveLog.push({color:sp.color,text:`${coord(sr,sc)}⇢${coord(tr,tc)} 🔗`});stats.moves++;stats.fusions++;announce("fusion");playSfx("fusion");haptic("fusion");toast(`${name(target.type)} absorbed a ${name(sp.type)}. Disturbing.`);endTurn()});return true;
}
function attemptFromTo(sr,sc,r,c){
  if(gameOver||animating)return;
  const sp=board[sr][sc],target=board[r][c];if(!sp||sp.color!==turn){sel=null;render();return}
  if(target?.color===turn){
    if(sr===r&&sc===c){sel=[r,c];render();return}
    if(mods.fusion&&canFuse(sr,sc,r,c)){performFusion(sr,sc,r,c);return}
    sel=[r,c];render();return;
  }
  if(!legalMoves(sr,sc).some(x=>x[0]===r&&x[1]===c)){sel=null;render();return}
  commitMove(sr,sc,r,c);
}
function commitMove(sr,sc,tr,tc,promotionType=null){
  snapshot();
  animateMove(sr,sc,tr,tc,()=>executeMove(sr,sc,tr,tc,promotionType));
}
function executeMove(sr,sc,r,c,promotionType=null){
  const sp=board[sr][sc];let victim=board[r][c];
  if(!sp){animating=false;render();return}
  const pawnMove=sp.type==="p";
  const isEp=pawnMove&&!victim&&sc!==c;
  if(isEp)victim=board[sr][c];
  const castle=isCastleMove(sp,sr,sc,r,c,board);

  const infectionVictim=(typeof gameMode!=="undefined"&&gameMode==="infection"&&victim&&victim.type!=="k")?JSON.parse(JSON.stringify(victim)):null;
  board[r][c]=sp;board[sr][sc]=null;
  if(infectionVictim){infectionVictim.color=sp.color;infectionVictim.moved=true;infectionVictim.evoReady=false;infectionVictim.kills=0;board[sr][sc]=infectionVictim}
  if(isEp)board[sr][c]=null;

  if(castle){
    const rookFrom=castleRookFrom(sp.color,c),rookTo=c===6?5:3;
    board[sr][rookTo]=board[sr][rookFrom];board[sr][rookFrom]=null;
    if(board[sr][rookTo])board[sr][rookTo].moved=true;
  }

  const captured=!!victim;
  let specialEvent=false;
  if(captured){
    specialEvent=true;
    if(sp.type!=="k")sp.kills++;
    sp.captures=(sp.captures||0)+1;stats.captures++;announce("capture");playSfx("capture");haptic("capture");
    if(mods.evolution&&sp.kills>=ruleConfig.evolutionCaptures&&sp.type!=="k"&&sp.type!=="q"&&!sp.evoReady){
      sp.kills=ruleConfig.evolutionCaptures;sp.evoReady=true;
      announce("normal",`${name(sp.type)} is EVOLUTION READY. Reach ${sp.color==="w"?"White":"Black"}'s ✦ gate before it moves again.`);
      toast("🧬 Evolution ready — reach your moving gate.");
    }
  }
  const landingMutation=mods.mutation?mutationAt(r,c):null;
  if(landingMutation&&!sp.mut){
    specialEvent=true;sp.mut=landingMutation.type;sp.mutations=(sp.mutations||0)+1;stats.mutations++;announce("mutation");playSfx("mutation");haptic("mutation");
    toast(`☢️ ${mutationDefs[sp.mut].name}: ${mutationDefs[sp.mut].desc}`);
  }

  ep=null;
  if(pawnMove&&Math.abs(r-sr)===2)ep={r:(r+sr)/2,c,color:sp.color};
  sp.moved=true;
  halfmove=(pawnMove||captured)?0:halfmove+1;
  lastMove={sr,sc,tr:r,tc:c};

  let logText=`${coord(sr,sc)}–${coord(r,c)}`;
  if(captured)logText=`${coord(sr,sc)}×${coord(r,c)}`;
  moveLog.push({color:sp.color,text:logText});
  stats.moves++;
  if(!captured){playSfx("move");haptic("move")}

  if(pawnMove&&(r===0||r===7)){
    if(botEnabled&&sp.color===botColor){
      sp.type=promotionType&&["q","r","b","n"].includes(promotionType)?promotionType:"q";
      moveLog[moveLog.length-1].text+=`=${sp.type.toUpperCase()}`;
      endTurn();return;
    }
    pendingPromotion={r,c};showPromotion(sp.color);render();return;
  }
  if(!specialEvent)announce("normal");
  if(mods.evolution&&isOwnEvolutionGate(sp.color,r,c)){
    if(sp.evoReady&&sp.type!=="q"&&sp.type!=="k"){
      if(triggerEvolution(sp,r,c))return;
    }else{
      announce("normal",`${name(sp.type)} found its gate, but needs ${ruleConfig.evolutionCaptures} captures before it will evolve.`);
      toast("✦ Gate reached — this piece isn't Evolution Ready yet.");
    }
  }
  endTurn();
}
function showPromotion(color){
  pauseTurnClock();
  const d=$("#promotion"),b=$("#promoBtns");b.innerHTML="";
  ["q","r","b","n"].forEach(t=>{
    const bt=document.createElement("button");bt.type="button";bt.textContent=glyph[color][t];
    bt.addEventListener("click",()=>{
      board[pendingPromotion.r][pendingPromotion.c].type=t;
      moveLog[moveLog.length-1].text+=`=${t.toUpperCase()}`;
      pendingPromotion=null;d.classList.add("hidden");endTurn();
    });b.append(bt);
  });
  d.classList.remove("hidden");
}

function animateMove(sr,sc,tr,tc,done){
  const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const from=document.querySelector(`.sq[data-r="${sr}"][data-c="${sc}"] .piece-shell`);
  const to=document.querySelector(`.sq[data-r="${tr}"][data-c="${tc}"]`);
  if(reduce||!from||!to){done();return}
  animating=true;
  const fr=from.getBoundingClientRect(),rr=to.getBoundingClientRect();
  const ghost=from.cloneNode(true);ghost.classList.add("move-ghost");
  ghost.style.left=`${fr.left}px`;ghost.style.top=`${fr.top}px`;ghost.style.width=`${fr.width}px`;ghost.style.height=`${fr.height}px`;
  document.body.append(ghost);
  from.style.visibility="hidden";
  let finished=false;
  const finish=()=>{
    if(finished)return;
    finished=true;
    try{from.style.visibility=""}catch(_){}
    ghost.remove();
    animating=false;
    done();
  };
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    ghost.style.transform=`translate(${rr.left-fr.left}px,${rr.top-fr.top}px) scale(1.03)`;
  }));
  setTimeout(finish,230);
}

function bindDrag(node,r,c){
  node.addEventListener("pointerdown",e=>{
    const p=board[r][c];
    if(!p||p.color!==turn||gameOver||pendingPromotion||pendingEvolution||botThinking||animating||(botEnabled&&turn===botColor))return;
    e.preventDefault();
    dragState={sr:r,sc:c,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,moved:false,ghost:null,node,pointerId:e.pointerId};
    try{node.setPointerCapture?.(e.pointerId)}catch(_){}
  });
}
window.addEventListener("pointermove",e=>{
  if(!dragState||e.pointerId!==dragState.pointerId)return;
  dragState.x=e.clientX;dragState.y=e.clientY;
  const dx=e.clientX-dragState.startX,dy=e.clientY-dragState.startY;
  if(!dragState.moved&&Math.hypot(dx,dy)>7){
    dragState.moved=true;
    const rect=dragState.node.getBoundingClientRect();
    const ghost=dragState.node.cloneNode(true);ghost.classList.add("drag-ghost");
    ghost.style.left=`${rect.left}px`;ghost.style.top=`${rect.top}px`;ghost.style.width=`${rect.width}px`;ghost.style.height=`${rect.height}px`;
    document.body.append(ghost);dragState.ghost=ghost;
    sel=[dragState.sr,dragState.sc];render();
  }
  if(dragState.moved&&dragState.ghost){
    dragState.ghost.style.transform=`translate(${dx}px,${dy}px) scale(1.08)`;
  }
},{passive:true});
window.addEventListener("pointerup",e=>{
  if(!dragState||e.pointerId!==dragState.pointerId)return;
  const d=dragState;dragState=null;
  if(d.ghost)d.ghost.remove();
  suppressClicksUntil=Date.now()+250;
  if(!d.moved){tap(d.sr,d.sc);return}
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest(".sq");
  if(!target){sel=null;render();return}
  const tr=Number(target.dataset.r),tc=Number(target.dataset.c);
  attemptFromTo(d.sr,d.sc,tr,tc);
});
function cancelActiveDrag(){
  if(!dragState)return;
  const d=dragState;dragState=null;
  try{d.node?.releasePointerCapture?.(d.pointerId)}catch(_){}
  if(d.ghost)d.ghost.remove();
  sel=null;
  suppressClicksUntil=Date.now()+150;
  render();
}
window.addEventListener("pointercancel",cancelActiveDrag);
window.addEventListener("blur",cancelActiveDrag);
document.addEventListener("visibilitychange",()=>{
  if(document.hidden)cancelActiveDrag();
});
