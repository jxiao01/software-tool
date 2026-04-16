const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ROWS=5,COLS=4;
/** Letter tile pixel size in Step 1–2 lcards; Step 3 sheet preview uses the same. */
const LCARD_PX=120;
/** Matches `.az-letter-grid` gap between cards — used as sheet padding rhythm in Step 3. */
const LCARD_GAP_PX=10;
const S3_EXPORT_SCALE=2;

// ── Alphabet ──
const ALPHABET = {
  A:[[0,1,1,0],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
  B:[[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,0,1],[1,1,1,0]],
  C:[[1,1,1,1],[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,1,1,1]],
  D:[[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,0]],
  E:[[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,1,1,1]],
  F:[[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,0,0,0]],
  G:[[1,1,1,1],[1,0,0,0],[1,0,1,1],[1,0,0,1],[1,1,1,1]],
  H:[[1,0,0,1],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
  I:[[1,1,1,1],[0,1,1,0],[0,1,1,0],[0,1,1,0],[1,1,1,1]],
  J:[[0,1,1,1],[0,0,0,1],[0,0,0,1],[1,0,0,1],[1,1,1,0]],
  K:[[1,0,0,1],[1,0,1,0],[1,1,0,0],[1,0,1,0],[1,0,0,1]],
  L:[[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,1,1,1]],
  M:[[1,0,0,1],[1,1,1,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
  N:[[1,0,0,1],[1,1,0,1],[1,1,0,1],[1,0,1,1],[1,0,0,1]],
  O:[[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,1]],
  P:[[1,1,1,1],[1,0,0,1],[1,1,1,1],[1,0,0,0],[1,0,0,0]],
  Q:[[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,0,1,1],[1,1,1,1]],
  R:[[1,1,1,1],[1,0,0,1],[1,1,1,0],[1,0,1,0],[1,0,0,1]],
  S:[[1,1,1,1],[1,0,0,0],[1,1,1,1],[0,0,0,1],[1,1,1,1]],
  T:[[1,1,1,1],[0,1,1,0],[0,1,1,0],[0,1,1,0],[0,1,1,0]],
  U:[[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,1]],
  V:[[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,1],[0,1,1,0]],
  W:[[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,1],[1,1,1,1]],
  X:[[1,0,0,1],[0,1,1,0],[0,1,1,0],[0,1,1,0],[1,0,0,1]],
  Y:[[1,0,0,1],[1,0,0,1],[1,1,1,1],[0,1,1,0],[0,1,1,0]],
  Z:[[1,1,1,1],[0,0,1,0],[0,1,0,0],[1,0,0,0],[1,1,1,1]],
};
const CELL_ON_FREQ=Array.from({length:ROWS},()=>Array(COLS).fill(0));
for(const l of LETTERS){
  const sk=ALPHABET[l];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(sk[r][c])CELL_ON_FREQ[r][c]++;
}

//  STEP 1–3 STATE

let rules={mask:Array.from({length:ROWS},()=>[1,1,1,1]),density:5,rowDensity:COLS,continuity:0,weight:1,symmetry:'free',style:'none',stroke:1.3,gap:6,showStuds:true,medium:'lego'};
let overrides={};
let previewLetter='A';
let currentStep=1,maxStep=1;
let exportFmt='grid',exportBg='white';
let s3ViewMode='cells';
let s3CanvasTarget='sheet';
let _s3PosterFitDelay=0;
const S3_CANVAS_PILL_SEL='#s3-canvas-target-pills .pill, #s3-canvas-target-pills-left .pill';
let azViewMode='yours';
let rulesOverrideSnapshot=null;

const RULE_MERGE_READOUT=['Any merge','No singletons','Largest only'];
/** End-of-pipeline ortho pass (see generateGrid): 0 = strip isolates (respects identity pins); 1 = off; 2 = fill notches in mask. Not “% of letter filled”. */
const RULE_FILL_READOUT=['Strip isolates','Off','Fill notches'];
const TOY_MEDIA_KEYS=['lego','tangram','pentomino','magnatiles'];
const MEDIUM_LABELS={lego:'Lego brick',tangram:'Tangram',pentomino:'Pentomino',magnatiles:'Magna-Tiles'};
function normalizeToyMedium(m){
  if(m==='magnatiles_outline')return'magnatiles';
  return TOY_MEDIA_KEYS.includes(m)?m:'lego';
}
/**
 * 12 free pentominoes: 5 个单位正方形 **边对边** 正交相连（多连方块 / polyomino），旋转与镜像视为同一种时共 12 类（F I L N P T U V W X Y Z）。
 * 若镜像算不同 → 18 种单侧形；若旋转也算不同 → 63 种固定形。铺砖逻辑用 `pentUniqueOrientations`：对每种自由形枚举在平面上 **互不等同的固定朝向**（D₄ 作用后按格子集合去重），含手性形的翻面，与「63 固定」一致地覆盖铺法所需朝向，而非只存 63 条静态数据。
 * 字型场景允许 **同一种自由形多次出现**（多块 I、多块 L…），与「一盒 12 块各用一次」的经典 pentomino 谜题不同。
 * 坐标 [row, col]，row 向下 col 向右。
 */
const PENTOMINO_SHAPES=[
  [[0,1],[1,0],[1,1],[2,1],[2,2]],//F
  [[0,0],[1,0],[2,0],[3,0],[4,0]],//I
  [[0,0],[1,0],[2,0],[3,0],[3,1]],//L
  [[0,0],[0,1],[1,1],[2,1],[3,1]],//N
  [[0,0],[1,0],[0,1],[1,1],[0,2]],//P
  [[0,0],[0,1],[0,2],[1,1],[2,1]],//T
  [[0,0],[0,2],[1,0],[1,1],[1,2]],//U
  [[0,0],[1,0],[2,0],[2,1],[2,2]],//V
  [[0,0],[1,0],[2,0],[2,1],[3,1]],//W  XXX / ..XX
  [[1,0],[0,1],[1,1],[2,1],[1,2]],//X
  [[1,0],[0,1],[1,1],[1,2],[1,3]],//Y
  [[0,1],[0,2],[1,0],[1,1],[2,0]],//Z  .XX / XX. (orthogonal zigzag)
];

//  STEP 4 STATE

const P={
  letter:'A',elem:'line',
  sourceMode:'single',sourceText:'A',
  ptSize:12,
  lineDir:'h',lineWeight:6,lineLen:100,
  planeGap:2,
  comp:'center',
  /** Text mode + 2+ letters: per-glyph canvas presets; `merge` = one silhouette, use Layout row. */
  multiLayout:'merge',
  scale:0.78,rotation:0,ox:0,oy:0,
  bg:'#ffffff',fg:'#1a1a1a',
  aspect:'3-4',motion:'none',guide:'none',
};
let p4Phase=0,p4Raf=null,p4RecRaf=null;
let p4Drag=null;

//  RULES / OVERRIDES HELPERS

function cloneRules(){return{mask:rules.mask.map(r=>[...r]),density:rules.density,rowDensity:rules.rowDensity,continuity:rules.continuity,weight:rules.weight,symmetry:rules.symmetry,style:rules.style,stroke:rules.stroke,gap:rules.gap,medium:rules.medium};}
function rulesEqual(a,b){
  if(!a||!b)return false;
  if(a.density!==b.density||a.rowDensity!==b.rowDensity||a.continuity!==b.continuity||a.weight!==b.weight)return false;
  if(a.symmetry!==b.symmetry||a.style!==b.style||a.stroke!==b.stroke||a.gap!==b.gap)return false;
  if((a.medium||'lego')!==(b.medium||'lego'))return false;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(a.mask[r][c]!==b.mask[r][c])return false;
  return true;
}
function needsRulesOvChoice(){return Object.keys(overrides).length>0&&rulesOverrideSnapshot!==null&&!rulesEqual(rules,rulesOverrideSnapshot);}
function blockStep2IfRulesOvPending(){
  if(!needsRulesOvChoice())return false;
  document.getElementById('rules-ov-banner').classList.add('vis');
  setStatus('Rules changed — choose Reset or Keep before continuing.');
  return true;
}
function checkRulesOverrideDesync(){
  const ban=document.getElementById('rules-ov-banner');
  if(Object.keys(overrides).length===0){rulesOverrideSnapshot=null;ban.classList.remove('vis');return;}
  if(rulesOverrideSnapshot===null){ban.classList.remove('vis');return;}
  if(!rulesEqual(rules,rulesOverrideSnapshot))ban.classList.add('vis');else ban.classList.remove('vis');
}
function syncStudsUi(){
  const wrap=document.getElementById('r-show-studs-wrap');
  if(wrap)wrap.style.display=normalizeToyMedium(rules.medium)==='lego'?'':'none';
}
function applyRuleChange(){rules.medium=normalizeToyMedium(rules.medium);syncStudsUi();refreshPreview();checkRulesOverrideDesync();}
function refreshAfterOverrideReset(){refreshPreview();if(currentStep>=2)refreshAZ();if(currentStep>=3){renderS3();p4Render(0);}}

//  STEP NAVIGATION

function syncStepPlates(step,prev){
  const same=prev===step;
  const apply=()=>{
    document.querySelectorAll('.step-plate').forEach(el=>{
      const s=+el.dataset.step;
      el.classList.remove('step-plate--active','step-plate--below','step-plate--above');
      if(s===step)el.classList.add('step-plate--active');
      else if(s<step)el.classList.add('step-plate--below');
      else el.classList.add('step-plate--above');
    });
  };
  if(same){document.documentElement.classList.add('no-step-transition');apply();void document.documentElement.offsetHeight;requestAnimationFrame(()=>document.documentElement.classList.remove('no-step-transition'));}
  else apply();
}
function goStep(n){
  if(n>maxStep)return;
  if(n>=2&&blockStep2IfRulesOvPending())return;
  const prev=currentStep;
  if(n===1&&Object.keys(overrides).length&&rulesOverrideSnapshot===null)rulesOverrideSnapshot=cloneRules();
  currentStep=n;
  if(prev===3&&n!==3)p4StopAnim();
  document.querySelectorAll('.stab').forEach(t=>{
    const s=+t.dataset.step;
    t.classList.remove('active','done','locked');
    if(s===n)t.classList.add('active');
    else if(s<n)t.classList.add('done');
    else if(s>maxStep)t.classList.add('locked');
  });
  syncStepPlates(n,prev);
  if(n===1)setStatus('Step 1 — Set your rules, then go to Overrides');
  if(n===2){syncRuleSummary();syncAzViewUI();refreshAZ();setStatus('Step 2 — Click letters to override');}
  if(n===3){syncExportSummary();renderS3();p4Phase=0;renderS4SourcePreview();setStatus('Step 3 — Playground');setS3CanvasTarget(s3CanvasTarget,{skipSheetRefresh:true,instant:true});}
  syncTopbarSub(n);
}
function syncTopbarSub(n){
  const el=document.getElementById('topbar-sub');if(!el)return;
  const map={1:'Step 1 · Rules',2:'Step 2 · Overrides',3:'Step 3 · Playground'};
  el.textContent=map[n]||map[1];
}
function setS3CanvasTarget(v,opts){
  if(v!=='sheet'&&v!=='poster')return;
  opts=opts&&typeof opts==='object'?opts:{};
  const skipSheetRefresh=!!opts.skipSheetRefresh;
  const instant=!!opts.instant;
  if(_s3PosterFitDelay){clearTimeout(_s3PosterFitDelay);_s3PosterFitDelay=0;}
  s3CanvasTarget=v;
  const stage=document.getElementById('s3-main-stage');
  const leftStage=document.getElementById('s3-left-main-stage');
  if(instant){
    stage?.classList.add('s3-main-stage--instant');
    leftStage?.classList.add('s3-left-main-stage--instant');
  }
  const stack=document.getElementById('s3-right-stack');
  if(stack){stack.classList.toggle('s3-canvas-poster',v==='poster');stack.classList.toggle('s3-canvas-sheet',v==='sheet');}
  const sheet=document.getElementById('s3-sheet-panel'),poster=document.getElementById('s3-poster-panel');
  if(sheet)sheet.classList.toggle('on',v==='sheet');
  if(poster)poster.classList.toggle('on',v==='poster');
  const leftSheet=document.getElementById('s3-left-sheet-panel'),leftPoster=document.getElementById('s3-left-poster-panel');
  if(leftSheet)leftSheet.classList.toggle('on',v==='sheet');
  if(leftPoster)leftPoster.classList.toggle('on',v==='poster');
  document.querySelectorAll(S3_CANVAS_PILL_SEL).forEach(q=>q.classList.toggle('on',q.dataset.v===v));
  const top=document.getElementById('s3-right-top');
  if(top)top.textContent=v==='sheet'?'Step 3 — Playground · Output':'Step 3 — Playground · Poster';
  const dropInstant=()=>{
    stage?.classList.remove('s3-main-stage--instant');
    leftStage?.classList.remove('s3-left-main-stage--instant');
  };
  if(v==='poster'){
    if(instant)requestAnimationFrame(()=>{p4FitCanvas();p4StartAnim();dropInstant();});
    else{
      requestAnimationFrame(dropInstant);
      _s3PosterFitDelay=setTimeout(()=>{p4FitCanvas();p4StartAnim();_s3PosterFitDelay=0;}, 420);
    }
  }else{
    p4StopAnim();
    if(!skipSheetRefresh){if(exportFmt==='typeset')renderS3();else scheduleS3Type();}
    requestAnimationFrame(()=>requestAnimationFrame(dropInstant));
  }
}
function unlockStep(n){
  maxStep=Math.max(maxStep,n);
  document.querySelectorAll('.stab').forEach(t=>{if(+t.dataset.step<=maxStep)t.classList.remove('locked');});
}
document.querySelectorAll('.stab').forEach(t=>t.addEventListener('click',()=>{const s=+t.dataset.step;if(s<=maxStep)goStep(s);}));

function emptyGrid(){return Array.from({length:ROWS},()=>Array(COLS).fill(0));}
/** Ortho neighbor morph: weight 0 strip (optional pin lock), weight 2 fill notches. Used once at end of generateGrid so every letter gets the same stage (not undone by identity trim). */
function applyNeighborWeightPass(g,weight,pinLock){
  const key=(r,c)=>r+'-'+c;
  const locked=(r,c)=>pinLock&&pinLock.has(key(r,c));
  if(weight===0){
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      if(!g[r][c]||cntN(g,r,c)>0)continue;
      if(locked(r,c))continue;
      g[r][c]=0;
    }
  }else if(weight===2){
    const add=[];
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      if(g[r][c]||!rules.mask[r][c])continue;
      if(cntN(g,r,c)<2)continue;
      add.push([r,c]);
    }
    for(const[r,c]of add)g[r][c]=1;
  }
}
function applyGridSymmetry(g){
  if(rules.symmetry==='mirror'){
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)g[r][COLS-1-c]=g[r][c];
  }else if(rules.symmetry==='rotate'){
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)g[ROWS-1-r][COLS-1-c]=Math.max(g[r][c],g[ROWS-1-r][COLS-1-c]);
  }
}
function generateGrid(letter){
  const skel=ALPHABET[letter];if(!skel)return emptyGrid();
  let g=skel.map(r=>[...r]);
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(!rules.mask[r][c])g[r][c]=0;
  for(let c=0;c<COLS;c++){
    const act=[];for(let r=0;r<ROWS;r++)if(g[r][c])act.push(r);
    if(act.length>rules.density){
      const sc=act.map(r=>({r,s:isEP(skel,r,c)?10:5+(r===0||r===ROWS-1?2:0)}));
      sc.sort((a,b)=>b.s-a.s);
      const keep=new Set(sc.slice(0,rules.density).map(x=>x.r));
      for(let r=0;r<ROWS;r++)if(g[r][c]&&!keep.has(r))g[r][c]=0;
    }
  }
  for(let r=0;r<ROWS;r++){
    const act=[];for(let c=0;c<COLS;c++)if(g[r][c])act.push(c);
    if(act.length>rules.rowDensity){
      const sc=act.map(c=>({c,s:isEP(skel,r,c)?10:5+(c===0||c===COLS-1?2:0)}));
      sc.sort((a,b)=>b.s-a.s);
      const keep=new Set(sc.slice(0,rules.rowDensity).map(x=>x.c));
      for(let c=0;c<COLS;c++)if(g[r][c]&&!keep.has(c))g[r][c]=0;
    }
  }
  if(rules.continuity===1)removeSingletonComponents(g);
  if(rules.continuity===2){const comp=lgComp(g);for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(g[r][c]&&!comp[r][c])g[r][c]=0;}
  preserveLetterIdentity(letter,skel,g);
  // Symmetry must run *after* identity preservation — otherwise per-column trims
  // re-break L↔R mirror / 180° rotate (e.g. Z, K, N, G, Q stayed visually asymmetric).
  applyGridSymmetry(g);
  // Neighbor pass runs here for every letter (same rule), after shape+symmetry so identity trim does not erase it. Strip skips identity pins; then symmetry re-applied so fill cannot break mirror/rotate.
  if(rules.weight!==1){
    const pinLock=new Set(pickIdentityCells(skel,letter).map(it=>`${it.r}-${it.c}`));
    applyNeighborWeightPass(g,rules.weight,pinLock);
    if(rules.symmetry!=='free')applyGridSymmetry(g);
  }
  return g;
}
// Per-letter discrimination bonus: cells that distinguish this letter
// from its most visually similar neighbors get a large score boost.
// Computed once at startup from ALPHABET data.
const DISCRIMINATOR_BONUS=(()=>{
  const bonus={};
  for(const la of LETTERS){
    bonus[la]={};
    const ska=ALPHABET[la];
    for(const lb of LETTERS){
      if(lb===la)continue;
      const skb=ALPHABET[lb];
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
        if(ska[r][c]&&!skb[r][c]){
          const k=r+'-'+c;
          bonus[la][k]=(bonus[la][k]||0)+1;
        }
      }
    }
  }
  return bonus;
})();
function identityScore(sk,r,c,letter){
  if(!sk[r][c])return -99;
  const rarity=(1-(CELL_ON_FREQ[r][c]/LETTERS.length))*10;
  const edge=(r===0||r===ROWS-1||c===0||c===COLS-1)?1.25:0;
  const ep=isEP(sk,r,c)?2.8:0;
  // Discrimination bonus: how many other letters lack this cell
  const discBonus=letter?(((DISCRIMINATOR_BONUS[letter]||{})[r+'-'+c]||0)*0.55):0;
  return rarity+edge+ep+discBonus;
}
function pickIdentityCells(sk,letter){
  const all=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(!sk[r][c]||!rules.mask[r][c])continue;
    all.push({r,c,s:identityScore(sk,r,c,letter)});
  }
  all.sort((a,b)=>b.s-a.s);
  const need=rules.density<=2?1:(rules.density===3?2:3);
  const picked=[],usedCols=new Set();
  for(const it of all){
    if(picked.length>=need)break;
    if(!usedCols.has(it.c)){picked.push(it);usedCols.add(it.c);}
  }
  for(const it of all){
    if(picked.length>=need)break;
    if(!picked.some(p=>p.r===it.r&&p.c===it.c))picked.push(it);
  }
  return picked;
}
function preserveLetterIdentity(letter,skel,g){
  const key=(r,c)=>r+'-'+c;
  const pinned=pickIdentityCells(skel,letter);
  const lock=new Set();
  for(const it of pinned){
    g[it.r][it.c]=1;
    lock.add(key(it.r,it.c));
  }
  for(let c=0;c<COLS;c++){
    const rows=[];
    for(let r=0;r<ROWS;r++)if(g[r][c])rows.push({
      r,
      pinned:lock.has(key(r,c)),
      s:identityScore(skel,r,c,letter)+(cntN(g,r,c)*0.45)
    });
    if(rows.length<=rules.density)continue;
    rows.sort((a,b)=>{
      if(a.pinned!==b.pinned)return a.pinned?-1:1;
      return b.s-a.s;
    });
    const keep=new Set(rows.slice(0,rules.density).map(x=>x.r));
    for(let r=0;r<ROWS;r++)if(g[r][c]&&!keep.has(r)&&!lock.has(key(r,c)))g[r][c]=0;
  }
  for(let r=0;r<ROWS;r++){
    const cols=[];
    for(let c=0;c<COLS;c++)if(g[r][c])cols.push({
      c,
      pinned:lock.has(key(r,c)),
      s:identityScore(skel,r,c,letter)+(cntN(g,r,c)*0.45)
    });
    if(cols.length<=rules.rowDensity)continue;
    cols.sort((a,b)=>{
      if(a.pinned!==b.pinned)return a.pinned?-1:1;
      return b.s-a.s;
    });
    const keep=new Set(cols.slice(0,rules.rowDensity).map(x=>x.c));
    for(let c=0;c<COLS;c++)if(g[r][c]&&!keep.has(c)&&!lock.has(key(r,c)))g[r][c]=0;
  }
  if(gridCount(g)===0){
    const fallback=pinned[0]||{r:2,c:1};
    if(rules.mask[fallback.r][fallback.c])g[fallback.r][fallback.c]=1;
  }
}
function isEP(sk,r,c){if(!sk[r][c])return false;let n=0;if(r>0&&sk[r-1][c])n++;if(r<ROWS-1&&sk[r+1][c])n++;if(c>0&&sk[r][c-1])n++;if(c<COLS-1&&sk[r][c+1])n++;return n<=1;}
function cntN(g,r,c){let n=0;if(r>0&&g[r-1][c])n++;if(r<ROWS-1&&g[r+1][c])n++;if(c>0&&g[r][c-1])n++;if(c<COLS-1&&g[r][c+1])n++;return n;}
function lgComp(grid){
  const vis=emptyGrid();let best=[],bN=0;
  for(let r0=0;r0<ROWS;r0++)for(let c0=0;c0<COLS;c0++){
    if(!grid[r0][c0]||vis[r0][c0])continue;
    const comp=[],stk=[[r0,c0]];
    while(stk.length){const[r,c]=stk.pop();if(r<0||r>=ROWS||c<0||c>=COLS||!grid[r][c]||vis[r][c])continue;vis[r][c]=1;comp.push([r,c]);stk.push([r-1,c],[r+1,c],[r,c-1],[r,c+1]);}
    if(comp.length>bN){bN=comp.length;best=comp;}
  }
  const res=emptyGrid();for(const[r,c]of best)res[r][c]=1;return res;
}
function removeSingletonComponents(g){
  const vis=emptyGrid();
  for(let r0=0;r0<ROWS;r0++)for(let c0=0;c0<COLS;c0++){
    if(!g[r0][c0]||vis[r0][c0])continue;
    const comp=[],stk=[[r0,c0]];
    while(stk.length){const[r,c]=stk.pop();if(r<0||r>=ROWS||c<0||c>=COLS||!g[r][c]||vis[r][c])continue;vis[r][c]=1;comp.push([r,c]);stk.push([r-1,c],[r+1,c],[r,c-1],[r,c+1]);}
    if(comp.length===1){const[r,c]=comp[0];g[r][c]=0;}
  }
}
function gridDiff(a,b){let d=0;for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if((a[r][c]||0)!==(b[r][c]||0))d++;return d/(ROWS*COLS);}
function gridCount(g){let n=0;for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(g[r][c])n++;return n;}
function getGrid(l){return overrides[l]||generateGrid(l);}

