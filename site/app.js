
let DATA = window.__QUIZ_DATA__;;
let PARTS = DATA.weeks.reduce((a,w)=>a.concat(w.days.map(d=>({wk:w,day:d}))),[]);
let QS = DATA.questions;
let KP = DATA.kps;
function syncLabels(){
  const total=DATA.total||Object.keys(DATA.questions).length;
  const pe=document.getElementById('planSub');if(pe)pe.textContent=`照着做就行 · ${total}道 · ${DATA.totalDays||''}天清单`;
  const qp=document.getElementById('qcardPlan');if(qp)qp.textContent=(DATA.weekCount||14)+'阶段计划';
  const qs=document.getElementById('qcardPlanSub');if(qs)qs.textContent=total+'道题 · 每天学什么做多少';
  const qb=document.getElementById('qcardBankSub');if(qb)qb.textContent=(DATA.bankCount||590)+'道湖南真题';
}
function refreshDerived(){PARTS=DATA.weeks.reduce((a,w)=>a.concat(w.days.map(d=>({wk:w,day:d}))),[]);QS=DATA.questions;KP=DATA.kps;KP_META=null;syncLabels();}
const STORE='wb_plan_progress_v2';
let prog = loadProg();

function loadProg(){try{return JSON.parse(localStorage.getItem(STORE))||{q:{},days:{},learn:{}};}catch(e){return {q:{},days:{},learn:{}};}}
function saveProg(){localStorage.setItem(STORE,JSON.stringify(prog));}
// ===== 收藏夹（跨页共享 localStorage，与题目大全互通）=====
const FAV_KEY='wb_fav_v1';
function loadFav(){try{const a=JSON.parse(localStorage.getItem(FAV_KEY));return Array.isArray(a)?a:[];}catch(e){return [];}}
function saveFav(a){localStorage.setItem(FAV_KEY,JSON.stringify(a));}
let FAV=loadFav();
// 其它标签页/页面改动收藏时，实时同步本页内存 FAV
window.addEventListener('storage',function(e){
  if(e.key===FAV_KEY){FAV=loadFav();renderFavBadge();refreshVisibleFavBtns();}
});
// 页面从 bfcache 恢复（如浏览器前进后退）时同步
window.addEventListener('pageshow',function(){
  const fresh=loadFav();
  if(fresh.join(',')!==FAV.join(',')){FAV=fresh;renderFavBadge();refreshVisibleFavBtns();}
});
function refreshVisibleFavBtns(){
  document.querySelectorAll('.fav-toggle').forEach(function(el){
    const on=isFav(el.dataset.qid);
    el.classList.toggle('on',on);el.textContent=on?'★':'☆';
  });
}
function isFav(qid){return FAV.indexOf(+qid)>=0;}
function toggleFav(qid){
  qid=+qid;const i=FAV.indexOf(qid);
  if(i>=0){FAV.splice(i,1);toast('☆ 已取消收藏');}else{FAV.push(qid);toast('★ 已收藏，可在「我的-收藏夹」查看');}
  saveFav(FAV);renderFavBadge();
  // 同步更新当前界面上所有该qid的收藏按钮状态
  document.querySelectorAll('.fav-toggle[data-qid="'+qid+'"]').forEach(function(el){
    el.classList.toggle('on',i<0);el.textContent=i<0?'★':'☆';
  });
}
function renderFavBadge(){
  const b=document.getElementById('favBadge');if(b)b.textContent=FAV.length;
  const fc=document.getElementById('favCardSub');if(fc)fc.textContent=FAV.length?('已收藏 '+FAV.length+' 题'):'收藏的题目都在这';
  const wc=document.getElementById('wrongCardSub');if(wc){const n=(window._WRONG_IDS||[]).length;wc.textContent=n?('有 '+n+' 道错题待复习'):'把错题再练一遍';}
}
function favBtn(qid){return '<span class="fav-toggle'+(isFav(qid)?' on':'')+'" data-qid="'+qid+'" onclick="event.stopPropagation();toggleFav('+qid+')" title="收藏本题">'+(isFav(qid)?'★':'☆')+'</span>';}
function learned(kp){return !!(prog.learn&&prog.learn[kp]);}
function markLearned(kp){prog.learn=prog.learn||{};prog.learn[kp]=1;saveProg();}
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800);}
function pad(n){return n<10?'0'+n:''+n;}

// 日期
(function(){
  const d=new Date();
  const wd=['日','一','二','三','四','五','六'][d.getDay()];
  document.getElementById('hdDate').textContent=(d.getMonth()+1)+'月'+d.getDate()+'日 · 周'+wd;
  document.getElementById('hdWeek').textContent='第'+Math.ceil(((d-new Date(d.getFullYear(),0,1))/86400000+1)/7)+'周';
})();

// 统计：状态 0未做 1已做 2已掌握
function qStatus(qid){return (prog.q[qid]&&prog.q[qid].s)||0;}
function setQStatus(qid,s){prog.q[qid]=prog.q[qid]||{};prog.q[qid].s=s;saveProg();}
function stats(){
  let done=0,mastered=0,right=0,answered=0;
  for(const id in prog.q){const v=prog.q[id];if(v.s>=1)done++;if(v.s===2)mastered++;if(v.a!==undefined){answered++;if(v.ok)right++;}}
  return {done,mastered,total:DATA.total,rate:answered?Math.round(right/answered*100):0,answered};
}
function dayDone(day){ // 该天所有题是否都至少"已做"
  return day.qids.every(id=>qStatus(id)>=1);
}
function findToday(){
  const p=PARTS.findIndex(p=>!dayDone(p.day));
  return p<0?null:p;
}

// 渲染今日卡片
function renderToday(){
  const box=document.getElementById('todayCard');
  const idx=findToday();
  const st=stats();
  if(idx===null){
    box.innerHTML=`<div class="today-top"><span class="pill ok">🎉 全部完成</span></div>
      <div class="today-task">恭喜！全部打卡完成</div>
      <div class="today-kp">你已经走完整个备考计划，可以随时复习巩固</div>
      <button class="btn-start done" onclick="go('plan')">📋 查看完整计划</button>
      <div class="today-note">真棒，坚持到底就是胜利！</div>`;
  }else{
    const {wk,day}=PARTS[idx];
    const kpInfo=KP[day.kp]||{};
    const doneTag=dayDone(day)?'done':'';
    box.innerHTML=`<div class="today-top">
        <span class="pill">${wk.week}</span>
        <span class="pill gray">第 ${day.day}/${wk.daysCount} 天</span>
        ${day.extra?'<span class="pill gold">含拓展加练</span>':''}
      </div>
      <div class="today-task">${esc(wk.title)}</div>
      <div class="today-kp">📖 <b>${esc(day.kp.replace(/（第.*?周）/,''))}</b> <span class="tag">${kpInfo.freq||''}</span></div>
      <div class="flow">
        <span><b>①</b> 先学重点</span><i>→</i><span><b>②</b> 做 ${day.count} 道题</span><i>→</i><span><b>③</b> 打勾</span>
      </div>
      <div class="today-metrics">
        <div class="metric"><b>${day.count}</b><span>今日题目</span></div>
        <div class="metric"><b>${day.minutes}</b><span>做题分钟</span></div>
        <div class="metric"><b>约5</b><span>学习分钟</span></div>
      </div>
      <button class="btn-study ${learned(day.kp)?'done':''}" onclick="startLearn(${idx})">${learned(day.kp)?'✓ 今日重点已学 · 再看一遍':'📖 ① 先学今日重点（约5分钟）'}</button>
      <button class="btn-start ${doneTag}" onclick="startDay(${idx})">${dayDone(day)?'✓ 今日已完成 · 再练一遍':'▶ ② 开始做题打卡'}</button>
      <div class="today-note">${esc(kpInfo.task||'按清单做题，做完点勾')}</div>`;
  }
  // 总览（每个数字可点进详情）
  document.getElementById('overview').innerHTML=`
    <div class="ov hl tap" onclick="drillDone()"><span class="ov-go">详情›</span><b>${st.done}<span style="font-size:12px">/${st.total}</span></b><span>已打卡</span></div>
    <div class="ov tap" onclick="drillMastered()"><span class="ov-go">详情›</span><b>${st.mastered}</b><span>已掌握</span></div>
    <div class="ov tap" onclick="go('analysis');setTimeout(()=>document.getElementById('page-analysis').querySelector('.panel').scrollIntoView({behavior:'smooth',block:'start'}),60)"><span class="ov-go">分析›</span><b>${st.rate||'--'}${st.rate?'%':''}</b><span>正确率</span></div>
    <div class="ov tap" onclick="go('plan')"><span class="ov-go">进入›</span><b>${DATA.weekCount}</b><span>周计划</span></div>`;
  renderFavBadge();
}

// 渲染周计划
let OPEN_WEEKS=new Set();
function renderPlan(){
  const st=stats();
  document.getElementById('planPct').textContent=Math.round(st.done/st.total*100)+'%';
  const list=document.getElementById('weekList');
  list.innerHTML='';
  DATA.weeks.forEach((w,wi)=>{
    const wd=w.qids.filter(id=>qStatus(id)>=1).length;
    const pct=Math.round(wd/w.total*100);
    const ws=wd===w.total?2:(wd>0?1:0);
    const wsTxt=['未开始','进行中','已完成'][ws];
    const el=document.createElement('div');
    el.className='week'+(OPEN_WEEKS.has(wi)?' open':'');
    el.innerHTML=`<div class="week-hd" onclick="toggleWeek(this)">
        <div class="week-no"><small>第</small><b>${w.start}</b>${w.end!==w.start?'<small>-'+w.end+'周</small>':'<small>周</small>'}</div>
        <div class="week-info" onclick="event.stopPropagation();drillWeek(${wi})" style="cursor:pointer"><h3>${esc(w.title)}</h3>
          <div class="week-meta">${w.total}题 · ${w.daysCount}天 · 约${w.minutes}分钟 · ${w.kps.length}个知识点</div></div>
        <span class="week-status ws-${ws}" onclick="event.stopPropagation();drillWeek(${wi})" style="cursor:pointer">${wsTxt} ${wd}/${w.total}</span>
        <span class="week-arrow">›</span>
      </div>
      <div class="week-bar"><i style="width:${pct}%"></i></div>
      <div class="week-foot" onclick="event.stopPropagation();drillWeek(${wi})">📋 查看本周任务详情与掌握情况 ›</div>
      <div class="week-body"></div>`;
    const body=el.querySelector('.week-body');
    w.days.forEach((d,di)=>{
      const pidx=PARTS.findIndex(p=>p.wk===w&&p.day===d);
      const ddone=dayDone(d);
      const firstUn=qStatus(d.qids.find(id=>qStatus(id)===0)??d.qids[0]);
      const dayEl=document.createElement('div');
      dayEl.className='day';
      dayEl.innerHTML=`<div class="chk ${ddone?'s2':(d.qids.some(id=>qStatus(id)>=1)?'s1':'')}" onclick="toggleDay(event,${pidx})">${ddone?'✓':(d.qids.some(id=>qStatus(id)>=1)?'✓':'')}</div>
        <div class="day-info" style="cursor:pointer" onclick="drillDay(${pidx})"><b>第 ${d.day} 天 · ${esc(d.kp.replace(/（第.*?周）/,''))}</b>
          <span>${d.count}题 · 约${d.minutes}分钟 · 学习约5分钟 · 点看详情›</span></div>
        <button class="day-go" style="margin-right:6px;background:var(--warn-soft);border-color:#f0d491;color:#8a5b00" onclick="startLearn(${pidx})">先学</button>
        <button class="day-go" onclick="startDay(${pidx})">做题</button>`;
      body.appendChild(dayEl);
    });
    list.appendChild(el);
  });
}
function toggleWeek(el){
  el.classList.toggle('open');
  const idx=Array.from(document.querySelectorAll('#weekList .week')).indexOf(el);
  if(el.classList.contains('open'))OPEN_WEEKS.add(idx);else OPEN_WEEKS.delete(idx);
}

// 点击圆圈：未做→已做→已掌握→未做
function toggleDay(e,pidx){
  e.stopPropagation();
  const d=PARTS[pidx].day;
  const allDone=dayDone(d);
  const target=allDone?0:1; // 全做完则清空，否则批量标记已做
  d.qids.forEach(id=>setQStatus(id,target));
  renderToday();renderPlan();renderMine();
  toast(target?'✓ 已标记完成':'已取消打卡');
}

function openVideoDetail(i){location.href='vdetail.html?i='+i+location.search.replace('?','&');}
function go(p){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active','page-enter'));
  var _pg=document.getElementById('page-'+p);
  _pg.classList.add('active');void _pg.offsetWidth;_pg.classList.add('page-enter');
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.p===p));
  if(p==='today')renderToday();
  if(p==='plan')renderPlan();
  if(p==='mine')renderMine();
  if(p==='analysis')renderAnalysis();
  if(p==='points')renderPoints();
  if(p==='video')renderVideoPage();
  window.scrollTo(0,0);
}

