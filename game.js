let gameState = {
    gold: 200,
    gems: 10,
    guildLv: 1,
    heroes: [],
    inventory: [
        { id: "pot_small", name: "小型回復藥水", type: "potion", heal: 80, count: 5 }
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
        { id: "q1", title: "清掃哥布林", targetMob: "goblin", count: 0, maxCount: 10, rewardGold: 100, completed: false, claimed: false }
    ]
};

window.onload = function() {
    loadGame();
    if (!gameState.heroes || gameState.heroes.length === 0) {
        initDefaultHeroes();
        saveGame();
    }
    renderAll();
    startBattleLoop();
};

function createHero(name, gender, stats, row = 'front', gen = 1) {
    let hero = {
        id: "hero_" + Date.now() + "_" + Math.floor(Math.random()*100000),
        name: name,
        gender: gender,
        row: row, // 'front' 或 'back'
        generation: gen,
        level: 1,
        exp: 0,
        maxExp: 100,
        job: "novice",
        jobLevels: { novice: 1 },
        baseStats: stats,
        freePoints: 5,
        hp: 100,
        mp: 30,
        equip: { weapon: null, offhand: null, helmet: null, body: null, shoes: null, necklace: null, ring: null }
    };
    let st = getHeroStats(hero);
    hero.hp = st.maxHp;
    hero.mp = st.maxMp;
    return hero;
}

function initDefaultHeroes() {
    gameState.heroes = [
        createHero("亞瑟 (主人公)", "male", { str: 14, con: 14, mnd: 10, dex: 10, agi: 10, luk: 10 }, 'front'),
        createHero("莉莉絲", "female", { str: 8, con: 9, mnd: 16, dex: 12, agi: 12, luk: 10 }, 'back')
    ];
}

function getHeroStats(hero) {
    let s = hero.baseStats;
    let lv = hero.level;
    let maxHp = s.con * 14 + s.str * 4 + lv * 15;
    let maxMp = s.mnd * 8 + lv * 5;
    let hpRegen = parseFloat((s.con * 0.5).toFixed(1)); 
    let atk = s.str * 2.2 + s.dex * 0.6;
    let matk = s.mnd * 2.5;
    let def = s.con * 1.8;
    let spd = s.agi * 1.2;
    return { maxHp, maxMp, hpRegen, atk, matk, def, spd, ...s };
}

// 存檔與讀檔
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
        gameState.gold = 200;
        gameState.isExploring = false;
        initDefaultHeroes();
        saveGame();
        renderAll();
        alert("存檔已重置！");
    }
}

function loadGame() {
    try {
        let savedData = localStorage.getItem('guild_and_dungeon_save');
        if (savedData) {
            let parsed = JSON.parse(savedData);
            gameState = { ...gameState, ...parsed };
        }
    } catch (e) {
        console.error("讀取存檔失敗", e);
    }
}

// 頁籤切換
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    let target = document.getElementById('tab-' + tabId);
    if (target) target.classList.add('active');
    if (event && event.target) event.target.classList.add('active');
    renderAll();
}

function renderAll() {
    if (document.getElementById('res-gold')) document.getElementById('res-gold').innerText = gameState.gold;
    if (document.getElementById('res-gems')) document.getElementById('res-gems').innerText = gameState.gems;
    if (document.getElementById('guild-lv')) document.getElementById('guild-lv').innerText = gameState.guildLv;
    if (document.getElementById('temp-gold')) document.getElementById('temp-gold').innerText = gameState.tempSpoils.gold;
    
    let itemSummary = gameState.tempSpoils.items.length > 0 ? gameState.tempSpoils.items.join(', ') : "無";
    if (document.getElementById('temp-loot-items')) document.getElementById('temp-loot-items').innerText = itemSummary;

    renderDungeonSelect();
    renderPartyView();
    renderEnemiesView();
    renderHeroList();
    renderInventory();
    renderShop();
    renderQuests();
    renderBestiary();
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
    log(`[切換關卡] 準備前往 ${DUNGEONS.find(d=>d.id===id).name}`);
    renderAll();
}