function roundToyRect(ctx,x,y,w,h,r){
  const rr=Math.min(Math.max(0,r),w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}
function sharpToyRect(ctx,x,y,w,h){
  ctx.beginPath();
  ctx.rect(x,y,w,h);
  ctx.closePath();
}
function normalizePentCells(cells){
  const minR=Math.min(...cells.map(([r])=>r)),minC=Math.min(...cells.map(([,c])=>c));
  return cells.map(([r,c])=>[r-minR,c-minC]);
}
function pentCellSig(cells){
  const norm=normalizePentCells(cells);
  return norm.sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(([r,c])=>`${r},${c}`).join('|');
}
function pentRotateCW(pts){
  const maxR=Math.max(...pts.map(p=>p[0]));
  return normalizePentCells(pts.map(([r,c])=>[c,maxR-r]));
}
function pentReflectH(pts){
  const maxC=Math.max(...pts.map(p=>p[1]));
  return normalizePentCells(pts.map(([r,c])=>[r,maxC-c]));
}
/** 一种自由五格骨牌在平面上的所有 **不同** 固定形状：4 次旋转 × 可选水平镜像，按格子集合签名去重（手性形得到镜面两种；I、X 等会少于 8 种）。 */
function pentUniqueOrientations(baseCells){
  const base=normalizePentCells(baseCells);
  const sigs=new Set(),out=[];
  for(let fh=0;fh<2;fh++){
    let pts=fh===0?base.map(p=>[p[0],p[1]]):pentReflectH(base);
    for(let rot=0;rot<4;rot++){
      const s=pentCellSig(pts);
      if(!sigs.has(s)){sigs.add(s);out.push(pts.map(p=>[p[0],p[1]]));}
      pts=pentRotateCW(pts);
    }
  }
  return out;
}
const PENTOMINO_ORIENTS=PENTOMINO_SHAPES.map(s=>pentUniqueOrientations(s));
function pentGridSig(g){let s='';for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)s+=g[r][c]?'1':'0';return s;}
function pentKey(r,c){return r+','+c;}
function pentBuildPlacements(grid){
  const all=[];
  for(let si=0;si<PENTOMINO_SHAPES.length;si++){
    for(const rel of PENTOMINO_ORIENTS[si]){
      for(let ar=0;ar<ROWS;ar++)for(let ac=0;ac<COLS;ac++){
        const abs=rel.map(([dr,dc])=>[ar+dr,ac+dc]);
        let ok=true;
        for(const[pr,pc] of abs){
          if(pr<0||pr>=ROWS||pc<0||pc>=COLS||!grid[pr][pc]){ok=false;break;}
        }
        if(ok)all.push({shapeIdx:si,cells:abs});
      }
    }
  }
  return all;
}
const _pentExactMemo=new Map();
const PENT_EXACT_MEMO_CAP=64;
function pentTrimExactMemo(){
  while(_pentExactMemo.size>PENT_EXACT_MEMO_CAP){
    const k=_pentExactMemo.keys().next().value;
    _pentExactMemo.delete(k);
  }
}
/** Exact disjoint cover of all ON cells by pentominoes; null if count not multiple of 5 or no tiling exists. */
function pentTryExactTiling(grid){
  const gk=pentGridSig(grid);
  if(_pentExactMemo.has(gk))return _pentExactMemo.get(gk);
  const must=new Set();
  let n=0;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(grid[r][c]){must.add(pentKey(r,c));n++;}
  }
  if(n===0){_pentExactMemo.set(gk,[]);pentTrimExactMemo();return [];}
  if(n%5!==0){_pentExactMemo.set(gk,null);pentTrimExactMemo();return null;}
  const all=pentBuildPlacements(grid);
  const byKey=new Map();
  for(const pl of all){
    for(const[pr,pc] of pl.cells){
      const k=pentKey(pr,pc);
      if(!byKey.has(k))byKey.set(k,[]);
      byKey.get(k).push(pl);
    }
  }
  const used=new Set();
  const sol=[];
  function pickNext(){
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const k=pentKey(r,c);
      if(grid[r][c]&&!used.has(k))return[r,c,k];
    }
    return null;
  }
  function dfs(){
    if(used.size===n)return true;
    const p=pickNext();
    if(!p)return true;
    const[, ,k0]=p;
    const cands=byKey.get(k0)||[];
    for(const pl of cands){
      const ks=pl.cells.map(([r,c])=>pentKey(r,c));
      let bad=false;
      for(const kk of ks)if(!must.has(kk)||used.has(kk)){bad=true;break;}
      if(bad)continue;
      for(const kk of ks)used.add(kk);
      sol.push(pl);
      if(dfs())return true;
      sol.pop();
      for(const kk of ks)used.delete(kk);
    }
    return false;
  }
  const ok=dfs();
  const res=ok?sol.map(({shapeIdx,cells})=>({shapeIdx,cells:cells.map(p=>[p[0],p[1]])})):null;
  _pentExactMemo.set(gk,res);
  pentTrimExactMemo();
  return res;
}
/** Greedy pack when exact tiling fails: as many disjoint pentominoes as possible (randomized tries). */
function pentGreedyPack(grid){
  const must=new Set();
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(grid[r][c])must.add(pentKey(r,c));
  const all=pentBuildPlacements(grid);
  let bestPieces=[],bestLeft=must.size;
  for(let attempt=0;attempt<48;attempt++){
    const avail=new Set(must);
    const pieces=[];
    while(avail.size>=5){
      const okPl=[];
      for(const pl of all){
        const ks=pl.cells.map(([r,c])=>pentKey(r,c));
        if(ks.every(k=>avail.has(k)))okPl.push(pl);
      }
      if(!okPl.length)break;
      const pick=okPl[Math.floor(Math.random()*okPl.length)];
      for(const[pr,pc] of pick.cells)avail.delete(pentKey(pr,pc));
      pieces.push({shapeIdx:pick.shapeIdx,cells:pick.cells.map(p=>[p[0],p[1]])});
    }
    if(avail.size<bestLeft){bestLeft=avail.size;bestPieces=pieces.slice();if(bestLeft===0)break;}
  }
  const covered=new Set();
  for(const pl of bestPieces)for(const[pr,pc] of pl.cells)covered.add(pentKey(pr,pc));
  const leftover=[];
  for(const k of must)if(!covered.has(k))leftover.push(k.split(',').map(Number));
  return{pieces:bestPieces,leftover};
}
/** Pieces that tile (or mostly tile) the letter; leftover mask cells render as single-cell units when exact cover impossible. */
function pentLayoutForDraw(grid){
  const ex=pentTryExactTiling(grid);
  if(ex!==null)return{pieces:ex,leftover:[]};
  return pentGreedyPack(grid);
}
/** Boundary edges of the union of axis-aligned unit cells (orthogonal polyomino silhouette, not per-cell “bricks”). */
function pentBoundarySegments(cells,cellW,cellH,px0,py0){
  const S=new Set(cells.map(([r,c])=>r+','+c));
  const inside=(r,c)=>S.has(r+','+c);
  const segs=[];
  for(const[r,c] of cells){
    const xl=px0+c*cellW,xr=px0+(c+1)*cellW,yt=py0+r*cellH,yb=py0+(r+1)*cellH;
    if(!inside(r,c-1))segs.push([xl,yt,xl,yb]);
    if(!inside(r,c+1))segs.push([xr,yt,xr,yb]);
    if(!inside(r-1,c))segs.push([xl,yt,xr,yt]);
    if(!inside(r+1,c))segs.push([xl,yb,xr,yb]);
  }
  return segs;
}
function pentSegDedupKey(x1,y1,x2,y2){
  const q=v=>Math.round(v*100)/100;
  const a=`${q(x1)},${q(y1)}`,b=`${q(x2)},${q(y2)}`;
  return a<b?a+'|'+b:b+'|'+a;
}
function pentStrokeSegmentsDeduped(ctx,segs,ink,lw){
  const seen=new Set(),uniq=[];
  for(const s of segs){
    const k=pentSegDedupKey(s[0],s[1],s[2],s[3]);
    if(seen.has(k))continue;
    seen.add(k);
    uniq.push(s);
  }
  ctx.strokeStyle=ink;
  ctx.lineWidth=lw;
  ctx.lineJoin='miter';
  ctx.lineCap='butt';
  for(const[x1,y1,x2,y2] of uniq){
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
  }
}
/** 一格一块：等腰直角三角形（两种直角位）、正方形、七巧板比例平行四边形；铺满正方形格 w0===h0。 */
function drawTangramCellBlock(ctx,cx,cy,w0,h0,r,c,ink,lw){
  const sq=w0,H=sq/2;
  const kind=(r+2*c)%4;
  ctx.translate(cx,cy);
  ctx.beginPath();
  if(kind===0){
    ctx.moveTo(-H,-H);ctx.lineTo(H,-H);ctx.lineTo(-H,H);
  }else if(kind===1){
    ctx.moveTo(H,-H);ctx.lineTo(H,H);ctx.lineTo(-H,H);
  }else if(kind===2){
    ctx.rect(-H,-H,sq,sq);
  }else{
    /** 七巧板平行四边形原 AABB 很扁；若用单一 sc=max 只拉满长边，短边只有格的 1/3，上下不贴邻格。对包围盒 sx/sy 分别缩放到 sq，仍为平行四边形。 */
    const raw=[[0,0],[0.5,0],[0.75,0.25],[0.25,0.25]];
    let sx=0,sy=0;
    for(const p of raw){sx+=p[0];sy+=p[1];}
    sx/=raw.length;sy/=raw.length;
    const cent=raw.map(([u,v])=>[u-sx,v-sy]);
    let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
    for(const[u,v] of cent){
      minx=Math.min(minx,u);miny=Math.min(miny,v);
      maxx=Math.max(maxx,u);maxy=Math.max(maxy,v);
    }
    const bw=maxx-minx,bh=maxy-miny;
    const mcx=(minx+maxx)/2,mcy=(miny+maxy)/2;
    const scx=bw>1e-9?sq/bw:1,scy=bh>1e-9?sq/bh:1;
    for(let i=0;i<cent.length;i++){
      const x=(cent[i][0]-mcx)*scx,y=(cent[i][1]-mcy)*scy;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
  }
  ctx.closePath();
  ctx.strokeStyle=ink;
  ctx.lineWidth=lw;
  ctx.stroke();
}
/** Ortho neighbors for Magna-Tiles piece classification (physical tiles: squares + right triangles on corners / roof). */
function magnaNeighborBits(grid,r,c){
  const o=(rr,cc)=>rr>=0&&rr<ROWS&&cc>=0&&cc<COLS&&!!grid[rr][cc];
  return{n:o(r-1,c),e:o(r,c+1),s:o(r+1,c),w:o(r,c-1)};
}
/**
 * Square = full square tile; tri* = right-triangle half (convex 90° of silhouette);
 * roofL/roofR = top “peak” pair like physical A (no north/south neighbor, only one lateral).
 */
function classifyMagnaTileKind(grid,r,c){
  const{n,e,s,w}=magnaNeighborBits(grid,r,c);
  const sum=(n?1:0)+(e?1:0)+(s?1:0)+(w?1:0);
  if(sum===2){
    if(n&&e)return'triSW';
    if(e&&s)return'triNW';
    if(s&&w)return'triNE';
    if(w&&n)return'triSE';
    if(n&&s||e&&w)return'square';
  }
  if(!n&&!s&&(e||w)){
    if(e&&w)return'square';
    if(e&&!w)return'roofL';
    if(!e&&w)return'roofR';
  }
  return'square';
}
/** Magna-Tiles: full per-cell stroke (square / triangle / roof). */
function drawMagnaTilePiece(ctx,w0,h0,kind,ink,lw){
  const hw=w0/2,hh=h0/2;
  ctx.strokeStyle=ink;
  ctx.lineWidth=lw;
  ctx.lineJoin='miter';
  ctx.lineCap='butt';
  ctx.miterLimit=2.5;
  if(kind==='square'){
    ctx.beginPath();
    ctx.rect(-hw,-hh,w0,h0);
    ctx.closePath();
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  switch(kind){
    case'roofL':
      ctx.moveTo(-hw,-hh);ctx.lineTo(-hw,hh);ctx.lineTo(hw,-hh);
      break;
    case'roofR':
      ctx.moveTo(hw,-hh);ctx.lineTo(hw,hh);ctx.lineTo(-hw,-hh);
      break;
    case'triSW':
      ctx.moveTo(-hw,-hh);ctx.lineTo(hw,hh);ctx.lineTo(-hw,hh);
      break;
    case'triNW':
      ctx.moveTo(hw,-hh);ctx.lineTo(-hw,hh);ctx.lineTo(-hw,-hh);
      break;
    case'triNE':
      ctx.moveTo(-hw,-hh);ctx.lineTo(hw,hh);ctx.lineTo(hw,-hh);
      break;
    case'triSE':
      ctx.moveTo(hw,-hh);ctx.lineTo(-hw,hh);ctx.lineTo(hw,hh);
      break;
    default:
      ctx.rect(-hw,-hh,w0,h0);
      break;
  }
  ctx.closePath();
  ctx.stroke();
}
/** Vector toy media for modular type (grid layout unchanged). Lego stays in drawLetterGrid pixel pipeline. */
function drawToyMediumLetterGrid(ctx,grid,W,H,style,stroke,gap,fg,bg,medium){
  const fi=v=>Math.max(0,Math.min(255,Math.round(v)));
  /** t∈[0,1]: 0→ink (fg), 1→paper (bg); always R=G=B */
  const gray=t=>{const v=fi(fg+(bg-fg)*Math.max(0,Math.min(1,t)));return`rgb(${v},${v},${v})`;};
  const ink=`rgb(${fi(fg)},${fi(fg)},${fi(fg)})`;
  const paper=`rgb(${fi(bg)},${fi(bg)},${fi(bg)})`;
  const cw0=(W*0.78)/COLS,ch0=(H*0.78)/ROWS;
  const ox0=Math.round(W/2-(COLS*cw0)/2),oy0=Math.round(H/2-(ROWS*ch0)/2);
  const pad=Math.max(1,Math.min(cw0,ch0)*0.07);
  let ox,oy,cw,ch,gpad;
  if(medium==='tangram'||medium==='magnatiles'){
    const cell=Math.min(cw0,ch0);
    cw=cell;
    ch=cell;
    ox=Math.round(W/2-(COLS*cw)/2);
    oy=Math.round(H/2-(ROWS*ch)/2);
    gpad=0;
  }else{
    ox=ox0;
    oy=oy0;
    cw=cw0;
    ch=ch0;
    gpad=pad;
  }
  ctx.fillStyle=paper;
  ctx.fillRect(0,0,W,H);
  const lw=Math.max(0.75,stroke*0.55);
  if(medium==='pentomino'){
    const pPad=0;
    const lay=pentLayoutForDraw(grid);
    const allSegs=[];
    for(let pi=0;pi<lay.pieces.length;pi++){
      const pl=lay.pieces[pi],cells=pl.cells;
      const minR=Math.min(...cells.map(([r])=>r)),minC=Math.min(...cells.map(([,c])=>c));
      const maxR=Math.max(...cells.map(([r])=>r)),maxC=Math.max(...cells.map(([,c])=>c));
      const xBox=ox0+minC*cw0+pPad,yBox=oy0+minR*ch0+pPad;
      const wBox=(maxC-minC+1)*cw0-2*pPad,hBox=(maxR-minR+1)*ch0-2*pPad;
      const rel=normalizePentCells(cells);
      const maxRr=Math.max(...rel.map(([r])=>r)),maxCc=Math.max(...rel.map(([,c])=>c));
      const bw=maxCc+1,bh=maxRr+1;
      if(bw<1||bh<1||wBox<=0||hBox<=0)continue;
      const cellW=wBox/bw,cellH=hBox/bh;
      allSegs.push(...pentBoundarySegments(rel,cellW,cellH,xBox,yBox));
    }
    for(const[r,c] of lay.leftover){
      const x0=ox0+c*cw0+pPad,y0=oy0+r*ch0+pPad;
      allSegs.push(...pentBoundarySegments([[0,0]],cw0,ch0,x0,y0));
    }
    pentStrokeSegmentsDeduped(ctx,allSegs,ink,lw);
  }
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(!grid[r][c])continue;
    if(medium==='pentomino')continue;
    const x0=ox+c*cw+gpad,y0=oy+r*ch+gpad,w0=cw-2*gpad,h0=ch-2*gpad;
    const cx=x0+w0/2,cy=y0+h0/2;
    ctx.save();
    if(medium==='tangram'){
      drawTangramCellBlock(ctx,cx,cy,w0,h0,r,c,ink,lw);
    }else if(medium==='magnatiles'){
      ctx.translate(cx,cy);
      const kind=classifyMagnaTileKind(grid,r,c);
      drawMagnaTilePiece(ctx,w0,h0,kind,ink,lw);
    }
    ctx.restore();
  }
  if(style&&style!=='none'&&style!=='solid'&&medium!=='pentomino'&&medium!=='tangram'&&medium!=='magnatiles'){
    const spH=Math.max(2,gap*ch*0.12),spD=Math.max(2,gap*cw*0.06),spDot=Math.max(3,gap*cw*0.06);
    ctx.fillStyle=ink;
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      if(!grid[r][c])continue;
      const x0=ox+c*cw+gpad,y0=oy+r*ch+gpad,w0=cw-2*gpad,h0=ch-2*gpad;
      ctx.save();
      roundToyRect(ctx,x0+1,y0+1,w0-2,h0-2,Math.min(w0,h0)*0.1);
      ctx.clip();
      const x1=Math.floor(x0+2),y1=Math.floor(y0+2),x2=Math.ceil(x0+w0-2),y2=Math.ceil(y0+h0-2);
      for(let py=y1;py<=y2;py++){
        for(let px=x1;px<=x2;px++){
          let draw=false;
          if(style==='hlines')draw=(py%spH<Math.max(1,stroke*0.85));
          else if(style==='diagonal')draw=((px+py)%spD<Math.max(1,stroke*0.85));
          else if(style==='dots')draw=(px%spDot<2&&py%spDot<2);
          else if(style==='concentric')draw=(Math.abs((px+py*0.7)%Math.max(2,gap*0.95))<Math.max(1,stroke*0.65));
          if(draw)ctx.fillRect(px,py,1,1);
        }
      }
      ctx.restore();
    }
  }else if(style==='solid'&&medium!=='pentomino'&&medium!=='tangram'&&medium!=='magnatiles'){
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      if(!grid[r][c])continue;
      const x0=ox+c*cw+gpad,y0=oy+r*ch+gpad,w0=cw-2*gpad,h0=ch-2*gpad;
      ctx.fillStyle=ink;
      roundToyRect(ctx,x0+lw*0.35,y0+lw*0.35,w0-lw*0.7,h0-lw*0.7,Math.min(w0,h0)*0.12);
      ctx.fill();
    }
  }
}

