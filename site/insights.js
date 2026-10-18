// ---------- Analiz tab, player extras (pro card, trend, archetype trial, badges), records ----------
const pctOf=(a,b)=>b?a/b*100:0;
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const maxRun=arr=>{let b=0,c=0;arr.forEach(v=>{c=v?c+1:0;b=Math.max(b,c)});return b};
const inM=(m,n)=>m.us.some(p=>p.name==n);
const kitHex=v=>"#"+(+v||0).toString(16).padStart(6,"0");
const kitCols=()=>{const k=D.club.kit||{};return [kitHex(k.kitColor1||15921906),kitHex(k.kitColor2||5775459)]};
const mostOf=(ms,n,k)=>{const c={};ms.forEach(m=>m.us.forEach(p=>{if(p.name==n)c[p[k]]=(c[p[k]]||0)+1}));return (Object.entries(c).sort((a,b)=>b[1]-a[1])[0]||[])[0]};

function wdlOf(ms){const n=ms.length,w=ms.filter(m=>res(m)=="W").length,d=ms.filter(m=>res(m)=="D").length;
 return {n,w,d,l:n-w-d,wp:pctOf(w,n),gf:n?ms.reduce((s,m)=>s+m.gf,0)/n:0,ga:n?ms.reduce((s,m)=>s+m.ga,0)/n:0}}
function wrow(l,ms){const x=wdlOf(ms);
 return `<div class="ar"><div class="arl"><b>${l}</b><small class="muted">${x.n} maç · ${x.w}G ${x.d}B ${x.l}M</small></div>
 <div class="arb"><i class="bw" style="width:${pctOf(x.w,x.n)}%"></i><i class="bd" style="width:${pctOf(x.d,x.n)}%"></i><i class="bl" style="width:${pctOf(x.l,x.n)}%"></i></div>
 <div class="arv"><b class="${x.wp>=50?"cW":x.wp>=34?"cD":"cL"}">%${fmt(x.wp,0)}</b><small class="muted">${fmt(x.gf)} – ${fmt(x.ga)}</small></div></div>`}
function wcard(t,sub,groups){const rows=groups.filter(g=>g[1].length).map(g=>wrow(g[0],g[1])).join("");
 return `<div class="card"><div class="ch"><h3>${t}</h3>${sub?`<span class="muted sm">${sub}</span>`:""}</div>${rows||'<p class="muted">Henüz yeterli maç yok.</p>'}</div>`}

const HOUR_SLOTS=[["18:00 – 21:00",h=>h>=18&&h<21],["21:00 – 00:00",h=>h>=21],["00:00 – 03:00",h=>h<3],["03:00 – 08:00",h=>h>=3&&h<8],["Gündüz",h=>h>=8&&h<18]];
const DAYS_TR=["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"];
const hourOf=m=>new Date(m.ts*1000).getHours();
const dayOf=m=>(new Date((m.ts-6*3600)*1000).getDay()+6)%7;
function nightOrder(){const o={};sessions().forEach(s=>s.ms.forEach((m,i)=>o[m.id]=s.ms.length-i));return o}

function duos(ms){const N=names().filter(n=>ms.some(m=>inM(m,n)));const out=[];
 for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++){const both=ms.filter(m=>inM(m,N[i])&&inM(m,N[j]));if(both.length>=2)out.push([`${N[i]} + ${N[j]}`,both])}
 return out.sort((x,y)=>wdlOf(y[1]).wp-wdlOf(x[1]).wp||y[1].length-x[1].length)}
function presence(ms){const L=names().filter(n=>ms.some(m=>inM(m,n))).map(n=>({n,a:wdlOf(ms.filter(m=>inM(m,n))),b:wdlOf(ms.filter(m=>!inM(m,n)))}));
 return `<div class="card"><div class="ch"><h3>Varken / yokken</h3><span class="muted sm">galibiyet oranı</span></div>${L.map(({n,a,b})=>`<div class="vy"><b>${n}</b><span>varken <b class="${!b.n||a.wp>=b.wp?"cW":"cL"}">%${fmt(a.wp,0)}</b> <small class="muted">${a.n} maç</small></span><span>yokken ${b.n?`<b>%${fmt(b.wp,0)}</b> <small class="muted">${b.n} maç</small>`:'<small class="muted">hiç eksik olmadı</small>'}</span></div>`).join("")}</div>`}

