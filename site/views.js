// ---------- redesign views (override app.js renderers) ----------
const ARCH={"11":"Magician","12":"Finisher","13":"Target","10":"Spark","9":"Creator"};
const PPOS={0:"KL",3:"SĞB",4:"STP",5:"STP",6:"STP",7:"SLB",10:"DOS",12:"SĞO",13:"MO",14:"MO",15:"MO",16:"SLO",18:"OOS",21:"SF",23:"SĞK",24:"SF",25:"SF",26:"SF",27:"SLK"};
const GRP={forward:"fw",midfielder:"mf",defender:"df",goalkeeper:"gk"};
const archName=a=>ARCH[a]||(a?"Arketip "+a:"–");
const mem=n=>D.club.members.find(x=>x.name==n)||{};
const posBadge=n=>{const m=mem(n);const p=PPOS[m.proPos]||({forward:"FV",midfielder:"OS",defender:"DF",goalkeeper:"KL"})[m.favoritePosition]||"?";
 const g=GRP[m.favoritePosition]||"fw";return `<span class="pb ${g}">${p}</span>`};
const rc=v=>v==null?"":v>=8?"r8":v>=7?"r7":v>=6?"r6":"r5";
const mainArch=n=>{const c={};D.matches.forEach(m=>m.us.forEach(p=>{if(p.name==n&&p.arch)c[p.arch]=(c[p.arch]||0)+1}));return Object.entries(c).sort((a,b)=>b[1]-a[1])};
const M90={
 fw:[["Gol",p=>p.goals],["İsabetli şut",p=>p.ev.shotsOnTarget],["Şut",p=>p.shots],["Asist",p=>p.assists],["2. asist",p=>p.ev.secondAssists],["Dribbling",p=>p.ev.dribblesCompleted],["Hava topu",p=>p.ev.aerialDuelsWonAttacking+p.ev.aerialDuelsWonDefending],["Top kaybı",LOST,-1]],
 mf:[["Pas isabeti %",null,1,"pct"],["Ara pas",p=>p.ev.throughPasses],["2. asist",p=>p.ev.secondAssists],["Asist",p=>p.assists],["Interception",p=>p.ev.interceptions],["Top kazanma",WON],["Dribbling",p=>p.ev.dribblesCompleted],["Top kaybı",LOST,-1]],
 df:[["Interception",p=>p.ev.interceptions],["Tackle",p=>p.ev.tacklesWon],["Top kazanma",WON],["Hava topu",p=>p.ev.aerialDuelsWonAttacking+p.ev.aerialDuelsWonDefending],["Pas isabeti %",null,1,"pct"],["Top kaybı",LOST,-1],["Pozisyon dışı",p=>p.ev.outOfPosition,-1]],
 gk:[["Kurtarış",p=>p.saves],["Pas isabeti %",null,1,"pct"]]};
function metricVal(list,f,kind){if(!list.length)return null;if(kind=="pct"){let a=0,b=0;list.forEach(p=>{a+=p.ev.passesCompleted;b+=p.ev.passesCompleted+p.ev.passesFailed});return b?a/b*100:null}
 return list.reduce((s,p)=>s+(f(p)||0),0)/list.length}
function archData(n){const ar=mainArch(n);if(!ar.length)return null;const a=ar[0][0];
 const mine=[],bench=[];let pos=null;
 D.matches.forEach(m=>[...m.us,...m.them].forEach(p=>{if(p.arch!=a)return;if(p.name==n&&m.us.includes(p)){mine.push(p);pos=pos||p.pos}else bench.push(p)}));
 const g=GRP[pos]||"fw";const sameZone=bench.filter(p=>p.pos==pos);const B=sameZone.length>=5?sameZone:bench;
 const R=M90[g].map(([l,f,dir=1,kind])=>{const me=metricVal(mine,f,kind),av=metricVal(B,f,kind);if(me==null||av==null)return null;
  return {l,me,av,dir,diff:av?((me-av)/av)*100*dir:0}}).filter(Boolean);
 return {a,ar,mine,B,sameZone,pos,R}}
