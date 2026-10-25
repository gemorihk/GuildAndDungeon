let gameState = {
    gold: 500,
    gems: 20,
    guildLv: 1,
    maxTierUnlocked: 1,
    heroes: [],
    inventory: [
        { id: "pot_small", name: "初級回復藥水", type: "potion", category: "potion", heal: 80, cost: 30, sell: 10, count: 10, desc: "恢復 80 點生命值" },
        { id: "iron_sword", name: "鐵劍", type: "equipment", slot: "weapon", category: "equipment", equipType: "sword", atk: 15, cost: 120, sell: 40, count: 1, desc: "基礎戰士長劍" }
    ],
    bestiary: {},
    activeDungeonId: "goblin_cave",
    waveCount: 0,
    isExploring: false,
    isPaused: false,
    bossAvailable: false,
    inBossFight: false,
    currentEnemies: { front: [], back: [] },
    tempSpoils: { gold: 0, items: [], exp: 0 },
    activeQuests: []
};

let currentModalHeroId = null;
let currentJobModalHeroId = null;
let selectedJobIdForView = null;
let currentModalTab = 'stats';
let currentInvFilter = 'all';
let currentShopFilter = 'all';

window.onload = function() {
    loadGame();
    if (!gameState.heroes || !Array.isArray(gameState.heroes) || gameState.heroes.length === 0) {
        initDefaultHeroes();
        saveGame();
    }
    renderAll();
    startBattleLoop();
};

function getRandomGrade() {
    let rand = Math.random();
    if (rand < 0.05) return "SSS";
    if (rand < 0.12) return "SS";
    if (rand < 0.25) return "S";
    if (rand < 0.45) return "A";
    if (rand < 0.70) return "B";
    if (rand < 0.90) return "C";
    return "D";
}

function createHero(name, gender, row = 'front', gen = 1) {
    let raceKeys = Object.keys(RACES);
    let randomRaceKey = raceKeys[Math.floor(Math.random() * raceKeys.length)];

    let traitsPool = (typeof TRAITS !== 'undefined') ? [...TRAITS] : [];
    let heroTraits = [];
    if (traitsPool.length > 0) {
        let traitCount = 1 + Math.floor(Math.random() * 2);
        for(let i=0; i<traitCount; i++) {
            if(traitsPool.length > 0) {
                let idx = Math.floor(Math.random() * traitsPool.length);
                heroTraits.push(traitsPool.splice(idx, 1)[0]);
            }
        }
    }

    let hero = {
        id: "hero_" + Date.now() + "_" + Math.floor(Math.random()*100000),
        name: name,
        gender: gender,
        race: randomRaceKey,
        row: row,
        generation: gen,
        level: 1, exp: 0, maxExp: 100,
        job: "novice",
        unlockedJobs: ["novice"], // 預設解鎖無業遊民
        jobLevels: { novice: 1 },
        jobExps: { novice: 0 },
        jobMaxExps: { novice: 50 },
        isDead: false,
        traits: heroTraits,
        growthGrades: {
            str: getRandomGrade(), con: getRandomGrade(), mnd: getRandomGrade(),
            dex: getRandomGrade(), agi: getRandomGrade(), luk: getRandomGrade()
        },
        baseStats: {
            str: 10 + Math.floor(Math.random()*6), con: 10 + Math.floor(Math.random()*6),
            mnd: 10 + Math.floor(Math.random()*6), dex: 10 + Math.floor(Math.random()*6),
            agi: 10 + Math.floor(Math.random()*6), luk: 10 + Math.floor(Math.random()*6)
        },
        jobModifiers: { str: 0, con: 0, mnd: 0, dex: 0, agi: 0, luk: 0, atk: 0, matk: 0, def: 0 },
        learnedSkills: ["tackle"],
        skillProficiency: { tackle: 0 },
        equippedSkills: ["tackle"],
        skillCooldowns: {},
        equippedItems: { weapon: null, armor: null, accessory: null },
        hp: 120, mp: 40,
        ct: 0
    };
    let st = getHeroStats(hero);
    hero.hp = st.maxHp;
    hero.mp = st.maxMp;
    checkSkillUnlocks(hero);
    return hero;
}

function initDefaultHeroes() {
    gameState.heroes = [
        createHero("亞瑟 (主人公)", "male", 'front'),
        createHero("莉莉絲", "female", 'back')
    ];
}

function getHeroStats(hero) {
    let s = { ...hero.baseStats };
    let m = hero.jobModifiers || {};
    let lv = hero.level || 1;
    let raceData = RACES[hero.race] || { mod: { str: 1, con: 1, mnd: 1, dex: 1, agi: 1, luk: 1 } };

    if (hero.growthGrades && typeof GRADE_VALUES !== 'undefined') {
        Object.keys(hero.growthGrades).forEach(k => {
            let gradeVal = GRADE_VALUES[hero.growthGrades[k]] || 1.0;
            s[k] += Math.floor((lv - 1) * gradeVal * 1.5);
        });
    }

    Object.keys(s).forEach(k => {
        if (raceData.mod[k]) {
            s[k] = Math.floor(s[k] * raceData.mod[k]);
        }
    });

    Object.keys(m).forEach(k => {
        if(s[k] !== undefined) s[k] += m[k];
    });

    if (hero.equippedItems) {
        Object.keys(hero.equippedItems).forEach(slot => {
            let item = hero.equippedItems[slot];
            if (item) {
                if (item.atk) s.str += Math.floor(item.atk / 2);
                if (item.def) s.con += Math.floor(item.def / 2);
                if (item.mnd) s.mnd += item.mnd;
            }
        });
    }

    let maxHp = Math.floor(s.con * 14 + s.str * 4 + lv * 15);
    let maxMp = Math.floor(s.mnd * 8 + lv * 5);
    let hpRegen = parseFloat((s.con * 0.5).toFixed(1)); 
    let atk = Math.floor(s.str * 2.2 + s.dex * 0.6 + (m.atk || 0));
    let matk = Math.floor(s.mnd * 2.5 + (m.matk || 0));
    let def = Math.floor(s.con * 1.8 + (m.def || 0));
    let spd = Math.floor(s.agi * 1.2);

    return { maxHp, maxMp, hpRegen, atk, matk, def, spd, ...s };
}

function checkSkillUnlocks(hero) {
    let jobData = JOBS[hero.job];
    if (!jobData || !jobData.unlockSkills) return;
    let curJobLv = (hero.jobLevels && hero.jobLevels[hero.job]) ? hero.jobLevels[hero.job] : 1;

    Object.keys(jobData.unlockSkills).forEach(reqLv => {
        if (curJobLv >= parseInt(reqLv)) {
            let skId = jobData.unlockSkills[reqLv];
            if (!hero.learnedSkills.includes(skId)) {
                hero.learnedSkills.push(skId);
                hero.skillProficiency[skId] = 0;

                if (!hero.equippedSkills) hero.equippedSkills = [];
                if (hero.equippedSkills.length < 3 && !hero.equippedSkills.includes(skId)) {
                    hero.equippedSkills.push(skId);
                    log(`✨ [${hero.name}] 學會【${SKILLS[skId].name}】並已自動裝備！`);
                } else {
                    log(`✨ [${hero.name}] 學會新技能【${SKILLS[skId].name}】！`);
                }
            }
        }
    });
}

