let COACH=null;
fetch("coach.json",{cache:"no-cache"}).then(x=>x.ok?x.json():null).then(c=>{const go=()=>{COACH=c;if(D&&c)r()};document.readyState=="loading"?addEventListener("DOMContentLoaded",go):go()}).catch(()=>{});
const esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function coachCard(n){const c=COACH&&COACH.players[n];if(!c)return "";
 const li=(a,cls,ic)=>a.map(x=>`<li class="${cls}"><i>${ic}</i><span>${esc(x)}</span></li>`).join("");
 const sec=(t,a,cls,ic)=>a&&a.length?`<h4 class="sub">${t}</h4><ul class="cl">${li(a,cls,ic)}</ul>`:"";
 return `<div class="card coach"><div class="ch"><h3>Hoca diyor ki</h3><span class="chip">${c.source=="ai"?"AI hoca":"İstatistik"} · ${c.n} maç</span></div>
 <p class="csum">${esc(c.summary)}</p>${sec("Bunu yapma",c.dont,"dn","✕")}${sec("Bunu yap",c.do,"up","✓")}${sec("Böyle devam",c.keep,"eq","★")}
 <p class="muted sm">${c.source=="ai"?"AI, kayıtlı maçlarındaki istatistiklere bakarak yazdı.":"Arketip ortalamasına göre otomatik öneri."} Yeni maç oynadıkça güncellenir.</p></div>`}
const _plC=player;player=function(n){const h=_plC(n),c=coachCard(n);if(!c)return h;const i=h.indexOf('<div class="card hl">');return i>=0?h.slice(0,i)+c+h.slice(i):h+c};
const _nightC=night;night=function(){const h=_nightC();if(!COACH)return h;const ss=sessions(),s=ss[Math.min(S.night,ss.length-1)];if(!s)return h;
 const L=Object.entries(COACH.players).filter(([n,c])=>c.night&&c.nightStart==s.start);if(!L.length)return h;
 return h+`<div class="card coach"><h3>Hoca'nın gece notu</h3><ul class="cl">${L.map(([n,c])=>`<li class="eq"><b data-p="${esc(n)}" onclick="S.tab='players';S.player=this.dataset.p;r()">${esc(n)}</b><span>${esc(c.night)}</span></li>`).join("")}</ul></div>`};
