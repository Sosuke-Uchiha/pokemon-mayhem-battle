/* Pokémon Mayhem — UI */
(function () {
  "use strict";
  const PM = window.PM, $ = id => document.getElementById(id);
  const { CAP, BUDGET, P, ROLES } = PM;

  let animId = 0;
  function animate(steps){
    const id = ++animId; let i = 0;
    (function next(){
      if (id !== animId || i >= steps.length) return;
      const s = steps[i++]; s.run();
      setTimeout(next, s.delay);
    })();
  }
  function logHTML(html){
    const br = $("bracket");
    const follow = br.scrollHeight - br.scrollTop - br.clientHeight < 40;
    br.insertAdjacentHTML("beforeend", html);
    if (follow) br.scrollTop = br.scrollHeight;
  }
  function addStep(steps, html, delay){
    steps.push({ run: () => logHTML(html), delay });
  }
  function matchRow(a, b, w, r, mine){
    return `<div class="match"><span class="side ${a.me?'me':''}">${a.name}</span>
      <span class="vs">vs</span>
      <span class="side ${b.me?'me':''}" style="text-align:right">${b.name}</span>
      <span class="res ${mine?(w.me?'win':'lose'):''}">${w.name.replace('★ ','')} ${r.score}</span></div>`;
  }
  function updateStage(ev){
    const set = (pfx, mon, hp, max, tag) => {
      const src = PM.spriteOf(mon), pct = Math.max(0, 100*hp/max);
      const col = pct>50 ? "var(--green)" : pct>20 ? "#e8a13c" : "var(--red)";
      const img = $(pfx+"Img");
      if (img.getAttribute("src") !== src){ img.style.visibility=""; img.src = src; }
      $(pfx+"Nm").innerHTML = `${mon.name}${tag?` <span class="tagx">${tag}</span>`:''}<span class="abx">${mon.ability} · ${mon.passive}</span>`;
      const f = $(pfx+"Hp");
      f.style.width = pct+"%"; f.style.background = col;
      $(pfx+"HpTxt").textContent = `${hp} / ${max} HP`;
      img.style.opacity = hp<=0 ? .25 : 1;
    };
    set("fA", ev.aMon, ev.aHp, ev.aMax, ev.aTag); set("fB", ev.bMon, ev.bHp, ev.bMax, ev.bTag);
  }
  function narrateMatch(steps, a, b, r, meName, roundLabel){
    steps.push({ run: () => {
      $("stage").style.display="";
      const cap=(id,t)=>{ const nm=t.name.replace('★ ','');
        $(id).innerHTML = t.me ? nm :
          `<img class="pfp" src="${PM.avatarOf(nm)}" alt="" onerror="this.remove()">${nm}`; };
      cap("fACap", a); cap("fBCap", b);
      $("roundLbl").textContent = roundLabel || "";
    }, delay: 200 });
    addStep(steps, `<div class="logline gm">⚔ ${a.name} vs ${b.name} — full knockout, last squad standing</div>`, 700);
    if (Math.abs(r.edge) >= 0.12)
      addStep(steps, `<div class="logline">🧬 Type matchup favors <b>${(r.edge>0?a:b).name.replace('★ ','')}</b>!</div>`, 750);
    r.events.forEach(ev => {
      let html, delay;
      if (ev.t === "faint") {
        const mine = (ev.side === "A" ? a : b).name === meName;
        html = `<div class="logline ${mine?'lose':'win'}">💥 ${ev.text}</div>`; delay = 850;
      } else if (ev.t === "evolve") {
        html = `<div class="logline evo">${ev.text}</div>`; delay = 1000;
      } else if (ev.t === "ability") {
        html = `<div class="logline abl">${ev.text}</div>`; delay = 800;
      } else if (ev.t === "send") {
        html = `<div class="logline"><b>▶ ${ev.text}</b></div>`; delay = 650;
      } else if (ev.t === "hit") {
        html = `<div class="logline">${ev.text}<span class="dmg">−${ev.dmg}</span></div>`; delay = 520;
      } else {
        html = `<div class="logline">${ev.text}</div>`; delay = 600;
      }
      steps.push({ run: () => { logHTML(html); updateStage(ev); }, delay });
    });
  }

  function showPop(html, gold){
    const p=$("roundPop");
    p.innerHTML=`<div class="rp-card${gold?' gold':''}">${html}</div>`;
    p.style.display="flex";
  }
  function hidePop(){ $("roundPop").style.display="none"; }
  function celebrate(){
    const c=document.createElement("div"); c.className="confetti";
    const colors=["#ffd66b","#3fbf7f","#e15b64","#6ba8ff","#c9a5ff","#fff"];
    for(let i=0;i<150;i++){
      const s=document.createElement("i");
      s.style.left=(Math.random()*100)+"vw";
      s.style.background=colors[Math.floor(Math.random()*colors.length)];
      s.style.animationDuration=(2.2+Math.random()*2)+"s";
      s.style.animationDelay=(Math.random()*0.9)+"s";
      s.style.transform="rotate("+Math.floor(Math.random()*360)+"deg)";
      c.appendChild(s);
    }
    document.body.appendChild(c);
    setTimeout(()=>c.remove(), 5500);
  }

  function runLeague(me, title) {
    const gyms = PM.gymLeaders(6);
    const names = PM.shuffle([...PM.RIVAL_LEADERS]);
    const randoms = [1,1,2,2,2,3,3,3,3].map((s,i)=>PM.aiBudgetTeam(names[i], BUDGET, s/3));
    [...gyms, ...randoms].forEach(r=>{ r.team = cpuOrder(r.team); });
    const early = PM.shuffle(randoms).slice(0,3);
    const late = PM.shuffle([...randoms.filter(r=>!early.includes(r)), ...gyms]);
    let field = [me, ...early, ...late];
    const rounds = ["Qualifier","Quarterfinal","Semifinal","Final"];
    $("bracket").innerHTML = ""; $("stage").style.display="none"; hidePop();
    const v=$("verdict"); v.className=""; v.textContent="";
    $("resultTitle").textContent = title;
    $("overlay").style.display="flex";
    const steps=[]; let alive=true, exit="";
    for (let rd=0; rd<rounds.length && field.length>1; rd++) {
      const next=[];
      addStep(steps, `<div class="small muted" style="margin-top:8px">${rounds[rd]}</div>`, 400);
      for (let i=0;i<field.length;i+=2){
        const a=field[i], b=field[i+1], r=PM.battle(a,b), w=r.aWins?a:b;
        const mine=a.me||b.me;
        if (mine) narrateMatch(steps, a, b, r, me.name, rounds[rd]);
        addStep(steps, matchRow(a,b,w,r,mine), mine?600:180);
        if (mine && !w.me && alive){ alive=false; exit=rounds[rd]; }
        if (mine && w.me && rd < rounds.length-1){
          const beaten=(a.me?b:a).name;
          steps.push({ run: () => showPop(
            `🎉 Victory over ${beaten}!<div class="rp-sub">You advance to the ${rounds[rd+1]}!</div>`), delay: 2400 });
          steps.push({ run: hidePop, delay: 300 });
        }
        next.push(w);
      }
      field=next;
    }
    const champ = field[0].name.replace('★ ','');
    steps.push({ run: () => {
      if (alive){
        v.className="verdict w"; v.textContent="🏆 Pokémon League Champions!";
        celebrate();
        showPop(`🏆 POKÉMON LEAGUE CHAMPION!<div class="rp-sub">Your squad conquered all 4 rounds!</div>`, true);
        setTimeout(hidePop, 4000);
      }
      else if (exit==="Final"){ v.className="verdict l"; v.textContent=`🥈 Runner-up! An incredible run — you were one win away from the trophy. ${champ} took the title.`; }
      else if (exit==="Semifinal"){ v.className="verdict l"; v.textContent=`🥉 Semifinalist — a deep run! One tweak could take you all the way. ${champ} won the tournament.`; }
      else { v.className="verdict l"; v.textContent=`Knocked out in the ${exit}. ${champ} won the tournament. Adjust your squad and retry.`; }
    }, delay: 0 });
    animate(steps);
  }

  function cardHTML(m, removable, showCost, orderable){
    return `<div class="card">${removable?`<span class="rm" data-rm="${m.name}">✕ remove</span>`:''}
      ${orderable?`<span class="up" data-up="${m.name}" title="move up in battle order">▲ up</span>`:''}
      <img src="${PM.spriteOf(m)}" alt="" onerror="this.style.visibility='hidden'">
      <div><div class="nm">${m.name}</div>
        <div class="sub"><span class="role">${m.role}</span> ${m.types.map(t=>`<span class="type">${t}</span>`).join("")}</div>
        <div class="sub muted">${PM.movesOf(m).join(" · ")}</div>
        <div class="sub abline">✦ ${m.ability} · ◈ ${m.passive}</div>
        ${showCost?`<div class="sub">cost ${m.cost}</div>`:''}</div></div>`;
  }
  document.addEventListener("click", e=>{
    const up=e.target.closest("[data-up]"); if(!up) return;
    const name=up.getAttribute("data-up");
    const arr = up.closest("#team") ? team : up.closest("#draftTeamMe") ? dMe : null;
    if(!arr) return;
    const i=arr.findIndex(m=>m.name===name);
    if(i>0){ [arr[i-1],arr[i]]=[arr[i],arr[i-1]]; up.closest("#team")?renderTeam():renderDraft(); }
  });

  /* =================== BUDGET BUILDER =================== */
  const team = [];
  const roles = [...new Set(P.map(m=>m.role))].sort();
  roles.forEach(r=>$("roleFilter").insertAdjacentHTML("beforeend",`<option>${r}</option>`));
  const spent = () => team.reduce((s,m)=>s+m.cost,0);
  const left = () => BUDGET - spent();

  function renderResults(){
    const q=$("search").value.trim().toLowerCase(), role=$("roleFilter").value,
      sort=$("sortBy").value, affOnly=$("affordable").checked;
    let list=P.filter(m=>(!q||m.name.toLowerCase().includes(q))&&(!role||m.role===role)
      &&(!affOnly||m.cost<=left())&&!team.includes(m));
    list.sort((a,b)=> sort==="name"?a.name.localeCompare(b.name):
      sort==="cost-asc"?a.cost-b.cost:b.cost-a.cost);
    $("results").innerHTML = list.slice(0,300).map(m=>{
      const afford = m.cost<=left() && team.length<CAP;
      return `<div class="opt" data-add="${m.name}" style="${afford?'':'opacity:.4'}">
        <img loading="lazy" src="${PM.spriteOf(m)}" alt="" onerror="this.style.visibility='hidden'">
        <div><div class="nm">${m.name}</div>
          <div class="sub"><span class="role">${m.role}</span> ${m.types.join("/")} · <span class="abline">✦ ${m.ability} · ◈ ${m.passive}</span></div></div>
        <div class="cost">${m.cost} pts</div></div>`;
    }).join("") || '<div style="padding:14px" class="muted">No matches.</div>';
  }

  function renderTeam(){
    $("team").innerHTML = team.length ? team.map(m=>cardHTML(m,true,true,team.length>1)).join("")
      : '<div class="empty">Empty. Add Pokémon from the list above.</div>';
    const l=left();
    $("budgetLeft").textContent=l; $("budgetLeft").className="v"+(l<0?" over":"");
    $("sizeLeft").textContent=`${team.length} / ${CAP}`;
    const s=PM.teamScore(team);
    $("brk").innerHTML = s ? `<b>${s.size}/${CAP}</b> Pokémon · <b>${s.roles}</b> role${s.roles>1?"s":""} covered
      — battle order = card order (first card leads, last is your ace). Use ▲ to reorder.`
      : "Add up to 6 Pokémon. A varied roster and a full bench beat one superstar.";
    $("simBtn").disabled = !(team.length>=1 && l>=0);
    renderResults();
  }

  document.addEventListener("click", e=>{
    const add=e.target.closest("[data-add]"), rm=e.target.closest("[data-rm]");
    if (add){ const m=PM.byName[add.getAttribute("data-add")];
      if (m && !team.includes(m) && team.length<CAP && m.cost<=left()){ team.push(m); renderTeam(); } }
    if (rm){ const i=team.findIndex(m=>m.name===rm.getAttribute("data-rm"));
      if (i>=0){ team.splice(i,1); renderTeam(); } }
  });
  ["search","roleFilter","sortBy"].forEach(id=>$(id).addEventListener("input",renderResults));
  $("affordable").addEventListener("change",renderResults);
  $("clearBtn").onclick=()=>{ team.length=0; renderTeam(); $("overlay").style.display="none"; };
  $("autoBtn").onclick=()=>{ team.length=0;
    const t=PM.aiBudgetTeam("me",BUDGET,0.6).team; t.forEach(m=>team.push(m)); renderTeam(); };
  $("simBtn").onclick=()=>runLeague({name:"★ Your Team",team:[...team],score:PM.teamScore(team),me:true},
    "League bracket (16 teams, single elimination)");

  /* =================== DRAFT MODE =================== */
  const FIRST = ["me","cpu","cpu","me","me","cpu"];
  let dMe=[], dAI=[], dRound=0, dOpts=[], dRevealed=false, dNote="";
  function cpuPick(pool){
    const sorted=[...pool].sort((a,b)=>b.rating-a.rating);
    return (Math.random()<0.7||sorted.length<2)?sorted[0]:sorted[1];
  }
  function cpuOrder(t){
    const o=[...t].sort((a,b)=>a.rating-b.rating);
    for(let i=0;i<o.length-2;i++) if(Math.random()<0.3) [o[i],o[i+1]]=[o[i+1],o[i]];
    return o;
  }
  function newOptions(){
    dOpts = PM.shuffle([...P]).slice(0,5);
    if (FIRST[dRound]==="cpu"){
      const c=cpuPick(dOpts); dAI.push(c); dOpts=dOpts.filter(m=>m!==c);
      dNote="🔴 Opponent picked first this round — it already snagged 1 of the 5 (face-down). Choose from the 4 left.";
    } else {
      dNote="🟢 You pick first this round — your opponent grabs one of the 4 you leave behind.";
    }
    renderDraft();
  }
  const faceDown = () => `<div class="card facedown"><div class="qmark">?</div>
    <div><div class="nm">???</div><div class="sub">revealed at battle</div></div></div>`;
  function renderDraft(){
    $("draftRound").textContent=`${Math.min(dRound+1,CAP)} / ${CAP}`;
    $("draftTurn").textContent = dRound>=CAP ? "" : dNote;
    $("draftTeamMe").innerHTML=dMe.length?dMe.map(m=>cardHTML(m,false,false,dMe.length>1)).join(""):'<div class="empty">—</div>';
    $("draftTeamAI").innerHTML=dAI.length?dAI.map(m=>dRevealed?cardHTML(m,false,false):faceDown()).join(""):'<div class="empty">—</div>';
    const done=dRound>=CAP;
    $("draftOptions").innerHTML = done ? '<div class="muted" style="padding:8px">Draft complete — battle below.</div>'
      : dOpts.map(m=>`<div class="draftcard" data-draft="${m.name}">
          <img src="${PM.spriteOf(m)}" alt="" onerror="this.style.visibility='hidden'">
          <div class="nm">${m.name}</div>
          <div class="sub muted">${m.role} · ${m.types.join("/")}</div>
          <div class="sub abline">✦ ${m.ability} · ◈ ${m.passive}</div></div>`).join("");
    $("draftSimBtn").disabled = !done;
  }
  document.addEventListener("click", e=>{
    const d=e.target.closest("[data-draft]"); if(!d) return;
    const pick=PM.byName[d.getAttribute("data-draft")];
    dMe.push(pick);
    if (FIRST[dRound]==="me"){
      const leftovers=dOpts.filter(m=>m!==pick);
      dAI.push(cpuPick(leftovers));
    }
    dRound++;
    if (dRound<CAP) newOptions(); else renderDraft();
  });
  $("draftReset").onclick=()=>{ dMe=[];dAI=[];dRound=0; dRevealed=false; newOptions(); $("overlay").style.display="none"; };
  $("draftSimBtn").onclick=()=>{
    dRevealed=true; renderDraft();
    const A={name:"★ Your squad", team:[...dMe], score:PM.teamScore(dMe), me:true};
    const B={name:"Opponent", team:cpuOrder(dAI), score:PM.teamScore(dAI)};
    const r=PM.battle(A,B);
    $("bracket").innerHTML=""; const v=$("verdict"); v.className=""; v.textContent="";
    $("resultTitle").textContent="Draft battle";
    $("overlay").style.display="flex";
    const steps=[];
    narrateMatch(steps, A, B, r, A.name, "Draft battle");
    addStep(steps, matchRow(A,B,r.aWins?A:B,r,true), 500);
    steps.push({ run: () => {
      if(r.aWins){v.className="verdict w";v.textContent="🏆 You won the draft battle!";}
      else{v.className="verdict l";v.textContent="Defeated — the leftovers favored your opponent.";}
    }, delay: 0 });
    animate(steps);
  };

  /* =================== tabs =================== */
  document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("on"));
    t.classList.add("on");
    const mode=t.getAttribute("data-mode");
    $("budgetMode").style.display = mode==="budget"?"":"none";
    $("draftMode").style.display  = mode==="draft"?"":"none";
    $("overlay").style.display="none";
    if (mode==="draft" && dRound===0 && !dOpts.length) newOptions();
  });
  $("resultClose").onclick=()=>{ $("overlay").style.display="none"; };
  $("overlay").onclick=e=>{ if(e.target===$("overlay")) $("overlay").style.display="none"; };

  renderTeam(); newOptions();
  $("foot").innerHTML = `${P.length} Pokémon are waiting to join your squad — from starters to legendaries. `+
    `A well-rounded crew with a few surprises often goes further than a wall of legends. `+
    `Good luck out there, Trainer! 🏆`;
})();
