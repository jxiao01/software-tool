
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ROWS=5,COLS=4;
const SKELETON={
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
  const sk=SKELETON[l];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(sk[r][c])CELL_ON_FREQ[r][c]++;
}

//  STEP 1–3 STATE

let rules={mask:Array.from({length:ROWS},()=>[1,1,1,1]),density:5,continuity:0,weight:1,symmetry:'free',style:'none',stroke:1.3,gap:6};
let overrides={};
let previewLetter='A';
let currentStep=1,maxStep=1;
let exportFmt='grid',exportBg='white';
let s3ViewMode='brick';
let s3CanvasTarget='sheet';
let _s3PosterFitDelay=0;
const S3_CANVAS_PILL_SEL='#s3-canvas-target-pills .pill, #s3-canvas-target-pills-left .pill';
let azViewMode='yours';
let rulesOverrideSnapshot=null;

const RULE_MERGE_READOUT=['Any pieces','No lone bricks','Largest only'];
const RULE_FILL_READOUT=['Sparse','Normal','Full'];

//  STEP 4 STATE

const P={
  letter:'A',elem:'line',
  ptSize:12,
  lineDir:'h',lineWeight:6,lineLen:100,
  planeGap:2,
  comp:'center',
  scale:0.78,rotation:0,ox:0,oy:0,
  bg:'#ffffff',fg:'#1a1a1a',
  aspect:'3-4',motion:'none',guide:'none',
};
let p4Phase=0,p4Raf=null,p4RecRaf=null;
let p4Drag=null;

//  RULES / OVERRIDES HELPERS

function cloneRules(){return{mask:rules.mask.map(r=>[...r]),density:rules.density,continuity:rules.continuity,weight:rules.weight,symmetry:rules.symmetry,style:rules.style,stroke:rules.stroke,gap:rules.gap};}
function rulesEqual(a,b){
  if(!a||!b)return false;
  if(a.density!==b.density||a.continuity!==b.continuity||a.weight!==b.weight)return false;
  if(a.symmetry!==b.symmetry||a.style!==b.style||a.stroke!==b.stroke||a.gap!==b.gap)return false;
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
function applyRuleChange(){refreshPreview();checkRulesOverrideDesync();}
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
  if(n===3){syncExportSummary();renderS3();p4Phase=0;renderS4SourcePreview();setStatus('Step 3 — Output and Poster');setS3CanvasTarget(s3CanvasTarget,{skipSheetRefresh:true,instant:true});}
  syncTopbarSub(n);
}
function syncTopbarSub(n){
  const el=document.getElementById('topbar-sub');if(!el)return;
  const map={1:'Step 1 · Rules',2:'Step 2 · Overrides',3:'Step 3 · Output / Poster'};
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
  const hint=document.getElementById('s3-right-hint');
  if(hint)hint.textContent=v==='sheet'?'Output':'Poster';
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
function generateGrid(letter){
  const skel=SKELETON[letter];if(!skel)return emptyGrid();
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
  if(rules.weight===0)for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(g[r][c]&&cntN(g,r,c)===0)g[r][c]=0;
  else if(rules.weight===2){const add=[];for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(!g[r][c]&&rules.mask[r][c]&&cntN(g,r,c)>=2)add.push([r,c]);for(const[r,c]of add)g[r][c]=1;}
  if(rules.continuity===1)removeSingletonComponents(g);
  if(rules.continuity===2){const comp=lgComp(g);for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(g[r][c]&&!comp[r][c])g[r][c]=0;}
  if(rules.symmetry==='mirror')for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)g[r][COLS-1-c]=g[r][c];
  else if(rules.symmetry==='rotate')for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)g[ROWS-1-r][COLS-1-c]=Math.max(g[r][c],g[ROWS-1-r][COLS-1-c]);
  preserveLetterIdentity(letter,skel,g);
  return g;
}
function identityScore(sk,r,c){
  if(!sk[r][c])return -99;
  const rarity=(1-(CELL_ON_FREQ[r][c]/LETTERS.length))*10;
  const edge=(r===0||r===ROWS-1||c===0||c===COLS-1)?1.25:0;
  const ep=isEP(sk,r,c)?2.8:0;
  return rarity+edge+ep;
}
function pickIdentityCells(sk){
  const all=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(!sk[r][c]||!rules.mask[r][c])continue;
    all.push({r,c,s:identityScore(sk,r,c)});
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
  const pinned=pickIdentityCells(skel);
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
      s:identityScore(skel,r,c)+(cntN(g,r,c)*0.45)
    });
    if(rows.length<=rules.density)continue;
    rows.sort((a,b)=>{
      if(a.pinned!==b.pinned)return a.pinned?-1:1;
      return b.s-a.s;
    });
    const keep=new Set(rows.slice(0,rules.density).map(x=>x.r));
    for(let r=0;r<ROWS;r++)if(g[r][c]&&!keep.has(r)&&!lock.has(key(r,c)))g[r][c]=0;
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

