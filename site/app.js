let D;
const C=["#4f9cf9","#f2994a","#3ecf8e","#bb6bd9"];
const S={tab:"club",night:0,type:"all",mode:"avg",sort:"rating",player:null,match:null,cmp:[]};
const $=h=>document.getElementById("app").innerHTML=h;
const fmt=(v,d=1)=>v==null||isNaN(v)?"–":(Number.isInteger(v)?v:v.toFixed(d));
const dt=ts=>new Date(ts*1000).toLocaleString("tr-TR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
const res=m=>m.gf>m.ga?"W":m.gf<m.ga?"L":"D";const resTr={W:"G",D:"B",L:"M"};
const posTr={forward:"Forvet",midfielder:"Orta saha",defender:"Defans",goalkeeper:"Kaleci"};
const real={};
const LOST=p=>p.ev.possessionLostDefensiveThird+p.ev.possessionLostMiddleThird+p.ev.possessionLostAttackingThird;
const WON=p=>p.ev.possessionWonDefensiveThird+p.ev.possessionWonMiddleThird+p.ev.possessionWonAttackingThird;
const matches=()=>D.matches.filter(m=>S.type=="all"||m.type==S.type);
// stat definitions: [key, label, getter(player-match), per-match avg allowed, higherIsBetter]
const ST=[
 ["rating","Puan",p=>p.rating,"avgOnly"],
 ["goals","Gol",p=>p.goals],["assists","Asist",p=>p.assists],["sa","2. asist",p=>p.ev.secondAssists],
 ["shots","Şut",p=>p.shots],["sot","İsabetli şut",p=>p.ev.shotsOnTarget],
 ["pass","Pas %",null,"pct",1,p=>[p.ev.passesCompleted,p.ev.passesCompleted+p.ev.passesFailed]],
 ["pc","Başarılı pas",p=>p.ev.passesCompleted],["pf","İleri pas",p=>p.ev.passesCompletedForward],["tp","Ara pas",p=>p.ev.throughPasses],
 ["drb","Dribbling",p=>p.ev.dribblesCompleted],["beat","Adam geçme",p=>p.ev.dribblesBeat+p.ev.dribblesSkillMoveBeat],
 ["lost","Top kaybı",p=>p.ev.possessionLostDefensiveThird+p.ev.possessionLostMiddleThird+p.ev.possessionLostAttackingThird,0,-1],
 ["won","Top kazanma",p=>p.ev.possessionWonDefensiveThird+p.ev.possessionWonMiddleThird+p.ev.possessionWonAttackingThird],
 ["int","Interception",p=>p.ev.interceptions],["tw","Tackle (kazanılan)",p=>p.ev.tacklesWon],
 ["oop","Pozisyon dışı",p=>p.ev.outOfPosition,0,-1],["mom","Maçın adamı",p=>p.mom],
];
function agg(name,ms){const rows=[];ms.forEach(m=>m.us.forEach(p=>{if(p.name==name)rows.push({p,m})}));
 const o={name,n:rows.length,rows};if(!rows.length)return o;
 ST.forEach(([k,l,g,f,dir,pg])=>{
  if(f=="pct"){let a=0,b=0;rows.forEach(r=>{const[x,y]=pg(r.p);a+=x;b+=y});o[k]={tot:b?a/b*100:null,avg:b?a/b*100:null}}
  else{const t=rows.reduce((s,r)=>s+(g(r.p)||0),0);o[k]={tot:f=="avgOnly"?t/rows.length:t,avg:t/rows.length}}});
 o.pos=rows[rows.length-1].p.pos;return o}
const names=()=>[...new Set(D.matches.flatMap(m=>m.us.map(p=>p.name)))];
const val=(o,k)=>{const d=ST.find(s=>s[0]==k);return o[k]?(S.mode=="avg"&&d[3]!="pct"&&d[3]!="avgOnly"?o[k].avg:o[k].tot):null};
const pills=(arr,cur,key)=>arr.map(([v,l])=>`<button class="pill ${cur==v?"on":""}" onclick="S.${key}='${v}';r()">${l}</button>`).join("");
function filters(withMode=true){return `<div class="bar"><span class="lbl">Maçlar</span>${pills([["all","Tümü"],...["Lig","Playoff","Hazırlık"].filter(t=>D.matches.some(m=>m.type==t)).map(t=>[t,t])],S.type,"type")}
 ${withMode?`<span class="lbl" style="margin-left:10px">Gösterim</span>${pills([["avg","Maç başı"],["tot","Toplam"]],S.mode,"mode")}`:""}</div>`}
function head(){const o=D.club.overall;return `<header><img src="crest.png"><div><h1>${D.club.name}</h1>
 <div class="sub">${D.club.stadium} · Skill rating ${o.skillRating} · En iyi lig ${o.bestDivision}. küme</div></div></header>
 <nav>${pills([["club","Kulüp"],["night","Gece raporu"],["players","Oyuncular"],["cmp","Karşılaştır"],["fun","Eğlence"],["matches","Maçlar"]],S.tab,"tab").replace(/S\.tab='(\w+)'/g,"S.tab='$1';S.player=null;S.match=null")}</nav>`}
function crestImg(list){return `<img src="${list[0]}" data-i="0" onerror="const l=${JSON.stringify(list).replace(/"/g,"&quot;")};const i=+this.dataset.i+1;if(l[i]){this.dataset.i=i;this.src=l[i]}">`}
function mrow(m){const R=res(m);return `<div class="mrow" onclick="S.tab='matches';S.match='${m.id}';r()"><span class="res ${R}">${resTr[R]}</span>${crestImg(m.opp.crest)}
 <div class="opp">${m.opp.name}<span class="tag">${m.type}</span>${m.dnf?'<span class="tag">yarıda kaldı</span>':""}</div><div class="sc">${m.gf} - ${m.ga}</div><div class="meta">${dt(m.ts)}</div></div>`}
function club(){const o=D.club.overall,ms=matches();const w=ms.filter(m=>res(m)=="W").length,dr=ms.filter(m=>res(m)=="D").length;
 const k=(v,l)=>`<div class="kpi"><b>${v}</b><span>${l}</span></div>`;
 const top=names().map(n=>agg(n,ms)).filter(a=>a.n);const best=(key,l)=>{const a=[...top].sort((x,y)=>val(y,key)-val(x,key))[0];return a?k(`${fmt(val(a,key))} <small style="font-size:12px;color:var(--mut)">${a.name}</small>`,l):""};
 S.mode="avg";
 return `<h2>Sezon (EA)</h2><div class="grid">${k(o.gamesPlayed,"Maç")}${k(`${o.wins}-${o.ties}-${o.losses}`,"G-B-M")}${k(o.goals,"Attığı gol")}${k(o.goalsAgainst,"Yediği gol")}${k(o.promotions,"Küme atlama")}${k(o.leagueAppearances,"Lig maçı")}</div>
 ${filters(false)}<h2>Son ${ms.length} maç</h2><div class="grid">${k(`${w}-${dr}-${ms.length-w-dr}`,"G-B-M")}${k(ms.reduce((s,m)=>s+m.gf,0)+" / "+ms.reduce((s,m)=>s+m.ga,0),"Gol at / ye")}
 ${best("rating","En yüksek ort. puan")}${best("goals","Maç başı gol")}${best("sa","Maç başı 2. asist")}${best("int","Maç başı interception")}</div>
 <h2>Takım puanları (son ${ms.length} maç)</h2>${scoresBlock(ms)}
 ${lastNightCard()}<h2>Son maçlar</h2>${ms.slice(0,6).map(mrow).join("")}`}
function players(){const ms=matches();const L=names().map(n=>agg(n,ms)).filter(a=>a.n);
 L.sort((a,b)=>{const d=ST.find(s=>s[0]==S.sort);const x=val(a,S.sort),y=val(b,S.sort);return (d[4]==-1?1:-1)*((x??-1e9)-(y??-1e9))});
 return filters()+`<div class="scroll"><table><tr><th>Oyuncu</th><th>Maç</th>${ST.map(([k,l])=>`<th class="${S.sort==k?"s":""}" onclick="S.sort='${k}';r()">${l}</th>`).join("")}</tr>
 ${L.map(a=>`<tr class="click" onclick="S.player='${a.name}';r()"><td class="name"><b>${a.name}</b><small>${real[a.name]||""}</small></td><td>${a.n}</td>${ST.map(([k])=>`<td>${fmt(val(a,k))}</td>`).join("")}</tr>`).join("")}</table></div>
 <div class="note">Satıra bas: oyuncunun detay sayfası. Sütun başlığına bas: sıralama.</div>`}
function player(n){const ms=matches();const a=agg(n,ms);const m=D.club.members.find(x=>x.name==n)||{};const c=(D.club.career||[]).find(x=>x.name==n)||{};
 if(!a.n)return `<span class="back" onclick="S.player=null;r()">← Oyuncular</span><p>Bu filtrede maç yok.</p>`;
 const sum=f=>a.rows.reduce((s,r)=>s+(f(r.p.ev)||0),0);const per=x=>S.mode=="avg"?x/a.n:x;
 const kv=(l,v)=>`<div class="kv"><span>${l}</span><b>${typeof v=="number"?fmt(per(v)):v}</b></div>`;
 const pc=sum(e=>e.passesCompleted),pfl=sum(e=>e.passesFailed);
 const lostD=sum(e=>e.possessionLostDefensiveThird),lostM=sum(e=>e.possessionLostMiddleThird),lostA=sum(e=>e.possessionLostAttackingThird);
 const wonD=sum(e=>e.possessionWonDefensiveThird),wonM=sum(e=>e.possessionWonMiddleThird),wonA=sum(e=>e.possessionWonAttackingThird);
 const third=(a,b,c,col)=>`<div class="pitch"><div style="background:${col}33">${fmt(per(a))}</div><div style="background:${col}55">${fmt(per(b))}</div><div style="background:${col}88">${fmt(per(c))}</div></div><div style="display:flex;justify-content:space-between;color:var(--mut);font-size:11px"><span>Kendi bölgemiz</span><span>Orta saha</span><span>Rakip bölge</span></div>`;
 const rows=[...a.rows].reverse();const mx=Math.max(...rows.map(r=>r.p.rating),10);
 return `<span class="back" onclick="S.player=null;r()">← Oyuncular</span>
 <header style="padding-top:0"><div><h1>${n} <small style="color:var(--mut);font-size:14px">${m.proName||""}</small></h1><div class="sub">${posTr[a.pos]||a.pos} · OVR ${m.proOverall||"–"} · Boy ${m.proHeight||"–"} cm · Kulüpte kariyer: ${c.gamesPlayed||"–"} maç, ${c.goals||"–"} gol, ${c.assists||"–"} asist</div></div></header>
 ${filters()}
 <h2>Maç maç puan (son ${a.n})</h2><div class="spark">${rows.map(r=>`<div title="${r.m.opp.name}" style="height:${r.p.rating/mx*100}%;background:${r.p.rating>=8?"var(--g)":r.p.rating>=6.5?"var(--acc)":"var(--r)"}"><span>${r.p.rating.toFixed(1)}</span></div>`).join("")}</div>
 <div class="cols"><div>
  <div class="sect"><h3>HÜCUM</h3>${kv("Gol",sum(e=>e.goals))}${kv("Asist",sum(e=>e.assists))}${kv("2. asist",sum(e=>e.secondAssists))}${kv("Ara pas asisti",sum(e=>e.throughBallAssists))}${kv("Şut",sum(e=>e.shots))}${kv("İsabetli şut",sum(e=>e.shotsOnTarget))}${kv("Ceza sahası dışından isabetli",sum(e=>e.shotsOnTargetOutsideBox))}${kv("Zayıf ayakla gol",sum(e=>e.goalsWeakFoot))}</div>
  <div class="sect" style="margin-top:10px"><h3>PAS</h3>${kv("Pas isabeti",fmt(pc+pfl?pc/(pc+pfl)*100:null,0)+"%")}${kv("Başarılı pas",pc)}${kv("Başarısız pas",pfl)}${kv("İleri / geri / yana",`${fmt(per(sum(e=>e.passesCompletedForward)))} / ${fmt(per(sum(e=>e.passesCompletedBackward)))} / ${fmt(per(sum(e=>e.passesCompletedSideways)))}`)}${kv("Kısa / orta / uzun",`${fmt(per(sum(e=>e.passesCompletedShort)))} / ${fmt(per(sum(e=>e.passesCompletedMedium)))} / ${fmt(per(sum(e=>e.passesCompletedLong)))}`)}${kv("Ara pas",sum(e=>e.throughPasses))}${kv("İlk dokunuş pas",sum(e=>e.firstTimePasses))}${kv("Orta (başarılı)",sum(e=>e.passesCompletedCross))}${kv("Ofsayta düşen pas",sum(e=>e.offsidePasses))}</div>
 </div><div>
  <div class="sect"><h3>TOP KAYBI (bölgeye göre)</h3>${third(lostD,lostM,lostA,"#f26b6b")}<h3>TOP KAZANMA (bölgeye göre)</h3>${third(wonD,wonM,wonA,"#3ecf8e")}</div>
  <div class="sect" style="margin-top:10px"><h3>SAVUNMA</h3>${kv("Interception",sum(e=>e.interceptions))}${kv("Tackle kazanılan / kaybedilen",`${fmt(per(sum(e=>e.tacklesWon)))} / ${fmt(per(sum(e=>e.tacklesLost)))}`)}${kv("Kayarak tackle",sum(e=>e.slidingTacklesWon))}${kv("Top çalma",sum(e=>e.opponentsDispossessed))}${kv("Hava topu (hücum/savunma)",`${fmt(per(sum(e=>e.aerialDuelsWonAttacking)))} / ${fmt(per(sum(e=>e.aerialDuelsWonDefending)))}`)}${kv("Faul",sum(e=>e.foulsConceded))}${kv("Sarı kart",sum(e=>e.yellowCards))}</div>
  <div class="sect" style="margin-top:10px"><h3>TOP SÜRME & POZİSYON</h3>${kv("Dribbling",sum(e=>e.dribblesCompleted))}${kv("Adam geçme (skill ile)",`${fmt(per(sum(e=>e.dribblesBeat+e.dribblesSkillMoveBeat)))} (${fmt(per(sum(e=>e.dribblesSkillMoveBeat)))})`)}${kv("Pozisyon dışı",sum(e=>e.outOfPosition))}${kv("Doğru pozisyon (övgü)",sum(e=>e.inPosition))}${kv("\"En iyi seçenek\"",sum(e=>e.feedbackBestOptionTaken))}${kv("\"Başka yere pas vermeliydin\"",sum(e=>e.feedbackShouldHavePassedElsewhere))}</div>
 </div></div>
 <h2>Maçlar</h2><div class="scroll"><table><tr><th>Rakip</th><th>Skor</th><th>Puan</th><th>G</th><th>A</th><th>2A</th><th>Pas</th><th>Int</th><th>Kayıp</th></tr>
 ${a.rows.map(({p,m})=>`<tr class="click" onclick="S.tab='matches';S.match='${m.id}';S.player=null;r()"><td>${m.opp.name}</td><td>${m.gf}-${m.ga}</td><td>${p.rating.toFixed(1)}</td><td>${p.goals}</td><td>${p.assists}</td><td>${p.ev.secondAssists}</td><td>${p.ev.passesCompleted}/${p.ev.passesCompleted+p.ev.passesFailed}</td><td>${p.ev.interceptions}</td><td>${p.ev.possessionLostDefensiveThird+p.ev.possessionLostMiddleThird+p.ev.possessionLostAttackingThird}</td></tr>`).join("")}</table></div>`}
function radar(list,keys){const W=340,cx=170,cy=165,R=120,n=keys.length;
 const mx=keys.map(k=>Math.max(...list.map(a=>val(a,k)||0),1e-9));
 const pt=(i,f)=>[cx+Math.sin(2*Math.PI*i/n)*R*f,cy-Math.cos(2*Math.PI*i/n)*R*f];
 let s=`<svg viewBox="-50 0 440 330" style="width:100%;max-width:380px">`;
 [.25,.5,.75,1].forEach(f=>s+=`<polygon points="${keys.map((_,i)=>pt(i,f).join(",")).join(" ")}" fill="none" stroke="#22262d"/>`);
 keys.forEach((k,i)=>{const[x,y]=pt(i,1.17);s+=`<text x="${x}" y="${y}" fill="#8a919c" font-size="11" text-anchor="middle" dominant-baseline="middle">${ST.find(d=>d[0]==k)[1]}</text>`});
 list.forEach((a,j)=>{s+=`<polygon points="${keys.map((k,i)=>pt(i,Math.max(.03,(val(a,k)||0)/mx[i])).join(",")).join(" ")}" fill="${C[j]}22" stroke="${C[j]}" stroke-width="2"/>`});
 return s+"</svg>"}
function cmp(){const ms=matches();const all=names().filter(n=>agg(n,ms).n);if(!S.cmp.length)S.cmp=all.slice(0,2);
 const L=S.cmp.map(n=>agg(n,ms)).filter(a=>a.n);
 const pick=all.map(n=>`<span class="chk ${S.cmp.includes(n)?"on":""}" onclick="tg('${n}')">${n}</span>`).join(" ");
 const rows=ST.map(([k,l,,f,dir])=>{const vs=L.map(a=>val(a,k)||0);const mx=Math.max(...vs,1e-9);const bi=dir==-1?vs.indexOf(Math.min(...vs)):vs.indexOf(Math.max(...vs));
  return `<div class="cmpRow"><div class="k">${l}${dir==-1?' <small>(az iyi)</small>':""}</div><div class="bars">${L.map((a,j)=>`<div class="bl"><em style="${j==bi&&L.length>1?"color:var(--tx);font-weight:700":"color:var(--mut)"}">${fmt(vs[j])}</em><i style="width:${vs[j]/mx*100}%;background:${C[j]}"></i></div>`).join("")}</div></div>`}).join("");
 return filters()+`<div class="bar"><span class="lbl">Oyuncu seç (en fazla 4)</span>${pick}</div>
 <div class="legend">${L.map((a,j)=>`<span><i style="background:${C[j]}"></i>${a.name} <small style="color:var(--mut)">${a.n} maç</small></span>`).join("")}</div>
 <div class="cols"><div>${radar(L,["goals","assists","sa","sot","drb","won","int","tw","pass"])}<div class="note" style="margin-top:4px">Grafik: seçili oyuncular arasında en iyiye göre ölçeklenir.</div></div><div>${rows}</div></div>`}
window.tg=n=>{S.cmp=S.cmp.includes(n)?S.cmp.filter(x=>x!=n):[...S.cmp,n].slice(-4);r()};
function matchesTab(){if(S.match)return matchDetail(D.matches.find(m=>m.id==S.match));return filters(false)+matches().map(mrow).join("")}
function ptable(list){return `<div class="scroll"><table><tr><th>Oyuncu</th><th>Mevki</th><th>Puan</th><th>G</th><th>A</th><th>2A</th><th>Şut</th><th>Pas</th><th>Ara pas</th><th>Drb</th><th>Int</th><th>Tackle</th><th>Kayıp</th><th>Kazanma</th></tr>
 ${[...list].sort((a,b)=>b.rating-a.rating).map(p=>{const e=p.ev;return `<tr><td class="name"><b>${p.name}</b>${p.mom?' <span class="tag">MOTM</span>':""}</td><td>${posTr[p.pos]||p.pos}</td><td><b>${p.rating.toFixed(1)}</b></td><td>${p.goals}</td><td>${p.assists}</td><td>${e.secondAssists}</td><td>${e.shotsOnTarget}/${p.shots}</td><td>${e.passesCompleted}/${e.passesCompleted+e.passesFailed}</td><td>${e.throughPasses}</td><td>${e.dribblesCompleted}</td><td>${e.interceptions}</td><td>${e.tacklesWon}/${e.tacklesWon+e.tacklesLost}</td><td>${e.possessionLostDefensiveThird+e.possessionLostMiddleThird+e.possessionLostAttackingThird}</td><td>${e.possessionWonDefensiveThird+e.possessionWonMiddleThird+e.possessionWonAttackingThird}</td></tr>`}).join("")}</table></div>`}
function matchDetail(m){const R=res(m);const sumT=(l,f)=>l.reduce((s,p)=>s+f(p),0);
 const line=(l,f)=>`<div class="cmpRow" style="grid-template-columns:60px 1fr 60px;text-align:center"><b>${sumT(m.us,f)}</b><span class="k">${l}</span><b>${sumT(m.them,f)}</b></div>`;
 return `<span class="back" onclick="S.match=null;r()">← Maçlar</span>
 <div style="display:flex;align-items:center;justify-content:center;gap:18px;padding:10px 0 4px"><div style="text-align:center"><img src="crest.png" style="width:46px"><div>${D.club.name}</div></div>
 <div style="font-size:32px;font-weight:800">${m.gf} - ${m.ga}</div><div style="text-align:center">${crestImg(m.opp.crest).replace("<img","<img style='width:46px'")}<div>${m.opp.name}</div></div></div>
 <div style="text-align:center;color:var(--mut);font-size:12px">${m.type} · ${dt(m.ts)} ${m.dnf?"· yarıda kaldı":""}</div>
 <div style="text-align:center;margin:10px 0"><button class="pill on" onclick="shareMatch('${m.id}')">WhatsApp görseli</button></div>
 <h2>Takım puanları (bu maç)</h2>${scoresBlock([m])}
 <h2>Takım karşılaştırması (sadece gerçek oyuncular)</h2>${line("Şut",p=>p.shots)}${line("Başarılı pas",p=>p.ev.passesCompleted)}${line("Interception",p=>p.ev.interceptions)}${line("Top kaybı",p=>p.ev.possessionLostDefensiveThird+p.ev.possessionLostMiddleThird+p.ev.possessionLostAttackingThird)}${line("Tackle",p=>p.ev.tacklesWon)}
 <h2>${D.club.name}</h2>${ptable(m.us)}<h2>${m.opp.name}</h2>${m.them.length?ptable(m.them):'<p style="color:var(--mut)">Rakip oyuncu verisi yok.</p>'}`}
function r(){let b;if(S.tab=="club")b=club();else if(S.tab=="players")b=S.player?player(S.player):players();else if(S.tab=="cmp")b=cmp();else if(S.tab=="night")b=night();else if(S.tab=="fun")b=fun();else b=matchesTab();
 $(head()+b+`<div class="note">EA Pro Clubs verisi · son güncelleme ${dt(D.updated)} · ${D.matches.length} maç kayıtlı. Son maçlar site açılınca EA'dan anlık geliyor, hepsi arşivde birikiyor (EA sadece son 10 maçı veriyor). Bot (AI) oyuncuların istatistiği EA'da yok.</div>`)}

// ---------- team scores ----------
const clamp=x=>Math.round(Math.max(0,Math.min(100,x)));
const share=(a,b)=>a+b?a/(a+b):.5;
function teamScores(ms){if(!ms.length)return null;
 const T=(l,f)=>l.reduce((s,p)=>s+(f(p)||0),0);let gf=0,ga=0,pc=0,pa=0,sU=0,sT=0,wU=0,wT=0,lU=0,lT=0,cmp=0;
 ms.forEach(m=>{gf+=m.gf;ga+=m.ga;pc+=T(m.us,p=>p.ev.passesCompleted);pa+=T(m.us,p=>p.ev.passesCompleted+p.ev.passesFailed);
  if(!m.us.length||!m.them.length)return;cmp++;const nu=m.us.length,nt=m.them.length;
  sU+=T(m.us,p=>p.ev.shotsOnTarget)/nu;sT+=T(m.them,p=>p.ev.shotsOnTarget)/nt;
  const w=p=>p.ev.interceptions+p.ev.tacklesWon+WON(p);wU+=T(m.us,w)/nu;wT+=T(m.them,w)/nt;
  lU+=T(m.us,LOST)/nu;lT+=T(m.them,LOST)/nt});
 const n=ms.length,acc=pa?pc/pa:0;
 return {att:clamp(100*(.5*Math.min(gf/n,4)/4+.5*share(sU,sT))),def:clamp(100*(.5*(1-Math.min(ga/n,4)/4)+.5*share(wU,wT))),
  sec:clamp(100*(.5*Math.max(0,Math.min(1,(acc-.6)/.3))+.5*(1-share(lU,lT)))),gf,ga,acc,n}}
const scoreCol=v=>v>=65?"var(--g)":v>=45?"var(--y)":"var(--r)";
function scoresBlock(ms){const t=teamScores(ms);if(!t)return "";
 const row=(l,v,d)=>`<div class="cmpRow" style="grid-template-columns:130px 1fr 40px"><div class="k">${l}<br><small>${d}</small></div><div style="background:var(--line);border-radius:4px;height:10px"><i style="display:block;height:10px;border-radius:4px;width:${v}%;background:${scoreCol(v)}"></i></div><b style="text-align:right">${v}</b></div>`;
 return row("Saldırı",t.att,"gol + isabetli şut")+row("Savunma",t.def,"yenen gol + top kazanma")+row("Top güvenliği",t.sec,"pas isabeti + top kaybı")+
 `<div class="note" style="margin-top:6px">100 üzerinden. Rakiple kıyaslanan kısımlar oyuncu başına hesaplanıyor (sadece gerçek oyuncular).</div>`}

// ---------- sessions (gece raporu) ----------
function sessions(){const ms=[...D.matches].sort((a,b)=>b.ts-a.ts);const out=[];
 ms.forEach(m=>{const cur=out[out.length-1];if(cur&&cur.start-m.ts<3*3600)cur.ms.push(m),cur.start=m.ts;else out.push({ms:[m],start:m.ts,end:m.ts})});
 return out}
const dayStr=ts=>new Date(ts*1000).toLocaleDateString("tr-TR",{day:"numeric",month:"long",weekday:"long"});
function nightPlayers(ms){return names().map(n=>agg(n,ms)).filter(a=>a.n).sort((a,b)=>b.rating.avg-a.rating.avg)}
function nightStar(ms){const L=nightPlayers(ms);const min=Math.ceil(ms.length/2);return L.find(a=>a.n>=min)||L[0]}
function fixFirst(ms){
 const rate=(list,f,g)=>{let a=0,b=0;list.forEach(m=>m.us.forEach(p=>{a+=f(p);b+=g?g(p):1}));return b?a/b:null};
 const M=[
  ["Top kaybı",l=>rate(l,LOST),-1,v=>`oyuncu başı maç başına ${fmt(v)} top kaybı`],
  ["Pas isabeti",l=>rate(l,p=>p.ev.passesCompleted,p=>p.ev.passesCompleted+p.ev.passesFailed),1,v=>`pas isabeti %${fmt(v*100,0)}`],
  ["Şut isabeti",l=>rate(l,p=>p.ev.shotsOnTarget,p=>p.shots),1,v=>`şutların %${fmt(v*100,0)}'i kaleyi buldu`],
  ["Pozisyon",l=>rate(l,p=>p.ev.outOfPosition),-1,v=>`oyuncu başı ${fmt(v)} kez pozisyon dışı`],
  ["Yenen gol",l=>l.reduce((s,m)=>s+m.ga,0)/l.length,-1,v=>`maç başı ${fmt(v)} gol yendi`],
  ["Top kazanma",l=>rate(l,WON),1,v=>`oyuncu başı ${fmt(v)} top kazanma`],
 ];
 const res=M.map(([k,f,dir,txt])=>{const now=f(ms),base=f(D.matches);if(now==null||!base)return null;return {k,diff:dir*(now-base)/base,txt:txt(now),base:txt(base)}}).filter(Boolean);
 res.sort((a,b)=>a.diff-b.diff);return res}
function night(){const ss=sessions();if(!ss.length)return "<p>Maç yok.</p>";const i=Math.min(S.night,ss.length-1),s=ss[i],ms=s.ms;
 const w=ms.filter(m=>res(m)=="W").length,d=ms.filter(m=>res(m)=="D").length,l=ms.length-w-d;
 const star=nightStar(ms),L=nightPlayers(ms),fx=fixFirst(ms);const worst=fx[0],best=fx[fx.length-1];
 const k=(v,lb)=>`<div class="kpi"><b>${v}</b><span>${lb}</span></div>`;
 const sel=ss.slice(0,12).map((x,j)=>`<button class="pill ${j==i?"on":""}" onclick="S.night=${j};r()">${new Date(x.end*1000).toLocaleDateString("tr-TR",{day:"numeric",month:"short"})} · ${x.ms.length} maç</button>`).join("");
 return `<div class="bar"><span class="lbl">Gece</span>${sel}</div>
 <h2>${dayStr(s.end)} · ${dt(s.start).split(" ").pop()} – ${dt(s.end).split(" ").pop()}</h2>
 <div class="grid">${k(`${w}-${d}-${l}`,"G-B-M")}${k(`${ms.reduce((a,m)=>a+m.gf,0)} / ${ms.reduce((a,m)=>a+m.ga,0)}`,"Gol at / ye")}${star?k(`${star.name} <small style="font-size:12px;color:var(--mut)">${fmt(star.rating.avg)}</small>`,"Gecenin oyuncusu"):""}</div>
 <div style="margin:4px 0 14px"><button class="pill on" onclick="shareNight(${i})">WhatsApp görseli</button></div>
 <div class="cols"><div class="sect"><h3>ÖNCE BUNU DÜZELTİN</h3>${worst&&worst.diff<0?`<p style="margin:6px 0"><b>${worst.k}</b>: bu gece ${worst.txt}. Normalde ${worst.base}.</p>`:`<p>Bu gece her şey ortalamanın üstündeydi.</p>`}
  <h3>EN İYİ YANIMIZ</h3>${best&&best.diff>0?`<p style="margin:6px 0"><b>${best.k}</b>: bu gece ${best.txt}. Normalde ${best.base}.</p>`:"<p>–</p>"}</div>
  <div class="sect"><h3>TAKIM PUANLARI</h3>${scoresBlock(ms)}</div></div>
 <h2>Oyuncular</h2><div class="scroll"><table><tr><th>Oyuncu</th><th>Maç</th><th>Puan</th><th>G</th><th>A</th><th>2A</th><th>Pas %</th><th>Int</th><th>Top kaybı</th><th>Top kazanma</th></tr>
 ${L.map(a=>`<tr class="click" onclick="S.tab='players';S.player='${a.name}';r()"><td class="name"><b>${a.name}</b>${a===star?' <span class="tag">Gecenin oyuncusu</span>':""}</td><td>${a.n}</td><td><b>${fmt(a.rating.avg)}</b></td><td>${a.goals.tot}</td><td>${a.assists.tot}</td><td>${a.sa.tot}</td><td>${fmt(a.pass.tot,0)}</td><td>${a.int.tot}</td><td>${a.lost.tot}</td><td>${a.won.tot}</td></tr>`).join("")}</table></div>
 <h2>Maçlar</h2>${ms.map(mrow).join("")}`}
function lastNightCard(){const s=sessions()[0];if(!s)return "";const w=s.ms.filter(m=>res(m)=="W").length,d=s.ms.filter(m=>res(m)=="D").length;const st=nightStar(s.ms);
 return `<h2>Son gece</h2><div class="mrow" onclick="S.tab='night';S.night=0;r()"><div class="opp">${dayStr(s.end)} · ${s.ms.length} maç · ${w}-${d}-${s.ms.length-w-d}${st?` · gecenin oyuncusu <b>${st.name}</b>`:""}</div><div class="meta">Rapor →</div></div>`}

// ---------- fun rankings ----------
const FUN=[
 ["Ego kralı","Oyunun \"başka yere pas vermeliydin\" dediği an",p=>p.ev.feedbackShouldHavePassedElsewhere],
 ["Top kaybı şampiyonu","Maç başı top kaybı",LOST],
 ["Şut var gol yok","Gole dönmeyen şut",p=>p.shots-p.goals],
 ["Ana karakter","Takımın pas+şut+dribbling'inin yüzde kaçı onda","share"],
 ["Hayalet","Topa en az dokunan","ghost"],
 ["Pozisyon turisti","Maç başı pozisyon dışı kalma",p=>p.ev.outOfPosition],
 ["Kasap","Faul + tehlikeli tackle + sarı kart",p=>p.ev.foulsConceded+p.ev.dangerousTackles+p.ev.yellowCards],
 ["Sessiz kahraman","Kimse görmüyor: 2. asist + interception",p=>p.ev.secondAssists+p.ev.interceptions],
 ["Top yapışkanı","Maç başı topu sürme (bırakmayan)",p=>p.ev.dribblesCarried],
];
const touches=p=>p.passAtt+p.shots+p.ev.dribblesCompleted;
function funRank(f,ms){const L=names().map(n=>{let v=0,c=0;ms.forEach(m=>{const p=m.us.find(x=>x.name==n);if(!p)return;c++;
  if(f=="share"||f=="ghost"){const t=m.us.reduce((s,x)=>s+touches(x),0);v+=f=="share"?(t?touches(p)/t*100:0):touches(p)}else v+=f(p)});
  return {n,c,v:c?v/c:0}}).filter(x=>x.c);
 return L.sort((a,b)=>f=="ghost"?a.v-b.v:b.v-a.v)}
function fun(){const ms=matches();
 return filters(false)+`<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">${FUN.map(([t,d,f])=>{const L=funRank(f,ms);if(!L.length)return "";const u=f=="share"?"%":"";
  return `<div class="kpi"><span>${t}</span><b style="margin:4px 0">${L[0].n} <small style="font-size:13px;color:var(--mut)">${fmt(L[0].v)}${u}</small></b><span>${d}</span>
  <div style="margin-top:6px;font-size:12px;color:var(--mut)">${L.slice(1).map((x,j)=>`${j+2}. ${x.n} ${fmt(x.v)}${u}`).join(" · ")}</div></div>`}).join("")}</div>
 <div class="note">Hepsi maç başı ortalama. Şaka amaçlı, kimse alınmasın.</div>`}

// ---------- share image ----------
const crestPng=new Image();crestPng.src="crest.png";
function canvasBase(h){const c=document.createElement("canvas");c.width=1080;c.height=h;const x=c.getContext("2d");
 x.fillStyle="#0d0f12";x.fillRect(0,0,1080,h);x.fillStyle="#4f9cf9";x.fillRect(0,0,1080,8);
 if(crestPng.complete&&crestPng.naturalWidth)x.drawImage(crestPng,60,50,110,110);
 x.fillStyle="#e8eaed";x.font="800 52px -apple-system,Segoe UI,Roboto,sans-serif";x.fillText(D.club.name,195,112);
 x.fillStyle="#8a919c";x.font="28px -apple-system,Segoe UI,Roboto,sans-serif";return [c,x]}
function drawScores(x,t,y){[["Saldırı",t.att],["Savunma",t.def],["Top güvenliği",t.sec]].forEach(([l,v],i)=>{const yy=y+i*58;
 x.fillStyle="#8a919c";x.font="28px sans-serif";x.fillText(l,60,yy+22);x.fillStyle="#22262d";x.fillRect(330,yy,600,22);
 x.fillStyle=v>=65?"#3ecf8e":v>=45?"#f2c94c":"#f26b6b";x.fillRect(330,yy,6*v,22);x.fillStyle="#e8eaed";x.font="700 30px sans-serif";x.fillText(v,955,yy+22)})}
function drawPlayers(x,L,y,star){x.fillStyle="#8a919c";x.font="26px sans-serif";["Oyuncu","Puan","G","A","2A","Int","Kayıp"].forEach((h,i)=>x.fillText(h,i?300+i*110:60,y));
 L.forEach((a,j)=>{const yy=y+56+j*58;x.fillStyle=a.name==star?"#f2c94c":"#e8eaed";x.font="700 32px sans-serif";x.fillText(a.name,60,yy);x.font="32px sans-serif";x.fillStyle="#e8eaed";
  a.cells.forEach((v,i)=>x.fillText(v,300+(i+1)*110,yy))})}
function footer(x,h){x.fillStyle="#8a919c";x.font="24px sans-serif";x.fillText(location.host+location.pathname.replace(/index\.html$/,""),60,h-50)}
function shareMatch(id){const m=D.matches.find(z=>z.id==id),R=res(m);const h=1080+Math.max(0,m.us.length-4)*58;const [c,x]=canvasBase(h);
 x.fillText(`${m.type} · ${dt(m.ts)}`,195,150);
 x.fillStyle={W:"#3ecf8e",D:"#f2c94c",L:"#f26b6b"}[R];x.font="900 150px sans-serif";x.textAlign="center";x.fillText(`${m.gf} - ${m.ga}`,540,360);
 x.fillStyle="#e8eaed";x.font="600 40px sans-serif";x.fillText("vs "+m.opp.name,540,430);x.textAlign="left";
 drawScores(x,teamScores([m]),500);const L=[...m.us].sort((a,b)=>b.rating-a.rating);
 drawPlayers(x,L.map(p=>({name:p.name,cells:[p.rating.toFixed(1),p.goals,p.assists,p.ev.secondAssists,p.ev.interceptions,LOST(p)]})),730,L[0]&&L[0].name);
 footer(x,h);showShare(c,`ionia-${m.id}.png`)}
function shareNight(i){const s=sessions()[i],ms=s.ms;const w=ms.filter(m=>res(m)=="W").length,d=ms.filter(m=>res(m)=="D").length;
 const L=nightPlayers(ms),star=nightStar(ms);const h=870+L.length*58+ms.length*44;const [c,x]=canvasBase(h);
 x.fillText("Gece raporu · "+dayStr(s.end),195,150);x.fillStyle="#e8eaed";x.font="900 110px sans-serif";x.fillText(`${w}G ${d}B ${ms.length-w-d}M`,60,310);
 x.fillStyle="#8a919c";x.font="32px sans-serif";x.fillText(`${ms.length} maç · ${ms.reduce((a,m)=>a+m.gf,0)} attık, ${ms.reduce((a,m)=>a+m.ga,0)} yedik`,60,365);
 if(star){x.fillStyle="#f2c94c";x.font="700 38px sans-serif";x.fillText(`Gecenin oyuncusu: ${star.name} (${fmt(star.rating.avg)})`,60,430)}
 drawScores(x,teamScores(ms),490);
 drawPlayers(x,L.map(a=>({name:a.name,cells:[fmt(a.rating.avg),a.goals.tot,a.assists.tot,a.sa.tot,a.int.tot,a.lost.tot]})),720,star&&star.name);
 let y=760+L.length*58+20;x.font="30px sans-serif";ms.slice().reverse().forEach(m=>{const R=res(m);x.fillStyle={W:"#3ecf8e",D:"#f2c94c",L:"#f26b6b"}[R];x.fillText(`${m.gf}-${m.ga}`,60,y);x.fillStyle="#e8eaed";x.fillText(m.opp.name,170,y);y+=44});
 footer(x,h);showShare(c,`ionia-gece-${s.end}.png`)}
function showShare(c,fname){c.toBlob(blob=>{const url=URL.createObjectURL(blob);const file=new File([blob],fname,{type:"image/png"});
 const ov=document.createElement("div");ov.style.cssText="position:fixed;inset:0;background:#000c;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:9;padding:16px";
 ov.innerHTML=`<img src="${url}" style="max-width:100%;max-height:75vh;border-radius:10px"><div style="display:flex;gap:8px">${navigator.canShare&&navigator.canShare({files:[file]})?'<button class="pill on" id="shBtn">Paylaş</button>':""}<a class="pill on" style="text-decoration:none" href="${url}" download="${fname}">İndir</a><button class="pill" id="shClose">Kapat</button></div>`;
 document.body.appendChild(ov);ov.querySelector("#shClose").onclick=()=>ov.remove();const b=ov.querySelector("#shBtn");if(b)b.onclick=()=>navigator.share({files:[file]}).catch(()=>{})},"image/png")}
window.shareMatch=shareMatch;window.shareNight=shareNight;

// ---------- boot ----------
const evProxy=m=>[...m.us,...m.them].forEach(p=>p.ev=new Proxy(p.ev,{get:(o,k)=>k in o?o[k]:0}));
const whenReady=f=>document.readyState=="loading"?addEventListener("DOMContentLoaded",f):f();
fetch("data.json",{cache:"no-cache"}).then(x=>x.json()).then(d=>{D=d;
 D.matches.forEach(evProxy);
 D.club.members.forEach(m=>real[m.name]=m.proName);whenReady(()=>r());
 fetch("api/live").then(x=>x.ok?x.json():null).then(l=>{if(!l||!l.matches)return;
  const have=new Set(D.matches.map(m=>m.id)),add=l.matches.filter(m=>!have.has(m.id));
  add.forEach(evProxy);D.matches=[...add,...D.matches].sort((a,b)=>b.ts-a.ts);D.updated=Math.floor(Date.now()/1000);whenReady(()=>r())}).catch(()=>{})});