function sdBoxS(px,py,cx,cy,hw,hh,r){r=r||0;const qx=Math.abs(px-cx)-hw+r,qy=Math.abs(py-cy)-hh+r;return Math.min(Math.max(qx,qy),0)+Math.sqrt(Math.max(qx,0)**2+Math.max(qy,0)**2)-r;}
function drawLetterGrid(ctx,grid,W,H,style,stroke,gap,fg,bg){
  fg=fg===undefined?20:fg;bg=bg===undefined?255:bg;
  const med=normalizeToyMedium(rules.medium);
  if(med&&med!=='lego'){
    drawToyMediumLetterGrid(ctx,grid,W,H,style,stroke,gap,fg,bg,med);
    return;
  }
  const ink=Math.max(0,Math.min(255,Math.round(fg)));
  const paper=Math.max(0,Math.min(255,Math.round(bg)));
  // ===== Brick constants mapping =====
  // Keep current morphology via mapped ratios, keep brick pipeline unchanged.
  const BW=(W*0.82)/COLS;
  const U=BW/4;
  const BH=BW*0.72;
  const SW=BW*0.14;
  const SH=Math.max(SW/1.6,0.8);
  const BR=BW*0.015;
  const SR=BW*0.01;
  const BSTK=BH+SH;
  const COVERED_STUD_Y_TOL=Math.max(2,BSTK*0.22);

  const offY=H/2-((ROWS*BSTK)/2)+BSTK/2,offX=W/2;
  const bricks=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(grid[r][c])bricks.push({x:offX+(c-(COLS-1)/2)*BW,y:offY+r*BSTK,size:4,view:'front'});

  // ===== Geometry helpers (transplanted structure) =====
  function brickW(size){return(size||4)*U;}
  function getStudCenters(bx,by,view,rotated,size){
    const w=brickW(size);
    if(view==='side'||rotated)return[{sx:bx,sy:by-BH/2-SH/2,hw:SW/2,hh:SH/2,r:SR}];
    if(view==='top'){
      const n=size||4,pr=SW/2,studs=[];
      for(let i=0;i<n;i++)studs.push({sx:bx-w/2+U*(i+0.5),sy:by,hw:pr,hh:pr});
      return studs;
    }
    const n=size||4,studY=by-BH/2-SH/2,studs=[];
    for(let i=0;i<n;i++)studs.push(bx-w/2+U*(i+.5));
    return studs.map(sx=>({sx,sy:studY,hw:SW/2,hh:SH/2,r:SR}));
  }
  function sdfBody(px,py,bx,by,view,rotated,size){
    const w=brickW(size);
    if(view==='side'||rotated)return sdBoxS(px,py,bx,by,BH/2,BH/2,BR);
    if(view==='top')return sdBoxS(px,py,bx,by,w/2,U/2,BR);
    return sdBoxS(px,py,bx,by,w/2,BH/2,BR);
  }
  function getBounds(bx,by,view,rotated,size){
    const w=brickW(size);
    if(view==='side'||rotated)return{x0:bx-BH/2-2,x1:bx+BH/2+2,y0:by-BH/2-SH-2,y1:by+BH/2+2};
    if(view==='top'){const hd=U/2;return{x0:bx-w/2-2,x1:bx+w/2+2,y0:by-hd-2,y1:by+hd+2};}
    return{x0:bx-w/2-SW/2-2,x1:bx+w/2+SW/2+2,y0:by-BH/2-SH-2,y1:by+BH/2+2};
  }
  function getCoveredStudXs(b,bx,by,allBricks){
    const myStuds=getStudCenters(bx,by,b.view,b.rotated,b.size);
    if(!myStuds.length)return new Set();
    const covered=new Set();
    for(const upper of allBricks){
      if(upper===b)continue;
      const ux=upper.x,uy=upper.y;
      if(Math.abs((uy+BSTK)-by)>COVERED_STUD_Y_TOL)continue;
      const upperStuds=getStudCenters(ux,uy,upper.view,upper.rotated,upper.size);
      const holeXs=upperStuds.map(st=>st.sx);
      for(const st of myStuds) if(holeXs.some(hx=>Math.abs(st.sx-hx)<U*0.35)) covered.add(Math.round(st.sx));
    }
    return covered;
  }
  function getSharedRightSeam(b,bx,by,list){
    const hw=brickW(b.size)/2,yTol=Math.max(1.2,BSTK*0.03);
    for(const ob of list){
      if(ob===b)continue;
      if(Math.abs(ob.y-by)>yTol)continue;
      const ohw=brickW(ob.size)/2;
      if(Math.abs((bx+hw)-(ob.x-ohw))<=0.9)return true;
    }
    return false;
  }
  function getSharedBottomSeam(b,bx,by,list){
    const hh=BH/2,yTol=0.9,xTol=Math.max(1.2,U*0.08),hw=brickW(b.size)/2;
    for(const ob of list){
      if(ob===b)continue;
      const ohw=brickW(ob.size)/2,ohh=BH/2;
      if(Math.abs((by+hh)-(ob.y-ohh))>yTol)continue;
      if(Math.abs(bx-ob.x)<(hw+ohw)-xTol)return true;
    }
    return false;
  }

  // ===== Pixel render (outline branch from brick) =====
  const imgData=ctx.createImageData(W,H),buf=imgData.data;
  for(let i=0;i<buf.length;i+=4){buf[i]=buf[i+1]=buf[i+2]=paper;buf[i+3]=255;}
  /** 1 = brick interior / stud fill (pattern & solid targets); cleared on ink outline pixels */
  const brickFill=new Uint8Array(W*H);
  const setPx=(x,y,v)=>{if(x>=0&&y>=0&&x<W&&y<H){const i=(y*W+x)*4;buf[i]=buf[i+1]=buf[i+2]=v;buf[i+3]=255;}};
  const clrFillMask=(x,y)=>{if(x>=0&&y>=0&&x<W&&y<H)brickFill[y*W+x]=0;};
  const studDrawList=[];
  for(const b of bricks){
    const bx=b.x,by=b.y;
    const coveredStudXs=getCoveredStudXs(b,bx,by,bricks);
    const visibleStuds=getStudCenters(bx,by,b.view,b.rotated,b.size)
      .filter(st=>!coveredStudXs.has(Math.round(st.sx)));
    for(const st of visibleStuds)studDrawList.push(st);
    const bd=getBounds(bx,by,b.view,b.rotated,b.size);
    const x0=Math.max(0,Math.floor(bd.x0)),x1=Math.min(W-1,Math.ceil(bd.x1));
    const y0=Math.max(0,Math.floor(bd.y0)),y1=Math.min(H-1,Math.ceil(bd.y1));
    for(let py=y0;py<=y1;py++){
      for(let px=x0;px<=x1;px++){
        const db=sdfBody(px+.5,py+.5,bx,by,b.view,b.rotated,b.size);
        const i=(py*W+px)*4;
        if(!style||style==='none'){
          // outline style: only whiten body; studs drawn as vector outlines later
          if(db<=0){ buf[i]=buf[i+1]=buf[i+2]=255; brickFill[py*W+px]=1; }
        } else {
          // fill styles: compute df = min(body SDF, stud SDFs)
          let df=db;
          if(rules.showStuds){
            for(const st of visibleStuds){
              const ds=sdBoxS(px+.5,py+.5,st.sx,st.sy,st.hw,st.hh,SR);
              if(ds<df) df=ds;
            }
          }
          if(db<=0){
            buf[i]=buf[i+1]=buf[i+2]=255;
            brickFill[py*W+px]=1;
          } else if(df<=0){
            // stud region outside body — gradient highlight
            let t=-1;
            for(const st of visibleStuds){
              const nx=(px+.5-st.sx)/st.hw,ny=(py+.5-st.sy)/st.hh,e=nx*nx+ny*ny;
              if(e<=1){t=Math.max(t,Math.max(0,1-e));break;}
            }
            if(t>=0){
              const sc2=Math.round(ink+t*42);
              buf[i]=buf[i+1]=buf[i+2]=Math.min(255,sc2);
              brickFill[py*W+px]=1;
            }
          }
        }
      }
    }
    const hw=brickW(b.size)/2,hh=BH/2;
    const xL=Math.round(bx-hw),xR=Math.round(bx+hw),yT=Math.round(by-hh),yB=Math.round(by+hh);
    for(let x=xL;x<=xR;x++)setPx(x,yT,ink);
    for(let y=yT;y<=yB;y++)setPx(xL,y,ink);
    if(!getSharedRightSeam(b,bx,by,bricks))for(let y=yT;y<=yB;y++)setPx(xR,y,ink);
    if(!getSharedBottomSeam(b,bx,by,bricks))for(let x=xL;x<=xR;x++)setPx(x,yB,ink);
    for(let x=xL;x<=xR;x++){clrFillMask(x,yT);clrFillMask(x,yB);}
    for(let y=yT;y<=yB;y++){clrFillMask(xL,y);if(!getSharedRightSeam(b,bx,by,bricks))clrFillMask(xR,y);}
  }
  // Optional pattern styles are preserved as top overlays.
  if(style && style!=='none' && style!=='solid'){
    const spH=Math.max(2,gap*BH*0.095),spD=Math.max(2,gap*BW*0.045),spDot=Math.max(3,gap*BW*0.045);
    for(let i=0;i<buf.length;i+=4){
      const idx=i/4,px=idx%W,py=Math.floor(idx/W);
      if(!brickFill[idx]||buf[i]!==255||buf[i+1]!==255||buf[i+2]!==255)continue;
      let draw=false;
      if(style==='hlines')draw=(py%spH<Math.max(1,stroke*0.85));
      else if(style==='diagonal')draw=((px+py)%spD<Math.max(1,stroke*0.85));
      else if(style==='dots')draw=(px%spDot<2&&py%spDot<2);
      else if(style==='concentric')draw=((Math.abs((px%Math.max(2,gap*0.95)))<Math.max(1,stroke*0.65)));
      if(draw){buf[i]=buf[i+1]=buf[i+2]=ink;}
    }
  }else if(style==='solid'){
    for(let i=0;i<buf.length;i+=4){
      const idx=i/4;
      if(!brickFill[idx]||buf[i]!==255||buf[i+1]!==255||buf[i+2]!==255)continue;
      buf[i]=buf[i+1]=buf[i+2]=ink;
    }
  }
  ctx.putImageData(imgData,0,0);
  // For outline style only: draw stud ellipse stroke outlines as vector (matching source drawVectorStudOutlines)
  if(rules.showStuds&&(!style||style==='none')){
    ctx.save();
    ctx.strokeStyle=`rgb(${ink},${ink},${ink})`;
    ctx.lineWidth=1.1;
    ctx.setLineDash([]);
    for(const st of studDrawList){
      ctx.beginPath();
      ctx.ellipse(st.sx,st.sy,Math.max(1,st.hw),Math.max(1,st.hh),0,0,Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

//  STEP 4: POSTER LAB ENGINE

function p4BricksOf(letter){
  const g=getGrid(letter),out=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(g[r][c])out.push({r,c});
  return out;
}
function p4NormalizeSourceText(v){
  const t=(v||'').toUpperCase().replace(/[^A-Z ]/g,'').replace(/\s+/g,' ').trim();
  return t.slice(0,24);
}
function p4SourceTokens(){
  if(P.sourceMode==='single')return[P.letter];
  const t=p4NormalizeSourceText(P.sourceText);
  return t?t.split(''):[];
}
function p4SourceGeom(){
  const tokens=p4SourceTokens();
  const out=[];let xOff=0;
  const letterStep=COLS+1,spaceStep=Math.max(2,Math.floor(COLS*0.8));
  for(const ch of tokens){
    if(ch===' '){xOff+=spaceStep;continue;}
    const g=getGrid(ch);
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(g[r][c])out.push({r,c:c+xOff});
    xOff+=letterStep;
  }
  if(!out.length)return{bricks:[],cols:COLS};
  let minC=Infinity,maxC=-Infinity;
  for(const b of out){if(b.c<minC)minC=b.c;if(b.c>maxC)maxC=b.c;}
  return{bricks:out.map(b=>({r:b.r,c:b.c-minC})),cols:Math.max(1,maxC-minC+1)};
}
/** One letter’s bricks with column range normalized to 0… (for per-glyph poster placement). */
function p4LetterGeomFor(ch){
  const g=getGrid(ch),bricks=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(g[r][c])bricks.push({r,c});
  if(!bricks.length)return{bricks:[],cols:COLS};
  let minC=Infinity,maxC=-Infinity,minR=Infinity;
  for(const b of bricks){minC=Math.min(minC,b.c);maxC=Math.max(maxC,b.c);minR=Math.min(minR,b.r);}
  return{bricks:bricks.map(b=>({r:b.r-minR,c:b.c-minC})),cols:Math.max(1,maxC-minC+1)};
}
function p4PerLetterGeoms(){
  const out=[];
  for(const ch of p4SourceTokens()){if(ch!==' ')out.push({ch,geom:p4LetterGeomFor(ch)});}
  return out;
}
function p4MultiLayoutActive(){
  return P.sourceMode==='text'&&p4PerLetterGeoms().length>=2&&P.multiLayout!=='merge';
}
function p4Dims(){
  const B=900,m={'1-1':[B,B],'3-4':[675,B],'4-3':[B,675],'16-9':[B,506],'9-16':[506,B]};
  const[w,h]=m[P.aspect]||[675,B];return{w,h};
}
function p4FitCanvas(){
  const cvs=document.getElementById('s4-poster-canvas');
  const area=document.getElementById('s4-canvas-area');
  const{w:PW,h:PH}=p4Dims();
  const aw=area.clientWidth-32,ah=area.clientHeight-32;
  const sc=Math.min(aw/PW,ah/PH,1);
  cvs.style.width=Math.round(PW*sc)+'px';
  cvs.style.height=Math.round(PH*sc)+'px';
}
function p4DrawElem(ctx,cx,cy,cellW,cellH,params,fg){
  ctx.fillStyle=fg;ctx.strokeStyle=fg;
  const elem=params.elem;
  if(elem==='point'){
    const r=Math.max(1,cellW*(params.ptSize/100)*0.5);
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
  } else if(elem==='line'){
    const hw=Math.max(0.5,cellH*(params.lineWeight/100));
    const lw=cellW*(params.lineLen/100)*0.95;
    const lh=cellH*(params.lineLen/100)*0.95;
    ctx.save();ctx.translate(cx,cy);
    if(params.lineDir==='h')ctx.fillRect(-lw/2,-hw/2,lw,hw);
    else if(params.lineDir==='v')ctx.fillRect(-hw/2,-lh/2,hw,lh);
    else if(params.lineDir==='d45'){ctx.rotate(Math.PI/4);const dl=Math.sqrt(lw*lw+lh*lh)*0.7;ctx.fillRect(-dl/2,-hw/2,dl,hw);}
    else{ctx.rotate(-Math.PI/4);const dl=Math.sqrt(lw*lw+lh*lh)*0.7;ctx.fillRect(-dl/2,-hw/2,dl,hw);}
    ctx.restore();
  } else {
    const g=Math.max(0,params.planeGap);
    ctx.fillRect(cx-cellW/2+g,cy-cellH/2+g,cellW-g*2,cellH-g*2);
  }
}
function p4DrawLetterGeom(ctx,geom,lcx,lcy,size,params,fg){
  const fitW=size*1.8;
  const cellW=Math.min(size/ROWS,fitW/Math.max(1,geom.cols));
  const cellH=cellW;
  const totalW=geom.cols*cellW;
  const totalH=ROWS*cellH;
  const x0=lcx-totalW/2;
  const y0=lcy-totalH/2;
  for(const{r,c}of geom.bricks){
    p4DrawElem(ctx,x0+(c+0.5)*cellW,y0+(r+0.5)*cellH,cellW,cellH,params,fg);
  }
}
/** Merged source geometry for current tokens (single blob). `letter` arg unused, kept for call sites. */
function p4DrawLetter(ctx,letter,lcx,lcy,size,params,fg){
  p4DrawLetterGeom(ctx,p4SourceGeom(),lcx,lcy,size,params,fg);
}
function p4Seeded(seed){let s=seed;return()=>{s=(s*1664525+1013904223)&0xffffffff;return(s>>>0)/0xffffffff;};}
function p4MotionParams(t){
  const sin01=v=>0.5+0.5*Math.sin(v);
  let{ptSize,lineWeight,lineLen,planeGap,lineDir,elem}=P;
  if(P.motion==='pulse'){
    if(elem==='point')ptSize=P.ptSize*(0.3+0.9*sin01(t*1.2));
    else if(elem==='line')lineWeight=P.lineWeight*(0.2+1.1*sin01(t*1.1));
    else planeGap=P.planeGap+8*sin01(t*0.9);
  } else if(P.motion==='drift'){
    if(elem==='line')lineLen=P.lineLen*(0.2+1.1*sin01(t*0.85));
    else if(elem==='point')ptSize=P.ptSize*(0.4+0.8*sin01(t*0.7));
    else planeGap=P.planeGap*sin01(t*0.8)*2;
  } else if(P.motion==='morph'){
    if(elem==='line'){
      const dirs=['h','v','d45','d135'];
      lineDir=dirs[Math.floor(t/1.8)%4];
      lineWeight=P.lineWeight*(0.6+0.6*sin01(t*1.3));
    } else if(elem==='point'){
      const sizes=[P.ptSize*0.4, P.ptSize*1.0, P.ptSize*1.8];
      ptSize=sizes[Math.floor(t/1.6)%3];
    } else {
      const gaps=[0, P.planeGap*1.5, P.planeGap*3.5];
      planeGap=gaps[Math.floor(t/1.6)%3];
    }
  } else if(P.motion==='full'){
    ptSize=P.ptSize*(0.3+0.9*sin01(t*1.1));
    lineWeight=P.lineWeight*(0.2+1.1*sin01(t*1.0));
    lineLen=P.lineLen*(0.25+1.0*sin01(t*0.8));
    planeGap=P.planeGap+7*sin01(t*0.9);
    lineDir=['h','v','d45','d135'][Math.floor(t/2.2)%4];
  }
  const sf=P.motion==='none'?1:P.motion==='pulse'?(0.4+0.8*sin01(t*0.9)):P.motion==='drift'?(0.1+1.2*sin01(t*0.65)):P.motion==='full'?(0.1+1.3*sin01(t*0.72)):1;
  return{elem,ptSize:Math.max(1,ptSize),lineWeight:Math.max(0.5,lineWeight),lineLen:Math.max(5,Math.min(200,lineLen)),planeGap:Math.max(0,planeGap),lineDir,spreadFactor:sf};
}
function p4Compose(ctx,PW,PH,t){
  const params=p4MotionParams(t);
  const ox=P.ox*(PW/100),oy=P.oy*(PH/100);
  const src=p4SourceGeom();
  ctx.fillStyle=P.bg;ctx.fillRect(0,0,PW,PH);

  const slots=p4PerLetterGeoms();
  if(p4MultiLayoutActive()){
    const baseSize=Math.min(PW,PH)*P.scale*0.52/Math.max(1,Math.sqrt(slots.length));
    const seed0=(p4NormalizeSourceText(P.sourceText)||'AZ').split('').reduce((a,ch)=>a+ch.charCodeAt(0),0);
    if(P.multiLayout==='letters_scatter'){
      /** Same scale & rotation for every letter; only **positions** vary (seeded, stable). */
      const mx=PW*0.1,my=PH*0.08,mw=PW*0.8,mh=PH*0.82;
      const rot=P.rotation;
      for(let i=0;i<slots.length;i++){
        const rng=p4Seeded(seed0+i*7919+slots.length*31);
        const lx=mx+rng()*mw,ly=my+rng()*mh;
        ctx.save();
        ctx.translate(lx,ly);ctx.rotate(rot*Math.PI/180);ctx.translate(-lx,-ly);
        p4DrawLetterGeom(ctx,slots[i].geom,lx,ly,baseSize,params,P.fg);
        ctx.restore();
      }
      return;
    }
    if(P.multiLayout==='letters_ring'){
      const cx=PW/2+ox*0.35,cy=PH/2+oy*0.35;
      const R=Math.min(PW,PH)*0.36*P.scale;
      for(let i=0;i<slots.length;i++){
        const a=-Math.PI/2+i*(2*Math.PI/slots.length);
        const lx=cx+R*Math.cos(a),ly=cy+R*Math.sin(a);
        const rot=a*180/Math.PI+90+P.rotation;
        ctx.save();
        ctx.translate(lx,ly);ctx.rotate(rot*Math.PI/180);ctx.translate(-lx,-ly);
        p4DrawLetterGeom(ctx,slots[i].geom,lx,ly,baseSize,params,P.fg);
        ctx.restore();
      }
      return;
    }
    if(P.multiLayout==='letters_arc'){
      const span=Math.min(PW*0.84,baseSize*1.28*slots.length);
      const x0=PW/2-span/2+ox*0.25;
      const yBase=PH*0.58+oy*0.2;
      for(let i=0;i<slots.length;i++){
        const u=slots.length===1?0.5:i/(slots.length-1);
        const lx=x0+u*span;
        const dip=Math.sin(u*Math.PI)*PH*0.14;
        const ly=yBase+dip;
        const rot=-38*(u-0.5)+P.rotation;
        ctx.save();
        ctx.translate(lx,ly);ctx.rotate(rot*Math.PI/180);ctx.translate(-lx,-ly);
        p4DrawLetterGeom(ctx,slots[i].geom,lx,ly,baseSize*0.95,params,P.fg);
        ctx.restore();
      }
      return;
    }
    if(P.multiLayout==='letters_banner'){
      const y=PH*0.45+oy*0.35;
      const span=Math.min(PW*0.86,baseSize*1.12*slots.length);
      const x0=PW/2-span/2+ox*0.3;
      for(let i=0;i<slots.length;i++){
        const lx=x0+((i+0.5)/slots.length)*span;
        ctx.save();
        ctx.translate(lx,y);ctx.rotate(P.rotation*Math.PI/180);ctx.translate(-lx,-y);
        p4DrawLetterGeom(ctx,slots[i].geom,lx,y,baseSize*1.08,params,P.fg);
        ctx.restore();
      }
      return;
    }
    if(P.multiLayout==='letters_stack'){
      const x=PW*0.5+ox*0.35;
      const vspan=Math.min(PH*0.76,baseSize*1.08*slots.length);
      const y0=PH/2-vspan/2+oy*0.3;
      for(let i=0;i<slots.length;i++){
        const ly=y0+((i+0.5)/slots.length)*vspan;
        ctx.save();
        ctx.translate(x,ly);ctx.rotate(P.rotation*Math.PI/180);ctx.translate(-x,-ly);
        p4DrawLetterGeom(ctx,slots[i].geom,x,ly,baseSize*1.02,params,P.fg);
        ctx.restore();
      }
      return;
    }
  }

  function stamp(lcx,lcy,size,alpha,rot){
    ctx.save();ctx.globalAlpha=alpha;
    ctx.translate(lcx,lcy);ctx.rotate(rot*Math.PI/180);ctx.translate(-lcx,-lcy);
    p4DrawLetter(ctx,P.letter,lcx,lcy,size,params,P.fg);
    ctx.restore();
  }

  const lcx=PW/2+ox,lcy=PH/2+oy;
  const size=Math.min(PW,PH)*P.scale;
  const fitW=size*1.8;
  const cellW=Math.min(size/ROWS,fitW/Math.max(1,src.cols));
  const cellH=cellW;
  const srcW=src.cols*cellW;
  const srcH=ROWS*cellH;
  const x0=lcx-srcW/2;
  const y0=lcy-srcH/2;

  if(P.comp==='center'){
    ctx.save();ctx.translate(lcx,lcy);ctx.rotate(P.rotation*Math.PI/180);ctx.translate(-lcx,-lcy);
    p4DrawLetter(ctx,P.letter,lcx,lcy,size,params,P.fg);ctx.restore();

  } else if(P.comp==='mirror'){
    for(const[sx,sy]of[[1,1],[-1,1],[1,-1],[-1,-1]]){
      ctx.save();ctx.translate(lcx,lcy);ctx.scale(sx,sy);ctx.rotate(P.rotation*Math.PI/180);
      for(const{r,c}of src.bricks){
        const cx=-srcW/2+(c+0.5)*cellW;
        const cy=-srcH/2+(r+0.5)*cellH;
        p4DrawElem(ctx,cx,cy,cellW,cellH,params,P.fg);
      }
      ctx.restore();
    }

  } else if(P.comp==='tile'){
    const cell=Math.min(PW,PH)*P.scale*0.38;
    const cols=Math.ceil(PW/cell)+2,rows=Math.ceil(PH/cell)+2;
    const sx=((ox%cell)+cell)%cell-cell,sy=((oy%cell)+cell)%cell-cell;
    ctx.save();ctx.translate(PW/2,PH/2);ctx.rotate(P.rotation*Math.PI/180);ctx.translate(-PW/2,-PH/2);
    for(let ri=0;ri<rows;ri++)for(let ci=0;ci<cols;ci++){stamp(sx+ci*cell+cell/2,sy+ri*cell+cell/2,cell*0.9,1,0);}
    ctx.restore();

  } else if(P.comp==='split'){
    const sep=PW*0.1;
    ctx.save();ctx.beginPath();ctx.rect(0,0,PW/2,PH);ctx.clip();stamp(lcx-sep,lcy,size,1,P.rotation);ctx.restore();
    ctx.save();ctx.beginPath();ctx.rect(PW/2,0,PW/2,PH);ctx.clip();stamp(lcx+sep,lcy,size,1,P.rotation);ctx.restore();

  } else if(P.comp==='outline'){
    const occ=new Set(src.bricks.map(b=>b.r+'-'+b.c));
    function cell(r,c){if(r<0||r>=ROWS||c<0||c>=src.cols)return 0;return occ.has(r+'-'+c)?1:0;}
    const segs=[];
    for(let r=0;r<ROWS;r++)for(let c=0;c<src.cols;c++){
      if(!cell(r,c))continue;
      if(!cell(r-1,c))segs.push({x1:c,y1:r,x2:c+1,y2:r});
      if(!cell(r+1,c))segs.push({x1:c,y1:r+1,x2:c+1,y2:r+1});
      if(!cell(r,c-1))segs.push({x1:c,y1:r,x2:c,y2:r+1});
      if(!cell(r,c+1))segs.push({x1:c+1,y1:r,x2:c+1,y2:r+1});
    }
    ctx.save();ctx.translate(lcx,lcy);ctx.rotate(P.rotation*Math.PI/180);ctx.translate(-lcx,-lcy);
    if(params.elem==='point'){
      const spacing=Math.max(3,cellW*0.5);
      const rad=Math.max(1,cellW*(params.ptSize/100)*0.5);
      ctx.fillStyle=P.fg;
      for(const{x1,y1,x2,y2}of segs){
        const px1=x0+x1*cellW,py1=y0+y1*cellH,px2=x0+x2*cellW,py2=y0+y2*cellH;
        const len=Math.sqrt((px2-px1)**2+(py2-py1)**2);
        const n=Math.max(1,Math.round(len/spacing));
        for(let i=0;i<=n;i++){
          const t2=i/n;
          ctx.beginPath();ctx.arc(px1+(px2-px1)*t2,py1+(py2-py1)*t2,rad,0,Math.PI*2);ctx.fill();
        }
      }
    } else if(params.elem==='line'){
      const lw=Math.max(1.5,cellH*(params.lineWeight/100));
      ctx.strokeStyle=P.fg;ctx.lineWidth=lw;ctx.lineCap='square';ctx.beginPath();
      for(const{x1,y1,x2,y2}of segs){
        ctx.moveTo(x0+x1*cellW,y0+y1*cellH);ctx.lineTo(x0+x2*cellW,y0+y2*cellH);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle=P.fg;
      for(const{x1,y1,x2,y2}of segs){
        const isH=y1===y2;
        const pw=isH?(x2-x1)*cellW:Math.max(2,cellW*0.3-params.planeGap);
        const ph=isH?Math.max(2,cellH*0.3-params.planeGap):(y2-y1)*cellH;
        ctx.fillRect(x0+x1*cellW,y0+y1*cellH,pw,ph);
      }
    }
    ctx.restore();

  } else if(P.comp==='scatter'){
    ctx.save();ctx.translate(lcx,lcy);ctx.rotate(P.rotation*Math.PI/180);ctx.translate(-lcx,-lcy);
    const jitter=cellW*1.1*params.spreadFactor;
    let bi=0;
    for(const{r,c}of src.bricks){
      const cx=x0+(c+0.5)*cellW,cy=y0+(r+0.5)*cellH;
      const seedChar=(p4NormalizeSourceText(P.sourceText)[0]||P.letter).charCodeAt(0);
      const rng=p4Seeded((r*97+c*131+bi*17)*137+seedChar);bi++;
      p4DrawElem(ctx,cx+(rng()-0.5)*2*jitter,cy+(rng()-0.5)*2*jitter,cellW,cellH,params,P.fg);
    }
    ctx.restore();
  }
}
function p4DrawGuide(ctx,PW,PH){
  if(P.guide==='none')return;
  ctx.save();ctx.strokeStyle='rgba(0,100,255,0.32)';ctx.lineWidth=0.7;ctx.setLineDash([4,5]);
  if(P.guide==='thirds'){[1,2].forEach(i=>{ctx.beginPath();ctx.moveTo(PW/3*i,0);ctx.lineTo(PW/3*i,PH);ctx.stroke();ctx.beginPath();ctx.moveTo(0,PH/3*i);ctx.lineTo(PW,PH/3*i);ctx.stroke();});}
  else if(P.guide==='center'){ctx.beginPath();ctx.moveTo(PW/2,0);ctx.lineTo(PW/2,PH);ctx.stroke();ctx.beginPath();ctx.moveTo(0,PH/2);ctx.lineTo(PW,PH/2);ctx.stroke();}
  else if(P.guide==='golden'){ctx.beginPath();ctx.moveTo(PW*0.618,0);ctx.lineTo(PW*0.618,PH);ctx.stroke();ctx.beginPath();ctx.moveTo(0,PH*0.618);ctx.lineTo(PW,PH*0.618);ctx.stroke();}
  ctx.restore();
}
function p4Render(t){
  const cvs=document.getElementById('s4-poster-canvas');if(!cvs)return;
  const{w:PW,h:PH}=p4Dims();
  cvs.width=PW;cvs.height=PH;p4FitCanvas();
  const ctx=cvs.getContext('2d');
  p4Compose(ctx,PW,PH,t||0);
  p4DrawGuide(ctx,PW,PH);
}
function p4StopAnim(){if(p4Raf){cancelAnimationFrame(p4Raf);p4Raf=null;}}
function p4StartAnim(){
  p4StopAnim();
  if(P.motion==='none'){p4Render(0);return;}
  const loop=()=>{p4Phase+=0.038;p4Render(p4Phase);p4Raf=requestAnimationFrame(loop);};
  p4Raf=requestAnimationFrame(loop);
}
// ── no drag
function p4ExportPng(){
  const prev=P.motion;P.motion='none';p4Render(0);P.motion=prev;
  const srcTag=P.sourceMode==='single'?P.letter:(p4NormalizeSourceText(P.sourceText).replace(/ /g,'-')||'text');
  const a=document.createElement('a');a.download='rule-system-poster-'+srcTag+'.png';
  a.href=document.getElementById('s4-poster-canvas').toDataURL('image/png');a.click();
  if(prev!=='none')p4StartAnim();
  setStatus('Exported PNG');
}
function p4ExportWebM(){
  const cvs=document.getElementById('s4-poster-canvas');
  if(!cvs.captureStream||!window.MediaRecorder){setStatus('WebM needs Chrome/Edge');return;}
  const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
  p4StopAnim();const prevM=P.motion;if(P.motion==='none')P.motion='full';p4Phase=0;
  const stream=cvs.captureStream(30);
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4000000});
  const chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  rec.onstop=()=>{
    P.motion=prevM;
    const blob=new Blob(chunks,{type:'video/webm'});const url=URL.createObjectURL(blob);
    const srcTag=P.sourceMode==='single'?P.letter:(p4NormalizeSourceText(P.sourceText).replace(/ /g,'-')||'text');
    const a=document.createElement('a');a.href=url;a.download='rule-system-poster-'+srcTag+'-motion.webm';a.click();
    URL.revokeObjectURL(url);
    document.getElementById('s4-rec-badge').classList.remove('vis');
    document.getElementById('s4-rec-bar').style.display='none';
    document.getElementById('s4-rec-fill').style.width='0%';
    p4StartAnim();setStatus('Exported WebM');
  };
  document.getElementById('s4-rec-badge').classList.add('vis');
  document.getElementById('s4-rec-bar').style.display='block';
  const start=Date.now(),TOTAL=5000;let active=true;
  const loop=()=>{if(!active)return;p4Phase+=0.048;p4Render(p4Phase);
    const pct=Math.min(100,(Date.now()-start)/TOTAL*100);
    document.getElementById('s4-rec-fill').style.width=pct+'%';
    document.getElementById('s4-rec-time').textContent=((TOTAL-(Date.now()-start))/1000).toFixed(1)+'s';
    p4RecRaf=requestAnimationFrame(loop);};
  rec.start(200);loop();
  setTimeout(()=>{active=false;if(p4RecRaf)cancelAnimationFrame(p4RecRaf);if(rec.state==='recording')rec.stop();},TOTAL+200);
}
function p4Randomize(){
  P.elem=['point','line','plane'][Math.floor(Math.random()*3)];
  P.lineDir=['h','v','d45','d135'][Math.floor(Math.random()*4)];
  P.ptSize=4+Math.floor(Math.random()*24);P.lineWeight=2+Math.random()*18;
  P.lineLen=30+Math.random()*120;P.planeGap=Math.random()*10;
  P.comp=['center','mirror','tile','split','outline','scatter'][Math.floor(Math.random()*6)];
  if(P.sourceMode==='text'&&p4PerLetterGeoms().length>=2){
    P.multiLayout=['merge','letters_scatter','letters_ring','letters_arc','letters_banner','letters_stack'][Math.floor(Math.random()*6)];
  }else P.multiLayout='merge';
  P.motion=['none','pulse','drift','morph','full'][Math.floor(Math.random()*5)];
  P.scale=0.4+Math.random()*1.2;P.rotation=Math.round((Math.random()-0.5)*60);
  const fgs=['#1a1a1a','#ffffff','#d4ff00','#ff3b00','#0057ff','#ff00aa'];
  const bgs=['#ffffff','#1a1a1a','#f0efeb','#0a0a2e','#d4ff00'];
  P.fg=fgs[Math.floor(Math.random()*fgs.length)];P.bg=bgs[Math.floor(Math.random()*bgs.length)];
  p4SyncUI();p4StartAnim();setStatus('Randomized — '+P.elem+' · '+P.comp+' · '+P.motion);
}
function p4SyncElemParams(){
  document.querySelectorAll('.param-block').forEach(b=>b.classList.remove('vis'));
  const pb=document.getElementById('s4-params-'+P.elem);if(pb)pb.classList.add('vis');
}
function p4UpdateMultiLayoutVisibility(){
  const n=p4PerLetterGeoms().length;
  /** Single: hide whole block. Text with one letter: hide. Text + 2+ letters: show (reliable hide via CSS on wrapper). */
  const show=P.sourceMode==='text'&&n>=2;
  const block=document.getElementById('s4-multi-comp-wrap');
  const wrap=document.getElementById('s4-multi-layout-pills');
  if(block)block.classList.toggle('s4-multi-comp-wrap--off',!show);
  if(wrap){
    wrap.querySelectorAll('.pill').forEach(p=>{
      p.disabled=false;
      p.removeAttribute('aria-disabled');
    });
  }
  if(!show&&P.multiLayout!=='merge')P.multiLayout='merge';
}
function p4SyncLayoutVisibility(){
  const wrap=document.getElementById('s4-layout-wrap');
  const scaleLabel=document.getElementById('s4-scale-sec-label');
  const show=P.sourceMode!=='text';
  if(!show&&P.comp!=='center')P.comp='center';
  if(wrap)wrap.hidden=!show;
  if(scaleLabel)scaleLabel.innerHTML=(show?'4':'3')+') Scale &amp; rotate';
}
function p4SyncUI(){
  const qp=(gid,val)=>document.querySelectorAll('#'+gid+' .pill, #'+gid+' .mstep').forEach(p=>p.classList.toggle('on',p.dataset.v===val));
  p4UpdateMultiLayoutVisibility();
  p4SyncLayoutVisibility();
  qp('s4-elem-pills',P.elem);qp('s4-line-dir-pills',P.lineDir);qp('s4-comp-pills',P.comp);
  qp('s4-multi-layout-pills',P.multiLayout);
  qp('s4-aspect-pills',P.aspect);qp('s4-motion-strip',P.motion);qp('s4-source-mode-pills',P.sourceMode);
  document.getElementById('s4-pt-size').value=P.ptSize;document.getElementById('s4-rv-pt-size').textContent=P.ptSize;
  document.getElementById('s4-ln-weight').value=P.lineWeight;document.getElementById('s4-rv-ln-weight').textContent=P.lineWeight.toFixed(1);
  document.getElementById('s4-ln-len').value=P.lineLen;document.getElementById('s4-rv-ln-len').textContent=Math.round(P.lineLen)+'%';
  document.getElementById('s4-pl-gap').value=P.planeGap;document.getElementById('s4-rv-pl-gap').textContent=P.planeGap.toFixed(1);
  document.getElementById('s4-scale').value=Math.round(P.scale*100);document.getElementById('s4-rv-scale').textContent=P.scale.toFixed(2);
  document.getElementById('s4-rot').value=P.rotation;document.getElementById('s4-rv-rot').textContent=P.rotation+'°';
  document.querySelectorAll('#s4-bg-sw .swatch[data-v]').forEach(s=>s.classList.toggle('on',s.dataset.v===P.bg));
  document.querySelectorAll('#s4-fg-sw .swatch[data-v]').forEach(s=>s.classList.toggle('on',s.dataset.v===P.fg));
  document.querySelectorAll('#s4-letter-row .pletter').forEach(b=>b.classList.toggle('on',b.dataset.v===P.letter));
  const tw=document.getElementById('s4-source-text-wrap');if(tw)tw.hidden=P.sourceMode!=='text';
  const ti=document.getElementById('s4-source-text');if(ti)ti.value=p4NormalizeSourceText(P.sourceText);
  p4SyncElemParams();
}

// ══════════════════════════════════════
//  STEP 1-3 UI
// ══════════════════════════════════════
let maskPainting=false,maskPaintMode=1;
function paintMaskCell(r,c){
  if(rules.mask[r][c]===maskPaintMode)return;
  rules.mask[r][c]=maskPaintMode;
  const cell=document.querySelector(`#mask-grid .mg-cell[data-r="${r}"][data-c="${c}"]`);
  if(cell)cell.classList.toggle('on',!!maskPaintMode);
  applyRuleChange();
}
function buildMaskGrid(){
  const el=document.getElementById('mask-grid');if(!el)return;
  el.innerHTML='';
  el.oncontextmenu=e=>e.preventDefault();
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const cell=document.createElement('div');cell.className='mg-cell'+(rules.mask[r][c]?' on':'');
    cell.dataset.r=String(r);cell.dataset.c=String(c);
    cell.addEventListener('mousedown',e=>{
      e.preventDefault();
      maskPaintMode=e.button===2?0:(rules.mask[r][c]?0:1);
      maskPainting=true;
      paintMaskCell(r,c);
    });
    cell.addEventListener('mouseenter',()=>{
      if(maskPainting)paintMaskCell(r,c);
      refreshMaskMini({r,c});
    });
    cell.addEventListener('mouseleave',()=>refreshMaskMini(null));
    el.appendChild(cell);
  }
}
window.addEventListener('mouseup',()=>{maskPainting=false;});
function refreshMaskMini(highlight){
  const cvs=document.getElementById('mask-preview-mini');if(!cvs)return;
  const ctx=cvs.getContext('2d');const W=cvs.width,H=cvs.height;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  const cellW=W/COLS,cellH=H/ROWS;const gen=generateGrid(previewLetter);
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const x=c*cellW,y=r*cellH;
    if(!rules.mask[r][c]){ctx.fillStyle='#f0f0f0';ctx.fillRect(x+1,y+1,cellW-2,cellH-2);ctx.strokeStyle='#ddd';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+3,y+3);ctx.lineTo(x+cellW-3,y+cellH-3);ctx.stroke();}
    else{if(gen[r][c]){ctx.fillStyle='#222';ctx.fillRect(x+2,y+2,cellW-4,cellH-4);}else{ctx.fillStyle='#eee';ctx.fillRect(x+1,y+1,cellW-2,cellH-2);}}
    if(highlight&&highlight.r===r&&highlight.c===c){ctx.fillStyle='rgba(0,120,255,0.18)';ctx.fillRect(x,y,cellW,cellH);ctx.strokeStyle='rgba(0,120,255,0.6)';ctx.lineWidth=1.5;ctx.strokeRect(x+0.75,y+0.75,cellW-1.5,cellH-1.5);}
  }
  ctx.strokeStyle='#e8e8e8';ctx.lineWidth=0.5;
  for(let r=0;r<=ROWS;r++){ctx.beginPath();ctx.moveTo(0,r*cellH);ctx.lineTo(W,r*cellH);ctx.stroke();}
  for(let c=0;c<=COLS;c++){ctx.beginPath();ctx.moveTo(c*cellW,0);ctx.lineTo(c*cellW,H);ctx.stroke();}
}
const MASK_PRESETS={all:()=>Array.from({length:ROWS},()=>[1,1,1,1]),left:()=>Array.from({length:ROWS},()=>[1,1,0,0]),right:()=>Array.from({length:ROWS},()=>[0,0,1,1]),top:()=>Array.from({length:ROWS},(_,r)=>r<3?[1,1,1,1]:[0,0,0,0]),bottom:()=>Array.from({length:ROWS},(_,r)=>r>=2?[1,1,1,1]:[0,0,0,0]),'center-col':()=>Array.from({length:ROWS},()=>[0,1,1,0])};
document.querySelectorAll('#mask-presets .pill').forEach(p=>p.addEventListener('click',()=>{const pr=MASK_PRESETS[p.dataset.preset];if(!pr)return;rules.mask=pr();document.querySelectorAll('#mask-presets .pill').forEach(q=>q.classList.toggle('on',q===p));buildMaskGrid();applyRuleChange();}));
function buildPreviewSel(){
  const el=document.getElementById('preview-letter-sel');if(!el)return;el.innerHTML='';
  for(const l of LETTERS){const b=document.createElement('div');b.className='pletter'+(l===previewLetter?' on':'');b.textContent=l;b.addEventListener('click',()=>{previewLetter=l;document.getElementById('mask-preview-letter-label').textContent=l;document.querySelectorAll('#preview-letter-sel .pletter').forEach(x=>x.classList.toggle('on',x.textContent===l));refreshPreview();});el.appendChild(b);}
}
function buildS1AZGrid(){
  const el=document.getElementById('s1-az-grid');if(!el)return;
  el.innerHTML='';
  for(const letter of LETTERS){
    const card=document.createElement('div');card.className='lcard lcard--s1';card.id='s1-lcard-'+letter;
    const cvs=document.createElement('canvas');cvs.width=LCARD_PX;cvs.height=LCARD_PX;card.appendChild(cvs);
    const ln=document.createElement('div');ln.className='lname';ln.textContent=letter;card.appendChild(ln);
    el.appendChild(card);
  }
}
function refreshS1PreviewGrid(){
  for(const letter of LETTERS){
    const card=document.getElementById('s1-lcard-'+letter);if(!card)continue;
    const cvs=card.querySelector('canvas');const ctx=cvs.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,cvs.width,cvs.height);
    drawLetterGrid(ctx,generateGrid(letter),cvs.width,cvs.height,rules.style,rules.stroke,rules.gap,20,255);
  }
}
function buildAZGrid(){
  const el=document.getElementById('az-grid');el.innerHTML='';
  for(const letter of LETTERS){
    const card=document.createElement('div');card.className='lcard';card.id='lcard-'+letter;
    const resetBtn=document.createElement('button');resetBtn.type='button';resetBtn.className='lcard-reset-btn';resetBtn.textContent='Reset';
    resetBtn.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();if(azViewMode!=='yours')return;if(!overrides[letter])return;resetOverride(letter);});
    card.appendChild(resetBtn);
    const cvs=document.createElement('canvas');cvs.width=LCARD_PX;cvs.height=LCARD_PX;card.appendChild(cvs);
    const ln=document.createElement('div');ln.className='lname';ln.textContent=letter;card.appendChild(ln);
    const od=document.createElement('div');od.className='odot';card.appendChild(od);
    const ds=document.createElement('div');ds.className='diff-strip';const df=document.createElement('div');df.className='diff-fill';ds.appendChild(df);card.appendChild(ds);
    card.addEventListener('click',()=>{if(azViewMode!=='yours')return;openOverride(letter);});
    el.appendChild(card);
  }
}
function gridKey(g){return g.map(r=>r.join('')).join('|');}
function detectCollisions(){
  const seen={};
  const pairs=[];
  for(const l of LETTERS){
    const k=gridKey(generateGrid(l));
    if(seen[k])pairs.push([seen[k],l]);
    else seen[k]=l;
  }
  return pairs;
}
/** Max 1 cell/col + merge any + strip isolates — strips almost all skeleton detail before identity pins. */
function isAggressiveReadabilityPreset(){
  return rules.density<=1&&rules.rowDensity<=1&&rules.continuity===0&&rules.weight===0;
}
function usesStructuralSymmetry(){
  return rules.symmetry==='mirror'||rules.symmetry==='rotate';
}
/**
 * Mirror / rotate halves effective freedom; with sparse or 1–2 cells/col many silhouettes collapse.
 * Skipped when `isAggressiveReadabilityPreset()` already covers the case.
 */
