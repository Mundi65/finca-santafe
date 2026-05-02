'use strict';
// =====================================================
// APP STATE
// =====================================================
const App = {
  user: null, profile: null, module: 'dashboard',
  db: null, auth: null, storage: null,
  _subs: [], _deferredInstall: null,

  async init() {
    if (typeof firebaseConfig === 'undefined' || firebaseConfig.apiKey === 'TU_API_KEY_AQUI') {
      document.getElementById('loading-screen').innerHTML =
        `<div style="color:#fff;text-align:center;padding:30px;max-width:460px">
          <svg width="64" height="64" viewBox="0 0 100 100"><polygon points="50,5 92,72 8,72" fill="#C8922A"/><polygon points="50,95 8,28 92,28" fill="#C8922A"/></svg>
          <h2 style="color:#C8922A;margin:16px 0 8px;font-size:1.4rem">Finca SantaFe</h2>
          <p style="margin-bottom:12px">Configura Firebase para continuar.</p>
          <p style="opacity:.7;font-size:.84rem">Edita <strong>firebase-config.js</strong> con los datos de tu proyecto Firebase y recarga la página.</p>
        </div>`;
      return;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      App.db = firebase.firestore();
      App.auth = firebase.auth();
      App.storage = firebase.storage();
      App.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      App.auth.onAuthStateChanged(Auth.onAuthChange);
      window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault(); App._deferredInstall = e;
        setTimeout(() => document.getElementById('pwa-prompt').classList.add('show'), 4000);
      });
    } catch(e) {
      console.error(e);
      UI.showToast('Error al iniciar Firebase: ' + e.message, 'err', 7000);
    }
  },

  installPWA() {
    if (!App._deferredInstall) return;
    App._deferredInstall.prompt();
    App._deferredInstall.userChoice.then(() => {
      App._deferredInstall = null;
      document.getElementById('pwa-prompt').classList.remove('show');
    });
  },

  clearSubs() { App._subs.forEach(u => u && u()); App._subs = []; },

  canWrite() { return App.profile && App.profile.nivel <= 2; },
  canDelete() { return App.profile && App.profile.nivel <= 1; },
  isAdmin() { return App.profile && App.profile.nivel === 0; }
};

// =====================================================
// UTILITIES
// =====================================================
const Utils = {
  fmt$: n => {
    if (n === null || n === undefined || isNaN(n)) return '$0.00';
    return '$' + Number(n).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  fmtDate: d => { if (!d) return '—'; const x = new Date(d + 'T00:00:00'); return x.toLocaleDateString('es-EC',{day:'2-digit',month:'2-digit',year:'numeric'}); },
  fmtDateInput: d => { if (!d) return ''; const x = new Date(d + 'T00:00:00'); return x.toISOString().split('T')[0]; },
  today: () => new Date().toISOString().split('T')[0],
  thisMonth: () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; },
  daysBetween: (d1, d2) => Math.max(0, Math.round((new Date(d2) - new Date(d1)) / 86400000)),
  initials: name => (name||'?').trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2),
  monthName: m => ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m],
  monthShort: m => ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][m],
  sanitize: s => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'),
  uid: () => Math.random().toString(36).slice(2,10),

  catLabel: c => ({alimentacion:'Alimentación',veterinario:'Veterinario',mano_obra:'Mano de Obra',
    combustible:'Combustible',insumos:'Insumos Agrícolas',mantenimiento:'Mantenimiento',
    servicios:'Servicios',otros:'Otros'}[c]||c||'—'),
  ingresoLabel: c => ({venta_ganado:'Venta Ganado',venta_leche:'Venta Leche',venta_cosecha:'Venta Cosecha',
    servicios:'Servicios',subsidios:'Subsidios',otros:'Otros'}[c]||c||'—'),
  especieLabel: e => ({bovino:'Bovino',porcino:'Porcino',ovino:'Ovino',caprino:'Caprino',
    equino:'Equino',aves:'Aves',otros:'Otros'}[e]||e||'—'),
  estadoLabel: s => ({activo:'Activo',vendido:'Vendido',muerto:'Muerto',otro:'Otro'}[s]||s||'—'),
  estadoBadge: s => ({activo:'b-ok',vendido:'b-azul',muerto:'b-rojo',otro:'b-gris'}[s]||'b-gris'),
  tareaLabel: t => ({riego:'Riego',fertilizacion:'Fertilización',fumigacion:'Fumigación',
    siembra:'Siembra',cosecha:'Cosecha',mantenimiento:'Mantenimiento',otro:'Otro'}[t]||t||'—'),
  eventoLabel: t => ({visita:'Visita',vacunacion:'Vacunación',pago:'Pago',cosecha:'Cosecha',reunion:'Reunión',otro:'Otro'}[t]||t||'—'),
  levelLabel: n => (['Propietario','Administrador','Empleado','Visitante'][n]||'Desconocido'),
  levelClass: n => (['ul0','ul1','ul2','ul3'][n]||''),
  contactoLabel: t => ({proveedor:'Proveedor',cliente:'Cliente',veterinario:'Veterinario',
    empleado:'Empleado',transporte:'Transporte',otro:'Otro'}[t]||t||'—'),
  lotEstadoLabel: s => ({preparacion:'Preparación',siembra:'Siembra',cultivo:'Cultivo',
    cosecha:'Cosecha',descanso:'Descanso'}[s]||s||'—'),
  lotEstadoBadge: s => ({preparacion:'b-gris',siembra:'b-azul',cultivo:'b-ok',cosecha:'b-dor',descanso:'b-nar'}[s]||'b-gris'),

  async compressImg(file, maxW=900, maxH=700, q=0.76) {
    return new Promise(resolve => {
      const r = new FileReader();
      r.onload = e => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxW) { h = Math.round(h*maxW/w); w = maxW; }
          if (h > maxH) { w = Math.round(w*maxH/h); h = maxH; }
          const c = document.createElement('canvas'); c.width=w; c.height=h;
          c.getContext('2d').drawImage(img,0,0,w,h);
          resolve(c.toDataURL('image/jpeg', q));
        };
        img.src = e.target.result;
      };
      r.readAsDataURL(file);
    });
  },

  async uploadImg(file, path) {
    try {
      const ref = App.storage.ref(path);
      await ref.put(file);
      return await ref.getDownloadURL();
    } catch(e) {
      return Utils.compressImg(file);
    }
  },

  fillMonthSelect(sel, valAttr) {
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = `<option value="">Todos los meses</option>`;
    const now = new Date();
    for (let i = 0; i < 18; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const v = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      sel.innerHTML += `<option value="${v}">${Utils.monthName(d.getMonth())} ${d.getFullYear()}</option>`;
    }
    if (cur) sel.value = cur;
  },

  debounce(fn, ms=300) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(()=>fn(...a), ms); };
  }
};