// ===== 内嵌视频专栏渲染 =====
// ===== 内嵌视频专栏渲染 =====
var VP={subject:'all',plat:'all',kp:'all'};
function vpSetSubject(v){VP.subject=v;VP.plat='all';VP.kp='all';document.querySelectorAll('#page-video .vp-tabs .t').forEach(x=>x.classList.toggle('on',x.dataset.s===v));vpRenderFilters();vpRenderList();}
function vpSetPlat(v){VP.plat=v;VP.kp='all';vpRenderFilters();vpRenderList();}
function vpSetKp(v){VP.kp=v;vpRenderList();}
function vpEsc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function vpRenderFilters(){
  var V=window.VIDEO_DATA||[];
  var base=V.filter(v=>VP.subject==='all'||v.subject===VP.subject);
  var plats=[...new Set(base.map(v=>v.platform||'B站'))];
  var pb=document.getElementById('vpPlatFilter');
  if(pb){
    pb.innerHTML=`<div class="chip${VP.plat==='all'?' on':''}" onclick="vpSetPlat('all')">全部平台</div>`+
      plats.map(p=>`<div class="chip${VP.plat===p?' on':''}" onclick="vpSetPlat('${vpEsc(p)}')">${vpEsc(p)}<span class="cnt">${base.filter(v=>(v.platform||'B站')===p).length}</span></div>`).join('');
  }
  var base2=base.filter(v=>VP.plat==='all'||(v.platform||'B站')===VP.plat);
  var kps=[...new Set(base2.flatMap(v=>v.kps||[]))];
  var kb=document.getElementById('vpKpFilter');
  if(kb){
    kb.innerHTML=`<div class="chip${VP.kp==='all'?' on':''}" onclick="vpSetKp('all')">全部知识点</div>`+
      kps.map(k=>`<div class="chip${VP.kp===k?' on':''}" onclick="vpSetKp('${vpEsc(k)}')">${vpEsc(k)}</div>`).join('');
  }
}
function vpRenderList(){
  var V=window.VIDEO_DATA||[];
  var list=V.filter(v=>(VP.subject==='all'||v.subject===VP.subject)&&(VP.plat==='all'||(v.platform||'B站')===VP.plat)&&(VP.kp==='all'||(v.kps||[]).includes(VP.kp)));
  var cnt=document.getElementById('vpCount');if(cnt)cnt.textContent=list.length;
  var box=document.getElementById('vpList');if(!box)return;
  if(!list.length){box.innerHTML='<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px 0">当前筛选下暂无课程，换个条件试试</div>';return;}
  box.innerHTML=list.map(v=>{
    var idx=V.indexOf(v);
    return `<div class="vp-card" onclick="openVideoDetail(${idx})">
      <div class="cover">
        <img src="${vpEsc(v.cover||'')}" alt="${vpEsc(v.title||'')}" loading="lazy" onerror="this.style.background='#dbe4f2';this.removeAttribute('src')">
        <span class="badge ${v.subject==='历史'?'ls':'jz'}">${v.subject==='历史'?'历史':'教综'}</span>
        <span class="play"></span>
      </div>
      <div class="body">
        <div class="vt">${vpEsc(v.title||'')}</div>
        <div class="va">👤 ${vpEsc(v.author||'')}</div>
        <div class="pf">🏛 ${vpEsc(v.platform||'B站')} · ${vpEsc(v.ptype||'视频')}</div>
      </div>
    </div>`;}).join('');
}
function renderVideoPage(){vpRenderFilters();vpRenderList();}

// ===== 学习内容（先学后练） =====
let LN={pidx:null,kp:null,index:false};
function tagCls(tag){return {'核心':'tag-core','口诀':'tag-mn','数字':'tag-num','易错':'tag-dif'}[tag]||'tag-core';}
function renderLearn(){
  const info=KP[LN.kp]||{};
  const L=info.learn||{};
  const title=String(LN.kp||'').replace(/（第.*?周）/,'');
  document.getElementById('lnTitle').textContent=title;
  document.getElementById('lnNum').textContent=LN.index?'知识点清单':(LN.pidx!==null?'先学 · 约5分钟':'学习');
  let html='';
  if(L.keynotes&&L.keynotes.length){
    html+=`<div class="ln-card">
      <div class="ln-sec-h"><span class="em">🎯</span>核心重点速记<small>${L.keynotes.length}条</small></div>
      ${L.keynotes.map(k=>`<div class="kn-item"><span class="ktag ${tagCls(k.tag)}">${esc(k.tag)}</span><span class="txt">${esc(k.t)}</span></div>`).join('')}
    </div>`;
  }
  if(L.mindmap&&L.mindmap.branches&&L.mindmap.branches.length){
    html+=`<div class="ln-card">
      <div class="ln-sec-h"><span class="em">🧭</span>思维导图<small>记住主线</small></div>
      <div class="mm-center"><b>${esc(L.mindmap.center||title)}</b></div>
      <div class="mm-branches">${L.mindmap.branches.map(b=>
        `<div class="mm-branch"><h4>${esc(b.title)}</h4><p>${esc(b.detail)}</p></div>`).join('')}</div>
    </div>`;
  }
  if(info.memory||L.keypoints){
    html+=`<div class="ln-card">
      <div class="ln-sec-h"><span class="em">📝</span>知识点精讲</div>
      <div class="ln-note">${esc(L.keypoints||info.memory||'')}</div>
    </div>`;
  }
  if(info.mistake||L.mistakes){
    html+=`<div class="ln-card">
      <div class="ln-sec-h"><span class="em">⚠️</span>易错提醒</div>
      <div class="ln-warn">${esc(L.mistakes||info.mistake||'')}</div>
    </div>`;
  }
  if(!html){html='<div class="empty"><div class="em">📭</div>这个知识点暂未配置学习内容</div>';}
  // 知识点配套视频（真实公开视频，来自 video-data.js）
  try{
    if(!LN.index&&window.VIDEO_DATA){
      const kpKey=String(LN.kp||'').replace(/（第.*?周）/,'');
      const segs=kpKey.split(/[·、\/]/).map(x=>x.trim()).filter(x=>x.length>=2);
      const allVids=window.VIDEO_DATA.filter(v=>v.kps.some(k=>k===kpKey||segs.some(sg=>k.includes(sg)||sg.includes(k))));
      if(allVids.length){
        // 按平台交错排序：让不同平台的课程都能展示（B站/慕课/智慧教育等）
        const byPlat={};allVids.forEach(v=>{(byPlat[v.platform||'B站']=byPlat[v.platform||'B站']||[]).push(v);});
        const plats=Object.keys(byPlat);const mixed=[];let max=Math.max(...plats.map(p=>byPlat[p].length));
        for(let r=0;r<max&&mixed.length<6;r++)for(const p of plats){if(byPlat[p][r]&&mixed.length<6)mixed.push(byPlat[p][r]);}
        const vids=mixed;
        let vh='<div class="ln-card ln-video"><div class="ln-sec-h"><span class="em">🎬</span>配套视频讲解<small>'+allVids.length+'个</small></div>';
        vh+='<div class="lnv-list">';
        vids.slice(0,6).forEach(v=>{
          const gi=window.VIDEO_DATA.indexOf(v);
          vh+='<div class="lnv-item" onclick="openVideoDetail('+gi+')"><img src="'+esc(v.cover)+'" alt="" loading="lazy"><div class="lnv-txt"><b>'+esc(v.title)+'</b><span>'+esc(v.author)+' · '+esc(v.subject)+'</span></div><span class="lnv-go">›</span></div>';
        });
        vh+='</div><div class="lnv-more" onclick="go(\'video\')">查看全部视频 ›</div></div>';
        html+=vh;
      }
    }
  }catch(e){}
  document.getElementById('lnBody').innerHTML=html;
  document.getElementById('lnBody').scrollTop=0;
  document.getElementById('lnFoot').innerHTML=LN.index
    ? `<button class="ghost" onclick="closeLearn()">返回</button>`
    : `<button class="ghost" onclick="closeLearn()">${LN.backToQuiz?'返回题目':'先不学'}</button>
       <button class="primary" onclick="learnToQuiz()">${LN.backToQuiz?'← 回到题目':(LN.pidx!==null?'学完了 → 去做题':'返回首页')}</button>`;
}
function startLearn(pidx){
  LN={pidx:pidx,kp:PARTS[pidx].day.kp,index:false};
  if(pidx!==null)markLearned(LN.kp);
  document.getElementById('learn').classList.add('show');
  renderLearn();
}
function learnToQuiz(){
  document.getElementById('learn').classList.remove('show');
  if(LN.backToQuiz)return;
  if(LN.pidx!==null){startDay(LN.pidx);}
}
function closeLearn(){
  document.getElementById('learn').classList.remove('show');
  if(!LN.backToQuiz){renderToday();renderPlan();}
}
function openLearnIndex(){
  LN={pidx:null,kp:null,index:true};
  document.getElementById('learn').classList.add('show');
  const keys=Object.keys(KP).filter(k=>KP[k].learn);
  document.getElementById('lnTitle').textContent='📚 知识点学习清单';
  document.getElementById('lnNum').textContent=keys.length+'个知识点';
  document.getElementById('lnBody').innerHTML=keys.map((k,i)=>{
    const info=KP[k];const cnt=(info.learn.keynotes||[]).length;
    return `<div class="qz-card" style="margin-bottom:10px;padding:15px;cursor:pointer" onclick="learnOne(${i})">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="pill">${esc((info.week||'').replace(/第|周/g,'').trim()||'综合')}</span>
        <b style="font-size:14px;flex:1">${esc(k.replace(/（第.*?周）/,''))}</b>
        <span style="color:var(--muted);font-size:12px">${cnt}条重点 ›</span>
      </div></div>`;}).join('');
  window._LEARN_KEYS=keys;
  document.getElementById('lnFoot').innerHTML='<button class="ghost" onclick="closeLearn()">返回首页</button>';
}
function learnOne(i){
  const k=window._LEARN_KEYS[i];
  LN={pidx:null,kp:k,index:false};
  renderLearn();
}

