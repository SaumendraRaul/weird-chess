/* Weird Chess v3.4 shared deterministic state — loaded before game core. */
const visualRandom=Math.random.bind(Math);
let matchSeed="",rngState=0,startingPosition="standard";
let castleState={w:{kingStart:4,qRook:0,kRook:7},b:{kingStart:4,qRook:0,kRook:7}};
let ruleConfig={evolutionCaptures:2,gateRerollPlies:1,mutationRerollPlies:4,mutationSquareCount:4};
let profiles={w:{name:"White Player",avatar:"⚪"},b:{name:"Black Player",avatar:"⚫"}};
let accessibility={contrast:false,largePieces:false,reducedMotion:false,dangerPreview:false,confirmSpecial:false};
let replayFrames=[],eventLog=[],replayTimer=null,matchStartedState=null;
const HISTORY_KEY="weirdChess.history.v34",ACH_KEY="weirdChess.achievements.v34",PREFS34="weirdChess.v34prefs";
const achievementsCatalog={
  first_mutation:["☢","Occupational Hazard","Mutate a piece."],
  first_evolution:["🧬","Promotion Wasn't Enough","Evolve a piece."],
  first_fusion:["🔗","Against Nature","Create a Fusion."],
  chaos_game:["💀","Everything Everywhere","Finish a match with all five modifiers."],
  storkpiss:["🪿","StorkPiss Survivor","Defeat StorkPiss."],
  clean_win:["🧼","Untouched Army","Win without losing a piece."],
  check_party:["🚨","Royal Harassment","Give 5 checks in one match."],
  century:["♟","Long Day at the Office","Play 100 total moves across matches."]
};

function seedHash(s){
  let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0||0x6d2b79f5;
}
function randomSeed(){
  try{const a=new Uint32Array(2);crypto.getRandomValues(a);return `${a[0].toString(36)}-${a[1].toString(36)}`}catch(_){return `${Date.now().toString(36)}-${Math.floor(visualRandom()*1e9).toString(36)}`}
}
function setGameSeed(seed,state=null){
  matchSeed=String(seed||randomSeed());
  rngState=state==null?seedHash(matchSeed):(state>>>0);
}
function gameRandom(){
  rngState=(rngState+0x6D2B79F5)>>>0;
  let t=rngState;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
}
function shuffleGame(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(gameRandom()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function deepCopy(x){return JSON.parse(JSON.stringify(x))}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}


function setCastleStateFromBack(back){
  const k=back.indexOf("k"),rs=back.map((x,i)=>x==="r"?i:null).filter(x=>x!=null);
  castleState={w:{kingStart:k,qRook:rs.find(x=>x<k),kRook:rs.find(x=>x>k)},b:{kingStart:k,qRook:rs.find(x=>x<k),kRook:rs.find(x=>x>k)}};
}
function castleRookFrom(color,kingDest){return kingDest===6?castleState[color]?.kRook:castleState[color]?.qRook}
function castleMovesFor(r,c,p,bstate=board){
  if(p.type!=="k"||p.moved)return[];
  const home=p.color==="w"?7:0,cs=castleState[p.color];if(r!==home||!cs||c!==cs.kingStart||isSquareAttacked(home,c,enemy(p.color),bstate))return[];
  const out=[];
  for(const [side,kDest,rDest] of [["k",6,5],["q",2,3]]){
    const rookCol=side==="k"?cs.kRook:cs.qRook,rook=bstate[home][rookCol];if(!rook||rook.type!=="r"||rook.color!==p.color||rook.moved)continue;
    let ok=true;
    const lo=Math.min(c,rookCol)+1,hi=Math.max(c,rookCol);
    for(let x=lo;x<hi;x++)if(bstate[home][x]){ok=false;break}
    if(!ok)continue;
    const step=kDest===c?0:(kDest>c?1:-1);
    if(step===0)continue;
    for(let x=c+step;;x+=step){
      const occ=bstate[home][x];if(occ&&x!==rookCol){ok=false;break}
      if(isSquareAttacked(home,x,enemy(p.color),bstate)){ok=false;break}
      if(x===kDest)break;
    }
    if(!ok)continue;
    const rstep=rDest===rookCol?0:(rDest>rookCol?1:-1);
    if(rstep)for(let x=rookCol+rstep;;x+=rstep){if(x!==c&&x!==kDest&&bstate[home][x]){ok=false;break}if(x===rDest)break}
    if(ok)out.push([home,kDest]);
  }
  return out;
}
function isCastleMove(p,sr,sc,tr,tc,bstate=board){
  return p?.type==="k"&&!p.moved&&tr===(p.color==="w"?7:0)&&castleMovesFor(sr,sc,p,bstate).some(x=>x[0]===tr&&x[1]===tc);
}