function isSymmetryReadabilityRisk(){
  if(!usesStructuralSymmetry())return false;
  if(isAggressiveReadabilityPreset())return false;
  return rules.density<=1
    ||(rules.density<=2&&rules.weight===0)
    ||(rules.weight===0&&rules.continuity===0)
    ||rules.rowDensity<=1
    ||(rules.rowDensity<=2&&rules.weight===0);
}
function countDistinctRuleGrids(){
  const s=new Set();
  for(const l of LETTERS)s.add(gridKey(generateGrid(l)));
  return s.size;
}
function updateReadabilityBanner(){
  const collisions=detectCollisions();
  const distinct=countDistinctRuleGrids();
  const meanCells=LETTERS.reduce((sum,l)=>sum+gridCount(generateGrid(l)),0)/LETTERS.length;
  const banner=document.getElementById('readability-warn');
  const bannerText=document.getElementById('readability-warn-text');
  if(!banner||!bannerText)return;
  if(collisions.length>0){
    const pairs=collisions.map(([a,b])=>a+' = '+b).join('  ·  ');
    const tail=isAggressiveReadabilityPreset()||isSymmetryReadabilityRisk()
      ? ' — Very strict rules and/or mirror·rotate symmetry strip detail; raise max cells/column, set Neighbor pass to Off, tighten merge, or use As drawn symmetry.'
      : '';
    bannerText.textContent=collisions.length+' pair'+(collisions.length>1?'s':'')+' look identical: '+pairs+tail;
    banner.style.display='block';
  }else if(isAggressiveReadabilityPreset()){
    bannerText.textContent=
      'Typography / alphabet risk: max 1 cell per column + Any merge + Strip isolates removes most readable structure. Letters are easy to confuse — try density ≥2, Neighbor pass Off, or merge ≥ No singletons. '+
      `(${distinct}/26 distinct silhouettes · ~${meanCells.toFixed(1)} cells/letter avg.)`;
    banner.style.display='block';
  }else if(isSymmetryReadabilityRisk()){
    const symLabel=rules.symmetry==='mirror'?'Mirror zone (paired columns)':'Rotate zone (180° match)';
    bannerText.textContent=
      `Typography / alphabet risk: ${symLabel} copies half of each letter’s grid, so it stacks badly with Neighbor pass: Strip isolates (or only 1–2 cells per column) — many letters can look the same. Prefer density ≥2 + Neighbor pass Off, or As drawn symmetry. `+
      `(${distinct}/26 distinct silhouettes · ~${meanCells.toFixed(1)} cells/letter avg.)`;
    banner.style.display='block';
  }else if(distinct<20&&meanCells<5){
    bannerText.textContent=
      `Only ${distinct} distinct silhouettes across A–Z (~${meanCells.toFixed(1)} cells/letter avg.) — readability for single-letter use is weak. Loosen rules or widen the mask.`;
    banner.style.display='block';
  }else{
    banner.style.display='none';
  }
}
function refreshPreview(){
  const cvs=document.getElementById('preview-canvas');
  if(cvs){
    const ctx=cvs.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,cvs.width,cvs.height);
    drawLetterGrid(ctx,generateGrid(previewLetter),cvs.width,cvs.height,rules.style,rules.stroke,rules.gap);
  }
  refreshS1PreviewGrid();
  refreshMaskMini(null);updateReadabilityBanner();
}
function refreshLetter(letter){
  const card=document.getElementById('lcard-'+letter);if(!card)return;
  const cvs=card.querySelector('canvas');const ctx=cvs.getContext('2d');
  const fg=exportBg==='black'?235:20,bg=exportBg==='black'?20:255;
  ctx.fillStyle=exportBg==='black'?'#141414':'#fff';ctx.fillRect(0,0,cvs.width,cvs.height);
  drawLetterGrid(ctx,getGrid(letter),cvs.width,cvs.height,rules.style,rules.stroke,rules.gap,fg,bg);
  const rb=card.querySelector('.lcard-reset-btn');
  const isOv=!!overrides[letter];
  card.classList.toggle('overridden',isOv);
  if(isOv){card.querySelector('.diff-fill').style.width=(gridDiff(overrides[letter],generateGrid(letter))*100)+'%';}
  else card.querySelector('.diff-fill').style.width='0%';
  if(rb)rb.style.display=isOv?'block':'none';
}
function refreshAZ(){for(const l of LETTERS)refreshLetter(l);updateOvCount();}
function syncAzBarHint(){const el=document.getElementById('az-bar-hint');if(!el)return;el.textContent='click letter to edit';}
function syncAzViewUI(){
  const root=document.getElementById('s2-right');if(!root)return;
  root.dataset.azView='yours';
  syncAzBarHint();
}
function updateOvCount(){
  const n=Object.keys(overrides).length;
  document.getElementById('ov-count').textContent=n;
  document.getElementById('ov-count2').textContent=n;
  const emptyHint=document.getElementById('s2-ov-empty-hint');
  if(emptyHint)emptyHint.hidden=n>0;
}
function syncRuleSummary(){
  const symLab={free:'As drawn',mirror:'Mirror L↔R',rotate:'180° match'};
  const medLab=MEDIUM_LABELS[normalizeToyMedium(rules.medium)];
  document.getElementById('s2-rule-summary').innerHTML=`Mask &nbsp;<b>${rules.mask.flat().filter(Boolean).length}/20 cells active</b><br>Max cells / column &nbsp;<b>${rules.density}</b><br>Max cells / row &nbsp;<b>${rules.rowDensity}</b><br>Merge rule &nbsp;<b>${RULE_MERGE_READOUT[rules.continuity]}</b><br>Neighbor pass &nbsp;<b>${RULE_FILL_READOUT[rules.weight]}</b><br>Grid symmetry &nbsp;<b>${symLab[rules.symmetry]}</b><br>Style &nbsp;<b>${rules.style}</b><br>Toy medium &nbsp;<b>${medLab}</b>`;
}
function syncExportSummary(){const n=Object.keys(overrides).length;document.getElementById('s3-ov-n').textContent=n;document.getElementById('s3-rule-n').textContent=26-n;}