// ===== 做题 =====
let QZ={idx:0,i:0,sel:[],checked:false};
// ===== 每日智能组卷：以当天知识点为主，补充多样题型，按日期种子每天变化 =====
function seedRand(seed){let s=seed>>>0||1;return function(){s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
function buildDayPaper(pidx){
  const day=PARTS[pidx].day;
  // 取知识点主体（去掉所有括号备注），与题库 q.kp 对齐
  const base=String(day.kp).split('（')[0].split('(')[0].trim();
  // 当天知识点在题库里的全部题（含计划外补充题）
  const pool=Object.keys(QS).filter(id=>QS[id]&&String(QS[id].kp||'').split('（')[0].split('(')[0].trim()===base).map(Number);
  // 日期种子：同一天稳定、不同天变化
  const d=new Date();const seed=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()+pidx*97;
  const rnd=seedRand(seed);
  const BIG=['简答','论述','辨析','材料分析','教学设计'];
  const inBase=new Set(day.qids);
  // 基础必做题（保留，保证打卡闭环）
  const core=day.qids.slice();
  // 候选补充题：同知识点里未按计划出现的其它题，按题型归类
  const cand={'单选':[],'多选':[],'判断':[],'大题':[]};
  pool.forEach(id=>{
    if(inBase.has(id))return;
    const t=QS[id].type||'单选';
    const k=BIG.includes(t)?'大题':(t==='单选'||t==='多选'||t==='判断')?t:'大题';
    cand[k].push(id);
  });
  Object.keys(cand).forEach(k=>{for(let i=cand[k].length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));const t=cand[k][i];cand[k][i]=cand[k][j];cand[k][j]=t;}});
  // 补充数量：多选2 判断2 大题1 单选1（有则补，最多+6）
  const extra=[];
  const want={'多选':2,'判断':2,'大题':1,'单选':1};
  Object.keys(want).forEach(k=>{extra.push(...cand[k].slice(0,want[k]));});
  // 合并后整体打乱顺序（核心题也在内），让每天题序不同
  const all=core.concat(extra);
  for(let i=all.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));const t=all[i];all[i]=all[j];all[j]=t;}
  return {ids:all,total:all.length,coreCount:core.length};
}
function startDay(pidx){
  const paper=buildDayPaper(pidx);
  QZ={idx:pidx,i:0,sel:[],checked:false,snap:{},ids:paper.ids,total:paper.total,coreCount:paper.coreCount};
  document.getElementById('quiz').classList.add('show');
  renderQ();
}
function closeQuiz(){
  document.getElementById('quiz').classList.remove('show');
  renderToday();renderPlan();renderMine();
}
function reviewLearn(){
  const {day}=PARTS[QZ.idx];
  LN={pidx:null,kp:day.kp,index:false,backToQuiz:true};
  document.getElementById('learn').classList.add('show');
  renderLearn();
}
function renderQ(){
  const DPF={1:'★基础',2:'★★进阶',3:'★★★挑战'};
  const diffPill=q=>`<span class="pill diff d${q.diff||2}">${DPF[q.diff||2]||'★★进阶'}</span>`;
  const {day}=PARTS[QZ.idx];
  const qid=(QZ.ids||day.qids)[QZ.i];
  const q=QS[qid];
  const total=QZ.total||day.count;
  document.getElementById('qzNum').textContent=(QZ.i+1)+'/'+total;
  document.getElementById('qzProgBar').style.width=Math.round(QZ.i/total*100)+'%';
  document.getElementById('qzTitle').textContent='第'+(QZ.i+1)+'题 · '+day.kp.replace(/（第.*?周）/,'');
  const body=document.getElementById('qzBody');
  const foot=document.getElementById('qzFoot');
  QZ.sel=[];QZ.checked=false;
  // 恢复本题在本会话中的作答快照（回退时用），未作答则保持空白
  const snap=(QZ.snap&&QZ.snap[QZ.i])||null;
  const learnBtn=`<span class="qz-ln" onclick="reviewLearn()">🧠 回看今日重点</span>`;
  const type=q.type||'单选';
  let optsHtml='';
  if(type==='判断'){
    optsHtml=`<div class="opt" data-k="√"><span class="k">√</span><span class="txt">正确</span></div>
              <div class="opt" data-k="×"><span class="k">×</span><span class="txt">错误</span></div>`;
  }else if(type==='单选'||type==='多选'){
    parseOpts(q.opts).forEach(o=>{
      optsHtml+=`<div class="opt" data-k="${o.k}"><span class="k">${o.k}</span><span class="txt">${esc(o.t)}</span></div>`;
    });
  }
  const isEssay=!(type==='单选'||type==='多选'||type==='判断');
  if(isEssay){
    body.innerHTML=`<div class="qz-card">
      ${learnBtn}<div class="qz-tags">${diffPill(q)}<span class="pill">${type}</span><span class="pill ${q.group==='核心必做'?'gray':'gold'}">${esc(q.group)}</span><span class="pill gray">${esc(q.yr||'')}</span>${favBtn(qid)}</div>
      <div class="qz-q">${esc(q.q)}</div>${qImgHtml(q)}
      <div class="ana" id="ana">${answerHtml(q)}</div>
    </div>`;
    foot.innerHTML=`${QZ.i>0?'<button class="ghost prevbtn" onclick="prevQ()">← 上一题</button>':''}<button class="ghost" onclick="closeQuiz()">退出</button>
      <button class="ghost" onclick="document.getElementById('ana').classList.add('show')">👀 查看答案</button>
      <button class="primary" onclick="essayDone()">✓ 我答好了</button>`;
  }else{
    body.innerHTML=`<div class="qz-card">
      ${learnBtn}<div class="qz-tags">${diffPill(q)}<span class="pill">${type}</span><span class="pill ${q.group==='核心必做'?'gray':'gold'}">${esc(q.group)}</span><span class="pill gray">${esc(q.yr||'')}</span>${favBtn(qid)}</div>
      <div class="qz-q">${esc(q.q)}</div>${qImgHtml(q)}
      <div id="opts">${optsHtml}</div>
      <div class="ana" id="ana"></div>
    </div>`;
    body.querySelectorAll('.opt').forEach(el=>{
      el.onclick=()=>pickOpt(el,type,qid);
      if(snap&&snap.sel&&snap.sel.indexOf(el.dataset.k)>=0)el.classList.add('sel');
    });
    const prevBtn=QZ.i>0?`<button class="ghost prevbtn" onclick="prevQ()">← 上一题</button>`:'';
    if(snap&&snap.sel){
      paintAnswer(q,type,qid,snap.sel,snap.ok);
      foot.innerHTML=`${prevBtn}<button class="mastered" onclick="markMastered(${qid})">★ 标记已掌握</button>
        <button class="primary" onclick="nextQ()">${QZ.i+1>=(QZ.total||PARTS[QZ.idx].day.count)?'完成 ✓':'下一题 →'}</button>`;
    }else{
      foot.innerHTML=`${prevBtn}<button class="ghost" onclick="closeQuiz()">退出</button>
        <button class="primary" id="submitBtn" onclick="submitQ(${qid},'${type}')">提交答案</button>`;
    }
  }
}
function pickOpt(el,type,qid){
  const k=el.dataset.k;
  if(type==='多选'){
    const i=QZ.sel.indexOf(k);
    if(i>=0)QZ.sel.splice(i,1);else QZ.sel.push(k);
    el.classList.toggle('sel');
  }else{
    QZ.sel=[k];
    document.querySelectorAll('#opts .opt').forEach(x=>x.classList.remove('sel'));
    el.classList.add('sel');
  }
}
function parseOpts(s){
  if(!s)return [];
  return s.split(/[；;]/).map(x=>x.trim()).filter(Boolean).map(x=>{
    const m=x.match(/^([A-D])[\.．、:：]?\s*(.*)$/);
    return m?{k:m[1],t:m[2]}:{k:x[0]||'',t:x};
  });
}
function answerHtml(q){
  return `<div class="hd">参考答案</div><div style="white-space:pre-wrap">${esc(q.ana||q.ans||'')}</div>`;
}
function paintAnswer(q,type,qid,mineSel,ok){
  const ans=String(q.ans||'').toUpperCase().replace(/[\s]/g,'');
  document.querySelectorAll('#opts .opt').forEach(el=>{
    const k=el.dataset.k;
    if(ans.indexOf(k)>=0)el.classList.add('right');
    else if(mineSel.indexOf(k)>=0)el.classList.add('wrong');
  });
  const ana=document.getElementById('ana');
  ana.innerHTML=`<div class="hd ${ok?'ok':'no'}">${ok?'✓ 回答正确':'✗ 回答错误'} · 正确答案：${esc(q.ans)}</div>
    <div style="margin-top:6px">${esc(q.ana||'')}</div>
    <div style="margin-top:8px;font-size:11px;color:var(--muted)">${esc(q.site||'')} · ${esc(q.yr||'')}</div>`;
  ana.classList.add('show');
}
function submitQ(qid,type){
  if(!QZ.sel.length){toast('请先选择答案');return;}
  const q=QS[qid];
  const mine=QZ.sel.slice().sort().join('');
  const ans=String(q.ans||'').toUpperCase().replace(/[\s]/g,'');
  const ok=(mine===ans);
  prog.q[qid]=prog.q[qid]||{};
  prog.q[qid].a=mine;prog.q[qid].ok=ok;prog.q[qid].t=Date.now();
  if(prog.q[qid].s===0||!prog.q[qid].s)prog.q[qid].s=1;
  saveProg();
  QZ.snap=QZ.snap||{};QZ.snap[QZ.i]={sel:QZ.sel.slice(),ok:ok};
  paintAnswer(q,type,qid,QZ.sel.slice(),ok);
  document.getElementById('qzFoot').innerHTML=`
    ${QZ.i>0?'<button class="ghost prevbtn" onclick="prevQ()">← 上一题</button>':''}
    <button class="mastered" onclick="markMastered(${qid})">★ 标记已掌握</button>
    <button class="primary" onclick="nextQ()">${QZ.i+1>=(QZ.total||PARTS[QZ.idx].day.count)?'完成 ✓':'下一题 →'}</button>`;
}
function markMastered(qid){setQStatus(qid,2);toast('★ 已标记掌握');}
function essayDone(){
  const {day}=PARTS[QZ.idx],qid=(QZ.ids||day.qids)[QZ.i];
  if(!prog.q[qid]||prog.q[qid].s<1)setQStatus(qid,1);
  nextQ();
}
function nextQ(){
  const {day}=PARTS[QZ.idx];
  if(QZ.i+1>=(QZ.total||day.count)){
    showResult();return;
  }
  QZ.i++;renderQ();
  document.getElementById('qzBody').scrollTop=0;
}
function prevQ(){
  if(QZ.i<=0)return;
  QZ.i--;renderQ();
  document.getElementById('qzBody').scrollTop=0;
}
function showResult(){
  const {day}=PARTS[QZ.idx];
  const body=document.getElementById('qzBody');
  body.innerHTML=`<div class="result">
    <div class="em">🎉</div><h2>今天的打卡完成啦！</h2>
    <p>共完成 ${(QZ.total||day.count)} 道题 · 约 ${day.minutes} 分钟的学习量</p>
    <div class="big">+${(QZ.total||day.count)}</div>
    <p style="margin-top:8px">继续保持，明天见 💪</p>
  </div>`;
  document.getElementById('qzFoot').innerHTML=`<button class="primary" onclick="closeQuiz()">完成，返回</button>`;
  document.getElementById('qzProgBar').style.width='100%';
}

// ===== 学情分析 / 详情抽屉 =====
// 知识点主题归一：把“主题（第X周）”还原为主题名，便于跨周聚合
function kpBase(k){return String(k||'').replace(/（第[^）]*周）/g,'').replace(/\(第[^)]*周\)/g,'').trim();}
// 知识点 -> 学科/模块元数据（从 kps + 题库两条来源合并）
let KP_META=null;
function kpMeta(){
  if(KP_META)return KP_META;
  KP_META={};
  for(const k in KP){const b=kpBase(k);if(!KP_META[b])KP_META[b]={subject:KP[k].subject||'',module:KP[k].module||''};
    else{if(KP[k].subject)KP_META[b].subject=KP[k].subject;if(KP[k].module)KP_META[b].module=KP[k].module;}}
  return KP_META;
}
// 题目所属主题（归一后）
function qKp(qid){const q=QS[qid];return q?kpBase(q.kp):'';}
const MODULES=[
  {name:'教育学基础',color:'#1652d4',test:m=>/教育学/.test(m)},
  {name:'心理学与教育心理学',color:'#7b3fd1',test:m=>/心理学|教育心理学/.test(m)},
  {name:'法律法规与师德',color:'#0e9f6e',test:m=>/法规|师德|法律/.test(m)},
  {name:'中国古代史',color:'#d64550',test:m=>/中国古代史/.test(m)},
  {name:'近现代与世界史',color:'#e8a90b',test:m=>/中国近代史|中国现代史|世界史/.test(m)},
];
function modOf(base){const m=(kpMeta()[base]||{}).module||'';for(const x of MODULES)if(x.test(m))return x;return MODULES[0];}
// 聚合某组 qid 的作答统计
function agg(ids){
  let total=ids.length,done=0,mastered=0,answered=0,right=0;
  ids.forEach(id=>{const v=prog.q[id]||{};const s=v.s||0;if(s>=1)done++;if(s===2)mastered++;
    if(v.a!==undefined){answered++;if(v.ok)right++;}});
  return {total,done,mastered,answered,right,rate:answered?Math.round(right/answered*100):0,
    masterPct:total?Math.round((mastered+right*0.0)/total*100):0};
}
// 按主题聚合所有计划题
function byKp(){
  const map={};
  PARTS.forEach(p=>{const b=kpBase(p.day.kp);if(!map[b])map[b]={base:b,ids:[],dayIdx:[]};map[b].ids.push(...p.day.qids);map[b].dayIdx.push(PARTS.indexOf(p));});
  // 补上题库里存在但计划外的题（若将来扩展）
  for(const id in QS){const b=qKp(+id);if(!map[b])map[b]={base:b,ids:[],dayIdx:[]};if(map[b].ids.indexOf(+id)<0)map[b].ids.push(+id);}
  Object.values(map).forEach(o=>o.st=agg(o.ids));
  return map;
}
function levelOf(st){if(!st.answered&&!st.mastered)return 0;const r=st.rate;if(r>=85)return 3;if(r>=60)return 2;return 1;}
function levelColor(l){return ['#e9eef6','#d64550','#e8a90b','#0e9f6e'][l];}
function levelName(l){return ['未学','薄弱','巩固','掌握'][l];}

function renderAnalysis(){
  const st=stats();
  document.getElementById('anaAccTop').textContent=st.answered?(st.rate+'%'):'—';
  // KPI
  const map=byKp();const kps=Object.values(map);
  const weak=kps.filter(o=>o.st.answered>=2&&o.st.rate<60).length;
  const learnedKp=kps.filter(o=>o.st.done>0).length;
  document.getElementById('anaKpi').innerHTML=`
    <div class="kpi"><div class="kl">累计作答</div><div class="kv">${st.answered}<small> 题</small></div><div class="ks">已打卡 ${st.done} / ${st.total}</div></div>
    <div class="kpi g"><div class="kl">总正确率</div><div class="kv">${st.answered?st.rate:'—'}<small>${st.answered?'%':''}</small></div><div class="ks">答对 ${Math.round(st.answered*st.rate/100)} 题</div></div>
    <div class="kpi w"><div class="kl">已掌握知识点</div><div class="kv">${learnedKp}<small> / ${kps.length}</small></div><div class="ks">至少做过 1 题</div></div>
    <div class="kpi r"><div class="kl">薄弱知识点</div><div class="kv">${weak}<small> 个</small></div><div class="ks">正确率低于 60%</div></div>`;
  renderRadar(map);
  renderKpHeat(kps);
  renderTrend();
  renderTypeBars();
  renderWeak(kps);
  renderHeatCal();
  renderWrongTop();
}