// =====================================================
// CHARTS (Canvas 2D)
// =====================================================
const Charts = {
  COLORS: ['#1B4332','#C8922A','#52B788','#E9B44C','#0D6EFD','#DC3545','#FD7E14','#6C757D'],

  resize(canvas, h=220) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement ? canvas.parentElement.clientWidth : 300;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
    return { ctx, w, h };
  },

  bar(canvas, labels, datasets, opts={}) {
    if (!canvas) return;
    const H = opts.h || 220;
    const { ctx, w, h } = Charts.resize(canvas, H);
    const pad = { t:20, r:16, b:44, l:62 };
    const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    const maxVal = Math.max(...datasets.flatMap(d=>d.data), 1);

    // Grid
    ctx.strokeStyle='#E9ECEF'; ctx.lineWidth=1;
    for (let i=0;i<=4;i++) {
      const y = pad.t + ch - (i/4)*ch;
      ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(pad.l+cw,y); ctx.stroke();
      ctx.fillStyle='#6C757D'; ctx.font='10px sans-serif'; ctx.textAlign='right';
      const v = (maxVal*i/4); ctx.fillText(v>=1000?Math.round(v/1000)+'k':Math.round(v), pad.l-5, y+3);
    }

    const gw = cw / labels.length;
    const bw = Math.min((gw*0.7)/datasets.length, 28);
    labels.forEach((lbl,li) => {
      const gx = pad.l + li*gw + (gw - bw*datasets.length)/2;
      datasets.forEach((ds,di) => {
        const val = ds.data[li]||0;
        const bh = (val/maxVal)*ch;
        const x = gx + di*bw; const y = pad.t+ch-bh;
        ctx.fillStyle = ds.color || Charts.COLORS[di];
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x,y,bw-2,bh,3); else ctx.rect(x,y,bw-2,bh);
        ctx.fill();
      });
      ctx.fillStyle='#495057'; ctx.font='9px sans-serif'; ctx.textAlign='center';
      ctx.fillText(lbl, pad.l+li*gw+gw/2, h-pad.b+13);
    });

    // Legend
    let lx = pad.l;
    datasets.forEach(ds => {
      ctx.fillStyle = ds.color || Charts.COLORS[0];
      ctx.fillRect(lx, h-12, 11,9);
      ctx.fillStyle='#495057'; ctx.font='9px sans-serif'; ctx.textAlign='left';
      ctx.fillText(ds.label||'', lx+13, h-4);
      lx += (ctx.measureText(ds.label||'').width + 28);
    });
  },

  donut(canvas, labels, data, colors) {
    if (!canvas) return;
    const sz = Math.min(canvas.parentElement?.clientWidth||240, 240);
    const dpr = window.devicePixelRatio||1;
    canvas.style.width=sz+'px'; canvas.style.height=sz+'px';
    canvas.width=sz*dpr; canvas.height=sz*dpr;
    const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
    const total = data.reduce((a,b)=>a+b,0); if(!total)return;
    const cx=sz/2, cy=sz/2, R=sz*0.38, ri=R*0.56;
    let a = -Math.PI/2;
    data.forEach((v,i) => {
      const s=(v/total)*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R,a,a+s);
      ctx.closePath(); ctx.fillStyle=colors?.[i]||Charts.COLORS[i%Charts.COLORS.length]; ctx.fill();
      a+=s;
    });
    ctx.beginPath(); ctx.arc(cx,cy,ri,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
    ctx.fillStyle='#1B4332'; ctx.font=`bold ${sz*0.055}px sans-serif`; ctx.textAlign='center';
    ctx.fillText(total.toLocaleString(), cx, cy+4);

    // Legend below
    const lh = sz + 10;
    canvas.style.height=(sz+labels.length*18)+'px';
    canvas.height=(sz+labels.length*18)*dpr; ctx.scale(dpr,dpr);
    labels.forEach((lbl,i) => {
      ctx.fillStyle=colors?.[i]||Charts.COLORS[i%Charts.COLORS.length];
      ctx.fillRect(10, lh+i*18, 12, 11);
      ctx.fillStyle='#495057'; ctx.font='10px sans-serif'; ctx.textAlign='left';
      const pct = total>0?((data[i]/total)*100).toFixed(1):'0';
      ctx.fillText(`${lbl}: ${pct}%`, 26, lh+i*18+9);
    });
  }
};