function archBlock(n){const X=archData(n);if(!X)return "";const {a,ar,mine,B,sameZone,pos}=X;
 const rows=X.R.map(({l,me,av,dir,diff})=>{const cls=Math.abs(diff)<8?"eq":diff>0?"up":"dn";const mx=Math.max(me,av,1e-9);
  return `<div class="ab"><div class="abl">${l}${dir==-1?' <small>(az iyi)</small>':""}</div>
  <div class="abb"><div class="abr me" style="width:${me/mx*100}%"></div><div class="abr av" style="width:${av/mx*100}%"></div></div>
  <div class="abv"><b>${fmt(me)}</b><small>ort. ${fmt(av)}</small></div><div class="abd ${cls}">${cls=="eq"?"≈":(diff>0?"+":"")+fmt(diff,0)+"%"}</div></div>`}).join("");
 const other=ar.slice(1).map(([x,c])=>`${archName(x)} ${c} maç`).join(", ");
 return `<div class="card"><div class="ch"><h3>Arketipine göre</h3><span class="chip">${archName(a)} · ${posTr[pos]||pos}</span></div>
 <p class="muted sm">${n}, ${archName(a)} arketipiyle ${mine.length} maç oynadı${other?` (ayrıca ${other})`:""}. Kıyas: kayıtlı maçlarda aynı arketiple ${B===sameZone?"aynı bölgede ":""}oynayan ${B.length} oyuncu-maç (rakipler dahil). Hepsi maç başı.</p>
 <div class="leg"><span><i class="me"></i>${n}</span><span><i class="av"></i>${archName(a)} ortalaması</span></div>${rows}
 ${B.length<15?'<p class="muted sm">Kıyas örneği az, maç biriktikçe netleşecek.</p>':""}</div>`}

const SIMPLE=()=>THEME=="clean"||THEME=="board";
function fold(t,html,cls=""){return SIMPLE()?`<details class="card fold ${cls}"><summary>${t}</summary>${html}</details>`:html}
function highlights(n){const X=archData(n);if(!X||!X.R.length)return "";const R=[...X.R].sort((a,b)=>b.diff-a.diff);const an=archName(X.a);
 const good=R.filter(x=>x.diff>=8).slice(0,2),bad=R.filter(x=>x.diff<=-8).slice(-2).reverse();
 const li=(x,c)=>`<li class="${c}"><b>${x.l}</b><span>${x.dir==-1?(c=="up"?"daha az":"daha fazla"):(c=="up"?"daha fazla":"daha az")} · ${fmt(x.me)} (${an}'lar ${fmt(x.av)})</span><em>${x.diff>0?"+":""}${fmt(x.diff,0)}%</em></li>`;
 return `<div class="card hl"><h3>${an} olarak öne çıkanlar</h3><ul>${good.map(x=>li(x,"up")).join("")||'<li class="eq"><b>Belirgin üstünlük yok</b></li>'}${bad.map(x=>li(x,"dn")).join("")}</ul></div>`}
function head(){const o=D.club.overall,ms=[...D.matches].sort((a,b)=>b.ts-a.ts);
 const w=+o.wins,dr=+o.ties,l=+o.losses,gp=+o.gamesPlayed||1;let st=0,sr=ms[0]?res(ms[0]):"";for(const m of ms){if(res(m)==sr)st++;else break}
 const fN=S.formN||10;const form=ms.slice(0,fN);
 const tabs=[["club","Genel"],["matches","Maçlar"],["night","Gece raporu"],["players","Oyuncular"],["cmp","Karşılaştır"],["fun","Eğlence"]];
 return `<div class="top"><div class="wrap tb"><div class="logo">Clubs <b>Pulse</b></div><div class="thm">${[["forest","Koyu"],["light","Açık"]].map(([k,l])=>`<button class="mb mb-${k} ${MODE3==k?"on":""}" onclick="setMode3('${k}')"><i></i>${l}</button>`).join("")}</div></div></div>
 <div class="wrap"><div class="card hero"><img class="crest" src="crest.png"><div class="hi"><h1>${D.club.name}</h1>
 <div class="chips"><span class="chip div">${o.bestDivision}. küme</span><span class="chip">SR ${o.skillRating}</span><span class="wdl"><b class="cW">${w}G</b> <b class="cD">${dr}B</b> <b class="cL">${l}M</b></span></div></div>
 <div class="tiles"><div class="tile"><b class="${w/gp>=.5?"cW":"cL"}">%${fmt(w/gp*100,0)}</b><span>Galibiyet</span></div><div class="tile"><b class="${o.goals-o.goalsAgainst>=0?"cW":"cL"}">${o.goals-o.goalsAgainst>0?"+":""}${o.goals-o.goalsAgainst}</b><span>Averaj</span></div>
 <div class="tile"><b>${fmt(o.goals/gp,2)}</b><span>Maç başı gol</span></div><div class="tile"><b class="c${sr}">${st}${resTr[sr]||""}</b><span>Seri</span></div></div>
 <div class="form"><div class="fn">${[5,10,20].map(k=>`<button class="${fN==k?"on":""}" onclick="S.formN=${k};r()">${k}</button>`).join("")}</div>${form.map(m=>`<span class="fp b${res(m)}" title="${m.opp.name} ${m.gf}-${m.ga}">${resTr[res(m)]}</span>`).join("")}</div></div>
 <nav class="tabs">${tabs.map(([k,l])=>`<button class="${S.tab==k?"on":""}" onclick="S.tab='${k}';S.player=null;S.match=null;r()">${l}</button>`).join("")}</nav>`}

