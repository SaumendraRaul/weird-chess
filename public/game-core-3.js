function dedupe(arr){
  const s=new Set(),o=[];
  for(const x of arr){const k=x.join(",");if(!s.has(k)){s.add(k);o.push(x)}}
  return o;
}
function findKing(color,bstate=board){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(bstate[r][c]?.color===color&&bstate[r][c].type==="k")return [r,c];
  return null;
}
function isSquareAttacked(r,c,byColor,bstate=board){
  for(let rr=0;rr<8;rr++)for(let cc=0;cc<8;cc++){
    const p=bstate[rr][cc];if(!p||p.color!==byColor)continue;
    if(pseudoMoves(rr,cc,p,true,bstate).some(x=>x[0]===r&&x[1]===c))return true;
  }
  return false;
}
function inCheck(color,bstate=board){
  const k=findKing(color,bstate);return k?isSquareAttacked(k[0],k[1],enemy(color),bstate):true;
}
function applyMoveToState(bstate,m){
  const {sr,sc,tr,tc}=m,p=bstate[sr][sc],target=bstate[tr][tc];
  if(!p)return;
  const isEp=p.type==="p"&&!target&&sc!==tc;
  const infectionVictim=(typeof gameMode!=="undefined"&&gameMode==="infection"&&target&&target.type!=="k")?JSON.parse(JSON.stringify(target)):null;
  bstate[tr][tc]=p;bstate[sr][sc]=null;
  if(infectionVictim){infectionVictim.color=p.color;infectionVictim.moved=true;infectionVictim.evoReady=false;infectionVictim.kills=0;bstate[sr][sc]=infectionVictim}
  if(isEp)bstate[sr][tc]=null;
  if(isCastleMove(p,sr,sc,tr,tc,bstate)){
    const rookFrom=castleRookFrom(p.color,tc),rookTo=tc===6?5:3;
    bstate[sr][rookTo]=bstate[sr][rookFrom];bstate[sr][rookFrom]=null;
    if(bstate[sr][rookTo])bstate[sr][rookTo].moved=true;
  }
  p.moved=true;
}
function legalMoves(r,c){
  const p=board[r][c];if(!p)return [];
  return pseudoMoves(r,c,p,false,board).filter(([tr,tc])=>{
    const b=cloneBoard(board);
    applyMoveToState(b,{sr:r,sc:c,tr,tc});
    return !inCheck(p.color,b);
  });
}
function allLegalMovesFor(color){
  const moves=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=board[r][c];if(!p||p.color!==color)continue;
    for(const [tr,tc] of legalMoves(r,c))moves.push({sr:r,sc:c,tr,tc});
  }
  return moves;
}
function hasAnyLegal(color){return allLegalMovesFor(color).length>0}
function insufficientMaterial(){
  if(hasWeirdRules())return false;
  const pieces=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=board[r][c];if(p&&p.type!=="k")pieces.push({p,r,c})}
  if(!pieces.length)return true;
  if(pieces.length===1&&["b","n"].includes(pieces[0].p.type))return true;
  if(pieces.every(x=>x.p.type==="b")){
    const colors=pieces.map(x=>(x.r+x.c)%2);return colors.every(x=>x===colors[0]);
  }
  return false;
}
function stateKey(){
  const rows=board.map(row=>row.map(p=>p?`${p.color}${p.type}${p.moved?1:0}${p.mut||"-"}${p.fused||"-"}${p.evoReady?1:0}${p.evoLevel||0}`:"..").join("")).join("/");
  const gates=`${evoGates.w?coord(evoGates.w.r,evoGates.w.c):"-"},${evoGates.b?coord(evoGates.b.r,evoGates.b.c):"-"}`;
  const muts=mutationSquares.map(x=>`${x.r}${x.c}${x.type}`).sort().join(";");
  return `${rows}|${turn}|${ep?ep.r+","+ep.c:"-"}|${gates}|${muts}|${JSON.stringify(mods)}`;
}
function recordPosition(){const k=stateKey();positionCount.set(k,(positionCount.get(k)||0)+1)}
function evaluateGame(){
  if(gameOver)return;
  const check=inCheck(turn),any=hasAnyLegal(turn);
  if(!any){gameOver=true;outcome=check?`${turn==="w"?"Black":"White"} wins by checkmate 💀`:"Draw by stalemate";return}
  if(insufficientMaterial()){gameOver=true;outcome="Draw by insufficient material";return}
  if(halfmove>=100){gameOver=true;outcome="Draw by the fifty-move rule";return}
  if((positionCount.get(stateKey())||0)>=3){gameOver=true;outcome="Draw by threefold repetition";return}
}
function showEndDialog(){
  clearInterval(timerInterval);timerInterval=null;clearSavedMatch();
  pendingPromotion=null;pendingEvolution=null;
  $("#promotion").classList.add("hidden");$("#evolutionDialog").classList.add("hidden");
  $("#endResult").textContent=outcome||"Game Over";
  const elapsed=stats?.startedAt?Math.max(0,Date.now()-stats.startedAt):0;
  $("#endSub").textContent=`${Math.floor(elapsed/60000)}m ${Math.floor((elapsed%60000)/1000)}s • ${stats?.moves||0} moves`;
  const cards=[
    ["⚔",stats?.captures||0,"Captures"],["🧬",stats?.evolutions||0,"Evolutions"],
    ["☢",stats?.mutations||0,"Mutations"],["🔗",stats?.fusions||0,"Fusions"],
    ["🚨",stats?.checks||0,"Checks"],["♟",stats?.moves||0,"Moves"]
  ];
  $("#endStats").innerHTML=cards.map(([i,v,l])=>`<div class="stat-box"><div>${i}</div><div class="stat-val">${v}</div><div class="stat-label">${l}</div></div>`).join("");
  $("#endDialog").classList.remove("hidden");
}
function visibleTo(color,r,c){
  if(!mods.fog)return true;
  if(board[r][c]?.color===color)return true;
  for(let rr=0;rr<8;rr++)for(let cc=0;cc<8;cc++){
    const p=board[rr][cc];
    if(p?.color===color&&pseudoMoves(rr,cc,p,true).some(x=>x[0]===r&&x[1]===c))return true;
  }
  return false;
}
function funnyFace(p){
  if(p.mut)return "ಠ‿ಠ";
  if(p.kills>=2)return "ᵔᴥᵔ";
  if(p.type==="k")return "•̀ᴗ•́";
  if(p.type==="n")return "ಠ_ಠ";
  return "•ᴗ•";
}
function playerName(color){
  if(botEnabled&&color===botColor)return botLabel();
  if(botEnabled)return "You";
  return color==="w"?"White Player":"Black Player";
}
function playerDesc(color){
  if(botEnabled&&color===botColor){
    if(usesStockfish())return botDifficulty==="high"?"Stockfish • target 1500 Elo":"Stockfish • target 3000 Elo";
    return "Weird Engine";
  }
  return color==="w"?"White pieces":"Black pieces";
}
function playerCard(color){
  const timer=turnTimerSeconds?`<span id="timer-${color}" class="timer-chip">${formatTime(turnTimerSeconds*1000)}</span>`:`<span class="turn-dot"></span>`;
  return `<div class="player-left"><div class="avatar">${color==="w"?"♔":"♚"}</div><div><div class="player-name">${playerName(color)}</div><div class="player-desc">${playerDesc(color)}</div></div></div>${timer}`;
}
function renderPlayers(){
  const top=viewColor==="w"?"b":"w",bottom=enemy(top);
  $("#topPlayer").innerHTML=playerCard(top);$("#bottomPlayer").innerHTML=playerCard(bottom);
  $("#topPlayer").classList.toggle("active",!gameOver&&turn===top);
  $("#bottomPlayer").classList.toggle("active",!gameOver&&turn===bottom);
  updateTimerDisplays();
}
function displayCoords(i){
  const dr=Math.floor(i/8),dc=i%8;
  return viewColor==="w"?[dr,dc]:[7-dr,7-dc];
}
function render(){
  const el=$("#board");el.innerHTML="";
  const moves=sel?legalMoves(sel[0],sel[1]):[];
  const kingChecked=!gameOver&&inCheck(turn)?findKing(turn):null;

  for(let i=0;i<64;i++){
    const [r,c]=displayCoords(i);
    const s=document.createElement("div");
    s.className=`sq ${(r+c)%2?"dark":"light"}`;
    s.dataset.r=r;s.dataset.c=c;
    const p=board[r][c];

    const mutSq=mods.mutation?mutationAt(r,c):null;if(mutSq)s.classList.add("mutation");
    if(mods.evolution&&(isOwnEvolutionGate("w",r,c)||isOwnEvolutionGate("b",r,c)))s.classList.add("evo-square");
    if(lastMove&&((lastMove.sr===r&&lastMove.sc===c)||(lastMove.tr===r&&lastMove.tc===c)))s.classList.add("last");
    if(sel&&sel[0]===r&&sel[1]===c)s.classList.add("selected");
    if(sel&&moves.some(x=>x[0]===r&&x[1]===c))s.classList.add(p?"capture":"move");
    if(kingChecked&&kingChecked[0]===r&&kingChecked[1]===c)s.classList.add("check");
    if(mods.fog&&!visibleTo(turn,r,c))s.classList.add("fog");

    const displayRow=Math.floor(i/8),displayCol=i%8;
    if(displayCol===0)s.insertAdjacentHTML("beforeend",`<span class="coord rank">${8-r}</span>`);
    if(displayRow===7)s.insertAdjacentHTML("beforeend",`<span class="coord file">${files[c]}</span>`);
    if(mutSq){const md=mutationDefs[mutSq.type];s.insertAdjacentHTML("beforeend",`<span class="mutation-mark mutation-${mutSq.type}" title="${md.name}: ${md.desc}">${md.icon}</span>`)}
    if(mods.evolution){
      const gateColor=isOwnEvolutionGate("w",r,c)?"w":(isOwnEvolutionGate("b",r,c)?"b":null);
      if(gateColor){
        const mine=gateColor===turn?"mine":"foe";
        s.insertAdjacentHTML("beforeend",`<span class="evo-marker ${gateColor==="w"?"white":"black"} ${mine}" title="${gateColor==="w"?"White":"Black"} Evolution Gate">✦</span>`);
      }
    }

    if(p){
      const shell=document.createElement("span");
      shell.className="piece-shell";
      if(p.mut)shell.classList.add("is-mutated");
      if(p.evoLevel>0)shell.classList.add("is-evolved");
      if(p.evoReady)shell.classList.add("evo-ready");
      if(p.fused)shell.classList.add("is-fused");
      shell.dataset.r=r;shell.dataset.c=c;
      shell.innerHTML=`<span class="piece ${p.color==="w"?"piece-white":"piece-black"}">${glyph[p.color][p.type]}</span><span class="face ${p.color==="w"?"face-white":"face-black"}">${funnyFace(p)}</span><span class="trait-mark">↯</span>${mods.evolution&&p.type!=="q"?`<span class="xp-mini">${Math.min(p.kills,ruleConfig.evolutionCaptures)}/${ruleConfig.evolutionCaptures}</span>`:""}${p.evoLevel?`<span class="evo-level-mini" title="${p.evoName||"Evolved"}">E${p.evoLevel}</span>`:""}`;
      bindDrag(shell,r,c);
      s.append(shell);
    }
    s.addEventListener("click",()=>{if(Date.now()<suppressClicksUntil)return;tap(r,c)});
    el.append(s);
  }

  if(gameOver){
    $("#status").textContent=outcome;$("#statusSub").textContent="Game over";
  }else if(botEnabled&&turn===botColor&&botThinking){
    $("#status").innerHTML=`${botLabel()} is thinking<span class="bot-thinking"></span>`;
    $("#statusSub").textContent="Planning something disrespectful.";
  }else{
    $("#status").textContent=`${turn==="w"?"White":"Black"} to move${inCheck(turn)?" — CHECK!":""}`;
    $("#statusSub").textContent=botEnabled&&turn!==botColor?"Your move • drag or tap":"Drag or tap a piece";
  }

  $("#powerBtn").style.display=mods.king?"block":"none";
  $("#powerBtn").disabled=powerUsed[turn]||gameOver||botThinking||animating||(botEnabled&&turn===botColor);

  const active=defs.filter(x=>mods[x[0]]);
  $("#activeMods").innerHTML=active.map(x=>`<span class="badge ${x[0]==="fog"?"fog-indicator":""}">${x[1]} ${x[2]}${x[0]==="fog"?" ACTIVE":""}</span>`).join("");
  $("#classicBadge").classList.toggle("hidden",active.length>0);$("#undo").disabled=!allowUndo||gameOver||botThinking||animating;

  if(!botEnabled)$("#enginePill").textContent="2 PLAYER";
  else if(usesStockfish())$("#enginePill").textContent=botDifficulty==="high"?"STOCKFISH 1500":"STORKPISS 3000";
  else $("#enginePill").textContent="WEIRD ENGINE";

  renderPlayers();
  renderMoveLog();
  renderPieceInfo();
  $("#announcer").textContent=announcerText;renderGateHud();
}
function renderGateHud(){
  const hud=$("#gateHud");if(!hud)return;
  if(!mods.evolution){hud.classList.add("hidden");hud.innerHTML="";return}
  hud.classList.remove("hidden");
  const g=evoGates[turn],ready=ownPieces(turn).filter(([r,c])=>board[r][c]?.evoReady);
  let arrow="✦";
  if(sel&&g){const dr=g.r-sel[0],dc=g.c-sel[1];arrow=Math.abs(dc)>Math.abs(dr)?(dc>0?"→":"←"):(dr>0?"↓":"↑")}
  hud.innerHTML=`<span class="gate-chip ${ready.length?"ready":""}">${turn==="w"?"⚪":"⚫"} Gate ${g?coord(g.r,g.c):"—"}</span><span class="gate-arrow">${arrow}</span><span class="gate-chip">${ready.length?`${ready.length} piece${ready.length>1?"s":""} ready`:"Need ${ruleConfig.evolutionCaptures} captures"}</span>`;
}
function renderPieceInfo(){
  const box=$("#pieceInfo");if(!box)return;
  if(!sel||!board[sel[0]]?.[sel[1]]){box.innerHTML='<div class="empty-moves">Tap one of your pieces to inspect it.</div>';return}
  const p=board[sel[0]][sel[1]],md=p.mut?mutationDefs[p.mut]:null,gate=evoGates[p.color];
  const evoText=p.type==="q"?"MAX":(p.evoReady?"READY — reach gate":`${Math.min(p.kills,ruleConfig.evolutionCaptures)}/${ruleConfig.evolutionCaptures} captures`);
  const fusionText=p.fused?`${name(p.type)} + ${name(p.fused)}`:"None";
  box.innerHTML=`<div class="piece-info-head"><div class="piece-info-glyph">${glyph[p.color][p.type]}</div><div><div class="piece-info-name">${p.evoName||name(p.type)}</div><div class="piece-info-sub">${coord(sel[0],sel[1])} • Evolution Lv.${p.evoLevel||0}</div></div></div>
    <div class="info-row"><span>Evolution</span><b>${evoText}</b></div><div class="xp-track"><div class="xp-fill" style="width:${p.type==="q"?100:Math.min(100,(p.kills/ruleConfig.evolutionCaptures)*100)}%"></div></div>
    <div class="info-row"><span>Your moving gate</span><b>${mods.evolution&&gate?coord(gate.r,gate.c):"Off"}</b></div>
    <div class="info-row"><span>Mutation</span><b class="${p.mut?"mutation-name":""}">${md?md.icon+" "+md.name:"None"}</b></div>${md?`<div class="mutation-help">${md.desc}</div>`:""}
    <div class="info-row"><span>Fusion movement</span><b>${fusionText}</b></div>${p.fused?`<div class="mutation-help">Moves as both ${name(p.type)} and ${name(p.fused)}. This piece cannot fuse again.</div>`:""}`;
}
