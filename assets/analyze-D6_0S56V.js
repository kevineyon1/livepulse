import{C as e,E as t,H as n,J as r,L as i,P as a,R as o,S as s,T as c,U as l,V as u,_ as d,g as f,i as p,l as m,m as h,o as g,p as _,q as v,r as y,s as b,t as x,u as S,w as C,x as w,z as T}from"./index-lRPGeIFB.js";import{n as E}from"./ai-IaZQhu_X.js";import{c as D,l as O,o as k,s as A}from"./db-DUo1pQDD.js";var j=[[`prepare`,`Menyiapkan gambar`],[`engine`,`Memuat mesin OCR`],[`read`,`Membaca semua teks`],[`match`,`Mencocokkan label metrik`],[`refine`,`Membaca ulang setiap angka`]],M=[[`prepare`,`Menyiapkan gambar`],[`ai`,`Claude membaca screenshot`]];async function N(N,{q:R={}}={}){let z=c(),B=await k(),V={images:[],urls:[],active:0,result:{},dims:[],engine:z.engine===`ai`&&z.apiKey?`ai`:`ocr`,targetLiveId:null,busy:!1},H=e(()=>{if(V.busy)return;let e=C();e.images.length&&Y(e.images,e.liveId)}),U=new MutationObserver(()=>{(!N.isConnected||!N.querySelector(`[data-analyze]`))&&(H(),U.disconnect(),V.urls.forEach(e=>URL.revokeObjectURL(e)))});U.observe(N,{childList:!0});let W=C();W.images.length?Y(W.images,W.liveId):R.manual?X():(R.live&&(V.targetLiveId=R.live),G());function G(){v.setEnergy(0),N.innerHTML=`
    <div class="page" data-analyze>
      <div class="page-head" data-reveal>
        <div>
          <div class="overline">Analisa baru</div>
          <h1 class="page-title">Tempel screenshot dashboard LIVE</h1>
          <p class="page-desc">Bisa 1–4 screenshot sekaligus (mis. bila metrik terbagi di dua layar). Pastikan kartu GMV dan 16 metrik inti terlihat jelas.</p>
        </div>
        <div class="seg" role="group" aria-label="Mesin pembaca">
          <button data-engine="ocr" class="${V.engine===`ocr`?`on`:``}">OCR gratis</button>
          <button data-engine="ai" class="${V.engine===`ai`?`on`:``}">AI Claude</button>
        </div>
      </div>
      <label class="drop card" id="drop" tabindex="0" data-reveal style="min-height:360px">
        <input type="file" accept="image/*" multiple hidden id="file" />
        <div class="drop-icon">${a(`clipboard`)}</div>
        <strong>Tekan <span class="kbd">Ctrl</span>+<span class="kbd">V</span> untuk menempel</strong>
        <small>atau seret file ke sini · atau klik untuk memilih</small>
        <span class="btn btn-primary" style="margin-top:8px">${a(`upload`)}Pilih screenshot</span>
        ${V.targetLiveId?`<small style="margin-top:8px">${a(`layers`)} Akan ditambahkan sebagai snapshot ke live yang dipilih</small>`:``}
      </label>
      <div class="grid-3" data-reveal>
        <div class="card tip">${a(`eye`)}<h4>Bahasa Inggris, zoom 100%</h4><p>OCR paling akurat dengan dashboard berbahasa Inggris dan tidak di-zoom out.</p></div>
        <div class="card tip">${a(`clock`)}<h4>Tiap 30–60 menit</h4><p>Beberapa screenshot dalam satu live membuat sistem bisa membaca momentum penjualan.</p></div>
        <div class="card tip">${a(`check`)}<h4>Selalu dicek</h4><p>Sebelum disimpan kamu bisa memeriksa & membetulkan setiap angka yang terbaca.</p></div>
      </div>
      <div style="text-align:center"><a href="#/analyze?manual=1" class="btn btn-ghost">${a(`edit`)}Isi angka manual tanpa screenshot</a></div>
    </div>`;let e=h(`#file`,N),t=h(`#drop`,N);e.addEventListener(`change`,()=>s(e.files,V.targetLiveId)),t.addEventListener(`keydown`,t=>{(t.key===`Enter`||t.key===` `)&&(t.preventDefault(),e.click())}),t.addEventListener(`dragenter`,()=>t.classList.add(`over`)),t.addEventListener(`dragleave`,()=>t.classList.remove(`over`)),t.addEventListener(`drop`,e=>{e.preventDefault(),t.classList.remove(`over`),s(e.dataTransfer.files,V.targetLiveId)}),N.querySelectorAll(`[data-engine]`).forEach(e=>e.addEventListener(`click`,()=>{e.dataset.engine===`ai`&&!z.apiKey?_(`Isi API key Claude di Pengaturan untuk memakai mode AI.`,`err`):(V.engine=e.dataset.engine,N.querySelectorAll(`[data-engine]`).forEach(t=>t.classList.toggle(`on`,t===e)))})),o(N,()=>i(N))}function K(){return`
      <div class="shot" id="shot">
        <img id="shot-img" src="${V.urls[V.active]}" alt="Screenshot dashboard yang sedang dianalisa" />
        <div class="shot-boxes" id="boxes"></div>
        <div class="scanline" id="scanline"></div>
      </div>
      ${V.urls.length>1?`<div class="shot-thumbs">${V.urls.map((e,t)=>`<button data-thumb="${t}" class="${t===V.active?`on`:``}" aria-label="Screenshot ${t+1}"><img src="${e}" alt="" /></button>`).join(``)}</div>`:``}`}function q(){N.querySelectorAll(`[data-thumb]`).forEach(e=>e.addEventListener(`click`,()=>{V.active=+e.dataset.thumb,h(`#shot-img`,N).src=V.urls[V.active],N.querySelectorAll(`[data-thumb]`).forEach(t=>t.classList.toggle(`on`,t===e)),J(!1)}))}function J(e=!0,t=null){let n=h(`#boxes`,N);if(!n)return;let i=V.dims[V.active];if(!i)return;let a=e=>`left:${e.x0/i.width*100}%;top:${e.y0/i.height*100}%;width:${(e.x1-e.x0)/i.width*100}%;height:${(e.y1-e.y0)/i.height*100}%`,o=Object.entries(V.result).filter(([e,n])=>n.imageIndex===V.active&&(!t||e===t));t||(n.innerHTML=``);for(let[e,r]of o)r.labelBox&&!t&&n.insertAdjacentHTML(`beforeend`,`<div class="shot-box label" data-lbox="${e}" style="${a(r.labelBox)}"></div>`),r.valueBox&&(n.querySelector(`[data-vbox="${e}"]`)?.remove(),n.insertAdjacentHTML(`beforeend`,`<div class="shot-box" data-vbox="${e}" style="${a(r.valueBox)}"><span class="tag">${f(m[e]?.label??e)}</span></div>`));let s=t?n.querySelectorAll(`[data-vbox="${t}"]`):n.querySelectorAll(`.shot-box`);e&&!T()?r.fromTo(s,{autoAlpha:0,scale:.85},{autoAlpha:1,scale:1,duration:.45,stagger:.02,ease:`back.out(2)`}):r.set(s,{autoAlpha:1}),n.querySelectorAll(`.tag`).forEach(e=>r.set(e,{autoAlpha:0}))}async function Y(e,t){V.busy=!0,V.urls.forEach(e=>URL.revokeObjectURL(e)),V.images=e,V.urls=e.map(e=>URL.createObjectURL(e)),V.active=0,V.result={},V.dims=[],t&&(V.targetLiveId=t);let n=V.engine===`ai`?M:j;N.innerHTML=`
    <div class="page" data-analyze>
      <div class="page-head">
        <div>
          <div class="overline">${V.engine===`ai`?`Mode AI Claude`:`Mode OCR gratis · diproses di browser`}</div>
          <h1 class="page-title">Membaca dashboard…</h1>
        </div>
      </div>
      <div class="analyze-grid">
        <div class="shot-stage">${K()}</div>
        <div class="card">
          <div class="progress-steps" id="steps">
            ${n.map(([e,t])=>`<div class="pstep" data-step="${e}"><span class="ic">${a(`check`)}</span><span>${t}</span></div>`).join(``)}
          </div>
          <div class="bar" style="margin-top:20px"><i id="pbar"></i></div>
          <div class="live-read" id="live-read" aria-live="polite"></div>
        </div>
      </div>
    </div>`,q(),N.querySelectorAll(`.pstep .ic svg`).forEach(e=>e.style.display=`none`),v.setEnergy(1);let i=h(`#scanline`,N),o=null;if(!T()){let e=()=>h(`#shot`,N)?.clientHeight||400;r.set(i,{autoAlpha:1}),o=r.fromTo(i,{y:-120},{y:()=>e(),duration:1.8,ease:`sine.inOut`,repeat:-1,yoyo:!0})}let s=n.map(e=>e[0]),c=-1,d=e=>{let t=s.indexOf(e);t<0||t<c||(c=t,N.querySelectorAll(`.pstep`).forEach((e,n)=>{e.classList.toggle(`done`,n<t),e.classList.toggle(`on`,n===t);let r=e.querySelector(`svg`);r&&(r.style.display=n<t?``:`none`)}))},p=h(`#pbar`,N),g=e=>r.to(p,{width:`${Math.round(e*100)}%`,duration:.4,ease:`power2.out`}),y=h(`#live-read`,N),b=(e,t)=>{if(t==null||!m[e])return;let n=y.querySelector(`[data-read="${e}"]`);n||(y.insertAdjacentHTML(`beforeend`,`<div data-read="${e}"><span>${f(m[e].label)}</span><b></b></div>`),n=y.lastElementChild,T()||r.from(n,{autoAlpha:0,x:12,duration:.35})),u(n.querySelector(`b`),l(t,m[e].unit))};try{if(V.engine===`ai`){d(`prepare`),g(.15),d(`ai`);let t=r.to({},{duration:14,onUpdate(){g(.15+this.progress()*.75)}}),n=await E(e,z.apiKey);t.kill();for(let[e,t]of Object.entries(n.metrics||{}))typeof t==`number`&&Number.isFinite(t)&&(V.result[e]={value:t,raw:``,conf:.95,imageIndex:0},b(e,t));n.notes&&_(`Catatan AI: ${n.notes}`,`ok`,6e3)}else for(let t=0;t<e.length;t++){V.active=t,e.length>1&&(h(`#shot-img`,N).src=V.urls[t],N.querySelectorAll(`[data-thumb]`).forEach(e=>e.classList.toggle(`on`,+e.dataset.thumb===t)));let n=t/e.length,r=1/e.length,i=await P(e[t]);V.dims[t]=i;let a={},o=await x(e[t],(e,i)=>{if(d(e),e===`engine`&&i?.progress!=null&&g(n+r*.1*i.progress),e===`read`&&g(n+r*.2),e===`match`&&i?.layout){g(n+r*.45);for(let[e,n]of Object.entries(i.layout))a[e]={...n,value:null,imageIndex:t};Object.assign(V.result,Object.fromEntries(Object.entries(a).filter(([e])=>!V.result[e]||V.result[e].value==null))),J(!0)}if(e===`refine`&&i){g(n+r*(.45+.55*(i.done/i.total)));let e=V.result[i.id];e&&e.imageIndex===t&&(Object.assign(e,i.item,{imageIndex:t}),e.value!=null&&(J(!0,i.id),b(i.id,e.value)))}});V.dims[t]={width:o.width,height:o.height};for(let[e,n]of Object.entries(o.metrics)){let r=V.result[e];(!r||r.value==null&&n.value!=null||n.value!=null&&n.conf>(r.conf??0))&&(V.result[e]={...n,imageIndex:t})}J(!0)}g(1),d(s[s.length-1]),N.querySelectorAll(`.pstep`).forEach(e=>{e.classList.add(`done`),e.classList.remove(`on`);let t=e.querySelector(`svg`);t&&(t.style.display=``)}),v.pulse()}catch(n){if(console.error(n),_(n.message||`Gagal membaca screenshot`,`err`,6e3),V.engine===`ai`)return _(`Beralih ke OCR gratis…`,`ok`),V.engine=`ocr`,o?.kill(),V.busy=!1,Y(e,t)}finally{o?.kill(),v.setEnergy(0)}V.busy=!1,Object.values(V.result).filter(e=>e.value!=null).length||_(`Tidak ada metrik yang terbaca. Isi manual atau coba screenshot yang lebih jelas.`,`err`,6e3),setTimeout(X,T()?0:500)}function X(){V.busy=!1;let e=w(),s=B.slice(0,12),c=V.targetLiveId&&B.find(e=>e.id===V.targetLiveId),u=e=>V.result[e]?.value!=null,v=p.filter(e=>u(e.id)).length,x=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16),C=e=>{let t=V.result[e.id],n=t?.value,r=n!=null&&(t.conf??1)<.75,i=n==null?`missing`:r?`unsure`:`read`,a=n==null?`tidak terlihat`:r?`perlu dicek · terbaca "${t.raw}"`:V.engine===`ai`&&!t.valueBox?`dibaca AI`:`terbaca ${Math.round((t.conf??1)*100)}%`;return`<div class="mrow ${i}">
        <div class="top">${e.rec?`<span class="badge16">${e.rec}</span>`:``}<span title="${f(e.label)}">${f(e.label)}</span></div>
        <input class="input" name="m_${e.id}" data-metric="${e.id}" inputmode="decimal" autocomplete="off" value="${n==null?``:f(F(t,e.unit))}" placeholder="${I(e.unit)}" />
        <div class="hint">${f(a)}</div>
      </div>`},T=Object.keys(g).map(e=>[e,p.filter(t=>t.group===e)]).filter(([,e])=>e.length),E=S.filter(e=>u(e.id)),k=S.filter(e=>!u(e.id));if(N.innerHTML=`
    <div class="page" data-analyze>
      <div class="page-head" data-reveal>
        <div>
          <div class="overline">Periksa sebelum disimpan</div>
          <h1 class="page-title">${V.images.length?`Cek angka yang terbaca`:`Isi angka dari dashboard`}</h1>
          <p class="page-desc">Kotak hijau = terbaca yakin, kuning = sebaiknya dicek, putus-putus = tidak ditemukan. Klik kolom untuk melihat posisinya di screenshot.</p>
        </div>
      </div>
      <div class="analyze-grid">
        ${V.images.length?`<div class="shot-stage" data-reveal>${K()}</div>`:``}
        <form class="card review-form" id="form" data-reveal ${V.images.length?``:`style="grid-column:1/-1"`}>
          <div class="cov">
            <div><div class="label">Metrik inti terisi</div><div style="font-weight:800;font-size:22px"><span id="cov-n">${v}</span>/16</div></div>
            <div class="bar"><i id="cov-bar" style="width:${v/16*100}%"></i></div>
          </div>

          <div class="grid-2">
            <div class="field">
              <label for="f-live">Simpan ke</label>
              <select class="input" id="f-live">
                <option value="">+ Live baru</option>
                ${s.map(e=>`<option value="${f(e.id)}" ${c&&c.id===e.id?`selected`:``}>${f(e.title||`Live`)} · ${f(n(e.date))}</option>`).join(``)}
              </select>
            </div>
            <div class="field">
              <label for="f-at">Waktu screenshot</label>
              <input class="input" type="datetime-local" id="f-at" value="${x}" />
            </div>
          </div>
          <div class="grid-2" id="new-live" ${c?`hidden`:``}>
            <div class="field"><label for="f-title">Judul / tema live</label><input class="input" id="f-title" placeholder="mis. Flash Sale Payday" maxlength="80" /></div>
            <div class="field"><label for="f-host">Host</label><input class="input" id="f-host" list="hosts" placeholder="Nama host" maxlength="40" /><datalist id="hosts">${z.hosts.map(e=>`<option value="${f(e)}">`).join(``)}</datalist></div>
            <div class="field"><label for="f-date">Tanggal live</label><input class="input" type="date" id="f-date" value="${e}" /></div>
            <div class="field"><label for="f-start">Jam mulai (opsional)</label><input class="input" type="time" id="f-start" placeholder="${d()}" /></div>
          </div>

          <div class="mgroup">
            <h4>${a(`coin`)} Kartu atas dashboard</h4>
            <div class="mrows">${b.map(C).join(``)}</div>
          </div>
          ${T.map(([e,t])=>`<div class="mgroup"><h4>${f(g[e].label)}</h4><div class="mrows">${t.map(C).join(``)}</div></div>`).join(``)}
          ${E.length?`<div class="mgroup"><h4>Metrik tambahan yang terbaca</h4><div class="mrows">${E.map(C).join(``)}</div></div>`:``}
          <details class="more mgroup"><summary>${a(`chevron`)}Metrik opsional lain (${k.length})</summary><div class="mrows" style="margin-top:12px">${k.map(C).join(``)}</div></details>

          <div class="field"><label for="f-notes">Catatan (opsional)</label><textarea class="input" id="f-notes" placeholder="mis. ganti host jam 21.00, promo 12.12, budget iklan dinaikkan" maxlength="500"></textarea></div>

          <div class="btn-row" style="justify-content:flex-end">
            <a class="btn btn-ghost" href="#/">Batal</a>
            <button class="btn btn-primary btn-lg" type="submit">${a(`sparkle`)}Analisa & simpan</button>
          </div>
        </form>
      </div>
    </div>`,V.images.length){q();let e=h(`#shot-img`,N),t=()=>{V.dims=V.dims.length?V.dims:V.images.map(()=>({width:e.naturalWidth,height:e.naturalHeight})),J(!1)};e.complete?t():e.addEventListener(`load`,t,{once:!0})}let j=h(`#form`,N),M=h(`#f-live`,N);M.addEventListener(`change`,()=>{h(`#new-live`,N).hidden=!!M.value}),j.addEventListener(`focusin`,e=>{let t=e.target.dataset?.metric;if(N.querySelectorAll(`.shot-box`).forEach(e=>e.classList.remove(`focus`)),!t)return;let n=V.result[t];n&&n.imageIndex!==V.active&&V.urls[n.imageIndex]&&N.querySelector(`[data-thumb="${n.imageIndex}"]`)?.click();let i=N.querySelector(`[data-vbox="${t}"]`);i&&(i.classList.add(`focus`),r.set(i.querySelector(`.tag`),{autoAlpha:1}))}),j.addEventListener(`focusout`,e=>{let t=e.target.dataset?.metric,n=t&&N.querySelector(`[data-vbox="${t}"]`);n&&r.set(n.querySelector(`.tag`),{autoAlpha:0})}),j.addEventListener(`input`,e=>{let t=e.target.dataset?.metric;if(!t)return;let n=m[t],r=y(e.target.value,n.unit),i=e.target.closest(`.mrow`);i.classList.remove(`unsure`,`missing`,`read`),i.classList.add(e.target.value.trim()===``?`missing`:r==null?`unsure`:`read`),i.querySelector(`.hint`).textContent=e.target.value.trim()===``?`kosong`:r==null?`format tidak dikenali`:`= ${l(r,n.unit,{full:!0})}`;let a=p.filter(e=>y(j.querySelector(`[data-metric="${e.id}"]`)?.value,e.unit)!=null).length;h(`#cov-n`,N).textContent=a,h(`#cov-bar`,N).style.width=`${a/16*100}%`}),j.addEventListener(`submit`,async e=>{e.preventDefault();let n={};for(let e of j.querySelectorAll(`[data-metric]`)){let t=m[e.dataset.metric],r=y(e.value,t.unit);r!=null&&(n[t.id]=r)}if(!Object.keys(n).length){_(`Belum ada angka yang diisi.`,`err`);return}let r=j.querySelector(`[type=submit]`);r.disabled=!0;try{let e=M.value;if(!e){let n=h(`#f-host`,N).value.trim(),r=await A({id:O(),title:h(`#f-title`,N).value.trim(),host:n,date:h(`#f-date`,N).value||w(),startTime:h(`#f-start`,N).value||``,notes:h(`#f-notes`,N).value.trim()});t(n),e=r.id}let r=h(`#f-at`,N).value,i=await Promise.all(V.images.map(L));await D({liveId:e,capturedAt:r?new Date(r).toISOString():new Date().toISOString(),reported:n,engine:V.images.length?V.engine:`manual`,note:M.value?h(`#f-notes`,N).value.trim():``,images:i.filter(Boolean)}),location.hash=`#/live/${encodeURIComponent(e)}?fresh=1`}catch(e){console.error(e),_(`Gagal menyimpan: `+(e.message||e),`err`),r.disabled=!1}}),o(N,()=>{i(N),r.from(j.querySelectorAll(`.mrow.read, .mrow.unsure`),{autoAlpha:0,y:10,stagger:.02,duration:.4,delay:.3})})}}async function P(e){try{let t=await createImageBitmap(e),n={width:t.width,height:t.height};return t.close?.(),n}catch{return null}}function F(e,t){return e.raw&&y(e.raw,t)===e.value?e.raw:l(e.value,t,{full:!0})}function I(e){return{percent:`mis. 3.92%`,currency:`mis. 2.36M`,duration:`mis. 21s`,ratio:`mis. 11.27`,count:`mis. 8.42K`}[e]||``}async function L(e){try{let t=await createImageBitmap(e),n=Math.min(1,1400/t.width),r=document.createElement(`canvas`);return r.width=Math.round(t.width*n),r.height=Math.round(t.height*n),r.getContext(`2d`).drawImage(t,0,0,r.width,r.height),await new Promise(e=>r.toBlob(e,`image/jpeg`,.82))}catch{return null}}export{N as render};