function seg(arr,cur,key){return `<div class="seg">${arr.map(([v,l])=>`<button class="${cur==v?"on":""}" onclick="S.${key}='${v}';r()">${l}</button>`).join("")}</div>`}
function filters(withMode=true){const ty=[["all","Tümü ("+D.matches.length+")"],...["Lig","Playoff","Hazırlık"].filter(t=>D.matches.some(m=>m.type==t)).map(t=>[t,`${t} (${D.matches.filter(m=>m.type==t).length})`])];
 return `<div class="fbar">${seg(ty,S.type,"type")}${withMode?seg([["avg","Maç başı"],["tot","Toplam"]],S.mode,"mode"):""}</div>`}
function ring(v,l){const c=2*Math.PI*30,col=v>=65?"var(--good)":v>=45?"var(--mid)":"var(--bad)";
 return `<div class="ring"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" class="rt"/><circle cx="36" cy="36" r="30" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c*v/100} ${c}" transform="rotate(-90 36 36)"/><text x="36" y="41" text-anchor="middle">${v}</text></svg><span>${l}</span></div>`}
function scoresBlock(ms){const t=teamScores(ms);if(!t)return "";return `<div class="rings">${ring(t.att,"Saldırı")}${ring(t.def,"Savunma")}${ring(t.sec,"Top güvenliği")}</div><p class="muted sm c">100 üzerinden · saldırı: gol + isabetli şut · savunma: yenen gol + top kazanma · top güvenliği: pas isabeti + top kaybı</p>`}
function scorers(m){const g=m.us.filter(p=>p.goals).map(p=>p.name+(p.goals>1?" ×"+p.goals:""));return g.length?g.join(", "):""}
function mcard(m){const R=res(m),open=S.match==m.id;
 return `<div class="card mc ${open?"open":""}" id="m${m.id}"><div class="mh"><span class="muted sm">${dt(m.ts)}</span><span class="tag">${m.type}</span>${m.dnf?'<span class="tag">yarıda kaldı</span>':""}<span class="rb b${R}">${{W:"GALİBİYET",D:"BERABERE",L:"MAĞLUBİYET"}[R]}</span></div>
 <div class="mm"><div class="tm"><img src="crest.png"><div><b>${D.club.name}</b><small>${m.us.length} oyuncu</small></div></div><div class="sc"><span class="${R=="W"?"cW":R=="L"?"cL":""}">${m.gf}</span><i>-</i><span>${m.ga}</span></div>
 <div class="tm r"><div><b>${m.opp.name}</b><small>${m.them.length} oyuncu</small></div>${crestImg(m.opp.crest)}</div></div>
 ${scorers(m)?`<div class="gs muted sm">Gol: ${scorers(m)}</div>`:""}
 <button class="more" onclick="S.match=${open?"null":`'${m.id}'`};r()">${open?"Detayı gizle ▲":"Maç detayı ▼"}</button>${open?matchDetail(m):""}</div>`}
function mrow(m){return mcard(m)}
function cbar(l,a,b,pct){const t=a+b||1;return `<div class="cb"><b>${fmt(a,pct?0:1)}${pct?"%":""}</b><div class="cbt"><i class="cu" style="width:${a/t*100}%"></i><i class="ct" style="width:${b/t*100}%"></i></div><b>${fmt(b,pct?0:1)}${pct?"%":""}</b><span>${l}</span></div>`}
function matchDetail(m){const T=(l,f)=>l.reduce((s,p)=>s+(f(p)||0),0);const pc=l=>{const a=T(l,p=>p.ev.passesCompleted),b=a+T(l,p=>p.ev.passesFailed);return b?a/b*100:0};
 const both=m.them.length>0;
 const rows=[["Şut",p=>p.shots],["İsabetli şut",p=>p.ev.shotsOnTarget],["Başarılı pas",p=>p.ev.passesCompleted],["Interception",p=>p.ev.interceptions],["Tackle",p=>p.ev.tacklesWon],["Top kazanma",WON],["Top kaybı",LOST]];
 return `<div class="md"><div class="md2"><div><h4>Takım karşılaştırması</h4>${both?cbar("Pas isabeti",pc(m.us),pc(m.them),1)+rows.map(([l,f])=>cbar(l,T(m.us,f),T(m.them,f))).join(""):'<p class="muted sm">Rakip oyuncu verisi yok.</p>'}<p class="muted sm">Sadece gerçek oyuncular (botlar EA'da yok).</p></div>
 <div><h4>Takım puanları</h4>${scoresBlock([m])}</div></div>
 ${fold("Oyuncu oyuncu istatistikler",`<h4>${D.club.name}</h4>${ptable(m.us)}${both?`<h4>${m.opp.name}</h4>${ptable(m.them)}`:""}`,"inner")}
 <button class="btn" onclick="shareMatch('${m.id}')">WhatsApp görseli</button></div>`}