function sdBoxS(px,py,cx,cy,hw,hh,r){r=r||0;const qx=Math.abs(px-cx)-hw+r,qy=Math.abs(py-cy)-hh+r;return Math.min(Math.max(qx,qy),0)+Math.sqrt(Math.max(qx,0)**2+Math.max(qy,0)**2)-r;}
function drawLetterGrid(ctx,grid,W,H,style,stroke,gap,fg,bg){
  fg=fg===undefined?20:fg;bg=bg===undefined?255:bg;
  const bw=(W*0.82)/COLS,bh=bw*0.72,sh=bh*0.12,bstk=bh+sh;
  const offY=H/2-((ROWS*bstk)/2)+bstk/2;
  const bricks=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){if(!grid[r][c])continue;bricks.push({bx:W/2+(c-(COLS-1)/2)*bw,by:offY+r*bstk});}
  const imgData=ctx.createImageData(W,H);const px=imgData.data;
  for(let i=0;i<px.length;i+=4){px[i]=px[i+1]=px[i+2]=bg;px[i+3]=255;}
  const sw2=bw*0.14,r_br=bw*0.015,r_sr=bw*0.01;
  for(const{bx,by}of bricks){
    const x0=Math.max(0,Math.floor(bx-bw/2-sw2-2)),x1=Math.min(W-1,Math.ceil(bx+bw/2+sw2+2));
    const y0=Math.max(0,Math.floor(by-bh/2-sh-2)),y1=Math.min(H-1,Math.ceil(by+bh/2+2));
    for(let py2=y0;py2<=y1;py2++)for(let px2=x0;px2<=x1;px2++){
      let db=sdBoxS(px2,py2,bx,by,bw/2,bh/2,r_br);let df=db;
      const top=by-bh/2;
      for(const sx of[bx-bw*3/8,bx-bw/8,bx+bw/8,bx+bw*3/8])df=Math.min(df,sdBoxS(px2,py2,sx,top-sh/2,sw2/2,sh/2,r_sr));
      if(df>1.5)continue;
      const ad=Math.abs(df);const i=(py2*W+px2)*4;
      if(db<=0){px[i]=px[i+1]=px[i+2]=bg;}
      let draw=false;
      if(style==='solid'){if(df<=0)draw=true;}
      else if(style==='none'){if(df>=-stroke*0.8&&df<=0)draw=true;}
      else if(style==='concentric'){const iv=gap*bw*0.045,rw=Math.max(iv*0.22,stroke*0.65);if(df<=0&&((ad%iv)<rw||(df>=-stroke*0.8)))draw=true;}
      else if(style==='hlines'){if(df<=0){const sp=Math.max(2,gap*bh*0.095);if(py2%sp<stroke*0.85||df>=-stroke*0.8)draw=true;}}
      else if(style==='diagonal'){if(df<=0){const sp=Math.max(2,gap*bw*0.045);if((px2+py2)%sp<stroke*0.85||df>=-stroke*0.8)draw=true;}}
      else if(style==='dots'){if(df<=0){const sp=Math.max(3,gap*bw*0.045);if((px2%sp<2&&py2%sp<2)||df>=-stroke*0.8)draw=true;}}
      if(draw){px[i]=px[i+1]=px[i+2]=fg;px[i+3]=255;}
    }
  }
  ctx.putImageData(imgData,0,0);
}

