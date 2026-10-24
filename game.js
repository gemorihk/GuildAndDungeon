// 遊戲全域狀態
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
    isPaused: false,
    bossAvailable: false,
    inBossFight: false,
    currentEnemies: [],
    quests: [
        { id: "q1", title: "清掃哥布林", targetMob: "goblin", count: 0, maxCount: 10, rewardGold: 100, completed: false, claimed: false }
    ]
};

// 頁面加載初始化
window.onload = function() {
    loadGame();
    
    // 強制安全檢查：如果英雄列表為空，立刻建立初始主角
    if (!gameState.heroes || !Array.isArray(gameState.heroes) || gameState.heroes.length === 0) {
        initDefaultHeroes();
        saveGame();
    }
    
    renderAll();
    startBattleLoop();
    startAutoSave();
};

// 創立角色 (含性別與世代繁衍資料結構)
function createHero(name, gender, stats, gen = 1) {
    let hero = {
        id: "hero_" + Date.now + "_" + Math.floor(Math.random()*100000),
        name: name || "無名英雄",
        gender: gender || 'male',
        generation: gen,
        fatherId: null,
        motherId: null,
        spouseId: null,
        level: 1,
        exp: 0,
        maxExp: 100,
        job: "novice",
        jobLevels: { novice: 1 },
        unlockedSkills: [],
        equippedSkills: [],
        baseStats: stats || { str: 10, con: 10, mnd: 10, dex: 10, agi: 10, luk: 10 },
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

// 創立預設男女主人公
function initDefaultHeroes() {
    gameState.heroes = [
        createHero("亞瑟 (主人公)", "male", { str: 12, con: 12, mnd: 10, dex: 10, agi: 10, luk: 10 }),
        createHero("莉莉絲", "female", { str: 8, con: 8, mnd: 14, dex: 10, agi: 10, luk: 10 })
    ];
    console.log("已初始化預設英雄：", gameState.heroes);
}

// 計算角色完整屬性
function getHeroStats(hero) {
    let s = hero.baseStats || { str: 10, con: 10, mnd: 10, dex: 10, agi: 10, luk: 10 };
    let lv = hero.level || 1;
    let maxHp = s.con * 12 + s.str * 3 + lv * 10;
    let maxMp = s.mnd * 8 + lv * 5;
    let hpRegen = parseFloat((s.con * 0.4).toFixed(1)); 
    let atk = s.str * 2 + s.dex * 0.5;
    let matk = s.mnd * 2.2;
    let def = s.con * 1.5;
    let spd = s.agi * 1.2;
    
    return { maxHp, maxMp, hpRegen, atk, matk, def, spd, ...s };
}

// ==================== 存檔與重置機制 ====================
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
    if (saveGame()) {
        alert("存檔成功！");
    }
}

function resetSaveData() {
    if (confirm("確定要重置所有資料並重新開始嗎？這會清除舊有存檔並重置初始主角！")) {
        localStorage.removeItem('guild_and_dungeon_save');
        gameState.gold = 200;
        gameState.gems = 10;
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

function startAutoSave() {
    setInterval(() => saveGame(), 30000);
}
// =======================================================

// 頁籤切換
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    let targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) targetTab.classList.add('active');
    if (event && event.target) event.target.classList.add('active');
    
    renderAll();
}

// 渲染所有介面
function renderAll() {
    if (document.getElementById('res-gold')) document.getElementById('res-gold').innerText = gameState.gold;
    if (document.getElementById('res-gems')) document.getElementById('res-gems').innerText = gameState.gems;
    if (document.getElementById('guild-lv')) document.getElementById('guild-lv').innerText = gameState.guildLv;

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
    gameState.activeDungeonId = id;
    gameState.waveCount = 0;
    gameState.bossAvailable = false;
    gameState.inBossFight = false;
    gameState.currentEnemies = [];
    log(`[切換關卡] 前往 ${DUNGEONS.find(d=>d.id===id).name}`);
    renderAll();
}

// 討伐隊伍顯示
function renderPartyView() {
    let container = document.getElementById('player-party-list');
    if (!container) return;
    container.innerHTML = "";
    
    if (!gameState.heroes || gameState.heroes.length === 0) {
        container.innerHTML = "<p style='font-size:12px; color:#aaa;'>尚未招募冒險者</p>";
        return;
    }

    gameState.heroes.forEach(h => {
        let st = getHeroStats(h);
        let genderIcon = h.gender === 'female' ? '<span style="color:#ff7675;">♀</span>' : '<span style="color:#74b9ff;">♂</span>';
        let jobName = (typeof JOBS !== 'undefined' && JOBS[h.job]) ? JOBS[h.job].name : '無業遊民';
        
        container.innerHTML += `
            <div class="entity-card">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${h.name} ${genderIcon}</strong> 
                    <span style="font-size:12px; color:var(--accent);">${jobName} Lv.${h.level}</span>
                </div>
                <div style="font-size:12px; margin-top:2px;">
                    HP: ${Math.max(0, Math.floor(h.hp))}/${st.maxHp} (+${st.hpRegen}/s)
                </div>
                <div class="bar-container"><div class="hp-bar" style="width:${Math.min(100, Math.max(0, (h.hp/st.maxHp)*100))}%;"></div></div>
            </div>
        `;
    });
}

function renderEnemiesView() {
    let container = document.getElementById('enemy-list');
    if (!container) return;
    container.innerHTML = "";
    
    let waveCounter = document.getElementById('wave-counter');
    if (waveCounter) waveCounter.innerText = `(${gameState.waveCount}/10)`;

    if (gameState.currentEnemies.length === 0 && !gameState.bossAvailable) {
        spawnWave();
    }

    gameState.currentEnemies.forEach(e => {
        container.innerHTML += `
            <div class="entity-card" style="border-left-color: var(--danger);">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${e.name}</strong>
                    <span style="font-size:12px; color:#ff6b6b;">HP: ${Math.max(0, Math.floor(e.hp))}/${e.maxHp}</span>
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
    let mobTemplate = dung.mobs[Math.floor(Math.random() * dung.mobs.length)];
    gameState.currentEnemies = [{
        ...mobTemplate,
        maxHp: mobTemplate.hp,
        id: "mob_" + Date.now()
    }];
    
    if (!gameState.bestiary[mobTemplate.id]) {
        gameState.bestiary[mobTemplate.id] = { ...mobTemplate, kills: 0 };
    }
}

function triggerBossFight() {
    if (typeof DUNGEONS === 'undefined') return;
    let dung = DUNGEONS.find(d => d.id === gameState.activeDungeonId);
    if (!dung) return;
    gameState.inBossFight = true;
    gameState.bossAvailable = false;
    gameState.currentEnemies = [{
        ...dung.boss,
        maxHp: dung.boss.hp,
        id: "boss_" + Date.now()
    }];
    log(`🔥 [Boss戰] ${dung.boss.name} 降臨！`);
    renderAll();
}

// 自動戰鬥迴圈
function startBattleLoop() {
    setInterval(() => {
        if (gameState.isPaused) return;

        let thresholdEl = document.getElementById('auto-potion-threshold');
        let potionTypeEl = document.getElementById('auto-potion-type');
        let threshold = thresholdEl ? parseInt(thresholdEl.value) || 40 : 40;
        let potionType = potionTypeEl ? potionTypeEl.value : 'pot_small';

        if (gameState.heroes && gameState.heroes.length > 0) {
            gameState.heroes.forEach(h => {
                let st = getHeroStats(h);
                if (h.hp > 0 && h.hp < st.maxHp) {
                    h.hp = Math.min(st.maxHp, h.hp + st.hpRegen);
                }
                if (h.hp > 0 && (h.hp / st.maxHp * 100) < threshold) {
                    usePotion(h, potionType);
                }
            });
        }

        if (gameState.currentEnemies.length > 0 && gameState.heroes && gameState.heroes.length > 0) {
            let activeHero = gameState.heroes.find(h => h.hp > 0);
            let activeEnemy = gameState.currentEnemies[0];

            if (activeHero && activeEnemy) {
                let heroSt = getHeroStats(activeHero);
                let dmgToEnemy = Math.max(1, heroSt.atk - activeEnemy.def);
                activeEnemy.hp -= dmgToEnemy;
                log(`⚔️ ${activeHero.name} 對 ${activeEnemy.name} 造成 ${dmgToEnemy} 物理傷害`);

                if (activeEnemy.hp <= 0) {
                    log(`☠️ 擊敗了 ${activeEnemy.name}！獲得 ${activeEnemy.gold} 金幣, ${activeEnemy.exp} 經驗值`);
                    gameState.gold += activeEnemy.gold;
                    
                    gameState.quests.forEach(q => {
                        if (q.targetMob === activeEnemy.id && !q.completed) {
                            q.count++;
                            if (q.count >= q.maxCount) q.completed = true;
                        }
                    });

                    activeHero.exp += activeEnemy.exp;
                    if (activeHero.exp >= activeHero.maxExp) {
                        activeHero.level++;
                        activeHero.exp -= activeHero.maxExp;
                        activeHero.maxExp = Math.floor(activeHero.maxExp * 1.5);
                        activeHero.freePoints += 3;
                        log(`🎉 ${activeHero.name} 升級至 Lv.${activeHero.level}！獲得 3 點自由屬性點`);
                    }

                    gameState.currentEnemies = [];
                    if (!gameState.inBossFight) {
                        gameState.waveCount++;
                        if (gameState.waveCount >= 10) {
                            gameState.bossAvailable = true;
                            log(`🔔 已完成 10 波討伐！可以挑戰本層 Boss 了！`);
                        }
                    } else {
                        gameState.inBossFight = false;
                        gameState.waveCount = 0;
                        log(`🏆 成功通關本層 Boss！`);
                    }
                    
                    saveGame();
                } else {
                    let dmgToHero = Math.max(1, activeEnemy.atk - heroSt.def);
                    activeHero.hp -= dmgToHero;
                    log(`💥 ${activeEnemy.name} 反擊 ${activeHero.name}，造成 ${dmgToHero} 傷害`);
                    if (activeHero.hp <= 0) {
                        log(`💀 ${activeHero.name} 倒下了！`);
                    }
                }
            }
        }

        renderPartyView();
        renderEnemiesView();
    }, 1000);
}

function usePotion(hero, potionId) {
    let item = gameState.inventory.find(i => i.id === potionId && i.count > 0);
    if (item) {
        item.count--;
        let potData = (typeof SHOP_ITEMS !== 'undefined') ? SHOP_ITEMS.find(s => s.id === potionId) : null;
        let healAmt = potData ? potData.heal : 80;
        let st = getHeroStats(hero);
        hero.hp = Math.min(st.maxHp, hero.hp + healAmt);
        log(`🧪 ${hero.name} 使用了藥水，恢復 ${healAmt} HP`);
        if (item.count <= 0) {
            gameState.inventory = gameState.inventory.filter(i => i !== item);
        }
    }
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    let btn = document.getElementById('pause-btn');
    if (btn) btn.innerText = gameState.isPaused ? "▶️ 恢復戰鬥" : "⏸️ 暫停休息";
    log(gameState.isPaused ? "[系統] 戰鬥暫停，全隊進行休息..." : "[系統] 恢復討伐！");
}

function retreat() {
    gameState.isPaused = false;
    gameState.currentEnemies = [];
    gameState.waveCount = 0;
    gameState.bossAvailable = false;
    gameState.inBossFight = false;
    if (gameState.heroes) {
        gameState.heroes.forEach(h => {
            let st = getHeroStats(h);
            h.hp = st.maxHp;
        });
    }
    log(`🏃 全隊撤退回城，HP 完全恢復！`);
    saveGame();
    renderAll();
}

// 招募新冒險者
function recruitHero() {
    if (gameState.gold >= 100) {
        gameState.gold -= 100;
        
        let gender = Math.random() > 0.5 ? 'male' : 'female';
        let nameList = (typeof HERO_NAMES !== 'undefined') ? HERO_NAMES[gender] : ["冒險者"];
        let randomName = nameList[Math.floor(Math.random() * nameList.length)];
        
        let newHero = createHero(randomName, gender, { 
            str: 8 + Math.floor(Math.random()*6), 
            con: 8 + Math.floor(Math.random()*6), 
            mnd: 8 + Math.floor(Math.random()*6), 
            dex: 8 + Math.floor(Math.random()*6), 
            agi: 8 + Math.floor(Math.random()*6), 
            luk: 8 + Math.floor(Math.random()*6) 
        });
        
        if (!gameState.heroes) gameState.heroes = [];
        gameState.heroes.push(newHero);
        log(`🍻 成功招募了新冒險者：${randomName} (${gender === 'male' ? '男 ♂' : '女 ♀'})！`);
        
        renderAll();
        saveGame();
    } else {
        alert("金幣不足 100！");
    }
}

// 渲染冒險者列表
function renderHeroList() {
    let container = document.getElementById('hero-list');
    if (!container) return;
    container.innerHTML = "";
    
    if (!gameState.heroes || gameState.heroes.length === 0) {
        container.innerHTML = "<p style='color:#aaa;'>目前公會暫無冒險者，請點擊【重置存檔】。</p>";
        return;
    }

    gameState.heroes.forEach(h => {
        let st = getHeroStats(h);
        let genderIcon = h.gender === 'female' ? '<span style="color:#ff7675; font-weight:bold;">♀ 女</span>' : '<span style="color:#74b9ff; font-weight:bold;">♂ 男</span>';
        let jobName = (typeof JOBS !== 'undefined' && JOBS[h.job]) ? JOBS[h.job].name : '無業遊民';
        
        container.innerHTML += `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4>${h.name}</h4>
                    <span style="font-size:13px;">${genderIcon}</span>
                </div>
                <p style="font-size:12px; color:var(--accent);">${jobName} (Lv.${h.level}) - 第 ${h.generation || 1} 代</p>
                <p style="font-size:12px;">STR: ${st.str} | CON: ${st.con} | MND: ${st.mnd}</p>
                <p style="font-size:12px;">DEX: ${st.dex} | AGI: ${st.agi} | LUK: ${st.luk}</p>
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
    if (typeof JOBS !== 'undefined') {
        Object.keys(JOBS).forEach(jKey => {
            let j = JOBS[jKey];
            let canReq = true;
            Object.keys(j.req).forEach(rKey => {
                if (st[rKey] < j.req[rKey]) canReq = false;
            });
            jobOptionsHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; background:#161720; padding:6px; border-radius:4px;">
                    <span style="font-size:13px;">${j.name} ${j.isMastery ? '🌟[三階專精]' : ''}</span>
                    <button class="btn ${canReq ? 'btn-success' : 'btn-danger'}" ${!canReq ? 'disabled' : ''} style="font-size:11px;" onclick="changeHeroJob('${h.id}', '${j.id}')">
                        ${h.job === j.id ? '當前職業' : (canReq ? '轉職' : '未達門檻')}
                    </button>
                </div>
            `;
        });
    }

    let genderStr = h.gender === 'female' ? '女 ♀' : '男 ♂';
    let jobName = (typeof JOBS !== 'undefined' && JOBS[h.job]) ? JOBS[h.job].name : '無業遊民';
    
    body.innerHTML = `
        <h3>${h.name} (${genderStr}) 詳情面板</h3>
        <p style="color:var(--accent);">當前職業: ${jobName} (可用屬性點: ${h.freePoints})</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:13px;">
            <div>力量 (STR): ${h.baseStats.str} <button onclick="addStat('${h.id}', 'str')">+</button></div>
            <div>體質 (CON): ${h.baseStats.con} <button onclick="addStat('${h.id}', 'con')">+</button></div>
            <div>精神 (MND): ${h.baseStats.mnd} <button onclick="addStat('${h.id}', 'mnd')">+</button></div>
            <div>靈巧 (DEX): ${h.baseStats.dex} <button onclick="addStat('${h.id}', 'dex')">+</button></div>
            <div>敏捷 (AGI): ${h.baseStats.agi} <button onclick="addStat('${h.id}', 'agi')">+</button></div>
            <div>幸運 (LUK): ${h.baseStats.luk} <button onclick="addStat('${h.id}', 'luk')">+</button></div>
        </div>
        <hr style="border-color:var(--panel-border); margin:15px 0;">
        <h4>轉職與門檻清單</h4>
        ${jobOptionsHtml}
    `;
    let modal = document.getElementById('hero-modal');
    if (modal) modal.style.display = 'flex';
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
    if (h && typeof JOBS !== 'undefined') {
        h.job = jobId;
        log(`✨ ${h.name} 成功轉職為 ${JOBS[jobId].name}！`);
        openHeroModal(heroId);
        renderAll();
        saveGame();
    }
}

function closeHeroModal() {
    let modal = document.getElementById('hero-modal');
    if (modal) modal.style.display = 'none';
}

function renderInventory() {
    let container = document.getElementById('inventory-grid');
    if (!container) return;
    container.innerHTML = "";
    gameState.inventory.forEach(item => {
        container.innerHTML += `
            <div class="card">
                <strong>${item.name}</strong> x${item.count}
                <p style="font-size:12px; color:#aaa;">${item.desc || '道具/素材'}</p>
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
                <div style="display:flex; justify-content:space-between;">
                    <strong>${q.title}</strong>
                    <span style="font-size:12px;">進度: ${q.count}/${q.maxCount}</span>
                </div>
                <p style="font-size:12px; color:#aaa;">獎勵: ${q.rewardGold} 金幣</p>
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
        log(`📜 完成任務 [${q.title}]，獲得 ${q.rewardGold} 金幣！`);
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
                <p style="font-size:12px;">基礎 HP: ${b.hp} | 攻擊: ${b.atk}</p>
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