function ptable(list){return `<div class="scroll"><table class="tbl"><tr><th>Oyuncu</th><th>Puan</th><th>G</th><th>A</th><th>2A</th><th>Şut</th><th>Pas</th><th>Int</th><th>Tackle</th><th>Kayıp</th><th>Kazanma</th></tr>
 ${[...list].sort((a,b)=>b.rating-a.rating).map(p=>{const e=p.ev;return `<tr><td><b>${p.name}</b>${p.mom?' <span class="tag">MOTM</span>':""}<small class="muted"> ${archName(p.arch)}</small></td><td><span class="rt ${rc(p.rating)}">${p.rating.toFixed(1)}</span></td><td>${p.goals}</td><td>${p.assists}</td><td>${e.secondAssists}</td><td>${e.shotsOnTarget}/${p.shots}</td><td>${e.passesCompleted}/${e.passesCompleted+e.passesFailed}</td><td>${e.interceptions}</td><td>${e.tacklesWon}/${e.tacklesWon+e.tacklesLost}</td><td>${LOST(p)}</td><td>${WON(p)}</td></tr>`}).join("")}</table></div>`}
function matchesTab(){const ms=matches().sort((a,b)=>b.ts-a.ts);return filters(false)+`<div class="g2">${ms.map(mcard).join("")}</div>`}

function pcard(a){const m=mem(a.name);const rows=[...a.rows].slice(-10);const mx=Math.max(...rows.map(r=>r.p.goals),1);const w=a.rows.filter(r=>res(r.m)=="W").length;
 const sh=a.rows.reduce((s,r)=>s+r.p.shots,0),so=a.rows.reduce((s,r)=>s+r.p.ev.shotsOnTarget,0);
 const n3=(v,l,c="")=>`<div><b class="${c}">${v}</b><span>${l}</span></div>`;
 return `<div class="card pc" onclick="S.tab='players';S.player='${a.name}';r()"><div class="ph">${posBadge(a.name)}<div class="pn"><b>${a.name}</b><small>${m.proName||""} · OVR ${m.proOverall||"–"}</small><small class="arch">${archName((mainArch(a.name)[0]||[])[0])}</small></div><div class="pr"><b class="${rc(a.rating.avg)}">${fmt(a.rating.avg)}</b><small>Ort. puan</small></div></div>
 <div class="n4">${n3(a.n,"Maç")}${n3(a.goals.tot,"Gol")}${n3(a.assists.tot,"Asist")}${n3(a.sa.tot,"2. asist")}</div>
 ${SIMPLE()?"":`<div class="n4">${n3("%"+fmt(w/a.n*100,0),"Galibiyet",w/a.n>=.5?"cW":"cO")}${n3("%"+fmt(a.pass.tot,0),"Pas",a.pass.tot>=75?"cW":"cO")}${n3("%"+fmt(sh?so/sh*100:0,0),"Şut isabeti",sh&&so/sh>=.5?"cW":"cO")}${n3(fmt(a.int.avg),"Int / maç","cI")}</div>`}
 <div class="spk"><span class="muted sm">Son ${rows.length} maç puanı</span><div>${rows.map(r=>`<i class="${rc(r.p.rating)}" style="height:${Math.max(8,(r.p.rating-4)/6*100)}%" title="${r.m.opp.name} ${r.p.rating.toFixed(1)}"></i>`).join("")}</div></div></div>`}
function players(){const ms=matches();const L=names().map(n=>agg(n,ms)).filter(a=>a.n);
 L.sort((a,b)=>(val(b,S.sort)??-1e9)-(val(a,S.sort)??-1e9)*(1)+0);
 const cnt=g=>L.filter(a=>(mem(a.name).favoritePosition||a.pos)==g).length;
 return filters()+`<div class="fbar"><div class="pchips"><span class="pb gk">Kaleci ${cnt("goalkeeper")}</span><span class="pb df">Defans ${cnt("defender")}</span><span class="pb mf">Orta saha ${cnt("midfielder")}</span><span class="pb fw">Forvet ${cnt("forward")}</span></div>
 <label class="sel">Sırala <select onchange="S.sort=this.value;r()">${ST.map(([k,l])=>`<option value="${k}" ${S.sort==k?"selected":""}>${l}</option>`).join("")}</select></label></div>
 <div class="g3">${L.map(pcard).join("")}</div>
 ${fold("Tüm istatistikler tablosu",`<div class="${SIMPLE()?"":"card"}"><div class="ch"><h3>Tüm istatistikler</h3><span class="muted sm">${S.mode=="avg"?"maç başı":"toplam"} · başlığa bas: sırala</span></div><div class="scroll"><table class="tbl"><tr><th>Oyuncu</th><th>Maç</th>${ST.map(([k,l])=>`<th class="${S.sort==k?"s":""}" onclick="S.sort='${k}';r()">${l}</th>`).join("")}</tr>
 ${L.map(a=>`<tr class="click" onclick="S.player='${a.name}';r()"><td><b>${a.name}</b></td><td>${a.n}</td>${ST.map(([k])=>`<td class="${S.sort==k?"s":""}">${fmt(val(a,k))}</td>`).join("")}</tr>`).join("")}</table></div></div>`)}`}
