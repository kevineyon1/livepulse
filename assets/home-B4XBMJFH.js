import{B as e,F as t,H as n,J as r,L as i,P as a,R as o,S as s,T as c,U as l,b as u,g as d,v as f}from"./index-lRPGeIFB.js";import{o as p}from"./db-DUo1pQDD.js";import{a as m,o as h}from"./charts-BFJCfuV9.js";async function g(l){let u=c(),m=await p(),g=m.map(e=>({live:e,a:h(e,m,u)})),y=g.slice(0,7),b=y.filter(e=>Number.isFinite(e.a.health.score)),x=b.length?b.reduce((e,t)=>e+t.a.health.score,0)/b.length:null,S=e=>y.reduce((t,n)=>t+(Number.isFinite(n.a.values[e])?n.a.values[e]:0),0),C=y.map(e=>e.a.values.gmvPerHour).filter(Number.isFinite),w=[...g].filter(e=>Number.isFinite(e.a.values.gmvPerHour)).sort((e,t)=>t.a.values.gmvPerHour-e.a.values.gmvPerHour)[0];l.innerHTML=`
  <div class="page">
    <section class="hero" data-reveal>
      <div>
        <div class="overline">Asisten admin TikTok LIVE</div>
        <h1>Screenshot masuk, <em>insight keluar.</em></h1>
        <p>Tempel screenshot dashboard LIVE. LivePulse membaca 16 metrik inti, mencari rasio yang jomplang, lalu memberi tahu apa yang perlu dilakukan host — saat live masih berjalan.</p>
        <div class="hero-points">
          <span>${a(`check`)}Tanpa login</span>
          <span>${a(`lock`)}Data tetap di browser kamu</span>
          <span>${a(`trend`)}Bandingkan dari live ke live</span>
        </div>
      </div>
      <label class="drop" id="drop" tabindex="0" aria-label="Pilih atau seret screenshot dashboard LIVE">
        <input type="file" accept="image/*" multiple hidden id="file" />
        <div class="drop-icon">${a(`image`)}</div>
        <strong>Tempel, seret, atau pilih screenshot</strong>
        <small>Screenshot dengan <span class="kbd">Win</span>+<span class="kbd">Shift</span>+<span class="kbd">S</span>, lalu tekan <span class="kbd">Ctrl</span>+<span class="kbd">V</span> di sini</small>
        <span class="btn btn-light" style="margin-top:8px">${a(`upload`)}Pilih screenshot</span>
        <small>atau <a href="#/analyze?manual=1">isi angka manual</a> · mode ${u.engine===`ai`&&u.apiKey?`AI Claude`:`OCR gratis`}</small>
      </label>
    </section>

    ${m.length?`
    <section class="stat-row" data-scroll="stagger">
      <div class="card stat"><div class="label">Skor rata-rata (7 live)</div>${f(x==null?null:Math.round(x),`count`)}<div class="sub">dari 100 · ${b.length} live dinilai</div></div>
      <div class="card stat"><div class="label">Total GMV (7 live)</div>${f(S(`gmv`),`currency`)}<div class="sub">${y.length} live terakhir</div></div>
      <div class="card stat"><div class="label">Rata-rata GMV per jam</div>${f(C.length?C.reduce((e,t)=>e+t,0)/C.length:null,`currency`)}<div class="sub">${w?`terbaik: ${d(w.live.title||n(w.live.date))}`:`—`}</div></div>
      <div class="card stat"><div class="label">Live tersimpan</div>${f(m.length,`count`)}<div class="sub">${m.reduce((e,t)=>e+t.snapshots.length,0)} screenshot dianalisa</div></div>
    </section>

    <section>
      <div class="page-head" style="margin-bottom:16px">
        <div class="section-title">Live terakhir</div>
        <a class="btn btn-sm btn-ghost" href="#/history">Lihat semua ${a(`arrowRight`)}</a>
      </div>
      <div class="live-list" data-scroll="stagger">
        ${y.map(({live:e,a:t})=>_(e,t)).join(``)}
      </div>
    </section>`:v()}
  </div>`;let T=l.querySelector(`#file`),E=l.querySelector(`#drop`),D=e=>{s(e)&&(location.hash=`#/analyze`)};T.addEventListener(`change`,()=>D(T.files)),E.addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),T.click())}),E.addEventListener(`dragenter`,()=>E.classList.add(`over`)),E.addEventListener(`dragleave`,()=>E.classList.remove(`over`)),E.addEventListener(`drop`,e=>{E.classList.remove(`over`),e.preventDefault(),D(e.dataTransfer.files)}),o(l,()=>{i(l),r.from(`.drop`,{scale:.96,autoAlpha:0,duration:.9,delay:.25,ease:`expo.out`}),t(l,{delay:.3}),e(l),l.querySelectorAll(`.ring-arc`).forEach(e=>r.from(e,{drawSVG:`0%`,duration:1.2,delay:.4,ease:`power2.inOut`}))})}function _(e,t){let r=t.bottleneck?u(t.bottleneck.status,t.bottleneck.headline):t.insights.find(e=>e.severity===`critical`||e.severity===`warning`)?u(`warning`,t.insights.find(e=>e.severity===`critical`||e.severity===`warning`).title):u(t.health.status===`info`?`info`:`good`,t.health.label);return`<a class="card live-card" href="#/live/${encodeURIComponent(e.id)}">
    ${m(t.health.score,t.health.status)}
    <div style="min-width:0">
      <h3>${d(e.title||`Live tanpa judul`)}</h3>
      <div class="meta">${d(n(e.date))}${e.startTime?` · `+d(e.startTime):``}${e.host?` · `+d(e.host):``} · ${e.snapshots.length} screenshot</div>
      <div class="kv"><span>GMV <b>${l(t.values.gmv,`currency`)}</b></span><span>Views <b>${l(t.values.views)}</b></span><span>Order <b>${l(t.values.orders)}</b></span></div>
      <div class="issue">${r}</div>
    </div>
  </a>`}function v(){return`
  <section class="grid-3" data-scroll="stagger">
    <a class="card tip" href="#/guide" style="text-decoration:none;color:inherit">${a(`book`)}<h4>1 · Centang 16 metrik</h4><p>Atur dashboard TikTok LIVE supaya menampilkan 16 metrik inti yang dibutuhkan sistem. Lihat panduannya.</p></a>
    <div class="card tip">${a(`image`)}<h4>2 · Screenshot & tempel</h4><p>Setiap 30–60 menit saat live (dan di akhir live), screenshot dashboard lalu tempel di sini dengan Ctrl+V.</p></div>
    <div class="card tip">${a(`sparkle`)}<h4>3 · Jalankan aksinya</h4><p>Dapatkan skor kesehatan, kebocoran funnel terbesar, dan 3 aksi prioritas untuk host. Semua tersimpan untuk perbandingan.</p></div>
  </section>`}export{g as render};