function oppBlock(ms){const O=D.opps||{},our=+D.club.overall.skillRating||0;
 const known=ms.filter(m=>O[m.opp.id]&&O[m.opp.id].sr);
 const by={};ms.forEach(m=>(by[m.opp.id]=by[m.opp.id]||[]).push(m));
 const rows=Object.entries(by).sort((a,b)=>b[1].length-a[1].length||b[1][0].ts-a[1][0].ts).map(([id,L])=>{const o=O[id]||{};
  return `<tr><td><b>${L[0].opp.name}</b></td><td>${o.sr||"–"}</td><td>${o.div?o.div+". küme":"–"}</td><td>${o.gp?"%"+fmt(pctOf(o.w,o.gp),0):"–"}</td><td>${[...L].reverse().map(m=>`<span class="rs ${res(m)}">${m.gf}-${m.ga}</span>`).join(" ")}</td></tr>`}).join("");
 return `<div class="g2">${wcard("Rakibin gücüne göre",`bizim SR ${our}`,[["Bizden güçlü (SR yüksek)",known.filter(m=>O[m.opp.id].sr>our)],["Bizden zayıf ya da denk",known.filter(m=>O[m.opp.id].sr<=our)]])}
 ${wcard("Tekrar karşılaştıklarımız","",Object.values(by).filter(L=>L.length>1).map(L=>[L[0].opp.name,L]))}</div>
 <div class="card"><div class="ch"><h3>Rakipler</h3><span class="muted sm">${Object.keys(by).length} farklı kulüp</span></div><div class="tw"><table class="tbl"><thead><tr><th>Kulüp</th><th>SR</th><th>En iyi küme</th><th>Galibiyet %</th><th>Bize karşı</th></tr></thead><tbody>${rows}</tbody></table></div><p class="muted sm">SR, küme ve galibiyet oranı rakibin bugünkü değeri, maç anındaki değil.</p></div>`}

function seasonBlock(){const s=D.club.season||{},o=D.club.overall,po=D.club.playoffs||[];
 const t=[[s.points??"–","Lig puanı"],[s.cleanSheets??"–","Gol yemeden biten"],[o.skillRating,"Skill rating"],[o.bestDivision+". küme","En iyi küme"]];
 return `<div class="card"><div class="ch"><h3>Sezon</h3><span class="muted sm">EA'nın kulüp sayacı</span></div><div class="n4">${t.map(([v,l])=>`<div><b>${v}</b><span>${l}</span></div>`).join("")}</div>${po.length?`<p class="muted sm">Playoff geçmişi: ${po.map(p=>`Sezon ${p.seasonId}: en iyi ${p.bestDivision}. küme`).join(" · ")}</p>`:""}</div>`}

function analysis(){const ms=matches(),ord=nightOrder(),ss=sessions().slice(0,6);
 const sizes=[...new Set(ms.map(m=>m.us.length))].sort((a,b)=>b-a).map(k=>[`${k} kişi + ${11-k} bot`,ms.filter(m=>m.us.length==k)]);
 return filters(false)+`<p class="muted sm">Satırlarda galibiyet oranı. Çubuk galibiyet / beraberlik / mağlubiyet, sağdaki sayılar maç başı attığımız – yediğimiz gol.</p>`+seasonBlock()+
 `<div class="g2">${wcard("Saate göre","senin saatinle",HOUR_SLOTS.map(([l,f])=>[l,ms.filter(m=>f(hourOf(m)))]))}${wcard("Gecenin kaçıncı maçı","",[1,2,3,4,5].map(k=>[k==5?"5. maç ve sonrası":k+". maç",ms.filter(m=>k==5?ord[m.id]>=5:ord[m.id]==k)]))}</div>
 <div class="g2">${wcard("Güne göre","gece yarısından sonrası önceki güne sayılır",DAYS_TR.map((d,i)=>[d,ms.filter(m=>dayOf(m)==i)]))}${wcard("Kaç kişiyiz","bot etkisi",sizes)}</div>
 <div class="g2">${wcard("İkili uyum","beraber oynadıkları maçlar",duos(ms))}${presence(ms)}</div>
 ${oppBlock(ms)}
 <div class="card"><div class="ch"><h3>Kadro posteri</h3><span class="muted sm">gece seç, görsel oluşsun</span></div><div class="seg pills">${ss.map((s,i)=>`<button onclick="posterNight(${i})">${dayStr(s.end)} · ${s.ms.length} maç</button>`).join("")}</div></div>`}

