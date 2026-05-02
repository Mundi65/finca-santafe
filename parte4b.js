// =====================================================
// GANADO
// =====================================================
const Ganado = {
  _data:[], _q:'', _esp:'', _est:'', _view:'grid',

  load() {
    const unsub=App.db.collection('ganado').orderBy('nombre').limit(300)
      .onSnapshot(snap=>{Ganado._data=snap.docs.map(d=>({id:d.id,...d.data()}));Ganado.render();Ganado.stats();},e=>console.error(e));
    App._subs.push(unsub);
  },

  calcGDP(p1,d1,p2,d2){
    if(!p1||!d1||!p2||!d2)return null;
    const dias=Utils.daysBetween(d1,d2);
    if(dias<=0)return null;
    return ((p2-p1)/dias).toFixed(3);
  },

  filtered(){return Ganado._data.filter(a=>{
    const q=Ganado._q.toLowerCase();
    if(q&&!((a.nombre||'').toLowerCase().includes(q)||(a.raza||'').toLowerCase().includes(q)||(a.ubicacion||'').toLowerCase().includes(q)))return false;
    if(Ganado._esp&&a.especie!==Ganado._esp)return false;
    if(Ganado._est&&a.estado!==Ganado._est)return false;
    return true;
  });},

  render(){
    const list=Ganado.filtered();
    if(Ganado._view==='list'){
      document.getElementById('ganado-grid').classList.add('hidden');
      document.getElementById('ganado-list-view').classList.remove('hidden');
      Ganado.renderList(list);
    } else {
      document.getElementById('ganado-list-view').classList.add('hidden');
      document.getElementById('ganado-grid').classList.remove('hidden');
      Ganado.renderGrid(list);
    }
  },

  renderGrid(list){
    const el=document.getElementById('ganado-grid');
    if(!list.length){el.innerHTML=`<div class="empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg><h3>Sin animales</h3><p>Registra tu primer animal</p></div>`;return;}
    el.innerHTML=list.map(a=>{
      const gdp=Ganado.calcGDP(a.pesoInicial,a.fechaPesoInicial,a.pesoActual,a.fechaPesoActual);
      return `<div class="acard" onclick="Ganado.openForm('${a.id}')">
        <div class="acard-img">${a.fotoUrl||a.fotoB64?`<img src="${a.fotoUrl||a.fotoB64}" alt="${Utils.sanitize(a.nombre)}" loading="lazy">`:
          `<div class="acard-nophoto">🐄</div>`}</div>
        <div class="acard-body">
          <div class="acard-name">${Utils.sanitize(a.nombre||'Sin nombre')}</div>
          <div class="acard-info">${Utils.especieLabel(a.especie)}${a.raza?' · '+Utils.sanitize(a.raza):''}</div>
          <div class="acard-info">${a.sexo==='macho'?'♂ Macho':'♀ Hembra'}${a.pesoActual?' · '+a.pesoActual+' kg':''}</div>
          ${gdp?`<div class="gdp-badge">📈 ${gdp} kg/día</div>`:''}
          <span class="badge ${Utils.estadoBadge(a.estado)}" style="margin-top:6px">${Utils.estadoLabel(a.estado)}</span>
        </div>
      </div>`;}).join('');
  },

  renderList(list){
    const tbody=document.getElementById('ganado-tbody');
    if(!list.length){tbody.innerHTML=`<tr><td colspan="10"><div class="empty" style="border:none;padding:30px"><p>Sin animales</p></div></td></tr>`;return;}
    tbody.innerHTML=list.map(a=>{
      const gdp=Ganado.calcGDP(a.pesoInicial,a.fechaPesoInicial,a.pesoActual,a.fechaPesoActual);
      return `<tr>
        <td>${a.fotoUrl||a.fotoB64?`<img src="${a.fotoUrl||a.fotoB64}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;flex-shrink:0" loading="lazy">`:
          '<span style="font-size:1.8rem">🐄</span>'}</td>
        <td class="fb">${Utils.sanitize(a.nombre||'—')}</td>
        <td>${Utils.especieLabel(a.especie)}</td><td>${Utils.sanitize(a.raza||'—')}</td>
        <td>${a.sexo==='macho'?'♂':'♀'}</td>
        <td>${a.pesoActual?a.pesoActual+' kg':'—'}</td>
        <td>${gdp?`<span class="gdp-badge">${gdp} kg/día</span>`:'—'}</td>
        <td><span class="badge ${Utils.estadoBadge(a.estado)}">${Utils.estadoLabel(a.estado)}</span></td>
        <td>${Utils.sanitize(a.ubicacion||'—')}</td>
        <td class="ac">
          <button class="bico" onclick="event.stopPropagation();Ganado.openForm('${a.id}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          ${App.canDelete()?`<button class="bico dan" onclick="event.stopPropagation();Ganado.del('${a.id}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>`:''}
          <button class="bico" onclick="event.stopPropagation();Ganado.openPesos('${a.id}')" title="Historial pesos"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></button>
        </td></tr>`;}).join('');
  },

  stats(){
    const activos=Ganado._data.filter(a=>a.estado==='activo');
    document.getElementById('gan-total').textContent=Ganado._data.length;
    document.getElementById('gan-activos').textContent=activos.length;
    const gdps=Ganado._data.map(a=>parseFloat(Ganado.calcGDP(a.pesoInicial,a.fechaPesoInicial,a.pesoActual,a.fechaPesoActual))).filter(v=>!isNaN(v)&&v>0);
    document.getElementById('gan-gdp-prom').textContent=gdps.length?(gdps.reduce((a,b)=>a+b,0)/gdps.length).toFixed(3)+' kg/día':'—';
    const pesos=Ganado._data.map(a=>a.pesoActual||a.pesoInicial).filter(v=>v>0);
    document.getElementById('gan-peso-prom').textContent=pesos.length?(pesos.reduce((a,b)=>a+b,0)/pesos.length).toFixed(1)+' kg':'—';
  },

  filter(q){Ganado._q=q;Ganado.render();},filterEspecie(e){Ganado._esp=e;Ganado.render();},
  filterEstado(s){Ganado._est=s;Ganado.render();},
  filterView(v){Ganado._view=v;Ganado.render();},

  openForm(id=null){
    if(!App.canWrite()){UI.showToast('Sin permiso','war');return;}
    const a=id?Ganado._data.find(x=>x.id===id):null;
    const gdp=a?Ganado.calcGDP(a.pesoInicial,a.fechaPesoInicial,a.pesoActual,a.fechaPesoActual):null;
    UI.showModal({title:a?'Editar Animal':'Nuevo Animal',size:'lg',body:`
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Nombre / Arete *</label><input type="text" id="af-nom" class="fc" value="${Utils.sanitize(a?.nombre||'')}" placeholder="Ej: BOVINO-001" required maxlength="80"></div>
        <div class="fg"><label class="flbl">Especie</label>
          <select id="af-esp" class="fc">${['bovino','porcino','ovino','caprino','equino','aves','otros'].map(e=>`<option value="${e}"${a?.especie===e?' selected':''}>${Utils.especieLabel(e)}</option>`).join('')}</select></div>
      </div>
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Raza</label><input type="text" id="af-raza" class="fc" value="${Utils.sanitize(a?.raza||'')}" placeholder="Ej: Holstein, Brahman"></div>
        <div class="fg"><label class="flbl">Sexo</label>
          <select id="af-sexo" class="fc"><option value="macho"${a?.sexo==='macho'?' selected':''}>♂ Macho</option><option value="hembra"${a?.sexo==='hembra'?' selected':''}>♀ Hembra</option></select></div>
      </div>
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Fecha nacimiento</label><input type="date" id="af-fnac" class="fc" value="${a?.fechaNacimiento||''}"></div>
        <div class="fg"><label class="flbl">Color</label><input type="text" id="af-color" class="fc" value="${Utils.sanitize(a?.color||'')}" placeholder="Ej: Rojo pinto"></div>
      </div>
      <div class="divider"></div>
      <p class="flbl" style="margin-bottom:8px">📊 Control de Peso (para calcular GDP)</p>
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Peso inicial (kg)</label><input type="number" id="af-pi" class="fc" value="${a?.pesoInicial||''}" step="0.1" min="0" placeholder="0.0" oninput="Ganado._calcGDPForm()"></div>
        <div class="fg"><label class="flbl">Fecha peso inicial</label><input type="date" id="af-dpi" class="fc" value="${a?.fechaPesoInicial||''}" oninput="Ganado._calcGDPForm()"></div>
      </div>
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Peso actual (kg)</label><input type="number" id="af-pa" class="fc" value="${a?.pesoActual||''}" step="0.1" min="0" placeholder="0.0" oninput="Ganado._calcGDPForm()"></div>
        <div class="fg"><label class="flbl">Fecha peso actual</label><input type="date" id="af-dpa" class="fc" value="${a?.fechaPesoActual||''}" oninput="Ganado._calcGDPForm()"></div>
      </div>
      <div id="gdp-display" style="background:var(--verde-pale);border-radius:var(--rsm);padding:10px 14px;display:${gdp?'block':'none'}">
        <span style="font-size:.83rem;color:var(--verde)">📈 GDP calculado: <strong id="gdp-val">${gdp||'—'} kg/día</strong></span>
      </div>
      <div class="divider"></div>
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Estado</label>
          <select id="af-est" class="fc">${['activo','vendido','muerto','otro'].map(s=>`<option value="${s}"${a?.estado===s?' selected':''}>${Utils.estadoLabel(s)}</option>`).join('')}</select></div>
        <div class="fg"><label class="flbl">Ubicación / Potrero</label><input type="text" id="af-ubi" class="fc" value="${Utils.sanitize(a?.ubicacion||'')}" placeholder="Ej: Potrero Norte"></div>
      </div>
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Padre (arete)</label><input type="text" id="af-padre" class="fc" value="${Utils.sanitize(a?.padre||'')}"></div>
        <div class="fg"><label class="flbl">Madre (arete)</label><input type="text" id="af-madre" class="fc" value="${Utils.sanitize(a?.madre||'')}"></div>
      </div>
      <div class="fg"><label class="flbl">Notas</label><textarea id="af-notas" class="fc" rows="2">${Utils.sanitize(a?.notas||'')}</textarea></div>
      <div class="fg"><label class="flbl">Foto del animal</label>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <button type="button" onclick="document.getElementById('af-foto-cam').click()" style="flex:1;padding:10px 8px;border:1.5px solid #1B4332;background:#D8F3DC;color:#1B4332;border-radius:8px;cursor:pointer;font-size:.87rem;font-weight:600">📷 Tomar foto</button>
          <input type="file" id="af-foto-cam" accept="image/*" capture="environment" onchange="Ganado._previewFoto(this)" style="display:none">
          <button type="button" onclick="document.getElementById('af-foto-gal').click()" style="flex:1;padding:10px 8px;border:1.5px solid #adb5bd;background:#f8f9fa;color:#495057;border-radius:8px;cursor:pointer;font-size:.87rem;font-weight:600">🖼️ Subir imagen</button>
          <input type="file" id="af-foto-gal" accept="image/*" onchange="Ganado._previewFoto(this)" style="display:none">
        </div>
        <div id="af-prev">${a?.fotoUrl||a?.fotoB64?`<div class="photo-prev"><img src="${a.fotoUrl||a.fotoB64}" style="max-width:200px;max-height:200px;border-radius:12px;object-fit:contain"></div>`:''}</div>
      </div>`,
      onSave:()=>Ganado.save(id)
    });
    if(gdp)document.getElementById('gdp-val').textContent=gdp+' kg/día';
  },

  _calcGDPForm(){
    const pi=parseFloat(document.getElementById('af-pi')?.value),dpi=document.getElementById('af-dpi')?.value,
          pa=parseFloat(document.getElementById('af-pa')?.value),dpa=document.getElementById('af-dpa')?.value;
    const gdp=Ganado.calcGDP(pi,dpi,pa,dpa);
    const disp=document.getElementById('gdp-display');
    if(gdp&&disp){disp.style.display='block';document.getElementById('gdp-val').textContent=gdp+' kg/día';}
    else if(disp)disp.style.display='none';
  },

  _previewFoto(inp){
    if(!inp.files[0])return;
    const r=new FileReader();r.onload=e=>{document.getElementById('af-prev').innerHTML=`<div class="photo-prev"><img src="${e.target.result}" style="max-width:200px;max-height:200px;border-radius:12px;object-fit:contain"><button class="photo-prev-rm" type="button" onclick="['af-foto-cam','af-foto-gal'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});document.getElementById('af-prev').innerHTML=''">✕</button></div>`;};r.readAsDataURL(inp.files[0]);
  },

  async save(id){
    const nom=document.getElementById('af-nom').value.trim();
    if(!nom){UI.showToast('El nombre/arete es obligatorio','war');return false;}
    const pi=parseFloat(document.getElementById('af-pi').value)||null,dpi=document.getElementById('af-dpi').value||null,
          pa=parseFloat(document.getElementById('af-pa').value)||null,dpa=document.getElementById('af-dpa').value||null;
    const gdp=Ganado.calcGDP(pi,dpi,pa,dpa);
    const data={nombre:nom,especie:document.getElementById('af-esp').value,raza:document.getElementById('af-raza').value.trim(),
      sexo:document.getElementById('af-sexo').value,fechaNacimiento:document.getElementById('af-fnac').value||null,
      color:document.getElementById('af-color').value.trim(),pesoInicial:pi,fechaPesoInicial:dpi,
      pesoActual:pa,fechaPesoActual:dpa,gdp:gdp?parseFloat(gdp):null,
      estado:document.getElementById('af-est').value,ubicacion:document.getElementById('af-ubi').value.trim(),
      padre:document.getElementById('af-padre').value.trim(),madre:document.getElementById('af-madre').value.trim(),
      notas:document.getElementById('af-notas').value.trim(),uid:App.user.uid,
      modificadoEn:firebase.firestore.FieldValue.serverTimestamp()};
    const file=document.getElementById('af-foto-cam')?.files[0]||document.getElementById('af-foto-gal')?.files[0];
    if(file){UI.loading(true);try{data.fotoB64=await Utils.compressImg(file,800,800,0.7);}catch(e){}UI.loading(false);}
    if(id){await App.db.collection('ganado').doc(id).update(data);UI.showToast('Animal actualizado','suc');}
    else{data.creadoEn=firebase.firestore.FieldValue.serverTimestamp();await App.db.collection('ganado').add(data);UI.showToast('Animal registrado','suc');}
  },

  del(id){UI.confirm('¿Eliminar este animal?',async()=>{await App.db.collection('ganado').doc(id).delete();UI.showToast('Animal eliminado','suc');});},

  async openPesos(id){
    const a=Ganado._data.find(x=>x.id===id);if(!a)return;
    const snap=await App.db.collection('ganado').doc(id).collection('pesos').orderBy('fecha','desc').limit(30).get();
    const pesos=snap.docs.map(d=>({id:d.id,...d.data()}));
    UI.showModal({title:`Historial de Pesos — ${Utils.sanitize(a.nombre)}`,size:'lg',hideSave:false,saveLabel:'Agregar Peso',
      body:`<div class="fgrid fg2" style="margin-bottom:14px">
        <div class="fg"><label class="flbl">Fecha</label><input type="date" id="pp-fecha" class="fc" value="${Utils.today()}"></div>
        <div class="fg"><label class="flbl">Peso (kg)</label><input type="number" id="pp-peso" class="fc" placeholder="0.0" step="0.1" min="0"></div>
      </div>
      <div class="phi-list" id="pesos-list">
        ${pesos.length?pesos.map(p=>`<div class="phi"><span class="phi-d">${Utils.fmtDate(p.fecha)}</span><span class="phi-v">${p.peso} kg</span></div>`).join(''):'<div class="empty" style="padding:20px;border:none"><p>Sin registros de peso</p></div>'}
      </div>`,
      onSave:async()=>{
        const fecha=document.getElementById('pp-fecha').value,peso=parseFloat(document.getElementById('pp-peso').value);
        if(!fecha||isNaN(peso)){UI.showToast('Completa fecha y peso','war');return false;}
        await App.db.collection('ganado').doc(id).collection('pesos').add({fecha,peso,uid:App.user.uid,creadoEn:firebase.firestore.FieldValue.serverTimestamp()});
        await App.db.collection('ganado').doc(id).update({pesoActual:peso,fechaPesoActual:fecha,gdp:parseFloat(Ganado.calcGDP(a.pesoInicial,a.fechaPesoInicial,peso,fecha))||null});
        UI.showToast('Peso registrado','suc'); return false;
      }
    });
  }
};

// =====================================================
// AGRICOLA
// =====================================================
const Agricola = {
  _lotes:[], _tareas:[], _tarQ:'', _tarLote:'', _tarEst:'', _tabActivo:'lotes',

  load(){
    const u1=App.db.collection('agricola').orderBy('nombre').onSnapshot(s=>{Agricola._lotes=s.docs.map(d=>({id:d.id,...d.data()}));Agricola.renderLotes();Agricola.stats();Agricola.fillLoteSelect();},e=>console.error(e));
    const u2=App.db.collection('tareas').orderBy('fechaProgramada').onSnapshot(s=>{Agricola._tareas=s.docs.map(d=>({id:d.id,...d.data()}));Agricola.renderTareas();},e=>console.error(e));
    App._subs.push(u1,u2);
  },

  stats(){
    const area=Agricola._lotes.reduce((a,l)=>a+(l.area||0),0);
    document.getElementById('lot-total').textContent=Agricola._lotes.length;
    document.getElementById('lot-area').textContent=area.toFixed(1)+' ha';
    document.getElementById('lot-cultivo').textContent=Agricola._lotes.filter(l=>l.estado==='cultivo').length;
    document.getElementById('lot-cosecha').textContent=Agricola._lotes.filter(l=>l.estado==='cosecha').length;
  },

  renderLotes(){
    const el=document.getElementById('lotes-grid');
    if(!Agricola._lotes.length){el.innerHTML=`<div class="empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg><h3>Sin lotes</h3><p>Registra tus parcelas agrícolas</p></div>`;return;}
    el.innerHTML=Agricola._lotes.map(l=>{
      const tarLote=Agricola._tareas.filter(t=>t.loteId===l.id);
      const pend=tarLote.filter(t=>t.estado!=='completada').length;
      const comp=tarLote.filter(t=>t.estado==='completada').length;
      const pct=tarLote.length?Math.round((comp/tarLote.length)*100):0;
      const fs=Utils.parseDate(l.fechaSiembra),fc=Utils.parseDate(l.fechaCosechaEst),hoy=new Date();
      let cultPct=0,cultInfo='';
      if(fs&&fc&&fc>fs){const total=fc-fs,elapsed=Math.min(Math.max(hoy-fs,0),total);cultPct=Math.round((elapsed/total)*100);cultInfo=cultPct>=100?'🌾 Listo para cosechar':`🌱 ${cultPct}% del ciclo · ${Math.max(0,Math.round((fc-hoy)/86400000))} días para cosecha`;}
      return `<div class="lcard" onclick="Agricola.filterTareaLote('${l.id}');Agricola.switchTab('tareas',document.getElementById('tab-tareas'))">
        <div class="lcard-hd">
          <div><div class="lcard-name">${Utils.sanitize(l.nombre||'Sin nombre')}</div>
          <div class="lcard-area">${l.area||0} ha${l.ubicacion?' · '+Utils.sanitize(l.ubicacion):''}</div></div>
          <div style="display:flex;gap:6px">
            <button class="bico" onclick="event.stopPropagation();Agricola.openLoteForm('${l.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            ${App.canDelete()?`<button class="bico dan" onclick="event.stopPropagation();Agricola.delLote('${l.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>`:''}
          </div>
        </div>
        <div class="lcard-stat"><span>Cultivo</span><span>${Utils.sanitize(l.cultivo||'—')}</span></div>
        <div class="lcard-stat"><span>Estado</span><span class="badge ${Utils.lotEstadoBadge(l.estado)}">${Utils.lotEstadoLabel(l.estado)}</span></div>
        <div class="lcard-stat"><span>Siembra</span><span>${Utils.fmtDate(l.fechaSiembra)}</span></div>
        <div class="lcard-stat"><span>Cosecha est.</span><span>${Utils.fmtDate(l.fechaCosechaEst)}</span></div>
        ${cultInfo?`<div class="pb-wrap" style="margin:4px 0 2px"><div class="pb" style="width:${cultPct}%;background:${cultPct>=100?'#C8922A':'#2D6A4F'}"></div></div><div style="font-size:.7rem;color:var(--g600)">${cultInfo}</div>`:''}
        <div class="lcard-stat"><span>Tareas</span><span>${pend} pendientes · ${comp} completadas</span></div>
        <div class="pb-wrap"><div class="pb" style="width:${pct}%"></div></div>
        <div style="font-size:.7rem;color:var(--g600);margin-top:3px">${pct}% completado</div>
      </div>`;}).join('');
  },

  renderTareas(){
    const list=Agricola._tareas.filter(t=>{
      const q=Agricola._tarQ.toLowerCase();
      if(q&&!((t.titulo||'').toLowerCase().includes(q)))return false;
      if(Agricola._tarLote&&t.loteId!==Agricola._tarLote)return false;
      if(Agricola._tarEst&&t.estado!==Agricola._tarEst)return false;
      return true;
    });
    const el=document.getElementById('tareas-list');
    if(!list.length){el.innerHTML=`<div class="empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><h3>Sin tareas</h3><p>Agrega tareas a tus lotes</p></div>`;return;}
    el.innerHTML=list.map(t=>{
      const lote=Agricola._lotes.find(l=>l.id===t.loteId);
      return `<div class="tarea ${t.estado||'pendiente'}">
        <div class="tarea-chk" onclick="Agricola.toggleTarea('${t.id}','${t.estado}')">${t.estado==='completada'?'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>':''}</div>
        <div class="tarea-info" style="flex:1">
          <div class="tarea-title">${Utils.sanitize(t.titulo||'Tarea')}</div>
          <div class="tarea-meta">${Utils.fmtDate(t.fechaProgramada)} · ${Utils.tareaLabel(t.tipo)}${lote?' · '+Utils.sanitize(lote.nombre):''}</div>
          ${t.descripcion?`<div class="txs c-gris mt1">${Utils.sanitize(t.descripcion)}</div>`:''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="bico" onclick="Agricola.openTareaForm('${t.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          ${App.canDelete()?`<button class="bico dan" onclick="Agricola.delTarea('${t.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>`:''}
        </div>
      </div>`;}).join('');
  },

  fillLoteSelect(){
    const sel=document.getElementById('tarea-lote-f');if(!sel)return;
    const cur=sel.value;
    sel.innerHTML='<option value="">Todos los lotes</option>'+Agricola._lotes.map(l=>`<option value="${l.id}">${Utils.sanitize(l.nombre)}</option>`).join('');
    if(cur)sel.value=cur;
  },

  switchTab(id,el){
    Agricola._tabActivo=id;
    document.querySelectorAll('#mod-agricola .tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('#mod-agricola .tbc').forEach(t=>t.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('tbc-'+id).classList.add('active');
    document.getElementById('agri-acts').innerHTML = id==='lotes'?
      `<button class="btn btn-dor" onclick="Agricola.openLoteForm()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nuevo Lote</button>`:
      `<button class="btn btn-dor" onclick="Agricola.openTareaForm()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nueva Tarea</button>`;
  },

  filterTareas(q){Agricola._tarQ=q;Agricola.renderTareas();},
  filterTareaLote(l){Agricola._tarLote=l;Agricola.renderTareas();},
  filterTareaEstado(s){Agricola._tarEst=s;Agricola.renderTareas();},

  openLoteForm(id=null){
    if(!App.canWrite()){UI.showToast('Sin permiso','war');return;}
    const l=id?Agricola._lotes.find(x=>x.id===id):null;
    UI.showModal({title:l?'Editar Lote':'Nuevo Lote',body:`
      <div class="fg"><label class="flbl">Nombre del lote *</label><input type="text" id="lf-nom" class="fc" value="${Utils.sanitize(l?.nombre||'')}" placeholder="Ej: Lote Norte" required maxlength="80"></div>
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Área (ha)</label><input type="number" id="lf-area" class="fc" value="${l?.area||''}" step="0.1" min="0" placeholder="0.0"></div>
        <div class="fg"><label class="flbl">Ubicación</label><input type="text" id="lf-ubi" class="fc" value="${Utils.sanitize(l?.ubicacion||'')}" placeholder="Ej: Sector norte"></div>
      </div>
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Cultivo actual</label><input type="text" id="lf-cul" class="fc" value="${Utils.sanitize(l?.cultivo||'')}" placeholder="Ej: Maíz, Fréjol"></div>
        <div class="fg"><label class="flbl">Estado</label>
          <select id="lf-est" class="fc">${['preparacion','siembra','cultivo','cosecha','descanso'].map(s=>`<option value="${s}"${l?.estado===s?' selected':''}>${Utils.lotEstadoLabel(s)}</option>`).join('')}</select></div>
      </div>
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Fecha siembra</label><input type="date" id="lf-fsie" class="fc" value="${l?.fechaSiembra||''}"></div>
        <div class="fg"><label class="flbl">Cosecha estimada</label><input type="date" id="lf-fcos" class="fc" value="${l?.fechaCosechaEst||''}"></div>
      </div>
      <div class="fg"><label class="flbl">Notas</label><textarea id="lf-notas" class="fc" rows="2">${Utils.sanitize(l?.notas||'')}</textarea></div>`,
      onSave:()=>Agricola.saveLote(id)});
  },

  async saveLote(id){
    const nom=document.getElementById('lf-nom').value.trim();if(!nom){UI.showToast('El nombre es obligatorio','war');return false;}
    const data={nombre:nom,area:parseFloat(document.getElementById('lf-area').value)||0,ubicacion:document.getElementById('lf-ubi').value.trim(),
      cultivo:document.getElementById('lf-cul').value.trim(),estado:document.getElementById('lf-est').value,
      fechaSiembra:document.getElementById('lf-fsie').value||null,fechaCosechaEst:document.getElementById('lf-fcos').value||null,
      notas:document.getElementById('lf-notas').value.trim(),uid:App.user.uid,modificadoEn:firebase.firestore.FieldValue.serverTimestamp()};
    if(id){await App.db.collection('agricola').doc(id).update(data);UI.showToast('Lote actualizado','suc');}
    else{data.creadoEn=firebase.firestore.FieldValue.serverTimestamp();await App.db.collection('agricola').add(data);UI.showToast('Lote registrado','suc');}
  },
  delLote(id){UI.confirm('¿Eliminar este lote?',async()=>{await App.db.collection('agricola').doc(id).delete();UI.showToast('Lote eliminado','suc');});},

  openTareaForm(id=null){
    if(!App.canWrite()){UI.showToast('Sin permiso','war');return;}
    const t=id?Agricola._tareas.find(x=>x.id===id):null;
    UI.showModal({title:t?'Editar Tarea':'Nueva Tarea',body:`
      <div class="fg"><label class="flbl">Título *</label><input type="text" id="tf-tit" class="fc" value="${Utils.sanitize(t?.titulo||'')}" required maxlength="120"></div>
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Lote</label>
          <select id="tf-lote" class="fc"><option value="">Sin lote asignado</option>${Agricola._lotes.map(l=>`<option value="${l.id}"${t?.loteId===l.id?' selected':''}>${Utils.sanitize(l.nombre)}</option>`).join('')}</select></div>
        <div class="fg"><label class="flbl">Tipo</label>
          <select id="tf-tipo" class="fc">${['riego','fertilizacion','fumigacion','siembra','cosecha','mantenimiento','otro'].map(tp=>`<option value="${tp}"${t?.tipo===tp?' selected':''}>${Utils.tareaLabel(tp)}</option>`).join('')}</select></div>
      </div>
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Fecha programada</label><input type="date" id="tf-fecha" class="fc" value="${t?.fechaProgramada||Utils.today()}"></div>
        <div class="fg"><label class="flbl">Estado</label>
          <select id="tf-est" class="fc"><option value="pendiente"${t?.estado==='pendiente'?' selected':''}>Pendiente</option><option value="en_progreso"${t?.estado==='en_progreso'?' selected':''}>En progreso</option><option value="completada"${t?.estado==='completada'?' selected':''}>Completada</option></select></div>
      </div>
      <div class="fg"><label class="flbl">Descripción</label><textarea id="tf-desc" class="fc" rows="2">${Utils.sanitize(t?.descripcion||'')}</textarea></div>`,
      onSave:()=>Agricola.saveTarea(id)});
  },

  async saveTarea(id){
    const tit=document.getElementById('tf-tit').value.trim();if(!tit){UI.showToast('El título es obligatorio','war');return false;}
    const data={titulo:tit,loteId:document.getElementById('tf-lote').value||null,tipo:document.getElementById('tf-tipo').value,
      fechaProgramada:document.getElementById('tf-fecha').value||null,estado:document.getElementById('tf-est').value,
      descripcion:document.getElementById('tf-desc').value.trim(),uid:App.user.uid,modificadoEn:firebase.firestore.FieldValue.serverTimestamp()};
    if(id){await App.db.collection('tareas').doc(id).update(data);UI.showToast('Tarea actualizada','suc');}
    else{data.creadoEn=firebase.firestore.FieldValue.serverTimestamp();await App.db.collection('tareas').add(data);UI.showToast('Tarea registrada','suc');}
  },

  async toggleTarea(id,estado){
    const nuevo=estado==='completada'?'pendiente':'completada';
    await App.db.collection('tareas').doc(id).update({estado:nuevo,modificadoEn:firebase.firestore.FieldValue.serverTimestamp()});
  },
  delTarea(id){UI.confirm('¿Eliminar esta tarea?',async()=>{await App.db.collection('tareas').doc(id).delete();UI.showToast('Tarea eliminada','suc');});}
};

// =====================================================
// CALENDARIO
// =====================================================
const Calendario = {
  _year:new Date().getFullYear(), _month:new Date().getMonth(), _eventos:[],

  load(){
    const unsub=App.db.collection('eventos').orderBy('fecha').limit(300)
      .onSnapshot(s=>{Calendario._eventos=s.docs.map(d=>({id:d.id,...d.data()}));Calendario.render();Calendario.renderUpcoming();},e=>console.error(e));
    App._subs.push(unsub);
    Calendario.render();
  },

  render(){
    const y=Calendario._year,m=Calendario._month;
    document.getElementById('cal-title').textContent=Utils.monthName(m)+' '+y;
    const first=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate();
    const today=Utils.today(); let html='';
    for(let i=0;i<first;i++){const prev=new Date(y,m,-(first-1-i)).getDate();html+=`<div class="cday other"><div class="cdnum">${prev}</div></div>`;}
    for(let d=1;d<=days;d++){
      const dateStr=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayEvts=Calendario._eventos.filter(e=>e.fecha===dateStr);
      const isToday=dateStr===today;
      html+=`<div class="cday${isToday?' today':''}" onclick="Calendario.openEventoForm('${dateStr}')">
        <div class="cdnum">${isToday?`<div style="display:flex;align-items:center;justify-content:center;width:23px;height:23px;border-radius:50%;background:var(--verde);color:white;font-size:.78rem;font-weight:600">${d}</div>`:d}</div>
        <div class="cevts">${dayEvts.slice(0,3).map(e=>`<div class="cevt ${e.tipo||'otro'}" onclick="event.stopPropagation();Calendario.openEventoForm('${dateStr}','${e.id}')" title="${Utils.sanitize(e.titulo)}">${Utils.sanitize(e.titulo)}</div>`).join('')}${dayEvts.length>3?`<div class="txs c-gris">+${dayEvts.length-3} más</div>`:''}</div>
      </div>`;
    }
    const rem=42-first-days;for(let d=1;d<=rem;d++)html+=`<div class="cday other"><div class="cdnum">${d}</div></div>`;
    document.getElementById('cal-body').innerHTML=html;
  },

  renderUpcoming(){
    const today=Utils.today();
    const up=Calendario._eventos.filter(e=>e.fecha>=today).sort((a,b)=>a.fecha.localeCompare(b.fecha)).slice(0,8);
    const el=document.getElementById('upcoming-list');
    document.getElementById('upcoming-count').textContent=up.length+' evento'+(up.length!==1?'s':'');
    if(!up.length){el.innerHTML=`<div class="empty" style="padding:24px;border:none"><p>No hay eventos próximos</p></div>`;return;}
    el.innerHTML=up.map(e=>`<div class="flex jc-sb items-c" style="padding:9px 0;border-bottom:1px solid var(--g100)">
      <div class="flex gap2 items-c">
        <span class="cevt ${e.tipo||'otro'}" style="min-width:10px">&nbsp;</span>
        <div><div class="tsm fb">${Utils.sanitize(e.titulo)}</div>
        <div class="txs c-gris">${Utils.fmtDate(e.fecha)}${e.hora?' '+e.hora:''} · ${Utils.eventoLabel(e.tipo)}</div></div>
      </div>
      <div class="flex gap1">
        <button class="bico" onclick="Calendario.openEventoForm('${e.fecha}','${e.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        ${App.canDelete()?`<button class="bico dan" onclick="Calendario.del('${e.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>`:''}
      </div>
    </div>`).join('');
  },

  prevMonth(){if(Calendario._month===0){Calendario._month=11;Calendario._year--;}else Calendario._month--;Calendario.render();},
  nextMonth(){if(Calendario._month===11){Calendario._month=0;Calendario._year++;}else Calendario._month++;Calendario.render();},

  openEventoForm(fecha=null,id=null){
    if(!App.canWrite()){UI.showToast('Sin permiso','war');return;}
    const e=id?Calendario._eventos.find(x=>x.id===id):null;
    UI.showModal({title:e?'Editar Evento':'Nuevo Evento',body:`
      <div class="fg"><label class="flbl">Título *</label><input type="text" id="ef-tit" class="fc" value="${Utils.sanitize(e?.titulo||'')}" required maxlength="120"></div>
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Fecha *</label><input type="date" id="ef-fecha" class="fc" value="${e?.fecha||fecha||Utils.today()}" required></div>
        <div class="fg"><label class="flbl">Hora</label><input type="time" id="ef-hora" class="fc" value="${e?.hora||''}"></div>
      </div>
      <div class="fg"><label class="flbl">Tipo</label>
        <select id="ef-tipo" class="fc">${['visita','vacunacion','pago','cosecha','reunion','otro'].map(t=>`<option value="${t}"${e?.tipo===t?' selected':''}>${Utils.eventoLabel(t)}</option>`).join('')}</select></div>
      <div class="fg"><label class="flbl">Descripción</label><textarea id="ef-desc" class="fc" rows="2">${Utils.sanitize(e?.descripcion||'')}</textarea></div>`,
      onSave:()=>Calendario.saveEvento(id)});
  },

  async saveEvento(id){
    const tit=document.getElementById('ef-tit').value.trim(),fecha=document.getElementById('ef-fecha').value;
    if(!tit||!fecha){UI.showToast('Título y fecha son obligatorios','war');return false;}
    const data={titulo:tit,fecha,hora:document.getElementById('ef-hora').value||null,tipo:document.getElementById('ef-tipo').value,
      descripcion:document.getElementById('ef-desc').value.trim(),uid:App.user.uid,modificadoEn:firebase.firestore.FieldValue.serverTimestamp()};
    if(id){await App.db.collection('eventos').doc(id).update(data);UI.showToast('Evento actualizado','suc');}
    else{data.creadoEn=firebase.firestore.FieldValue.serverTimestamp();await App.db.collection('eventos').add(data);UI.showToast('Evento registrado','suc');}
  },
  del(id){UI.confirm('¿Eliminar este evento?',async()=>{await App.db.collection('eventos').doc(id).delete();UI.showToast('Evento eliminado','suc');});}
};

// =====================================================
// CONTACTOS
// =====================================================
const Contactos = {
  _data:[], _q:'', _tipo:'',

  load(){
    const unsub=App.db.collection('contactos').orderBy('nombre').limit(200)
      .onSnapshot(s=>{Contactos._data=s.docs.map(d=>({id:d.id,...d.data()}));Contactos.render();},e=>console.error(e));
    App._subs.push(unsub);
  },

  filtered(){return Contactos._data.filter(c=>{const q=Contactos._q.toLowerCase();if(q&&!((c.nombre||'').toLowerCase().includes(q)||(c.empresa||'').toLowerCase().includes(q)||(c.telefono||'').includes(q)))return false;if(Contactos._tipo&&c.tipo!==Contactos._tipo)return false;return true;});},

  render(){
    const el=document.getElementById('contactos-list'),list=Contactos.filtered();
    if(!list.length){el.innerHTML=`<div class="empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><h3>Sin contactos</h3><p>Agrega proveedores, clientes y más</p></div>`;return;}
    el.innerHTML=list.map(c=>`
      <div class="ccontact" onclick="Contactos.openForm('${c.id}')">
        <div class="cav">${Utils.initials(c.nombre)}</div>
        <div class="ci">
          <div class="ci-name">${Utils.sanitize(c.nombre||'—')}</div>
          <div class="ci-role">${Utils.contactoLabel(c.tipo)}${c.empresa?' · '+Utils.sanitize(c.empresa):''}</div>
          ${c.telefono?`<div class="ci-phone">📞 ${Utils.sanitize(c.telefono)}</div>`:''}
        </div>
        <div class="cacts">
          ${c.telefono?`<a href="tel:${c.telefono}" onclick="event.stopPropagation()" class="bico" title="Llamar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.68 13.4a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.68h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.34a16 16 0 0 0 6 6l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.68 18a2 2 0 0 1 .32-1.08z"/></svg></a>`:''}
          ${c.email?`<a href="mailto:${c.email}" onclick="event.stopPropagation()" class="bico" title="Email"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></a>`:''}
          ${App.canDelete()?`<button class="bico dan" onclick="event.stopPropagation();Contactos.del('${c.id}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>`:''}
        </div>
      </div>`).join('');
  },

  filter(q){Contactos._q=q;Contactos.render();},filterTipo(t){Contactos._tipo=t;Contactos.render();},

  openForm(id=null){
    if(!App.canWrite()){UI.showToast('Sin permiso','war');return;}
    const c=id?Contactos._data.find(x=>x.id===id):null;
    UI.showModal({title:c?'Editar Contacto':'Nuevo Contacto',size:'lg',body:`
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Nombre *</label><input type="text" id="kf-nom" class="fc" value="${Utils.sanitize(c?.nombre||'')}" required maxlength="100"></div>
        <div class="fg"><label class="flbl">Tipo</label>
          <select id="kf-tipo" class="fc">${['proveedor','cliente','veterinario','empleado','transporte','otro'].map(t=>`<option value="${t}"${c?.tipo===t?' selected':''}>${Utils.contactoLabel(t)}</option>`).join('')}</select></div>
      </div>
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Empresa</label><input type="text" id="kf-emp" class="fc" value="${Utils.sanitize(c?.empresa||'')}" maxlength="100"></div>
        <div class="fg"><label class="flbl">Cargo</label><input type="text" id="kf-cargo" class="fc" value="${Utils.sanitize(c?.cargo||'')}" maxlength="80"></div>
      </div>
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Teléfono</label><input type="tel" id="kf-tel" class="fc" value="${Utils.sanitize(c?.telefono||'')}" placeholder="+593 9X XXX XXXX"></div>
        <div class="fg"><label class="flbl">Email</label><input type="email" id="kf-email" class="fc" value="${Utils.sanitize(c?.email||'')}"></div>
      </div>
      <div class="fg"><label class="flbl">Dirección</label><input type="text" id="kf-dir" class="fc" value="${Utils.sanitize(c?.direccion||'')}" maxlength="200"></div>
      <div class="fg"><label class="flbl">Notas</label><textarea id="kf-notas" class="fc" rows="2">${Utils.sanitize(c?.notas||'')}</textarea></div>`,
      onSave:()=>Contactos.save(id)});
  },

  async save(id){
    const nom=document.getElementById('kf-nom').value.trim();if(!nom){UI.showToast('El nombre es obligatorio','war');return false;}
    const data={nombre:nom,tipo:document.getElementById('kf-tipo').value,empresa:document.getElementById('kf-emp').value.trim(),
      cargo:document.getElementById('kf-cargo').value.trim(),telefono:document.getElementById('kf-tel').value.trim(),
      email:document.getElementById('kf-email').value.trim(),direccion:document.getElementById('kf-dir').value.trim(),
      notas:document.getElementById('kf-notas').value.trim(),uid:App.user.uid,modificadoEn:firebase.firestore.FieldValue.serverTimestamp()};
    if(id){await App.db.collection('contactos').doc(id).update(data);UI.showToast('Contacto actualizado','suc');}
    else{data.creadoEn=firebase.firestore.FieldValue.serverTimestamp();await App.db.collection('contactos').add(data);UI.showToast('Contacto registrado','suc');}
  },
  del(id){UI.confirm('¿Eliminar este contacto?',async()=>{await App.db.collection('contactos').doc(id).delete();UI.showToast('Contacto eliminado','suc');});}
};

// =====================================================
// REPORTES
// =====================================================
const Reportes = {
  _gastos:[], _ingresos:[], _ganado:[], _lotes:[], _tareas:[],

  async load(){
    const now=new Date(),desde=new Date(now.getFullYear(),now.getMonth()-5,1).toISOString().split('T')[0];
    document.getElementById('rep-desde').value=desde;
    document.getElementById('rep-hasta').value=Utils.today();
    await Reportes.generar();
  },

  async generar(){
    const desde=document.getElementById('rep-desde').value,hasta=document.getElementById('rep-hasta').value;
    UI.loading(true);
    try{
      const [gS,iS,ganS,lotS,tarS]=await Promise.all([
        App.db.collection('gastos').where('fecha','>=',desde).where('fecha','<=',hasta).orderBy('fecha').get(),
        App.db.collection('ingresos').where('fecha','>=',desde).where('fecha','<=',hasta).orderBy('fecha').get(),
        App.db.collection('ganado').get(),App.db.collection('agricola').get(),App.db.collection('tareas').get()
      ]);
      Reportes._gastos=gS.docs.map(d=>({id:d.id,...d.data()}));
      Reportes._ingresos=iS.docs.map(d=>({id:d.id,...d.data()}));
      Reportes._ganado=ganS.docs.map(d=>({id:d.id,...d.data()}));
      Reportes._lotes=lotS.docs.map(d=>({id:d.id,...d.data()}));
      Reportes._tareas=tarS.docs.map(d=>({id:d.id,...d.data()}));
      Reportes.renderFinanciero();Reportes.renderGanado();Reportes.renderAgricola();
    } catch(e){console.error(e);UI.showToast('Error generando reporte','err');}
    finally{UI.loading(false);}
  },

  renderFinanciero(){
    const g=Reportes._gastos,i=Reportes._ingresos;
    const tg=g.reduce((a,x)=>a+(x.monto||0),0),ti=i.reduce((a,x)=>a+(x.monto||0),0);
    document.getElementById('rep-fin-stats').innerHTML=`
      <div class="rstat"><div class="rstat-val pos">${Utils.fmt$(ti)}</div><div class="rstat-lbl">Total Ingresos</div></div>
      <div class="rstat"><div class="rstat-val neg">${Utils.fmt$(tg)}</div><div class="rstat-lbl">Total Gastos</div></div>
      <div class="rstat"><div class="rstat-val ${ti>=tg?'pos':'neg'}">${Utils.fmt$(ti-tg)}</div><div class="rstat-lbl">Balance</div></div>
      <div class="rstat"><div class="rstat-val">${g.length+i.length}</div><div class="rstat-lbl">Transacciones</div></div>`;
    // Build monthly data
    const months={};const addMonth=k=>{if(!months[k])months[k]={g:0,i:0};};
    g.forEach(x=>{const k=(x.fecha||'').slice(0,7);if(k){addMonth(k);months[k].g+=(x.monto||0);}});
    i.forEach(x=>{const k=(x.fecha||'').slice(0,7);if(k){addMonth(k);months[k].i+=(x.monto||0);}});
    const keys=Object.keys(months).sort();
    const labels=keys.map(k=>{const[y,m]=k.split('-');return Utils.monthShort(parseInt(m)-1)+' '+y.slice(2);});
    setTimeout(()=>{
      Charts.bar(document.getElementById('chart-rep-ig'),labels,[
        {label:'Ingresos',data:keys.map(k=>months[k].i),color:'#1B4332'},
        {label:'Gastos',data:keys.map(k=>months[k].g),color:'#DC3545'}
      ],{h:220});
      const catMap={};g.forEach(x=>catMap[x.categoria]=(catMap[x.categoria]||0)+(x.monto||0));
      const catE=Object.entries(catMap).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a);
      if(catE.length)Charts.donut(document.getElementById('chart-rep-cat'),catE.map(([k])=>Utils.catLabel(k)),catE.map(([,v])=>v),Charts.COLORS);
    },200);
  },

  renderGanado(){
    const gan=Reportes._ganado;
    const activos=gan.filter(a=>a.estado==='activo').length;
    const gdps=gan.map(a=>parseFloat(Ganado.calcGDP(a.pesoInicial,a.fechaPesoInicial,a.pesoActual,a.fechaPesoActual))).filter(v=>!isNaN(v)&&v>0);
    document.getElementById('rep-gan-stats').innerHTML=`
      <div class="rstat"><div class="rstat-val">${gan.length}</div><div class="rstat-lbl">Total animales</div></div>
      <div class="rstat"><div class="rstat-val">${activos}</div><div class="rstat-lbl">Activos</div></div>
      <div class="rstat"><div class="rstat-val">${gdps.length?(gdps.reduce((a,b)=>a+b,0)/gdps.length).toFixed(3):0} kg/día</div><div class="rstat-lbl">GDP promedio</div></div>`;
    const espMap={};gan.forEach(a=>espMap[a.especie]=(espMap[a.especie]||0)+1);
    const espE=Object.entries(espMap).filter(([,v])=>v>0);
    setTimeout(()=>{if(espE.length)Charts.donut(document.getElementById('chart-rep-esp'),espE.map(([k])=>Utils.especieLabel(k)),espE.map(([,v])=>v),Charts.COLORS);},200);
  },

  renderAgricola(){
    const l=Reportes._lotes,t=Reportes._tareas;
    const area=l.reduce((a,x)=>a+(x.area||0),0);
    const comp=t.filter(x=>x.estado==='completada').length;
    document.getElementById('rep-agri-stats').innerHTML=`
      <div class="rstat"><div class="rstat-val">${l.length}</div><div class="rstat-lbl">Lotes</div></div>
      <div class="rstat"><div class="rstat-val">${area.toFixed(1)} ha</div><div class="rstat-lbl">Área total</div></div>
      <div class="rstat"><div class="rstat-val">${t.length}</div><div class="rstat-lbl">Total tareas</div></div>
      <div class="rstat"><div class="rstat-val">${comp}</div><div class="rstat-lbl">Completadas</div></div>`;
    document.getElementById('rep-tareas-progress').innerHTML=l.map(lot=>{
      const tarL=t.filter(x=>x.loteId===lot.id),cmp=tarL.filter(x=>x.estado==='completada').length;
      const pct=tarL.length?Math.round((cmp/tarL.length)*100):0;
      return `<div style="margin-bottom:10px"><div class="flex jc-sb tsm"><span class="fb">${Utils.sanitize(lot.nombre)}</span><span>${pct}%</span></div><div class="pb-wrap"><div class="pb" style="width:${pct}%"></div></div></div>`;
    }).join('');
  },

  exportCSV(tipo){
    let rows=[],fname='reporte.csv';
    if(tipo==='financiero'){
      rows=[['Fecha','Tipo','Descripción','Categoría','Monto'],...Reportes._gastos.map(g=>['','Gasto',g.descripcion,Utils.catLabel(g.categoria),g.monto]),...Reportes._ingresos.map(i=>['','Ingreso',i.descripcion,Utils.ingresoLabel(i.categoria),i.monto])];
      fname='reporte-financiero.csv';
    }
    const csv=rows.map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}));a.download=fname;a.click();
  }
};

// =====================================================
// ADMIN
// =====================================================
const Admin = {
  _users:[],

  load(){
    if(!App.isAdmin()){document.getElementById('mod-admin').innerHTML='<div class="empty" style="margin-top:40px"><h3>Acceso restringido</h3><p>Solo el Propietario puede acceder a esta sección.</p></div>';return;}
    const unsub=App.db.collection('usuarios').orderBy('nombre').onSnapshot(s=>{Admin._users=s.docs.map(d=>({id:d.id,...d.data()}));Admin.render();},e=>console.error(e));
    App._subs.push(unsub);
  },

  render(){
    const tbody=document.getElementById('admin-tbody');
    if(!Admin._users.length){tbody.innerHTML=`<tr><td colspan="7"><div class="empty" style="border:none;padding:30px"><p>Sin usuarios</p></div></td></tr>`;return;}
    tbody.innerHTML=Admin._users.map(u=>`
      <tr>
        <td><div class="flex gap2 items-c"><div class="sbav" style="width:32px;height:32px;font-size:.78rem;flex-shrink:0">${Utils.initials(u.nombre||'?')}</div><div><div class="fb tsm">${Utils.sanitize(u.nombre||'—')}</div></div></div></td>
        <td class="tsm">${Utils.sanitize(u.email||'—')}</td>
        <td class="tsm">${Utils.sanitize(u.cargo||'—')}</td>
        <td>
          <select class="lsel ${Utils.levelClass(u.nivel)}" onchange="Admin.changeLevel('${u.id}',parseInt(this.value))" ${u.id===App.user?.uid?'disabled':''}>
            ${[0,1,2,3].map(n=>`<option value="${n}"${u.nivel===n?' selected':''}>${n}: ${Utils.levelLabel(n)}</option>`).join('')}
          </select>
        </td>
        <td><span class="badge ${u.activo!==false?'b-ok':'b-rojo'}">${u.activo!==false?'Activo':'Inactivo'}</span></td>
        <td class="tsm c-gris">${u.ultimoAcceso?.toDate?u.ultimoAcceso.toDate().toLocaleDateString('es-EC'):'—'}</td>
        <td class="ac" style="white-space:nowrap">
          <button class="bico" onclick="Admin.openForm('${u.id}')" title="Editar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="bico" onclick="Admin.resetPwd('${Utils.sanitize(u.email||'')}','${u.id}')" title="Reset contraseña"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></button>
          ${u.id!==App.user?.uid?`<button class="bico dan" onclick="Admin.toggleActive('${u.id}',${u.activo!==false})" title="${u.activo!==false?'Desactivar':'Activar'}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg></button>`:''}
        </td>
      </tr>`).join('');
  },

  async changeLevel(uid,nivel){
    try{await App.db.collection('usuarios').doc(uid).update({nivel,modificadoEn:firebase.firestore.FieldValue.serverTimestamp()});UI.showToast('Nivel actualizado','suc');}
    catch(e){UI.showToast('Error: '+e.message,'err');}
  },

  async toggleActive(uid,activo){
    try{await App.db.collection('usuarios').doc(uid).update({activo:!activo});UI.showToast(!activo?'Usuario activado':'Usuario desactivado','suc');}
    catch(e){UI.showToast('Error: '+e.message,'err');}
  },

  async resetPwd(email,uid){
    if(!email){UI.showToast('Este usuario no tiene email registrado','war');return;}
    UI.confirm(`¿Enviar correo de restablecimiento de contraseña a:\n${email}?`,async()=>{
      try{await App.auth.sendPasswordResetEmail(email);UI.showToast('Correo enviado a '+email,'suc',5000);}
      catch(e){UI.showToast('Error: '+e.message,'err');}
    },'Enviar correo');
  },

  openForm(id=null){
    const u=id?Admin._users.find(x=>x.id===id):null;
    const isNew=!id;
    UI.showModal({title:u?'Editar Usuario':'Nuevo Usuario',size:'lg',body:`
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Nombre completo *</label><input type="text" id="uf-nom" class="fc" value="${Utils.sanitize(u?.nombre||'')}" required maxlength="100"></div>
        <div class="fg"><label class="flbl">Cargo</label><input type="text" id="uf-cargo" class="fc" value="${Utils.sanitize(u?.cargo||'')}" maxlength="80"></div>
      </div>
      ${isNew?`<div class="fgrid fg2">
        <div class="fg"><label class="flbl">Email *</label><input type="email" id="uf-email" class="fc" required placeholder="correo@ejemplo.com"></div>
        <div class="fg"><label class="flbl">Contraseña temporal *</label><input type="password" id="uf-pwd" class="fc" required placeholder="mín. 8 caracteres" minlength="8"></div>
      </div>`:`<div class="fg"><label class="flbl">Email</label><input type="text" class="fc" value="${Utils.sanitize(u?.email||'')}" disabled style="background:var(--g100)"></div>`}
      <div class="fgrid fg2">
        <div class="fg"><label class="flbl">Nivel de acceso</label>
          <select id="uf-nivel" class="fc">${[0,1,2,3].map(n=>`<option value="${n}"${u?.nivel===n?' selected':''}>Nivel ${n}: ${Utils.levelLabel(n)}</option>`).join('')}</select></div>
        <div class="fg"><label class="flbl">Teléfono</label><input type="tel" id="uf-tel" class="fc" value="${Utils.sanitize(u?.telefono||'')}" placeholder="+593 9X XXX XXXX"></div>
      </div>
      ${isNew?`<div class="card" style="background:var(--dorado-pale);border-color:var(--dorado)"><p class="tsm" style="color:var(--dorado-dk)">⚠️ Se creará la cuenta con la contraseña indicada. Se recomienda pedir al usuario que la cambie en su primer ingreso.</p></div>`:''}`,
      onSave:()=>isNew?Admin.createUser():Admin.saveUser(id)
    });
  },

  async createUser(){
    const nom=document.getElementById('uf-nom').value.trim(),
          email=document.getElementById('uf-email').value.trim(),
          pwd=document.getElementById('uf-pwd').value,
          nivel=parseInt(document.getElementById('uf-nivel').value),
          cargo=document.getElementById('uf-cargo').value.trim(),
          tel=document.getElementById('uf-tel').value.trim();
    if(!nom||!email||!pwd||pwd.length<8){UI.showToast('Completa todos los campos (contraseña mín. 8 caracteres)','war');return false;}
    UI.loading(true);
    try{
      const sec=firebase.initializeApp(firebaseConfig,'sec_'+Date.now());
      const cred=await sec.auth().createUserWithEmailAndPassword(email,pwd);
      const uid=cred.user.uid;
      await sec.auth().signOut();await sec.delete();
      await App.db.collection('usuarios').doc(uid).set({nombre:nom,email,nivel,cargo,telefono:tel,activo:true,creadoEn:firebase.firestore.FieldValue.serverTimestamp()});
      UI.showToast('Usuario creado: '+nom,'suc',5000);
    }catch(e){UI.showToast('Error: '+e.message,'err',6000);return false;}
    finally{UI.loading(false);}
  },

  async saveUser(id){
    const nom=document.getElementById('uf-nom').value.trim();
    if(!nom){UI.showToast('El nombre es obligatorio','war');return false;}
    const data={nombre:nom,cargo:document.getElementById('uf-cargo').value.trim(),
      nivel:parseInt(document.getElementById('uf-nivel').value),telefono:document.getElementById('uf-tel').value.trim(),
      modificadoEn:firebase.firestore.FieldValue.serverTimestamp()};
    await App.db.collection('usuarios').doc(id).update(data);UI.showToast('Usuario actualizado','suc');
  }
};

// =====================================================
// SERVICE WORKER + INIT
// =====================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(r => console.log('SW registrado:', r.scope))
      .catch(e => console.warn('SW no registrado:', e));
  });
}

// Close user menu on outside click
document.addEventListener('click', e => {
  const um=document.getElementById('user-menu');
  if(um?.classList.contains('show')&&!um.contains(e.target)&&!document.getElementById('tav')?.contains(e.target))
    um.classList.remove('show');
  const sidebar=document.getElementById('sidebar');
  if(window.innerWidth<960&&sidebar?.classList.contains('open')&&!sidebar.contains(e.target)&&!document.querySelector('.hbtn')?.contains(e.target))
    Nav.closeSidebar();
});

// =====================================================
// VALENTINA — AI Assistant
// =====================================================
const Valentina = {
  _history: [],
  _context: '',

  load() {
    Valentina._history = [];
    const chat = document.getElementById('val-chat');
    chat.innerHTML = '';
    Valentina._setStatus('loading', 'Cargando datos…');
    const inp = document.getElementById('val-input');
    const btn = document.getElementById('val-send');
    inp.disabled = true; btn.disabled = true;

    inp.oninput = () => { inp.style.height='auto'; inp.style.height=Math.min(inp.scrollHeight,120)+'px'; };
    inp.onkeydown = e => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); Valentina.send(); } };

    const nombre = (App.profile?.nombre||'').split(' ')[0] || 'amigo';
    const nivel  = App.profile?.nivel ?? 3;
    Valentina._appendAI(`¡Hola ${nombre}! 👋 Soy Valentina, la asistente inteligente de Finca SantaFe. Dame un momento para revisar todos los datos de la finca…`);

    Valentina._buildContext().then(ctx => {
      Valentina._context = ctx;
      Valentina._setStatus('ready', 'Lista');
      inp.disabled = false; btn.disabled = false;
      const owner = Valentina._ownerName || 'el propietario';
      const readyMsg = nivel === 0
        ? `¡Listo ${nombre}! 🌿 Ya revisé todo. Pregúntame sobre el ganado, gastos, ingresos, cosechas, contactos o lo que necesites. ¿En qué te ayudo?`
        : `¡Listo! 🌿 Ya leí todos los datos de la finca. ${owner} me ha pedido que te ayude en todo lo que necesites en Finca SantaFe. ¿Cómo puedo ayudarte?`;
      Valentina._appendAI(readyMsg);
      inp.focus();
    }).catch(e => {
      Valentina._setStatus('error', 'Error');
      Valentina._appendAI('Ups 😅 No pude cargar todos los datos ('+e.message+'). Igual puedo ayudarte con preguntas generales.');
      inp.disabled = false; btn.disabled = false;
    });
  },

  _setStatus(type, text) {
    const dot = document.querySelector('#mod-valentina .val-dot');
    const txt = document.getElementById('val-status-text');
    if (dot) dot.className = 'val-dot' + (type !== 'ready' ? ' '+type : '');
    if (txt) txt.textContent = text;
  },

  async _buildContext() {
    const db = App.db;
    const ym = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const now = new Date();
    const thisM = ym(now);
    const prev  = new Date(now); prev.setMonth(prev.getMonth()-1);
    const lastM = ym(prev);
    const ctx   = [];

    const [ganadoS, gastosS, ingresosS, camadasS, agricolaS, contactosS, tareasS, eventosS, usuariosS] = await Promise.all([
      db.collection('ganado').get(),
      db.collection('gastos').orderBy('fecha','desc').get(),
      db.collection('ingresos').orderBy('fecha','desc').get(),
      db.collection('camadas').orderBy('fecha','desc').get(),
      db.collection('agricola').get(),
      db.collection('contactos').get(),
      db.collection('tareas').get(),
      db.collection('eventos').orderBy('fecha','desc').get(),
      db.collection('usuarios').get()
    ]);

    // Nombre del propietario para saludo a empleados
    const ownerDoc = usuariosS.docs.find(d=>d.data().nivel===0);
    Valentina._ownerName = ownerDoc ? (ownerDoc.data().nombre||'').split(' ')[0] || 'el propietario' : 'el propietario';

    // Ganado
    const gan   = ganadoS.docs.map(d=>d.data());
    const vivos = gan.filter(a=>!['vendido','muerto'].includes(a.estado));
    if (gan.length) {
      const pesos = vivos.filter(a=>a.pesoActual>0).map(a=>a.pesoActual);
      const gdps  = vivos.filter(a=>a.gdp>0).map(a=>a.gdp);
      const esp   = vivos.reduce((m,a)=>{const k=a.especie||'otros';m[k]=(m[k]||0)+1;return m},{});
      ctx.push(`GANADO — ${vivos.length} activas | ${gan.filter(a=>a.estado==='vendido').length} vendidas | ${gan.filter(a=>a.estado==='muerto').length} bajas
Por especie: ${Object.entries(esp).map(([k,v])=>`${k}: ${v}`).join(' | ')}
Peso promedio: ${pesos.length?(pesos.reduce((s,p)=>s+p,0)/pesos.length).toFixed(1)+' kg':'N/D'}
GDP promedio: ${gdps.length?(gdps.reduce((s,g)=>s+g,0)/gdps.length).toFixed(3)+' kg/día':'N/D'} (${gdps.length} con datos)
${vivos.filter(a=>a.nombre||a.codigo).slice(0,12).map(a=>`- ${a.nombre||a.codigo}: ${a.especie||''}, ${a.pesoActual||0} kg${a.gdp?' | GDP '+a.gdp+' kg/d':''}`).join('\n')}`);
    }

    // Gastos
    const gas    = gastosS.docs.map(d=>d.data());
    const gEste  = gas.filter(g=>g.fecha?.startsWith(thisM)).reduce((s,g)=>s+(g.monto||0),0);
    const gAnt   = gas.filter(g=>g.fecha?.startsWith(lastM)).reduce((s,g)=>s+(g.monto||0),0);
    const gTotal = gas.reduce((s,g)=>s+(g.monto||0),0);
    if (gas.length) {
      const cats = gas.reduce((m,g)=>{const k=g.categoria||'otros';m[k]=(m[k]||0)+(g.monto||0);return m},{});
      const top  = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}: $${v.toFixed(0)}`).join(' | ');
      ctx.push(`GASTOS — ${gas.length} registros | Total histórico: $${gTotal.toFixed(2)}
Este mes (${thisM}): $${gEste.toFixed(2)} | Mes anterior (${lastM}): $${gAnt.toFixed(2)}
Por categoría: ${top}
Últimos registros:
${gas.slice(0,6).map(g=>`- ${g.fecha||''} [${g.categoria||''}]: $${g.monto||0}${g.descripcion?' — '+g.descripcion:''}`).join('\n')}`);
    }

    // Ingresos
    const ing    = ingresosS.docs.map(d=>d.data());
    const iEste  = ing.filter(i=>i.fecha?.startsWith(thisM)).reduce((s,i)=>s+(i.monto||0),0);
    const iAnt   = ing.filter(i=>i.fecha?.startsWith(lastM)).reduce((s,i)=>s+(i.monto||0),0);
    const iTotal = ing.reduce((s,i)=>s+(i.monto||0),0);
    if (ing.length) {
      const iCats = ing.reduce((m,i)=>{const k=i.categoria||i.concepto||'otros';m[k]=(m[k]||0)+(i.monto||0);return m},{});
      const iTop  = Object.entries(iCats).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>`${k}: $${v.toFixed(0)}`).join(' | ');
      ctx.push(`INGRESOS — ${ing.length} registros | Total histórico: $${iTotal.toFixed(2)}
Este mes (${thisM}): $${iEste.toFixed(2)} | Mes anterior (${lastM}): $${iAnt.toFixed(2)}
Balance neto este mes: $${(iEste-gEste).toFixed(2)} | Balance histórico: $${(iTotal-gTotal).toFixed(2)}
Por concepto: ${iTop}`);
    }

    // Camadas
    const cam = camadasS.docs.map(d=>d.data());
    if (cam.length) {
      const act = cam.filter(c=>!['vendida','muerta'].includes(c.estado));
      const totCrias = cam.reduce((s,c)=>s+(c.cantidad||0),0);
      ctx.push(`CAMADAS — ${act.length} activas | ${cam.length} total | ${totCrias} crías registradas
${cam.slice(0,8).map(c=>`- ${c.fecha||''} ${c.especie||''}: ${c.cantidad||0} crías, estado: ${c.estado||'activa'}${c.madre?' madre: '+c.madre:''}`).join('\n')}`);
    }

    // Lotes agrícolas
    const agr   = agricolaS.docs.map(d=>({...d.data()}));
    const lotes = agr.filter(a=>a.hectareas||a.cultivo||a.tipo==='lote');
    if (lotes.length) {
      const haTotal = lotes.reduce((s,l)=>s+(parseFloat(l.hectareas)||0),0);
      ctx.push(`LOTES AGRÍCOLAS — ${lotes.length} lotes | ${haTotal.toFixed(1)} ha totales
${lotes.map(l=>`- ${l.nombre||'Sin nombre'}: ${l.hectareas||0} ha | cultivo: ${l.cultivo||'N/D'} | estado: ${l.estado||'N/D'}`).join('\n')}`);
    }

    // Tareas (colección separada)
    const tar  = tareasS.docs.map(d=>d.data());
    const pend = tar.filter(t=>t.estado!=='completada');
    if (tar.length) {
      ctx.push(`TAREAS — ${pend.length} pendientes | ${tar.length-pend.length} completadas
${pend.slice(0,10).map(t=>`- [${t.prioridad||'normal'}] ${t.nombre||t.descripcion||'Sin nombre'}${t.fechaVence?' | vence: '+t.fechaVence:''}`).join('\n')}`);
    }

    // Contactos
    const cont = contactosS.docs.map(d=>d.data());
    if (cont.length) {
      const tipos = cont.reduce((m,c)=>{const k=c.tipo||'otro';m[k]=(m[k]||0)+1;return m},{});
      ctx.push(`CONTACTOS — ${cont.length} total
Por tipo: ${Object.entries(tipos).map(([k,v])=>`${k}: ${v}`).join(' | ')}
${cont.slice(0,10).map(c=>`- ${c.nombre||''} (${c.tipo||''}): ${c.telefono||c.email||''}`).join('\n')}`);
    }

    // Eventos próximos
    const hoy  = new Date().toISOString().slice(0,10);
    const evts = eventosS.docs.map(d=>d.data());
    const prox = evts.filter(e=>e.fecha>=hoy).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')).slice(0,8);
    if (prox.length) {
      ctx.push(`EVENTOS PRÓXIMOS
${prox.map(e=>`- ${e.fecha||''}: ${e.titulo||e.nombre||'Sin título'}${e.descripcion?' — '+e.descripcion:''}`).join('\n')}`);
    }

    return ctx.join('\n\n') || 'No hay datos registrados aún en la finca.';
  },

  _appendAI(text) {
    const chat = document.getElementById('val-chat');
    const d = document.createElement('div');
    d.className = 'val-msg val-msg-ai';
    const bbl = document.createElement('div'); bbl.className = 'val-bbl'; bbl.textContent = text;
    d.innerHTML = '<div class="val-mav">V</div>';
    d.appendChild(bbl);
    chat.appendChild(d); chat.scrollTop = chat.scrollHeight;
  },

  _appendUser(text) {
    const chat = document.getElementById('val-chat');
    const d = document.createElement('div'); d.className = 'val-msg val-msg-user';
    const bbl = document.createElement('div'); bbl.className = 'val-bbl'; bbl.textContent = text;
    d.appendChild(bbl); chat.appendChild(d); chat.scrollTop = chat.scrollHeight;
  },

  _showTyping() {
    const chat = document.getElementById('val-chat');
    const d = document.createElement('div');
    d.className = 'val-msg val-msg-ai val-typing'; d.id = 'val-typ';
    d.innerHTML = '<div class="val-mav">V</div><div class="val-bbl"><span></span><span></span><span></span></div>';
    chat.appendChild(d); chat.scrollTop = chat.scrollHeight;
  },

  async send() {
    const inp = document.getElementById('val-input');
    const btn = document.getElementById('val-send');
    const text = inp.value.trim();
    if (!text || btn.disabled) return;

    inp.value = ''; inp.style.height = 'auto';
    inp.disabled = true; btn.disabled = true;

    Valentina._appendUser(text);
    Valentina._history.push({ role:'user', content:text });
    Valentina._showTyping();

    try {
      const res = await fetch('/api/valentina', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ messages: Valentina._history.slice(-12), context: Valentina._context })
      });
      document.getElementById('val-typ')?.remove();

      if (!res.ok) {
        const e = await res.json().catch(()=>({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      const data  = await res.json();
      const reply = data.content?.[0]?.text || '(Sin respuesta)';
      Valentina._history.push({ role:'assistant', content:reply });
      Valentina._appendAI(reply);
    } catch(e) {
      document.getElementById('val-typ')?.remove();
      Valentina._appendAI(`Oops, tuve un problemilla 😬 — ${e.message}. ¿Le intentamos de nuevo?`);
    } finally {
      inp.disabled = false; btn.disabled = false; inp.focus();
    }
  }
};

// Keyboard: ESC closes modal
document.addEventListener('keydown', e => { if(e.key==='Escape')UI.closeModal(); });

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