// typesetting
let _typeTmpCanvas=null,_s3TypeFrameWidth=0,_s3TypeFrameRO=null,_s3TypeRafA=0,_s3TypeRafB=0;
function cancelS3Rafs(){if(_s3TypeRafA)cancelAnimationFrame(_s3TypeRafA);if(_s3TypeRafB)cancelAnimationFrame(_s3TypeRafB);_s3TypeRafA=0;_s3TypeRafB=0;}
function bindS3TypeFrameResize(){
  const frame=document.getElementById('s3-type-frame');if(!frame||_s3TypeFrameRO)return;
  if(typeof ResizeObserver==='undefined')return;
  _s3TypeFrameRO=new ResizeObserver(entries=>{for(const e of entries){const w=e.contentRect.width;if(w>=48)_s3TypeFrameWidth=Math.floor(w);}if(currentStep===3){if(exportFmt==='typeset')renderS3();else scheduleS3Type();}});
  _s3TypeFrameRO.observe(frame);
}
function scheduleS3Type(){cancelS3Rafs();_s3TypeRafA=requestAnimationFrame(()=>{_s3TypeRafA=0;renderS3TypeSample();});}
function scheduleS3TypeAfterLayout(){cancelS3Rafs();_s3TypeRafA=requestAnimationFrame(()=>{_s3TypeRafA=0;_s3TypeRafB=requestAnimationFrame(()=>{_s3TypeRafB=0;renderS3TypeSample();});});}
function typeWordWidth(word,g,tr){return word.length?word.length*g+Math.max(0,word.length-1)*tr:0;}
function typeBreakWord(word,maxW,g,tr){const parts=[];let chunk='';for(const ch of word){const t=chunk+ch;typeWordWidth(t,g,tr)<=maxW||chunk===''?chunk=t:(parts.push(chunk),chunk=ch);}if(chunk)parts.push(chunk);return parts;}
function typeWrapParagraph(para,maxW,g,tr,sw){
  const words=para.split(/\s+/).filter(Boolean);if(!words.length)return[];
  const lines=[];let cur=[],curW=0;
  function flush(){if(cur.length){lines.push(cur.join(' '));cur=[];curW=0;}}
  for(const word of words){for(const piece of typeBreakWord(word,maxW,g,tr)){const pw=typeWordWidth(piece,g,tr);if(!cur.length){cur=[piece];curW=pw;continue;}const need=curW+sw+pw;if(need<=maxW){cur.push(piece);curW=need;}else{flush();cur=[piece];curW=pw;}}}
  flush();return lines;
}

