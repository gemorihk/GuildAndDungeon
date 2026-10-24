let gameState = {
    gold: 500,
    gems: 20,
    guildLv: 1,
    heroes: [],
    inventory: [
        { id: "pot_small", name: "小型回復藥水", type: "potion", heal: 80, count: 10 },
        { id: "iron_sword", name: "鐵劍", type: "equipment", equipType: "sword", atk: 15, count: 1, desc: "基礎長劍" }
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
    quests: [
        { id: "q1", title: "清掃哥布林", targetMob: "goblin", count: 0, maxCount: 10, rewardGold: 150, completed: false, claimed: false }
    ]
};

let currentModalHeroId = null;
let currentModalTab = 'stats';
let currentInvFilter = 'all';

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
        row: row,
        generation: gen,
        level: 1,           // 角色等級 (上限 50)
        exp: 0,
        maxExp: 100,
        job: "novice",
        jobLevel: 1,        // 職業等級 (上限 10)
        jobExp: 0,
        maxJobExp: 50,
        isDead: false,      // 死亡狀態標記
        traits: heroTraits,
        growthGrades: {
            str: getRandomGrade(),
            con: getRandomGrade(),
            mnd: getRandomGrade(),
            dex: getRandomGrade(),
            agi: getRandomGrade(),
            luk: getRandomGrade()
        },
        baseStats: {
            str: 10 + Math.floor(Math.random()*6),
            con: 10 + Math.floor(Math.random()*6),
            mnd: 10 + Math.floor(Math.random()*6),
            dex: 10 + Math.floor(Math.random()*6),
            agi: 10 + Math.floor(Math.random()*6),
            luk: 10 + Math.floor(Math.random()*6)
        },
        jobModifiers: { str: 0, con: 0, mnd: 0, dex: 0, agi: 0, luk: 0, atk: 0, matk: 0, def: 0 },
        learnedSkills: ["tackle"],         // 已學會技能
        skillProficiency: { tackle: 0 },   // 技能熟練度
        equippedSkills: ["tackle"],
        skillCooldowns: {},
        equippedItems: { weapon: null, armor: null, accessory: null },
        hp: 120,
        mp: 40
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

    if (hero.growthGrades && typeof GRADE_VALUES !== 'undefined') {
        Object.keys(hero.growthGrades).forEach(k => {
            let gradeVal = GRADE_VALUES[hero.growthGrades[k]] || 1.0;
            s[k] += Math.floor((lv - 1) * gradeVal * 1.5);
        });
    }

    Object.keys(m).forEach(k => {
        if(s[k] !== undefined) s[k] += m[k];
    });

    // 裝備加成
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

// 根據職業等級解鎖固定技能 (Lv.1, 3, 6, 10)
function checkSkillUnlocks(hero) {
    let jobData = JOBS[hero.job];
    if (!jobData || !jobData.unlockSkills) return;

    Object.keys(jobData.unlockSkills).forEach(reqLv => {
        if (hero.jobLevel >= parseInt(reqLv)) {
            let skId = jobData.unlockSkills[reqLv];
            if (!hero.learnedSkills.includes(skId)) {
                hero.learnedSkills.push(skId);
                hero.skillProficiency[skId] = 0;
                log(`✨ [${hero.name}] 職業等級達 Lv.${reqLv}，學會新技能【${SKILLS[skId].name}】！`);
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
        gameState.gold = 500;
        gameState.isExploring = false;
        gameState.waveCount = 0;
        gameState.currentEnemies = { front: [], back: [] };
        initDefaultHeroes();
        saveGame();
        renderAll();
        alert("存檔已成功重置！");
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

// 支付高額金幣醫治復活死亡角色
function reviveHero(heroId) {
    let h = gameState.heroes.find(x => x.id === heroId);
    if (!h || !h.isDead) return;
    
    let cost = h.level * 100; // 復活費用公式
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
    let livingHeroes = gameState.heroes.filter(h => !h.isDead);
    if (livingHeroes.length === 0) {
        alert("所有隊員皆處於死亡狀態！請先醫治復活冒險者。");
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
            else gameState.inventory.push({ id: "loot_" + Date.now(), name: itemName, type: "material", count: 1, desc: "地下城探險素材" });
        });
    }

    log(`🏠 結算回城！獲得金幣: ${addedGold}`);
    alert(`結算回城成功！獲得金幣: ${addedGold}`);

    gameState.tempSpoils = { gold: 0, items: [], exp: 0 };
    gameState.currentEnemies = { front: [], back: [] };
    gameState.waveCount = 0;
    gameState.bossAvailable = false;
    gameState.inBossFight = false;

    // 只有沒死亡的角色才能恢復血量
    if (gameState.heroes) {
        gameState.heroes.forEach(h => {
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
        let st = getHeroStats(h);
        let genderIcon = h.gender === 'female' ? '<span style="color:#ff7675;">♀</span>' : '<span style="color:#74b9ff;">♂</span>';
        let jobName = (typeof JOBS !== 'undefined' && JOBS[h.job]) ? JOBS[h.job].name : '無業遊民';
        let statusBadge = h.isDead ? '<span style="color:var(--danger); font-weight:bold;">[💀 死亡]</span>' : `HP: ${Math.max(0, Math.floor(h.hp))}/${st.maxHp}`;
        
        let html = `
            <div class="entity-card" style="${h.isDead ? 'opacity:0.5; border-left-color:gray;' : ''}">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${h.name} ${genderIcon}</strong> 
                    <span style="font-size:11px; color:var(--accent);">${jobName} Lv.${h.level}</span>
                </div>
                <div style="font-size:11px; margin-top:2px;">${statusBadge}</div>
                <div class="bar-container"><div class="hp-bar" style="width:${h.isDead ? 0 : Math.min(100, Math.max(0, (h.hp/st.maxHp)*100))}%;"></div></div>
            </div>
        `;
        if (h.row === 'back') backContainer.innerHTML += html;
        else frontContainer.innerHTML += html;
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
        frontContainer.innerHTML += `
            <div class="entity-card" style="border-left-color: var(--danger);">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${e.name}</strong>
                    <span style="font-size:11px; color:#ff6b6b;">HP: ${Math.max(0, Math.floor(e.hp))}/${e.maxHp}</span>
                </div>
                <div class="bar-container"><div class="hp-bar" style="width:${Math.min(100, Math.max(0, (e.hp/e.maxHp)*100))}%; background:var(--danger);"></div></div>
            </div>
        `;
    });

    gameState.currentEnemies.back.forEach(e => {
        backContainer.innerHTML += `
            <div class="entity-card" style="border-left-color: #e67e22;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${e.name}</strong>
                    <span style="font-size:11px; color:#ff6b6b;">HP: ${Math.max(0, Math.floor(e.hp))}/${e.maxHp}</span>
                </div>
                <div class="bar-container"><div class="hp-bar" style="width:${Math.min(100, Math.max(0, (e.hp/e.maxHp)*100))}%; background:var(--danger);"></div></div>
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
        front: [{ ...frontMob, maxHp: frontMob.hp, mobId: frontMob.id }],
        back: [{ ...backMob, maxHp: backMob.hp, mobId: backMob.id }]
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
        front: [{ ...dung.boss, maxHp: dung.boss.hp, mobId: dung.boss.id }],
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

        // 存活隊員自動喝藥與冷卻縮減
        if (gameState.heroes) {
            gameState.heroes.forEach(h => {
                if (!h.isDead) {
                    let st = getHeroStats(h);
                    if (h.hp > 0 && h.hp < st.maxHp) h.hp = Math.min(st.maxHp, h.hp + st.hpRegen);
                    if (h.hp > 0 && (h.hp / st.maxHp * 100) < threshold) usePotion(h, potionType);

                    if (h.skillCooldowns) {
                        Object.keys(h.skillCooldowns).forEach(sk => {
                            if (h.skillCooldowns[sk] > 0) h.skillCooldowns[sk]--;
                        });
                    }
                }
            });
        }

        let frontEnemies = gameState.currentEnemies.front;
        let backEnemies = gameState.currentEnemies.back;

        if (frontEnemies.length > 0 || backEnemies.length > 0) {
            // 只篩選存活 (!isDead) 且前/後排角色上陣
            let livingFront = gameState.heroes.filter(h => h.row === 'front' && h.hp > 0 && !h.isDead);
            let livingBack = gameState.heroes.filter(h => h.row === 'back' && h.hp > 0 && !h.isDead);
            let activeHero = livingFront.length > 0 ? livingFront[Math.floor(Math.random() * livingFront.length)] : (livingBack.length > 0 ? livingBack[0] : null);

            let activeEnemy = frontEnemies.length > 0 ? frontEnemies[0] : backEnemies[0];

            if (activeHero && activeEnemy) {
                let heroSt = getHeroStats(activeHero);
                let targetEnemy = frontEnemies.length > 0 ? frontEnemies[0] : backEnemies[0];

                let usedSkill = null;
                if (activeHero.equippedSkills && activeHero.equippedSkills.length > 0 && typeof SKILLS !== 'undefined') {
                    for (let skId of activeHero.equippedSkills) {
                        let sk = SKILLS[skId];
                        if (sk && (!activeHero.skillCooldowns || !activeHero.skillCooldowns[skId] || activeHero.skillCooldowns[skId] === 0)) {
                            usedSkill = sk;
                            if (!activeHero.skillCooldowns) activeHero.skillCooldowns = {};
                            activeHero.skillCooldowns[skId] = sk.cd;
                            
                            // 技能熟練度增加機制
                            if (!activeHero.skillProficiency) activeHero.skillProficiency = {};
                            activeHero.skillProficiency[skId] = (activeHero.skillProficiency[skId] || 0) + 1;
                            break;
                        }
                    }
                }

                let dmgToEnemy = 0;
                if (usedSkill && usedSkill.type === 'attack') {
                    dmgToEnemy = Math.max(3, Math.floor(heroSt.atk * usedSkill.power - targetEnemy.def * 0.4));
                    log(`✨ [${activeHero.name}] 使用 [${usedSkill.name}] 造成 ${dmgToEnemy} 傷害！`);
                } else if (usedSkill && usedSkill.type === 'heal') {
                    let healAmt = Math.floor(heroSt.matk * usedSkill.power);
                    activeHero.hp = Math.min(heroSt.maxHp, activeHero.hp + healAmt);
                    log(`💖 [${activeHero.name}] 使用 [${usedSkill.name}] 恢復 ${healAmt} 生命！`);
                } else {
                    dmgToEnemy = Math.max(2, Math.floor(heroSt.atk - targetEnemy.def * 0.5));
                    log(`⚔️ [${activeHero.name}] 攻擊 [${targetEnemy.name}] 造成 ${dmgToEnemy} 傷害`);
                }

                targetEnemy.hp -= dmgToEnemy;

                if (targetEnemy.hp <= 0) {
                    log(`☠️ 擊敗 [${targetEnemy.name}]！獲得 ${targetEnemy.gold} 金幣`);
                    
                    gameState.tempSpoils.gold += targetEnemy.gold;
                    
                    gameState.quests.forEach(q => {
                        if (q.targetMob === targetEnemy.mobId && !q.completed) {
                            q.count++;
                            if (q.count >= q.maxCount) q.completed = true;
                        }
                    });

                    // 裝備與素材機率掉落
                    if (Math.random() < 0.25 && typeof EQUIPMENT_TEMPLATES !== 'undefined') {
                        let randEquip = EQUIPMENT_TEMPLATES[Math.floor(Math.random() * EQUIPMENT_TEMPLATES.length)];
                        gameState.tempSpoils.items.push(randEquip.name);
                        
                        // 放入裝備庫
                        let invEquip = gameState.inventory.find(i => i.name === randEquip.name);
                        if (invEquip) invEquip.count++;
                        else gameState.inventory.push({ ...randEquip, type: "equipment", count: 1 });
                    }

                    // 角色經驗值 (上限 Lv.50)
                    if (activeHero.level < 50) {
                        activeHero.exp += targetEnemy.exp;
                        if (activeHero.exp >= activeHero.maxExp) {
                            activeHero.level++;
                            activeHero.exp -= activeHero.maxExp;
                            activeHero.maxExp = Math.floor(activeHero.maxExp * 1.4);
                            log(`🎉 ${activeHero.name} 升級至 Lv.${activeHero.level}！`);
                        }
                    }

                    // 職業經驗值 (上限 Lv.10)
                    if (activeHero.jobLevel < 10) {
                        activeHero.jobExp += Math.floor(targetEnemy.exp / 2);
                        if (activeHero.jobExp >= activeHero.maxJobExp) {
                            activeHero.jobLevel++;
                            activeHero.jobExp -= activeHero.maxJobExp;
                            activeHero.maxJobExp = Math.floor(activeHero.maxJobExp * 1.5);
                            checkSkillUnlocks(activeHero);
                            log(`🌟 ${activeHero.name} 職業等級提升至 Lv.${activeHero.jobLevel}！`);
                        }
                    }

                    if (frontEnemies.includes(targetEnemy)) gameState.currentEnemies.front = frontEnemies.filter(e => e !== targetEnemy);
                    else gameState.currentEnemies.back = backEnemies.filter(e => e !== targetEnemy);

                    if (gameState.currentEnemies.front.length === 0 && gameState.currentEnemies.back.length === 0) {
                        if (gameState.inBossFight) {
                            gameState.inBossFight = false;
                            gameState.waveCount = 0;
                            log(`🏆 擊殺 Boss 成功！獲得首領寶箱與金幣！`);
                            gameState.tempSpoils.gold += 300;
                            gameState.tempSpoils.items.push("首領寶箱");
                        } else {
                            gameState.waveCount++;
                            if (gameState.waveCount >= 10 && !gameState.bossAvailable) {
                                gameState.bossAvailable = true;
                                log(`🔔 已達 10 波，可隨時挑戰 Boss 或繼續掛機！`);
                            }
                        }
                    }
                } else {
                    // 敵方反擊
                    let targetHero = livingFront.length > 0 ? livingFront[Math.floor(Math.random() * livingFront.length)] : activeHero;
                    let targetSt = getHeroStats(targetHero);
                    let dmgToHero = Math.max(2, Math.floor(activeEnemy.atk - targetSt.def * 0.4));
                    targetHero.hp -= dmgToHero;
                    log(`💥 [${activeEnemy.name}] 反擊 [${targetHero.name}] 造成 ${dmgToHero} 傷害`);

                    // 角色死亡處理
                    if (targetHero.hp <= 0) {
                        targetHero.hp = 0;
                        targetHero.isDead = true;
                        log(`💀 [${targetHero.name}] 在戰鬥中陣亡了！必須返回城鎮花費金幣醫治！`);
                    }
                }
            }
        }
        renderPartyView();
        renderEnemiesView();
    }, 1200);
}

function usePotion(hero, potionId) {
    if (hero.isDead) return;
    let invItem = gameState.inventory.find(i => i.id === potionId && i.count > 0);
    if (invItem) {
        invItem.count--;
        let potData = (typeof SHOP_ITEMS !== 'undefined') ? SHOP_ITEMS.find(s => s.id === potionId) : null;
        let healAmt = potData ? potData.heal : 80;
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
        let nameList = (typeof HERO_NAMES !== 'undefined') ? HERO_NAMES[gender] : ["冒險者"];
        let randomName = nameList[Math.floor(Math.random() * nameList.length)];
        let rowChoice = gameState.heroes.filter(h => h.row === 'front').length < 3 ? 'front' : 'back';
        
        let newHero = createHero(randomName, gender, rowChoice);
        if (!gameState.heroes) gameState.heroes = [];
        gameState.heroes.push(newHero);
        log(`🍻 成功招募：${randomName} (${gender === 'male' ? '男 ♂' : '女 ♀'})！`);
        renderAll();
        saveGame();
    } else {
        alert("金幣不足 120！");
    }
}

function toggleHeroRow(heroId) {
    let h = gameState.heroes.find(x => x.id === heroId);
    if (h) {
        h.row = h.row === 'front' ? 'back' : 'front';
        log(`🔄 [${h.name}] 切換至【${h.row === 'front' ? '前衛' : '後衛'}】`);
        renderAll();
        saveGame();
        if (currentModalHeroId) openHeroModal(currentModalHeroId, true);
    }
}

function openHeroModal(heroId, isRefresh = false) {
    currentModalHeroId = heroId;
    let h = gameState.heroes.find(x => x.id === heroId);
    if (!h) return;
    let st = getHeroStats(h);
    let body = document.getElementById('modal-hero-body');
    if (!body) return;

    if (currentModalTab === 'stats') {
        let traitsHtml = (h.traits && h.traits.length > 0) ? h.traits.map(t => `<span style="background:#2a2d3d; padding:2px 6px; border-radius:4px; font-size:11px; color:var(--accent); margin-right:5px;" title="${t.desc}">${t.name}</span>`).join('') : "無";
        let jobName = (typeof JOBS !== 'undefined' && JOBS[h.job]) ? JOBS[h.job].name : '無業遊民';
        let reviveBtn = h.isDead ? `<button class="btn btn-danger" onclick="reviveHero('${h.id}')">⛑️ 醫治復活 (${h.level * 100}金幣)</button>` : '';

        body.innerHTML = `
            <h3>${h.name} (${h.gender === 'female' ? '女 ♀' : '男 ♂'}) ${h.isDead ? '<span style="color:var(--danger);">[💀 死亡]</span>' : ''}</h3>
            <p style="font-size:12px; color:#aaa;">性格: ${traitsHtml}</p>
            <p style="color:var(--accent);">職業: ${jobName} | 角色 Lv.${h.level}/50 | 職業 Lv.${h.jobLevel}/10</p>
            ${reviveBtn}

            <div style="margin: 10px 0; background:#161720; padding:8px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px;">當前位置: <strong>${h.row === 'front' ? '🛡️ 前衛' : '🏹 後衛'}</strong></span>
                <button class="btn btn-warning" style="font-size:11px;" onclick="toggleHeroRow('${h.id}')">切換${h.row === 'front' ? '至後衛' : '至前衛'}</button>
            </div>

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
        // 技能與熟練度頁籤
        body.innerHTML = `
            <h3>${h.name} - 技能與熟練度</h3>
            <div style="margin-top:10px;">
                <h4>已學會技能與熟練度</h4>
                ${h.learnedSkills.map(skId => {
                    let sk = SKILLS[skId];
                    let prof = h.skillProficiency[skId] || 0;
                    let isEquipped = h.equippedSkills.includes(skId);
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:#161720; padding:8px; border-radius:4px; margin-bottom:6px;">
                            <div>
                                <strong>${sk.name}</strong> <span style="font-size:10px; color:var(--accent);">[${sk.type}]</span>
                                <div style="font-size:11px; color:#aaa;">${sk.desc} | 熟練度: ${prof} 次</div>
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
        let genderIcon = h.gender === 'female' ? '<span style="color:#ff7675;">♀</span>' : '<span style="color:#74b9ff;">♂</span>';
        let jobName = (typeof JOBS !== 'undefined' && JOBS[h.job]) ? JOBS[h.job].name : '無業遊民';
        let deadTag = h.isDead ? '<span style="color:var(--danger); font-weight:bold;">[💀 死亡]</span>' : '';

        container.innerHTML += `
            <div class="card" style="${h.isDead ? 'border-color:var(--danger);' : ''}">
                <h4>${h.name} ${genderIcon} ${deadTag}</h4>
                <p style="font-size:12px; color:var(--accent);">${jobName} (Lv.${h.level}) | 陣型: <strong>${h.row === 'front' ? '前衛' : '後衛'}</strong></p>
                <p style="font-size:12px;">STR: ${Math.floor(st.str)} | CON: ${Math.floor(st.con)} | MND: ${Math.floor(st.mnd)}</p>
                <div style="display:flex; gap:6px; margin-top:8px;">
                    <button class="btn btn-warning" style="flex:1; font-size:11px;" onclick="toggleHeroRow('${h.id}')">切換${h.row === 'front' ? '後衛' : '前衛'}</button>
                    <button class="btn btn-primary" style="flex:1; font-size:11px;" onclick="openHeroModal('${h.id}')">管理角色</button>
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
        return item.type === currentInvFilter;
    });

    if (filteredItems.length === 0) {
        container.innerHTML = "<p style='color:#aaa;'>此分頁沒有道具或裝備。</p>";
        return;
    }

    filteredItems.forEach(item => {
        container.innerHTML += `
            <div class="card">
                <strong>${item.name}</strong> x${item.count}
                <p style="font-size:12px; color:#aaa;">${item.desc || '道具/裝備/素材'}</p>
            </div>
        `;
    });
}

function renderShop() {
    let container = document.getElementById('shop-items');
    if (!container) return;
    container.innerHTML = "";
    if (typeof SHOP_ITEMS !== 'undefined') {
        SHOP_ITEMS.forEach(s => {
            container.innerHTML += `
                <div class="card">
                    <h4>${s.name}</h4>
                    <p style="font-size:12px; color:#aaa;">${s.desc}</p>
                    <p style="color:var(--accent);">價格: ${s.cost} 金幣</p>
                    <button class="btn btn-primary" onclick="buyShopItem('${s.id}')">購買</button>
                </div>
            `;
        });
    }
}

function buyShopItem(id) {
    if (typeof SHOP_ITEMS === 'undefined') return;
    let item = SHOP_ITEMS.find(s => s.id === id);
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
    if (!container) return;
    container.innerHTML = "";
    if (!gameState.quests || gameState.quests.length === 0) return;
    gameState.quests.forEach(q => {
        container.innerHTML += `
            <div class="card" style="margin-bottom:10px;">
                <strong>${q.title}</strong> (${q.count}/${q.maxCount})
                <button class="btn ${q.completed ? 'btn-success' : 'btn-danger'}" ${!q.completed || q.claimed ? 'disabled' : ''} onclick="claimQuest('${q.id}')">
                    ${q.claimed ? '已領取' : (q.completed ? '領取獎勵' : '未完成')}
                </button>
            </div>
        `;
    });
}

function claimQuest(id) {
    let q = gameState.quests.find(x => x.id === id);
    if (q && q.completed && !q.claimed) {
        q.claimed = true;
        gameState.gold += q.rewardGold;
        log(`📜 任務獎勵：+${q.rewardGold} 金幣`);
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