function saveGame() {
    try {
        localStorage.setItem('guild_and_dungeon_save', JSON.stringify(gameState));
        return true;
    } catch (e) {
        console.error("存檔失敗", e);
        return false;
    }
}

function manualSaveGame() {
    if (saveGame()) alert("遊戲進度已手動儲存！");
}

function resetSaveData() {
    if (confirm("確定要重置所有資料並重新開始嗎？")) {
        localStorage.removeItem('guild_and_dungeon_save');
        gameState = {
            gold: 500, gems: 20, guildLv: 1, maxTierUnlocked: 1,
            heroes: [],
            inventory: [
                { id: "pot_small", name: "初級回復藥水", type: "potion", category: "potion", heal: 80, cost: 30, sell: 10, count: 10, desc: "恢復 80 點生命值" },
                { id: "iron_sword", name: "鐵劍", type: "equipment", slot: "weapon", category: "equipment", equipType: "sword", atk: 15, cost: 120, sell: 40, count: 1, desc: "基礎戰士長劍" }
            ],
            bestiary: {}, activeDungeonId: "goblin_cave", waveCount: 0,
            isExploring: false, isPaused: false, bossAvailable: false, inBossFight: false,
            currentEnemies: { front: [], back: [] }, tempSpoils: { gold: 0, items: [], exp: 0 }, activeQuests: []
        };
        initDefaultHeroes();
        saveGame();
        renderAll();
        alert("存檔與背包已成功完全重置！");
    }
}

function loadGame() {
    try {
        let savedData = localStorage.getItem('guild_and_dungeon_save');
        if (savedData) {
            let parsed = JSON.parse(savedData);
            if (parsed && typeof parsed === 'object') {
                gameState = { ...gameState, ...parsed };
            }
        }
    } catch (e) {
        console.error("讀取存檔失敗", e);
    }
}

function reviveHero(heroId) {
    let h = gameState.heroes.find(x => x.id === heroId);
    if (!h || !h.isDead) return;
    
    let cost = h.level * 100;
    if (gameState.gold >= cost) {
        gameState.gold -= cost;
        h.isDead = false;
        let st = getHeroStats(h);
        h.hp = st.maxHp;
        log(`⛑️ 花費 ${cost} 金幣治癒並復活了 [${h.name}]！`);
        renderAll();
        saveGame();
        if (currentModalHeroId) openHeroModal(currentModalHeroId, true);
    } else {
        alert(`金幣不足！醫治復活 [${h.name}] 需要 ${cost} 金幣。`);
    }
}

function switchTab(tabId, btnElement) {
    try {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        let target = document.getElementById('tab-' + tabId);
        if (target) target.classList.add('active');
        if (btnElement) btnElement.classList.add('active');
        renderAll();
    } catch (e) {
        console.error("切換頁籤失敗", e);
    }
}

function switchModalTab(tab, btnElement) {
    currentModalTab = tab;
    document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    if (currentModalHeroId) openHeroModal(currentModalHeroId, true);
}