// 五维雷达图（以各模块“掌握正确率”为半径，含题库占比底图说明）
function renderRadar(map){
  const cv=document.getElementById('radar');const ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height,cx=W/2,cy=H/2+6,R=84,n=MODULES.length;
  const SHORT={'教育学基础':'教育学','心理学与教育心理学':'心理·教心','法律法规与师德':'法规师德','中国古代史':'古代史','近现代与世界史':'近现代史'};
  ctx.clearRect(0,0,W,H);
  const mods=MODULES.map(m=>{
    const ids=[];Object.values(map).forEach(o=>{if(modOf(o.base)===m)ids.push(...o.ids);});
    return {m,st:agg([...new Set(ids)])};
  });
  const ang=i=>-Math.PI/2+i*2*Math.PI/n;
  const pt=(i,r)=>[cx+r*Math.cos(ang(i)),cy+r*Math.sin(ang(i))];
  // 网格
  for(let g=1;g<=4;g++){const r=R*g/4;ctx.beginPath();for(let i=0;i<n;i++){const[x,y]=pt(i,r);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();
    ctx.strokeStyle=g===4?'#d7e0ee':'#eef2f8';ctx.lineWidth=1;ctx.stroke();}
  for(let i=0;i<n;i++){const[x,y]=pt(i,R);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.strokeStyle='#eef2f8';ctx.stroke();}
  // 数据面
  ctx.beginPath();mods.forEach((o,i)=>{const[x,y]=pt(i,R*o.st.rate/100);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();
  ctx.fillStyle='rgba(22,82,212,.18)';ctx.fill();ctx.strokeStyle='#1652d4';ctx.lineWidth=2;ctx.stroke();
  mods.forEach((o,i)=>{const[x,y]=pt(i,R*o.st.rate/100);ctx.beginPath();ctx.arc(x,y,3.5,0,7);ctx.fillStyle='#1652d4';ctx.fill();});
  // 标签
  ctx.font='600 11px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillStyle='#3c4a63';
  mods.forEach((o,i)=>{const[x,y]=pt(i,R+16);ctx.textAlign=Math.abs(x-cx)<8?'center':(x>cx?'left':'right');ctx.textBaseline='middle';
    ctx.fillText(SHORT[o.m.name]||o.m.name,x,y);});
  document.getElementById('radarLegend').innerHTML=mods.map((o,i)=>
    `<div class="rl-row" onclick="drillModule(${i})"><span class="rl-dot" style="background:${o.m.color}"></span>
      <span class="rl-name">${o.m.name}</span><span class="rl-val">${o.st.answered?o.st.rate+'%':'—'}</span>
      <span class="rl-cnt">${o.st.answered}/${o.st.total}题</span></div>`).join('')+
    `<div style="font-size:10px;color:var(--muted);margin-top:8px;line-height:1.6">未作答的模块显示为 —，答过题后自动形成雷达图。点任意模块可查看题目。</div>`;
  window._MOD_STATS=mods;
}

function renderKpHeat(kps){
  const sorted=kps.slice().sort((a,b)=>{
    const la=levelOf(a.st),lb=levelOf(b.st);if(la!==lb)return la-lb;return a.st.rate-b.st.rate;});
  document.getElementById('kpHeat').innerHTML=sorted.map(o=>{
    const l=levelOf(o.st);const c=levelColor(l);
    return `<div class="kp-cell" style="border-left:3px solid ${c}" onclick="drillKp('${encodeURIComponent(o.base)}')">
      <div class="kc-n">${esc(o.base)}</div>
      <div class="kc-m" style="color:${o.st.answered?c:'var(--muted)'}">${o.st.answered?o.st.rate+'%':'—'}</div>
      <div class="kc-s">${o.st.done}/${o.st.total}题 · ${levelName(l)}</div></div>`;}).join('');
}

function renderTrend(){
  const answered=[];for(const id in prog.q){const v=prog.q[id];if(v.a!==undefined)answered.push({t:v.t||0,ok:v.ok?1:0,id});}
  const svg=document.getElementById('trendSvg');
  if(answered.length<2){svg.innerHTML=`<text x="50%" y="50%" text-anchor="middle" font-size="13" fill="#7a889f">至少答 2 题后生成正确率曲线</text>`;return;}
  // 按作答顺序分 12 段
  const N=Math.min(12,answered.length),seg=Math.ceil(answered.length/N),pts=[];
  for(let i=0;i<answered.length;i+=seg){const chunk=answered.slice(i,i+seg);pts.push(Math.round(chunk.reduce((a,b)=>a+b.ok,0)/chunk.length*100));}
  const W=520,H=170,pad=28,iw=(W-pad*2)/Math.max(1,pts.length-1);
  let grid='';[0,25,50,75,100].forEach(v=>{const y=H-30-(H-50)*v/100;grid+=`<line x1="${pad}" y1="${y}" x2="${W-12}" y2="${y}" stroke="#eef2f8"/><text x="4" y="${y+4}" font-size="10" fill="#9aa6b8">${v}</text>`;});
  const co=pts.map((v,i)=>[pad+i*iw,H-30-(H-50)*v/100]);
  const line=co.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ');
  const area=line+` L ${co[co.length-1][0]} ${H-30} L ${co[0][0]} ${H-30} Z`;
  const dots=co.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#1652d4"/><text x="${p[0]}" y="${p[1]-9}" font-size="10" text-anchor="middle" fill="#1652d4" font-weight="700">${pts[i]}</text>`).join('');
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.innerHTML=grid+`<defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1652d4" stop-opacity=".28"/><stop offset="1" stop-color="#1652d4" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#tg)"/><path d="${line}" fill="none" stroke="#1652d4" stroke-width="2.5" stroke-linejoin="round"/>${dots}`;
}

function renderTypeBars(){
  const groups={};for(const id in QS){const q=QS[id];const t=q.type||'单选';if(!groups[t])groups[t]=[];groups[t].push(+id);}
  const order=['单选','多选','判断','简答','论述','辨析','材料分析','教学设计'];
  const rows=order.filter(t=>groups[t]).map(t=>{
    const st=agg(groups[t]);return {t,st};});
  document.getElementById('typeBars').innerHTML=rows.map(r=>`
    <div class="bar-row" onclick="drillType('${encodeURIComponent(r.t)}')">
      <span class="bl">${r.t}</span>
      <span class="bt"><span class="bf" style="width:${r.st.rate}%;background:${levelColor(levelOf(r.st))}">${r.st.rate?'':''}</span></span>
      <span class="bv">${r.st.answered?r.st.rate+'%':'—'}</span></div>`).join('')+
    `<div style="font-size:10px;color:var(--muted);margin-top:6px">条形长度＝正确率，颜色＝掌握等级（红薄弱/黄巩固/绿掌握）</div>`;
}

function renderWeak(kps){
  const weak=kps.filter(o=>o.st.answered>=2).sort((a,b)=>a.st.rate-b.st.rate).slice(0,8);
  const box=document.getElementById('weakRank');
  if(!weak.length){box.innerHTML='<div class="empty-mini"><span class="em">🌱</span>多答几道题，这里会列出你最需要攻克的知识点</div>';return;}
  box.innerHTML=weak.map((o,i)=>`
    <div class="rank-row" onclick="drillKp('${encodeURIComponent(o.base)}')">
      <div class="rank-no ${i>2?'n3':i===0?'':'n'+(i+1)}">${i+1}</div>
      <div class="rank-info"><b>${esc(o.base)}</b><span>正确率 ${o.st.rate}% · 答 ${o.st.answered} 题 · ${esc((o.base&&kpMeta()[o.base]||{}).subject||'')}</span></div>
      <span class="rank-btn">攻克</span></div>`).join('');
}

function renderHeatCal(){
  const days={};for(const id in prog.q){const v=prog.q[id];if(v.a!==undefined&&v.t){const d=new Date(v.t);const k=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());days[k]=(days[k]||0)+1;}}
  const box=document.getElementById('heatCal');const today=new Date();
  let html='';for(var w=11;w>=0;w--){for(let d=0;d<7;d++){
    const dt=new Date(today);dt.setDate(today.getDate()-(w*7+d));
    const k=dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());
    const n=days[k]||0;const lv=n===0?'':n<=3?'l1':n<=7?'l2':n<=14?'l3':'l4';
    const isToday=k===(today.getFullYear()+'-'+pad(today.getMonth()+1)+'-'+pad(today.getDate()));
    html+=`<span class="hc ${lv} ${isToday?'today':''}" title="${k} · ${n}题"></span>`;
  }}
  box.innerHTML=html;
}

function renderWrongTop(){
  const wrong=[];for(const id in prog.q){const v=prog.q[id];if(v.a!==undefined&&!v.ok)wrong.push(+id);}
  const box=document.getElementById('wrongTop');
  document.getElementById('wrongMore').style.display=wrong.length>5?'':'none';
  if(!wrong.length){box.innerHTML='<div class="empty-mini"><span class="em">✨</span>还没有错题，答错的题会自动收进这里</div>';return;}
  box.innerHTML=wrong.slice(0,5).map(id=>qListItem(id,'❌')).join('');
  window._WRONG_IDS=wrong;
}

// ===== 抽屉通用 =====
function openDr(title,sub,body,foot){
  document.getElementById('drTitle').textContent=title;
  document.getElementById('drSub').textContent=sub||'';
  document.getElementById('drBody').innerHTML=body;
  document.getElementById('drFoot').innerHTML=foot||'<button class="ghost" onclick="closeDr()">关闭</button>';
  document.getElementById('drawer').classList.add('show');
  document.getElementById('drBody').scrollTop=0;
}
function closeDr(){document.getElementById('drawer').classList.remove('show');}
function qListItem(id,badge){
  const q=QS[id];if(!q)return '';
  const v=prog.q[id]||{};const st=v.s||0;
  const tag=badge||(st===2?'✅':st===1?'✅':'⬜');
  return `<div class="dr-item" onclick="drillQuestion(${id})">
    <div class="di-h"><span class="pill" style="font-size:10px">${tag}</span>
      <b>${esc(kpBase(q.kp))}</b><span class="pill gray" style="font-size:9.5px">${esc(q.type||'单选')}</span>
      ${v.a!==undefined?`<span class="pill ${v.ok?'ok':''}" style="font-size:9.5px;${v.ok?'':'background:var(--err-soft);color:var(--err)'}">${v.ok?'✓ 答对':'✗ 答错'}</span>`:''}</div>
    <div class="di-q">${esc(q.q)}</div>${qImgHtml(q,true)}
    <div class="di-m"><span>答案 ${esc(q.ans||'')}</span><span>${esc(q.yr||'')}</span></div></div>`;
}
function drillDone(){
  const ids=Object.keys(prog.q).map(Number).filter(id=>qStatus(id)>=1&&QS[id]);
  const st=stats();
  openDr('已打卡题目',`共 ${ids.length} 题 · 已掌握 ${st.mastered} 题`,
    ids.length?ids.slice().reverse().map(id=>qListItem(id)).join(''):'<div class="empty-mini"><span class="em">📝</span>还没有打卡记录，去今日任务做几道题吧</div>',
    '<button class="primary" onclick="closeDr();go(\'today\')">去做题</button>');
}
function drillMastered(){
  const ids=Object.keys(prog.q).map(Number).filter(id=>qStatus(id)===2&&QS[id]);
  openDr('已掌握题目',`共 ${ids.length} 题`,
    ids.length?ids.slice().reverse().map(id=>qListItem(id,'★')).join(''):'<div class="empty-mini"><span class="em">⭐</span>做题后点「标记已掌握」，题目会收进这里</div>',
    '<button class="ghost" onclick="closeDr()">关闭</button>');
}
function drillWeek(wi){
  const w=DATA.weeks[wi];const wd=w.qids.filter(id=>qStatus(id)>=1).length;
  const st=agg(w.qids);
  const kpList=w.kps.map(k=>{const b=kpBase(k);const ids=[];w.days.forEach(d=>{if(kpBase(d.kp)===b)ids.push(...d.qids);});
    if(!ids.length)for(const id in QS){if(qKp(+id)===b)ids.push(+id);}const s=agg([...new Set(ids)]);
    return `<div class="dr-item" onclick="drillKp('${encodeURIComponent(b)}')"><div class="di-h"><b>${esc(b)}</b></div>
      <div class="di-m"><span>已做 ${s.done}/${s.total}</span><span>正确率 ${s.answered?s.rate+'%':'—'}</span><span>${levelName(levelOf(s))}</span></div></div>`;}).join('');
  openDr(w.week+' · '+w.title,`${w.total}题 · ${w.daysCount}天 · 已完成 ${wd}/${w.total}`,
    `<div class="kpi-grid" style="margin-bottom:12px">
      <div class="kpi"><div class="kl">本周进度</div><div class="kv">${Math.round(wd/w.total*100)}<small>%</small></div></div>
      <div class="kpi g"><div class="kl">本周正确率</div><div class="kv">${st.answered?st.rate:'—'}<small>${st.answered?'%':''}</small></div></div>
     </div>
     <div class="sec-title" style="margin:6px 4px 8px"><h2 style="font-size:13px">📚 本周知识点</h2></div>
     ${kpList||'<div class="empty-mini">暂无知识点</div>'}
     <div class="sec-title" style="margin:14px 4px 8px"><h2 style="font-size:13px">📅 每天任务</h2></div>
     ${w.days.map(d=>{const pidx=PARTS.findIndex(p=>p.wk===w&&p.day===d);return `<div class="dr-item" onclick="closeDr();startDay(${pidx})">
       <div class="di-h"><b>第 ${d.day} 天 · ${esc(kpBase(d.kp))}</b></div>
       <div class="di-m"><span>${d.count}题</span><span>约${d.minutes}分钟</span><span style="color:var(--brand)">点此开始做题 →</span></div></div>`;}).join('')}`,
    '<button class="primary" onclick="closeDr();startDay('+PARTS.findIndex(p=>p.wk===w&&!dayDone(p.day))+')">开始本周练习</button>');
}
function drillDay(pidx){
  const {wk,day}=PARTS[pidx];const st=agg(day.qids);const info=KP[day.kp]||{};
  openDr('第 '+day.day+' 天 · '+kpBase(day.kp),wk.week+' · '+day.count+'题',
    `<div class="kpi-grid" style="margin-bottom:12px">
      <div class="kpi"><div class="kl">完成度</div><div class="kv">${st.done}<small>/${st.total}</small></div></div>
      <div class="kpi g"><div class="kl">正确率</div><div class="kv">${st.answered?st.rate:'—'}<small>${st.answered?'%':''}</small></div></div>
     </div>
     ${info.task?`<div class="info-card" style="margin-bottom:12px"><b>今日任务：</b>${esc(info.task)}</div>`:''}
     ${(info.learn&&info.learn.keynotes)?`<div class="sec-title" style="margin:6px 4px 8px"><h2 style="font-size:13px">🎯 重点速记</h2></div>
       ${info.learn.keynotes.slice(0,4).map(k=>`<div class="dr-item" style="cursor:default"><div class="di-q" style="font-size:12px">· ${esc(k.t)}</div></div>`).join('')}`:''}
     <div class="sec-title" style="margin:14px 4px 8px"><h2 style="font-size:13px">📝 当天题目</h2></div>
     ${day.qids.map(id=>qListItem(id)).join('')}`,
    `<button class="ghost" onclick="closeDr();startLearn(${pidx})">📖 先学重点</button><button class="primary" onclick="closeDr();startDay(${pidx})">▶ 开始做题</button>`);
}
function drillKp(baseEnc){
  const base=decodeURIComponent(baseEnc);const map=byKp();const o=map[base];
  if(!o){toast('未找到知识点');return;}
  const ids=[...new Set(o.ids)];const st=o.st;const meta=kpMeta()[base]||{};const info=Object.keys(KP).find(k=>kpBase(k)===base);
  const kpInfo=info?KP[info]:{};
  openDr(base,`${meta.subject||''} ${meta.module?'· '+meta.module:''} · ${st.total}题`,
    `<div class="kpi-grid" style="margin-bottom:12px">
      <div class="kpi"><div class="kl">已做 / 总题</div><div class="kv">${st.done}<small>/${st.total}</small></div></div>
      <div class="kpi g"><div class="kl">正确率</div><div class="kv">${st.answered?st.rate:'—'}<small>${st.answered?'%':''}</small></div></div>
      <div class="kpi w"><div class="kl">已掌握题</div><div class="kv">${st.mastered}<small> 题</small></div></div>
      <div class="kpi r"><div class="kl">掌握等级</div><div class="kv" style="color:${levelColor(levelOf(st))};font-size:20px">${levelName(levelOf(st))}</div></div>
     </div>
     ${kpInfo.memory?`<div class="info-card" style="margin-bottom:12px"><b>要点：</b>${esc(kpInfo.memory)}</div>`:''}
     <div class="sec-title" style="margin:6px 4px 8px"><h2 style="font-size:13px">📝 相关题目</h2></div>
     ${ids.map(id=>qListItem(id)).join('')}`,
    `<button class="ghost" onclick="closeDr();startLearn(${Math.max(0,o.dayIdx[0]||0)})">📖 学重点</button>
     <button class="primary" onclick="closeDr();quizIds('${encodeURIComponent(base)}','knowledge')">▶ 练这个知识点</button>`);
}
function drillModule(i){
  const mods=window._MOD_STATS||[];if(!mods[i])return;const m=mods[i].m;
  const map=byKp();const bases=Object.keys(map).filter(b=>modOf(b)===m);
  const ids=[];bases.forEach(b=>ids.push(...map[b].ids));const uniq=[...new Set(ids)];const st=agg(uniq);
  openDr(m.name,`${uniq.length}题 · 正确率 ${st.answered?st.rate+'%':'—'}`,
    `<div class="kpi-grid" style="margin-bottom:12px">
      <div class="kpi"><div class="kl">模块题量</div><div class="kv">${uniq.length}<small> 题</small></div></div>
      <div class="kpi g"><div class="kl">已作答</div><div class="kv">${st.answered}<small> 题</small></div></div></div>
     <div class="sec-title" style="margin:6px 4px 8px"><h2 style="font-size:13px">📚 包含知识点</h2></div>
     ${bases.map(b=>{const s=map[b].st;return `<div class="dr-item" onclick="drillKp('${encodeURIComponent(b)}')"><div class="di-h"><b>${esc(b)}</b></div>
       <div class="di-m"><span>已做 ${s.done}/${s.total}</span><span>正确率 ${s.answered?s.rate+'%':'—'}</span></div></div>`;}).join('')}`,
    `<button class="primary" onclick="closeDr();quizModule(${i})">▶ 练这个模块</button>`);
}
function drillType(tEnc){
  const t=decodeURIComponent(tEnc);const ids=Object.keys(QS).filter(id=>(QS[id].type||'单选')===t).map(Number);
  const st=agg(ids);
  openDr(t+'题',`共 ${ids.length} 题 · 正确率 ${st.answered?st.rate+'%':'—'}`,
    ids.length?ids.slice(0,60).map(id=>qListItem(id)).join('')+(ids.length>60?'<div class="empty-mini">仅显示前 60 题</div>':''):'<div class="empty-mini">暂无题目</div>',
    '<button class="ghost" onclick="closeDr()">关闭</button>');
}
function drillAllWeak(){
  const kps=Object.values(byKp()).filter(o=>o.st.answered>=2&&o.st.rate<70).sort((a,b)=>a.st.rate-b.st.rate);
  openDr('薄弱环节清单',`共 ${kps.length} 个知识点`,
    kps.length?kps.map(o=>`<div class="dr-item" onclick="drillKp('${encodeURIComponent(o.base)}')"><div class="di-h"><b>${esc(o.base)}</b>
      <span class="pill" style="font-size:9.5px;background:var(--err-soft);color:var(--err)">${o.st.rate}%</span></div>
      <div class="di-m"><span>答 ${o.st.answered} 题</span><span>已做 ${o.st.done}/${o.st.total}</span></div></div>`).join(''):'<div class="empty-mini">暂无薄弱知识点，继续保持</div>',
    '<button class="ghost" onclick="closeDr()">关闭</button>');
}
function showWrongAll(){
  const wrong=window._WRONG_IDS||[];
  openDr('错题本',`共 ${wrong.length} 道错题 · 点击重做`,
    wrong.length?wrong.map(id=>qListItem(id,'❌')).join(''):'<div class="empty-mini">暂无错题</div>',
    '<button class="primary" onclick="closeDr();quizIds(\'wrong\',\'wrong\')">▶ 重做全部错题</button>');
}
function showFavAll(){
  FAV=loadFav();renderFavBadge();refreshVisibleFavBtns();
  const favs=FAV.filter(id=>QS[id]);
  openDr('⭐ 我的收藏夹',favs.length?('共 '+favs.length+' 道收藏题 · 点击重做'):'把做过的题收藏起来，可随时回看',
    favs.length?favs.map(id=>qListItem(id,'⭐')).join(''):'<div class="empty-mini">还没有收藏题目。做题时点题号旁的 ☆，或在题目大全里点收藏。</div>',
    (favs.length?'<button class="primary" onclick="closeDr();quizIds(\'fav\',\'fav\')">▶ 练习全部收藏题</button>':'')+'<button class="ghost" onclick="closeDr()">关闭</button>');
}
function drillQuestion(id){
  const q=QS[id];if(!q)return;const v=prog.q[id]||{};const type=q.type||'单选';
  const isChoice=type==='单选'||type==='多选'||type==='判断';
  let opts='';
  if(type==='判断')opts=`<div class="opt" data-k="√"><span class="k">√</span><span class="txt">正确</span></div><div class="opt" data-k="×"><span class="k">×</span><span class="txt">错误</span></div>`;
  else if(type==='单选'||type==='多选')opts=parseOpts(q.opts).map(o=>`<div class="opt" data-k="${o.k}"><span class="k">${o.k}</span><span class="txt">${esc(o.t)}</span></div>`).join('');
  openDr('题目详情',kpBase(q.kp)+' · '+type,
    `<div class="dr-q"><div class="qz-tags"><span class="pill">${type}</span><span class="pill gray">${esc(q.yr||'')}</span>${favBtn(id)}
      ${v.a!==undefined?`<span class="pill ${v.ok?'ok':''}">${v.ok?'✓ 曾答对':'✗ 曾答错'}</span>`:''}</div>
      <div class="qz-q">${esc(q.q)}</div>${qImgHtml(q)}
      ${isChoice?`<div id="drOpts">${opts}</div>`:''}
      <div class="ana show" style="display:block"><div class="hd">参考答案</div><div>${esc(q.ana||q.ans||'')}</div></div></div>`,
    `<button class="ghost" onclick="closeDr()">关闭</button>
     ${isChoice?`<button class="okb" onclick="drMark(${id},2)">★ 标记掌握</button>`:''}`);
  if(isChoice){const ans=String(q.ans||'').toUpperCase();
    document.querySelectorAll('#drOpts .opt').forEach(el=>{if(ans.indexOf(el.dataset.k)>=0)el.classList.add('right');});}
}
function drMark(id,s){setQStatus(id,s);toast(s===2?'★ 已标记掌握':'已更新');renderToday();}

// ===== 指定题目集练习（复用全屏做题器）=====
let QZ_TEMP=null;
function openDiffPick(){
  const cfg=[{d:1,n:'★ 基础',desc:'直接识记·定义人物著作',cls:'d1'},
             {d:2,n:'★★ 进阶',desc:'理解辨析·情境判断',cls:'d2'},
             {d:3,n:'★★★ 挑战',desc:'综合分析·经典中高考题',cls:'d3'}];
  const rows=cfg.map(c=>{
    const n=Object.values(QS).filter(q=>(q.diff||2)===c.d).length;
    return `<div class="dr-item" onclick="quizDiff(${c.d})">
      <div class="di-h"><b style="color:var(--brand);font-size:12px">${c.n}</b><span class="pill diff ${c.cls}" style="margin-left:auto">${n}题</span></div>
      <div class="di-q" style="-webkit-line-clamp:1">${c.desc}</div></div>`;
  }).join('');
  openDr('难度闯关','按难度阶梯选题练习，由浅入深稳步提升',rows,'');
}
function quizDiff(diff){
  const ids=Object.keys(QS).filter(id=>(QS[id].diff||2)===diff);
  if(!ids.length){toast('该难度暂无题目');return;}
  // 打乱取最多60题
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  const pick=ids.slice(0,60);
  const nm={1:'★基础',2:'★★进阶',3:'★★★挑战'}[diff];
  QZ_TEMP={ids:pick,title:nm+'闯关',i:0,snap:{}};QZ={idx:-1,i:0,sel:[],checked:false,temp:true};
  closeDr();
  document.getElementById('quiz').classList.add('show');renderTempQ();
}
function quizIds(spec,mode){
  let ids=[];let title='专项练习';
  if(spec==='wrong'){ids=(window._WRONG_IDS||[]).slice();title='错题重做';}
  else if(spec==='fav'){ids=(FAV||[]).slice();title='收藏题练习';}
  else{const base=decodeURIComponent(spec);const map=byKp();ids=[...new Set((map[base]||{ids:[]}).ids)];title=base;}
  ids=ids.filter(id=>QS[id]);
  if(!ids.length){toast('暂无可练习的题目');return;}
  QZ_TEMP={ids,title,i:0,snap:{}};QZ={idx:-1,i:0,sel:[],checked:false,temp:true};
  document.getElementById('quiz').classList.add('show');renderTempQ();
}
function quizModule(i){
  const mods=window._MOD_STATS||[];if(!mods[i])return;const m=mods[i].m;const map=byKp();
  const ids=[];Object.keys(map).filter(b=>modOf(b)===m).forEach(b=>ids.push(...map[b].ids));
  const uniq=[...new Set(ids)].filter(id=>QS[id]);
  if(!uniq.length){toast('暂无可练习的题目');return;}
  QZ_TEMP={ids:uniq,title:m.name,i:0,snap:{}};QZ={idx:-1,i:0,sel:[],checked:false,temp:true};
  document.getElementById('quiz').classList.add('show');renderTempQ();
}
function renderTempQ(){
  const {ids,title}=QZ_TEMP;const qid=ids[QZ_TEMP.i];const q=QS[qid];const type=q.type||'单选';
  document.getElementById('qzNum').textContent=(QZ_TEMP.i+1)+'/'+ids.length;
  document.getElementById('qzProgBar').style.width=Math.round(QZ_TEMP.i/ids.length*100)+'%';
  document.getElementById('qzTitle').textContent=title+' · 第'+(QZ_TEMP.i+1)+'题';
  const body=document.getElementById('qzBody'),foot=document.getElementById('qzFoot');QZ.sel=[];
  const snap=(QZ_TEMP.snap&&QZ_TEMP.snap[QZ_TEMP.i])||null;
  const prevBtn=QZ_TEMP.i>0?`<button class="ghost prevbtn" onclick="prevTemp()">← 上一题</button>`:'';
  let opts='';
  if(type==='判断')opts=`<div class="opt" data-k="√"><span class="k">√</span><span class="txt">正确</span></div><div class="opt" data-k="×"><span class="k">×</span><span class="txt">错误</span></div>`;
  else if(type==='单选'||type==='多选')opts=parseOpts(q.opts).map(o=>`<div class="opt" data-k="${o.k}"><span class="k">${o.k}</span><span class="txt">${esc(o.t)}</span></div>`).join('');
  const isEssay=!(type==='单选'||type==='多选'||type==='判断');
  body.innerHTML=`<div class="qz-card"><div class="qz-tags"><span class="pill diff d${q.diff||2}">${({1:'★基础',2:'★★进阶',3:'★★★挑战'})[q.diff||2]}</span><span class="pill">${type}</span><span class="pill gray">${esc(q.yr||'')}</span>${favBtn(qid)}</div>
    <div class="qz-q">${esc(q.q)}</div>${qImgHtml(q)}${isEssay?'':`<div id="opts">${opts}</div>`}<div class="ana" id="ana"></div></div>`;
  if(isEssay){foot.innerHTML=`${prevBtn}<button class="ghost" onclick="closeQuiz()">退出</button><button class="ghost" onclick="tempShowAns()">👀 看答案</button><button class="primary" onclick="tempEssayDone()">✓ 我答好了</button>`;}
  else{body.querySelectorAll('.opt').forEach(el=>{el.onclick=()=>{const k=el.dataset.k;
      if(type==='多选'){const i=QZ.sel.indexOf(k);i>=0?QZ.sel.splice(i,1):QZ.sel.push(k);el.classList.toggle('sel');}
      else{QZ.sel=[k];document.querySelectorAll('#opts .opt').forEach(x=>x.classList.remove('sel'));el.classList.add('sel');}};
      if(snap&&snap.sel&&snap.sel.indexOf(el.dataset.k)>=0)el.classList.add('sel');});
    if(snap&&snap.sel){
      paintTempAnswer(q,type,qid,snap.sel,snap.ok);
      foot.innerHTML=`${prevBtn}<button class="mastered" onclick="setQStatus(${qid},2);toast('★ 已标记掌握')">★ 标记已掌握</button><button class="primary" onclick="nextTemp()">${QZ_TEMP.i+1>=ids.length?'完成 ✓':'下一题 →'}</button>`;
    }else{
      foot.innerHTML=`${prevBtn}<button class="ghost" onclick="closeQuiz()">退出</button><button class="primary" onclick="submitTemp(${qid},'${type}')">提交答案</button>`;
    }}
}
function paintTempAnswer(q,type,qid,mineSel,ok){
  const ans=String(q.ans||'').toUpperCase().replace(/[\s]/g,'');
  document.querySelectorAll('#opts .opt').forEach(el=>{const k=el.dataset.k;if(ans.indexOf(k)>=0)el.classList.add('right');else if(mineSel.indexOf(k)>=0)el.classList.add('wrong');});
  const ana=document.getElementById('ana');ana.innerHTML=`<div class="hd ${ok?'ok':'no'}">${ok?'✓ 回答正确':'✗ 回答错误'} · 正确答案：${esc(q.ans)}</div><div style="margin-top:6px">${esc(q.ana||'')}</div>`;ana.classList.add('show');
}
function qa(id){return esc((QS[id]||{}).ana||(QS[id]||{}).ans||'');}
function tempShowAns(){const qid=QZ_TEMP.ids[QZ_TEMP.i];const ana=document.getElementById('ana');ana.innerHTML='<div class="hd">参考答案</div>'+qa(qid);ana.classList.add('show');}
function submitTemp(qid,type){
  if(!QZ.sel.length){toast('请先选择答案');return;}
  const q=QS[qid];const mine=QZ.sel.slice().sort().join('');const ans=String(q.ans||'').toUpperCase().replace(/[\s]/g,'');const ok=mine===ans;
  prog.q[qid]=prog.q[qid]||{};prog.q[qid].a=mine;prog.q[qid].ok=ok;prog.q[qid].t=Date.now();
  if(!prog.q[qid].s||prog.q[qid].s===0)prog.q[qid].s=1;saveProg();
  QZ_TEMP.snap=QZ_TEMP.snap||{};QZ_TEMP.snap[QZ_TEMP.i]={sel:QZ.sel.slice(),ok:ok};
  paintTempAnswer(q,type,qid,QZ.sel.slice(),ok);
  document.getElementById('qzFoot').innerHTML=`${QZ_TEMP.i>0?`<button class="ghost prevbtn" onclick="prevTemp()">← 上一题</button>`:''}<button class="mastered" onclick="setQStatus(${qid},2);toast('★ 已标记掌握')">★ 标记已掌握</button><button class="primary" onclick="nextTemp()">${QZ_TEMP.i+1>=QZ_TEMP.ids.length?'完成 ✓':'下一题 →'}</button>`;
}
function tempEssayDone(){const qid=QZ_TEMP.ids[QZ_TEMP.i];if(!prog.q[qid]||prog.q[qid].s<1)setQStatus(qid,1);nextTemp();}
function nextTemp(){
  if(QZ_TEMP.i+1>=QZ_TEMP.ids.length){const total=QZ_TEMP.ids.length;
    document.getElementById('qzBody').innerHTML=`<div class="result"><div class="em">🎉</div><h2>专项练习完成</h2><p>共练习 ${total} 道题</p><div class="big">+${total}</div></div>`;
    document.getElementById('qzFoot').innerHTML='<button class="primary" onclick="closeQuiz()">完成，返回</button>';document.getElementById('qzProgBar').style.width='100%';return;}
  QZ_TEMP.i++;renderTempQ();document.getElementById('qzBody').scrollTop=0;
}
function prevTemp(){
  if(QZ_TEMP.i<=0)return;
  QZ_TEMP.i--;renderTempQ();document.getElementById('qzBody').scrollTop=0;
}

// ===== 考点速记 =====
const PTS_JZ=(window.POINTS_DATA||{chapters:[]}).chapters;
const PTS_LS=(window.HIST_POINTS_DATA||{chapters:[]}).chapters;
let PTS_SUB='jz';
function ptsChapters(){return PTS_SUB==='ls'?PTS_LS:PTS_JZ;}
const PTS_OPEN=new Set();
let PTS_CH=0,PTS_Q='';
const PTS_KEY='wb_points_master_v1';
function ptsGet(){try{return new Set(JSON.parse(localStorage.getItem(PTS_KEY)||'[]'));}catch(e){return new Set();}}
function ptsSave(s){localStorage.setItem(PTS_KEY,JSON.stringify([...s]));}
function ptsEscRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function ptsHl(h,q){
  if(!q)return h;
  return h.split(/(<[^>]*>)/).map(seg=>seg.charAt(0)==='<'?seg:seg.replace(new RegExp('('+ptsEscRe(q)+')','gi'),'<mark>$1</mark>')).join('');
}
function ptsAll(){const out=[];ptsChapters().forEach((c,ci)=>c.blocks.forEach(b=>{if(b.type==='point')out.push({b:b,ci:ci,c:c});}));return out;}
function ptsCard(o,showCh){
  const b=o.b,m=ptsGet(),q=PTS_Q;
  const where=showCh?'<span class="pt-where">'+esc(o.c.title)+'</span>':'';
  const lines=(b.lines||[]).map(l=>{
    const cls='pt-line l'+(l.lvl||0)+(l.t?' '+l.t:'');
    return '<div class="'+cls+'">'+ptsHl(l.h,q)+'</div>';
  }).join('');
  return '<div class="pt-card '+(m.has(b.id)?'mastered':'')+' '+(PTS_OPEN.has(b.id)?'open':'')+'" data-pid="'+b.id+'">'
    +'<div class="pt-head" onclick="ptsToggle(\''+b.id+'\')">'
      +'<div class="pt-no">'+(b.no||'·')+'</div>'
      +'<div class="pt-title">'+where+ptsHl(esc(b.title||''),q)+'<span class="pt-cnt">'+(b.lines||[]).length+'条</span></div>'
      +'<button class="pt-mask '+(m.has(b.id)?'on':'')+'" onclick="ptsMaster(\''+b.id+'\',event)" title="标记掌握">'+(m.has(b.id)?'✓':'○')+'</button>'
      +'<span class="pt-arrow">›</span>'
    +'</div>'
    +'<div class="pt-body">'+(lines||'<div class="pt-line">（本考点暂无详细内容）</div>')+'</div>'
  +'</div>';
}
function ptsToggle(id){
  if(PTS_OPEN.has(id))PTS_OPEN.delete(id);else PTS_OPEN.add(id);
  const el=document.querySelector('.pt-card[data-pid="'+id+'"]');
  if(el)el.classList.toggle('open');
}
function ptsMaster(id,ev){
  ev.stopPropagation();
  const s=ptsGet();
  if(s.has(id))s.delete(id);else s.add(id);
  ptsSave(s);renderPoints();
}
function setPtsSubject(sub){
  PTS_SUB=sub;PTS_CH=0;PTS_Q='';
  const inp=document.getElementById('ptsInput');if(inp)inp.value='';
  document.querySelectorAll('.pts-subjects .sb').forEach(x=>x.classList.toggle('on',x.dataset.s===sub));
  renderPoints();
}
function renderPoints(){
  const chips=document.getElementById('ptsChips');
  if(!chips)return;
  const chapters=ptsChapters();
  // 学科计数
  const cntJz=PTS_JZ.reduce((a,c)=>a+c.blocks.filter(b=>b.type==='point').length,0);
  const cntLs=PTS_LS.reduce((a,c)=>a+c.blocks.filter(b=>b.type==='point').length,0);
  const eJ=document.getElementById('sbJzCnt'),eL=document.getElementById('sbLsCnt');
  if(eJ)eJ.textContent=cntJz+'个考点';
  if(eL)eL.textContent=cntLs+'个考点';
  chips.innerHTML=chapters.map((c,i)=>'<div class="pts-chip '+(i===PTS_CH?'on':'')+'" onclick="PTS_CH='+i+';clearPointsSearch()">'+esc(c.title)+'</div>').join('');
  const list=document.getElementById('ptsList'),m=ptsGet(),all=ptsAll();
  const doneAll=all.filter(o=>m.has(o.b.id)).length;
  document.getElementById('ptsMastered').textContent=m.size;
  if(PTS_Q){
    document.getElementById('ptsSearchBox').classList.add('has');
    document.getElementById('ptsCurLabel').textContent='搜索「'+PTS_Q+'」';
    const q=PTS_Q.toLowerCase();
    const hit=all.filter(o=>((o.b.title||'')+' '+(o.b.lines||[]).map(l=>l.h.replace(/<[^>]*>/g,'')).join(' ')).toLowerCase().indexOf(q)>=0);
    document.getElementById('ptsCount').textContent=hit.length+' 个考点命中';
    list.innerHTML=hit.length?hit.map(o=>ptsCard(o,true)).join(''):'<div style="text-align:center;padding:50px 0;color:var(--muted);font-size:13px">没有找到相关考点，换个词试试</div>';
    return;
  }
  document.getElementById('ptsSearchBox').classList.remove('has');
  const c=chapters[PTS_CH];
  if(!c){list.innerHTML='';return;}
  document.getElementById('ptsCurLabel').textContent=(c.label||'')+' · '+c.title;
  const pts=c.blocks.filter(b=>b.type==='point');
  document.getElementById('ptsCount').innerHTML='共 <b>'+pts.length+'</b> 个考点 · 已掌握 '+pts.filter(b=>m.has(b.id)).length;
  list.innerHTML=c.blocks.map(b=>b.type==='section'?'<div class="pt-sec">'+esc(b.title)+'</div>':ptsCard({b:b,ci:PTS_CH,c:c},false)).join('');
}
function searchPoints(){PTS_Q=document.getElementById('ptsInput').value.trim();renderPoints();}
function clearPointsSearch(){PTS_Q='';const inp=document.getElementById('ptsInput');if(inp)inp.value='';renderPoints();}


// ===== 我的 =====
function renderMine(){
  const st=stats();
  const pct=st.total?Math.round(st.done/st.total*100):0;
  const answered=st.answered||0;
  const streak=ckStreak();
  const checks=getChecks();
  let tip;
  if(st.done===0)tip='从「今天」开始，第一道题就是胜利的第一步。';
  else if(pct<20)tip='已经起步啦！保持每天打卡，节奏比速度更重要。';
  else if(st.rate&&st.rate<60)tip='正确率偏低，先回考点速记补基础，再刷题更稳。';
  else if(pct<60)tip='状态不错！把错题本过一遍，提分就在细节里。';
  else if(pct<90)tip='冲刺阶段，高频考点优先，别在冷门题上耗时间。';
  else tip='接近尾声，查漏补缺，你离上岸只差最后这一程。';
  const wk=['日','一','二','三','四','五','六'];
  let week='';
  for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);
    week+='<div class="ms-wd '+(checks[ckKey(d)]?'on':'')+'"><i>'+(checks[ckKey(d)]?'✓':'')+'</i><span>'+wk[d.getDay()]+'</span></div>';}
  const C=2*Math.PI*40;
  const mfs=document.getElementById('mineFavSub');if(mfs)mfs.textContent=FAV.length?('已收藏 '+FAV.length+' 题'):'收藏的题目';
  const mws=document.getElementById('mineWrongSub');if(mws){const wn=(window._WRONG_IDS||[]).length;mws.textContent=wn?(wn+' 道待复习'):'答错的题目';}
  const box=document.getElementById('mineStats');
  if(!box)return;
  box.innerHTML=`
    <div class="ms-head">
      <div class="ms-ring"><svg viewBox="0 0 100 100">
        <circle class="ms-ring-bg" cx="50" cy="50" r="40"></circle>
        <circle class="ms-ring-fg" cx="50" cy="50" r="40" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-pct/100)).toFixed(1)}"></circle>
      </svg><div class="ms-ring-txt"><b>${pct}<small>%</small></b><span>总进度</span></div></div>
      <div class="ms-summary">
        <div class="ms-hi">${pct>=1?'💪 稳稳推进中':'🌱 新的开始'}</div>
        <div class="ms-tip">${tip}</div>
        <div class="ms-mini">
          <span onclick="go('analysis')">已作答 <b>${answered}</b> 题 ›</span>
          <span onclick="openCheckin()">连续签到 <b>${streak}</b> 天 ›</span>
        </div>
      </div>
    </div>
    <div class="ms-metrics">
      <div class="metric" onclick="drillDone()"><b>${st.done}<small>/${st.total}</small></b><span>已打卡题</span></div>
      <div class="metric" onclick="drillMastered()"><b>${st.mastered}</b><span>已掌握</span></div>
      <div class="metric" onclick="go('analysis')"><b>${st.rate||'--'}${st.rate?'%':''}</b><span>正确率</span></div>
    </div>
    <div class="ms-week">
      <div class="ms-week-h"><span>最近 7 天打卡</span><em onclick="openCheckin()">去签到 ›</em></div>
      <div class="ms-week-days">${week}</div>
    </div>`;
}

