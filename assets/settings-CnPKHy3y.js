import{A as e,D as t,L as n,O as r,P as i,R as a,T as o,g as s,h as c,k as l,m as u,p as d}from"./index-lRPGeIFB.js";import{a as f,i as p,t as m}from"./db-DUo1pQDD.js";var h={percent:`%`,duration:`detik`,ratio:`×`,currency:`Rp`,count:``};async function g(_){let v=o(),y=v.kpiOverrides||{},b=r.filter(e=>e.id!==`roi`),x=(e,t)=>y[e.id]?.[t]??e[t];_.innerHTML=`
  <div class="page">
    <div class="page-head" data-reveal>
      <div><div class="overline">Pengaturan</div><h1 class="page-title">Sesuaikan dengan tokomu</h1>
      <p class="page-desc">Semua pengaturan & data tersimpan di browser ini saja. Gunakan ekspor/impor untuk memindahkan ke komputer lain.</p></div>
    </div>

    <section class="card" data-reveal>
      <div class="card-head"><div><div class="card-title">Mesin pembaca screenshot</div><div class="card-sub">OCR gratis berjalan di browser tanpa internet tambahan. AI Claude lebih tahan terhadap tampilan yang berbeda & menulis analisa naratif.</div></div></div>
      <div class="seg" id="engine" role="group" aria-label="Mesin pembaca">
        <button type="button" data-engine="ocr" class="${v.engine===`ai`?``:`on`}">OCR gratis (Tesseract)</button>
        <button type="button" data-engine="ai" class="${v.engine===`ai`?`on`:``}">AI Claude</button>
      </div>
      <div class="field" style="margin-top:18px;max-width:640px">
        <label for="key">API key Anthropic (untuk mode AI & tombol "Analisa AI")</label>
        <div class="key-row">
          <input class="input" id="key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-..." value="${s(v.apiKey)}" />
          <button class="btn" type="button" id="key-show">${i(`eye`)}</button>
          <button class="btn btn-primary" type="button" id="key-save">Simpan</button>
        </div>
        <p class="note">Key disimpan di browser ini (localStorage) dan dikirim langsung ke api.anthropic.com saat analisa AI. Buat key khusus dengan batas pemakaian di console.anthropic.com, dan jangan simpan key di komputer yang dipakai bersama orang yang tidak dipercaya.</p>
        <p class="note">Model: Claude Opus 5.5. Perkiraan biaya ±Rp300–800 per screenshot; Analisa AI sedikit lebih mahal.</p>
        ${v.apiKey?`<button class="btn btn-sm btn-danger" type="button" id="key-del" style="width:fit-content">${i(`trash`)}Hapus key</button>`:``}
      </div>
    </section>

    <form class="card" id="targets" data-reveal>
      <div class="card-head"><div><div class="card-title">Target bisnis</div><div class="card-sub">Dipakai untuk menilai iklan & membandingkan dengan histori.</div></div></div>
      <div class="grid-3">
        <div class="field"><label for="t-be">ROI titik impas</label><input class="input" id="t-be" type="number" step="0.1" min="0" value="${v.breakEvenRoi}" /><span class="note">= 1 ÷ margin kotor. Margin 33% → 3.</span></div>
        <div class="field"><label for="t-roi">ROI target</label><input class="input" id="t-roi" type="number" step="0.1" min="0" value="${v.targetRoi}" /><span class="note">ROI ≥ 1.5× target dianggap layak tambah budget.</span></div>
        <div class="field"><label for="t-aov">AOV dianggap "harga tinggi" (Rp)</label><input class="input" id="t-aov" type="number" step="1000" min="0" value="${v.highTicketAov}" /></div>
        <div class="field"><label for="t-win">Jumlah live pembanding</label><input class="input" id="t-win" type="number" min="3" max="60" value="${v.historyWindow}" /><span class="note">Median dari N live terakhir.</span></div>
        <div class="field"><label for="t-dev">Ambang "jomplang" vs median (%)</label><input class="input" id="t-dev" type="number" min="5" max="200" value="${Math.round(v.deviationThreshold*100)}" /></div>
        <div class="field"><label for="t-studio">Nama toko / studio</label><input class="input" id="t-studio" maxlength="60" value="${s(v.studio)}" /></div>
      </div>
      <div class="btn-row" style="margin-top:18px;justify-content:flex-end"><button class="btn btn-primary" type="submit">Simpan target</button></div>
    </form>

    <form class="card" id="bench" data-reveal>
      <div class="card-head"><div><div class="card-title">Patokan KPI</div><div class="card-sub">Batas kritis / waspada / bagus. Patokan awal bersifat umum — ubah sesuai kategori & harga produkmu.</div></div>
        <button class="btn btn-sm btn-ghost" type="button" id="bench-reset">${i(`refresh`)}Kembalikan default</button></div>
      <div class="table-wrap"><table class="t bench-table">
        <thead><tr><th>Tahap</th><th>KPI</th><th class="n">Kritis</th><th class="n">Waspada</th><th class="n">Bagus</th><th>Satuan</th></tr></thead>
        <tbody>
          ${b.map(t=>`<tr>
            <td class="dim">${s(e[t.stage].label)}</td>
            <td><b>${s(t.label)}</b><div class="note">${t.higher?`makin tinggi makin bagus`:`makin rendah makin bagus`}</div></td>
            ${[`critical`,`warning`,`good`].map(e=>`<td class="n"><input class="input" type="number" step="any" data-k="${t.id}" data-f="${e}" value="${x(t,e)}" aria-label="${s(t.label)} ${e}" /></td>`).join(``)}
            <td class="dim">${h[t.unit]}</td>
          </tr>`).join(``)}
        </tbody>
      </table></div>
      <div class="btn-row" style="margin-top:18px;justify-content:flex-end"><button class="btn btn-primary" type="submit">Simpan patokan</button></div>
    </form>

    <section class="card" data-reveal>
      <div class="card-head"><div><div class="card-title">Data</div><div class="card-sub">Cadangkan rutin. Ekspor JSON berisi semua live & angka (tanpa gambar screenshot).</div></div></div>
      <div class="btn-row">
        <button class="btn" id="exp">${i(`download`)}Ekspor JSON</button>
        <label class="btn" for="imp-file">${i(`upload`)}Impor JSON</label><input id="imp-file" type="file" accept="application/json,.json" hidden />
        <a class="btn" href="#/history">${i(`file`)}Ekspor CSV di Riwayat</a>
        <button class="btn btn-danger" id="wipe">${i(`trash`)}Hapus semua data</button>
      </div>
    </section>
  </div>`,_.querySelectorAll(`[data-engine]`).forEach(e=>e.addEventListener(`click`,()=>{e.dataset.engine===`ai`&&!o().apiKey?d(`Simpan API key dulu untuk mengaktifkan mode AI.`,`err`):(t({engine:e.dataset.engine}),_.querySelectorAll(`[data-engine]`).forEach(t=>t.classList.toggle(`on`,t===e)),d(e.dataset.engine===`ai`?`Mode AI Claude aktif`:`Mode OCR gratis aktif`))})),u(`#key-show`,_).addEventListener(`click`,()=>{let e=u(`#key`,_);e.type=e.type===`password`?`text`:`password`}),u(`#key-save`,_).addEventListener(`click`,()=>{let e=u(`#key`,_).value.trim();e&&!/^sk-ant-/.test(e)?d(`Format key tidak dikenali (harus diawali sk-ant-).`,`err`):(t({apiKey:e,engine:e?o().engine:`ocr`}),d(e?`API key disimpan di browser ini`:`API key dikosongkan`),g(_))}),u(`#key-del`,_)?.addEventListener(`click`,()=>{t({apiKey:``,engine:`ocr`}),d(`API key dihapus dari browser ini`),g(_)}),u(`#targets`,_).addEventListener(`submit`,e=>{e.preventDefault();let n=(e,t)=>{let n=parseFloat(u(e,_).value);return Number.isFinite(n)&&n>=0?n:t};t({breakEvenRoi:n(`#t-be`,l.breakEvenRoi),targetRoi:n(`#t-roi`,l.targetRoi),highTicketAov:n(`#t-aov`,l.highTicketAov),historyWindow:Math.max(3,Math.round(n(`#t-win`,l.historyWindow))),deviationThreshold:Math.max(.05,n(`#t-dev`,30)/100),studio:u(`#t-studio`,_).value.trim()}),d(`Target disimpan — semua live dinilai ulang`)}),u(`#bench`,_).addEventListener(`submit`,e=>{e.preventDefault();let n={};for(let e of _.querySelectorAll(`[data-k]`)){let t=r.find(t=>t.id===e.dataset.k),i=parseFloat(e.value);Number.isFinite(i)&&i!==t[e.dataset.f]&&((n[t.id]||={})[e.dataset.f]=i)}for(let[e,t]of Object.entries(n)){let n=r.find(t=>t.id===e),i=t.critical??n.critical,a=t.warning??n.warning,o=t.good??n.good;if(!(n.higher?i<=a&&a<=o:i>=a&&a>=o)){d(`Urutan patokan ${n.label} tidak masuk akal (${n.higher?`kritis ≤ waspada ≤ bagus`:`kritis ≥ waspada ≥ bagus`}).`,`err`,5e3);return}}t({kpiOverrides:n}),d(`Patokan disimpan`)}),u(`#bench-reset`,_).addEventListener(`click`,()=>{t({kpiOverrides:{}}),d(`Patokan dikembalikan ke default`),g(_)}),u(`#exp`,_).addEventListener(`click`,async()=>{let e=await p();c(`livepulse-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(e,null,2))}),u(`#imp-file`,_).addEventListener(`change`,async e=>{let t=e.target.files[0];if(t){try{let e=await f(JSON.parse(await t.text()));d(`Impor selesai: ${e.lives} live, ${e.snaps} snapshot`)}catch(e){d(e.message||`File tidak valid`,`err`,5e3)}e.target.value=``}}),u(`#wipe`,_).addEventListener(`click`,async()=>{confirm(`Hapus SEMUA live dan screenshot dari browser ini? Ekspor JSON dulu bila ingin menyimpan cadangan.`)&&(await m(),d(`Semua data dihapus`))}),a(_,()=>n(_))}export{g as render};