function drawGlyphPLP(ctx,letter,gx,gy,glyph,mode,fgHex){
  const g=getGrid(letter);
  const cellW=glyph/COLS;
  const cellH=glyph/ROWS;
  ctx.fillStyle=fgHex;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(!g[r][c])continue;
    const cx=gx+(c+0.5)*cellW;
    const cy=gy+(r+0.5)*cellH;
    if(mode==='point'){
      const rad=Math.max(1,cellW*0.2);
      ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);ctx.fill();
    } else if(mode==='line'){
      const hw=Math.max(0.8,cellH*0.12);
      ctx.fillRect(cx-cellW*0.44,cy-hw/2,cellW*0.88,hw);
    } else {
      const gap=Math.max(0,cellW*0.06);
      ctx.fillRect(gx+c*cellW+gap,gy+r*cellH+gap,cellW-gap*2,cellH-gap*2);
    }
  }
}

function s3PreviewMaxCssWidth(){
  const el=document.getElementById('s3-preview-area');
  const br=el?.getBoundingClientRect();
  const w=br&&br.width>48?br.width:0;
  return Math.max(320,Math.min(w||960,window.innerWidth*0.62));
}
function renderS3TypeSample(){
  const cvs=document.getElementById('s3-type-canvas');const ta=document.getElementById('s3-type-text');if(!cvs||!ta)return;
  const glyph=+document.getElementById('s3-r-size').value;const track=+document.getElementById('s3-r-track').value;const leadMult=+document.getElementById('s3-r-lead').value/100;
  const fg=exportBg==='black'?235:20,bg=exportBg==='black'?20:255;const fillCol=exportBg==='black'?'#141414':'#fff';
  const fgHex=exportBg==='black'?'#ebebeb':'#1a1a1a';
  const text=ta.value.toUpperCase().replace(/[^A-Z\s\n]/g,'');
  const frame=document.getElementById('s3-type-frame');
  let cssW=_s3TypeFrameWidth;
  if(!cssW||cssW<48){const br=frame?.getBoundingClientRect();cssW=br?Math.floor(br.width):0;}
  if(!cssW||cssW<48){const area=document.getElementById('s3-preview-area');cssW=Math.max(240,Math.floor(area?.getBoundingClientRect().width||560));}
  cssW=Math.max(200,cssW);
  const maxW=Math.max(glyph*3+track*2,cssW-32),spaceW=glyph*0.42,lineH=glyph*leadMult,pad=16;
  const paras=text.split(/\n/);const lineStrings=[];
  for(const para of paras){if(!para.trim()){lineStrings.push('');continue;}lineStrings.push(...typeWrapParagraph(para.trim(),maxW,glyph,track,spaceW));}
  if(!lineStrings.length)lineStrings.push('');
  const cssH=Math.ceil(pad*2+lineStrings.length*lineH);
  const dpr=Math.min(2,window.devicePixelRatio||1);
  cvs.style.width='100%';cvs.style.height=cssH+'px';cvs.width=Math.round(cssW*dpr);cvs.height=Math.round(cssH*dpr);
  const ctx=cvs.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.scale(dpr,dpr);
  ctx.fillStyle=fillCol;ctx.fillRect(0,0,cssW,cssH);

  if(s3ViewMode==='cells'){
    if(!_typeTmpCanvas)_typeTmpCanvas=document.createElement('canvas');
    _typeTmpCanvas.width=Math.max(8,Math.ceil(glyph));_typeTmpCanvas.height=_typeTmpCanvas.width;
    const tctx=_typeTmpCanvas.getContext('2d');
    let y=pad+(lineH-glyph)/2;
    for(const line of lineStrings){
      if(line===''){y+=lineH;continue;}let x=pad;
      const words2=line.split(/\s+/).filter(Boolean);
      for(let wi=0;wi<words2.length;wi++){const word=words2[wi];for(let i=0;i<word.length;i++){const ch=word[i];tctx.fillStyle=fillCol;tctx.fillRect(0,0,glyph,glyph);drawLetterGrid(tctx,getGrid(ch),glyph,glyph,rules.style,rules.stroke,rules.gap,fg,bg);ctx.drawImage(_typeTmpCanvas,x,y);x+=glyph+(i<word.length-1?track:0);}if(wi<words2.length-1)x+=spaceW;}
      y+=lineH;
    }
  } else {
    let y=pad+(lineH-glyph)/2;
    for(const line of lineStrings){
      if(line===''){y+=lineH;continue;}let x=pad;
      const words2=line.split(/\s+/).filter(Boolean);
      for(let wi=0;wi<words2.length;wi++){
        const word=words2[wi];
        for(let i=0;i<word.length;i++){
          drawGlyphPLP(ctx,word[i],x,y,glyph,s3ViewMode,fgHex);
          x+=glyph+(i<word.length-1?track:0);
        }
        if(wi<words2.length-1)x+=spaceW;
      }
      y+=lineH;
    }
  }
}
function renderS3(){
  const cvs=document.getElementById('s3-canvas');
  if(exportFmt==='typeset'){
    renderS3TypeSample();
    const tc=document.getElementById('s3-type-canvas');
    const maxW=s3PreviewMaxCssWidth();
    if(!tc||!tc.width||!tc.height){
      cvs.width=400;cvs.height=120;cvs.style.width='100%';cvs.style.height='auto';
      const x=cvs.getContext('2d');x.fillStyle=exportBg==='black'?'#141414':'#fff';x.fillRect(0,0,cvs.width,cvs.height);
      x.fillStyle='#aaa';x.font='11px Helvetica,Arial,sans-serif';x.fillText('Live typeset preview appears here',12,56);
      return;
    }
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const cssW=tc.width/dpr,cssH=tc.height/dpr;
    const ds=Math.min(1,maxW/Math.max(cssW,1));
    cvs.width=tc.width;
    cvs.height=tc.height;
    cvs.style.width=Math.round(cssW*ds)+'px';
    cvs.style.height=Math.round(cssH*ds)+'px';
    cvs.getContext('2d').drawImage(tc,0,0);
    return;
  }
  const LW=LCARD_PX,LH=LCARD_PX,PAD=LCARD_GAP_PX;const fg=exportBg==='black'?235:20,bg=exportBg==='black'?20:255;
  let W,H;if(exportFmt==='grid'){W=13*LW+14*PAD;H=2*LH+3*PAD;}else{W=26*LW+27*PAD;H=LH+2*PAD;}
  const maxW=s3PreviewMaxCssWidth();const ds=Math.min(1,maxW/W);
  cvs.style.width=Math.round(W*ds)+'px';cvs.style.height=Math.round(H*ds)+'px';cvs.width=W;cvs.height=H;
  const ctx=cvs.getContext('2d');ctx.fillStyle=exportBg==='black'?'#141414':'#fff';ctx.fillRect(0,0,W,H);
  LETTERS.forEach((l,i)=>{
    let ox2,oy2;if(exportFmt==='grid'){ox2=PAD+(i%13)*(LW+PAD);oy2=PAD+Math.floor(i/13)*(LH+PAD);}else{ox2=PAD+i*(LW+PAD);oy2=PAD;}
    const tmp=document.createElement('canvas');tmp.width=LW;tmp.height=LH;const tc=tmp.getContext('2d');tc.fillStyle=exportBg==='black'?'#141414':'#fff';tc.fillRect(0,0,LW,LH);
    drawLetterGrid(tc,getGrid(l),LW,LH,rules.style,rules.stroke,rules.gap,fg,bg);ctx.drawImage(tmp,ox2,oy2);
  });
  scheduleS3TypeAfterLayout();
}

