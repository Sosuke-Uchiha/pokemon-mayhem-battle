/* Pokémon Mayhem — battle engine */
(function () {
  "use strict";
  const P = window.POKEMON, M = window.POKE_META;
  const ROLES = M.roles, SPRITE = M.spriteBase;

  const CAP = 6;
  const BUDGET = 20;

  const ratings = P.map(m => m.rating);
  const minR = Math.min(...ratings), maxR = Math.max(...ratings);
  function costOf(m) {
    const t = (m.rating - minR) / (maxR - minR);
    return Math.max(1, Math.round(1 + 9 * Math.pow(t, 2.2)));
  }
  P.forEach(m => { m.cost = costOf(m); });

  const hpOf = m => Math.round(70 + 30 * Math.min(1, Math.max(0, (m.s.hp - 30) / 120)));

  const byName = {};
  P.forEach(m => { byName[m.name] = m; });
  const byRole = {}; ROLES.forEach(r => byRole[r] = []);
  P.forEach(m => byRole[m.role].push(m));
  ROLES.forEach(r => byRole[r].sort((a, b) => b.rating - a.rating));

  const ABILITIES = {
    "Levitate":{immune:["Ground"]}, "Flash Fire":{immune:["Fire"]},
    "Water Absorb":{immune:["Water"]}, "Volt Absorb":{immune:["Electric"]}, "Sap Sipper":{immune:["Grass"]},
    "Thick Fat":{resist:{Fire:.5,Ice:.5}}, "Filter":{filter:true}, "Solid Rock":{filter:true},
    "Multiscale":{multiscale:true}, "Sturdy":{sturdy:true},
    "Shell Armor":{noCrit:true}, "Battle Armor":{noCrit:true},
    "Rough Skin":{thorns:6}, "Iron Barbs":{thorns:6}, "Intimidate":{intimidate:true},
    "Blaze":{pinch:"Fire"}, "Torrent":{pinch:"Water"}, "Overgrow":{pinch:"Grass"}, "Swarm":{pinch:"Bug"},
    "Guts":{guts:true}, "Huge Power":{power:1.25}, "Adaptability":{power:1.2}, "Moxie":{moxie:true}
  };
  const SIG = {
    Venusaur:"Overgrow", Meganium:"Overgrow", Sceptile:"Overgrow", Torterra:"Overgrow",
    Serperior:"Overgrow", Chesnaught:"Overgrow", Rillaboom:"Overgrow", Meowscarada:"Overgrow",
    Charizard:"Blaze", Typhlosion:"Blaze", Blaziken:"Blaze", Infernape:"Blaze",
    Emboar:"Blaze", Delphox:"Blaze", Cinderace:"Blaze", Skeledirge:"Blaze",
    Blastoise:"Torrent", Feraligatr:"Torrent", Swampert:"Torrent", Empoleon:"Torrent",
    Samurott:"Torrent", Greninja:"Torrent", Primarina:"Torrent", Inteleon:"Torrent", Quaquaval:"Torrent",
    Beedrill:"Swarm", Scyther:"Swarm", Heracross:"Swarm", Volcarona:"Swarm",
    Gengar:"Levitate", Koffing:"Levitate", Weezing:"Levitate", Flygon:"Levitate", Claydol:"Levitate",
    Bronzong:"Levitate", Mismagius:"Levitate", Rotom:"Levitate", Cresselia:"Levitate",
    Hydreigon:"Levitate", Latias:"Levitate", Latios:"Levitate", Eelektross:"Levitate",
    Ninetales:"Flash Fire", Rapidash:"Flash Fire", Flareon:"Flash Fire", Houndoom:"Flash Fire",
    Heatran:"Flash Fire", Chandelure:"Flash Fire",
    Vaporeon:"Water Absorb", Poliwrath:"Water Absorb", Lapras:"Water Absorb",
    Quagsire:"Water Absorb", Jellicent:"Water Absorb",
    Jolteon:"Volt Absorb", Lanturn:"Volt Absorb", Zeraora:"Volt Absorb", Thundurus:"Volt Absorb",
    Goodra:"Sap Sipper", Bouffalant:"Sap Sipper",
    Azumarill:"Huge Power", Diggersby:"Huge Power",
    Snorlax:"Thick Fat", Dewgong:"Thick Fat", Miltank:"Thick Fat", Walrein:"Thick Fat", Mamoswine:"Thick Fat",
    "Mr Mime":"Filter", Rhyperior:"Solid Rock", Camerupt:"Solid Rock", Carracosta:"Solid Rock",
    Dragonite:"Multiscale", Lugia:"Multiscale",
    Golem:"Sturdy", Onix:"Sturdy", Steelix:"Sturdy", Aggron:"Sturdy", Skarmory:"Sturdy",
    Magnezone:"Sturdy", Sudowoodo:"Sturdy", Donphan:"Sturdy", Forretress:"Sturdy",
    Relicanth:"Sturdy", Bastiodon:"Sturdy", Carbink:"Sturdy", Avalugg:"Sturdy",
    Cloyster:"Shell Armor", Omastar:"Shell Armor", Crustle:"Shell Armor", Escavalier:"Shell Armor",
    Kabutops:"Battle Armor", Armaldo:"Battle Armor", Drapion:"Battle Armor",
    Garchomp:"Rough Skin", Sharpedo:"Rough Skin", Druddigon:"Rough Skin",
    Ferrothorn:"Iron Barbs", Togedemaru:"Iron Barbs",
    Gyarados:"Intimidate", Arcanine:"Intimidate", Luxray:"Intimidate", Krookodile:"Intimidate",
    Incineroar:"Intimidate", Staraptor:"Intimidate", Tauros:"Intimidate", Arbok:"Intimidate",
    Granbull:"Intimidate", Mawile:"Intimidate",
    Machamp:"Guts", Conkeldurr:"Guts", Ursaring:"Guts", Hariyama:"Guts", Obstagoon:"Guts",
    Salamence:"Moxie", Honchkrow:"Moxie", Scrafty:"Moxie", Mightyena:"Moxie", Pinsir:"Moxie",
    "Porygon-Z":"Adaptability", Crawdaunt:"Adaptability", Dragalge:"Adaptability", Basculegion:"Adaptability"
  };
  P.forEach(m => {
    if (SIG[m.name]) { m.ability = SIG[m.name]; return; }
    const off = Math.max(m.s.atk, m.s.spa), bulk = (m.s.def + m.s.spd) / 2;
    const pool = bulk > off + 15 ? ["Sturdy","Thick Fat","Shell Armor","Filter"]
               : off > bulk + 15 ? ["Guts","Moxie","Adaptability","Intimidate"]
               : ["Battle Armor","Guts","Filter","Adaptability"];
    m.ability = pool[m.id % pool.length];
  });
  const AB = m => ABILITIES[m.ability] || {};

  const PASSIVES = {
    "Sniper":{snipe:2.1}, "Super Luck":{luck:true}, "Technician":{tech:1.3},
    "Speed Boost":{extra:.15}, "Pressure":{pressure:.92}, "Regenerator":{regen:12},
    "Ice Body":{heal:2}, "Rain Dish":{heal:2},
    "Static":{status:.2,label:"paralyzed"}, "Flame Body":{status:.2,label:"burned"},
    "Poison Point":{status:.2,label:"poisoned"},
    "Anger Point":{anger:true}, "Justified":{justified:true}
  };
  const SIGP = {
    Pikachu:"Static", Raichu:"Static", Ampharos:"Static", Electivire:"Static",
    Magmortar:"Flame Body", Talonflame:"Flame Body", Volcarona:"Flame Body", Ceruledge:"Flame Body",
    Nidoking:"Poison Point", Nidoqueen:"Poison Point", Roserade:"Poison Point", Seadra:"Poison Point",
    Blastoise:"Rain Dish", Ludicolo:"Rain Dish", Tentacruel:"Rain Dish",
    Glaceon:"Ice Body", Regice:"Ice Body", Walrein:"Ice Body", Aurorus:"Ice Body",
    Slowbro:"Regenerator", Slowking:"Regenerator", "Ho-Oh":"Regenerator", Tornadus:"Regenerator",
    Mienshao:"Regenerator", Amoonguss:"Regenerator", Toxapex:"Regenerator",
    Mewtwo:"Pressure", Articuno:"Pressure", Zapdos:"Pressure", Moltres:"Pressure",
    Raikou:"Pressure", Entei:"Pressure", Suicune:"Pressure", Lugia:"Pressure",
    Dialga:"Pressure", Palkia:"Pressure", Giratina:"Pressure", Kyurem:"Pressure",
    Kingdra:"Sniper", Drapion:"Sniper", Beedrill:"Sniper", Inteleon:"Sniper",
    Absol:"Super Luck", Honchkrow:"Super Luck", Togekiss:"Super Luck", Unfezant:"Super Luck",
    Scizor:"Technician", Breloom:"Technician", Persian:"Technician", Ambipom:"Technician", Cinccino:"Technician",
    Blaziken:"Speed Boost", Sharpedo:"Speed Boost", Yanmega:"Speed Boost", Ninjask:"Speed Boost",
    Primeape:"Anger Point", Tauros:"Anger Point", Krookodile:"Anger Point",
    Lucario:"Justified", Gallade:"Justified", Cobalion:"Justified", Terrakion:"Justified",
    Virizion:"Justified", Keldeo:"Justified", Arcanine:"Justified"
  };
  const TYPE_PASSIVE = { Electric:"Static", Fire:"Flame Body", Poison:"Poison Point",
    Ice:"Ice Body", Water:"Rain Dish" };
  P.forEach(m => {
    if (SIGP[m.name]) { m.passive = SIGP[m.name]; return; }
    const tp = m.types.map(t => TYPE_PASSIVE[t]).find(Boolean);
    if (tp && m.id % 2) { m.passive = tp; return; }
    const off = Math.max(m.s.atk, m.s.spa), bulk = (m.s.def + m.s.spd) / 2;
    const pool = off > bulk + 15 ? ["Sniper","Super Luck","Speed Boost","Anger Point"]
               : bulk > off + 15 ? ["Pressure","Regenerator","Justified"]
               : ["Technician","Pressure","Super Luck","Justified"];
    m.passive = pool[m.id % pool.length];
  });
  const PS = m => PASSIVES[m.passive] || {};

  const spriteOf = m => SPRITE + m.id + ".png";
  const ovrClass = r => r >= 88 ? "el" : r >= 78 ? "gd" : r >= 68 ? "md" : "lo";

  function teamScore(team) {
    if (!team || !team.length) return null;
    const r = team.map(m => m.rating);
    const avg = r.reduce((a, b) => a + b, 0) / r.length;
    const depth = 0.55 + 0.45 * Math.min(1, team.length / CAP);
    const roles = new Set(team.map(m => m.role));
    const diversity = 2.0 * (roles.size - 1) / (ROLES.length - 1);
    const top = Math.max(...r);
    const carry = Math.min(2.0, 0.15 * Math.max(0, top - avg));
    const power = avg * depth + diversity + carry;
    return { avg, depth, diversity, carry, power, size: team.length, roles: roles.size,
      cost: team.reduce((s, m) => s + m.cost, 0) };
  }

  const MOVES = {
    Normal:["Body Slam","Hyper Beam","Double-Edge"], Fire:["Flamethrower","Fire Blast","Flare Blitz"],
    Water:["Hydro Pump","Surf","Aqua Tail"], Electric:["Thunderbolt","Thunder","Volt Tackle"],
    Grass:["Leaf Blade","Solar Beam","Energy Ball"], Ice:["Ice Beam","Blizzard","Icicle Crash"],
    Fighting:["Close Combat","Dynamic Punch","Aura Sphere"], Poison:["Sludge Bomb","Gunk Shot","Cross Poison"],
    Ground:["Earthquake","Earth Power","High Horsepower"], Flying:["Brave Bird","Hurricane","Air Slash"],
    Psychic:["Psychic","Psyshock","Zen Headbutt"], Bug:["Megahorn","Bug Buzz","X-Scissor"],
    Rock:["Stone Edge","Rock Slide","Head Smash"], Ghost:["Shadow Ball","Phantom Force","Shadow Claw"],
    Dragon:["Dragon Claw","Outrage","Draco Meteor"], Dark:["Crunch","Dark Pulse","Foul Play"],
    Steel:["Iron Head","Meteor Mash","Flash Cannon"], Fairy:["Moonblast","Play Rough","Dazzling Gleam"]
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];

  const CHART = {
    Normal:{Rock:.5,Ghost:0,Steel:.5},
    Fire:{Grass:2,Ice:2,Bug:2,Steel:2,Fire:.5,Water:.5,Rock:.5,Dragon:.5},
    Water:{Fire:2,Ground:2,Rock:2,Water:.5,Grass:.5,Dragon:.5},
    Electric:{Water:2,Flying:2,Electric:.5,Grass:.5,Dragon:.5,Ground:0},
    Grass:{Water:2,Ground:2,Rock:2,Fire:.5,Grass:.5,Poison:.5,Flying:.5,Bug:.5,Dragon:.5,Steel:.5},
    Ice:{Grass:2,Ground:2,Flying:2,Dragon:2,Fire:.5,Water:.5,Ice:.5,Steel:.5},
    Fighting:{Normal:2,Ice:2,Rock:2,Dark:2,Steel:2,Poison:.5,Flying:.5,Psychic:.5,Bug:.5,Fairy:.5,Ghost:0},
    Poison:{Grass:2,Fairy:2,Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0},
    Ground:{Fire:2,Electric:2,Poison:2,Rock:2,Steel:2,Grass:.5,Bug:.5,Flying:0},
    Flying:{Grass:2,Fighting:2,Bug:2,Electric:.5,Rock:.5,Steel:.5},
    Psychic:{Fighting:2,Poison:2,Psychic:.5,Steel:.5,Dark:0},
    Bug:{Grass:2,Psychic:2,Dark:2,Fire:.5,Fighting:.5,Poison:.5,Flying:.5,Ghost:.5,Steel:.5,Fairy:.5},
    Rock:{Fire:2,Ice:2,Flying:2,Bug:2,Fighting:.5,Ground:.5,Steel:.5},
    Ghost:{Psychic:2,Ghost:2,Dark:.5,Normal:0},
    Dragon:{Dragon:2,Steel:.5,Fairy:0},
    Dark:{Psychic:2,Ghost:2,Fighting:.5,Dark:.5,Fairy:.5},
    Steel:{Ice:2,Rock:2,Fairy:2,Fire:.5,Water:.5,Electric:.5,Steel:.5},
    Fairy:{Fighting:2,Dragon:2,Dark:2,Fire:.5,Poison:.5,Steel:.5}
  };
  const eff = (att, defTypes) => defTypes.reduce((x, t) => x * ((CHART[att] || {})[t] ?? 1), 1);
  function bestVs(a, d) {
    let type = a.types[0], mult = eff(type, d.types);
    for (const t of a.types) { const e = eff(t, d.types); if (e > mult) { mult = e; type = t; } }
    return { mult, move: pick(MOVES[type] || MOVES.Normal) };
  }
  function typeEdge(ta, tb) {
    let s = 0, n = 0;
    for (const a of ta) for (const b of tb) { s += bestVs(a, b).mult - bestVs(b, a).mult; n++; }
    return n ? s / n : 0;
  }
  const movesOf = m => m.types.map((t, i) => (MOVES[t] || MOVES.Normal)[(m.id + i) % 3]);
  function attack(m, d) {
    const ab = AB(d);
    const mults = m.types.map(t => {
      let e = eff(t, d.types);
      if (ab.immune && ab.immune.includes(t)) e = 0;
      if (ab.resist && ab.resist[t]) e *= ab.resist[t];
      return e;
    });
    let bi = 0;
    mults.forEach((e, i) => { if (e > mults[bi]) bi = i; });
    if (Math.random() < 0.3) {
      const alts = mults.map((e, i) => i).filter(i => mults[i] > 0);
      if (alts.length) bi = alts[Math.floor(Math.random() * alts.length)];
    }
    return { move: movesOf(m)[bi], mult: mults[bi], type: m.types[bi],
      blocked: !!(ab.immune && ab.immune.includes(m.types[bi])) };
  }

  const EVO = window.POKE_EVO || {};
  const byId = {}; P.forEach(m => { byId[m.id] = m; });
  const MEGA = new Set([3,6,9,15,18,65,80,94,115,127,130,142,150,181,208,212,214,229,248,254,257,
    260,282,302,303,306,308,310,319,323,334,354,359,362,373,376,380,381,384,428,445,448,460,475,531,719]);
  const GMAX = new Set([3,6,9,12,25,52,68,94,99,131,133,143,569,809,812,815,818,823,826,834,839,
    841,842,844,849,851,858,861,869,879,884,892]);
  const MEGA_CHANCE = 0.35, EVO_CHANCE = 0.30, BOOST = 8, SURGE = 40;

  const effStr = f => (f.mon.rating + f.boost + (f.mox || 0)) * (0.35 + 0.65 * f.hp / f.max);
  function statRatio(a, d) {
    const phys = a.s.atk >= a.s.spa;
    const off = phys ? a.s.atk : a.s.spa, def = phys ? d.s.def : d.s.spd;
    return Math.min(1.35, Math.max(0.85, Math.pow(off / Math.max(1, def), 0.4)));
  }

  function battle(A, B) {
    const edge = typeEdge(A.team, B.team);
    const mkQ = T => T.team.map(m => ({ mon: m, hp: hpOf(m), max: hpOf(m), boost: 0, mox: 0, tag: "" }));
    const qa = mkQ(A), qb = mkQ(B);
    let ia = 0, ib = 0, megaA = false, megaB = false;
    let fa = qa[0], fb = qb[0];
    const events = [];
    const push = (t, extra, text) => events.push(Object.assign({ t, text,
      aMon: fa.mon, aHp: Math.round(fa.hp), aMax: fa.max, aTag: fa.tag,
      bMon: fb.mon, bHp: Math.round(fb.hp), bMax: fb.max, bTag: fb.tag }, extra));
    const send = (T, f, first) => push("send", {},
      `${T.name.replace('★ ','')} ${first ? "leads with" : "sends out"} ${f.mon.name}!`);
    function maybeMega(f, foe, isA) {
      if ((isA ? megaA : megaB) || f.boost) return;
      const canM = MEGA.has(f.mon.id), canG = GMAX.has(f.mon.id);
      if (!canM && !canG) return;
      if (effStr(foe) <= effStr(f) && f.hp > 0.55 * f.max) return;
      if (Math.random() >= MEGA_CHANCE) return;
      if (isA) megaA = true; else megaB = true;
      f.boost = BOOST; f.hp = Math.min(f.max, f.hp + SURGE);
      const g = canG && (!canM || Math.random() < 0.5);
      f.tag = g ? "GMAX" : "MEGA";
      push("evolve", { side: isA ? "A" : "B" }, g
        ? `🌋 ${f.mon.name} GIGANTAMAXES — it towers over the field!`
        : `💠 ${f.mon.name} MEGA EVOLVES into Mega ${f.mon.name}!`);
    }
    function maybeEvolve(f) {
      if (f.boost || Math.random() >= EVO_CHANCE) return;
      const opts = (EVO[f.mon.id] || []).map(id => byId[id]).filter(m => m && m.rating > f.mon.rating);
      if (!opts.length) return;
      const old = f.mon.name;
      f.mon = pick(opts);
      if (f === fa) A.team[ia] = f.mon; else B.team[ib] = f.mon;
      f.max = hpOf(f.mon); f.hp = Math.min(f.max, f.hp + SURGE);
      push("evolve", { side: f === fa ? "A" : "B" },
        `✨ What's this? ${old} is evolving… it evolved into ${f.mon.name}!`);
    }
    function entry(f, foe, late) {
      if (AB(f.mon).intimidate && !foe.intim) { foe.intim = true;
        push("ability", {}, `😾 ${f.mon.name}'s Intimidate cuts ${foe.mon.name}'s attack!`); }
      if (late && AB(foe.mon).intimidate && !f.intim) { f.intim = true;
        push("ability", {}, `😾 ${foe.mon.name}'s Intimidate rattles ${f.mon.name}!`); }
    }
    send(A, fa, true); send(B, fb, true);
    entry(fa, fb); entry(fb, fa);
    while (true) {
      maybeMega(fa, fb, true); maybeMega(fb, fa, false);
      let turn = fa.mon.s.spe === fb.mon.s.spe ? (Math.random() < .5 ? 0 : 1)
               : (fa.mon.s.spe > fb.mon.s.spe ? 0 : 1);
      while (fa.hp > 0 && fb.hp > 0) {
        const att = turn === 0 ? fa : fb, def = turn === 0 ? fb : fa;
        const mv = attack(att.mon, def.mon);
        const aAb = AB(att.mon), dAb = AB(def.mon);
        const aPs = PS(att.mon), dPs = PS(def.mon);
        const crit = !dAb.noCrit && Math.random() < (aPs.luck ? 0.16 : 0.08);
        let dmg = 24 * Math.pow(effStr(att) / effStr(def), 0.6) * statRatio(att.mon, def.mon)
          * Math.pow(mv.mult || 0.25, 0.8) * (0.85 + Math.random() * 0.3)
          * (crit ? (aPs.snipe || 1.6) : 1);
        if (aAb.power) dmg *= aAb.power;
        const pinch = aAb.pinch === mv.type && att.hp < att.max / 3;
        if (pinch) dmg *= 1.5;
        const guts = aAb.guts && att.hp < att.max / 2;
        if (guts) dmg *= 1.3;
        if (att.intim) dmg *= 0.85;
        if (att.cond) dmg *= 0.85;
        if (att.angry) dmg *= 1.5;
        if (aPs.tech && mv.mult > 0 && mv.mult < 1) dmg *= aPs.tech;
        if (dPs.pressure) dmg *= dPs.pressure;
        if (dAb.filter && mv.mult >= 2) dmg *= 0.75;
        if (dAb.multiscale && def.hp === def.max) dmg *= 0.5;
        dmg = Math.max(5, Math.min(mv.mult >= 2 ? 110 : 65, Math.round(dmg)));
        if (mv.blocked) dmg = Math.min(dmg, 4);
        let sturdyNow = false;
        if (dAb.sturdy && !def.sturdyUsed && dmg >= def.hp && def.hp > 1) {
          def.sturdyUsed = true; sturdyNow = true; dmg = def.hp - 1;
        }
        def.hp = Math.max(0, def.hp - dmg);
        push("hit", { side: turn === 0 ? "A" : "B", dmg }, `${att.mon.name} uses ${mv.move}` +
          (mv.blocked ? ` — ${def.mon.name}'s ${def.mon.ability} nullifies it!`
            : mv.mult >= 2 ? " — it's super effective!" : mv.mult === 0 ? " — it barely lands…"
            : mv.mult < 1 ? " — not very effective…" : "!") + (crit ? " Critical hit!" : ""));
        if (pinch && !att.pinched) { att.pinched = true;
          push("ability", {}, `🔥 ${att.mon.name}'s ${att.mon.ability} kicks in — its attacks intensify!`); }
        if (guts && !att.gutsy) { att.gutsy = true;
          push("ability", {}, `💪 ${att.mon.name}'s Guts flares — pain only makes it stronger!`); }
        if (sturdyNow) push("ability", {}, `🪨 ${def.mon.name} endures the blow with Sturdy!`);
        if (crit && dPs.anger && !def.angry && def.hp > 0) { def.angry = true;
          push("ability", {}, `💢 ${def.mon.name}'s Anger Point maxes out its attack!`); }
        if (mv.mult >= 2 && dPs.justified && !def.just && def.hp > 0) { def.just = true; def.mox += 6;
          push("ability", {}, `⚔ ${def.mon.name}'s Justified sharpens its resolve!`); }
        if (dPs.status && def.hp > 0 && !att.cond && Math.random() < dPs.status) { att.cond = true;
          push("ability", {}, `☣ ${att.mon.name} is ${dPs.label} by ${def.mon.name}'s ${def.mon.passive}!`); }
        if (dAb.thorns && !mv.blocked && def.hp > 0) {
          att.hp = Math.max(1, att.hp - dAb.thorns);
          if (!def.thorned) { def.thorned = true;
            push("ability", {}, `🌵 ${def.mon.name}'s ${def.mon.ability} scrapes ${att.mon.name} on contact!`); }
        }
        if (aPs.extra && def.hp > 0 && Math.random() < aPs.extra) {
          let d2 = Math.max(2, Math.round(dmg / 2));
          if (dAb.sturdy && !def.sturdyUsed && d2 >= def.hp && def.hp > 1) {
            def.sturdyUsed = true; d2 = def.hp - 1;
            def.hp = Math.max(0, def.hp - d2);
            push("hit", { side: turn === 0 ? "A" : "B", dmg: d2 },
              `⚡ ${att.mon.name}'s Speed Boost — it strikes again!`);
            push("ability", {}, `🪨 ${def.mon.name} endures the blow with Sturdy!`);
          } else {
            def.hp = Math.max(0, def.hp - d2);
            push("hit", { side: turn === 0 ? "A" : "B", dmg: d2 },
              `⚡ ${att.mon.name}'s Speed Boost — it strikes again!`);
          }
        }
        if (aPs.heal && att.hp > 0 && att.hp < att.max) att.hp = Math.min(att.max, att.hp + aPs.heal);
        turn ^= 1;
      }
      const aFainted = fa.hp <= 0;
      const lf = aFainted ? fa : fb, wf = aFainted ? fb : fa;
      push("faint", { side: aFainted ? "A" : "B" }, `${lf.mon.name} faints!`);
      if (AB(wf.mon).moxie && wf.hp > 0) { wf.mox += 6;
        push("ability", {}, `😤 ${wf.mon.name}'s Moxie surges — its attack keeps rising!`); }
      if (PS(wf.mon).regen && wf.hp > 0 && wf.hp < wf.max) {
        wf.hp = Math.min(wf.max, wf.hp + PS(wf.mon).regen);
        push("ability", {}, `💚 ${wf.mon.name} recovers with Regenerator!`); }
      if (aFainted) ia++; else ib++;
      if (aFainted ? ia >= qa.length : ib >= qb.length) break;
      if (wf.hp < 0.5 * wf.max) push("info", {}, `${wf.mon.name} is worn down but stays in!`);
      maybeEvolve(wf);
      if (aFainted) { fa = qa[ia]; send(A, fa); entry(fa, fb, true); }
      else { fb = qb[ib]; send(B, fb); entry(fb, fa, true); }
    }
    const aWins = ib >= qb.length;
    return { aWins, score: `${qa.length - ia}-${qb.length - ib}`, edge, events };
  }

  function shuffle(a) { for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];} return a; }

  function aiBudgetTeam(name, budget, strength) {
    const pool = shuffle([...P]);
    const team = []; let left = Math.round(budget * (0.78 + 0.22 * strength));
    for (let slot = CAP; slot >= 1; slot--) {
      const want = (left / slot) * (0.8 + 0.4 * Math.random());
      let best = null, bd = Infinity;
      for (const m of pool) {
        if (team.includes(m) || m.cost > left - (slot - 1)) continue;
        const d = Math.abs(m.cost - want) + Math.random() * 0.5;
        if (d < bd) { bd = d; best = m; }
      }
      if (!best) best = pool.find(m => !team.includes(m));
      team.push(best); left -= best.cost;
    }
    return { name, team, score: teamScore(team) };
  }

  function aiDraftTeam(name, mons) { return { name, team: mons, score: teamScore(mons) }; }

  const GYM_TEAMS = {
    "Brock":     ["Golem","Steelix","Omastar","Kabutops"],
    "Misty":     ["Starmie","Golduck","Lapras","Quagsire"],
    "Lt. Surge": ["Raichu","Electrode","Magneton","Jolteon"],
    "Erika":     ["Vileplume","Victreebel","Tangela","Jumpluff"],
    "Koga":      ["Weezing","Muk","Venomoth","Crobat"],
    "Sabrina":   ["Alakazam","Mr Mime","Espeon","Wobbuffet"],
    "Blaine":    ["Arcanine","Rapidash","Magmar","Ninetales"],
    "Giovanni":  ["Rhydon","Nidoking","Nidoqueen","Dugtrio"],
    "Blue":      ["Pidgeot","Alakazam","Rhydon","Exeggutor","Arcanine","Blastoise"],
    "Lance":     ["Dragonite","Gyarados","Aerodactyl","Charizard"],
    "Steven":    ["Metagross","Aggron","Skarmory","Claydol","Cradily","Armaldo"],
    "Cynthia":   ["Garchomp","Spiritomb","Milotic","Lucario","Roserade","Togekiss"]
  };
  const RIVAL_LEADERS = ["Falkner","Bugsy","Whitney","Morty","Chuck","Jasmine","Clair","Pryce","Janine"];
  const gymLeaders = (n = 6) => shuffle(Object.entries(GYM_TEAMS)).slice(0, n).map(([name, ns]) => {
    const team = ns.map(n2 => byName[n2]).filter(Boolean);
    return { name, team, score: teamScore(team) };
  });
  const avatarOf = name => "https://play.pokemonshowdown.com/sprites/trainers/" +
    name.toLowerCase().replace(/[^a-z]/g, "") + ".png";

  window.PM = { P, M, ROLES, CAP, BUDGET, byName, byRole, costOf,
    spriteOf, ovrClass, teamScore, battle, movesOf, aiBudgetTeam, aiDraftTeam, shuffle,
    gymLeaders, RIVAL_LEADERS, avatarOf };
})();