function filterInv(type, btnElement) {
    currentInvFilter = type;
    document.querySelectorAll('#tab-inventory .sub-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    renderInventory();
}

function filterShop(type, btnElement) {
    currentShopFilter = type;
    document.querySelectorAll('#tab-shop .sub-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    renderShop();
}

function renderAll() {
    try {
        if (document.getElementById('res-gold')) document.getElementById('res-gold').innerText = gameState.gold;
        if (document.getElementById('res-gems')) document.getElementById('res-gems').innerText = gameState.gems;
        if (document.getElementById('guild-lv')) document.getElementById('guild-lv').innerText = gameState.guildLv;
        if (document.getElementById('temp-gold')) document.getElementById('temp-gold').innerText = gameState.tempSpoils.gold;
        
        let itemSummary = (gameState.tempSpoils.items && gameState.tempSpoils.items.length > 0) ? gameState.tempSpoils.items.join(', ') : "無";
        if (document.getElementById('temp-loot-items')) document.getElementById('temp-loot-items').innerText = itemSummary;

        renderDungeonSelect();
        renderPartyView();
        renderEnemiesView();
        renderHeroList();
        renderInventory();
        renderShop();
        renderQuests();
        renderBestiary();
    } catch (e) {
        console.error("renderAll 錯誤:", e);
    }
}

function renderDungeonSelect() {
    let select = document.getElementById('dungeon-select');
    if (!select || typeof DUNGEONS === 'undefined') return;
    select.innerHTML = "";
    DUNGEONS.forEach(d => {
        let opt = document.createElement('option');
        opt.value = d.id;
        opt.innerText = d.name;
        if (d.id === gameState.activeDungeonId) opt.selected = true;
        select.appendChild(opt);
    });
}

function changeDungeon(id) {
    if (gameState.isExploring) {
        alert("請先停止探索或結算回城才能更換地下城！");
        return;
    }
    gameState.activeDungeonId = id;
    gameState.waveCount = 0;
    gameState.bossAvailable = false;
    gameState.inBossFight = false;
    log(`[切換關卡] ${DUNGEONS.find(d=>d.id===id).name}`);
    renderAll();
}

function toggleExplore() {
    let activeParty = gameState.heroes.filter(h => (h.row === 'front' || h.row === 'back') && !h.isDead);
    if (activeParty.length === 0) {
        alert("沒有上陣且存活的冒險者！請在冒險者列表中設置前衛/後衛並確定未陣亡。");
        return;
    }

    gameState.isExploring = !gameState.isExploring;
    let btn = document.getElementById('explore-btn');
    let pauseBtn = document.getElementById('pause-btn');
    if (gameState.isExploring) {
        btn.innerText = "🛑 停止探索";
        btn.className = "btn btn-danger";
        pauseBtn.style.display = "inline-block";
        log("🚀 隊伍出發深入地下城！");
    } else {
        btn.innerText = "🚀 開始探索";
        btn.className = "btn btn-success";
        pauseBtn.style.display = "none";
        log("⏸️ 探索暫停。");
    }
    renderAll();
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    document.getElementById('pause-btn').innerText = gameState.isPaused ? "▶️ 繼續" : "⏸️ 暫停";
}

function retreatAndSettle() {
    gameState.isExploring = false;
    gameState.isPaused = false;
    
    let addedGold = gameState.tempSpoils.gold;
    gameState.gold += addedGold;
    
    if (gameState.tempSpoils.items) {
        gameState.tempSpoils.items.forEach(itemName => {
            let found = gameState.inventory.find(i => i.name === itemName);
            if (found) found.count++;
            else gameState.inventory.push({ id: "loot_" + Date.now(), name: itemName, type: "material", category: "material", count: 1, desc: "地下城探險素材" });
        });
    }

    log(`🏠 結算回城！獲得金幣: ${addedGold}`);
    alert(`結算回城成功！獲得金幣: ${addedGold}`);

    gameState.tempSpoils = { gold: 0, items: [], exp: 0 };
    gameState.currentEnemies = { front: [], back: [] };
    gameState.waveCount = 0;
    gameState.bossAvailable = false;
    gameState.inBossFight = false;

    if (gameState.heroes) {
        gameState.heroes.forEach(h => {
            h.ct = 0;
            if (!h.isDead) {
                let st = getHeroStats(h);
                h.hp = st.maxHp;
            }
        });
    }

    let exploreBtn = document.getElementById('explore-btn');
    if (exploreBtn) { exploreBtn.innerText = "🚀 開始探索"; exploreBtn.className = "btn btn-success"; }
    let pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.style.display = "none";

    saveGame();
    renderAll();
}

function renderPartyView() {
    let frontContainer = document.getElementById('party-front-list');
    let backContainer = document.getElementById('party-back-list');
    if (!frontContainer || !backContainer) return;
    
    frontContainer.innerHTML = "";
    backContainer.innerHTML = "";
    
    if (!gameState.heroes || gameState.heroes.length === 0) return;

    gameState.heroes.forEach(h => {
        if (h.row === 'reserve') return;

        let st = getHeroStats(h);
        let genderIcon = h.gender === 'female' ? '<span style="color:#ff7675;">♀</span>' : '<span style="color:#74b9ff;">♂</span>';
        let jobName = (typeof JOBS !== 'undefined' && JOBS[h.job]) ? JOBS[h.job].name : '無業遊民';
        let curJobLv = (h.jobLevels && h.jobLevels[h.job]) ? h.jobLevels[h.job] : 1;
        let statusBadge = h.isDead ? '<span style="color:var(--danger); font-weight:bold;">[💀 死亡]</span>' : `HP: ${Math.max(0, Math.floor(h.hp))}/${st.maxHp}`;
        let ctPercent = Math.min(100, Math.floor((h.ct || 0) / 100 * 100));

        let html = `
            <div class="entity-card" style="${h.isDead ? 'opacity:0.5; border-left-color:gray;' : ''}">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${h.name} (Lv.${h.level}) ${genderIcon}</strong> 
                    <span style="font-size:11px; color:var(--accent);">${jobName} (職 Lv.${curJobLv})</span>
                </div>
                <div style="font-size:11px; margin-top:2px;">${statusBadge}</div>
                <div class="bar-container"><div class="hp-bar" style="width:${h.isDead ? 0 : Math.min(100, Math.max(0, (h.hp/st.maxHp)*100))}%;"></div></div>
                <div style="font-size:10px; color:#aaa; margin-top:2px;">行動讀條 (SPD:${st.spd})</div>
                <div class="bar-container"><div class="atb-bar" style="width:${h.isDead ? 0 : ctPercent}%;"></div></div>
            </div>
        `;
        if (h.row === 'back') backContainer.innerHTML += html;
        else if (h.row === 'front') frontContainer.innerHTML += html;
    });
}

function renderEnemiesView() {
    let frontContainer = document.getElementById('enemy-front-list');
    let backContainer = document.getElementById('enemy-back-list');
    if (!frontContainer || !backContainer) return;

    frontContainer.innerHTML = "";
    backContainer.innerHTML = "";
    
    let waveCounter = document.getElementById('wave-counter');
    if (waveCounter) {
        waveCounter.innerText = gameState.isExploring ? `(波次: ${gameState.waveCount}/10)` : `(未出發)`;
    }

    if (gameState.isExploring && gameState.currentEnemies.front.length === 0 && gameState.currentEnemies.back.length === 0 && !gameState.bossAvailable) {
        spawnWave();
    }

    if (!gameState.isExploring) {
        frontContainer.innerHTML = "<div style='font-size:12px; color:#aaa;'>點擊上方「開始探索」出發</div>";
        return;
    }

    gameState.currentEnemies.front.forEach(e => {
        let ctPercent = Math.min(100, Math.floor((e.ct || 0) / 100 * 100));
        frontContainer.innerHTML += `
            <div class="entity-card" style="border-left-color: var(--danger);">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${e.name}</strong>
                    <span style="font-size:11px; color:#ff6b6b;">HP: ${Math.max(0, Math.floor(e.hp))}/${e.maxHp}</span>
                </div>
                <div class="bar-container"><div class="hp-bar" style="width:${Math.min(100, Math.max(0, (e.hp/e.maxHp)*100))}%; background:var(--danger);"></div></div>
                <div class="bar-container" style="margin-top:3px;"><div class="atb-bar" style="width:${ctPercent}%; background:#e67e22;"></div></div>
            </div>
        `;
    });

    gameState.currentEnemies.back.forEach(e => {
        let ctPercent = Math.min(100, Math.floor((e.ct || 0) / 100 * 100));
        backContainer.innerHTML += `
            <div class="entity-card" style="border-left-color: #e67e22;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${e.name}</strong>
                    <span style="font-size:11px; color:#ff6b6b;">HP: ${Math.max(0, Math.floor(e.hp))}/${e.maxHp}</span>
                </div>
                <div class="bar-container"><div class="hp-bar" style="width:${Math.min(100, Math.max(0, (e.hp/e.maxHp)*100))}%; background:var(--danger);"></div></div>
                <div class="bar-container" style="margin-top:3px;"><div class="atb-bar" style="width:${ctPercent}%; background:#e67e22;"></div></div>
            </div>
        `;
    });

    let bossBtn = document.getElementById('boss-btn');
    if (bossBtn) {
        bossBtn.style.display = (gameState.bossAvailable && !gameState.inBossFight) ? "block" : "none";
    }
}

function spawnWave() {
    if (typeof DUNGEONS === 'undefined') return;
    let dung = DUNGEONS.find(d => d.id === gameState.activeDungeonId);
    if (!dung) return;
    let frontMob = dung.mobs[Math.floor(Math.random() * dung.mobs.length)];
    let backMob = dung.mobs[Math.floor(Math.random() * dung.mobs.length)];

    gameState.currentEnemies = {
        front: [{ ...frontMob, maxHp: frontMob.hp, mobId: frontMob.id, ct: 0, spd: frontMob.spd || 15 }],
        back: [{ ...backMob, maxHp: backMob.hp, mobId: backMob.id, ct: 0, spd: backMob.spd || 12 }]
    };
    if (!gameState.bestiary[frontMob.id]) gameState.bestiary[frontMob.id] = { ...frontMob, kills: 0 };
    if (!gameState.bestiary[backMob.id]) gameState.bestiary[backMob.id] = { ...backMob, kills: 0 };
}

function triggerBossFight() {
    if (typeof DUNGEONS === 'undefined') return;
    let dung = DUNGEONS.find(d => d.id === gameState.activeDungeonId);
    if (!dung) return;
    gameState.inBossFight = true;
    gameState.bossAvailable = false;
    gameState.currentEnemies = {
        front: [{ ...dung.boss, maxHp: dung.boss.hp, mobId: dung.boss.id, ct: 0, spd: dung.boss.spd || 20 }],
        back: []
    };
    log(`🔥 首領 ${dung.boss.name} 降臨！`);
    renderAll();
}

function startBattleLoop() {
    setInterval(() => {
        if (!gameState.isExploring || gameState.isPaused) return;

        let threshold = parseInt(document.getElementById('auto-potion-threshold').value) || 40;
        let potionType = document.getElementById('auto-potion-type').value;

        if (gameState.heroes) {
            gameState.heroes.forEach(h => {
                if (!h.isDead && (h.row === 'front' || h.row === 'back')) {
                    let st = getHeroStats(h);
                    if (h.hp > 0 && h.hp < st.maxHp) h.hp = Math.min(st.maxHp, h.hp + st.hpRegen);
                    if (h.hp > 0 && (h.hp / st.maxHp * 100) < threshold) usePotion(h, potionType);
                }
            });
        }

        let frontEnemies = gameState.currentEnemies.front;
        let backEnemies = gameState.currentEnemies.back;
        let allEnemies = [...frontEnemies, ...backEnemies].filter(e => e.hp > 0);
        let activeHeroes = gameState.heroes.filter(h => (h.row === 'front' || h.row === 'back') && h.hp > 0 && !h.isDead);

        if (allEnemies.length === 0 || activeHeroes.length === 0) {
            renderPartyView();
            renderEnemiesView();
            return;
        }

        activeHeroes.forEach(h => {
            let st = getHeroStats(h);
            h.ct = (h.ct || 0) + Math.max(3, Math.floor(st.spd * 0.8));
        });

        allEnemies.forEach(e => {
            e.ct = (e.ct || 0) + Math.max(3, Math.floor((e.spd || 15) * 0.8));
        });

        let readyHero = activeHeroes.filter(h => h.ct >= 100).sort((a, b) => b.ct - a.ct)[0];
        let readyEnemy = allEnemies.filter(e => e.ct >= 100).sort((a, b) => b.ct - a.ct)[0];

        if (readyHero && (!readyEnemy || readyHero.ct >= readyEnemy.ct)) {
            readyHero.ct -= 100;

            let heroSt = getHeroStats(readyHero);
            let targetEnemy = frontEnemies.length > 0 ? frontEnemies[0] : backEnemies[0];

            let usedSkill = null;
            if (readyHero.equippedSkills && readyHero.equippedSkills.length > 0 && typeof SKILLS !== 'undefined') {
                for (let skId of readyHero.equippedSkills) {
                    let sk = SKILLS[skId];
                    if (sk && (!readyHero.skillCooldowns || !readyHero.skillCooldowns[skId] || readyHero.skillCooldowns[skId] === 0)) {
                        usedSkill = sk;
                        if (!readyHero.skillCooldowns) readyHero.skillCooldowns = {};
                        readyHero.skillCooldowns[skId] = sk.cd;
                        
                        if (!readyHero.skillProficiency) readyHero.skillProficiency = {};
                        readyHero.skillProficiency[skId] = (readyHero.skillProficiency[skId] || 0) + 1;
                        break;
                    }
                }
            }

            let dmgToEnemy = 0;
            if (usedSkill && usedSkill.type === 'attack') {
                dmgToEnemy = Math.max(3, Math.floor(heroSt.atk * usedSkill.power - targetEnemy.def * 0.4));
                log(`⚡ [${readyHero.name}] 使用 [${usedSkill.name}] 造成 ${dmgToEnemy} 傷害！`);
            } else if (usedSkill && usedSkill.type === 'heal') {
                let healAmt = Math.floor(heroSt.matk * usedSkill.power);
                readyHero.hp = Math.min(heroSt.maxHp, readyHero.hp + healAmt);
                log(`💖 [${readyHero.name}] 使用 [${usedSkill.name}] 恢復 ${healAmt} 生命！`);
            } else {
                dmgToEnemy = Math.max(2, Math.floor(heroSt.atk - targetEnemy.def * 0.5));
                log(`⚔️ [${readyHero.name}] 攻擊 [${targetEnemy.name}] 造成 ${dmgToEnemy} 傷害`);
            }

            targetEnemy.hp -= dmgToEnemy;

            if (targetEnemy.hp <= 0) {
                log(`☠️ 擊敗 [${targetEnemy.name}]！獲得 ${targetEnemy.gold} 金幣`);
                gameState.tempSpoils.gold += targetEnemy.gold;

                if (targetEnemy.drops && targetEnemy.drops.length > 0) {
                    let dropItemName = targetEnemy.drops[0].name;
                    gameState.tempSpoils.items.push(dropItemName);

                    let invItem = gameState.inventory.find(i => i.name === dropItemName);
                    let dbItem = ITEMS_DATABASE.find(i => i.name === dropItemName);
                    if (invItem) {
                        invItem.count++;
                    } else if (dbItem) {
                        gameState.inventory.push({ ...dbItem, count: 1 });
                    } else {
                        gameState.inventory.push({ id: "drop_" + Date.now(), name: dropItemName, type: "material", category: "material", cost: 30, sell: 10, count: 1, desc: "戰利品" });
                    }
                    log(`🎁 掉落物：【${dropItemName}】！`);
                }

                activeHeroes.forEach(hero => {
                    if (hero.level < 50) {
                        hero.exp += targetEnemy.exp;
                        if (hero.exp >= hero.maxExp) {
                            hero.level++;
                            hero.exp -= hero.maxExp;
                            hero.maxExp = Math.floor(hero.maxExp * 1.4);
                            log(`🎉 ${hero.name} 升級至 Lv.${hero.level}！`);
                        }
                    }

                    if (!hero.jobLevels) hero.jobLevels = {};
                    if (!hero.jobExps) hero.jobExps = {};
                    if (!hero.jobMaxExps) hero.jobMaxExps = {};

                    let curJob = hero.job;
                    let curJobLv = hero.jobLevels[curJob] || 1;
                    if (curJobLv < 10) {
                        hero.jobExps[curJob] = (hero.jobExps[curJob] || 0) + Math.floor(targetEnemy.exp / 2);
                        let maxJExp = hero.jobMaxExps[curJob] || 50;
                        if (hero.jobExps[curJob] >= maxJExp) {
                            hero.jobLevels[curJob] = curJobLv + 1;
                            hero.jobExps[curJob] -= maxJExp;
                            hero.jobMaxExps[curJob] = Math.floor(maxJExp * 1.5);
                            checkSkillUnlocks(hero);
                            log(`🌟 ${hero.name} 的【${JOBS[curJob].name}】提升至 Lv.${hero.jobLevels[curJob]}！`);
                        }
                    }
                });

                if (frontEnemies.includes(targetEnemy)) gameState.currentEnemies.front = frontEnemies.filter(e => e !== targetEnemy);
                else gameState.currentEnemies.back = backEnemies.filter(e => e !== targetEnemy);

                if (gameState.currentEnemies.front.length === 0 && gameState.currentEnemies.back.length === 0) {
                    if (gameState.inBossFight) {
                        gameState.inBossFight = false;
                        gameState.waveCount = 0;
                        log(`🏆 擊殺 Boss 成功！解鎖更高關卡與商店等級！`);
                        gameState.tempSpoils.gold += 300;
                        let dung = DUNGEONS.find(d => d.id === gameState.activeDungeonId);
                        if (dung && dung.tier >= gameState.maxTierUnlocked) gameState.maxTierUnlocked = dung.tier + 1;
                    } else {
                        gameState.waveCount++;
                        if (gameState.waveCount >= 10 && !gameState.bossAvailable) {
                            gameState.bossAvailable = true;
                            log(`🔔 已達 10 波，可隨時挑戰 Boss！`);
                        }
                    }
                }
            }
        } else if (readyEnemy) {
            readyEnemy.ct -= 100;

            let livingFront = activeHeroes.filter(h => h.row === 'front');
            let targetHero = livingFront.length > 0 ? livingFront[Math.floor(Math.random() * livingFront.length)] : activeHeroes[Math.floor(Math.random() * activeHeroes.length)];
            
            if (targetHero) {
                let targetSt = getHeroStats(targetHero);
                let dmgToHero = Math.max(2, Math.floor(readyEnemy.atk - targetSt.def * 0.4));
                targetHero.hp -= dmgToHero;
                log(`💥 [${readyEnemy.name}] 反擊 [${targetHero.name}] 造成 ${dmgToHero} 傷害`);

                if (targetHero.hp <= 0) {
                    targetHero.hp = 0;
                    targetHero.isDead = true;
                    log(`💀 [${targetHero.name}] 在戰鬥中陣亡了！必須返回城鎮花費金幣醫治！`);
                }
            }
        }

        renderPartyView();
        renderEnemiesView();
    }, 200);
}

function usePotion(hero, potionId) {
    if (hero.isDead) return;
    let invItem = gameState.inventory.find(i => i.id === potionId && i.count > 0);
    if (invItem) {
        invItem.count--;
        let potData = ITEMS_DATABASE.find(i => i.id === potionId) || { heal: 80 };
        let healAmt = potData.heal;
        let st = getHeroStats(hero);
        hero.hp = Math.min(st.maxHp, hero.hp + healAmt);
        if (invItem.count <= 0) gameState.inventory = gameState.inventory.filter(i => i !== invItem);
        renderInventory();
    }
}

function recruitHero() {
    if (gameState.gold >= 120) {
        gameState.gold -= 120;
        let gender = Math.random() > 0.5 ? 'male' : 'female';
        let nameList = HERO_NAMES[gender] || ["冒險者"];
        let randomName = nameList[Math.floor(Math.random() * nameList.length)];
        
        let newHero = createHero(randomName, gender, 'reserve');
        if (!gameState.heroes) gameState.heroes = [];
        gameState.heroes.push(newHero);
        log(`🍻 成功招募：${randomName} (${gender === 'male' ? '男 ♂' : '女 ♀'})！`);
        renderAll();
        saveGame();
    } else {
        alert("金幣不足 120！");
    }
}

function cycleHeroRow(heroId) {
    let h = gameState.heroes.find(x => x.id === heroId);
    if (h) {
        if (h.row === 'front') h.row = 'back';
        else if (h.row === 'back') h.row = 'reserve';
        else h.row = 'front';

        let rowName = h.row === 'front' ? '前衛' : (h.row === 'back' ? '後衛' : '未上陣');
        log(`🔄 [${h.name}] 已調整位置至【${rowName}】`);
        renderAll();
        saveGame();
        if (currentModalHeroId) openHeroModal(currentModalHeroId, true);
    }
}

// 修正 2 & 3 & 4：轉職頁面與解鎖費用/無條件切換
function openJobModal(heroId) {
    currentJobModalHeroId = heroId;
    let h = gameState.heroes.find(x => x.id === heroId);
    if (!h) return;

    let st = getHeroStats(h);
    let statsHeader = document.getElementById('job-modal-hero-stats');
    if (statsHeader) {
        statsHeader.innerHTML = `
            <strong>${h.name} 當前能力值：</strong><br>
            STR: ${Math.floor(st.str)} | CON: ${Math.floor(st.con)} | MND: ${Math.floor(st.mnd)} | DEX: ${Math.floor(st.dex)} | AGI: ${Math.floor(st.agi)} | LUK: ${Math.floor(st.luk)}
        `;
    }

    selectedJobIdForView = h.job;
    renderJobModalContent();

    let modal = document.getElementById('job-modal');
    if (modal) modal.style.display = 'flex';
}

function renderJobModalContent() {
    let h = gameState.heroes.find(x => x.id === currentJobModalHeroId);
    if (!h) return;
    let st = getHeroStats(h);

    let rightPanel = document.getElementById('job-right-list');
    if (!rightPanel) return;

    if (!h.unlockedJobs) h.unlockedJobs = ["novice"];

    rightPanel.innerHTML = "";
    Object.keys(JOBS).forEach(jKey => {
        let j = JOBS[jKey];
        let isCurrent = h.job === j.id;
        let isUnlocked = h.unlockedJobs.includes(j.id);

        let savedJobLv = (h.jobLevels && h.jobLevels[j.id]) ? h.jobLevels[j.id] : 1;
        let savedJobExp = (h.jobExps && h.jobExps[j.id]) ? h.jobExps[j.id] : 0;
        let savedJobMaxExp = (h.jobMaxExps && h.jobMaxExps[j.id]) ? h.jobMaxExps[j.id] : 50;

        let canReq = true;
        Object.keys(j.req).forEach(rKey => { if (st[rKey] < j.req[rKey]) canReq = false; });

        let btnHtml = '';
        if (isCurrent) {
            btnHtml = `<button class="btn btn-success" style="font-size:11px;" disabled>當前職業</button>`;
        } else if (isUnlocked) {
            // 已解鎖過的職業：無條件自由切換
            btnHtml = `<button class="btn btn-primary" style="font-size:11px;" onclick="changeHeroJob('${h.id}', '${j.id}')">切換 (Lv.${savedJobLv})</button>`;
        } else if (!canReq) {
            // 未滿足數值條件：明確標示「未滿足條件」
            btnHtml = `<button class="btn btn-danger" style="font-size:11px; opacity:0.6;" disabled>未滿足條件</button>`;
        } else {
            // 滿足條件但尚未獲得：需要扣除費用解鎖
            let costGold = (j.cost && j.cost.gold) ? j.cost.gold : 50;
            btnHtml = `<button class="btn btn-warning" style="font-size:11px;" onclick="unlockHeroJob('${h.id}', '${j.id}')">解鎖職業 (🪙 ${costGold}金幣)</button>`;
        }

        rightPanel.innerHTML += `
            <div style="background:#161720; padding:10px; border-radius:6px; border:1px solid var(--panel-border);" onclick="selectJobView('${j.id}')">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${j.name}</strong> ${isUnlocked ? `<span style="font-size:11px; color:var(--accent);">(已達 職 Lv.${savedJobLv})</span>` : '<span style="font-size:11px; color:#888;">(未獲得)</span>'}
                        <div style="font-size:11px; color:#aaa;">前置要求: ${JSON.stringify(j.req)}</div>
                    </div>
                    ${btnHtml}
                </div>
                ${isUnlocked ? `
                    <div style="margin-top:6px; font-size:10px;">
                        <div>熟練進度: ${savedJobExp} / ${savedJobMaxExp} EXP</div>
                        <div class="bar-container"><div class="hp-bar" style="width:${Math.min(100, (savedJobExp/savedJobMaxExp)*100)}%; background:#9b59b6;"></div></div>
                    </div>
                ` : ''}
            </div>
        `;
    });

    selectJobView(selectedJobIdForView || h.job);
}

function selectJobView(jobId) {
    selectedJobIdForView = jobId;
    let j = JOBS[jobId];
    let leftPanel = document.getElementById('job-left-desc');
    if (!leftPanel || !j) return;

    let skillsHtml = Object.keys(j.unlockSkills).map(lv => {
        let sk = SKILLS[j.unlockSkills[lv]];
        return `<div style="margin-top:4px; background:#1e2029; padding:6px; border-radius:4px;">
            <strong style="color:var(--accent);">[Lv.${lv} 解鎖] ${sk.name}</strong> (${sk.type})
            <div style="font-size:10px; color:#aaa;">${sk.desc} (CD: ${sk.cd}回合)</div>
        </div>`;
    }).join('');

    leftPanel.innerHTML = `
        <h4>${j.name}</h4>
        <p style="font-size:12px; color:#aaa;">${j.desc}</p>
        <h5 style="margin:10px 0 4px 0;">📜 可習得 4 種專屬技能：</h5>
        ${skillsHtml}
    `;
}

// 解鎖全新職業並扣除費用
function unlockHeroJob(heroId, jobId) {
    let h = gameState.heroes.find(x => x.id === heroId);
    let j = JOBS[jobId];
    if (!h || !j) return;

    let costGold = (j.cost && j.cost.gold) ? j.cost.gold : 50;
    if (gameState.gold >= costGold) {
        gameState.gold -= costGold;
        if (!h.unlockedJobs) h.unlockedJobs = ["novice"];
        h.unlockedJobs.push(jobId);

        if (!h.jobLevels) h.jobLevels = {};
        if (!h.jobLevels[jobId]) h.jobLevels[jobId] = 1;

        h.job = jobId;
        h.jobModifiers = j.modifiers || {};
        checkSkillUnlocks(h);
        log(`🎉 花費 ${costGold} 金幣成功為 ${h.name} 解鎖新職業【${j.name}】！`);
        openJobModal(heroId);
        renderAll();
        saveGame();
    } else {
        alert(`金幣不足！解鎖【${j.name}】需要 ${costGold} 金幣。`);
    }
}

// 無條件切換已解鎖職業
function changeHeroJob(heroId, jobId) {
    let h = gameState.heroes.find(x => x.id === heroId);
    if (h && typeof JOBS !== 'undefined') {
        let j = JOBS[jobId];
        h.job = jobId;
        h.jobModifiers = j.modifiers || {};
        checkSkillUnlocks(h);
        log(`✨ ${h.name} 切換職業為 ${j.name} (職 Lv.${h.jobLevels[jobId] || 1})！`);
        openJobModal(heroId);
        renderAll();
        saveGame();
    }
}

function closeJobModal() {
    currentJobModalHeroId = null;
    let modal = document.getElementById('job-modal');
    if (modal) modal.style.display = 'none';
}

// 修正 1：完美修復武器、防具與飾品的替換選單
function selectEquipForHero(heroId, slot) {
    let h = gameState.heroes.find(x => x.id === heroId);
    if (!h) return;

    let jobData = JOBS[h.job];
    let availableEquips = gameState.inventory.filter(i => {
        if (i.type !== 'equipment' || i.slot !== slot || i.count <= 0) return false;
        if (!jobData || !jobData.allowedEquip) return true;
        if (jobData.allowedEquip.includes("all")) return true;
        return jobData.allowedEquip.includes(i.equipType);
    });

    let slotName = slot === 'weapon' ? '武器' : (slot === 'armor' ? '防具' : '飾品');

    if (availableEquips.length === 0) {
        let choice = confirm(`背包中目前沒有【${jobData ? jobData.name : ''}】可裝備的【${slotName}】！\n是否要卸下當前穿戴的 ${slotName}？`);
        if (choice) equipItem(heroId, slot, null);
        return;
    }

    let equipNames = availableEquips.map((e, idx) => `${idx + 1}. ${e.name} (${e.desc || ''})`).join('\n');
    let input = prompt(`請輸入數字選擇要裝備的【${slotName}】 (輸入 0 卸下當前裝備):\n${equipNames}`);
    
    if (input === "0") {
        equipItem(heroId, slot, null);
    } else if (input && parseInt(input) > 0 && parseInt(input) <= availableEquips.length) {
        let chosenItem = availableEquips[parseInt(input) - 1];
        equipItem(heroId, slot, chosenItem);
    }
}

function equipItem(heroId, slot, itemObj) {
    let h = gameState.heroes.find(x => x.id === heroId);
    if (!h) return;

    if (!h.equippedItems) h.equippedItems = { weapon: null, armor: null, accessory: null };
    
    // 卸下舊裝備並歸還背包
    if (h.equippedItems[slot]) {
        let oldItem = h.equippedItems[slot];
        let invOld = gameState.inventory.find(i => i.name === oldItem.name);
        if (invOld) invOld.count++;
        else gameState.inventory.push({ ...oldItem, count: 1 });
        log(`🛡️ [${h.name}] 卸下了【${oldItem.name}】`);
    }

    // 穿上新裝備並扣除背包數量
    if (itemObj) {
        h.equippedItems[slot] = { ...itemObj };
        let invNew = gameState.inventory.find(i => i.id === itemObj.id || i.name === itemObj.name);
        if (invNew) {
            invNew.count--;
            if (invNew.count <= 0) {
                gameState.inventory = gameState.inventory.filter(i => i !== invNew);
            }
        }
        log(`⚔️ [${h.name}] 裝備了【${itemObj.name}】！`);
    } else {
        h.equippedItems[slot] = null;
    }

    openHeroModal(heroId, true);
    renderAll();
    saveGame();
}

function openHeroModal(heroId, isRefresh = false) {
    currentModalHeroId = heroId;
    let h = gameState.heroes.find(x => x.id === heroId);
    if (!h) return;
    let st = getHeroStats(h);
    let body = document.getElementById('modal-hero-body');
    if (!body) return;

    let curJobLv = (h.jobLevels && h.jobLevels[h.job]) ? h.jobLevels[h.job] : 1;
    let curJobExp = (h.jobExps && h.jobExps[h.job]) ? h.jobExps[h.job] : 0;
    let curJobMaxExp = (h.jobMaxExps && h.jobMaxExps[h.job]) ? h.jobMaxExps[h.job] : 50;

    if (currentModalTab === 'stats') {
        let raceName = RACES[h.race] ? RACES[h.race].name : "人族";
        let traitsHtml = (h.traits && h.traits.length > 0) ? h.traits.map(t => `<span style="background:#2a2d3d; padding:2px 6px; border-radius:4px; font-size:11px; color:var(--accent); margin-right:5px;" title="${t.desc}">${t.name}</span>`).join('') : "無";
        let jobName = (typeof JOBS !== 'undefined' && JOBS[h.job]) ? JOBS[h.job].name : '無業遊民';
        let reviveBtn = h.isDead ? `<button class="btn btn-danger" onclick="reviveHero('${h.id}')">⛑️ 醫治復活 (${h.level * 100}金幣)</button>` : '';
        let rowLabel = h.row === 'front' ? '🛡️ 前衛' : (h.row === 'back' ? '🏹 後衛' : '💤 未上陣');

        let eq = h.equippedItems || { weapon: null, armor: null, accessory: null };
        let equipSlotsHtml = `
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin:10px 0;">
                <div style="background:#161720; padding:6px; border-radius:4px; font-size:11px;">
                    <strong>武器:</strong> ${eq.weapon ? eq.weapon.name : '無'}<br>
                    <button class="btn btn-primary" style="font-size:10px; padding:2px 5px; margin-top:4px;" onclick="selectEquipForHero('${h.id}', 'weapon')">替換</button>
                </div>
                <div style="background:#161720; padding:6px; border-radius:4px; font-size:11px;">
                    <strong>防具:</strong> ${eq.armor ? eq.armor.name : '無'}<br>
                    <button class="btn btn-primary" style="font-size:10px; padding:2px 5px; margin-top:4px;" onclick="selectEquipForHero('${h.id}', 'armor')">替換</button>
                </div>
                <div style="background:#161720; padding:6px; border-radius:4px; font-size:11px;">
                    <strong>飾品:</strong> ${eq.accessory ? eq.accessory.name : '無'}<br>
                    <button class="btn btn-primary" style="font-size:10px; padding:2px 5px; margin-top:4px;" onclick="selectEquipForHero('${h.id}', 'accessory')">替換</button>
                </div>
            </div>
        `;

        body.innerHTML = `
            <h3>${h.name} (Lv.${h.level}) [${raceName}] ${h.gender === 'female' ? '女 ♀' : '男 ♂'}</h3>
            <p style="font-size:12px; color:#aaa;">性格: ${traitsHtml}</p>
            
            <div style="font-size:12px; margin-top:6px;">
                <div>角色 Lv.${h.level} / 50 (${h.exp} / ${h.maxExp} EXP)</div>
                <div class="bar-container"><div class="hp-bar" style="width:${Math.min(100, (h.exp/h.maxExp)*100)}%; background:#f1c40f;"></div></div>
                <div style="margin-top:4px;">${jobName} (職 Lv.${curJobLv}/10) (${curJobExp} / ${curJobMaxExp} EXP)</div>
                <div class="bar-container"><div class="hp-bar" style="width:${Math.min(100, (curJobExp/curJobMaxExp)*100)}%; background:#9b59b6;"></div></div>
            </div>

            ${reviveBtn}

            <div style="margin: 10px 0; background:#161720; padding:8px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px;">當前位置: <strong>${rowLabel}</strong></span>
                <button class="btn btn-warning" style="font-size:11px;" onclick="cycleHeroRow('${h.id}')">切換位置</button>
            </div>

            <h4 style="margin:10px 0 5px 0;">🛡️ 穿戴裝備</h4>
            ${equipSlotsHtml}

            <h4 style="margin:10px 0 5px 0;">📊 六維數值與天生資質評分</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; font-size:12px; background:#161720; padding:10px; border-radius:6px;">
                <div>力量 (STR): ${Math.floor(st.str)} <span style="color:var(--accent);">[${h.growthGrades.str}]</span></div>
                <div>體質 (CON): ${Math.floor(st.con)} <span style="color:var(--accent);">[${h.growthGrades.con}]</span></div>
                <div>精神 (MND): ${Math.floor(st.mnd)} <span style="color:var(--accent);">[${h.growthGrades.mnd}]</span></div>
                <div>靈巧 (DEX): ${Math.floor(st.dex)} <span style="color:var(--accent);">[${h.growthGrades.dex}]</span></div>
                <div>敏捷 (AGI): ${Math.floor(st.agi)} <span style="color:var(--accent);">[${h.growthGrades.agi}]</span></div>
                <div>幸運 (LUK): ${Math.floor(st.luk)} <span style="color:var(--accent);">[${h.growthGrades.luk}]</span></div>
            </div>
        `;
    } else {
        body.innerHTML = `
            <h3>${h.name} - 技能與熟練度</h3>
            <div style="margin-top:10px;">
                <h4>已學會技能與裝備 (已裝備: ${h.equippedSkills ? h.equippedSkills.length : 0}/3)</h4>
                ${h.learnedSkills.map(skId => {
                    let sk = SKILLS[skId];
                    if (!sk) return '';
                    let prof = h.skillProficiency[skId] || 0;
                    let isEquipped = h.equippedSkills && h.equippedSkills.includes(skId);
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:#161720; padding:8px; border-radius:4px; margin-bottom:6px;">
                            <div>
                                <strong>${sk.name}</strong> <span style="font-size:10px; color:var(--accent);">[${sk.type}]</span>
                                <div style="font-size:11px; color:#aaa;">${sk.desc}</div>
                                <div style="font-size:11px; color:#f1c40f;">熟練度: ${prof} 次使出</div>
                            </div>
                            <button class="btn ${isEquipped ? 'btn-danger' : 'btn-primary'}" style="font-size:11px;" onclick="toggleSkill('${h.id}', '${skId}')">
                                ${isEquipped ? '卸下' : '裝配'}
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    let modal = document.getElementById('hero-modal');
    if (modal && !isRefresh) modal.style.display = 'flex';
}

function toggleSkill(heroId, skId) {
    let h = gameState.heroes.find(x => x.id === heroId);
    if (!h) return;
    if (!h.equippedSkills) h.equippedSkills = [];
    if (h.equippedSkills.includes(skId)) {
        h.equippedSkills = h.equippedSkills.filter(s => s !== skId);
    } else {
        if (h.equippedSkills.length < 3) h.equippedSkills.push(skId);
        else alert("最多只能裝配 3 個技能！");
    }
    openHeroModal(heroId, true);
    saveGame();
}

function closeHeroModal() {
    currentModalHeroId = null;
    let modal = document.getElementById('hero-modal');
    if (modal) modal.style.display = 'none';
}

function renderHeroList() {
    let container = document.getElementById('hero-list');
    if (!container) return;
    container.innerHTML = "";
    if (!gameState.heroes || gameState.heroes.length === 0) {
        container.innerHTML = "<p style='color:#aaa;'>目前公會暫無冒險者。</p>";
        return;
    }
    gameState.heroes.forEach(h => {
        let st = getHeroStats(h);
        let raceName = RACES[h.race] ? RACES[h.race].name : "人族";
        let genderIcon = h.gender === 'female' ? '<span style="color:#ff7675;">♀</span>' : '<span style="color:#74b9ff;">♂</span>';
        let jobName = (typeof JOBS !== 'undefined' && JOBS[h.job]) ? JOBS[h.job].name : '無業遊民';
        let curJobLv = (h.jobLevels && h.jobLevels[h.job]) ? h.jobLevels[h.job] : 1;
        let deadTag = h.isDead ? '<span style="color:var(--danger); font-weight:bold;">[💀 死亡]</span>' : '';
        let rowLabel = h.row === 'front' ? '前衛' : (h.row === 'back' ? '後衛' : '未上陣');

        container.innerHTML += `
            <div class="card" style="${h.isDead ? 'border-color:var(--danger);' : ''}">
                <h4>${h.name} (Lv.${h.level}) [${raceName}] ${genderIcon} ${deadTag}</h4>
                <p style="font-size:12px; color:var(--accent);">${jobName} (職 Lv.${curJobLv}) | 位置: <strong>${rowLabel}</strong></p>
                <div style="font-size:11px; margin-bottom:4px;">EXP: ${h.exp}/${h.maxExp}</div>
                <div class="bar-container" style="margin-bottom:8px;"><div class="hp-bar" style="width:${Math.min(100, (h.exp/h.maxExp)*100)}%; background:#f1c40f;"></div></div>
                <p style="font-size:12px;">STR: ${Math.floor(st.str)} | CON: ${Math.floor(st.con)} | AGI: ${Math.floor(st.agi)}</p>
                <div style="display:flex; gap:6px; margin-top:8px;">
                    <button class="btn btn-warning" style="flex:1; font-size:11px;" onclick="cycleHeroRow('${h.id}')">切換位置</button>
                    <button class="btn btn-primary" style="flex:1; font-size:11px;" onclick="openHeroModal('${h.id}')">管理角色</button>
                    <button class="btn btn-success" style="flex:1; font-size:11px;" onclick="openJobModal('${h.id}')">管理職業</button>
                </div>
            </div>
        `;
    });
}

function renderInventory() {
    let container = document.getElementById('inventory-grid');
    if (!container) return;
    container.innerHTML = "";
    
    let filteredItems = gameState.inventory.filter(item => {
        if (currentInvFilter === 'all') return true;
        return item.category === currentInvFilter || item.type === currentInvFilter;
    });

    if (filteredItems.length === 0) {
        container.innerHTML = "<p style='color:#aaa;'>此分頁沒有道具或裝備。</p>";
        return;
    }

    filteredItems.forEach(item => {
        let sellPrice = item.sell || Math.floor((item.cost || 30) / 3);

        container.innerHTML += `
            <div class="shop-item-row" style="margin-bottom:8px;">
                <div class="shop-item-info">
                    <div class="shop-item-title">${item.name} <span style="font-size:12px; color:var(--accent);">x${item.count}</span></div>
                    <div class="shop-item-desc">${item.desc || '背包物品'}</div>
                </div>
                <div class="shop-item-action">
                    <span class="shop-item-price">🪙 ${sellPrice} 金幣/個</span>
                    <button class="btn btn-danger" onclick="sellInvItem('${item.id}')">出售 1 個</button>
                </div>
            </div>
        `;
    });
}

function sellInvItem(id) {
    let item = gameState.inventory.find(i => i.id === id);
    if (item && item.count > 0) {
        let sellPrice = item.sell || Math.floor((item.cost || 30) / 3);
        
        item.count--;
        gameState.gold += sellPrice;
        log(`💰 出售了 1 個【${item.name}】，獲得 ${sellPrice} 金幣`);

        if (item.count <= 0) {
            gameState.inventory = gameState.inventory.filter(i => i.id !== id);
        }

        renderAll();
        saveGame();
    }
}

function renderShop() {
    let container = document.getElementById('shop-items-list');
    let tierBadge = document.getElementById('shop-tier-badge');
    if (!container) return;
    
    if (tierBadge) tierBadge.innerText = `(商店等級 ${gameState.maxTierUnlocked || 1})`;
    container.innerHTML = "";

    let availableItems = [];
    for (let t = 1; t <= (gameState.maxTierUnlocked || 1); t++) {
        if (SHOP_ITEMS_BY_TIER[t]) availableItems = availableItems.concat(SHOP_ITEMS_BY_TIER[t]);
    }

    let filtered = availableItems.filter(i => {
        if (currentShopFilter === 'all') return true;
        return i.category === currentShopFilter;
    });

    if (filtered.length === 0) {
        container.innerHTML = "<p style='color:#aaa;'>目前等級的商店沒有該分類的商品。</p>";
        return;
    }

    filtered.forEach(s => {
        container.innerHTML += `
            <div class="shop-item-row">
                <div class="shop-item-info">
                    <div class="shop-item-title">${s.name}</div>
                    <div class="shop-item-desc">${s.desc}</div>
                </div>
                <div class="shop-item-action">
                    <span class="shop-item-price">🪙 ${s.cost} 金幣</span>
                    <button class="btn btn-primary" onclick="buyShopItem('${s.id}')">購買</button>
                </div>
            </div>
        `;
    });
}

function buyShopItem(id) {
    let item = ITEMS_DATABASE.find(i => i.id === id);
    if (!item) return;

    if (gameState.gold >= item.cost) {
        gameState.gold -= item.cost;
        let invItem = gameState.inventory.find(i => i.id === id);
        if (invItem) invItem.count++;
        else gameState.inventory.push({ ...item, count: 1 });
        log(`🛍️ 購買了 ${item.name}`);
        renderAll();
        saveGame();
    } else {
        alert("金幣不足！");
    }
}

function renderQuests() {
    let container = document.getElementById('quest-list');
    let activeCountEl = document.getElementById('active-quest-count');
    let limitEl = document.getElementById('max-quest-limit');
    if (!container) return;

    let maxLimit = (gameState.maxTierUnlocked || 1) * 2;
    if (activeCountEl) activeCountEl.innerText = gameState.activeQuests.length;
    if (limitEl) limitEl.innerText = maxLimit;

    container.innerHTML = "";

    QUEST_DATABASE.forEach(q => {
        if (q.tierReq > (gameState.maxTierUnlocked || 1)) return;

        let activeQ = gameState.activeQuests.find(x => x.id === q.id);
        let actionBtn = '';
        if (!activeQ) {
            actionBtn = `<button class="btn btn-primary" onclick="acceptQuest('${q.id}')">接取任務</button>`;
        } else if (activeQ.completed) {
            actionBtn = `<button class="btn btn-success" onclick="completeQuest('${q.id}')">回報領賞</button>`;
        } else {
            actionBtn = `<button class="btn btn-warning" disabled>進行中 (${activeQ.count}/${activeQ.maxCount})</button>`;
        }

        container.innerHTML += `
            <div class="shop-item-row" style="margin-bottom:8px;">
                <div class="shop-item-info">
                    <div class="shop-item-title">${q.title}</div>
                    <div class="shop-item-desc">${q.desc} (獎勵: 🪙 ${q.rewardGold} 金幣)</div>
                </div>
                <div class="shop-item-action">
                    ${actionBtn}
                </div>
            </div>
        `;
    });
}

function acceptQuest(id) {
    let maxLimit = (gameState.maxTierUnlocked || 1) * 2;
    if (gameState.activeQuests.length >= maxLimit) {
        alert(`目前最多同時接取 ${maxLimit} 個任務！請先完成已接取的任務。`);
        return;
    }

    let q = QUEST_DATABASE.find(x => x.id === id);
    if (q) {
        gameState.activeQuests.push({ ...q, count: 0, completed: false });
        log(`📜 接取任務：【${q.title}】`);
        renderAll();
        saveGame();
    }
}

function completeQuest(id) {
    let qIdx = gameState.activeQuests.findIndex(x => x.id === id);
    if (qIdx !== -1) {
        let q = gameState.activeQuests[qIdx];
        gameState.gold += q.rewardGold;
        log(`📜 完成任務【${q.title}】！獲得 🪙 ${q.rewardGold} 金幣`);
        gameState.activeQuests.splice(qIdx, 1);
        renderAll();
        saveGame();
    }
}

function renderBestiary() {
    let container = document.getElementById('bestiary-list');
    if (!container) return;
    container.innerHTML = "";
    Object.keys(gameState.bestiary).forEach(k => {
        let b = gameState.bestiary[k];
        container.innerHTML += `
            <div class="card">
                <h4>${b.name}</h4>
                <p style="font-size:12px;">HP: ${b.hp} | 攻擊: ${b.atk}</p>
            </div>
        `;
    });
}

function log(msg) {
    let logBox = document.getElementById('battle-log');
    if (logBox) {
        let div = document.createElement('div');
        div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logBox.appendChild(div);
        logBox.scrollTop = logBox.scrollHeight;
    }
}
