// ---------------------------------------------------------------------------
// Story scripts, written as generators: each yield waits one tick. Helpers
// drive dialogue, actors, the camera and fades.
// ---------------------------------------------------------------------------
const Sc = {
  *wait(n) { for (let i = 0; i < n; i++) yield; },
  *say(who, text) { Dialogue.open(who, text); yield; while (Dialogue.active) yield; },
  actor(cid, x, facing = -1, anim = 'idle') {
    const y = G.map.surfaceBelow(x, G.player ? G.player.y - 20 : 0);
    const a = new Actor(cid, x, y, facing);
    a.setAnim(anim); a.idleAnim = anim;
    G.ents.push(a);
    return a;
  },
  *walk(a, x, sp = 1.2) { a.walkTo = x; a.speed = sp; while (a.walkTo !== null) yield; },
  *pwalk(x) { G.player.autoX = x; while (G.player.autoX !== null) yield; },
  *pan(x, y, n = 60, k = 0.06) { G.cam.focus = { x, y, k }; yield* Sc.wait(n); },
  unpan() { G.cam.focus = null; },
  *fade(out, n = 30) { G.fadeTo = out ? 1 : 0; G.fadeV = 1 / n; yield* Sc.wait(n); },
  face(a, target) { a.facing = target.x > a.x ? 1 : -1; },
  *bossIntro(b, name) {
    G.boss = b; b.active = false;
    Music.play('boss');
    SFX.play('gong');
    Hud.banner(b.D.name + '  |  ' + b.D.title, 120);
    yield* Sc.wait(40);
  },
  lockArena(x0, x1) { G.cam.lock = [x0 * TS, x1 * TS]; G.player.bounds = [x0 * TS, x1 * TS]; },
  unlock() { G.cam.lock = null; G.player.bounds = null; },
};