//  OVERRIDE EDITOR

const OW=200,OH=202,OPAD=14;
const CW2=(OW-OPAD*2)/COLS,CH2=(OH-OPAD*2)/ROWS;
let ovLetter=null,ovGrid=null,ovRuleGrid=null,ovPainting=false,ovPaintMode=1;
function openOverride(letter){
  ovLetter=letter;ovRuleGrid=generateGrid(letter);
  ovGrid=overrides[letter]?overrides[letter].map(r=>[...r]):ovRuleGrid.map(r=>[...r]);
  document.getElementById('ov-title').textContent=letter;document.getElementById('os-letter').textContent=letter;document.getElementById('os-rule').textContent=gridCount(ovRuleGrid);
  drawOvCanvas();drawRuleCanvas();updateOvStats();
  document.getElementById('ov-modal').classList.add('vis');
  requestAnimationFrame(()=>{const b=document.getElementById('ov-confirm');if(b)b.focus();});
}
function closeOverride(){document.getElementById('ov-modal').classList.remove('vis');ovLetter=null;}
function drawOvCanvas(){
  const cvs=document.getElementById('ov-canvas');const ctx=cvs.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,OW,OH);ctx.strokeStyle='#f0f0f0';ctx.lineWidth=1;
  for(let r=0;r<=ROWS;r++){const y=OPAD+r*CH2;ctx.beginPath();ctx.moveTo(OPAD,y);ctx.lineTo(OW-OPAD,y);ctx.stroke();}
  for(let c=0;c<=COLS;c++){const x=OPAD+c*CW2;ctx.beginPath();ctx.moveTo(x,OPAD);ctx.lineTo(x,OH-OPAD);ctx.stroke();}
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=OPAD+c*CW2+2,y=OPAD+r*CH2+2,w=CW2-4,h=CH2-4;if(ovGrid[r][c]){ctx.fillStyle='#222';ctx.fillRect(x,y,w,h);}else if(!rules.mask[r][c]){ctx.fillStyle='#f7f7f7';ctx.fillRect(x,y,w,h);}}
}
function drawRuleCanvas(){
  const cvs=document.getElementById('ov-rule-canvas');const ctx=cvs.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,OW,OH);ctx.strokeStyle='#f0f0f0';ctx.lineWidth=1;
  for(let r=0;r<=ROWS;r++){const y=OPAD+r*CH2;ctx.beginPath();ctx.moveTo(OPAD,y);ctx.lineTo(OW-OPAD,y);ctx.stroke();}
  for(let c=0;c<=COLS;c++){const x=OPAD+c*CW2;ctx.beginPath();ctx.moveTo(x,OPAD);ctx.lineTo(x,OH-OPAD);ctx.stroke();}
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){if(!ovRuleGrid[r][c])continue;ctx.fillStyle='#222';ctx.fillRect(OPAD+c*CW2+2,OPAD+r*CH2+2,CW2-4,CH2-4);}
}
function updateOvStats(){if(!ovGrid||!ovRuleGrid)return;document.getElementById('os-yours').textContent=gridCount(ovGrid);document.getElementById('div-fill').style.width=(gridDiff(ovGrid,ovRuleGrid)*100)+'%';}
function ovXY(x,y){const c=Math.floor((x-OPAD)/CW2),r=Math.floor((y-OPAD)/CH2);if(r<0||r>=ROWS||c<0||c>=COLS)return null;return{r,c};}
function ovPaint(x,y,m){const cell=ovXY(x,y);if(!cell)return;ovGrid[cell.r][cell.c]=m;drawOvCanvas();updateOvStats();}
const ovCvs=document.getElementById('ov-canvas');
ovCvs.addEventListener('mousedown',e=>{if(!ovGrid)return;e.preventDefault();const rc=ovCvs.getBoundingClientRect();const x=e.clientX-rc.left,y=e.clientY-rc.top;const cell=ovXY(x,y);if(!cell)return;ovPaintMode=e.button===2?0:(ovGrid[cell.r][cell.c]?0:1);ovPainting=true;ovPaint(x,y,ovPaintMode);});
ovCvs.addEventListener('mousemove',e=>{if(!ovPainting)return;const rc=ovCvs.getBoundingClientRect();ovPaint(e.clientX-rc.left,e.clientY-rc.top,ovPaintMode);});
window.addEventListener('mouseup',()=>{ovPainting=false;});
ovCvs.addEventListener('contextmenu',e=>e.preventDefault());
document.getElementById('ov-close').addEventListener('click',closeOverride);
document.getElementById('ov-modal').addEventListener('click',e=>{if(e.target.id==='ov-modal')closeOverride();});
document.getElementById('ov-reset').addEventListener('click',()=>{if(!ovLetter)return;ovGrid=ovRuleGrid.map(r=>[...r]);drawOvCanvas();updateOvStats();});
document.getElementById('ov-confirm').addEventListener('click',()=>{
  if(!ovLetter||!ovGrid)return;const saved=ovLetter;
  overrides[saved]=ovGrid.map(r=>[...r]);
  if(rulesOverrideSnapshot===null)rulesOverrideSnapshot=cloneRules();
  checkRulesOverrideDesync();refreshLetter(saved);updateOvCount();closeOverride();
  setStatus('Saved — '+saved+' updated');
});
document.addEventListener('keydown',e=>{
  const mod=document.getElementById('ov-modal');if(!mod||!mod.classList.contains('vis'))return;
  if(e.key==='Escape'){e.preventDefault();closeOverride();return;}
  if(e.key==='Enter'&&!e.repeat){e.preventDefault();document.getElementById('ov-confirm')?.click();}
});
function resetOverride(letter){delete overrides[letter];if(Object.keys(overrides).length===0)rulesOverrideSnapshot=null;checkRulesOverrideDesync();refreshLetter(letter);updateOvCount();setStatus('Reset — '+letter+' back to rule grid');}

//  STEP 1-3 CONTROLS

function bindSlider(id,valId,key,fmt){
  const el=document.getElementById(id),vl=document.getElementById(valId);
  function sync(){
    rules[key]=parseFloat(el.value);
    const t=fmt?fmt(rules[key]):rules[key];
    vl.textContent=t;
    el.setAttribute('aria-valuetext',String(t));
  }
  el.addEventListener('input',()=>{sync();applyRuleChange();});
  sync();
}
bindSlider('r-density','rv-density','density');
bindSlider('r-row-density','rv-row-density','rowDensity');
bindSlider('r-cont','rv-cont','continuity',v=>RULE_MERGE_READOUT[v]);
bindSlider('r-weight','rv-weight','weight',v=>RULE_FILL_READOUT[v]);
bindSlider('r-stroke','rv-stroke','stroke',v=>v.toFixed(1));
bindSlider('r-gap','rv-gap','gap',v=>v.toFixed(1));
document.getElementById('r-show-studs').addEventListener('change',e=>{
  rules.showStuds=!!e.target.checked;
  refreshPreview();
  if(currentStep>=2)refreshAZ();
  if(currentStep>=3)renderS3();
});
document.getElementById('rv-cont').textContent=RULE_MERGE_READOUT[0];document.getElementById('rv-weight').textContent=RULE_FILL_READOUT[1];
function bindPills(gid,key){document.querySelectorAll('#'+gid+' .pill').forEach(p=>p.addEventListener('click',()=>{rules[key]=p.dataset.v;document.querySelectorAll('#'+gid+' .pill').forEach(q=>q.classList.toggle('on',q===p));applyRuleChange();}));}
bindPills('sym-pills','symmetry');bindPills('style-pills','style');bindPills('medium-pills','medium');
document.getElementById('btn-rand-rules').addEventListener('click',()=>{
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)rules.mask[r][c]=Math.random()<0.78?1:0;
  rules.density=1+Math.floor(Math.random()*5);rules.rowDensity=1+Math.floor(Math.random()*COLS);rules.continuity=Math.floor(Math.random()*3);rules.weight=Math.floor(Math.random()*3);
  rules.symmetry=['free','mirror','rotate'][Math.floor(Math.random()*3)];rules.stroke=+(0.7+Math.random()*1.8).toFixed(1);rules.gap=+(3+Math.random()*10).toFixed(1);
  rules.style=['none','concentric','hlines','diagonal','dots','solid'][Math.floor(Math.random()*6)];
  rules.medium=TOY_MEDIA_KEYS[Math.floor(Math.random()*TOY_MEDIA_KEYS.length)];
  document.getElementById('r-density').value=rules.density;document.getElementById('rv-density').textContent=rules.density;document.getElementById('r-density').setAttribute('aria-valuetext',String(rules.density));
  document.getElementById('r-row-density').value=rules.rowDensity;document.getElementById('rv-row-density').textContent=rules.rowDensity;document.getElementById('r-row-density').setAttribute('aria-valuetext',String(rules.rowDensity));
  document.getElementById('r-cont').value=rules.continuity;document.getElementById('rv-cont').textContent=RULE_MERGE_READOUT[rules.continuity];document.getElementById('r-cont').setAttribute('aria-valuetext',RULE_MERGE_READOUT[rules.continuity]);
  document.getElementById('r-weight').value=rules.weight;document.getElementById('rv-weight').textContent=RULE_FILL_READOUT[rules.weight];document.getElementById('r-weight').setAttribute('aria-valuetext',RULE_FILL_READOUT[rules.weight]);
  document.getElementById('r-stroke').value=rules.stroke;document.getElementById('rv-stroke').textContent=rules.stroke.toFixed(1);document.getElementById('r-stroke').setAttribute('aria-valuetext',rules.stroke.toFixed(1));
  document.getElementById('r-gap').value=rules.gap;document.getElementById('rv-gap').textContent=rules.gap.toFixed(1);document.getElementById('r-gap').setAttribute('aria-valuetext',rules.gap.toFixed(1));
  document.querySelectorAll('#sym-pills .pill').forEach(p=>p.classList.toggle('on',p.dataset.v===rules.symmetry));
  document.querySelectorAll('#style-pills .pill').forEach(p=>p.classList.toggle('on',p.dataset.v===rules.style));
  document.querySelectorAll('#medium-pills .pill').forEach(p=>p.classList.toggle('on',p.dataset.v===rules.medium));
  buildMaskGrid();applyRuleChange();setStatus('Rules randomized — go to Overrides when ready');
});
document.getElementById('btn-generate').addEventListener('click',()=>{
  if(blockStep2IfRulesOvPending())return;
  unlockStep(2);
  buildAZGrid();
  syncAzViewUI();
  goStep(2);
});
document.getElementById('btn-go-export').addEventListener('click',()=>{unlockStep(3);goStep(3);});
document.getElementById('btn-back-1').addEventListener('click',()=>goStep(1));
document.getElementById('btn-back-2').addEventListener('click',()=>goStep(2));
document.getElementById('btn-s3-scroll-export').addEventListener('click',()=>{
  setS3CanvasTarget('sheet');
  document.getElementById('s3-export-top')?.scrollIntoView({behavior:'smooth',block:'start'});
  document.getElementById('s3-scroll')?.scrollTo({top:0,behavior:'smooth'});
});
document.getElementById('btn-clear-ov').addEventListener('click',()=>{overrides={};rulesOverrideSnapshot=null;checkRulesOverrideDesync();refreshAfterOverrideReset();setStatus('All overrides cleared');});
document.getElementById('rules-ov-reset').addEventListener('click',()=>{overrides={};rulesOverrideSnapshot=null;document.getElementById('rules-ov-banner').classList.remove('vis');refreshAfterOverrideReset();setStatus('Overrides reset');});
document.getElementById('rules-ov-keep').addEventListener('click',()=>{rulesOverrideSnapshot=cloneRules();document.getElementById('rules-ov-banner').classList.remove('vis');setStatus('Kept painted grids — baseline updated');});
function bindS1Accordions(){
  function wire(btn){
    const panel=document.getElementById(btn.getAttribute('aria-controls'));
    if(!panel)return;
    btn.addEventListener('click',()=>{
      const isOpen=btn.getAttribute('aria-expanded')==='true';
      const next=!isOpen;
      btn.setAttribute('aria-expanded',String(next));
      if(next) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden','');
      const chev=btn.querySelector('.s1-acc-chev');
      if(chev)chev.textContent=next?'▾':'▸';
    });
  }
  document.querySelectorAll('.s1-acc-head,.s1-mini-toggle').forEach(wire);
}
document.querySelectorAll('#fmt-pills .pill').forEach(p=>p.addEventListener('click',()=>{exportFmt=p.dataset.v;document.querySelectorAll('#fmt-pills .pill').forEach(q=>q.classList.toggle('on',q===p));renderS3();}));
document.querySelectorAll('#bg-pills .pill').forEach(p=>p.addEventListener('click',()=>{exportBg=p.dataset.v;document.querySelectorAll('#bg-pills .pill').forEach(q=>q.classList.toggle('on',q===p));refreshAZ();renderS3();}));
document.getElementById('s3-type-text').addEventListener('input',()=>{if(exportFmt==='typeset')renderS3();else scheduleS3Type();});
['s3-r-size','s3-r-track','s3-r-lead'].forEach(id=>{document.getElementById(id).addEventListener('input',()=>{document.getElementById('s3-rv-size').textContent=document.getElementById('s3-r-size').value;document.getElementById('s3-rv-track').textContent=document.getElementById('s3-r-track').value;document.getElementById('s3-rv-lead').textContent=(+document.getElementById('s3-r-lead').value/100).toFixed(2);if(exportFmt==='typeset')renderS3();else scheduleS3Type();});});
document.getElementById('btn-export').addEventListener('click',()=>{
  if(exportFmt==='typeset'){
    renderS3TypeSample();
    const tc=document.getElementById('s3-type-canvas');
    if(!tc||tc.width<2||tc.height<2){
      setStatus('Nothing to export — add text in Typesetting');
      return;
    }
    const a=document.createElement('a');
    a.download='rule-system-typeset.png';
    a.href=tc.toDataURL('image/png');
    a.click();
    setStatus('Exported rule-system-typeset.png');
    return;
  }
  const LW=LCARD_PX*S3_EXPORT_SCALE,LH=LCARD_PX*S3_EXPORT_SCALE,PAD=LCARD_GAP_PX*S3_EXPORT_SCALE;const fg=exportBg==='black'?235:20,bg=exportBg==='black'?20:255;
  let W,H;if(exportFmt==='grid'){W=13*LW+14*PAD;H=2*LH+3*PAD;}else{W=26*LW+27*PAD;H=LH+2*PAD;}
  const oc=document.createElement('canvas');oc.width=W;oc.height=H;const octx=oc.getContext('2d');
  octx.fillStyle=exportBg==='black'?'#141414':'#fff';octx.fillRect(0,0,W,H);
  LETTERS.forEach((l,i)=>{let ox2,oy2;if(exportFmt==='grid'){ox2=PAD+(i%13)*(LW+PAD);oy2=PAD+Math.floor(i/13)*(LH+PAD);}else{ox2=PAD+i*(LW+PAD);oy2=PAD;}const tmp=document.createElement('canvas');tmp.width=LW;tmp.height=LH;const tc=tmp.getContext('2d');tc.fillStyle=exportBg==='black'?'#141414':'#fff';tc.fillRect(0,0,LW,LH);drawLetterGrid(tc,getGrid(l),LW,LH,rules.style,rules.stroke,rules.gap,fg,bg);octx.drawImage(tmp,ox2,oy2);});
  const a=document.createElement('a');a.download='rule-system.png';a.href=oc.toDataURL();a.click();setStatus('Exported rule-system.png');
});
let _s3ResizeTimer;
window.addEventListener('resize',()=>{
  clearTimeout(_s3ResizeTimer);_s3ResizeTimer=setTimeout(()=>{
    if(currentStep===3){if(exportFmt==='typeset')renderS3();else scheduleS3Type();if(s3CanvasTarget==='poster')p4FitCanvas();}
  },140);
});

