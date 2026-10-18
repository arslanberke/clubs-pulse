// ---------- routing ----------
const ROUTE={club:"genel",matches:"maclar",night:"gece",players:"oyuncular",cmp:"karsilastir",fun:"eglence",an:"analiz"};
const TAB_OF=Object.fromEntries(Object.entries(ROUTE).map(([k,v])=>[v,k]));
function routeOf(){const t=ROUTE[S.tab]||"genel";if(S.tab=="players"&&S.player)return t+"/"+encodeURIComponent(S.player);if(S.tab=="matches"&&S.match)return t+"/"+S.match;if(S.tab=="night"&&S.night)return t+"/"+S.night;return t}
function applyRoute(){const [t,a]=location.hash.replace(/^#\/?/,"").split("/");S.tab=TAB_OF[t]||"club";S.player=S.tab=="players"&&a?decodeURIComponent(a):null;S.match=S.tab=="matches"&&a?a:null;S.night=S.tab=="night"?+a||0:0}
applyRoute();
let ROUTE_NOW=routeOf();
const _r0=r;
function render(){const tb=document.getElementById("tipbox");if(tb)tb.remove();if(S.player&&!names().includes(S.player))S.player=null;if(S.night>=sessions().length)S.night=0;_r0();post()}
r=function(){const old=ROUTE_NOW;render();const nr=routeOf();if(nr!=old){history.pushState(null,"","#/"+nr);ROUTE_NOW=nr;if(nr.split("/")[0]!=old.split("/")[0]||S.tab=="players")window.scrollTo(0,0)}};
addEventListener("popstate",()=>{applyRoute();ROUTE_NOW=routeOf();render()});
window.go=k=>{S.tab=k;S.player=null;S.match=null;r()};

// ---------- icons + bottom nav ----------
const ICO={club:'<path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z"/>',matches:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5l4 3-1.5 4.5h-5L8 10.5z"/>',night:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
 players:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5M16 4.8a3.3 3.3 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.5 3.5 5.2"/>',
 more:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/>'};
const ico=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
function bnav(){const main=[["club","Genel"],["matches","Maçlar"],["night","Gece"],["players","Oyuncular"]],more=[["cmp","Karşılaştır"],["fun","Eğlence"],["an","Analiz"]],cur=more.find(x=>x[0]==S.tab);
 return `<nav class="bnav">${main.map(([k,l])=>`<button class="${S.tab==k?"on":""}" onclick="go('${k}')">${ico(k)}<span>${l}</span></button>`).join("")}<button class="${cur?"on":""}" onclick="document.getElementById('bmore').classList.toggle('open')">${ico("more")}<span>${cur?cur[1]:"Daha"}</span></button></nav>
 <div class="bmore" id="bmore">${more.map(([k,l])=>`<button class="${S.tab==k?"on":""}" onclick="go('${k}')">${l}</button>`).join("")}</div>`}

// ---------- search ----------
const norm=s=>String(s||"").toLocaleLowerCase("tr").replace(/ı/g,"i").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const PAGES=[["club","Genel","ana sayfa ozet"],["matches","Maçlar","skor sonuc"],["night","Gece raporu","seans"],["players","Oyuncular","kadro"],["cmp","Karşılaştır","kiyas radar"],["fun","Eğlence","rekor siralama"],["an","Analiz","saat gun rakip ikili poster bot"]];
let SR=[];
function sres(q){const n=norm(q.trim()),hit=(...xs)=>!n||xs.some(x=>norm(x).includes(n));SR=[];let h="";
 const grp=(t,items)=>{if(items.length)h+=`<div class="sg">${t}</div>`+items.map(([l,sub,f])=>{SR.push(f);return `<button class="sr" data-i="${SR.length-1}" onclick="pickS(${SR.length-1})"><span>${l}</span><small>${sub}</small></button>`}).join("")};
 grp("Oyuncular",names().filter(p=>hit(p,mem(p).proName)).map(p=>[p,[mem(p).proName,archName((mainArch(p)[0]||[])[0])].filter(Boolean).join(" · "),()=>{S.tab="players";S.player=p;S.match=null}]));
 const opps=new Map();D.matches.forEach(m=>{const o=opps.get(m.opp.id)||{name:m.opp.name,ms:[]};o.ms.push(m);opps.set(m.opp.id,o)});
 grp("Rakipler",[...opps].filter(([,o])=>n&&hit(o.name)).slice(0,8).map(([id,o])=>{const c=k=>o.ms.filter(m=>res(m)==k).length;return [o.name,`${o.ms.length} maç · ${c("W")}G ${c("D")}B ${c("L")}M`,()=>{S.tab="matches";S.match=null;S.fOpp=id;S.fRes="all";S.fTime="all";S.fPl=""}]}));
 grp("Sayfalar",PAGES.filter(([,l,k])=>hit(l,k)).map(([k,l])=>[l,"",()=>{S.tab=k;S.player=null;S.match=null}]));
 document.getElementById("sres").innerHTML=h||`<p class="muted" style="padding:14px">Sonuç yok.</p>`}
window.pickS=i=>{const f=SR[i];closeSearch();f&&f();r()};
window.closeSearch=()=>{const o=document.getElementById("sov");if(o)o.className=""};
window.openSearch=()=>{let ov=document.getElementById("sov");if(!ov){ov=document.createElement("div");ov.id="sov";
  ov.innerHTML=`<div class="sbox"><div class="sin">${ico("search")}<input id="sq" placeholder="Oyuncu, rakip kulüp, sayfa…" autocomplete="off" enterkeyhint="go"><button onclick="closeSearch()">Kapat</button></div><div id="sres"></div></div>`;
  ov.onclick=e=>{if(e.target==ov)closeSearch()};document.body.appendChild(ov);const q=ov.querySelector("#sq");q.oninput=()=>sres(q.value);
  q.onkeydown=e=>{if(e.key=="Enter"){const a=ov.querySelector(".sr");a&&a.click()}if(e.key=="Escape")closeSearch()}}
 ov.className="open";const q=ov.querySelector("#sq");q.value="";sres("");setTimeout(()=>q.focus(),30)};
addEventListener("keydown",e=>{if(!D)return;const typing=/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);if((e.key=="/"&&!typing)||(e.key=="k"&&(e.metaKey||e.ctrlKey))){e.preventDefault();openSearch()}});

// ---------- match filters ----------
function mfilt(ms){const s=sessions()[0],now=Date.now()/1000,t=S.fTime||"all";
 return ms.filter(m=>(!S.fRes||S.fRes=="all"||res(m)==S.fRes)&&(!S.fOpp||m.opp.id==S.fOpp)&&(!S.fPl||inM(m,S.fPl))&&(t=="all"||(t=="night"?!!s&&s.ms.some(x=>x.id==m.id):m.ts>=now-t*86400)))}
function mfilters(ms){const opps=[...new Map(D.matches.map(m=>[String(m.opp.id),m.opp.name]))].sort((a,b)=>a[1].localeCompare(b[1],"tr"));
 const sel=(key,opts,lab)=>`<label class="sel">${lab}<select onchange="S.${key}=this.value;S.match=null;r()">${opts.map(([v,l])=>`<option value="${v}" ${String(S[key]||"")==v?"selected":""}>${l}</option>`).join("")}</select></label>`;
 const act=(S.fRes&&S.fRes!="all")||(S.fTime&&S.fTime!="all")||S.fOpp||S.fPl,c=k=>ms.filter(m=>res(m)==k).length;
 return `<div class="mf">${seg([["all","Hepsi"],["W","Galibiyet"],["D","Beraberlik"],["L","Mağlubiyet"]],S.fRes||"all","fRes")}<div class="mfs">${sel("fTime",[["all","Tüm zamanlar"],["night","Son gece"],["7","Son 7 gün"],["30","Son 30 gün"]],"Zaman")}${sel("fOpp",[["","Tüm rakipler"],...opps],"Rakip")}${sel("fPl",[["","Herkes"],...names().map(n=>[n,n])],"Oynayan")}${act?`<button class="clr" onclick="S.fRes='all';S.fTime='all';S.fOpp='';S.fPl='';r()">Filtreleri temizle</button>`:""}</div>
 <p class="muted sm">${ms.length} maç${ms.length?` · <b class="cW">${c("W")}G</b> <b class="cD">${c("D")}B</b> <b class="cL">${c("L")}M</b>`:""}</p></div>`}

// ---------- "Ben" ----------
let ME=localStorage.getItem("cp-me")||"";
const meOk=()=>ME&&names().includes(ME);
window.setMe=n=>{ME=n;if(n){localStorage.setItem("cp-me",n)}else localStorage.removeItem("cp-me");r()};
window.skipMe=()=>{localStorage.setItem("cp-me-skip","1");r()};
function meChip(){return meOk()?`<button class="mechip" onclick="S.tab='players';S.player=ME;S.match=null;r()">${ico("players")}<span>${ME}</span></button>`:""}
function meBlock(){if(!meOk()){if(localStorage.getItem("cp-me-skip"))return "";
  return `<div class="card meask"><div class="ch"><h3>Sen hangisisin?</h3><button class="clr" onclick="skipMe()">Geç</button></div><p class="muted sm">Seçersen istatistiklerin her yerde vurgulu görünür, profiline üstten tek tıkla gidersin.</p><div class="pick">${names().map(n=>`<button onclick="setMe('${n}')">${n}</button>`).join("")}</div></div>`}
 const m=mem(ME),a=agg(ME,matches()),s=sessions()[0],ln=s&&agg(ME,s.ms);
 const cell=(v,l,c="")=>`<div><b class="${c}">${v}</b><span>${l}</span></div>`;
 return `<div class="card mecard" onclick="S.tab='players';S.player=ME;r()"><div class="ch"><h3>Sen · ${ME}</h3><span class="lnk">Profilim →</span></div>
 <div class="n4">${cell(ln&&ln.n?fmt(ln.rating.avg):"–","Son gece puanı",ln&&ln.n?rc(ln.rating.avg):"")}${cell(a.n?fmt(a.rating.avg):"–","Ort. puan",a.n?rc(a.rating.avg):"")}${cell(a.n?a.goals.tot+a.assists.tot:"–","Gol + asist")}${cell(m.gamesPlayed||a.n,"Kulüpte maç")}</div>
 <p class="muted sm">Son gece ve ortalama son ${a.n} kayıtlı maçtan. <a class="lnk" onclick="event.stopPropagation();setMe('')">Değiştir</a></p></div>`}
const _clubU=club;club=function(){const h=_clubU(),f=filters(false),i=h.indexOf(f);return i>=0?h.slice(0,i+f.length)+meBlock()+h.slice(i+f.length):meBlock()+h};
const _playerU=player;player=function(n){return `<div class="mebar">${ME==n?`<span class="muted sm">Bu sensin</span><button class="clr" onclick="setMe('')">Ben değilim</button>`:`<button class="clr" onclick="setMe('${n}')">Bu benim</button>`}</div>`+_playerU(n)};

// ---------- glossary ----------
const GL={"2. asist":"Gol pasını atan oyuncuya pası veren. Asistten önceki son pas.","2A":"2. asist: gol pasından önceki son pas.",
 "Interception":"Rakibin pasını araya girerek kesmek.","Int":"Interception: rakibin pasını araya girerek kesmek.","Int / maç":"Maç başı interception: rakibin pasını araya girerek kesmek.",
 "Top kaybı":"Topu rakibe kaptırmak: kötü pas, çalım ya da kontrol hatası. Az olması iyi.","Kayıp":"Top kaybı: topu rakibe kaptırmak. Az olması iyi.",
 "Top kazanma":"Rakipten topu almak: müdahale, araya girme ya da boşta kalan top.","Kazanma":"Top kazanma: rakipten topu almak.",
 "Pozisyon dışı":"Oyun, mevkinden fazla uzaklaştığını söylediğinde sayılır. Az olması iyi.","Yanlış pas tercihi":"Oyun, daha iyi bir pas seçeneği varken başka yere pas verdiğini söylediğinde sayılır.",
 "Ofsayta düşen pas":"Ofsaytta kalan arkadaşına atılan pas.","Tehlikeli müdahale":"Faul ya da kart riski taşıyan sert müdahale.","Kaybedilen tackle":"Girilen ama topu alamayan müdahale.",
 "Tackle (kazanılan)":"Topu alarak biten müdahale.","Tackle":"Topu alarak biten müdahale.","Ara pas":"Defansın arkasına, koşu yapan arkadaşına atılan pas.","Adam geçme":"Çalımla ya da hızla rakibi geride bırakmak.",
 "Dribbling":"Topla başarılı sürüş ve çalım sayısı.","İleri pas":"İleriye doğru atılan başarılı pas.","Pas %":"Atılan pasların yüzde kaçı arkadaşına ulaştı.","Pas isabeti":"Atılan pasların yüzde kaçı arkadaşına ulaştı.",
 "İsabetli şut":"Kaleyi bulan şut.","Şut isabeti":"Şutların yüzde kaçı kaleyi buldu.","Ort. puan":"EA'nın maç sonunda verdiği 10 üzerinden puanın ortalaması.","Puan":"EA'nın maç sonunda verdiği 10 üzerinden oyuncu puanı.",
 "Maçın adamı":"EA'nın maçın en iyisi seçtiği oyuncu.","SR":"Skill rating: EA'nın kulüp gücü puanı. Kazandıkça artar, kaybettikçe düşer.","Skill rating":"EA'nın kulüp gücü puanı. Kazandıkça artar, kaybettikçe düşer.",
 "Saldırı":"100 üzerinden; maç başı gol ve isabetli şuta göre.","Savunma":"100 üzerinden; yenen gol ve top kazanmaya göre.","Top güvenliği":"100 üzerinden; pas isabeti ve top kaybına göre.",
 "Averaj":"Atılan gol eksi yenen gol.","Seri":"Üst üste gelen aynı sonuç (G galibiyet, B beraberlik, M mağlubiyet).","Hava topu":"Kazanılan hava topu mücadelesi.","OVR":"Pro'nun genel reytingi.",
 "Başarısız pas":"Arkadaşına ulaşmayan pas.","Kırmızı kart":"Oyundan atılma.","Gol yemeden biten":"Rakibe gol izni vermeden biten maç."};
function post(){const app=document.getElementById("app");if(!app)return;
 app.querySelectorAll("b,strong,td,th,span,div,em,small,h3").forEach(el=>{if(el.children.length)return;const t=el.textContent.trim();
  if(meOk()&&t==ME&&!el.closest(".mechip,.pick,.mecard")){el.classList.add("me-n");const tr=el.closest("tr");if(tr)tr.classList.add("me-r")}
  if(GL[t]&&!el.closest("button,select,[onclick]")){el.classList.add("tip");el.dataset.tip=GL[t]}})}
document.addEventListener("click",e=>{const b=document.getElementById("tipbox");const t=e.target.closest&&e.target.closest(".tip");
 if(!t){if(b)b.remove();if(!e.target.closest(".bnav,.bmore")){const m=document.getElementById("bmore");if(m)m.classList.remove("open")}return}
 if(b)b.remove();const d=document.createElement("div");d.id="tipbox";d.innerHTML=`<b>${t.textContent.trim()}</b>${t.dataset.tip}`;document.body.appendChild(d);
 const R=t.getBoundingClientRect(),w=d.offsetWidth;d.style.left=Math.max(8,Math.min(innerWidth-w-8,R.left+R.width/2-w/2))+"px";d.style.top=(R.bottom+8+d.offsetHeight>innerHeight?R.top-d.offsetHeight-8:R.bottom+8)+"px"});
addEventListener("scroll",()=>{const b=document.getElementById("tipbox");if(b)b.remove()},{passive:true});