function rrect(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath()}
function fitFont(x,txt,max,size,weight){do{x.font=`${weight} ${size}px sans-serif`;size-=2}while(x.measureText(txt).width>max&&size>16)}
function posterNight(i){const s=sessions()[i];if(!s)return;const ms=s.ms,L=nightPlayers(ms),[k1,k2]=kitCols();
 const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
 for(let k=0;k<12;k++){x.fillStyle=k%2?"#1d5a3c":"#22663f";x.fillRect(0,k*H/12,W,H/12+1)}
 x.strokeStyle="#ffffff45";x.lineWidth=4;x.strokeRect(60,250,W-120,H-320);x.beginPath();x.moveTo(60,(250+H-70)/2);x.lineTo(W-60,(250+H-70)/2);x.stroke();
 x.beginPath();x.arc(W/2,(250+H-70)/2,110,0,7);x.stroke();x.strokeRect(W/2-220,250,440,170);x.strokeRect(W/2-220,H-240,440,170);
 x.fillStyle="#0b1f16e6";x.fillRect(0,0,W,220);x.fillStyle=k2;x.fillRect(0,0,W,10);
 if(crestPng.complete&&crestPng.naturalWidth)x.drawImage(crestPng,50,50,120,120);
 const w=ms.filter(m=>res(m)=="W").length,d=ms.filter(m=>res(m)=="D").length;
 x.fillStyle="#fff";x.font="800 56px sans-serif";x.fillText(D.club.name,195,108);x.fillStyle="#cfe3d6";x.font="30px sans-serif";x.fillText(`Kadro · ${dayStr(s.end)} · ${w}G ${d}B ${ms.length-w-d}M`,195,158);
 const Y={forward:430,midfielder:700,defender:960,goalkeeper:1150},lines={};
 L.forEach(a=>{const p=mostOf(ms,a.name,"pos")||"midfielder";(lines[p]=lines[p]||[]).push(a)});
 x.textAlign="center";
 Object.entries(lines).forEach(([p,arr])=>arr.forEach((a,j)=>{const cx=W*(j+1)/(arr.length+1),cy=Y[p]||700;
  x.fillStyle=k1;x.beginPath();x.arc(cx,cy,64,0,7);x.fill();x.lineWidth=9;x.strokeStyle=k2;x.stroke();
  x.fillStyle=k2;x.font="900 44px sans-serif";x.fillText(fmt(a.rating.avg),cx,cy+15);
  x.fillStyle="#fff";fitFont(x,a.name,W/(arr.length+1)+60,40,800);x.fillText(a.name,cx,cy+116);
  x.fillStyle="#d7eadf";x.font="27px sans-serif";x.fillText(`${archName(mostOf(ms,a.name,"arch"))} · ${a.goals.tot}G ${a.assists.tot}A`,cx,cy+154)}));
 x.textAlign="left";x.fillStyle="#d7eadf";x.font="25px sans-serif";
 x.fillText(`+ ${11-Math.max(...ms.map(m=>m.us.length))} bot · dairede gecenin ortalama puanı`,60,H-26);
 x.textAlign="right";x.fillText(location.host+location.pathname.replace(/index\.html$/,""),W-60,H-26);x.textAlign="left";
 showShare(c,`ionia-kadro-${i}.png`)}

function proCard(n){const m=mem(n),a=agg(n,D.matches);if(!a.n)return "";const ar=(mainArch(n)[0]||[])[0];
 const st=[["PUAN",fmt(a.rating.avg)],["GOL",fmt(a.goals.avg,2)],["AST",fmt(a.assists.avg,2)],["PAS",fmt(a.pass.avg,0)+"%"],["INT",fmt(a.int.avg)],["DRB",fmt(a.drb.avg)]];
 return `<div class="card futw"><div class="fut"><div class="fo"><b>${m.proOverall||"–"}</b><span>${PPOS[m.proPos]||""}</span><img src="crest.png" alt=""></div><div class="fn">${n}</div><div class="fs">${m.proName||""} · ${m.proHeight||"–"} cm · ${archName(ar)}</div>
 <div class="fg">${st.map(([l,v])=>`<div><b>${v}</b><span>${l}</span></div>`).join("")}</div><div class="ft">${D.club.name} · ${m.gamesPlayed||a.n} maç · ${m.goals||0} gol · ${m.assists||0} asist</div></div>
 <div class="futx"><h3>Pro kartı</h3><p class="muted">OVR, boy ve kulüp toplamları EA'dan. Kartın altındaki maç başı değerler son ${a.n} kayıtlı maçtan.</p><button class="btn" onclick="shareCard('${n}')">Kartı paylaş</button></div></div>`}