// =====================================================
// UI UTILITIES
// =====================================================
const UI = {
  _onSave: null,

  showModal({ title, body, size='', saveLabel='Guardar', hideSave=false, onSave }) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    const box = document.getElementById('modal-box');
    box.className = 'modal' + (size?' modal-'+size:'');
    const saveBtn = document.getElementById('modal-save-btn');
    if (hideSave) saveBtn.classList.add('hidden');
    else { saveBtn.classList.remove('hidden'); saveBtn.textContent = saveLabel; }
    UI._onSave = onSave || null;
    document.getElementById('modal-overlay').classList.add('show');
    // Focus first input
    setTimeout(() => { const inp = document.querySelector('#modal-body input,#modal-body select,#modal-body textarea'); if(inp)inp.focus(); }, 100);
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.remove('show');
    document.getElementById('modal-body').innerHTML = '';
    UI._onSave = null;
  },

  async _doSave() {
    if (!UI._onSave) { UI.closeModal(); return; }
    const btn = document.getElementById('modal-save-btn');
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      const r = await UI._onSave();
      if (r !== false) UI.closeModal();
    } catch(e) {
      console.error(e);
      UI.showToast(e.message || 'Error al guardar', 'err');
    } finally {
      btn.disabled = false;
    }
  },

  showToast(msg, type='suc', ms=3200) {
    const ct = document.getElementById('toast-ct');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { suc:'✓', err:'✕', war:'⚠', inf:'ℹ' };
    t.innerHTML = `<span>${icons[type]||'•'}</span><span>${Utils.sanitize(msg)}</span>`;
    ct.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(8px)'; t.style.transition='all .3s'; setTimeout(()=>t.remove(),320); }, ms);
  },

  confirm(msg, onYes, dangerLabel='Eliminar') {
    UI.showModal({
      title: 'Confirmar acción',
      body: `<div style="text-align:center;padding:10px 0">
        <div style="width:56px;height:56px;border-radius:50%;background:var(--rojo-pale);
          display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:1.6rem">⚠️</div>
        <p style="color:var(--g700);font-size:.92rem;line-height:1.55">${msg}</p>
      </div>`,
      saveLabel: dangerLabel,
      onSave: () => { onYes(); return true; }
    });
    const btn = document.getElementById('modal-save-btn');
    btn.className = 'btn btn-dan';
  },

  loading(show) {
    let el = document.getElementById('ui-loading');
    if (show) {
      if (!el) {
        el = document.createElement('div'); el.id='ui-loading';
        el.style.cssText='position:fixed;inset:0;z-index:800;background:rgba(255,255,255,.55);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)';
        el.innerHTML='<div class="ls-spin"></div>'; document.body.appendChild(el);
      }
    } else { el && el.remove(); }
  }
};

// =====================================================
// AUTH
// =====================================================
const Auth = {
  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('l-email').value.trim();
    const pwd   = document.getElementById('l-pwd').value;
    const btn   = document.getElementById('btn-login');
    const errEl = document.getElementById('lerr');
    errEl.classList.remove('show'); btn.disabled = true; btn.textContent = 'Ingresando…';
    try {
      await App.auth.signInWithEmailAndPassword(email, pwd);
    } catch(er) {
      const msgs = { 'auth/user-not-found':'Usuario no encontrado.','auth/wrong-password':'Contraseña incorrecta.',
        'auth/invalid-email':'Correo inválido.','auth/too-many-requests':'Demasiados intentos. Intenta más tarde.',
        'auth/user-disabled':'Esta cuenta está desactivada.' };
      errEl.textContent = msgs[er.code] || er.message;
      errEl.classList.add('show');
      document.getElementById('l-pwd').classList.add('shake');
      setTimeout(()=>document.getElementById('l-pwd').classList.remove('shake'),400);
    } finally {
      btn.disabled = false; btn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Ingresar`;
    }
  },

  async onAuthChange(user) {
    const ls = document.getElementById('loading-screen');
    if (user) {
      App.user = user;
      await Auth.loadProfile(user.uid);
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('app-screen').classList.remove('hidden');
      Nav.renderNav();
      Nav.updateUser();
      Nav.goTo('dashboard');
      // Update last access
      App.db.collection('usuarios').doc(user.uid).update({ ultimoAcceso: firebase.firestore.FieldValue.serverTimestamp() }).catch(()=>{});
    } else {
      App.user = null; App.profile = null;
      App.clearSubs();
      document.getElementById('app-screen').classList.add('hidden');
      document.getElementById('login-screen').classList.remove('hidden');
    }
    ls.classList.add('fade-out');
    setTimeout(() => ls.style.display='none', 420);
  },

  async loadProfile(uid) {
    try {
      const doc = await App.db.collection('usuarios').doc(uid).get();
      if (doc.exists) {
        App.profile = { id: uid, ...doc.data() };
      } else {
        // Create default profile
        const p = { nombre: App.user.displayName || App.user.email.split('@')[0],
          email: App.user.email, nivel: 3, activo: true, cargo: '',
          telefono: '', creadoEn: firebase.firestore.FieldValue.serverTimestamp() };
        await App.db.collection('usuarios').doc(uid).set(p);
        App.profile = { id: uid, ...p, nivel: 3 };
      }
    } catch(e) { App.profile = { id: uid, nivel: 3, nombre: App.user?.email || 'Usuario' }; }
  },

  async forgotPwd() {
    const email = prompt('Ingresa tu correo electrónico para recuperar acceso:');
    if (!email) return;
    try {
      await App.auth.sendPasswordResetEmail(email.trim());
      UI.showToast('Correo de recuperación enviado a ' + email, 'suc', 5000);
    } catch(e) { UI.showToast('Error: ' + e.message, 'err'); }
  },

  togglePwd() {
    const inp = document.getElementById('l-pwd');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  },

  async logout() {
    Nav.closeUserMenu();
    await App.auth.signOut();
    App.clearSubs();
    UI.showToast('Sesión cerrada', 'inf');
  }
};

// =====================================================
// NAVIGATION
// =====================================================
const Nav = {
  NAV: [
    { id:'dashboard',  label:'Dashboard',   icon:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
    { id:'gastos',     label:'Gastos',      icon:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>' },
    { id:'ingresos',   label:'Ingresos',    icon:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
    { id:'camadas',    label:'Camadas',     icon:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
    { id:'ganado',     label:'Ganado',      icon:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
    { id:'agricola',   label:'Agrícola',    icon:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
    { id:'calendario', label:'Calendario',  icon:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
    { id:'contactos',  label:'Contactos',   icon:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' },
    { id:'reportes',   label:'Reportes',    icon:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>' },
    { id:'admin',      label:'Admin',       icon:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',  adminOnly: true },
    { id:'valentina',  label:'Valentina IA', icon:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="12" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/>' }
  ],

  renderNav() {
    const nav = document.getElementById('sbnav');
    const lvl = App.profile?.nivel ?? 3;
    nav.innerHTML = '';
    Nav.NAV.forEach(item => {
      if (item.adminOnly && lvl > 0) return;
      const el = document.createElement('div');
      el.className = 'ni' + (App.module === item.id ? ' active' : '');
      el.dataset.mod = item.id;
      el.onclick = () => { Nav.goTo(item.id); Nav.closeSidebar(); };
      el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${item.icon}</svg>${item.label}`;
      nav.appendChild(el);
    });
  },

  goTo(id) {
    if (!App.profile) return;
    const lvl = App.profile.nivel ?? 3;
    const item = Nav.NAV.find(n => n.id === id);
    if (!item) return;
    if (item.adminOnly && lvl > 0) { UI.showToast('Sin acceso a ese módulo', 'war'); return; }
    App.clearSubs();
    // Hide all modules
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    const sec = document.getElementById('mod-' + id);
    if (sec) sec.classList.add('active');
    // Update nav
    document.querySelectorAll('.ni').forEach(n => n.classList.toggle('active', n.dataset.mod === id));
    // Update bottom nav
    const bnMap = { dashboard:'bn-dashboard', gastos:'bn-gastos', ganado:'bn-ganado', calendario:'bn-calendario' };
    document.querySelectorAll('.bni').forEach(b => b.classList.remove('active'));
    if (bnMap[id]) document.getElementById(bnMap[id])?.classList.add('active');
    // Update topbar
    document.getElementById('tb-mod').textContent = item.label;
    App.module = id;
    // Load module data
    const loaders = { dashboard:Dashboard.load, gastos:Gastos.load, ingresos:Ingresos.load,
      camadas:Camadas.load, ganado:Ganado.load, agricola:Agricola.load,
      calendario:Calendario.load, contactos:Contactos.load, reportes:Reportes.load, admin:Admin.load, valentina:Valentina.load };
    if (loaders[id]) loaders[id]();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('show');
  },
  closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
  },
  toggleUserMenu() {
    const m = document.getElementById('user-menu');
    m.classList.toggle('show');
    if (m.classList.contains('show')) setTimeout(()=>document.addEventListener('click',Nav._closeMenuOut,{once:true}),0);
  },
  closeUserMenu() { document.getElementById('user-menu').classList.remove('show'); },
  _closeMenuOut(e) { if(!document.getElementById('user-menu').contains(e.target)) Nav.closeUserMenu(); },
  updateUser() {
    const p = App.profile;
    if (!p) return;
    const name = p.nombre || p.email || '?';
    const ini  = Utils.initials(name);
    document.getElementById('tav').textContent = ini;
    document.getElementById('sb-av').textContent = ini;
    document.getElementById('sb-name').textContent = name;
    document.getElementById('sb-level').textContent = Utils.levelLabel(p.nivel);
    document.getElementById('um-name').textContent = name;
    document.getElementById('um-email').textContent = p.email || '';
    document.getElementById('dash-date').textContent = new Date().toLocaleDateString('es-EC',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  }
};

