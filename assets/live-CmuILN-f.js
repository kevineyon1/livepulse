import{A as e,B as t,F as n,G as r,H as i,I as a,J as o,K as s,P as c,R as l,T as u,U as d,W as f,a as p,b as m,d as h,f as g,g as _,l as v,m as y,p as b,q as x,v as S,y as C,z as w}from"./index-lRPGeIFB.js";import{t as T}from"./ai-IaZQhu_X.js";import{n as E,o as D,r as O,s as k}from"./db-DUo1pQDD.js";import{c as A,i as j,l as M,n as N,o as P,r as F,s as I,t as L,u as R}from"./charts-BFJCfuV9.js";async function z(T,{id:A,q:I={}}){let R=u(),G=await D(),K=G.find(e=>e.id===A);if(!K){T.innerHTML=`<div class="page"><div class="card empty">${c(`alert`)}<h3>Live tidak ditemukan</h3><p>Mungkin sudah dihapus.</p><a class="btn" href="#/history">Ke riwayat</a></div></div>`;return}let q=P(K,G,R),J=q.values,Y=q.health.status===`info`?`none`:q.health.status;x.setMood(q.health.status);let X=(e,t,n)=>{let r=q.kpis.find(e=>e.id===t)?.median??null,i=``,a=q.historyCount>=3?U(G,K,t,R.historyWindow):null,o=r??a;if(Number.isFinite(J[t])&&Number.isFinite(o)&&o){let e=(J[t]-o)/Math.abs(o),n=Math.abs(e)<.03?`flat`:e>0?`up`:`down`;i=`<div class="delta ${n}">${c(n===`down`?`arrowDown`:`arrowUp`)}${f(e)} vs median</div>`}return`<div><div class="label">${e}</div>${S(J[t],n)}${i}</div>`},Z=q.bottleneck?.kpi,ee=Math.max(...q.funnel.map(e=>Number.isFinite(e.value)?e.value:0),1),te=e=>Number.isFinite(e)&&e>0?Math.max(1.5,Math.log10(e+1)/Math.log10(ee+1)*100):0,ne=Object.keys(e).map(e=>[e,q.kpis.filter(t=>t.stage===e&&Number.isFinite(t.value))]).filter(([,e])=>e.length),Q=Object.keys(J).filter(e=>v[e]||p[e]).sort((e,t)=>(q.source[e]===`reported`?0:1)-(q.source[t]===`reported`?0:1)||(v[e]?.rec??99)-(v[t]?.rec??99));T.innerHTML=`
  <div class="page">
    <div class="page-head">
      <div>
        <a href="#/history" class="btn btn-sm btn-ghost" style="margin-left:-12px">${c(`arrowLeft`)}<span>Riwayat</span></a>
        <h1 class="page-title" style="margin-top:4px">${_(K.title||`Live tanpa judul`)}</h1>
        <p class="page-desc">${_(i(K.date))}${K.startTime?` · mulai `+_(K.startTime):``}${K.host?` · host `+_(K.host):``} · ${K.snapshots.length} screenshot${Number.isFinite(J.durationHours)?` · ±${J.durationHours.toFixed(1)} jam live`:``}</p>
      </div>
      <div class="btn-row">
        <a class="btn" href="#/analyze?live=${encodeURIComponent(K.id)}">${c(`plus`)}Tambah screenshot</a>
        <button class="btn" id="btn-coach">${c(`sparkle`)}Analisa AI</button>
        <button class="btn btn-ghost" id="btn-edit" title="Ubah judul/host">${c(`edit`)}</button>
        <button class="btn btn-danger btn-sm" id="btn-del" title="Hapus live">${c(`trash`)}</button>
      </div>
    </div>

    <section class="result-hero" id="hero">
      <div class="gauge">
        ${N(q.health.score,Y)}
        <div class="center"><div class="score">${Number.isFinite(q.health.score)?Math.round(q.health.score):`–`}</div><div class="of">skor live</div></div>
      </div>
      <div style="min-width:0">
        <span class="grade"><span class="dot s-${q.health.status}" style="background:${L[Y]}"></span>${_(q.health.label)}</span>
        <h1 id="hero-title">${q.bottleneck?_(q.bottleneck.headline):Number.isFinite(q.health.score)?`Tidak ada masalah besar — pertahankan`:`Lengkapi metrik untuk penilaian`}</h1>
        <p class="summary">${_(q.summary)}</p>
        <div class="hero-kpis">
          ${X(`GMV`,`gmv`,`currency`)}
          ${X(`GMV per jam`,`gmvPerHour`,`currency`)}
          ${X(`Views`,`views`,`count`)}
          ${X(q.source.roi===`estimate`?`ROI (estimasi)`:`GMV Max ROI`,`roi`,`ratio`)}
        </div>
      </div>
    </section>

    ${q.actionsNow.length?`
    <section class="card now-card" data-scroll>
      <div class="now-badge">${c(`bolt`)}</div>
      <div>
        <div class="card-title">Lakukan sekarang</div>
        <div class="card-sub">Langsung jalankan di live ini — urut dari yang paling berdampak</div>
        <ol class="now-list">${q.actionsNow.map(e=>`<li><div>${V(e)}<p>${_(e.text)}</p></div></li>`).join(``)}</ol>
      </div>
    </section>`:``}

    <section class="card" data-scroll>
      <div class="card-head">
        <div><div class="card-title">Perjalanan penonton sampai membeli</div><div class="card-sub">Di tahap mana orang paling banyak "hilang". Kotak merah = masalah utama.</div></div>
        ${q.bottleneck?m(q.bottleneck.status,`Masalah: ${q.bottleneck.headline}`):``}
      </div>
      <div class="funnel" id="funnel">
        ${q.funnel.map((e,t)=>`
          ${t>0?`<div class="f-conv"><span></span><div class="arrow">${c(`arrowDown`)}${e.rateKpi&&Number.isFinite(e.rate)?`<b style="color:var(--text)">${_(M(e.rate))}</b> ${_(B[e.id]||``)} ${m(e.status)} <span class="muted">normal ${_(M(e.good))}</span>`:`<span class="muted">angka belum tersedia</span>`}</div></div>`:``}
          <div class="f-step ${e.rateKpi&&e.rateKpi===Z?`f-leak`:``}">
            <div class="name">${_(e.label)}<small>${_(e.metric)}</small></div>
            <div class="f-track"><div class="f-bar ${e.id===`paid`||q.source[e.id]===`derived`?`est`:``} ${Number.isFinite(e.value)?``:`none`}" style="width:${te(e.value)}%"></div></div>
            <div class="f-val">${Number.isFinite(e.value)?_(d(e.value)):`—`}<small>${e.id===`paid`?`estimasi`:q.source[e.id]===`derived`?`dihitung`:Number.isFinite(e.value)?`dari dashboard`:`tidak ada`}</small></div>
          </div>`).join(``)}
      </div>
    </section>

    <section>
      <div class="page-head" style="margin-bottom:16px"><div class="section-title">Apa yang salah & harus diapakan</div><span class="muted" style="font-size:13px">${q.historyCount>=3?`dibandingkan dengan ${q.historyCount} live sebelumnya`:`perbandingan dengan live sebelumnya aktif setelah 3 live tersimpan (sekarang ${q.historyCount})`}</span></div>
      <div class="insights" data-scroll="stagger">
        ${q.insights.map(e=>`
          <article class="card insight s-${e.severity}">
            <div class="row">${C(e.severity)}<span class="muted" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em">${_(H(e.stage))}</span></div>
            <h3>${_(e.title)}</h3>
            <p>${_(e.why)}</p>
            ${e.actions.length?`<div class="todo-head">Yang harus dilakukan</div><ul class="todo">${e.actions.map(e=>`<li>${V(e)}<span>${_(e.text)}</span></li>`).join(``)}</ul>`:``}
            ${e.tech?`<p class="tech">Angka teknis: ${_(e.tech)}</p>`:``}
          </article>`).join(``)}
      </div>
    </section>

    <section class="card coach" id="coach" hidden></section>

    <section>
      <div class="page-head" style="margin-bottom:16px"><div class="section-title">Detail angka</div><span class="muted" style="font-size:13px">Garis putih = live ini · garis abu = biasanya di tokomu · warna = merah buruk → hijau bagus</span></div>
      ${ne.map(([t,n])=>`
        <div style="margin-bottom:22px">
          <div class="row" style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span class="overline" style="color:var(--text-2)">${_(e[t].label)}</span>${q.stages[t].score==null?``:`<span class="score-pill s-${q.stages[t].grade.status}">${Math.round(q.stages[t].score)}</span>`}</div>
          <div class="kpi-grid" data-scroll="stagger">
            ${n.map(e=>`
              <div class="card kpi">
                <div class="top"><span class="label">${_(e.plain)}</span>${m(e.status)}</div>
                ${S(e.value,e.unit)}
                ${j(e)}
                <div class="why">${_(e.why)}</div>
                <div class="top"><span class="src">${_(e.label)} · ${e.source===`reported`?`dari dashboard`:e.source===`estimate`?`estimasi`:`dihitung`}</span>${Number.isFinite(e.delta)?`<span class="delta ${e.higher===e.delta>0?`up`:`down`}" style="font-size:12px;font-weight:700">${f(e.delta)} vs median</span>`:``}</div>
              </div>`).join(``)}
          </div>
        </div>`).join(``)||`<div class="card empty"><p>Belum ada KPI yang bisa dinilai. Tambahkan screenshot dengan 16 metrik inti.</p></div>`}
    </section>

    ${K.snapshots.length>1?`
    <section class="card" data-scroll>
      <div class="card-head"><div><div class="card-title">Perjalanan live ini</div><div class="card-sub">GMV kumulatif per screenshot${q.momentum?` · momentum ${q.momentum.gmvChange>=0?`naik`:`turun`} ${Math.abs(Math.round(q.momentum.gmvChange*100))}% di interval terakhir`:``}</div></div></div>
      <div id="snap-chart"></div>
    </section>`:``}

    <section class="card" data-scroll>
      <div class="card-head"><div><div class="card-title">Screenshot & data</div><div class="card-sub">${K.snapshots.length} snapshot · angka final memakai nilai terbaru</div></div></div>
      <div class="table-wrap"><table class="t">
        <thead><tr><th>Waktu</th><th>Sumber</th><th class="n">GMV</th><th class="n">Views</th><th class="n">Orders</th><th>Gambar</th><th></th></tr></thead>
        <tbody>
          ${K.snapshots.map(e=>`<tr>
            <td>${_(i(e.capturedAt))} · ${_(r(e.capturedAt))}</td>
            <td><span class="src-tag">${_({ocr:`OCR`,ai:`AI Claude`,manual:`manual`,import:`impor`}[e.engine]||e.engine)}</span></td>
            <td class="n">${_(d(e.reported.gmv,`currency`))}</td>
            <td class="n">${_(d(e.reported.views))}</td>
            <td class="n">${_(d(e.reported.orders))}</td>
            <td>${(e.images||[]).map((t,n)=>`<button class="btn btn-sm btn-ghost" data-img="${_(e.id)}:${n}">${c(`image`)}Lihat</button>`).join(``)||`<span class="muted">—</span>`}</td>
            <td class="n">${K.snapshots.length>1?`<button class="btn btn-sm btn-ghost" data-del-snap="${_(e.id)}" title="Hapus snapshot">${c(`trash`)}</button>`:``}</td>
          </tr>`).join(``)}
        </tbody>
      </table></div>
      ${K.notes||K.snapshots.some(e=>e.note)?`<p class="note" style="margin-top:12px">${c(`edit`)} ${_([K.notes,...K.snapshots.map(e=>e.note)].filter(Boolean).join(` · `))}</p>`:``}
    </section>

    <details class="card more" data-scroll>
      <summary>${c(`chevron`)}Semua angka (${Q.length})</summary>
      <div class="table-wrap" style="margin-top:12px"><table class="t">
        <thead><tr><th>Metrik</th><th>Sumber</th><th class="n">Nilai</th><th>Rumus</th></tr></thead>
        <tbody>${Q.map(e=>`<tr><td>${_(h(e))}</td><td><span class="src-tag ${q.source[e]}">${q.source[e]===`reported`?`dashboard`:q.source[e]===`estimate`?`estimasi`:`dihitung`}</span></td><td class="n">${_(d(J[e],g(e)===`hours`?`hours`:g(e),{full:g(e)===`currency`}))}</td><td class="formula">${q.source[e]!==`reported`&&p[e]?_(p[e].formula):``}</td></tr>`).join(``)}</tbody>
      </table></div>
    </details>
  </div>`;let $=y(`#snap-chart`,T);$&&F($,K.snapshots.map(e=>({label:r(e.capturedAt),sub:i(e.capturedAt),y:e.reported.gmv,title:`Views ${d(e.reported.views)} · Orders ${d(e.reported.orders)}`})),{unit:`currency`,title:`GMV kumulatif`}),T.querySelectorAll(`[data-img]`).forEach(e=>e.addEventListener(`click`,()=>{let[t,n]=e.dataset.img.split(`:`),r=K.snapshots.find(e=>e.id===t)?.images?.[+n];r&&window.open(URL.createObjectURL(r),`_blank`,`noopener`)})),T.querySelectorAll(`[data-del-snap]`).forEach(e=>e.addEventListener(`click`,async()=>{confirm(`Hapus snapshot ini? Angka live akan dihitung ulang dari snapshot lain.`)&&(await O(e.dataset.delSnap),b(`Snapshot dihapus`),z(T,{id:A}))})),y(`#btn-del`,T).addEventListener(`click`,async()=>{confirm(`Hapus live "${K.title||`tanpa judul`}" beserta ${K.snapshots.length} screenshot-nya? Tindakan ini tidak bisa dibatalkan.`)&&(await E(K.id),b(`Live dihapus`),location.hash=`#/history`)}),y(`#btn-edit`,T).addEventListener(`click`,async()=>{let e=prompt(`Judul live`,K.title||``);if(e===null)return;let t=prompt(`Nama host`,K.host||``);if(t===null)return;let{snapshots:n,reported:r,...i}=K;await k({...i,title:e.trim(),host:t.trim()}),z(T,{id:A})}),y(`#btn-coach`,T).addEventListener(`click`,()=>W(T,R,q,K)),l(T,()=>{let e=o.timeline();e.from(`#hero`,{y:30,autoAlpha:0,scale:.98,duration:.8,ease:`expo.out`}),e.add(a(`.gauge-arc`,{duration:1.6}),.2);let r=T.querySelector(`.gauge .score`);if(Number.isFinite(q.health.score)){let t={x:0};e.to(t,{x:q.health.score,duration:1.6,ease:`power2.inOut`,onUpdate:()=>r.textContent=Math.round(t.x)},.2)}let i=s.create(`#hero-title`,{type:`words`,mask:`words`});e.from(i.words,{yPercent:110,stagger:.04,duration:.6,ease:`power4.out`},.35),e.from(`.result-hero .summary, .result-hero .grade`,{autoAlpha:0,y:10,duration:.5},.6),n(T.querySelector(`.hero-kpis`),{delay:.5}),o.from(`.f-bar`,{scaleX:0,duration:1.1,stagger:.08,ease:`expo.out`,scrollTrigger:{trigger:`#funnel`,start:`top 85%`,once:!0}}),T.querySelectorAll(`.kpi-grid`).forEach(e=>n(e,{delay:.2})),t(T),I.fresh&&(x.pulse(),o.fromTo(`.now-card`,{boxShadow:`0 0 0 0 rgba(69,171,170,.6)`},{boxShadow:`0 0 0 18px rgba(69,171,170,0)`,duration:1.4,delay:1.2,repeat:1}))}),w()&&T.querySelectorAll(`.gauge .score`).forEach(e=>e.textContent=Number.isFinite(q.health.score)?Math.round(q.health.score):`–`)}var B={views:`orang di FYP yang masuk`,views1min:`penonton yang betah`,productClicks:`penonton yang klik keranjang`,orders:`klik yang jadi pesanan`,paid:`pesanan yang dibayar`};function V(e){let t=String(e.who||``).toLowerCase();return`<span class="act-tag who-${_(t)}">${_(e.who)} · ${_(e.tag)}</span>`}function H(e){return{traffic:`Penonton masuk`,retention:`Penonton betah`,interest:`Klik produk`,conversion:`Pembelian`,ads:`Iklan`,engagement:`Interaksi`,history:`Dibanding biasanya`,momentum:`Selama live`,summary:`Ringkasan`,data:`Data`}[e]||e}function U(e,t,n,r){let i=I(t,e).slice(-r).map(e=>R(e.reported).values[n]);return i.filter(Number.isFinite).length>=3?A(i):null}async function W(e,t,n,r){let i=y(`#coach`,e);if(!t.apiKey)b(`Isi API key Claude di Pengaturan untuk memakai Analisa AI.`,`err`,5e3);else{i.hidden=!1,i.innerHTML=`<div class="card-head"><div><div class="card-title">${c(`sparkle`)} Analisa AI</div><div class="card-sub">Claude sedang membaca angka & temuan…</div></div></div>
    <div class="body"><div class="skeleton" style="height:18px;width:80%"></div><div class="skeleton" style="height:18px;width:65%"></div><div class="skeleton" style="height:80px"></div></div>`,i.scrollIntoView({behavior:w()?`auto`:`smooth`,block:`start`});try{let e=await T({apiKey:t.apiKey,analysis:n,live:r,history:n.historyCount});i.innerHTML=`<div class="card-head"><div><div class="card-title">${c(`sparkle`)} Analisa AI</div><div class="card-sub">oleh Claude · berdasarkan angka live ini & ${n.historyCount} live sebelumnya</div></div></div>
      <div class="body">
        <p style="font-size:16px;font-weight:600">${_(e.ringkasan)}</p>
        <div class="grid-2">${e.diagnosa.map(e=>`<div class="mx" style="grid-template-columns:1fr"><div><h4>${_(e.judul)}</h4><p>${_(e.penjelasan)}</p></div></div>`).join(``)}</div>
        <div class="grid-2">
          <div><h4>Sekarang, saat live</h4><ul class="todo">${e.aksi_sekarang.map(e=>`<li>${V({who:e.untuk,tag:e.topik})}<span>${_(e.tindakan)}</span></li>`).join(``)}</ul></div>
          <div><h4>Untuk live berikutnya</h4><ul>${e.untuk_live_berikutnya.map(e=>`<li>${_(e)}</li>`).join(``)}</ul></div>
        </div>
      </div>`,w()||o.from(i.querySelectorAll(`.body > *`),{autoAlpha:0,y:14,stagger:.08,duration:.5})}catch(e){i.innerHTML=`<div class="card-head"><div class="card-title">${c(`alert`)} Analisa AI gagal</div></div><p class="note warn">${_(e.message||e)}</p>`}}}export{z as render};