function shareCard(n){const m=mem(n),a=agg(n,D.matches),ar=(mainArch(n)[0]||[])[0];const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
 x.fillStyle="#0f241b";x.fillRect(0,0,W,H);const g=x.createLinearGradient(0,90,0,1260);g.addColorStop(0,"#efdc9a");g.addColorStop(1,"#a37c2c");x.fillStyle=g;rrect(x,140,90,800,1170,64);x.fill();
 x.fillStyle="#2b2110";x.font="900 180px sans-serif";x.fillText(m.proOverall||"",200,300);x.font="800 64px sans-serif";x.fillText(PPOS[m.proPos]||"",212,385);
 if(crestPng.complete&&crestPng.naturalWidth)x.drawImage(crestPng,690,160,180,180);
 x.textAlign="center";fitFont(x,n,700,96,900);x.fillText(n,540,560);x.font="600 38px sans-serif";x.fillText(`${m.proName||""} · ${m.proHeight||"–"} cm · ${archName(ar)}`,540,625);
 x.fillStyle="#2b211055";x.fillRect(220,670,640,4);x.fillStyle="#2b2110";
 [["PUAN",fmt(a.rating.avg)],["GOL",fmt(a.goals.avg,2)],["AST",fmt(a.assists.avg,2)],["PAS",fmt(a.pass.avg,0)+"%"],["INT",fmt(a.int.avg)],["DRB",fmt(a.drb.avg)]].forEach(([l,v],i)=>{const cx=300+(i%3)*240,cy=800+Math.floor(i/3)*170;
  x.font="900 74px sans-serif";x.fillText(v,cx,cy);x.font="800 34px sans-serif";x.fillText(l,cx,cy+48)});
 x.font="600 34px sans-serif";x.fillText(`${D.club.name} · ${m.gamesPlayed||a.n} maç · ${m.goals||0} gol · ${m.assists||0} asist`,540,1180);
 x.fillStyle="#cfe3d6";x.font="26px sans-serif";x.fillText(`Maç başı değerler son ${a.n} kayıtlı maç · `+location.host+location.pathname.replace(/index\.html$/,""),540,1315);x.textAlign="left";
 showShare(c,`${n}-kart.png`)}

