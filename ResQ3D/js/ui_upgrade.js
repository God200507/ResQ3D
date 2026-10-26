const $ = id => document.getElementById(id);

function setPanel(id,open){
  const p=$(id); if(!p) return;
  p.classList.toggle('resq-open',open);
}

function createEmergencyHUD(){
  if($('emergencyHUD')) return;
  const h=document.createElement('div'); h.id='emergencyHUD'; h.innerHTML=`<div class="ehud-main"><span class="ehud-title">🚨 EMERGENCY MODE</span><span class="ehud-location" id="ehudLocation">Waiting...</span></div><div class="ehud-grid"><div><span>RISK</span><b id="ehudRisk" class="critical">---</b></div><div><span>SAFE STAIR</span><b id="ehudStair" class="safe">---</b></div><div><span>PEOPLE</span><b id="ehudPeople">0 / 0</b></div><div><span>STATUS</span><b id="ehudStatus">ACTIVE</b></div></div>`;
  $('app').appendChild(h);
}

function setFirefighterButton(show){
  const b=$('btnFirefighter');
  if(!b) return;
  b.hidden=!show;
  b.classList.toggle('active',show);
}

function updateHUD(){
  const fire=window.__RESQ_STATE?.fire;
  const em=window.__RESQ_STATE?.emergency;
  const evac=window.__RESQ_STATE?.evac;
  const hud=$('emergencyHUD');
  if(!hud) return;
  if(!fire||!em){hud.classList.remove('active');document.body.classList.remove('resq-emergency');setFirefighterButton(false);return;}
  hud.classList.add('active'); document.body.classList.add('resq-emergency');
  $('ehudLocation').textContent=`F${fire.fIdx} · ${fire.room.name}`;
  $('ehudRisk').textContent=em.severity;
  $('ehudStair').textContent=em.safeStair;
  $('ehudPeople').textContent=`${evac?.evacuatedCount||0} / ${evac?.people?.length||0}`;
  $('ehudStatus').textContent=evac?.completed?'EVACUATED':'EVACUATING';
  setFirefighterButton(true);
}

function install(){
  createEmergencyHUD();
  const menu=$('utilityMenu');
  $('btnTools')?.addEventListener('click',()=>menu?.classList.toggle('open'));
  $('btnFirefighter')?.addEventListener('click',()=>{
    const fire=window.__RESQ_STATE?.fire;
    if(!fire) return;
    const stair=window.__RESQ_STATE?.emergency?.safeStair||fire.safeStair||'STAIR_A';
    const u=new URL('./emergency.html',location.href);
    u.searchParams.set('demo','1');
    u.searchParams.set('floor',String(fire.fIdx));
    u.searchParams.set('room',fire.room.id);
    u.searchParams.set('stair',stair);
    window.open(u.toString(),'_blank');
  });

  $('btnDemo')?.addEventListener('click',(ev)=>{ev.preventDefault();ev.stopPropagation();
    const rooms=window.__RESQ_ALL_ROOMS||[];
    const target=rooms.find(r=>r.id==='F2_LAB_01')||rooms.find(r=>r.floorIdx===2)||rooms[0];
    if(target) window.dispatchEvent(new CustomEvent('resq3d:demo-fire',{detail:target.id}));
  });
  document.querySelectorAll('.utility-btn').forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.panel;
    const p=$(id); if(!p) return;
    const open=!p.classList.contains('resq-open');
    ['commandPanel','analyticsPanel','opsPanel'].forEach(x=>setPanel(x,false));
    setPanel(id,open); menu?.classList.remove('open');
  }));
  const hideLater=()=>{
    ['commandPanel','analyticsPanel','opsPanel'].forEach(x=>setPanel(x,false));
  };
  setTimeout(hideLater,1800);
  setInterval(updateHUD,250);
  window.addEventListener('resq3d:emergency-cleared',updateHUD);
}

window.addEventListener('load',()=>setTimeout(install,700));