//  STEP 4 CONTROLS

function s4BP(gid,key,cb){
  document.querySelectorAll('#'+gid+' .pill').forEach(p=>p.addEventListener('click',()=>{
    P[key]=p.dataset.v;document.querySelectorAll('#'+gid+' .pill').forEach(q=>q.classList.toggle('on',q===p));
    if(cb)cb();else if(P.motion==='none')p4Render(0);
  }));
}
function s4Sl(rid,vid,key,fmt,cb){
  document.getElementById(rid).addEventListener('input',()=>{
    P[key]=parseFloat(document.getElementById(rid).value);
    document.getElementById(vid).textContent=fmt?fmt(P[key]):P[key];
    if(cb)cb();else if(P.motion==='none')p4Render(0);
  });
}
s4BP('s4-elem-pills','elem',()=>{p4SyncElemParams();if(P.motion==='none')p4Render(0);});
s4BP('s4-source-mode-pills','sourceMode',()=>{
  p4SyncUI();
  renderS4SourcePreview();
  if(P.motion==='none')p4Render(0);else p4StartAnim();
});
s4BP('s4-line-dir-pills','lineDir');
s4BP('s4-comp-pills','comp');
document.querySelectorAll('#s4-multi-layout-pills .pill').forEach(p=>p.addEventListener('click',()=>{
  if(!(P.sourceMode==='text'&&p4PerLetterGeoms().length>=2))return;
  P.multiLayout=p.dataset.v;
  document.querySelectorAll('#s4-multi-layout-pills .pill').forEach(q=>q.classList.toggle('on',q===p));
  if(P.motion==='none')p4Render(0);else p4StartAnim();
}));
s4BP('s4-aspect-pills','aspect',()=>{
  if(P.motion==='none')p4Render(0);else p4FitCanvas();
});
document.querySelectorAll('#s4-motion-strip .mstep').forEach(p=>p.addEventListener('click',()=>{P.motion=p.dataset.v;document.querySelectorAll('#s4-motion-strip .mstep').forEach(q=>q.classList.toggle('on',q===p));p4Phase=0;p4StartAnim();}));
s4Sl('s4-pt-size','s4-rv-pt-size','ptSize');
s4Sl('s4-ln-weight','s4-rv-ln-weight','lineWeight',v=>v.toFixed(1));
s4Sl('s4-ln-len','s4-rv-ln-len','lineLen',v=>Math.round(v)+'%');
s4Sl('s4-pl-gap','s4-rv-pl-gap','planeGap',v=>v.toFixed(1));
document.getElementById('s4-scale').addEventListener('input',()=>{P.scale=parseFloat(document.getElementById('s4-scale').value)/100;document.getElementById('s4-rv-scale').textContent=P.scale.toFixed(2);if(P.motion==='none')p4Render(0);});
s4Sl('s4-rot','s4-rv-rot','rotation',v=>v+'°');

['s4-bg-sw','s4-fg-sw'].forEach(gid=>{
  const key=gid==='s4-bg-sw'?'bg':'fg';
  document.querySelectorAll('#'+gid+' .swatch[data-v]').forEach(s=>s.addEventListener('click',()=>{P[key]=s.dataset.v;document.querySelectorAll('#'+gid+' .swatch[data-v]').forEach(q=>q.classList.toggle('on',q===s));if(P.motion==='none')p4Render(0);}));
});
document.getElementById('s4-bg-custom').addEventListener('input',e=>{P.bg=e.target.value;document.querySelectorAll('#s4-bg-sw .swatch[data-v]').forEach(s=>s.classList.remove('on'));if(P.motion==='none')p4Render(0);});
document.getElementById('s4-fg-custom').addEventListener('input',e=>{P.fg=e.target.value;document.querySelectorAll('#s4-fg-sw .swatch[data-v]').forEach(s=>s.classList.remove('on'));if(P.motion==='none')p4Render(0);});
document.getElementById('s4-source-text').addEventListener('input',e=>{
  P.sourceText=p4NormalizeSourceText(e.target.value);
  e.target.value=P.sourceText;
  renderS4SourcePreview();
  p4UpdateMultiLayoutVisibility();
  document.querySelectorAll('#s4-multi-layout-pills .pill').forEach(p=>p.classList.toggle('on',p.dataset.v===P.multiLayout));
  if(P.motion==='none')p4Render(0);else p4StartAnim();
});
// letter row
function buildS4LetterRow(){
  const el=document.getElementById('s4-letter-row');el.innerHTML='';
  LETTERS.forEach(l=>{const b=document.createElement('div');b.className='pletter'+(l===P.letter?' on':'');b.textContent=l;b.dataset.v=l;b.addEventListener('click',()=>{P.letter=l;if(P.sourceMode==='single')P.sourceText=l;el.querySelectorAll('.pletter').forEach(q=>q.classList.toggle('on',q.dataset.v===l));renderS4SourcePreview();p4UpdateMultiLayoutVisibility();document.querySelectorAll('#s4-multi-layout-pills .pill').forEach(p=>p.classList.toggle('on',p.dataset.v===P.multiLayout));if(P.motion==='none')p4Render(0);});el.appendChild(b);});
}

function renderS4SourcePreview(){
  const cvs=document.getElementById('s4-source-preview');if(!cvs)return;
  const ctx=cvs.getContext('2d');const W=cvs.width,H=cvs.height;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  const pad=0;
  const availW=Math.max(1,W-pad*2),availH=Math.max(1,H-pad*2);
  const fg=20,bg=255;

  // Keep single-letter mode aligned with hover math (fixed 4x5 cell mapping).
  if(P.sourceMode==='single'){
    drawLetterGrid(ctx,getGrid(P.letter),W,H,rules.style,rules.stroke,rules.gap,fg,bg);
    return;
  }

  // Text mode: render each glyph through the same letter-grid path as Step 1.
  const rawTokens=p4SourceTokens();
  const hasLetter=rawTokens.some(ch=>ch!==' ');
  if(!hasLetter){
    ctx.strokeStyle='#ececec';
    ctx.strokeRect(0.5,0.5,W-1,H-1);
    return;
  }
  const tokens=rawTokens;
  const gapUnits=0.14,spaceUnits=0.55;
  const totalUnits=tokens.reduce((sum,ch)=>sum+(ch===' '?spaceUnits:1),0)+Math.max(0,tokens.length-1)*gapUnits;
  const glyphSize=Math.max(8,Math.min(availH,availW/Math.max(totalUnits,1)));
  const gapPx=glyphSize*gapUnits,spacePx=glyphSize*spaceUnits;
  const totalPx=tokens.reduce((sum,ch)=>sum+(ch===' '?spacePx:glyphSize),0)+Math.max(0,tokens.length-1)*gapPx;
  let x=Math.max(0,(availW-totalPx)/2);
  const y=Math.max(0,(availH-glyphSize)/2);

  for(let i=0;i<tokens.length;i++){
    const ch=tokens[i];
    if(ch===' ')x+=spacePx;
    else{
      const gs=Math.max(8,Math.round(glyphSize));
      const tmp=document.createElement('canvas');
      tmp.width=gs;tmp.height=gs;
      const tctx=tmp.getContext('2d');
      tctx.fillStyle='#fff';
      tctx.fillRect(0,0,gs,gs);
      drawLetterGrid(tctx,getGrid(ch),gs,gs,rules.style,rules.stroke,rules.gap,fg,bg);
      ctx.drawImage(tmp,Math.round(x),Math.round(y),Math.round(glyphSize),Math.round(glyphSize));
      x+=glyphSize;
    }
    if(i<tokens.length-1)x+=gapPx;
  }
}
document.getElementById('btn-s4-png').addEventListener('click',p4ExportPng);
document.getElementById('btn-s4-webm').addEventListener('click',p4ExportWebM);
document.getElementById('btn-s4-rand').addEventListener('click',p4Randomize);

// ── Step 3 view mode pills ──
document.querySelectorAll('#s3-view-pills .pill').forEach(p=>{
  p.addEventListener('click',()=>{
    s3ViewMode=p.dataset.v;
    document.querySelectorAll('#s3-view-pills .pill').forEach(q=>q.classList.toggle('on',q===p));
    if(exportFmt==='typeset')renderS3();
    else scheduleS3Type();
  });
});
document.querySelectorAll(S3_CANVAS_PILL_SEL).forEach(p=>{
  p.addEventListener('click',()=>{setS3CanvasTarget(p.dataset.v);});
});

(function(){
  const src=document.getElementById('s4-source-preview');
  const ov=document.getElementById('s4-source-overlay');
  if(!src||!ov)return;
  const PAD=0;
  function cellAt(e){
    if(P.sourceMode!=='single')return null;
    const r=src.getBoundingClientRect();
    const mx=e.clientX-r.left,my=e.clientY-r.top;
    const cellW=src.clientWidth/COLS;
    const cellH=src.clientHeight/ROWS;
    const c=Math.floor(mx/cellW),row=Math.floor(my/cellH);
    if(c<0||c>=COLS||row<0||row>=ROWS)return null;
    return{r:row,c};
  }
  function drawOverlay(hov){
    const ctx=ov.getContext('2d');
    ctx.clearRect(0,0,ov.width,ov.height);
    if(!hov)return;
    if(P.sourceMode!=='single')return;
    const g=getGrid(P.letter);
    if(!g[hov.r][hov.c])return;
    const cellW=ov.width/COLS,cellH=ov.height/ROWS;
    const x=hov.c*cellW,y=hov.r*cellH;
    ctx.fillStyle='rgba(0,100,255,0.35)';
    ctx.fillRect(x,y,cellW,cellH);
    highlightPosterBrick(hov.r,hov.c);
  }
  src.addEventListener('mousemove',e=>{drawOverlay(cellAt(e));});
  src.addEventListener('mouseleave',()=>{drawOverlay(null);clearPosterHighlight();});
})();

let _highlightRaf=null;
function highlightPosterBrick(br,bc){
  clearPosterHighlight();
  const cvs=document.getElementById('s4-poster-canvas');if(!cvs)return;
  const{w:PW,h:PH}=p4Dims();
  const size=Math.min(PW,PH)*P.scale;
  const lcx=PW/2,lcy=PH/2;
  const cellW=size/COLS,cellH=size/ROWS;
  const x0=lcx-size/2,y0=lcy-size/2;
  const cx=x0+(bc+0.5)*cellW,cy=y0+(br+0.5)*cellH;
  const r=cvs.getBoundingClientRect();
  const ds=r.width?r.width/PW:1;
  const ctx=cvs.getContext('2d');
  ctx.save();
  ctx.translate(lcx,lcy);ctx.rotate(P.rotation*Math.PI/180);ctx.translate(-lcx,-lcy);
  ctx.strokeStyle='rgba(0,100,255,0.9)';
  ctx.lineWidth=Math.max(1.5,cellW*0.08);
  ctx.strokeRect(cx-cellW/2+1,cy-cellH/2+1,cellW-2,cellH-2);
  ctx.restore();
}
function clearPosterHighlight(){
  if(_highlightRaf)cancelAnimationFrame(_highlightRaf);
  if(P.motion==='none'){_highlightRaf=requestAnimationFrame(()=>p4Render(0));}
}

function setStatus(msg){document.getElementById('status-txt').textContent=msg;}

syncTopbarSub(1);
bindS1Accordions();
(function(){
  const btn=document.getElementById('s1-toggle-extra'),lab=document.getElementById('s1-toggle-extra-label');
  function sync(){if(!btn||!lab)return;lab.textContent=btn.getAttribute('aria-expanded')==='true'?'Hide advanced controls':'Show advanced controls';}
  if(btn)btn.addEventListener('click',()=>requestAnimationFrame(sync));
  sync();
})();
bindS3TypeFrameResize();
buildMaskGrid();
buildPreviewSel();
buildS1AZGrid();
updateOvCount();
rules.medium=normalizeToyMedium(rules.medium);
document.querySelectorAll('#medium-pills .pill').forEach(p=>p.classList.toggle('on',p.dataset.v===rules.medium));
syncStudsUi();
refreshPreview();
buildS4LetterRow();
(function(){const t=document.getElementById('s3-type-text');if(t&&!t.value.trim())t.value="WELCOME TO JUSTIN'S WORLD";})();
p4SyncUI();
renderS4SourcePreview();
setStatus('Step 1 — Set your rules, then go to Overrides');