// =====================================================
// DASHBOARD
// =====================================================
const Dashboard = {
  async load() {
    const now = new Date();
    const msInicio = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const msFin    = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-31`;
    try {
      const [gSnap, iSnap, ganSnap, camSnap, lotSnap, tarSnap] = await Promise.all([
        App.db.collection('gastos').where('fecha','>=',msInicio).where('fecha','<=',msFin).get(),
        App.db.collection('ingresos').where('fecha','>=',msInicio).where('fecha','<=',msFin).get(),
        App.db.collection('ganado').where('estado','==','activo').get(),
        App.db.collection('camadas').where('fecha','>=',`${now.getFullYear()}-01-01`).get(),
        App.db.collection('agricola').get(),
        App.db.collection('tareas').where('estado','!=','completada').limit(5).get()
      ]);
      const totalG = gSnap.docs.reduce((a,d)=>a+(d.data().monto||0),0);
      const totalI = iSnap.docs.reduce((a,d)=>a+(d.data().monto||0),0);
      document.getElementById('ds-gastos').textContent  = Utils.fmt$(totalG);
      document.getElementById('ds-gastos').className    = 'sc-val neg money neg';
      document.getElementById('ds-ingresos').textContent= Utils.fmt$(totalI);
      document.getElementById('ds-balance').textContent = Utils.fmt$(totalI - totalG);
      document.getElementById('ds-balance').className   = `sc-val money ${totalI>=totalG?'pos':'neg'}`;
      document.getElementById('ds-ganado').textContent  = ganSnap.size;
      document.getElementById('ds-camadas').textContent = camSnap.size;
      document.getElementById('ds-lotes').textContent   = lotSnap.size;

      // Last gastos
      const lastG = gSnap.docs.slice(0,4);
      const lgEl = document.getElementById('dash-last-gastos');
      lgEl.innerHTML = lastG.length ? lastG.map(d=>{
        const g=d.data();
        return `<div class="flex jc-sb items-c" style="padding:8px 0;border-bottom:1px solid var(--g100)">
          <div><div class="tsm fb">${Utils.sanitize(g.descripcion||'Sin desc.')}</div>
          <div class="txs c-gris">${Utils.fmtDate(g.fecha)} · ${Utils.catLabel(g.categoria)}</div></div>
          <span class="money neg tsm">${Utils.fmt$(g.monto)}</span>
        </div>`;
      }).join('') : '<div class="empty" style="padding:20px;border:none"><p>Sin gastos este mes</p></div>';

      // Pending tareas
      const tarEl = document.getElementById('dash-tareas');
      tarEl.innerHTML = tarSnap.docs.length ? tarSnap.docs.map(d=>{
        const t=d.data();
        return `<div class="tarea ${t.estado||'pendiente'}" style="margin-bottom:6px">
          <div class="tarea-chk">${t.estado==='completada'?'✓':''}</div>
          <div class="tarea-info">
            <div class="tarea-title">${Utils.sanitize(t.titulo||'Tarea')}</div>
            <div class="tarea-meta">${Utils.fmtDate(t.fechaProgramada)} · ${Utils.tareaLabel(t.tipo)}</div>
          </div>
        </div>`;
      }).join('') : '<div class="empty" style="padding:20px;border:none"><p>Sin tareas pendientes</p></div>';

      // Charts
      await Dashboard.renderCharts();
    } catch(e) { console.error('Dashboard load:', e); }
  },

  async renderCharts() {
    try {
      const now = new Date();
      const months = Array.from({length:6},(_,i)=>{
        const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
        return { label: Utils.monthShort(d.getMonth()), year: d.getFullYear(), month: d.getMonth()+1, key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` };
      });
      const ingData = Array(6).fill(0), gasData = Array(6).fill(0), catMap = {};
      const [gSnap, iSnap] = await Promise.all([
        App.db.collection('gastos').where('fecha','>=',months[0].key+'-01').get(),
        App.db.collection('ingresos').where('fecha','>=',months[0].key+'-01').get()
      ]);
      gSnap.docs.forEach(d=>{ const g=d.data(); const k=g.fecha?.slice(0,7); const i=months.findIndex(m=>m.key===k); if(i>=0)gasData[i]+=(g.monto||0); catMap[g.categoria]=(catMap[g.categoria]||0)+(g.monto||0); });
      iSnap.docs.forEach(d=>{ const g=d.data(); const k=g.fecha?.slice(0,7); const i=months.findIndex(m=>m.key===k); if(i>=0)ingData[i]+=(g.monto||0); });

      Charts.bar(document.getElementById('chart-ig'), months.map(m=>m.label), [
        { label:'Ingresos', data:ingData, color:'#1B4332' },
        { label:'Gastos',   data:gasData, color:'#DC3545' }
      ]);

      const catEntries = Object.entries(catMap).filter(([,v])=>v>0);
      if (catEntries.length) {
        Charts.donut(document.getElementById('chart-gastos-cat'),
          catEntries.map(([k])=>Utils.catLabel(k)),
          catEntries.map(([,v])=>v),
          Charts.COLORS);
      }
    } catch(e) { console.error('Dashboard charts:', e); }
  }
};