const TRK=[["Puan",p=>p.rating,1],["Gol + asist",p=>p.goals+p.assists,1],["Top kaybı",LOST,-1],["Pas %",p=>{const t=p.ev.passesCompleted+p.ev.passesFailed;return t?p.ev.passesCompleted/t*100:null},1]];
function setTrk(i){S.trk=i;r()}
function trendBlock(n){const k=S.trk||0,[,f,dir]=TRK[k];const rows=[];[...D.matches].sort((a,b)=>a.ts-b.ts).forEach(m=>{const p=m.us.find(z=>z.name==n);if(p){const v=f(p);if(v!=null)rows.push({m,v})}});
 if(rows.length<3)return "";
 const v=rows.map(o=>o.v),ma=v.map((_,i)=>mean(v.slice(Math.max(0,i-4),i+1)));
 let lo=Math.min(...v),hi=Math.max(...v);if(hi-lo<1){hi+=.5;lo-=.5}const pad=(hi-lo)*.1;lo-=pad;hi+=pad;
 const W=640,H=230,L=40,R=12,T=14,B=16,X=i=>L+i*(W-L-R)/(rows.length-1),Y=y=>T+(hi-y)/(hi-lo)*(H-T-B);
 const pts=a=>a.map((y,i)=>X(i).toFixed(1)+","+Y(y).toFixed(1)).join(" "),col={W:"#3ecf8e",D:"#e0b341",L:"#f26b6b"};
 const s5=mean(v.slice(-5)),p5=v.length>=8?mean(v.slice(-10,-5)):null;
 const msg=p5==null?"":Math.abs(s5-p5)<(hi-lo)*.05?`Son 5 maçta önceki 5 maçla aynı seviyede (${fmt(s5)}).`:`${(s5-p5)*dir>0?"İyiye gidiyor":"Kötüye gidiyor"}: son 5 maç ort. ${fmt(s5)}, önceki 5 maç ${fmt(p5)}.`;
 return `<div class="card"><div class="ch"><h3>Gelişim</h3><div class="seg">${TRK.map(([l],i)=>`<button class="${i==k?"on":""}" onclick="setTrk(${i})">${l}</button>`).join("")}</div></div>
 <svg class="trd" viewBox="0 0 ${W} ${H}">${[0,1,2,3].map(i=>{const t=lo+(hi-lo)*(i+.5)/4;return `<line x1="${L}" x2="${W-R}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${L-6}" y="${Y(t)+4}" text-anchor="end">${fmt(t)}</text>`}).join("")}
 <polyline points="${pts(v)}" fill="none" stroke="var(--mut)" stroke-width="1.5" stroke-dasharray="4 4"/><polyline points="${pts(ma)}" fill="none" stroke="var(--acc)" stroke-width="3.5"/>
 ${v.map((y,i)=>`<circle cx="${X(i)}" cy="${Y(y)}" r="5" fill="${col[res(rows[i].m)]}"><title>${dt(rows[i].m.ts)} · ${rows[i].m.opp.name} ${rows[i].m.gf}-${rows[i].m.ga}: ${fmt(y)}</title></circle>`).join("")}</svg>
 <p class="muted sm">Noktalar maç maç (yeşil galibiyet, sarı beraberlik, kırmızı mağlubiyet), kalın çizgi son 5 maçın ortalaması. ${msg}</p></div>`}