const STORY = {
  // ===== Chapter I ========================================================
  *ch1_wake() {
    const p = G.player;
    p.setAnim('wake', true); p.control = false;
    yield* Sc.wait(40);
    SFX.play('bell');
    yield* Sc.wait(50);
    yield* Sc.say('lu', '(...A bell. The morning bell of the Crane Sect.)');
    yield* Sc.say('lu', '(No smoke. No screaming. The halls are still standing.)');
    yield* Sc.wait(40);
    yield* Sc.say('lu', '(The sword brought me back. This is the morning of that day. At moonrise, the Crimson Heaven Cult comes for us.)');
    yield* Sc.say('lu', 'Then I have until moonrise.');
    p.control = true; p.setAnim('idle');
    Hud.hint('Move with A / D or the Arrow keys. JUMP with Space, K or Z.');
  },
  *ch1_qin() {
    const p = G.player;
    const q = Sc.actor('qin', p.x + 150, -1, 'idle');
    yield* Sc.walk(q, p.x + 46, 1.4);
    p.facing = 1;
    yield* Sc.say('qin', 'Little brother! Late for morning practice again? The elders will have your hide.');
    yield* Sc.say('lu', '(Senior Sister Qin Shuang. In that life she held the Hall of Nine Winds alone, until the very end.)');
    yield* Sc.say('lu', 'Senior Sister. It is good to see you.');
    yield* Sc.say('qin', 'You look like you have seen a ghost. Prove you are awake. Cut down the practice dummies.');
    Hud.hint('ATTACK with J or X. Keep pressing for the four-strike Swallow Combo. UP + ATTACK launches a foe.', 600);
    q.walkTo = p.x - 20; q.speed = 1.2;
    G.waitDummies = true;
  },
  *ch1_qin2() {
    const p = G.player;
    const q = G.ents.find(e => e.cid === 'qin');
    if (q) { yield* Sc.walk(q, p.x + (q.x > p.x ? 40 : -40), 1.6); Sc.face(q, p); }
    Sc.face(p, q || p);
    yield* Sc.wait(20);
    yield* Sc.say('qin', 'That form... Where did you learn to cut like that? That is not a disciple\'s sword.');
    yield* Sc.say('lu', 'Senior Sister, if the Crimson Heaven Cult came to the mountain tonight, what would you do?');
    yield* Sc.say('qin', 'The cult? No one has seen a Crimson Heaven mask in forty years. Did you have a nightmare?');
    yield* Sc.say('lu', 'Something like one.');
    yield* Sc.say('qin', 'Then take some advice from your elder. A blade you cannot turn aside will kill you. Hold your guard, and tap it the instant a blow lands. Turn their strength back on them.');
    Hud.hint('GUARD with U or C. Tap GUARD as a blade flashes to PARRY and stagger the attacker.', 520);
    yield* Sc.say('qin', 'Master is in closed-door meditation until moonrise. Go on. I will report to the elders.');
    q.speed = 1.6; q.walkTo = p.x + 260;
    yield* Sc.wait(30);
  },
  *ch1_scouts() {
    const p = G.player;
    p.facing = 1;
    const a = Sc.actor('cultist', 96 * TS, -1), b = Sc.actor('cultist', 100 * TS, -1);
    yield* Sc.pan(98 * TS, p.y, 50);
    yield* Sc.say('cult', 'A disciple! He has seen the masks!');
    yield* Sc.say('cult', 'Then his throat is the first we cut. Quietly.');
    Sc.unpan();
    yield* Sc.say('lu', '(Crimson Heaven masks, already inside the walls this morning. So this is how the gate fell.)');
    a.remove = b.remove = true;
    const e1 = spawnEnemy('cultist', a.x, a.y, { aggro: true }), e2 = spawnEnemy('cultist', b.x, b.y, { aggro: true });
    const A = G.level.arenas[0];
    startArena({ ...A, waves: A.waves.slice(1) }, [e1, e2]);
  },
  *ch1_boss() {
    const p = G.player;
    Sc.lockArena(178, 212);
    const b = new Boss('moying', 200 * TS, 16 * TS);
    G.ents.push(b);
    if (G.seen.has('ch1_boss')) { yield* Sc.bossIntro(b); b.active = true; return; }
    p.autoX = 184 * TS;
    yield* Sc.pan(196 * TS, p.y, 70);
    yield* Sc.say('moying', 'Hm. A child of the Crane Sect wanders where he should not.');
    yield* Sc.say('lu', 'Mo Ying. The Faceless Blade.');
    yield* Sc.say('moying', '...You know my name. Few who know it are still breathing.');
    yield* Sc.say('lu', 'In another life you opened this gate at moonrise. I watched my Master die in the smoke that came through it.');
    yield* Sc.say('moying', 'Another life? The boy is mad. No matter. The dead keep secrets best.');
    Sc.unpan();
    G.seen.add('ch1_boss');
    yield* Sc.bossIntro(b);
    b.active = true;
  },
  *ch1_end(b) {
    const p = G.player;
    yield* Sc.wait(70);
    b.setAnim('hurt', true); b.at = 8;
    yield* Sc.say('moying', 'Heh... heh. Too late, Crane child.');
    yield* Sc.say('moying', 'The Crimson Heaven Demon marches from Black Tide Ford. By moonrise your mountain burns, with or without me.');
    FX.ink(b.x, b.y - 20, 30); SFX.play('vanish');
    b.remove = true;
    G.ents.push(new Pickup('ginseng', b.x, b.y - 10));
    yield* Sc.wait(40);
    yield* Sc.say('lu', '(He dropped a letter. Sealed in black wax... with the crane of the Second Elder.)');
    yield* Sc.say('lu', 'Elder Gu Wen. You sold us.');
    const q = Sc.actor('qin', p.x - 150, 1, 'run');
    yield* Sc.walk(q, p.x - 40, 2.4);
    p.facing = -1;
    yield* Sc.say('qin', 'Lu Yan! I heard steel from the gate. What happened here?');
    yield* Sc.say('lu', 'A cult assassin, and proof of a traitor. Take this letter to Master. Break his meditation if you must, and trust no one from the east hall.');
    yield* Sc.say('qin', 'And you?');
    yield* Sc.say('lu', 'Black Tide Ford. If the Demon never reaches the mountain, the mountain never burns.');
    yield* Sc.say('qin', '...Then take the old bamboo road. It is faster than the river. And come back, little brother. That is an order.');
    yield* Sc.fade(true, 50);
    G.nextChapter();
  },

  // ===== Chapter II =======================================================
  *ch2_start() {
    yield* Sc.wait(30);
    yield* Sc.say('lu', '(The Sea of Whispering Bamboo. The cult will have eyes on this road.)');
    yield* Sc.say('bandit', 'Oi! Pretty sword, pretty boy. Leave both and walk away.');
    yield* Sc.say('lu', 'Black Wind bandits. The cult pays well for watchers.');
  },
  *ch2_boss() {
    const p = G.player;
    Sc.lockArena(174, 236);
    const b = new Boss('liu', 214 * TS, 14 * TS);
    G.ents.push(b);
    b.vy = 1;
    if (G.seen.has('ch2_boss')) { yield* Sc.bossIntro(b); b.active = true; return; }
    p.autoX = 186 * TS;
    yield* Sc.pan(204 * TS, p.y, 60);
    yield* Sc.say('liu', 'So you are the little crane who cut down the Faceless Blade. You do not look like much.');
    yield* Sc.say('lu', 'Silver Needle Liu. You hunt for the cult now?');
    yield* Sc.say('liu', 'I hunt for whoever pays in gold. Your head is worth a great deal of gold tonight.');
    yield* Sc.say('lu', 'Then you will have to earn it.');
    yield* Sc.say('liu', 'Such manners. I shall sew them shut.');
    Sc.unpan();
    G.seen.add('ch2_boss');
    yield* Sc.bossIntro(b);
    b.active = true;
  },
  *ch2_end(b) {
    yield* Sc.wait(70);
    b.setAnim('hurt', true); b.at = 8;
    yield* Sc.say('liu', 'Where... did a crane learn to fly like that?');
    yield* Sc.say('lu', 'Where does the Demon cross the river?');
    yield* Sc.say('liu', '...Black Tide Ford, on the night of the Lantern Festival. His vanguard waits at the river temple. The Iron Buddha holds the crossing.');
    yield* Sc.say('liu', 'Go on, then. I am finished working for madmen.');
    b.facing = 1; b.st = 'cut'; b.setAnim('run'); b.vx = 3;
    yield* Sc.wait(50);
    b.remove = true;
    yield* Sc.fade(true, 50);
    G.nextChapter();
  },

  // ===== Chapter III ======================================================
  *ch3_start() {
    const v = Sc.actor('villager', 14 * TS, -1, 'cower');
    yield* Sc.wait(30);
    yield* Sc.say('lu', '(Black Tide Ford, the night of the Lantern Festival. Red lanterns everywhere. Like the fires.)');
    yield* Sc.say('villager', 'Masked men! They are seizing the boats and dragging people from the stalls!');
    yield* Sc.say('lu', 'Get inside and bar the door. They will not be here long.');
    v.idleAnim = 'run'; v.walkTo = -40; v.speed = 2.2;
  },
  *ch3_boss() {
    const p = G.player;
    Sc.lockArena(186, 252);
    const b = new Boss('tiefo', 226 * TS, 19 * TS);
    G.ents.push(b);
    if (G.seen.has('ch3_boss')) { yield* Sc.bossIntro(b); b.active = true; return; }
    b.setAnim('pray');
    p.autoX = 200 * TS;
    yield* Sc.pan(216 * TS, p.y, 60);
    yield* Sc.say('tiefo', 'Amitabha. Turn back, young one. This crossing is closed tonight.');
    yield* Sc.say('lu', 'Tie Fo, the Iron Buddha. Once abbot of the Hanging Bell Monastery. Why guard a demon\'s road?');
    yield* Sc.say('tiefo', 'The Demon promised to return my temple\'s scriptures, stolen forty years ago. Every man has his price.');
    yield* Sc.say('lu', 'Then I will pay you in steel.');
    yield* Sc.say('tiefo', 'Amitabha. May the Buddha forgive my fists.');
    Sc.unpan();
    G.seen.add('ch3_boss');
    yield* Sc.bossIntro(b);
    Hud.hint('When the Iron Buddha turns to gold, strike with your QI WAVE (I or V) to crack the bell.', 400);
    b.active = true;
  },
  *ch3_end(b) {
    yield* Sc.wait(70);
    b.setAnim('pray', true);
    yield* Sc.say('tiefo', '...Your sword carries the weight of a lifetime. Strange, in one so young.');
    yield* Sc.say('tiefo', 'The Demon has already crossed. He waits at the Crimson Moon Altar in the cliffs, for the moon to turn.');
    yield* Sc.say('tiefo', 'Go. I will pray that you are faster than fate.');
    yield* Sc.fade(true, 50);
    G.nextChapter();
  },

  // ===== Chapter IV =======================================================
  *ch4_start() {
    yield* Sc.wait(30);
    yield* Sc.say('lu', '(The cult\'s fortress. The moon is already turning red.)');
    yield* Sc.say('lu', '(Last time, I watched that moon rise from the burning steps of our hall.)');
    yield* Sc.wait(20);
    yield* Sc.say('lu', 'Corpse soldiers. So the Demon makes even the dead fight for him.');
  },
  *ch4_traitor() {
    const p = G.player;
    const d = Sc.actor('demon', 176 * TS, -1, 'idle'), g = Sc.actor('guwen', 170 * TS, 1, 'beg');
    p.autoX = 158 * TS;
    yield* Sc.pan(172 * TS, p.y, 60);
    yield* Sc.say('guwen', 'M-my lord! The boy killed Mo Ying, and he is coming here! The plan...');
    yield* Sc.say('demon', 'The plan is unchanged. You promised me the Crane gate would open at moonrise.');
    yield* Sc.say('guwen', 'It will! I will open it myself, I swear it. Only give me the Blood Heart technique, as you promised...');
    yield* Sc.say('demon', 'A dog that bites its master will bite again.');
    d.setAnim('thrust', true);
    yield* Sc.wait(18);
    FX.slash(d, { a0: 225, a1: 50, r: 30, cy: -32, cols: SLASH_COLS.demon });
    SFX.play('hitHeavy'); FX.blood(g.x, g.y - 26, Math.PI, 14); FX.flash('#8a1010', 6);
    g.setAnim('dead', true);
    yield* Sc.wait(50);
    Sc.unpan();
    yield* Sc.say('lu', 'Elder Gu!');
    d.setAnim('idle');
    yield* Sc.say('demon', 'Ah. The little swallow. You have flown a long way tonight.');
    yield* Sc.say('demon', 'Forty years I waited in the wastes. I will not be kept from my moon by the last disciple of a dying sect.');
    yield* Sc.say('lu', 'You burned my home. You killed everyone I loved. You do not remember it, because it has not happened yet.');
    yield* Sc.say('demon', '...Interesting. Your eyes are older than your face.');
    yield* Sc.say('demon', 'Come to the altar, then. Let the moon judge us.');
    FX.burst(d.x, d.y - 24, 30, { kind: 'px', s0: 0.5, s1: 3, drag: 0.92, cols: ['#ff5a36', '#b8140c', '#3a0404'], l0: 20, l1: 40 });
    SFX.play('vanish');
    d.remove = true;
    yield* Sc.wait(30);
  },
  *ch4_boss() {
    const p = G.player;
    Sc.lockArena(190, 256);
    const b = new Boss('demon', 230 * TS, 19 * TS);
    G.ents.push(b);
    if (G.seen.has('ch4_boss')) { yield* Sc.bossIntro(b); Music.play('final'); b.active = true; return; }
    p.autoX = 204 * TS;
    yield* Sc.pan(222 * TS, p.y, 60);
    yield* Sc.say('demon', 'Show me the Swallow Sword that returns from death.');
    Sc.unpan();
    G.seen.add('ch4_boss');
    yield* Sc.bossIntro(b);
    Music.play('final');
    b.active = true;
  },
  *ch4_phase2(b) {
    b.cancelMove(); b.st = 'cut'; b.setAnim('cast', true);
    G.moonRage = 1;
    yield* Sc.say('demon', 'Enough. Behold the Heavenly Demon Divine Art!');
    b.setCostume('demon2');
    FX.flash('#ff3a1a', 20); FX.kick(6); SFX.play('thunder');
    for (let i = 0; i < 40; i++) FX.part({ kind: 'px', x: b.x + rnd(-30, 30), y: b.y - rnd(0, 60), vx: rnd(-1, 1), vy: -rnd(1, 3), life: rndi(30, 60), cols: ['#ff8a5a', '#d4200f', '#6a0808'], layer: 1 });
    yield* Sc.wait(40);
    b.st = 'free';
  },
  *ch4_end(b) {
    yield* Sc.wait(80);
    b.setAnim('hurt', true); b.at = 8;
    yield* Sc.say('demon', 'Impossible... that sword. It moves as if it has already seen every strike I own.');
    yield* Sc.say('lu', 'It has.');
    yield* Sc.say('demon', 'Ha... So the swallow truly returns...');
    for (let i = 0; i < 60; i++) { if (i % 2 === 0) FX.burst(b.x + rnd(-10, 10), b.y - rnd(0, 44), 3, { kind: 'px', s0: 0.2, s1: 1.2, g: -0.04, drag: 0.95, cols: ['#ff8a5a', '#8a1a0a', '#2a0a06', '#140806'], l0: 30, l1: 60 }); b.alpha = 1 - i / 60; yield; }
    b.remove = true;
    G.moonRage = -1;
    yield* Sc.wait(60);
    yield* Sc.say('lu', '(The moon is turning white again.)');
    yield* Sc.say('lu', '(Master. Senior Sister. I am coming home.)');
    yield* Sc.fade(true, 80);
    Scenes.go(new EndingScene());
  },
};