// =====================================================
// GASTOS
// =====================================================
const Gastos = {
  _data: [], _q: '', _cat: '', _month: '',

  load() {
    Utils.fillMonthSelect(document.getElementById('g-month-filter'));
    const unsub = App.db.collection('gastos').orderBy('fecha','desc').limit(200)
      .onSnapshot(snap => {
        Gastos._data = snap.docs.map(d=>({id:d.id,...d.data()}));
        Gastos.render(); Gastos.stats();
      }, e => console.error(e));
    App._subs.push(unsub);
  },

  filtered() {
    return Gastos._data.filter(g => {
      const q = Gastos._q.toLowerCase();
      if (q && !((g.descripcion||'').toLowerCase().includes(q)||(g.proveedor||'').toLowerCase().includes(q))) return false;
      if (Gastos._cat && g.categoria !== Gastos._cat) return false;
      if (Gastos._month && !(g.fecha||'').startsWith(Gastos._month)) return false;
      return true;
    });
  },

  render() {
    const tbody = document.getElementById('gastos-tbody');
    const list  = Gastos.filtered();
    if (!list.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty" style="border:none;padding:30px"><p>Sin gastos que coincidan</p></div></td></tr>`; return; }
    tbody.innerHTML = list.map(g => `
      <tr>
        <td>${Utils.fmtDate(g.fecha)}</td>
        <td><div class="fb tsm">${Utils.sanitize(g.descripcion||'—')}</div>${g.notas?`<div class="txs c-gris">${Utils.sanitize(g.notas)}</div>`:''}</td>
        <td><span class="badge b-gris">${Utils.catLabel(g.categoria)}</span></td>
        <td>${Utils.sanitize(g.proveedor||'—')}</td>
        <td class="tw"><span class="money neg">${Utils.fmt$(g.monto)}</span></td>
        <td>${g.facturaUrl||g.facturaB64?`<a href="${g.facturaUrl||g.facturaB64}" target="_blank" style="color:var(--azul);font-size:.78rem">Ver</a>`:'—'}</td>
        <td class="ac">
          <button class="bico" onclick="Gastos.openForm('${g.id}')" title="Editar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          ${App.canDelete()?`<button class="bico dan" onclick="Gastos.del('${g.id}')" title="Eliminar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>`:''}
        </td>
      </tr>`).join('');
  },

  stats() {
    const now = Utils.thisMonth();
    const mes = Gastos._data.filter(g => (g.fecha||'').startsWith(now));
    const total = mes.reduce((a,g)=>a+(g.monto||0),0);
    document.getElementById('g-total-mes').textContent = Utils.fmt$(total);
    document.getElementById('g-count-mes').textContent = mes.length;
    const catTotals = {};
    mes.forEach(g => catTotals[g.categoria] = (catTotals[g.categoria]||0) + (g.monto||0));
    const top = Object.entries(catTotals).sort(([,a],[,b])=>b-a)[0];
    document.getElementById('g-mayor-cat').textContent = top ? Utils.catLabel(top[0]) : '—';
  },

  filter(q) { Gastos._q = q; Gastos.render(); },
  filterCat(c) { Gastos._cat = c; Gastos.render(); },
  filterMonth(m) { Gastos._month = m; Gastos.render(); },

  openForm(id = null) {
    if (!App.canWrite()) { UI.showToast('Sin permiso para escribir', 'war'); return; }
    const g = id ? Gastos._data.find(x=>x.id===id) : null;
    UI.showModal({
      title: g ? 'Editar Gasto' : 'Nuevo Gasto',
      size: 'lg',
      body: `
        <div class="fgrid fg2">
          <div class="fg"><label class="flbl">Fecha *</label>
            <input type="date" id="gf-fecha" class="fc" value="${g?.fecha||Utils.today()}" required></div>
          <div class="fg"><label class="flbl">Monto (USD) *</label>
            <input type="number" id="gf-monto" class="fc" value="${g?.monto||''}" step="0.01" min="0" placeholder="0.00" required></div>
        </div>
        <div class="fg"><label class="flbl">Descripción *</label>
          <input type="text" id="gf-desc" class="fc" value="${Utils.sanitize(g?.descripcion||'')}" placeholder="Ej: Compra alimento balanceado" required maxlength="200"></div>
        <div class="fgrid fg2">
          <div class="fg"><label class="flbl">Categoría</label>
            <select id="gf-cat" class="fc">
              ${['alimentacion','veterinario','mano_obra','combustible','insumos','mantenimiento','servicios','otros'].map(c=>`<option value="${c}"${g?.categoria===c?' selected':''}>${Utils.catLabel(c)}</option>`).join('')}
            </select></div>
          <div class="fg"><label class="flbl">Proveedor</label>
            <input type="text" id="gf-prov" class="fc" value="${Utils.sanitize(g?.proveedor||'')}" placeholder="Nombre proveedor" maxlength="100"></div>
        </div>
        <div class="fg"><label class="flbl">Notas</label>
          <textarea id="gf-notas" class="fc" rows="2" placeholder="Observaciones adicionales…">${Utils.sanitize(g?.notas||'')}</textarea></div>
        <div class="fg"><label class="flbl">Foto de factura</label>
          <div class="photo-up" id="gf-photo-area">
            <input type="file" id="gf-factura" accept="image/*,application/pdf" onchange="Gastos._previewFactura(this)">
            <div class="pu-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
            <p>Toca para subir foto o PDF de la factura</p>
            <small>JPG, PNG, PDF · máx 5MB</small>
          </div>
          ${g?.facturaUrl||g?.facturaB64?`<div class="photo-prev"><img src="${g.facturaUrl||g.facturaB64}" alt="Factura"><button class="photo-prev-rm" onclick="Gastos._clearFactura()">✕</button></div>`:'<div id="gf-prev"></div>'}
        </div>`,
      onSave: () => Gastos.save(id)
    });
  },

  _previewFactura(inp) {
    if (!inp.files[0]) return;
    const f = inp.files[0];
    if (f.type.startsWith('image/')) {
      const r = new FileReader(); r.onload = e => {
        const prev = document.getElementById('gf-prev') || (() => { const d=document.createElement('div');d.id='gf-prev';inp.closest('.fg').appendChild(d);return d; })();
        prev.innerHTML = `<div class="photo-prev"><img src="${e.target.result}" style="max-height:160px;object-fit:contain"><button class="photo-prev-rm" type="button" onclick="Gastos._clearFactura()">✕</button></div>`;
      }; r.readAsDataURL(f);
    }
  },
  _clearFactura() {
    document.getElementById('gf-factura').value='';
    const p=document.getElementById('gf-prev'); if(p)p.innerHTML='';
  },

  async save(id) {
    const fecha = document.getElementById('gf-fecha').value;
    const monto = parseFloat(document.getElementById('gf-monto').value);
    const desc  = document.getElementById('gf-desc').value.trim();
    if (!fecha||!desc||isNaN(monto)||monto<0) { UI.showToast('Completa los campos obligatorios','war'); return false; }
    const data = { fecha, monto, descripcion: desc,
      categoria: document.getElementById('gf-cat').value,
      proveedor: document.getElementById('gf-prov').value.trim(),
      notas: document.getElementById('gf-notas').value.trim(),
      uid: App.user.uid, modificadoEn: firebase.firestore.FieldValue.serverTimestamp() };
    const file = document.getElementById('gf-factura')?.files[0];
    if (file) {
      UI.loading(true);
      try { data.facturaB64 = await Utils.compressImg(file, 1000, 800, 0.8); } catch(e){}
      UI.loading(false);
    }
    if (id) { await App.db.collection('gastos').doc(id).update(data); UI.showToast('Gasto actualizado','suc'); }
    else { data.creadoEn = firebase.firestore.FieldValue.serverTimestamp(); await App.db.collection('gastos').add(data); UI.showToast('Gasto registrado','suc'); }
  },

  del(id) {
    UI.confirm('¿Eliminar este gasto? Esta acción no se puede deshacer.', async () => {
      await App.db.collection('gastos').doc(id).delete();
      UI.showToast('Gasto eliminado','suc');
    });
  }
};

// =====================================================
// INGRESOS
// =====================================================
const Ingresos = {
  _data: [], _q: '', _cat: '', _month: '',

  load() {
    Utils.fillMonthSelect(document.getElementById('i-month-filter'));
    const unsub = App.db.collection('ingresos').orderBy('fecha','desc').limit(200)
      .onSnapshot(snap => {
        Ingresos._data = snap.docs.map(d=>({id:d.id,...d.data()}));
        Ingresos.render(); Ingresos.stats();
      }, e=>console.error(e));
    App._subs.push(unsub);
  },

  filtered() {
    return Ingresos._data.filter(g=>{
      const q=Ingresos._q.toLowerCase();
      if(q&&!((g.descripcion||'').toLowerCase().includes(q)||(g.cliente||'').toLowerCase().includes(q)))return false;
      if(Ingresos._cat&&g.categoria!==Ingresos._cat)return false;
      if(Ingresos._month&&!(g.fecha||'').startsWith(Ingresos._month))return false;
      return true;
    });
  },

  render() {
    const tbody=document.getElementById('ingresos-tbody'), list=Ingresos.filtered();
    if(!list.length){tbody.innerHTML=`<tr><td colspan="7"><div class="empty" style="border:none;padding:30px"><p>Sin ingresos registrados</p></div></td></tr>`;return;}
    tbody.innerHTML=list.map(g=>`
      <tr>
        <td>${Utils.fmtDate(g.fecha)}</td>
        <td><div class="fb tsm">${Utils.sanitize(g.descripcion||'—')}</div></td>
        <td><span class="badge b-ok">${Utils.ingresoLabel(g.categoria)}</span></td>
        <td>${Utils.sanitize(g.cliente||'—')}</td>
        <td>${Utils.sanitize(g.comprobante||'—')}</td>
        <td class="tw"><span class="money pos">${Utils.fmt$(g.monto)}</span></td>
        <td class="ac">
          <button class="bico" onclick="Ingresos.openForm('${g.id}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          ${App.canDelete()?`<button class="bico dan" onclick="Ingresos.del('${g.id}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>`:''}
        </td>
      </tr>`).join('');
  },

  stats() {
    const now=Utils.thisMonth(), mes=Ingresos._data.filter(g=>(g.fecha||'').startsWith(now));
    const total=mes.reduce((a,g)=>a+(g.monto||0),0);
    document.getElementById('i-total-mes').textContent=Utils.fmt$(total);
    document.getElementById('i-count-mes').textContent=mes.length;
    const catT={}; mes.forEach(g=>catT[g.categoria]=(catT[g.categoria]||0)+(g.monto||0));
    const top=Object.entries(catT).sort(([,a],[,b])=>b-a)[0];
    document.getElementById('i-mayor-cat').textContent=top?Utils.ingresoLabel(top[0]):'—';
  },

  filter(q){Ingresos._q=q;Ingresos.render();},
  filterCat(c){Ingresos._cat=c;Ingresos.render();},
  filterMonth(m){Ingresos._month=m;Ingresos.render();},

  openForm(id=null) {
    if(!App.canWrite()){UI.showToast('Sin permiso','war');return;}
    const g=id?Ingresos._data.find(x=>x.id===id):null;
    UI.showModal({
      title:g?'Editar Ingreso':'Nuevo Ingreso', size:'lg',
      body:`
        <div class="fgrid fg2">
          <div class="fg"><label class="flbl">Fecha *</label><input type="date" id="if-fecha" class="fc" value="${g?.fecha||Utils.today()}" required></div>
          <div class="fg"><label class="flbl">Monto (USD) *</label><input type="number" id="if-monto" class="fc" value="${g?.monto||''}" step="0.01" min="0" placeholder="0.00" required></div>
        </div>
        <div class="fg"><label class="flbl">Descripción *</label><input type="text" id="if-desc" class="fc" value="${Utils.sanitize(g?.descripcion||'')}" placeholder="Ej: Venta de 5 novillos" required maxlength="200"></div>
        <div class="fgrid fg2">
          <div class="fg"><label class="flbl">Fuente</label>
            <select id="if-cat" class="fc">
              ${['venta_ganado','venta_leche','venta_cosecha','servicios','subsidios','otros'].map(c=>`<option value="${c}"${g?.categoria===c?' selected':''}>${Utils.ingresoLabel(c)}</option>`).join('')}
            </select></div>
          <div class="fg"><label class="flbl">Cliente</label><input type="text" id="if-cli" class="fc" value="${Utils.sanitize(g?.cliente||'')}" placeholder="Nombre del cliente" maxlength="100"></div>
        </div>
        <div class="fg"><label class="flbl">N° Comprobante</label><input type="text" id="if-comp" class="fc" value="${Utils.sanitize(g?.comprobante||'')}" placeholder="Ej: 001-001-000123" maxlength="50"></div>
        <div class="fg"><label class="flbl">Notas</label><textarea id="if-notas" class="fc" rows="2">${Utils.sanitize(g?.notas||'')}</textarea></div>`,
      onSave:()=>Ingresos.save(id)
    });
  },

  async save(id) {
    const fecha=document.getElementById('if-fecha').value, monto=parseFloat(document.getElementById('if-monto').value), desc=document.getElementById('if-desc').value.trim();
    if(!fecha||!desc||isNaN(monto)||monto<0){UI.showToast('Completa campos obligatorios','war');return false;}
    const data={fecha,monto,descripcion:desc,categoria:document.getElementById('if-cat').value,
      cliente:document.getElementById('if-cli').value.trim(),comprobante:document.getElementById('if-comp').value.trim(),
      notas:document.getElementById('if-notas').value.trim(),uid:App.user.uid,modificadoEn:firebase.firestore.FieldValue.serverTimestamp()};
    if(id){await App.db.collection('ingresos').doc(id).update(data);UI.showToast('Ingreso actualizado','suc');}
    else{data.creadoEn=firebase.firestore.FieldValue.serverTimestamp();await App.db.collection('ingresos').add(data);UI.showToast('Ingreso registrado','suc');}
  },

  del(id){UI.confirm('¿Eliminar este ingreso?',async()=>{await App.db.collection('ingresos').doc(id).delete();UI.showToast('Ingreso eliminado','suc');});}
};

// =====================================================
// CAMADAS
// =====================================================
const Camadas = {
  _data:[], _q:'', _esp:'',

  load() {
    const unsub=App.db.collection('camadas').orderBy('fecha','desc').limit(200)
      .onSnapshot(snap=>{Camadas._data=snap.docs.map(d=>({id:d.id,...d.data()}));Camadas.render();Camadas.stats();},e=>console.error(e));
    App._subs.push(unsub);
  },

  filtered(){return Camadas._data.filter(c=>{const q=Camadas._q.toLowerCase();if(q&&!((c.madre||'').toLowerCase().includes(q)||(c.padre||'').toLowerCase().includes(q)))return false;if(Camadas._esp&&c.especie!==Camadas._esp)return false;return true;});},

  render() {
    const tbody=document.getElementById('camadas-tbody'),list=Camadas.filtered();
    if(!list.length){tbody.innerHTML=`<tr><td colspan="9"><div class="empty" style="border:none;padding:30px"><p>Sin camadas registradas</p></div></td></tr>`;return;}
    tbody.innerHTML=list.map(c=>`
      <tr>
        <td>${Utils.fmtDate(c.fecha)}</td>
        <td><span class="badge b-verde">${Utils.especieLabel(c.especie)}</span></td>
        <td>${Utils.sanitize(c.madre||'—')}</td><td>${Utils.sanitize(c.padre||'—')}</td>
        <td class="tw fb">${c.cantidadNacidos||0}</td>
        <td class="tw"><span class="c-ok fb">${c.cantidadVivos||0}</span></td>
        <td class="tw"><span class="c-rojo">${c.cantidadMuertos||0}</span></td>
        <td>${c.pesoPromedio?c.pesoPromedio+' kg':'—'}</td>
        <td class="ac">
          <button class="bico" onclick="Camadas.openForm('${c.id}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          ${App.canDelete()?`<button class="bico dan" onclick="Camadas.del('${c.id}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>`:''}
        </td>
      </tr>`).join('');
  },

  stats(){const total=Camadas._data.length,nacidos=Camadas._data.reduce((a,c)=>a+(c.cantidadNacidos||0),0),vivos=Camadas._data.reduce((a,c)=>a+(c.cantidadVivos||0),0),muertos=Camadas._data.reduce((a,c)=>a+(c.cantidadMuertos||0),0);document.getElementById('c-total').textContent=total;document.getElementById('c-nacidos').textContent=nacidos;document.getElementById('c-vivos').textContent=vivos;document.getElementById('c-muertos').textContent=muertos;},
  filter(q){Camadas._q=q;Camadas.render();},filterEspecie(e){Camadas._esp=e;Camadas.render();},

  openForm(id=null){
    if(!App.canWrite()){UI.showToast('Sin permiso','war');return;}
    const c=id?Camadas._data.find(x=>x.id===id):null;
    UI.showModal({title:c?'Editar Camada':'Nueva Camada',size:'lg',body:`
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Fecha *</label><input type="date" id="cf-fecha" class="fc" value="${c?.fecha||Utils.today()}" required></div>
        <div class="fg"><label class="flbl">Especie</label>
          <select id="cf-esp" class="fc">${['bovino','porcino','ovino','caprino','equino','aves','otros'].map(e=>`<option value="${e}"${c?.especie===e?' selected':''}>${Utils.especieLabel(e)}</option>`).join('')}</select></div>
      </div>
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Madre (hembra)</label><input type="text" id="cf-madre" class="fc" value="${Utils.sanitize(c?.madre||'')}" placeholder="Nombre o arete"></div>
        <div class="fg"><label class="flbl">Padre (macho)</label><input type="text" id="cf-padre" class="fc" value="${Utils.sanitize(c?.padre||'')}" placeholder="Nombre o arete"></div>
      </div>
      <div class="fgrid fg3">
        <div class="fg"><label class="flbl">Nacidos *</label><input type="number" id="cf-nac" class="fc" value="${c?.cantidadNacidos||''}" min="0" required></div>
        <div class="fg"><label class="flbl">Vivos</label><input type="number" id="cf-viv" class="fc" value="${c?.cantidadVivos||''}" min="0"></div>
        <div class="fg"><label class="flbl">Muertos</label><input type="number" id="cf-mue" class="fc" value="${c?.cantidadMuertos||''}" min="0"></div>
      </div>
      <div class="fg"><label class="flbl">Peso promedio al nacer (kg)</label><input type="number" id="cf-peso" class="fc" value="${c?.pesoPromedio||''}" step="0.1" min="0" placeholder="ej: 35.5"></div>
      <div class="fg"><label class="flbl">Notas</label><textarea id="cf-notas" class="fc" rows="2">${Utils.sanitize(c?.notas||'')}</textarea></div>`,
      onSave:()=>Camadas.save(id)});
  },

  async save(id){
    const fecha=document.getElementById('cf-fecha').value,nac=parseInt(document.getElementById('cf-nac').value);
    if(!fecha||isNaN(nac)){UI.showToast('Completa campos obligatorios','war');return false;}
    const data={fecha,especie:document.getElementById('cf-esp').value,madre:document.getElementById('cf-madre').value.trim(),
      padre:document.getElementById('cf-padre').value.trim(),cantidadNacidos:nac,
      cantidadVivos:parseInt(document.getElementById('cf-viv').value)||0,
      cantidadMuertos:parseInt(document.getElementById('cf-mue').value)||0,
      pesoPromedio:parseFloat(document.getElementById('cf-peso').value)||null,
      notas:document.getElementById('cf-notas').value.trim(),uid:App.user.uid,
      modificadoEn:firebase.firestore.FieldValue.serverTimestamp()};
    if(id){await App.db.collection('camadas').doc(id).update(data);UI.showToast('Camada actualizada','suc');}
    else{data.creadoEn=firebase.firestore.FieldValue.serverTimestamp();await App.db.collection('camadas').add(data);UI.showToast('Camada registrada','suc');}
  },
  del(id){UI.confirm('¿Eliminar esta camada?',async()=>{await App.db.collection('camadas').doc(id).delete();UI.showToast('Camada eliminada','suc');});}
};