function trialBlock(n){const g={};D.matches.forEach(m=>m.us.forEach(p=>{if(p.name==n)(g[p.arch+"|"+p.pos]=g[p.arch+"|"+p.pos]||[]).push({p,m})}));const E=Object.entries(g);if(E.length<2)return "";
 const R=E.map(([k,L])=>{const [ar,pos]=k.split("|"),s=f=>mean(L.map(o=>f(o.p)||0));
  return {l:`${archName(ar)} · ${posTr[pos]||pos}`,n:L.length,rt:s(p=>p.rating),g:s(p=>p.goals),a:s(p=>p.assists),sa:s(p=>p.ev.secondAssists),lost:s(LOST),wp:pctOf(L.filter(o=>res(o.m)=="W").length,L.length)}}).sort((a,b)=>b.n-a.n);
 const ok=R.filter(x=>x.n>=2),best=(k,lo)=>ok.length>1?(lo?Math.min:Math.max)(...ok.map(x=>x[k])):null;
 const C2=[["rt","Puan"],["g","Gol"],["a","Asist"],["sa","2. asist"],["lost","Top kaybı",1],["wp","Galibiyet %"]];const B=Object.fromEntries(C2.map(([k,,lo])=>[k,best(k,lo)]));
 return `<div class="card"><div class="ch"><h3>Arketip / mevki denemesi</h3><span class="muted sm">maç başı</span></div><div class="tw"><table class="tbl"><thead><tr><th>Ne oynadı</th><th>Maç</th>${C2.map(([,l])=>`<th>${l}</th>`).join("")}</tr></thead><tbody>
 ${R.map(x=>`<tr><td><b>${x.l}</b></td><td>${x.n}</td>${C2.map(([k])=>`<td class="${x.n>=2&&x[k]===B[k]?"bst":""}">${k=="wp"?"%"+fmt(x[k],0):fmt(x[k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div><p class="muted sm">Kalın olanlar en iyisi (en az 2 maç oynananlar arasında). Az maçlı denemeler kesin sonuç vermez.</p></div>`}

function badgeBlock(n){const m=mem(n),rows=[];[...D.matches].sort((a,b)=>a.ts-b.ts).forEach(x=>{const p=x.us.find(z=>z.name==n);if(p)rows.push(p)});const B=[];
 const mile=(v,steps,l)=>{const s=steps.filter(t=>v>=t).pop();if(s)B.push([`${s} ${l}`,`kulüpte toplam ${v}`])};
 mile(+m.goals||0,[10,25,50,100,200,500],"gol");mile(+m.assists||0,[10,25,50,100,200],"asist");mile(+m.gamesPlayed||0,[10,25,50,100,250,500],"maç");
 const cnt=(f,t,d)=>{const k=rows.filter(f).length;if(k)B.push([`${t} ×${k}`,d])};
 cnt(p=>p.goals>=3,"Hat-trick","tek maçta 3+ gol");cnt(p=>p.assists>=3,"Asist şov","tek maçta 3+ asist");cnt(p=>p.mom,"Maçın adamı","kayıtlı maçlarda");cnt(p=>p.rating>=9,"9+ puan","kayıtlı maçlarda");
 const gs=maxRun(rows.map(p=>p.goals>0));if(gs>=3)B.push([`${gs} maç gol serisi`,"üst üste gol attığı en uzun seri"]);
 const cs=maxRun(rows.map(p=>p.goals+p.assists>0));if(cs>=4)B.push([`${cs} maç skora katkı`,"üst üste gol ya da asist"]);
 return B.length?`<div class="card"><h3>Rozetler</h3><div class="bdg">${B.map(([t,d])=>`<div><b>${t}</b><small class="muted">${d}</small></div>`).join("")}</div></div>`:""}

function recordBlock(ms){const all=[];ms.forEach(m=>m.us.forEach(p=>all.push({p,m})));if(!all.length)return "";
 const R=[["Tek maçta en çok gol",p=>p.goals],["Tek maçta en çok asist",p=>p.assists],["En yüksek maç puanı",p=>p.rating],["Tek maçta en çok 2. asist",p=>p.ev.secondAssists],["Tek maçta en çok dribbling",p=>p.ev.dribblesCompleted],["Tek maçta en çok interception",p=>p.ev.interceptions],["Tek maçta en çok top kazanma",WON],["Tek maçta en çok top kaybı",LOST]];
 const li=(l,v,who,m)=>`<div class="rec"><div><span class="muted sm">${l}</span><b>${who}</b>${m?`<small class="muted">vs ${m.opp.name} ${m.gf}-${m.ga} · ${dt(m.ts)}</small>`:""}</div><em>${v}</em></div>`;
 const ind=R.map(([l,f])=>{const b=all.reduce((x,o)=>(f(o.p)||0)>(f(x.p)||0)?o:x);return (f(b.p)||0)>0?li(l,fmt(f(b.p)),b.p.name,b.m):""}).join("");
 const ch=[...ms].sort((a,b)=>a.ts-b.ts),big=ch.reduce((x,m)=>m.gf-m.ga>x.gf-x.ga?m:x),most=ch.reduce((x,m)=>m.gf>x.gf?m:x);
 const team=(big.gf>big.ga?li("En farklı galibiyet","+"+(big.gf-big.ga),D.club.name,big):"")+li("Bir maçta en çok gol",most.gf,D.club.name,most)+li("En uzun galibiyet serisi",maxRun(ch.map(m=>res(m)=="W"))+" maç","")+li("En uzun yenilmezlik serisi",maxRun(ch.map(m=>res(m)!="L"))+" maç","");
 const runs=names().filter(n=>ch.some(m=>inM(m,n))).map(n=>{const ps=ch.filter(m=>inM(m,n)).map(m=>m.us.find(p=>p.name==n));return {n,g:maxRun(ps.map(p=>p.goals>0)),c:maxRun(ps.map(p=>p.goals+p.assists>0))}}).sort((a,b)=>b.g-a.g||b.c-a.c);
 return `<div class="g2"><div class="card"><h3>Bireysel rekorlar <small class="muted">kayıtlı maçlarda</small></h3>${ind}</div><div class="card"><h3>Takım rekorları</h3>${team}<h4 class="sub">En uzun seriler</h4>${runs.map(x=>li(`üst üste gol ${x.g} maç · gol ya da asist ${x.c} maç`,"",x.n)).join("")}</div></div>`}

const _player=player;player=function(n){const h=_player(n),f=filters(),i=h.indexOf(f),bottom=trendBlock(n)+trialBlock(n)+badgeBlock(n),top=proCard(n);return i>=0?h.slice(0,i)+top+h.slice(i)+bottom:h+top+bottom};
const _fun=fun;fun=function(){return _fun()+recordBlock(matches())};