function player(n){const ms=matches();const a=agg(n,ms);const m=mem(n);const c=(D.club.career||[]).find(x=>x.name==n)||{};
 if(!a.n)return `<span class="back" onclick="S.player=null;r()">← Oyuncular</span><p>Bu filtrede maç yok.</p>`;
 const sum=f=>a.rows.reduce((s,r)=>s+(f(r.p.ev)||0),0);const per=x=>S.mode=="avg"?x/a.n:x;
 const kv=(l,v)=>`<div class="kv"><span>${l}</span><b>${typeof v=="number"?fmt(per(v)):v}</b></div>`;
 const pc=sum(e=>e.passesCompleted),pfl=sum(e=>e.passesFailed);
 const third=(x,y,z,cls)=>{const t=x+y+z||1;return `<div class="pitch">${[x,y,z].map((v,i)=>`<div class="${cls}" style="opacity:${.25+.75*v/t}"><b>${fmt(per(v))}</b></div>`).join("")}</div><div class="pl muted sm"><span>Kendi bölgemiz</span><span>Orta saha</span><span>Rakip bölge</span></div>`};
 const rows=[...a.rows].reverse();
 return `<span class="back" onclick="S.player=null;r()">← Oyuncular</span>
 <div class="card ph2">${posBadge(n)}<div class="pn"><h2>${n}</h2><small class="muted">${m.proName||""} · OVR ${m.proOverall||"–"} · ${m.proHeight||"–"} cm · Kulüpte ${c.gamesPlayed||m.gamesPlayed||"–"} maç, ${c.goals||m.goals||"–"} gol, ${c.assists||m.assists||"–"} asist</small></div><div class="pr"><b class="${rc(a.rating.avg)}">${fmt(a.rating.avg)}</b><small>Ort. puan</small></div></div>
 ${filters()}
 <div class="card"><div class="ch"><h3>Maç maç puan</h3><span class="muted sm">son ${a.n} maç</span></div><div class="spk big"><div>${[...a.rows].map(r=>`<i class="${rc(r.p.rating)}" style="height:${Math.max(8,(r.p.rating-4)/6*100)}%"><em>${r.p.rating.toFixed(1)}</em></i>`).join("")}</div></div></div>
 ${SIMPLE()?highlights(n):""}${SIMPLE()?fold("Arketip ortalamasıyla tam kıyas",archBlock(n),"open"):archBlock(n)}
 ${fold("Detaylı istatistikler (hücum, pas, savunma, top kaybı bölgeleri)",`<div class="g2">
  <div class="card"><h3>Hücum</h3>${kv("Gol",sum(e=>e.goals))}${kv("Asist",sum(e=>e.assists))}${kv("2. asist",sum(e=>e.secondAssists))}${kv("Ara pas asisti",sum(e=>e.throughBallAssists))}${kv("Şut",sum(e=>e.shots))}${kv("İsabetli şut",sum(e=>e.shotsOnTarget))}${kv("Ceza sahası dışından isabetli",sum(e=>e.shotsOnTargetOutsideBox))}${kv("Zayıf ayakla gol",sum(e=>e.goalsWeakFoot))}</div>
  <div class="card"><h3>Pas</h3>${kv("Pas isabeti","%"+fmt(pc+pfl?pc/(pc+pfl)*100:null,0))}${kv("Başarılı pas",pc)}${kv("Başarısız pas",pfl)}${kv("İleri / geri / yana",`${fmt(per(sum(e=>e.passesCompletedForward)))} / ${fmt(per(sum(e=>e.passesCompletedBackward)))} / ${fmt(per(sum(e=>e.passesCompletedSideways)))}`)}${kv("Kısa / orta / uzun",`${fmt(per(sum(e=>e.passesCompletedShort)))} / ${fmt(per(sum(e=>e.passesCompletedMedium)))} / ${fmt(per(sum(e=>e.passesCompletedLong)))}`)}${kv("Ara pas",sum(e=>e.throughPasses))}${kv("İlk dokunuş pas",sum(e=>e.firstTimePasses))}${kv("Ofsayta düşen pas",sum(e=>e.offsidePasses))}</div>
  <div class="card"><h3>Top kaybı · sahanın neresinde</h3>${third(sum(e=>e.possessionLostDefensiveThird),sum(e=>e.possessionLostMiddleThird),sum(e=>e.possessionLostAttackingThird),"zl")}<h3 style="margin-top:14px">Top kazanma · sahanın neresinde</h3>${third(sum(e=>e.possessionWonDefensiveThird),sum(e=>e.possessionWonMiddleThird),sum(e=>e.possessionWonAttackingThird),"zw")}</div>
  <div class="card"><h3>Savunma</h3>${kv("Interception",sum(e=>e.interceptions))}${kv("Tackle kazanılan / kaybedilen",`${fmt(per(sum(e=>e.tacklesWon)))} / ${fmt(per(sum(e=>e.tacklesLost)))}`)}${kv("Kayarak tackle",sum(e=>e.slidingTacklesWon))}${kv("Top çalma",sum(e=>e.opponentsDispossessed))}${kv("Hava topu (hücum / savunma)",`${fmt(per(sum(e=>e.aerialDuelsWonAttacking)))} / ${fmt(per(sum(e=>e.aerialDuelsWonDefending)))}`)}${kv("Faul",sum(e=>e.foulsConceded))}${kv("Sarı kart",sum(e=>e.yellowCards))}</div>
  <div class="card"><h3>Top sürme ve pozisyon</h3>${kv("Dribbling",sum(e=>e.dribblesCompleted))}${kv("Adam geçme",sum(e=>e.dribblesBeat+e.dribblesSkillMoveBeat))}${kv("Pozisyon dışı",sum(e=>e.outOfPosition))}${kv("Doğru pozisyon (övgü)",sum(e=>e.inPosition))}${kv("\"En iyi seçenek\"",sum(e=>e.feedbackBestOptionTaken))}${kv("\"Başka yere pas vermeliydin\"",sum(e=>e.feedbackShouldHavePassedElsewhere))}</div>
 </div>`)}
 ${fold("Maç maç istatistikler",`<div class="${SIMPLE()?"":"card"}"><h3>Maçlar</h3><div class="scroll"><table class="tbl"><tr><th>Rakip</th><th>Skor</th><th>Arketip</th><th>Puan</th><th>G</th><th>A</th><th>2A</th><th>Pas</th><th>Int</th><th>Kayıp</th></tr>
 ${rows.map(({p,m})=>`<tr class="click" onclick="S.tab='matches';S.match='${m.id}';S.player=null;r()"><td>${m.opp.name}</td><td class="c${res(m)}">${m.gf}-${m.ga}</td><td class="muted">${archName(p.arch)}</td><td><span class="rt ${rc(p.rating)}">${p.rating.toFixed(1)}</span></td><td>${p.goals}</td><td>${p.assists}</td><td>${p.ev.secondAssists}</td><td>${p.ev.passesCompleted}/${p.ev.passesCompleted+p.ev.passesFailed}</td><td>${p.ev.interceptions}</td><td>${LOST(p)}</td></tr>`).join("")}</table></div></div>`)}`}