// 開始/停止探索開關
function toggleExplore() {
    gameState.isExploring = !gameState.isExploring;
    let btn = document.getElementById('explore-btn');
    let pauseBtn = document.getElementById('pause-btn');
    if (gameState.isExploring) {
        btn.innerText = "🛑 停止探索";
        btn.className = "btn btn-danger";
        pauseBtn.style.display = "inline-block";
        log("🚀 隊伍正式出發，開始深入地下城探索！");
    } else {
        btn.innerText = "🚀 開始探索";
        btn.className = "btn btn-success";
        pauseBtn.style.display = "none";
        log("⏸️ 探索已暫停。");
    }
    renderAll();
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    let btn = document.getElementById('pause-btn');
    btn.innerText = gameState.isPaused ? "▶️ 繼續" : "⏸️ 暫停";
    log(gameState.isPaused ? "[系統] 戰鬥暫停中..." : "[系統] 恢復戰鬥！");
}

// 🏠 結算回城與戰利品入庫
function retreatAndSettle() {
    gameState.isExploring = false;
    gameState.isPaused = false;
    
    // 正式結算暫存收穫
    let addedGold = gameState.tempSpoils.gold;
    gameState.gold += addedGold;
    
    // 將暫存道具加入背包
    gameState.tempSpoils.items.forEach(itemName => {
        let found = gameState.inventory.find(i => i.name === itemName);
        if (found) {
            found.count++;
        } else {
            gameState.inventory.push({ id: "loot_" + Date.now(), name: itemName, type: "material", count: 1, desc: "地下城探險獲得的素材" });
        }
    });

    log(`🏠 隊伍成功返回城鎮！本次探險結算：獲得 ${addedGold} 金幣，戰利品已入庫。`);
    alert(`結算回城成功！獲得金幣: ${addedGold}`);

    // 清空暫存
    gameState.tempSpoils = { gold: 0, items: [], exp: 0 };
    gameState.currentEnemies = { front: [], back: [] };
    gameState.waveCount = 0;
    gameState.bossAvailable = false;
    gameState.inBossFight = false;

    // 恢復全隊狀態
    gameState.heroes.forEach(h => {
        let st = getHeroStats(h);
        h.hp = st.maxHp;
    });

    let exploreBtn = document.getElementById('explore-btn');
    if (exploreBtn) { exploreBtn.innerText = "🚀 開始探索"; exploreBtn.className = "btn btn-success"; }
    let pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.style.display = "none";

    saveGame();
    renderAll();
}

// 渲染前後排隊伍
function renderPartyView() {
    let frontContainer = document.getElementById('party-front-list');
    let backContainer = document.getElementById('party-back-list');
    if (!frontContainer || !backContainer) return;
    
    frontContainer.innerHTML = "";
    backContainer.innerHTML = "";
    
    if (!gameState.heroes || gameState.heroes.length === 0) {
        frontContainer.innerHTML = "<p style='font-size:12px; color:#aaa;'>無成員</p>";
        return;
    }

    gameState.heroes.forEach(h => {
        let st = getHeroStats(h);
        let genderIcon = h.gender === 'female' ? '<span style="color:#ff7675;">♀</span>' : '<span style="color:#74b9ff;">♂</span>';
        let jobName = (typeof JOBS !== 'undefined' && JOBS[h.job]) ? JOBS[h.job].name : '無業遊民';
        let html = `
            <div class="entity-card">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${h.name} ${genderIcon}</strong> 
                    <span style="font-size:11px; color:var(--accent);">${jobName} Lv.${h.level}</span>
                </div>
                <div style="font-size:11px; margin-top:2px;">HP: ${Math.max(0, Math.floor(h.hp))}/${st.maxHp}</div>
                <div class="bar-container"><div class="hp-bar" style="width:${Math.min(100, Math.max(0, (h.hp/st.maxHp)*100))}%;"></div></div>
            </div>
        `;
        if (h.row === 'back') {
            backContainer.innerHTML += html;
        } else {
            frontContainer.innerHTML += html;
        }
    });
}