//  STEP 4: POSTER LAB ENGINE

function p4BricksOf(letter){
  const g=getGrid(letter),out=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(g[r][c])out.push({r,c});
  return out;
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
function p4DrawLetter(ctx,letter,lcx,lcy,size,params,fg){
  const cellW=size/COLS;
  const cellH=size/ROWS;
  const x0=lcx-size/2;
  const y0=lcy-size/2;
  for(const{r,c}of p4BricksOf(letter)){
    p4DrawElem(ctx, x0+(c+0.5)*cellW, y0+(r+0.5)*cellH, cellW, cellH, params, fg);
  }
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
  ctx.fillStyle=P.bg;ctx.fillRect(0,0,PW,PH);

  function stamp(lcx,lcy,size,alpha,rot){
    ctx.save();ctx.globalAlpha=alpha;
    ctx.translate(lcx,lcy);ctx.rotate(rot*Math.PI/180);ctx.translate(-lcx,-lcy);
    p4DrawLetter(ctx,P.letter,lcx,lcy,size,params,P.fg);
    ctx.restore();
  }

  const lcx=PW/2+ox,lcy=PH/2+oy;
  const size=Math.min(PW,PH)*P.scale;
  const cellW=size/COLS;
  const cellH=size/ROWS;
  const x0=lcx-size/2;
  const y0=lcy-size/2;

  if(P.comp==='center'){
    ctx.save();ctx.translate(lcx,lcy);ctx.rotate(P.rotation*Math.PI/180);ctx.translate(-lcx,-lcy);
    p4DrawLetter(ctx,P.letter,lcx,lcy,size,params,P.fg);ctx.restore();

  } else if(P.comp==='mirror'){
    for(const[sx,sy]of[[1,1],[-1,1],[1,-1],[-1,-1]]){
      ctx.save();ctx.translate(lcx,lcy);ctx.scale(sx,sy);ctx.rotate(P.rotation*Math.PI/180);
      for(const{r,c}of p4BricksOf(P.letter)){
        const cx=-size/2+(c+0.5)*cellW;
        const cy=-size/2+(r+0.5)*cellH;
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
    const g=getGrid(P.letter);
    function cell(r,c){if(r<0||r>=ROWS||c<0||c>=COLS)return 0;return g[r][c]||0;}
    const segs=[];
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
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
    for(const{r,c}of p4BricksOf(P.letter)){
      const cx=x0+(c+0.5)*cellW,cy=y0+(r+0.5)*cellH;
      const rng=p4Seeded((r*COLS+c)*137+P.letter.charCodeAt(0));
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
  const a=document.createElement('a');a.download='brick-poster-'+P.letter+'.png';
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
    const a=document.createElement('a');a.href=url;a.download='brick-poster-'+P.letter+'-motion.webm';a.click();
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
function p4SyncUI(){
  const qp=(gid,val)=>document.querySelectorAll('#'+gid+' .pill, #'+gid+' .mstep').forEach(p=>p.classList.toggle('on',p.dataset.v===val));
  qp('s4-elem-pills',P.elem);qp('s4-line-dir-pills',P.lineDir);qp('s4-comp-pills',P.comp);
  qp('s4-aspect-pills',P.aspect);qp('s4-motion-strip',P.motion);
  document.getElementById('s4-pt-size').value=P.ptSize;document.getElementById('s4-rv-pt-size').textContent=P.ptSize;
  document.getElementById('s4-ln-weight').value=P.lineWeight;document.getElementById('s4-rv-ln-weight').textContent=P.lineWeight.toFixed(1);
  document.getElementById('s4-ln-len').value=P.lineLen;document.getElementById('s4-rv-ln-len').textContent=Math.round(P.lineLen)+'%';
  document.getElementById('s4-pl-gap').value=P.planeGap;document.getElementById('s4-rv-pl-gap').textContent=P.planeGap.toFixed(1);
  document.getElementById('s4-scale').value=Math.round(P.scale*100);document.getElementById('s4-rv-scale').textContent=P.scale.toFixed(2);
  document.getElementById('s4-rot').value=P.rotation;document.getElementById('s4-rv-rot').textContent=P.rotation+'°';
  document.querySelectorAll('#s4-bg-sw .swatch[data-v]').forEach(s=>s.classList.toggle('on',s.dataset.v===P.bg));
  document.querySelectorAll('#s4-fg-sw .swatch[data-v]').forEach(s=>s.classList.toggle('on',s.dataset.v===P.fg));
  document.querySelectorAll('#s4-letter-row .pletter').forEach(b=>b.classList.toggle('on',b.dataset.v===P.letter));
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
    const cvs=document.createElement('canvas');cvs.width=120;cvs.height=120;card.appendChild(cvs);
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
    const cvs=document.createElement('canvas');cvs.width=120;cvs.height=120;card.appendChild(cvs);
    const ln=document.createElement('div');ln.className='lname';ln.textContent=letter;card.appendChild(ln);
    const od=document.createElement('div');od.className='odot';card.appendChild(od);
    const ds=document.createElement('div');ds.className='diff-strip';const df=document.createElement('div');df.className='diff-fill';ds.appendChild(df);card.appendChild(ds);
    card.addEventListener('click',()=>{if(azViewMode!=='yours')return;openOverride(letter);});
    el.appendChild(card);
  }
}
function updateRuleLiveReadout(){
  const el=document.getElementById('structure-live');if(!el)return;
  const g=generateGrid(previewLetter);const n=gridCount(g);
  const symLab={free:'as drawn',mirror:'mirror L↔R',rotate:'180° match'};
  el.innerHTML=`<strong>${previewLetter}</strong> · ${n} bricks · ≤${rules.density} / column · merge: ${RULE_MERGE_READOUT[rules.continuity]} · fill: ${RULE_FILL_READOUT[rules.weight]} · ${symLab[rules.symmetry]}`;
}
function refreshPreview(){
  const cvs=document.getElementById('preview-canvas');
  if(cvs){
    const ctx=cvs.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,cvs.width,cvs.height);
    drawLetterGrid(ctx,generateGrid(previewLetter),cvs.width,cvs.height,rules.style,rules.stroke,rules.gap);
  }
  refreshS1PreviewGrid();
  refreshMaskMini(null);updateRuleLiveReadout();
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
  document.getElementById('s2-rule-summary').innerHTML=`Mask &nbsp;<b>${rules.mask.flat().filter(Boolean).length}/20 cells active</b><br>Max bricks / column &nbsp;<b>${rules.density}</b><br>How pieces merge &nbsp;<b>${RULE_MERGE_READOUT[rules.continuity]}</b><br>Brick fill &nbsp;<b>${RULE_FILL_READOUT[rules.weight]}</b><br>Grid symmetry &nbsp;<b>${symLab[rules.symmetry]}</b><br>Style &nbsp;<b>${rules.style}</b>`;
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

  if(s3ViewMode==='brick'){
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
    const maxW=Math.min(600,window.innerWidth*0.55);
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
  const LW=100,LH=100,PAD=8;const fg=exportBg==='black'?235:20,bg=exportBg==='black'?20:255;
  let W,H;if(exportFmt==='grid'){W=13*LW+14*PAD;H=2*LH+3*PAD;}else{W=26*LW+27*PAD;H=LH+2*PAD;}
  const maxW=Math.min(600,window.innerWidth*0.55);const ds=Math.min(1,maxW/W);
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
bindSlider('r-cont','rv-cont','continuity',v=>RULE_MERGE_READOUT[v]);
bindSlider('r-weight','rv-weight','weight',v=>RULE_FILL_READOUT[v]);
bindSlider('r-stroke','rv-stroke','stroke',v=>v.toFixed(1));
bindSlider('r-gap','rv-gap','gap',v=>v.toFixed(1));
document.getElementById('rv-cont').textContent=RULE_MERGE_READOUT[0];document.getElementById('rv-weight').textContent=RULE_FILL_READOUT[1];
function bindPills(gid,key){document.querySelectorAll('#'+gid+' .pill').forEach(p=>p.addEventListener('click',()=>{rules[key]=p.dataset.v;document.querySelectorAll('#'+gid+' .pill').forEach(q=>q.classList.toggle('on',q===p));applyRuleChange();}));}
bindPills('sym-pills','symmetry');bindPills('style-pills','style');
document.getElementById('btn-rand-rules').addEventListener('click',()=>{
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)rules.mask[r][c]=Math.random()<0.78?1:0;
  rules.density=1+Math.floor(Math.random()*5);rules.continuity=Math.floor(Math.random()*3);rules.weight=Math.floor(Math.random()*3);
  rules.symmetry=['free','mirror','rotate'][Math.floor(Math.random()*3)];rules.stroke=+(0.7+Math.random()*1.8).toFixed(1);rules.gap=+(3+Math.random()*10).toFixed(1);
  rules.style=['none','concentric','hlines','diagonal','dots','solid'][Math.floor(Math.random()*6)];
  document.getElementById('r-density').value=rules.density;document.getElementById('rv-density').textContent=rules.density;document.getElementById('r-density').setAttribute('aria-valuetext',String(rules.density));
  document.getElementById('r-cont').value=rules.continuity;document.getElementById('rv-cont').textContent=RULE_MERGE_READOUT[rules.continuity];document.getElementById('r-cont').setAttribute('aria-valuetext',RULE_MERGE_READOUT[rules.continuity]);
  document.getElementById('r-weight').value=rules.weight;document.getElementById('rv-weight').textContent=RULE_FILL_READOUT[rules.weight];document.getElementById('r-weight').setAttribute('aria-valuetext',RULE_FILL_READOUT[rules.weight]);
  document.getElementById('r-stroke').value=rules.stroke;document.getElementById('rv-stroke').textContent=rules.stroke.toFixed(1);document.getElementById('r-stroke').setAttribute('aria-valuetext',rules.stroke.toFixed(1));
  document.getElementById('r-gap').value=rules.gap;document.getElementById('rv-gap').textContent=rules.gap.toFixed(1);document.getElementById('r-gap').setAttribute('aria-valuetext',rules.gap.toFixed(1));
  document.querySelectorAll('#sym-pills .pill').forEach(p=>p.classList.toggle('on',p.dataset.v===rules.symmetry));
  document.querySelectorAll('#style-pills .pill').forEach(p=>p.classList.toggle('on',p.dataset.v===rules.style));
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
    a.download='brick-grammar-typeset.png';
    a.href=tc.toDataURL('image/png');
    a.click();
    setStatus('Exported brick-grammar-typeset.png');
    return;
  }
  const LW=200,LH=200,PAD=16;const fg=exportBg==='black'?235:20,bg=exportBg==='black'?20:255;
  let W,H;if(exportFmt==='grid'){W=13*LW+14*PAD;H=2*LH+3*PAD;}else{W=26*LW+27*PAD;H=LH+2*PAD;}
  const oc=document.createElement('canvas');oc.width=W;oc.height=H;const octx=oc.getContext('2d');
  octx.fillStyle=exportBg==='black'?'#141414':'#fff';octx.fillRect(0,0,W,H);
  LETTERS.forEach((l,i)=>{let ox2,oy2;if(exportFmt==='grid'){ox2=PAD+(i%13)*(LW+PAD);oy2=PAD+Math.floor(i/13)*(LH+PAD);}else{ox2=PAD+i*(LW+PAD);oy2=PAD;}const tmp=document.createElement('canvas');tmp.width=LW;tmp.height=LH;const tc=tmp.getContext('2d');tc.fillStyle=exportBg==='black'?'#141414':'#fff';tc.fillRect(0,0,LW,LH);drawLetterGrid(tc,getGrid(l),LW,LH,rules.style,rules.stroke,rules.gap,fg,bg);octx.drawImage(tmp,ox2,oy2);});
  const a=document.createElement('a');a.download='brick-grammar.png';a.href=oc.toDataURL();a.click();setStatus('Exported brick-grammar.png');
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
s4BP('s4-line-dir-pills','lineDir');
s4BP('s4-comp-pills','comp');
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
// letter row
function buildS4LetterRow(){
  const el=document.getElementById('s4-letter-row');el.innerHTML='';
  LETTERS.forEach(l=>{const b=document.createElement('div');b.className='pletter'+(l===P.letter?' on':'');b.textContent=l;b.dataset.v=l;b.addEventListener('click',()=>{P.letter=l;el.querySelectorAll('.pletter').forEach(q=>q.classList.toggle('on',q.dataset.v===l));renderS4SourcePreview();if(P.motion==='none')p4Render(0);});el.appendChild(b);});
}

function renderS4SourcePreview(){
  const cvs=document.getElementById('s4-source-preview');if(!cvs)return;
  const ctx=cvs.getContext('2d');const W=cvs.width,H=cvs.height;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  const g=getGrid(P.letter);
  const pad=4,cellW=(W-pad*2)/COLS,cellH=(H-pad*2)/ROWS;
  // draw empty cells faintly
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const x=pad+c*cellW,y=pad+r*cellH;
    ctx.fillStyle='#f4f4f4';ctx.fillRect(x+1,y+1,cellW-2,cellH-2);
  }
  // draw active bricks
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(!g[r][c])continue;
    const x=pad+c*cellW,y=pad+r*cellH;
    ctx.fillStyle='#222';ctx.fillRect(x+1.5,y+1.5,cellW-3,cellH-3);
  }
  // grid lines
  ctx.strokeStyle='#e8e8e8';ctx.lineWidth=0.5;
  for(let r=0;r<=ROWS;r++){ctx.beginPath();ctx.moveTo(pad,pad+r*cellH);ctx.lineTo(W-pad,pad+r*cellH);ctx.stroke();}
  for(let c=0;c<=COLS;c++){ctx.beginPath();ctx.moveTo(pad+c*cellW,pad);ctx.lineTo(pad+c*cellW,H-pad);ctx.stroke();}
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
  const PAD=4;
  function cellAt(e){
    const r=src.getBoundingClientRect();
    const mx=e.clientX-r.left,my=e.clientY-r.top;
    const cellW=(src.clientWidth-PAD*2)/COLS;
    const cellH=(src.clientHeight-PAD*2)/ROWS;
    const c=Math.floor((mx-PAD)/cellW),row=Math.floor((my-PAD)/cellH);
    if(c<0||c>=COLS||row<0||row>=ROWS)return null;
    return{r:row,c};
  }
  function drawOverlay(hov){
    const ctx=ov.getContext('2d');
    ctx.clearRect(0,0,ov.width,ov.height);
    if(!hov)return;
    const g=getGrid(P.letter);
    if(!g[hov.r][hov.c])return;
    const cellW=(ov.width-PAD*2)/COLS,cellH=(ov.height-PAD*2)/ROWS;
    const x=PAD+hov.c*cellW,y=PAD+hov.r*cellH;
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
refreshPreview();
buildS4LetterRow();
(function(){const t=document.getElementById('s3-type-text');if(t&&!t.value.trim())t.value="WELCOME TO JUSTIN'S WORLD";})();
p4SyncUI();
renderS4SourcePreview();
setStatus('Step 1 — Set your rules, then go to Overrides');