function radar(list,keys){const cx=170,cy=165,R=120,n=keys.length;const mx=keys.map(k=>Math.max(...list.map(a=>val(a,k)||0),1e-9));
 const pt=(i,f)=>[cx+Math.sin(2*Math.PI*i/n)*R*f,cy-Math.cos(2*Math.PI*i/n)*R*f];let s=`<svg viewBox="-50 0 440 330" class="radar">`;
 [.25,.5,.75,1].forEach(f=>s+=`<polygon points="${keys.map((_,i)=>pt(i,f).join(",")).join(" ")}" class="rg"/>`);
 keys.forEach((k,i)=>{const[x,y]=pt(i,1.17);s+=`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${ST.find(d=>d[0]==k)[1]}</text>`});
 list.forEach((a,j)=>{s+=`<polygon points="${keys.map((k,i)=>pt(i,Math.max(.03,(val(a,k)||0)/mx[i])).join(",")).join(" ")}" fill="${C[j]}26" stroke="${C[j]}" stroke-width="2.5"/>`});return s+"</svg>"}
function cmp(){const ms=matches();const all=names().filter(n=>agg(n,ms).n);if(!S.cmp.length)S.cmp=all.slice(0,2);const L=S.cmp.map(n=>agg(n,ms)).filter(a=>a.n);
 const rows=ST.map(([k,l,,f,dir])=>{const vs=L.map(a=>val(a,k)||0);const mx=Math.max(...vs,1e-9);const bi=dir==-1?vs.indexOf(Math.min(...vs)):vs.indexOf(Math.max(...vs));
  return `<div class="cr"><div class="crl">${l}${dir==-1?' <small>(az iyi)</small>':""}</div><div>${L.map((a,j)=>`<div class="crb"><em class="${j==bi&&L.length>1?"best":""}">${fmt(vs[j])}</em><i style="width:${vs[j]/mx*100}%;background:${C[j]}"></i></div>`).join("")}</div></div>`}).join("");
 return filters()+`<div class="card"><div class="ch"><h3>Oyuncu seç</h3><span class="muted sm">en fazla 4</span></div><div class="pick">${all.map(n=>{const j=S.cmp.indexOf(n);return `<button class="${j>=0?"on":""}" style="${j>=0?`border-color:${C[j]};color:${C[j]}`:""}" onclick="tg('${n}')">${n}</button>`}).join("")}</div></div>
 <div class="g2"><div class="card"><h3>Radar</h3>${radar(L,["goals","assists","sa","sot","drb","won","int","tw","pass"])}<p class="muted sm c">Seçili oyuncular arasında en iyiye göre ölçekli</p></div><div class="card"><h3>Yan yana</h3>${rows}</div></div>`}

