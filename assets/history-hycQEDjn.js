import{B as e,H as t,I as n,J as r,L as i,P as a,R as o,T as s,U as c,a as l,b as u,c as d,d as f,f as p,g as m,h,m as g,z as _}from"./index-lRPGeIFB.js";import{o as v}from"./db-DUo1pQDD.js";import{c as y,o as b,r as x}from"./charts-BFJCfuV9.js";var S=[{id:`score`,label:`Skor`,unit:`count`,higher:!0},{id:`gmv`,label:`GMV`,unit:`currency`,higher:!0},{id:`gmvPerHour`,label:`GMV / jam`,unit:`currency`,higher:!0},{id:`views`,label:`Views`,unit:`count`,higher:!0},{id:`impressions`,label:`Impressions`,unit:`count`,higher:!0},{id:`ttr`,label:`TTR`,unit:`percent`,higher:!0},{id:`avgViewDuration`,label:`Durasi tonton`,unit:`duration`,higher:!0},{id:`retention1m`,label:`Retensi >1m`,unit:`percent`,higher:!0},{id:`liveCtr`,label:`LIVE CTR`,unit:`percent`,higher:!0},{id:`ctor`,label:`CTOR`,unit:`percent`,higher:!0},{id:`aov`,label:`AOV`,unit:`currency`,higher:!0},{id:`roi`,label:`ROI`,unit:`ratio`,higher:!0}],C=[`gmv`,`gmvPerHour`,`impressions`,`views`,`ttr`,`ttrPreview`,`avgViewDuration`,`retention1m`,`productClicks`,`liveCtr`,`ctr`,`orders`,`ctor`,`orderRate`,`paymentRate`,`aov`,`adsCost`,`roi`,`tacos`,`newFollowers`,`followRate`,`commentRate`,`shareRate`],w=new Set([`adsCost`,`tacos`]);async function T(l){let d=s(),h=await v(),T=h.map(e=>({live:e,a:b(e,h,d)})),O=[...new Set(h.map(e=>e.host).filter(Boolean))],k={host:``,range:`all`,q:``,metric:`score`,picked:[]};if(!h.length){l.innerHTML=`<div class="page"><div class="page-head" data-reveal><div><div class="overline">Riwayat & tren</div><h1 class="page-title">Belum ada live tersimpan</h1></div></div>
      <div class="card empty" data-reveal>${a(`history`)}<h3>Riwayat akan muncul di sini</h3><p>Setiap screenshot yang kamu analisa tersimpan otomatis, sehingga kamu bisa melihat tren & membandingkan live.</p><a class="btn btn-primary" href="#/analyze">${a(`scan`)}Analisa live pertama</a></div></div>`,o(l,()=>i(l));return}l.innerHTML=`
  <div class="page">
    <div class="page-head" data-reveal>
      <div>
        <div class="overline">Riwayat & tren</div>
        <h1 class="page-title">Dari live ke live</h1>
        <p class="page-desc">${h.length} live tersimpan. Klik titik di grafik untuk membuka live, atau centang 2 live untuk dibandingkan.</p>
      </div>
      <div class="btn-row">
        <button class="btn btn-sm" id="csv">${a(`download`)}Ekspor CSV</button>
      </div>
    </div>

    <div class="filters" data-reveal>
      <select class="input" id="f-host" aria-label="Filter host"><option value="">Semua host</option>${O.map(e=>`<option>${m(e)}</option>`).join(``)}</select>
      <div class="seg" id="f-range" role="group" aria-label="Rentang waktu">
        ${[[`7`,`7 hari`],[`30`,`30 hari`],[`90`,`90 hari`],[`all`,`Semua`]].map(([e,t])=>`<button data-range="${e}" class="${e===k.range?`on`:``}">${t}</button>`).join(``)}
      </div>
      <input class="input" id="f-q" placeholder="Cari judul / catatan…" aria-label="Cari" />
    </div>

    <section class="card" data-reveal>
      <div class="card-head">
        <div><div class="card-title" id="trend-title">Tren</div><div class="card-sub" id="trend-sub"></div></div>
      </div>
      <div class="metric-pick" id="pick">${S.map(e=>`<button data-m="${e.id}" class="${e.id===k.metric?`on`:``}">${e.label}</button>`).join(``)}</div>
      <div id="chart" style="margin-top:16px"></div>
    </section>

    <section class="card" data-reveal>
      <div class="table-wrap">
        <table class="t" id="tbl">
          <thead><tr><th><span class="sr-only">Bandingkan</span></th><th>Tanggal</th><th>Live</th><th>Host</th><th class="n">Skor</th><th class="n">GMV</th><th class="n">GMV/jam</th><th class="n">Views</th><th class="n">CTOR</th><th class="n">ROI</th><th>Masalah utama</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </section>

    <section id="cmp"></section>
    <div class="cmp-bar" id="cmp-bar" hidden><span id="cmp-text"></span><div class="btn-row"><button class="btn btn-sm btn-ghost" id="cmp-clear">Batal</button><button class="btn btn-sm btn-primary" id="cmp-go">${a(`compare`)}Bandingkan</button></div></div>
  </div>`;let A=(e,t)=>t===`score`?Number.isFinite(e.a.health.score)?Math.round(e.a.health.score):null:e.a.values[t],j=()=>{let e=Date.now();return T.filter(t=>!(k.host&&t.live.host!==k.host||k.range!==`all`&&t.live.date&&e-new Date(t.live.date+`T00:00:00`)>k.range*864e5||k.q&&!`${t.live.title} ${t.live.notes} ${t.live.host}`.toLowerCase().includes(k.q.toLowerCase())))};function M(){let e=S.find(e=>e.id===k.metric),i=[...j()].reverse().map(e=>({label:E(e.live.date),sub:`${t(e.live.date)}${e.live.startTime?` · `+e.live.startTime:``}`,title:e.live.title||e.live.host||``,y:A(e,k.metric),id:e.live.id})),a=i.map(e=>e.y).filter(Number.isFinite),o=a.length>=3?y(a):null;g(`#trend-title`,l).textContent=`Tren ${e.label}`,g(`#trend-sub`,l).textContent=a.length?`${a.length} live · median ${c(o??y(a),e.unit)} · terakhir ${c(a[a.length-1],e.unit)}`:`Belum ada data untuk metrik ini`;let s=x(g(`#chart`,l),i,{unit:e.unit,title:e.label,median:o,onClick:e=>location.hash=`#/live/${encodeURIComponent(e.id)}`});s?.line&&!_()&&(n(s.line,{duration:1.1}),r.from(s.area,{autoAlpha:0,duration:.8,delay:.4}),r.from(s.dots,{scale:0,transformOrigin:`center`,stagger:.03,duration:.3,delay:.3}))}function N(){let e=g(`#tbl tbody`,l);e.innerHTML=j().map(e=>{let{live:t,a:n}=e,r=n.health.score;return`<tr>
        <td><input type="checkbox" class="cmp-check" data-pick="${m(t.id)}" ${k.picked.includes(t.id)?`checked`:``} aria-label="Pilih untuk dibandingkan" /></td>
        <td style="white-space:nowrap">${m(E(t.date))}${t.startTime?` <span class="muted">${m(t.startTime)}</span>`:``}</td>
        <td><a href="#/live/${encodeURIComponent(t.id)}">${m(t.title||`Tanpa judul`)}</a></td>
        <td class="dim">${m(t.host||`—`)}</td>
        <td class="n"><span class="score-pill s-${n.health.status}">${Number.isFinite(r)?Math.round(r):`–`}</span></td>
        <td class="n">${m(c(n.values.gmv,`currency`))}</td>
        <td class="n">${m(c(n.values.gmvPerHour,`currency`))}</td>
        <td class="n">${m(c(n.values.views))}</td>
        <td class="n">${m(c(n.values.ctor,`percent`))}</td>
        <td class="n">${m(c(n.values.roi,`ratio`))}</td>
        <td>${n.bottleneck?u(n.bottleneck.status,n.bottleneck.headline):`<span class="muted">—</span>`}</td>
      </tr>`}).join(``)||`<tr><td colspan="11" class="muted" style="text-align:center;padding:30px">Tidak ada live yang cocok dengan filter.</td></tr>`}function P(){let e=g(`#cmp-bar`,l);e.hidden=k.picked.length===0,g(`#cmp-text`,l).textContent=k.picked.length===2?`2 live dipilih`:`Pilih ${2-k.picked.length} live lagi untuk dibandingkan`,g(`#cmp-go`,l).disabled=k.picked.length!==2}function F(){let[e,n]=k.picked.map(e=>T.find(t=>t.live.id===e)).sort((e,t)=>(e.live.date||``).localeCompare(t.live.date||``)),i=C.filter(t=>Number.isFinite(e.a.values[t])||Number.isFinite(n.a.values[t])).map(t=>{let r=e.a.values[t],i=n.a.values[t],a=Number.isFinite(r)&&Number.isFinite(i)&&r!==0?(i-r)/Math.abs(r):null;return{id:t,va:r,vb:i,d:a,good:a==null||Math.abs(a)<.03?null:w.has(t)?a<0:a>0}}),a=i.filter(e=>e.good===!0).sort((e,t)=>Math.abs(t.d)-Math.abs(e.d)).slice(0,3),o=i.filter(e=>e.good===!1).sort((e,t)=>Math.abs(t.d)-Math.abs(e.d)).slice(0,3),s=e=>m(e.live.title||t(e.live.date)),u=e=>`${e>0?`+`:``}${Math.round(e*100)}%`;g(`#cmp`,l).innerHTML=`
      <div class="card">
        <div class="card-head"><div><div class="card-title">${s(e)} → ${s(n)}</div><div class="card-sub">${m(t(e.live.date))} vs ${m(t(n.live.date))} · skor ${Math.round(e.a.health.score??0)} → ${Math.round(n.a.health.score??0)}</div></div></div>
        <div class="grid-2" style="margin-bottom:18px">
          <div class="mx" style="grid-template-columns:1fr"><div><h4 style="color:#6fdca0">Membaik</h4><p>${a.map(e=>`${m(f(e.id))} ${u(e.d)}`).join(` · `)||`Tidak ada perubahan positif signifikan.`}</p></div></div>
          <div class="mx" style="grid-template-columns:1fr"><div><h4 style="color:#ff8297">Memburuk</h4><p>${o.map(e=>`${m(f(e.id))} ${u(e.d)}`).join(` · `)||`Tidak ada penurunan signifikan.`}</p></div></div>
        </div>
        <div class="table-wrap"><table class="t cmp-table">
          <thead><tr><th>Metrik</th><th class="n">${s(e)}</th><th class="n">${s(n)}</th><th class="n">Perubahan</th></tr></thead>
          <tbody>${i.map(e=>`<tr><td>${m(f(e.id))}</td><td class="n">${m(c(e.va,p(e.id)))}</td><td class="n">${m(c(e.vb,p(e.id)))}</td><td class="n ${e.good===!0?`better`:e.good===!1?`worse`:``}">${e.d==null?`—`:u(e.d)}</td></tr>`).join(``)}</tbody>
        </table></div>
      </div>`,r.from(`#cmp .card`,{y:20,autoAlpha:0,duration:.5}),g(`#cmp`,l).scrollIntoView({behavior:`smooth`,block:`start`})}g(`#pick`,l).addEventListener(`click`,e=>{let t=e.target.closest(`[data-m]`);t&&(k.metric=t.dataset.m,l.querySelectorAll(`[data-m]`).forEach(e=>e.classList.toggle(`on`,e===t)),M())}),g(`#f-host`,l).addEventListener(`change`,e=>{k.host=e.target.value,M(),N()}),g(`#f-range`,l).addEventListener(`click`,e=>{let t=e.target.closest(`[data-range]`);t&&(k.range=t.dataset.range,l.querySelectorAll(`[data-range]`).forEach(e=>e.classList.toggle(`on`,e===t)),M(),N())});let I;g(`#f-q`,l).addEventListener(`input`,e=>{clearTimeout(I),I=setTimeout(()=>{k.q=e.target.value.trim(),M(),N()},200)}),g(`#tbl`,l).addEventListener(`change`,e=>{let t=e.target.dataset?.pick;t&&(e.target.checked?k.picked=[...k.picked,t].slice(-2):k.picked=k.picked.filter(e=>e!==t),l.querySelectorAll(`[data-pick]`).forEach(e=>e.checked=k.picked.includes(e.dataset.pick)),P())}),g(`#cmp-clear`,l).addEventListener(`click`,()=>{k.picked=[],l.querySelectorAll(`[data-pick]`).forEach(e=>e.checked=!1),g(`#cmp`,l).innerHTML=``,P()}),g(`#cmp-go`,l).addEventListener(`click`,F),g(`#csv`,l).addEventListener(`click`,()=>D(T)),N(),o(l,()=>{i(l),e(l)}),M()}function E(e){return e?new Date(e+`T00:00:00`).toLocaleDateString(`id-ID`,{day:`numeric`,month:`short`}):`—`}function D(e){let t=[...d.map(e=>e.id),...Object.keys(l).filter(e=>!d.some(t=>t.id===e))],n=[`tanggal`,`jam_mulai`,`judul`,`host`,`skor`,`masalah_utama`,...t],r=e=>{let t=e==null?``:String(e);return/[",\n;]/.test(t)?`"${t.replace(/"/g,`""`)}"`:t},i=[n.join(`,`)];for(let{live:n,a}of[...e].reverse())i.push([n.date,n.startTime,n.title,n.host,Number.isFinite(a.health.score)?Math.round(a.health.score):``,a.bottleneck?.headline??``,...t.map(e=>Number.isFinite(a.values[e])?Math.round(a.values[e]*1e3)/1e3:``)].map(r).join(`,`));h(`livepulse-${new Date().toISOString().slice(0,10)}.csv`,`﻿`+i.join(`
`),`text/csv;charset=utf-8`)}export{T as render};