function renderEnemiesView() {
    let frontContainer = document.getElementById('enemy-front-list');
    let backContainer = document.getElementById('enemy-back-list');
    if (!frontContainer || !backContainer) return;

    frontContainer.innerHTML = "";
    backContainer.innerHTML = "";
    
    let waveCounter = document.getElementById('wave-counter');
    if (waveCounter) waveCounter.innerText = `(波次: ${gameState.waveCount}/10)`;

    // 若探索中且沒有敵人，生成波次
    if (gameState.isExploring && gameState.currentEnemies.front.length === 0 && gameState.currentEnemies.back.length === 0 && !gameState.bossAvailable) {
        spawnWave();
    }

    if (gameState.currentEnemies.front.length === 0 && gameState.currentEnemies.back.length === 0) {
        frontContainer.innerHTML = "<div style='font-size:12px; color:#aaa;'>等待探索索敵中...</div>";
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
    let dung = DUNGEONS.find(d => d.id === gameState.activeDungeonId);
    if (!dung) return;
    
    let frontMob = dung.mobs[Math.floor(Math.random() * dung.mobs.length)];
    let backMob = dung.mobs[Math.floor(Math.random() * dung.mobs.length)];

    gameState.currentEnemies = {
        front: [{ ...frontMob, maxHp: frontMob.hp, id: "mob_f_" + Date.now() }],
        back: [{ ...backMob, maxHp: backMob.hp, id: "mob_b_" + Date.now() }]
    };
    
    if (!gameState.bestiary[frontMob.id]) gameState.bestiary[frontMob.id] = { ...frontMob, kills: 0 };
    if (!gameState.bestiary[backMob.id]) gameState.bestiary[backMob.id] = { ...backMob, kills: 0 };
}

function triggerBossFight() {
    let dung = DUNGEONS.find(d => d.id === gameState.activeDungeonId);
    if (!dung) return;
    gameState.inBossFight = true;
    gameState.bossAvailable = false;
    gameState.currentEnemies = {
        front: [{ ...dung.boss, maxHp: dung.boss.hp, id: "boss_" + Date.now() }],
        back: []
    };
    log(`🔥 [Boss戰] 終極首領 ${dung.boss.name} 降臨前排！`);
    renderAll();
}

// 核心戰鬥迴圈（支援前後排索敵、藥水精確消耗、掛機升級、來有往交鋒）
function startBattleLoop() {
    setInterval(() => {
        if (!gameState.isExploring || gameState.isPaused) return;

        let thresholdEl = document.getElementById('auto-potion-threshold');
        let potionTypeEl = document.getElementById('auto-potion-type');
        let threshold = thresholdEl ? parseInt(thresholdEl.value) || 40 : 40;
        let potionType = potionTypeEl ? potionTypeEl.value : 'pot_small';

        // 1. 自動喝藥與自然恢復
        gameState.heroes.forEach(h => {
            let st = getHeroStats(h);
            if (h.hp > 0 && h.hp < st.maxHp) {
                h.hp = Math.min(st.maxHp, h.hp + st.hpRegen);
            }
            if (h.hp > 0 && (h.hp / st.maxHp * 100) < threshold) {
                usePotion(h, potionType);
            }
        });

        // 2. 戰鬥交鋒
        let frontEnemies = gameState.currentEnemies.front;
        let backEnemies = gameState.currentEnemies.back;

        if (frontEnemies.length > 0 || backEnemies.length > 0) {
            // 索敵規則：優先攻擊前排友軍，前排陣亡才攻擊後衛
            let livingFrontHeroes = gameState.heroes.filter(h => h.row === 'front' && h.hp > 0);
            let livingBackHeroes = gameState.heroes.filter(h => h.row === 'back' && h.hp > 0);
            let activeHero = livingFrontHeroes.length > 0 ? livingFrontHeroes[Math.floor(Math.random() * livingFrontHeroes.length)] : (livingBackHeroes.length > 0 ? livingBackHeroes[0] : null);

            // 敵方索敵規則：近戰打前排，遠程有機會打後排
            let activeEnemy = frontEnemies.length > 0 ? frontEnemies[0] : backEnemies[0];

            if (activeHero && activeEnemy) {
                let heroSt = getHeroStats(activeHero);
                
                // --- 我方攻擊敵人 (英雄優先攻擊前排敵人，前排清空才能打後排)
                let targetEnemy = frontEnemies.length > 0 ? frontEnemies[0] : backEnemies[0];
                let dmgToEnemy = Math.max(2, Math.floor(heroSt.atk - targetEnemy.def * 0.5));
                targetEnemy.hp -= dmgToEnemy;
                log(`⚔️ [${activeHero.name}] 對 [${targetEnemy.name}] 造成 ${dmgToEnemy} 點傷害`);

                // 檢查敵人是否死亡
                if (targetEnemy.hp <= 0) {
                    log(`☠️ 擊敗了 [${targetEnemy.name}]！獲得 ${targetEnemy.gold} 金幣與戰利品`);
                    
                    // 放入暫存收穫
                    gameState.tempSpoils.gold += targetEnemy.gold;
                    if (Math.random() < 0.4) {
                        gameState.tempSpoils.items.push("魔獸素材");
                    }

                    // 任務計數
                    gameState.quests.forEach(q => {
                        if (q.targetMob === targetEnemy.id && !q.completed) {
                            q.count++;
                            if (q.count >= q.maxCount) q.completed = true;
                        }
                    });

                    // 經驗分配
                    activeHero.exp += targetEnemy.exp;
                    if (activeHero.exp >= activeHero.maxExp) {
                        activeHero.level++;
                        activeHero.exp -= activeHero.maxExp;
                        activeHero.maxExp = Math.floor(activeHero.maxExp * 1.4);
                        activeHero.freePoints += 3;
                        log(`🎉 ${activeHero.name} 升級至 Lv.${activeHero.level}！`);
                    }

                    // 從陣型中移除死亡敵人
                    if (frontEnemies.includes(targetEnemy)) {
                        gameState.currentEnemies.front = frontEnemies.filter(e => e !== targetEnemy);
                    } else {
                        gameState.currentEnemies.back = backEnemies.filter(e => e !== targetEnemy);
                    }

                    // 如果所有敵人清空，進入下一波（滿10波後可無限掛機打小怪或打王）
                    if (gameState.currentEnemies.front.length === 0 && gameState.currentEnemies.back.length === 0) {
                        if (gameState.inBossFight) {
                            gameState.inBossFight = false;
                            gameState.waveCount = 0;
                            log(`🏆 成功擊殺本層 Boss！獲得大量稀有獎勵！`);
                            gameState.tempSpoils.gold += 300;
                            gameState.tempSpoils.items.push("稀有龍鱗");
                        } else {
                            gameState.waveCount++;
                            log(`✨ 完成第 ${gameState.waveCount} 波討伐！`);
                            if (gameState.waveCount >= 10 && !gameState.bossAvailable) {
                                gameState.bossAvailable = true;
                                log(`🔔 已達 10 波！您可以點擊「挑戰 Boss」或繼續掛機刷怪升級！`);
                            }
                        }
                    }
                } else {
                    // --- 敵方反擊 (優先攻擊我方前排)
                    let targetHero = livingFrontHeroes.length > 0 ? livingFrontHeroes[Math.floor(Math.random() * livingFrontHeroes.length)] : activeHero;
                    let targetSt = getHeroStats(targetHero);
                    let dmgToHero = Math.max(2, Math.floor(activeEnemy.atk - targetSt.def * 0.4));
                    targetHero.hp -= dmgToHero;
                    log(`💥 [${activeEnemy.name}] 反擊 [${targetHero.name}]，造成 ${dmgToHero} 傷害`);

                    if (targetHero.hp <= 0) {
                        log(`💀 [${targetHero.name}] 支撐不住倒下了！`);
                    }
                }
            }
        }

        renderPartyView();
        renderEnemiesView();
        renderAll();
    }, 1200);
}

// 精確扣除藥水與計數
function usePotion(hero, potionId) {
    let invItem = gameState.inventory.find(i => i.id === potionId && i.count > 0);
    if (invItem) {
        invItem.count--;
        let potData = SHOP_ITEMS.find(s => s.id === potionId);
        let healAmt = potData ? potData.heal : 80;
        let st = getHeroStats(hero);
        hero.hp = Math.min(st.maxHp, hero.hp + healAmt);
        log(`🧪 ${hero.name} 自動使用了 ${potData.name}，恢復 ${healAmt} HP (剩餘: ${invItem.count})`);
        
        if (invItem.count <= 0) {
            gameState.inventory = gameState.inventory.filter(i => i !== invItem);
        }
        renderInventory();
    }
}

// 招募新冒險者 (支援分配前衛/後衛)
function recruitHero() {
    if (gameState.gold >= 100) {
        gameState.gold -= 100;
        let gender = Math.random() > 0.5 ? 'male' : 'female';
        let nameList = HERO_NAMES[gender];
        let randomName = nameList[Math.floor(Math.random() * nameList.length)];
        let rowChoice = gameState.heroes.filter(h => h.row === 'front').length < 3 ? 'front' : 'back';
        
        let newHero = createHero(randomName, gender, { 
            str: 10 + Math.floor(Math.random()*6), 
            con: 10 + Math.floor(Math.random()*6), 
            mnd: 10 + Math.floor(Math.random()*6), 
            dex: 10 + Math.floor(Math.random()*6), 
            agi: 10 + Math.floor(Math.random()*6), 
            luk: 10 + Math.floor(Math.random()*6) 
        }, rowChoice);
        
        gameState.heroes.push(newHero);
        log(`🍻 成功招募新冒險者：${randomName} (${gender === 'male' ? '男 ♂' : '女 ♀'} - ${rowChoice === 'front' ? '前衛' : '後衛'})！`);
        renderAll();
        saveGame();
    } else {
        alert("金幣不足 100！");
    }
}

// 渲染英雄、背包、商店與日誌
function renderHeroList() {
    let container = document.getElementById('hero-list');
    if (!container) return;
    container.innerHTML = "";
    gameState.heroes.forEach(h => {
        let st = getHeroStats(h);
        let genderIcon = h.gender === 'female' ? '<span style="color:#ff7675;">♀</span>' : '<span style="color:#74b9ff;">♂</span>';
        container.innerHTML += `
            <div class="card">
                <h4>${h.name} ${genderIcon}</h4>
                <p style="font-size:12px; color:var(--accent);">職階: ${JOBS[h.job].name} | 陣型: ${h.row === 'front' ? '前衛' : '後衛'}</p>
                <p style="font-size:12px;">STR: ${st.str} | CON: ${st.con} | MND: ${st.mnd}</p>
                <button class="btn btn-primary" style="width:100%; margin-top:8px;" onclick="openHeroModal('${h.id}')">查看詳情 / 轉職</button>
            </div>
        `;
    });
}

function openHeroModal(heroId) {
    let h = gameState.heroes.find(x => x.id === heroId);
    if (!h) return;
    let st = getHeroStats(h);
    let body = document.getElementById('modal-hero-body');
    if (!body) return;
    
    let jobOptionsHtml = "";
    Object.keys(JOBS).forEach(jKey => {
        let j = JOBS[jKey];
        let canReq = true;
        Object.keys(j.req).forEach(rKey => {
            if (st[rKey] < j.req[rKey]) canReq = false;
        });
        jobOptionsHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; background:#161720; padding:6px; border-radius:4px;">
                <span style="font-size:13px;">${j.name}</span>
                <button class="btn ${canReq ? 'btn-success' : 'btn-danger'}" ${!canReq ? 'disabled' : ''} style="font-size:11px;" onclick="changeHeroJob('${h.id}', '${j.id}')">
                    ${h.job === j.id ? '當前' : (canReq ? '轉職' : '未達門檻')}
                </button>
            </div>
        `;
    });

    body.innerHTML = `
        <h3>${h.name} 詳情面板</h3>
        <p style="color:var(--accent);">可用屬性點: ${h.freePoints}</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:13px;">
            <div>力量: ${h.baseStats.str} <button onclick="addStat('${h.id}', 'str')">+</button></div>
            <div>體質: ${h.baseStats.con} <button onclick="addStat('${h.id}', 'con')">+</button></div>
            <div>精神: ${h.baseStats.mnd} <button onclick="addStat('${h.id}', 'mnd')">+</button></div>
            <div>靈巧: ${h.baseStats.dex} <button onclick="addStat('${h.id}', 'dex')">+</button></div>
            <div>敏捷: ${h.baseStats.agi} <button onclick="addStat('${h.id}', 'agi')">+</button></div>
            <div>幸運: ${h.baseStats.luk} <button onclick="addStat('${h.id}', 'luk')">+</button></div>
        </div>
        <hr style="border-color:var(--panel-border); margin:15px 0;">
        <h4>轉職樹</h4>
        ${jobOptionsHtml}
    `;
    document.getElementById('hero-modal').style.display = 'flex';
}

function addStat(heroId, statKey) {
    let h = gameState.heroes.find(x => x.id === heroId);
    if (h && h.freePoints > 0) {
        h.freePoints--;
        h.baseStats[statKey]++;
        openHeroModal(heroId);
        renderAll();
        saveGame();
    }
}

function changeHeroJob(heroId, jobId) {
    let h = gameState.heroes.find(x => x.id === heroId);
    if (h) {
        h.job = jobId;
        log(`✨ ${h.name} 轉職為 ${JOBS[jobId].name}！`);
        openHeroModal(heroId);
        renderAll();
        saveGame();
    }
}

function closeHeroModal() {
    document.getElementById('hero-modal').style.display = 'none';
}

function renderInventory() {
    let container = document.getElementById('inventory-grid');
    if (!container) return;
    container.innerHTML = "";
    gameState.inventory.forEach(item => {
        container.innerHTML += `
            <div class="card">
                <strong>${item.name}</strong> x${item.count}
                <p style="font-size:12px; color:#aaa;">${item.desc || '道具'}</p>
            </div>
        `;
    });
}

function filterInv(type) {
    document.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    renderInventory();
}

function renderShop() {
    let container = document.getElementById('shop-items');
    if (!container) return;
    container.innerHTML = "";
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

function buyShopItem(id) {
    let item = SHOP_ITEMS.find(s => s.id === id);
    if (gameState.gold >= item.cost) {
        gameState.gold -= item.cost;
        let invItem = gameState.inventory.find(i => i.id === id);
        if (invItem) {
            invItem.count++;
        } else {
            gameState.inventory.push({ ...item, count: 1 });
        }
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
    gameState.quests.forEach(q => {
        container.innerHTML += `
            <div class="card" style="margin-bottom:10px;">
                <strong>${q.title}</strong> (${q.count}/${q.maxCount})
                <button class="btn ${q.completed ? 'btn-success' : 'btn-danger'}" ${!q.completed || q.claimed ? 'disabled' : ''} onclick="claimQuest('${q.id}')">
                    ${q.claimed ? '已領取' : (q.completed ? '領取' : '未完成')}
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
        log(`📜 任務獎勵已領取：+${q.rewardGold} 金幣`);
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