/* ==================== 全量同步码（免注册零成本） ==================== */
const SYNC_VER='KB1';
function syncBytesToB64(bytes){let bin='';const c=0x8000;for(let i=0;i<bytes.length;i+=c)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+c));return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function syncB64ToBytes(b64){let s=b64.replace(/-/g,'+').replace(/_/g,'/');s+='='.repeat((4-s.length%4)%4);const bin=atob(s);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a;}
function openSyncSheet(){const m=document.getElementById('syncSheet');if(m)m.classList.add('show');
  const st=document.getElementById('syncGenStat');if(st)st.innerHTML='当前设备已作答 <b>'+Object.keys(prog.q||{}).length+'</b> 题 · 生成后复制给另一台设备即可恢复。';}
function closeSyncSheet(){const m=document.getElementById('syncSheet');if(m)m.classList.remove('show');}
async function generateSyncCode(){
  const out=document.getElementById('syncCodeOut');const stat=document.getElementById('syncGenStat');
  try{
    // 全量数据：进度 + 已掌握知识点 + 主题
    let pts=[];try{pts=JSON.parse(localStorage.getItem(PTS_KEY)||'[]');}catch(e){}
    const payload={v:1,ts:Date.now(),q:prog.q||{},days:prog.days||{},learn:prog.learn||{},pts:pts,fav:FAV||[],theme:THEME};
    const src=new TextEncoder().encode(JSON.stringify(payload));
    let code;
    if(typeof CompressionStream!=='undefined'){
      const cs=new CompressionStream('gzip');const w=cs.writable.getWriter();w.write(src);w.close();
      const buf=await new Response(cs.readable).arrayBuffer();
      code=SYNC_VER+'.'+syncBytesToB64(new Uint8Array(buf));
    }else{
      code=SYNC_VER+'.R.'+syncBytesToB64(src);
    }
    if(out)out.value=code;
    // 复制
    try{await navigator.clipboard.writeText(code);}catch(e){if(out){out.select();document.execCommand('copy');}}
    if(stat)stat.innerHTML='✅ 已生成并复制，共 <b>'+code.length+'</b> 字符。粘贴到新设备的「恢复数据」框即可。';
    toast('同步码已复制');
  }catch(err){if(stat)stat.textContent='生成失败：'+err.message;toast('生成失败');}
}
async function applySyncCode(){
  const inp=document.getElementById('syncCodeIn');const stat=document.getElementById('syncImpStat');
  const code=(inp&&inp.value||'').trim();
  if(!code){toast('请先粘贴同步码');return;}
  try{
    if(!code.startsWith(SYNC_VER+'.'))throw new Error('不是有效的同步码');
    let body=code.slice(SYNC_VER.length+1),raw=false;
    if(body.startsWith('R.')){raw=true;body=body.slice(2);}
    const bytes=syncB64ToBytes(body);
    let json;
    if(raw){json=new TextDecoder().decode(bytes);}
    else{const ds=new DecompressionStream('gzip');const w=ds.writable.getWriter();w.write(bytes);w.close();const buf=await new Response(ds.readable).arrayBuffer();json=new TextDecoder().decode(buf);}
    const d=JSON.parse(json);
    if(!d||typeof d.q!=='object')throw new Error('同步码内容不完整');
    if(!confirm('恢复将覆盖本机当前进度与设置，确定继续？'))return;
    // 写入进度
    prog={q:d.q||{},days:d.days||{},learn:d.learn||{}};
    saveProg();
    if(Array.isArray(d.pts))localStorage.setItem(PTS_KEY,JSON.stringify(d.pts));
    if(Array.isArray(d.fav)){FAV=d.fav.filter(function(x){return QS[x];});saveFav(FAV);renderFavBadge();}
    if(d.theme){THEME=d.theme;saveTheme();applyTheme();}
    if(stat)stat.innerHTML='✅ 恢复成功：已导入 <b>'+Object.keys(prog.q).length+'</b> 题作答记录。';
    toast('数据恢复成功');
    renderThemePanel();
    setTimeout(()=>{go('today');},700);
  }catch(err){if(stat)stat.textContent='恢复失败：'+err.message;toast('恢复失败：'+err.message);}
}

