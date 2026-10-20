/** Pure deterministic simulation. Distances are logical canvas pixels; time is seconds. */
export const TAU = Math.PI * 2;
export const SPAWN_RADIUS = 260;
export const SHORE_RADIUS = 90;
export const nights = [
  { name: 'Primer destello', subtitle: 'El mar te da la bienvenida.', total: 6, target: 4, interval: 3, speed: 17, chargeTime: .95, drift: 0, beam: .28 },
  { name: 'Rutas cruzadas', subtitle: 'Un puerto, muchos caminos.', total: 9, target: 7, interval: 2.5, speed: 21, chargeTime: 1.05, drift: .015, beam: .27 },
  { name: 'Mar de fondo', subtitle: 'La corriente también juega.', total: 12, target: 10, interval: 2.15, speed: 25, chargeTime: 1.1, drift: .035, beam: .26 },
  { name: 'Viento del norte', subtitle: 'No pierdas de vista las velas.', total: 14, target: 12, interval: 1.9, speed: 28, chargeTime: 1.15, drift: .05, beam: .25 },
  { name: 'Antes del alba', subtitle: 'Una última luz antes del sol.', total: 16, target: 14, interval: 1.75, speed: 30, chargeTime: 1.15, drift: .065, beam: .25 },
];
export const wrapAngle = (a) => ((a % TAU) + TAU) % TAU;
export const angleDistance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
export function makeRun(level = 0) {
  if (!Number.isInteger(level) || !nights[level]) level = 0;
  return { level, status: 'playing', elapsed: 0, beamAngle: -Math.PI / 2, spawned: 0, rescued: 0, missed: 0, score: 0, combo: 0, boats: [], events: [], nextSpawn: .65 };
}
export function turn(run, direction, dt) { run.beamAngle = wrapAngle(run.beamAngle + direction * 2.65 * dt); }
export function aim(run, angle) { if (Number.isFinite(angle)) run.beamAngle = wrapAngle(angle); }
function spawn(run, config) {
  const i = run.spawned++;
  // Golden-angle routes avoid repeated left/right rhythms. Every night is reproducible.
  const angle = wrapAngle(-Math.PI / 2 + i * 2.3999632297 + run.level * .68);
  run.boats.push({ id: i, angle, radius: SPAWN_RADIUS, charge: 0, drift: (i % 2 ? 1 : -1) * config.drift, speed: config.speed * (1 + (i % 3) * .04) });
}
export function step(run, delta) {
  run.events = [];
  if (run.status !== 'playing' || !Number.isFinite(delta) || delta <= 0) return run;
  // Small substeps make the result independent of display refresh rate.
  let remaining = Math.min(delta, .25);
  const config = nights[run.level];
  while (remaining > .000001 && run.status === 'playing') {
    const dt = Math.min(remaining, 1 / 120); remaining -= dt; run.elapsed += dt;
    if (run.spawned < config.total && run.elapsed + 1e-7 >= run.nextSpawn) { spawn(run, config); run.nextSpawn += config.interval; }
    const survivors = [];
    for (const boat of run.boats) {
      boat.radius -= boat.speed * dt;
      boat.angle = wrapAngle(boat.angle + boat.drift * dt);
      const lit = angleDistance(boat.angle, run.beamAngle) <= config.beam;
      boat.charge = Math.max(0, Math.min(1, boat.charge + (lit ? 1 / config.chargeTime : -.18) * dt));
      if (boat.charge >= 1 - 1e-7) {
        run.rescued++; run.combo++; const points = 100 + Math.min(run.combo - 1, 4) * 25; run.score += points;
        run.events.push({ type: 'rescue', angle: boat.angle, radius: boat.radius, points });
      } else if (boat.radius <= SHORE_RADIUS) {
        run.missed++; run.combo = 0; run.events.push({ type: 'miss', angle: boat.angle, radius: boat.radius });
      } else survivors.push(boat);
    }
    run.boats = survivors;
    if (run.rescued >= config.target) { run.status = 'won'; run.events.push({ type: 'win' }); }
    else if (run.missed > config.total - config.target) { run.status = 'lost'; run.events.push({ type: 'loss' }); }
  }
  return run;
}
export function starsFor(run) { return run.status === 'won' ? (run.missed === 0 ? 3 : run.missed === 1 ? 2 : 1) : 0; }
export function restoreRun(value) {
  if (!value || typeof value !== 'object' || !Number.isInteger(value.level) || !nights[value.level]) return null;
  const c = nights[value.level];
  const integer = (n, max) => Number.isInteger(n) && n >= 0 && n <= max;
  if (!['playing', 'won', 'lost'].includes(value.status) || !Number.isFinite(value.elapsed) || value.elapsed < 0 || value.elapsed > 600 || !Number.isFinite(value.beamAngle) || !Number.isFinite(value.nextSpawn) || value.nextSpawn < .65 || value.nextSpawn > 60) return null;
  if (!integer(value.spawned, c.total) || !integer(value.rescued, c.total) || !integer(value.missed, c.total) || !integer(value.score, 50000) || !integer(value.combo, c.total) || !Array.isArray(value.boats) || value.boats.length > c.total) return null;
  if (value.rescued + value.missed + value.boats.length !== value.spawned) return null;
  const ids = new Set();
  for (const b of value.boats) {
    if (!b || !integer(b.id, c.total - 1) || b.id >= value.spawned || ids.has(b.id) || !Number.isFinite(b.angle) || !Number.isFinite(b.radius) || b.radius <= SHORE_RADIUS || b.radius > SPAWN_RADIUS || !Number.isFinite(b.charge) || b.charge < 0 || b.charge > 1 || !Number.isFinite(b.drift) || Math.abs(b.drift) > .1 || !Number.isFinite(b.speed) || b.speed < 10 || b.speed > 40) return null;
    ids.add(b.id);
  }
  if ((value.status === 'won') !== (value.rescued >= c.target)) return null;
  if ((value.status === 'lost') !== (value.missed > c.total - c.target)) return null;
  return { ...makeRun(value.level), ...value, beamAngle: wrapAngle(value.beamAngle), boats: value.boats.map(b => ({ ...b })), events: [] };
}