function night(){const ss=sessions();if(!ss.length)return "<p>Maç yok.</p>";const i=Math.min(S.night,ss.length-1),s=ss[i],ms=s.ms;
 const w=ms.filter(m=>res(m)=="W").length,d=ms.filter(m=>res(m)=="D").length,l=ms.length-w-d;const gf=ms.reduce((a,m)=>a+m.gf,0),ga=ms.reduce((a,m)=>a+m.ga,0);
 const star=nightStar(ms),L=nightPlayers(ms),fx=fixFirst(ms);const worst=fx[0],best=fx[fx.length-1];const t=teamScores(ms);
 const T=f=>ms.reduce((s,m)=>s+m.us.reduce((x,p)=>x+f(p),0),0);const acc=T(p=>p.ev.passesCompleted)/Math.max(1,T(p=>p.ev.passesCompleted+p.ev.passesFailed))*100;
 return `<div class="nsel">${ss.slice(0,12).map((x,j)=>`<button class="${j==i?"on":""}" onclick="S.night=${j};r()"><b>${new Date(x.end*1000).toLocaleDateString("tr-TR",{day:"numeric",month:"short"})}</b><small>${x.ms.length} maç</small></button>`).join("")}</div>
 <div class="card nh"><div><span class="muted sm">GECE RAPORU</span><h2>${dayStr(s.end)}</h2><span class="muted sm">${dt(s.start).split(" ").pop()} – ${dt(s.end).split(" ").pop()}</span></div><button class="btn" onclick="shareNight(${i})">WhatsApp görseli</button></div>
 <div class="tiles4"><div class="tile"><b>${ms.length}</b><span>Maç</span><small><i class="cW">${w}G</i> <i class="cD">${d}B</i> <i class="cL">${l}M</i></small></div><div class="tile"><b class="${gf>=ga?"cW":"cL"}">${gf-ga>0?"+":""}${gf-ga}</b><span>Averaj</span><small>${gf} attık · ${ga} yedik</small></div><div class="tile"><b>%${fmt(acc,0)}</b><span>Pas isabeti</span><small>takım</small></div><div class="tile"><b>${fmt(gf/ms.length,1)}</b><span>Maç başı gol</span><small>${fmt(ga/ms.length,1)} yedik</small></div></div>
 <div class="g2">
  ${star?`<div class="card motm"><span class="muted sm">GECENİN OYUNCUSU</span><div class="ph">${posBadge(star.name)}<div class="pn"><b>${star.name}</b><small>${star.n} maç · ${star.goals.tot} gol · ${star.assists.tot} asist · ${star.sa.tot} 2. asist · ${star.int.tot} int</small></div><div class="pr"><b class="${rc(star.rating.avg)}">${fmt(star.rating.avg)}</b></div></div></div>`:""}
  <div class="card"><h3>Önce bunu düzeltin</h3>${worst&&worst.diff<0?`<div class="fix bad"><b>${worst.k}</b> bu gece ${worst.txt}. Normalde ${worst.base}.</div>`:`<div class="fix">Bu gece her şey ortalamanın üstündeydi.</div>`}
   <h3 style="margin-top:12px">En iyi yanımız</h3>${best&&best.diff>0?`<div class="fix good"><b>${best.k}</b> bu gece ${best.txt}. Normalde ${best.base}.</div>`:"<div class='fix'>–</div>"}</div>
 </div>
 <div class="card"><h3>Takım puanları</h3>${scoresBlock(ms)}</div>
 ${fold("Gecenin oyuncu istatistikleri",`<div class="${SIMPLE()?"":"card"}"><h3>Oyuncular</h3><div class="scroll"><table class="tbl"><tr><th>Oyuncu</th><th>Maç</th><th>Puan</th><th>G</th><th>A</th><th>2A</th><th>Pas %</th><th>Int</th><th>Top kaybı</th><th>Top kazanma</th></tr>
 ${L.map(a=>`<tr class="click" onclick="S.tab='players';S.player='${a.name}';r()"><td><b>${a.name}</b>${a===star?' <span class="tag">Gecenin oyuncusu</span>':""}</td><td>${a.n}</td><td><span class="rt ${rc(a.rating.avg)}">${fmt(a.rating.avg)}</span></td><td>${a.goals.tot}</td><td>${a.assists.tot}</td><td>${a.sa.tot}</td><td>${fmt(a.pass.tot,0)}</td><td>${a.int.tot}</td><td>${a.lost.tot}</td><td>${a.won.tot}</td></tr>`).join("")}</table></div></div>`)}
 <h3 class="sh">Gecenin maçları</h3><div class="g2">${ms.map(mcard).join("")}</div>`}
