// ---------------------------------------------------------------------------
// Hit resolution: hitbox sweeps, damage, guard, perfect parry, hitstop,
// impact effects and attack tokens (limits how many enemies swing at once).
// ---------------------------------------------------------------------------
const Combat = {
  tokens: 2,
  reset() { this.tokens = 2; },
  worldBox(att, h) {
    const f = att.facing;
    return [f > 0 ? att.x + h.box[0] : att.x - h.box[0] - h.box[2], att.y + h.box[1], h.box[2], h.box[3]];
  },
  sweep(att, h) {
    const box = this.worldBox(att, h);
    if (G.debugBoxes) G.dbg.push(box);
    for (const t of G.ents) {
      if (t === att || t.dead || !t.hittable || t.team === att.team || t.team === 0) continue;
      if (t.team === 3 && att.team !== 1) continue;
      if (att.hitSet.has(t.id)) continue;
      if (!overlap(box, t.box())) continue;
      att.hitSet.add(t.id);
      this.resolve(att, t, h, h.radial ? (t.x >= att.x ? 1 : -1) : att.facing);
    }
  },
  resolve(att, t, h, dir) {
    if (t.inv > 0) return 'miss';
    if (t.onStrike) return t.onStrike(att, h, dir);
    if (t.st === 'guard' && t.facing === -dir && !h.unblock) return t.parryT > 0 ? this.parry(att, t, h, dir) : this.block(att, t, h, dir);
    let dmg = h.dmg * (att.dmgMul ?? 1) * (t.dmgTaken ?? 1);
    if (t.st === 'stagger') dmg *= 1.5;
    if (att === G.player && att.counter > 0) { dmg *= 1.6; att.counter = 0; FX.text(t.x, t.y - t.h - 18, 'COUNTER', '#ffd060', { life: 50 }); }
    dmg = Math.max(1, Math.round(dmg));
    t.hp -= dmg;
    const hx = t.x - dir * 3, hy = t.y - t.h * 0.62 + rnd(-4, 4);
    const heavy = (h.stop || 4) >= 7;
    FX.star(hx, hy, { size: heavy ? 16 : 11, cols: att.team === 1 ? ['#ffffff', '#fff0a0', '#ffb040'] : ['#ffffff', '#ffc0a0', '#ff5a3a'] });
    FX.sparks(hx, hy, dir > 0 ? 0 : Math.PI, heavy ? 12 : 7);
    if (t.bleeds !== false) FX.blood(hx, hy, dir > 0 ? -0.3 : Math.PI + 0.3, heavy ? 10 : 6);
    if (h.fx === 'pierce') FX.streak(t.x - dir * 14, hy, dir, 30, { life: 7 });
    FX.text(t.x + rnd(-6, 6), t.y - t.h - 8, dmg, att.team === 1 ? (heavy ? '#ffe070' : '#ffffff') : '#ff6a4a', { life: 34 });
    G.hitstop = Math.max(G.hitstop, h.stop || 4);
    FX.kick(h.shake || 1);
    SFX.play(h.fx === 'blunt' ? 'hitBlunt' : heavy ? 'hitHeavy' : 'hit');
    t.onHit(att, h, dir, dmg);
    if (att.onLand) att.onLand(t, h, dmg);
    else if (att.owner && att.owner.onLand) att.owner.onLand(t, h, dmg);
    return 'hit';
  },
  block(att, t, h, dir) {
    const chip = Math.round(h.dmg * (t === G.player ? 0.15 : 0.1));
    t.hp = Math.max(1, t.hp - chip);
    t.vx = dir * (Math.abs(h.kb[0]) * 0.55 + 1);
    t.setAnim('blockhit', true); t.blockT = 14;
    const [wx, wy] = t.anchor('fTip');
    const px = lerp(t.x, wx, 0.5), py = lerp(t.y - 34, wy, 0.5);
    FX.sparks(px, py, dir > 0 ? Math.PI : 0, 9, ['#ffffff', '#fff8d0', '#ffd070']);
    FX.star(px, py, { size: 8, life: 6, cols: ['#ffffff', '#fff0c0', '#ffd070'] });
    G.hitstop = Math.max(G.hitstop, 4); FX.kick(1);
    SFX.play('block');
    if (att.proj) att.remove = true;
    if (t.guardHP !== undefined && t !== G.player) {
      t.guardHP -= h.dmg;
      if (t.guardHP <= 0) { t.guardHP = t.guardMax; t.stagger(55); FX.text(t.x, t.y - t.h - 14, 'BROKEN', '#ffb050'); SFX.play('clang'); }
    }
    return 'block';
  },
  parry(att, t, h, dir) {
    const [wx, wy] = t.anchor('fTip');
    const px = lerp(t.x, wx, 0.6), py = lerp(t.y - 34, wy, 0.6);
    FX.star(px, py, { size: 22, life: 12, cols: ['#ffffff', '#fff6d0', '#ffcc50'] });
    FX.ring(px, py, { r0: 3, r1: 42, c: '#fff4c8', life: 16 });
    FX.sparks(px, py, dir > 0 ? Math.PI : 0, 16, ['#ffffff', '#fff6d0', '#ffcc50', '#e08a20']);
    FX.flash('#fff6e0', 5);
    G.hitstop = Math.max(G.hitstop, 9); G.slow = 30;
    SFX.play('parry');
    t.parryT = 0; t.blockT = 16; t.counter = 50;
    t.setAnim('parry', true);
    if (t.qi !== undefined) t.qi = Math.min(t.qiMax, t.qi + 18);
    G.stats.parries++;
    if (att.proj) {
      if (att.D.reflect === false) { att.remove = true; }
      else { att.vx = -att.vx * 1.25; att.vy *= -0.3; att.team = t.team; att.owner = t; att.facing = -att.facing; att.hitSet.clear(); att.dmg = Math.round(att.dmg * 1.5); att.hitDef.dmg = att.dmg; att.reflected = true; }
    } else if (att.parryable !== false) att.stagger(att.boss ? 50 : 72);
    else if (att.poiseMax) att.poise -= 30;
    return 'parry';
  },
};