function exportProgress(){
  const blob=new Blob([JSON.stringify(Object.assign({},prog,{fav:FAV}))],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='考编打卡进度_'+new Date().toISOString().slice(0,10)+'.json';a.click();
  toast('进度已导出');
}
function importProgress(e){
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{try{const d=JSON.parse(r.result);if(d.q&&d.days){prog=d;saveProg();if(Array.isArray(d.fav)){FAV=d.fav.filter(function(x){return QS[x];});saveFav(FAV);}toast('导入成功');go('today');}else toast('文件格式不对');}catch(err){toast('导入失败');}};
  r.readAsText(f);
}
function resetProgress(){
  if(confirm('确定清空全部打卡记录？此操作不可恢复。')){prog={q:{},days:{}};saveProg();FAV=[];saveFav(FAV);renderFavBadge();toast('已重置');go('today');}
}
function clean(s){return String(s==null?'':s).replace(/<\/?[a-zA-Z][^>]*>/g,'').replace(/&[a-z]+;/g,'');}
function esc(s){return clean(String(s==null?'':s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function qImgHtml(q,small){
  const src=(q&&q.img)||'';
  if(!src)return '';
  const cap=(q&&q.chart)?'图表题 · 请结合图示作答':'题图';
  return `<figure class="q-fig${small?' sm':''}"><img src="${src}" alt="${cap}" loading="lazy" onclick="qFigZoom(this.src)" onerror="this.parentNode.style.display='none'"><figcaption>${cap}　<span>点击放大</span></figcaption></figure>`;
}
function qFigZoom(src){
  let box=document.getElementById('qFigLight');
  if(!box){box=document.createElement('div');box.id='qFigLight';box.className='q-fig-light';box.onclick=()=>box.classList.remove('show');box.innerHTML='<img>';document.body.appendChild(box);}
  box.querySelector('img').src=src;box.classList.add('show');
}

// ===== 开屏欢迎页 =====
const SPLASH_QUOTES=[
  {t:'长风破浪会有时，直挂云帆济沧海。',a:'—— 李白《行路难》'},
  {t:'千磨万击还坚劲，任尔东西南北风。',a:'—— 郑燮《竹石》'},
  {t:'宝剑锋从磨砺出，梅花香自苦寒来。',a:'—— 《警世贤文》'},
  {t:'书山有路勤为径，学海无涯苦作舟。',a:'—— 韩愈'},
  {t:'会当凌绝顶，一览众山小。',a:'—— 杜甫《望岳》'},
  {t:'路漫漫其修远兮，吾将上下而求索。',a:'—— 屈原《离骚》'},
  {t:'不积跬步，无以至千里；不积小流，无以成江海。',a:'—— 荀子《劝学》'},
  {t:'锲而不舍，金石可镂。',a:'—— 荀子《劝学》'},
  {t:'业精于勤，荒于嬉；行成于思，毁于随。',a:'—— 韩愈《进学解》'},
  {t:'博观而约取，厚积而薄发。',a:'—— 苏轼《稼说送张琥》'},
  {t:'纸上得来终觉浅，绝知此事要躬行。',a:'—— 陆游《冬夜读书示子聿》'},
  {t:'天行健，君子以自强不息。',a:'—— 《周易》'},
  {t:'莫愁前路无知己，天下谁人不识君。',a:'—— 高适《别董大》'},
  {t:'沉舟侧畔千帆过，病树前头万木春。',a:'—— 刘禹锡《酬乐天扬州初逢席上见赠》'},
  {t:'只要功夫深，铁杵磨成针。',a:'—— 民间谚语'},
  {t:'星光不问赶路人，时光不负有心人。',a:'—— 励志名言'}
];
function initSplash(){
  // 早期轻量脚本已完成文案/日期/天气并显示；此处只负责倒计时与关闭
  const sp=document.getElementById('splash');if(!sp)return;
  if(window.__splashBound)return; window.__splashBound=true;
  let done=false;
  function closeSplash(){if(done)return;done=true;sp.classList.add('hide');setTimeout(()=>{sp.classList.remove('show','hide');},460);}
  window._closeSplash=closeSplash;
  sp.addEventListener('click',closeSplash);
  // 会话内已展示过则不启动倒计时（欢迎页未显示）
  if(window.__splashSkip)return;
  const skip=document.getElementById('spSkip');let left=5;
  const timer0=setInterval(()=>{left--;if(skip)skip.textContent='点击跳过 · '+Math.max(0,left)+'s';if(left<=0){clearInterval(timer0);closeSplash();}},1000);
}
initSplash();

// ===== 每日签到 + 我的页分段Tab =====
function ckKey(d){d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function getChecks(){if(!prog.checks)prog.checks={};return prog.checks;}
function ckStreak(){var c=getChecks(),n=0,d=new Date();if(!c[ckKey(d)])d.setDate(d.getDate()-1);while(c[ckKey(d)]){n++;d.setDate(d.getDate()-1);}return n;}
function openCheckin(){var m=document.getElementById('checkinSheet');if(!m)return;m.classList.add('show');renderCheckin();}
function closeCheckin(){var m=document.getElementById('checkinSheet');if(m)m.classList.remove('show');}
function renderCheckin(){
  var c=getChecks(),d=new Date(),today=ckKey(d),signed=!!c[today],streak=ckStreak();
  var total=Object.keys(c).length;
  var y=d.getFullYear(),mo=d.getMonth(),first=new Date(y,mo,1).getDay(),days=new Date(y,mo+1,0).getDate();
  var html='<div class="ci-hero">'
    +'<div><span class="ci-ic">🔥</span><div><div class="ci-num">'+streak+'<small>天</small></div><div class="ci-lbl">连续签到</div></div></div>'
    +'<div><span class="ci-ic">📅</span><div><div class="ci-num">'+total+'<small>天</small></div><div class="ci-lbl">累计签到</div></div></div>'
    +'</div>';
  html+=signed?'<button class="ci-btn done" disabled>✓ 今日已签到 · 明天见</button>':'<button class="ci-btn" onclick="doCheckin()">立即签到 · 连续 '+(streak+1)+' 天</button>';
  var wn=['日','一','二','三','四','五','六'];
  html+='<div class="ci-week">';
  for(var w=6;w>=0;w--){var dd=new Date();dd.setDate(dd.getDate()-w);var on=!!c[ckKey(dd)];
    html+='<div class="d'+(on?' on':'')+(w===0?' cur':'')+'"><i>'+(on?'✓':'')+'</i><span>'+wn[dd.getDay()]+'</span></div>';}
  html+='</div>';
  html+='<div class="ci-cal-title">'+y+'年'+(mo+1)+'月</div><div class="ci-cal">';
  wn.forEach(function(w){html+='<div class="ci-cal-w">'+w+'</div>';});
  for(var i=0;i<first;i++)html+='<div></div>';
  for(var k=1;k<=days;k++){var key=ckKey(new Date(y,mo,k));var cls='ci-cal-d'+(c[key]?' signed':'')+(k===d.getDate()?' cur':'');html+='<div class="'+cls+'">'+k+'</div>';}
  html+='</div><div class="ci-hint">每天点一下，坚持看得见 ✊</div>';
  var body=document.getElementById('checkinBody');if(body)body.innerHTML=html;
  // 顶部悬浮球角标
  var badge=document.getElementById('fabCheckBadge');if(badge)badge.style.display=signed?'flex':'none';
}
function doCheckin(){
  var c=getChecks(),today=ckKey();
  if(c[today]){toast('今天已经签到啦');return;}
  c[today]=1;saveProg();toast('签到成功！已连续'+ckStreak()+'天');renderCheckin();
}
function mineTab(t){
  var ov=document.getElementById('mine-overview'),st=document.getElementById('mine-settings');
  if(ov)ov.style.display=t==='overview'?'':'none';
  if(st)st.style.display=t==='settings'?'':'none';
  document.querySelectorAll('.mine-tab').forEach(function(x){x.classList.toggle('active',x.dataset.mt===t);});
}
// ===== 签到球：可拖动 + 记住位置 + 点击签到 =====
(function(){
  var fab=document.getElementById('fabCheck');if(!fab)return;
  var KEY='wb_fab_pos_v1',pos=null;
  try{pos=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
  function clamp(v,max){return Math.max(4,Math.min(v,max-50));}
  function place(){
    var w=window.innerWidth,h=window.innerHeight;
    if(pos&&typeof pos.x==='number'&&typeof pos.y==='number'){
      fab.style.left=clamp(pos.x,w)+'px';fab.style.top=clamp(pos.y,h)+'px';
    }else{
      fab.style.left=clamp(w-62,w)+'px';
      fab.style.top=clamp(h-132,h)+'px';
    }
    fab.style.right='auto';fab.style.bottom='auto';
  }
  place();
  var dragging=false,moved=false,sx=0,sy=0,ox=0,oy=0,suppress=false;
  fab.addEventListener('pointerdown',function(e){
    if(e.button!==undefined&&e.button!==0)return;
    dragging=true;moved=false;sx=e.clientX;sy=e.clientY;
    var r=fab.getBoundingClientRect();ox=r.left;oy=r.top;
    try{fab.setPointerCapture(e.pointerId);}catch(err){}
    fab.classList.add('dragging');fab.style.transition='none';
  });
  fab.addEventListener('pointermove',function(e){
    if(!dragging)return;
    var dx=e.clientX-sx,dy=e.clientY-sy;
    if(!moved&&(Math.abs(dx)>6||Math.abs(dy)>6))moved=true;
    if(!moved)return;
    fab.style.left=clamp(ox+dx,window.innerWidth)+'px';
    fab.style.top=clamp(oy+dy,window.innerHeight)+'px';
  });
  function end(e){
    if(!dragging)return;dragging=false;
    fab.classList.remove('dragging');fab.style.transition='';
    if(moved){
      pos={x:parseFloat(fab.style.left),y:parseFloat(fab.style.top)};
      try{localStorage.setItem(KEY,JSON.stringify(pos));}catch(err){}
      suppress=true;setTimeout(function(){suppress=false;},80);
    }
  }
  fab.addEventListener('pointerup',end);
  fab.addEventListener('pointercancel',end);
  fab.addEventListener('click',function(){if(suppress)return;openCheckin();});
  window.addEventListener('resize',place);
})();

// 首屏渲染
refreshDerived();
// 支持 ?p= 指定初始页（跨页底栏「我的/分析/考点」精准定位）
try{
  var _pp=new URLSearchParams(location.search).get('p');
  if(_pp&&['today','points','plan','analysis','mine','video'].indexOf(_pp)>=0){go(_pp);}else{renderToday();}
}catch(e){renderToday();}

// ===== 自动更新：拉取最新计划数据 =====
fetch('plan-data.json?t='+Date.now(),{cache:'no-store'})
 .then(r=>r.ok?r.json():null)
 .then(remote=>{
   if(remote&&remote.version!==DATA.version&&remote.questions){
     DATA=remote;
     refreshDerived();
     renderToday();
     if(document.getElementById('page-plan').classList.contains('active'))renderPlan();
     if(document.getElementById('page-mine').classList.contains('active'))renderMine();
     if(document.getElementById('page-analysis').classList.contains('active'))renderAnalysis();
   }
 }).catch(()=>{});

// SW 注册（网络优先，自动更新）
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js'+location.search).catch(()=>{});
}


/* ==================== 主题系统（重构） ==================== */
const THEMES={
  ocean:{name:'深海蓝',c:'#1e40af'},
  jade:{name:'翡翠绿',c:'#047857'},
  violet:{name:'鸢尾紫',c:'#6d28d9'},
  rose:{name:'胭脂红',c:'#be123c'},
  amber:{name:'琥珀橙',c:'#b45309'},
  ink:{name:'石墨黑',c:'#1f2937'},
  teal:{name:'青碧',c:'#0f766e'},
  indigo:{name:'靛蓝',c:'#4338ca'}
};
const THEME_STORE='wb_theme_v1';
let THEME={key:'ocean',color:'#1e40af',dark:false};
function hex2rgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function mix(hex,withHex,t){const a=hex2rgb(hex),b=hex2rgb(withHex);
  return '#'+a.map((v,i)=>Math.round(v+(b[i]-v)*t).toString(16).padStart(2,'0')).join('');}
function applyTheme(){
  const c=THEME.color;
  const r=document.documentElement;
  r.style.setProperty('--brand',c);
  r.style.setProperty('--brand-deep',mix(c,'#000000',.22));
  const softLevel=(typeof THEME.soft==='number')?THEME.soft:.85;
  r.style.setProperty('--brand-soft',THEME.dark?mix(c,'#161e2e',.80):mix(c,'#ffffff',softLevel));
  r.style.setProperty('--brand-line',THEME.dark?mix(c,'#161e2e',.58):mix(c,'#ffffff',Math.min(.9,softLevel+.12)));
  if(THEME.dark) r.setAttribute('data-theme','dark'); else r.removeAttribute('data-theme');
  // 刷新依赖主题颜色的图表
  try{ if(document.getElementById('page-analysis').classList.contains('active')) renderAnalysis(); }catch(e){}
  // 主题切换的柔和过渡（仅作用于页面内容，不影响悬浮球/弹层）
  try{
    var ap=document.querySelector('.page.active');
    if(ap){ap.classList.remove('theme-swap');void ap.offsetWidth;ap.classList.add('theme-swap');
      setTimeout(function(){ap.classList.remove('theme-swap');},420);}
  }catch(e){}
}
function saveTheme(){localStorage.setItem(THEME_STORE,JSON.stringify(THEME));}
function loadTheme(){
  try{const t=JSON.parse(localStorage.getItem(THEME_STORE));if(t)THEME={...THEME,...t};}catch(e){}
}
function setTheme(key){
  THEME.key=key;THEME.color=THEMES[key].c;
  saveTheme();applyTheme();renderThemePanel();
  toast('已切换：'+THEMES[key].name);
}
function onCustomColor(v){
  THEME.key='custom';THEME.color=v;saveTheme();applyTheme();renderThemePanel();
}
function resetTheme(){setTheme('ocean');}
function toggleDark(){
  THEME.dark=!THEME.dark;saveTheme();applyTheme();renderThemePanel();
  toast(THEME.dark?'已开启深色模式':'已切回浅色模式');
}
function renderThemePanel(){
  const grid=document.getElementById('themeGrid');
  if(grid)grid.innerHTML=Object.keys(THEMES).map(k=>
    `<div class="theme-dot ${THEME.key===k?'on':''}" style="background:${THEMES[k].c}" title="${THEMES[k].name}" onclick="setTheme('${k}')">${THEME.key===k?'<span>✓</span>':''}</div>`).join('');
  const grid2=document.getElementById('themeGrid2');
  if(grid2)grid2.innerHTML=Object.keys(THEMES).map(k=>
    `<div class="theme-dot ${THEME.key===k?'on':''}" style="background:${THEMES[k].c}" title="${THEMES[k].name}" onclick="setTheme('${k}')">${THEME.key===k?'<span>✓</span>':''}</div>`).join('');
  const nm=document.getElementById('themeName');if(nm)nm.textContent=THEMES[THEME.key]?THEMES[THEME.key].name:'自定义';
  const nm2=document.getElementById('themeName2');if(nm2)nm2.textContent=THEMES[THEME.key]?THEMES[THEME.key].name:'自定义';
  const cc=document.getElementById('customColor');if(cc)cc.value=THEME.color;
  const cc2=document.getElementById('customColor2');if(cc2)cc2.value=THEME.color;
  const ds=document.getElementById('darkSwitch');if(ds)ds.classList.toggle('on',THEME.dark);
  const ds2=document.getElementById('darkSwitch2');if(ds2)ds2.classList.toggle('on',THEME.dark);
  document.querySelectorAll('.soft-opt').forEach(el=>el.classList.toggle('on',Number(el.dataset.v)===(typeof THEME.soft==='number'?THEME.soft:.85)));
}
function setSoft(v){THEME.soft=Number(v);saveTheme();applyTheme();renderThemePanel();}
function openThemeSheet(){const m=document.getElementById('themeSheet');if(m){m.classList.add('show');renderThemePanel();}}
function closeThemeSheet(){const m=document.getElementById('themeSheet');if(m)m.classList.remove('show');}
loadTheme();applyTheme();

/* ==================== 分析页重写 ==================== */
function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
function levelColor(l){const c=['#e9eef6','#d64550','#e8a90b','#0e9f6e'];
  if(l===0&&THEME.dark)return '#33425c';return c[l];}
function anaTab(t){
  document.querySelectorAll('#anaTabs .ana-tab').forEach(function(x){x.classList.toggle('active',x.dataset.atab===t);});
  document.querySelectorAll('#page-analysis .ana-pane').forEach(function(p){p.style.display=(p.dataset.pane===t?'':'none');});
  if(t==='mastery'&&window._ANA_MAP)setTimeout(function(){renderRadar(window._ANA_MAP);},30);
  try{window.scrollTo(0,0);}catch(e){}
}
function renderAnalysis(){
  const st=stats();
  const scoreEl=document.getElementById('anaScore');
  if(scoreEl)scoreEl.innerHTML=(st.answered?st.rate:'—')+'<small>%</small>';
  const ring=document.getElementById('anaRing');
  if(ring){const C=2*Math.PI*22;ring.setAttribute('stroke-dasharray',C);
    ring.setAttribute('stroke-dashoffset',C*(1-(st.answered?st.rate:0)/100));}
  const sub=document.getElementById('anaHeroSub');
  if(sub)sub.textContent=st.answered?`已作答 ${st.answered} 题 · 答对 ${Math.round(st.answered*st.rate/100)} 题 · 继续保持`:'开始答题后，这里会给你一张完整的学情画像';

  const map=byKp();const kps=Object.values(map);
  const weak=kps.filter(o=>o.st.answered>=2&&o.st.rate<60).length;
  const learnedKp=kps.filter(o=>o.st.done>0).length;
  const masteredQ=st.mastered;
  document.getElementById('anaKpi').innerHTML=`
    <div class="kpi"><div class="kl">累计作答</div><div class="kv">${st.answered}<small> 题</small></div><div class="ks">已打卡 ${st.done}/${st.total}</div></div>
    <div class="kpi g"><div class="kl">总正确率</div><div class="kv">${st.answered?st.rate:'—'}<small>${st.answered?'%':''}</small></div><div class="ks">答对 ${Math.round(st.answered*st.rate/100)} 题</div></div>
    <div class="kpi w"><div class="kl">已掌握知识点</div><div class="kv">${learnedKp}<small> / ${kps.length}</small></div><div class="ks">至少做过 1 题</div></div>
    <div class="kpi r"><div class="kl">薄弱知识点</div><div class="kv">${weak}<small> 个</small></div><div class="ks">正确率低于 60%</div></div>`;
  window._ANA_MAP=map;window._ANA_KPS=kps;
  renderRadar(map);renderKpHeat(kps);renderTrend();renderTypeBars();renderWeak(kps);renderHeatCal();renderWrongTop();
}

function renderRadar(map){
  const cv=document.getElementById('radar');if(!cv)return;
  const ctx=cv.getContext('2d');
  const dpr=window.devicePixelRatio||1;
  const W=400,H=340;
  cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';
  ctx.scale(dpr,dpr);
  const cx=W/2,cy=H/2+4,R=104,n=MODULES.length;
  const brand=cssVar('--brand')||'#1652d4';
  const ink=cssVar('--ink-2')||'#3c4a63';
  const gridC=cssVar('--line')||'#e6ecf5';
  const SHORT={'教育学基础':'教育学','心理学与教育心理学':'心理·教心','法律法规与师德':'法规师德','中国古代史':'古代史','近现代与世界史':'近现代史'};
  ctx.clearRect(0,0,W,H);
  const mods=MODULES.map(m=>{
    const ids=[];Object.values(map).forEach(o=>{if(modOf(o.base)===m)ids.push(...o.ids);});
    return {m,st:agg([...new Set(ids)])};
  });
  const ang=i=>-Math.PI/2+i*2*Math.PI/n;
  const pt=(i,r)=>[cx+r*Math.cos(ang(i)),cy+r*Math.sin(ang(i))];
  // 网格（淡填充 + 边）
  for(let g=1;g<=4;g++){
    const r=R*g/4;ctx.beginPath();
    for(let i=0;i<n;i++){const[x,y]=pt(i,r);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    ctx.closePath();ctx.fillStyle=g%2===0?'rgba(127,140,170,.035)':'transparent';ctx.fill();
    ctx.strokeStyle=g===4?gridC:'rgba(127,140,170,.18)';ctx.lineWidth=1;ctx.stroke();
    // 刻度数字
    ctx.font='10px "PingFang SC",sans-serif';ctx.fillStyle=cssVar('--muted')||'#9aa6b8';
    ctx.textAlign='left';ctx.textBaseline='bottom';ctx.fillText((g*25)+'',cx+4,cy-r+3);
  }
  for(let i=0;i<n;i++){const[x,y]=pt(i,R);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);
    ctx.strokeStyle='rgba(127,140,170,.18)';ctx.stroke();}
  // 数据面
  ctx.beginPath();mods.forEach((o,i)=>{const r=R*Math.max(2,o.st.rate)/100;const[x,y]=pt(i,r);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
  ctx.closePath();
  ctx.fillStyle=brand+'2E';ctx.fill();ctx.strokeStyle=brand;ctx.lineWidth=2.2;ctx.lineJoin='round';ctx.stroke();
  // 数据点与数值
  mods.forEach((o,i)=>{const r=R*Math.max(2,o.st.rate)/100;const[x,y]=pt(i,r);
    ctx.beginPath();ctx.arc(x,y,4,0,7);ctx.fillStyle=brand;ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
    if(o.st.answered){ctx.font='700 11px "PingFang SC",sans-serif';ctx.fillStyle=brand;
      ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(o.st.rate+'%',x,y-8);}
  });
  // 标签
  ctx.font='600 11.5px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillStyle=ink;
  mods.forEach((o,i)=>{const[x,y]=pt(i,R+15);
    ctx.textAlign=Math.abs(x-cx)<10?'center':(x>cx?'left':'right');ctx.textBaseline='middle';
    ctx.fillText(SHORT[o.m.name]||o.m.name,x,y);});
  document.getElementById('radarLegend').innerHTML=mods.map((o,i)=>
    `<div class="rl-row" onclick="drillModule(${i})"><span class="rl-dot" style="background:${o.m.color}"></span>
      <span class="rl-name">${SHORT[o.m.name]||o.m.name}</span>
      <span class="rl-val">${o.st.answered?o.st.rate+'%':'—'}</span>
      <span class="rl-cnt">${o.st.answered}/${o.st.total}</span></div>`).join('');
  window._MOD_STATS=mods;
}

function renderKpHeat(kps){
  const sorted=kps.slice().sort((a,b)=>{
    const la=levelOf(a.st),lb=levelOf(b.st);if(la!==lb)return la-lb;return a.st.rate-b.st.rate;});
  document.getElementById('kpHeat').innerHTML=sorted.map(o=>{
    const l=levelOf(o.st);const c=levelColor(l);
    const pct=o.st.answered?o.st.rate:0;
    return `<div class="kp-cell" style="border-left:3px solid ${c}" onclick="drillKp('${encodeURIComponent(o.base)}')">
      <div class="kc-n">${esc(o.base)}</div>
      <div class="kc-m" style="color:${o.st.answered?c:'var(--muted)'}">${o.st.answered?o.st.rate+'%':'未学'}</div>
      <div class="kc-s">${o.st.done}/${o.st.total}题 · ${levelName(l)}</div>
      <div class="kc-bar"><i style="width:${pct}%;background:${c}"></i></div></div>`;}).join('');
}

// 主题初始化后补渲染（首屏可能还未渲染这些页）
try{ renderThemePanel(); }catch(e){}


/* ==================== 联网更新入口（供 updater.js 调用） ==================== */
window.__wbToast = function(m){ try{ toast(m); }catch(e){} };
// 更新主刷题题库：DATA 是本文件内的 let，可在此作用域内重新赋值并重算派生数据
window.__applyMainData = function(json){
  if(!json || !json.weeks || !json.questions) return false;
  DATA = json;
  window.__QUIZ_DATA__ = json;   // 保持全局引用一致，避免其他脚本读到旧数据
  refreshDerived();
  try{ renderToday(); }catch(e){}
  try{ var act=document.querySelector('.page.active'); var id=act&&act.id;
    if(id==='page-plan')renderPlan();
    else if(id==='page-mine')renderMine();
    else if(id==='page-analysis')renderAnalysis();
  }catch(e){}
  return true;
};

window.__getMainVersion=function(){return DATA&&DATA.version;};
