import { nights, makeRun, step, turn, aim, angleDistance, starsFor, TAU } from './engine.js';
import { readProgress, saveProgress, recordWin, unlockedLevel } from './progress.js';
const $ = (s) => document.querySelector(s);
const canvas = $('#sea'); const ctx = canvas.getContext('2d');
const initial = readProgress(); let progress = initial.progress; let storageAvailable = initial.available;
let run = progress.run || makeRun(progress.currentLevel), active = false, mode = progress.run ? (run.status === 'playing' ? 'paused' : run.status) : 'idle';
let lastTime = 0, lastSave = 0, visualTime = 0, effects = [], held = new Set(), pointerSteering = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => String(n).padStart(4, '0');
function storageLabel() { $('#save-status').textContent = storageAvailable ? 'Avance y mejores marcas guardados en este navegador. No se sincronizan con otros dispositivos.' : 'Guardado no disponible: podrás jugar, pero el avance durará solo esta sesión.'; }
function persist() { progress.run = run; storageAvailable = saveProgress(progress) && storageAvailable; storageLabel(); }
function feedback(text) { $('#feedback').textContent = text; }
function updateHUD() {
  const config = nights[run.level];
  $('#night-label').textContent = `NOCHE ${String(run.level + 1).padStart(2, '0')} / 05`;
  $('#night-name').textContent = config.name;
  $('#rescued').replaceChildren(document.createTextNode(`${run.rescued} `)); const small = document.createElement('small'); small.textContent = `/ ${config.target}`; $('#rescued').append(small);
  const lives = Math.max(0, 3 - run.missed); $('#lives').textContent = '● '.repeat(lives).trim() + (lives && lives < 3 ? ' ' : '') + '○ '.repeat(3 - lives).trim();
  $('#lives').setAttribute('aria-label', `${run.missed} barcos perdidos. El tercero termina la noche.`);
  $('#score').textContent = fmt(run.score); $('#pause-button').disabled = !active;
  $('#sea-caption').textContent = active ? `${Math.max(0, config.total - run.spawned)} BARCOS POR LLEGAR` : 'COSTA DE LA LUNA';
}
function renderNights() {
  const unlocked = unlockedLevel(progress); $('#completion').textContent = `${Object.keys(progress.completed).length} / 5`;
  $('#night-list').replaceChildren(...nights.map((night, index) => {
    const button = document.createElement('button'); button.className = `night-button${index === run.level ? ' active' : ''}`; button.disabled = index > unlocked; button.dataset.level = index;
    button.setAttribute('aria-label', `Noche ${index + 1}: ${night.name}${index > unlocked ? ', bloqueada' : ''}${progress.completed[index] ? `, ${progress.completed[index].stars} estrellas, mejor puntuación ${progress.completed[index].bestScore}` : ''}`);
    button.setAttribute('aria-current', index === run.level ? 'step' : 'false');
    for (const [className, text] of [['night-number', String(index + 1).padStart(2, '0')], ['night-title', night.name], ['night-mark', progress.completed[index] ? '★'.repeat(progress.completed[index].stars) : index > unlocked ? '· · ·' : '↗']]) { const s = document.createElement('span'); s.className = className; s.textContent = text; button.append(s); }
    button.onclick = () => {
      if (index === run.level) { if (active) pause(); return; }
      active = false; held.clear(); pointerSteering = 0; run = makeRun(index); progress.currentLevel = index; effects = []; mode = 'idle'; persist(); updateHUD(); renderNights(); renderOverlay(); feedback('Tu siguiente guardia está por empezar.');
    };
    return button;
  }));
}
function renderOverlay() {
  $('#overlay').hidden = active;
  if (active) return;
  const title = $('#overlay-title'), copy = $('#overlay-copy'), kicker = $('#overlay-kicker'), primary = $('#start-button'), secondary = $('#secondary-button');
  secondary.hidden = true; $('#overlay-icon').textContent = mode === 'won' ? '★'.repeat(starsFor(run)) : mode === 'lost' ? '☾' : '✷';
  if (mode === 'won') {
    const allDone = Object.keys(progress.completed).length === nights.length;
    kicker.textContent = allDone ? 'LAS CINCO NOCHES, A SALVO' : `NOCHE ${run.level + 1} COMPLETADA`;
    title.textContent = allDone ? 'Ya viene el amanecer.' : 'Hoy, el mar trae buenas noticias.';
    copy.textContent = `${run.rescued} barcos a salvo · ${run.score} puntos. ${run.missed === 0 ? 'Una guardia perfecta: nadie se quedó atrás.' : 'Tu luz hizo la diferencia. Puedes volver por las tres estrellas.'}`;
    primary.textContent = run.level < nights.length - 1 ? 'Siguiente noche ↗' : 'Volver a la primera noche ↗';
    primary.onclick = () => startFresh(run.level < nights.length - 1 ? run.level + 1 : 0);
    secondary.hidden = false; secondary.textContent = 'Repetir esta noche'; secondary.onclick = () => startFresh(run.level);
  } else if (mode === 'lost') {
    kicker.textContent = 'EL MAR DA OTRA OPORTUNIDAD'; title.textContent = 'Mañana, vuelve a encenderla.';
    copy.textContent = `Salvaste ${run.rescued} de ${nights[run.level].target} barcos necesarios. Prioriza los más cercanos a las rocas y mantén el haz hasta llenar su aro.`;
    primary.textContent = 'Volver a intentarlo ↗'; primary.onclick = () => startFresh(run.level);
  } else if (mode === 'paused') {
    kicker.textContent = 'LA COSTA PUEDE ESPERAR'; title.textContent = 'Tu guardia está en pausa.';
    copy.textContent = `${run.rescued} barcos a salvo. Retoma justo donde lo dejaste, sin perder tiempo mientras estás fuera.`;
    primary.textContent = 'Continuar la noche ↗'; primary.onclick = resume;
    secondary.hidden = false; secondary.textContent = 'Reiniciar esta noche'; secondary.onclick = () => startFresh(run.level);
  } else {
    kicker.textContent = `NOCHE ${run.level + 1} · ${nights[run.level].name.toUpperCase()}`; title.textContent = 'Una luz. Muchos caminos a casa.';
    copy.textContent = `Guía ${nights[run.level].target} barcos a puerto. Apunta y mantén la luz hasta llenar el aro de cada barco antes de que toque las rocas.`;
    primary.textContent = 'Encender el faro ↗'; primary.onclick = () => startFresh(run.level);
  }
}
function resume() { active = true; mode = 'playing'; lastTime = performance.now(); held.clear(); pointerSteering = 0; renderOverlay(); updateHUD(); canvas.focus({ preventScroll: true }); feedback('Orienta la luz y mantén iluminado cada barco.'); }
function startFresh(level) { run = makeRun(level); progress.currentLevel = level; effects = []; persist(); renderNights(); resume(); }
function pause() { if (!active) return; active = false; mode = 'paused'; held.clear(); pointerSteering = 0; persist(); updateHUD(); renderOverlay(); feedback('En pausa. Tu guardia puede esperar.'); $('#start-button').focus({ preventScroll: true }); }
$('#pause-button').onclick = pause;
window.addEventListener('keydown', (event) => {
  if (event.target.closest('button,a,input,textarea,select') && !active && mode !== 'paused') return;
  const key = event.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'a', 'd', ' ', 'p', 'escape'].includes(key)) {
    if (active || mode === 'paused') event.preventDefault();
    if ([' ', 'p', 'escape'].includes(key) && !event.repeat) { if (active) pause(); else if (mode === 'paused') resume(); }
    else if (active) held.add(key);
  }
});
window.addEventListener('keyup', (event) => held.delete(event.key.toLowerCase()));
window.addEventListener('blur', pause); document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('pagehide', () => { if (active) pause(); else if (progress.run) persist(); });
function aimAt(event) {
  if (!active) return;
  const r = canvas.getBoundingClientRect(), x = event.clientX - (r.x + r.width / 2), y = event.clientY - (r.y + r.height / 2);
  if (Math.hypot(x, y) > 12) aim(run, Math.atan2(y, x));
}
canvas.addEventListener('pointerdown', (event) => { if (!active) return; event.preventDefault(); canvas.setPointerCapture(event.pointerId); aimAt(event); });
canvas.addEventListener('pointermove', (event) => { if (event.pointerType === 'mouse' || canvas.hasPointerCapture(event.pointerId)) aimAt(event); });
for (const [id, direction] of [['#turn-left', -1], ['#turn-right', 1]]) {
  const button = $(id);
  button.addEventListener('pointerdown', (event) => { if (!active) return; event.preventDefault(); button.setPointerCapture(event.pointerId); pointerSteering = direction; });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => { pointerSteering = 0; });
  button.addEventListener('click', (event) => { if (active && event.detail === 0) turn(run, direction, .16); });
}
function path(points, fill, stroke) { ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); if (fill) {ctx.fillStyle=fill;ctx.fill();} if (stroke) {ctx.strokeStyle=stroke;ctx.stroke();} }
function circle(x,y,r,fill,stroke) {ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function drawBoat(boat, preview = false) {
  const x = Math.cos(boat.angle)*boat.radius, y = Math.sin(boat.angle)*boat.radius;
  const lit = !preview && angleDistance(boat.angle,run.beamAngle) <= nights[run.level].beam;
  ctx.save();ctx.translate(x,y);
  if(boat.radius<140&&!preview){ctx.globalAlpha=.28;circle(0,0,25,'#e99564');ctx.globalAlpha=1;}
  circle(0,0,21,null,lit?'#91bfc355':'#477a8544');
  if(boat.charge>0){ctx.beginPath();ctx.arc(0,0,21,-Math.PI/2,-Math.PI/2+boat.charge*TAU);ctx.strokeStyle='#f5d78d';ctx.lineWidth=3;ctx.stroke();ctx.lineWidth=1;}
  ctx.rotate(boat.angle+Math.PI/2);
  ctx.strokeStyle='#78979d55';ctx.beginPath();ctx.moveTo(-9,15);ctx.quadraticCurveTo(-15,29,-12,39);ctx.moveTo(9,15);ctx.quadraticCurveTo(15,29,12,39);ctx.stroke();
  path([[-10,9],[0,17],[10,9],[7,-11],[0,-17],[-7,-11]],lit?'#ecd39e':'#c3d8ce');
  ctx.fillStyle='#cc7855';ctx.fillRect(-3,5,6,5);ctx.strokeStyle='#3b6268';ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(0,9);ctx.stroke();
  path([[-1,-10],[-1,4],[-10,3]],lit?'#fff1c0':'#eef1df');path([[2,-8],[2,5],[9,5]],'#7aa49d');ctx.restore();
}
function draw() {
  const rect = canvas.getBoundingClientRect(); const dpr = Math.min(devicePixelRatio || 1, 2);
  const width = Math.round(rect.width*dpr), height = Math.round(rect.height*dpr);
  if (canvas.width !== width || canvas.height !== height) { canvas.width=width;canvas.height=height; }
  ctx.setTransform(dpr,0,0,dpr,0,0); const w=rect.width,h=rect.height;
  const bg=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)*.72);bg.addColorStop(0,'#214b55');bg.addColorStop(.58,'#123643');bg.addColorStop(1,'#0b2834');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.translate(w/2,h/2);ctx.scale(Math.min(w,h)/640,Math.min(w,h)/640);
  // Engraved chart lines and tiny currents, all drawn locally with no assets or tracking.
  ctx.lineWidth=1;ctx.strokeStyle='#77a3a313';for(const radius of[130,200,270])circle(0,0,radius,null,'#77a3a313');
  ctx.setLineDash([3,9]);circle(0,0,90,null,'#d4b38366');ctx.setLineDash([]);
  for(let i=0;i<54;i++){const x=((i*173+31)%610)-305,y=((i*97+53)%610)-305;if(Math.hypot(x,y)<100)continue;const shift=reducedMotion?0:Math.sin(visualTime*.35+i)*3;ctx.strokeStyle=i%4===0?'#8cb6ba33':'#719ba520';ctx.beginPath();ctx.moveTo(x-7+shift,y);ctx.quadraticCurveTo(x+shift,y-4,x+7+shift,y);ctx.stroke();}
  const a=run.beamAngle,half=nights[run.level].beam;
  const beam=ctx.createRadialGradient(0,0,10,0,0,320);beam.addColorStop(0,'#fff0ad88');beam.addColorStop(.5,'#ffda762e');beam.addColorStop(1,'#ffdc7000');ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,320,a-half,a+half);ctx.closePath();ctx.fillStyle=beam;ctx.fill();
  ctx.strokeStyle='#f7d99233';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a-half)*295,Math.sin(a-half)*295);ctx.moveTo(0,0);ctx.lineTo(Math.cos(a+half)*295,Math.sin(a+half)*295);ctx.stroke();
  // Basalt island and warm lighthouse.
  ctx.save();ctx.translate(0,24);ctx.scale(1,.74);circle(0,0,73,'#153038','#40616a');circle(0,0,60,'#2d4a48');
  for(let i=0;i<13;i++){const angle=i/13*TAU,r=59+(i%3)*4;ctx.save();ctx.translate(Math.cos(angle)*r,Math.sin(angle)*r);ctx.rotate(angle);path([[-12,-9],[0,-14],[13,-5],[10,10],[-9,11]],i%2?'#60706a':'#475f5b','#1b3b40');ctx.restore();}ctx.restore();
  path([[-21,11],[-31,66],[30,66],[20,11]],'#e3ddbd');path([[20,11],[30,66],[40,57],[29,6]],'#a8b3a0');path([[-24,30],[-27,44],[26,44],[23,30]],'#cf8059');path([[23,30],[26,44],[36,37],[33,23]],'#976748');
  ctx.fillStyle='#29454a';ctx.fillRect(-5,49,10,17);ctx.fillStyle='#f4d58c';ctx.fillRect(-15,-7,30,19);ctx.fillStyle='#6b7c70';ctx.fillRect(-19,11,38,5);path([[-23,-8],[0,-24],[23,-8]],'#dd9060');ctx.fillStyle='#25464b';ctx.fillRect(-2,-6,4,16);circle(0,0,7,'#fff2b5');
  if(mode==='idle'&&!active){for(const boat of [{angle:-1.5,radius:202,charge:0},{angle:.2,radius:229,charge:0},{angle:2.65,radius:185,charge:0}])drawBoat(boat,true);}else for(const boat of run.boats)drawBoat(boat);
  for(const e of effects){ctx.save();ctx.globalAlpha=Math.max(0,e.life/1.3);const x=Math.cos(e.angle)*e.radius,y=Math.sin(e.angle)*e.radius;circle(x,y,22+(1.3-e.life)*20,null,e.type==='rescue'?'#f5d78d':'#e99564');ctx.font='bold 15px Arial';ctx.textAlign='center';ctx.fillStyle=e.type==='rescue'?'#ffe8a8':'#efaa87';ctx.fillText(e.type==='rescue'?`+${e.points}`:'−1',x,y-30-(1.3-e.life)*15);ctx.restore();}
}
function tick(now) {
  const dt = Math.min(Math.max((now-lastTime)/1000,0),.05); lastTime=now; visualTime+=dt;
  if(active){
    const direction=pointerSteering||(Number(held.has('arrowright')||held.has('d'))-Number(held.has('arrowleft')||held.has('a'))); if(direction)turn(run,direction,dt);
    step(run,dt);
    for(const event of run.events){
      if(event.type==='rescue'){effects.push({...event,life:1.3});feedback(run.combo>1?`¡${run.combo} a salvo seguidos! +${event.points} puntos`:`Un barco a salvo. +${event.points} puntos`);}
      if(event.type==='miss'){effects.push({...event,life:1.3});feedback(`${run.missed}/3 barcos perdidos. Prioriza los más cercanos.`);}
    }
    updateHUD();
    if(run.status!=='playing'){active=false;mode=run.status;if(mode==='won')recordWin(progress,run);persist();renderNights();updateHUD();renderOverlay();$('#start-button').focus({preventScroll:true});feedback(mode==='won'?'Guardia completada. Tu marca quedó guardada.':'Puedes volver a intentarlo las veces que quieras.');}
    else if(now-lastSave>1000){persist();lastSave=now;}
  }
  effects=effects.map(e=>({...e,life:e.life-dt})).filter(e=>e.life>0);draw();requestAnimationFrame(tick);
}
updateHUD();renderNights();renderOverlay();storageLabel();requestAnimationFrame(tick);