function fun(){const ms=matches();
 return filters(false)+`<div class="g3">${FUN.map(([t,d,f])=>{const L=funRank(f,ms);if(!L.length)return "";const u=f=="share"?"%":"";
  return `<div class="card fc"><span class="muted sm">${t.toUpperCase()}</span><div class="fw1"><b>${L[0].n}</b><em>${fmt(L[0].v)}${u}</em></div><p class="muted sm">${d}</p>
  <ol>${L.slice(1).map(x=>`<li><span>${x.n}</span><b>${fmt(x.v)}${u}</b></li>`).join("")}</ol></div>`}).join("")}</div><p class="muted sm">Hepsi maç başı ortalama. Şaka amaçlı, kimse alınmasın.</p>`}
function club(){const ms=matches().sort((a,b)=>b.ts-a.ts);S.mode="avg";const top=names().map(n=>agg(n,ms)).filter(a=>a.n);
 const s=sessions()[0];const lead=(k,l,u="")=>{const a=[...top].sort((x,y)=>val(y,k)-val(x,k))[0];return a?`<div class="ld" onclick="S.tab='players';S.player='${a.name}';r()"><span class="muted sm">${l}</span><b>${a.name}</b><em>${fmt(val(a,k))}${u}</em></div>`:""};
 let nightC="";if(s){const w=s.ms.filter(m=>res(m)=="W").length,d=s.ms.filter(m=>res(m)=="D").length,st=nightStar(s.ms);
  nightC=`<div class="card ln" onclick="S.tab='night';S.night=0;r()"><div class="ch"><h3>Son gece</h3><span class="lnk">Rapor →</span></div><p class="muted sm">${dayStr(s.end)} · ${s.ms.length} maç</p><div class="big"><span class="cW">${w}G</span> <span class="cD">${d}B</span> <span class="cL">${s.ms.length-w-d}M</span></div>${st?`<div class="ph">${posBadge(st.name)}<div class="pn"><b>${st.name}</b><small>Gecenin oyuncusu</small></div><div class="pr"><b class="${rc(st.rating.avg)}">${fmt(st.rating.avg)}</b></div></div>`:""}</div>`}
 return filters(false)+`<div class="g2">${nightC}<div class="card"><h3>Takım puanları <small class="muted">son ${ms.length} maç</small></h3>${scoresBlock(ms)}</div></div>
 <div class="card"><div class="ch"><h3>Liderler</h3><span class="muted sm">maç başı · son ${ms.length} maç</span></div><div class="lds">${lead("rating","Ort. puan")}${lead("goals","Gol")}${lead("assists","Asist")}${SIMPLE()?"":lead("sa","2. asist")+lead("int","Interception")+lead("pass","Pas isabeti","%")}</div></div>
 <div class="ch sh"><h3>Son maçlar</h3><span class="lnk" onclick="S.tab='matches';r()">Tümü →</span></div><div class="g2">${ms.slice(0,4).map(mcard).join("")}</div>`}
let THEME="clean";
let MODE=localStorage.getItem("cp-mode")||"dark";
let MODE3=localStorage.getItem("cp-mode3");if(!["forest","light"].includes(MODE3))MODE3="forest";
window.setMode3=k=>{MODE3=k;localStorage.setItem("cp-mode3",k);r()};
window.setMode=()=>{MODE=MODE=="light"?"dark":"light";localStorage.setItem("cp-mode",MODE);r()};
window.setTheme=t=>{THEME=t;localStorage.setItem("cp-theme",t);r()};
function r(){let b;if(S.tab=="club")b=club();else if(S.tab=="players")b=S.player?player(S.player):players();else if(S.tab=="cmp")b=cmp();else if(S.tab=="night")b=night();else if(S.tab=="fun")b=fun();else b=matchesTab();
 document.body.className="t-"+THEME+(THEME=="board"&&MODE=="light"?" light":"")+(THEME=="clean"&&MODE3!="light"?" dk m-"+MODE3:"");
 $(head()+b+`<p class="foot muted sm">EA Pro Clubs verisi · son güncelleme ${dt(D.updated)} · ${D.matches.length} maç kayıtlı · maçlar her ~30 dk otomatik kaydediliyor (EA sadece son 10 maçı veriyor, biz biriktiriyoruz) · bot oyuncuların istatistiği EA'da yok</p></div>`);
 if(S.match){const el=document.getElementById("m"+S.match);if(el&&S._sc!=S.match){S._sc=S.match;el.scrollIntoView({block:"start"})}}else S._sc=null}
