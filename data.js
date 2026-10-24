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

// 初始化遊戲
window.onload = function() {
    loadGame(); // 嘗試讀取本地存檔
    if (gameState.heroes.length === 0) {
        initDefaultHeroes();
    }
    renderAll();
    startBattleLoop();
    startAutoSave(); // 啟動自動存檔
};

// 創立初始冒險者 (從0階無業遊民開始)
function initDefaultHeroes() {
    gameState.heroes.push(createHero("亞瑟", { str: 12, con: 12, mnd: 8, dex: 10, agi: 10, luk: 8 }));
    gameState.heroes.push(createHero("莉莉絲", { str: 6, con: 8, mnd: 14, dex: 10, agi: 10, luk: 10 }));
}

function createHero(name, stats) {
    return {
        id: "hero_" + Date.now() + "_" + Math.floor(Math.random()*1000),
        name: name,
        level: 1,
        exp: 0,
        maxExp: 100,
        job: "novice",
        jobLevels: { novice: 1 },
        unlockedSkills: [],
        equippedSkills: [],
        baseStats: stats,
        freePoints: 5,
        hp: 100,
        mp: 30,
        equip: { weapon: null, offhand: null, helmet: null, body: null, shoes: null, necklace: null, ring: null }
    };
}

// 屬性計算與衍生數值 (包含體質計算 HP/s)
function getHeroStats(hero) {
    let s = { ...hero.baseStats };
    let maxHp = s.con * 12 + s.str * 3 + hero.level * 10;
    let maxMp = s.mnd * 8 + hero.level * 5;
    let hpRegen = parseFloat((s.con * 0.4).toFixed(1)); 
    let atk = s.str * 2 + s.dex * 0.5;
    let matk = s.mnd * 2.2;
    let def = s.con * 1.5;
    let spd = s.agi * 1.2;
    
    return { maxHp, maxMp, hpRegen, atk, matk, def, spd, ...s };
}

// ==================== 本地存檔與讀檔系統 (LocalStorage) ====================
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
        log("💾 遊戲進度已成功手動儲存！");
        alert("遊戲已成功手動存檔！");
    } else {
        alert("存檔失敗，請檢查瀏覽器儲存空間。");
    }
}

function loadGame() {
    try {
        let savedData = localStorage.getItem('guild_and_dungeon_save');
        if (savedData) {
            let parsed = JSON.parse(savedData);
            // 合併狀態，確保新增欄位不會 undefined
            gameState = { ...gameState, ...parsed };
            log("📂 已成功載入上次的遊戲進度！");
        }
    } catch (e) {
        console.error("讀取存檔失敗", e);
    }
}

function startAutoSave() {
    // 每 30 秒自動存檔一次
    setInterval(() => {
        saveGame();
    }, 30000);
}
// =========================================================================

// 頁籤切換
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    event.target.classList.add('active');
    renderAll();
}

// 主渲染函式
function renderAll() {
    document.getElementById('res-gold').innerText = gameState.gold;
    document.getElementById('res-gems').innerText = gameState.gems;
    document.getElementById('guild-lv').innerText = gameState.guildLv;

    renderDungeonSelect();
    renderPartyView();
    renderEnemiesView();
    renderHeroList();
    renderInventory();
    renderShop();
    renderQuests();
    renderBestiary();
}

// 討伐下拉可選項
function renderDungeonSelect() {
    let select = document.getElementById('dungeon-select');
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

// 戰鬥視圖渲染
function renderPartyView() {
    let container = document.getElementById('player-party-list');
    container.innerHTML = "";
    gameState.heroes.forEach(h => {
        let st = getHeroStats(h);
        container.innerHTML += `
            <div class="entity-card">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${h.name}</strong> 
                    <span style="font-size:12px; color:var(--accent);">${JOBS[h.job].name} Lv.${h.level}</span>
                </div>
                <div style="font-size:12px; margin-top:2px;">
                    HP: ${Math.max(0, Math.floor(h.hp))}/${st.maxHp} (+${st.hpRegen}/s)
                </div>
                <div class="bar-container"><div class="hp-bar" style="width:${(h.hp/st.maxHp)*100}%;"></div></div>
            </div>
        `;
    });
}

function renderEnemiesView() {
    let container = document.getElementById('enemy-list');
    container.innerHTML = "";
    document.getElementById('wave-counter').innerText = `(${gameState.waveCount}/10)`;

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
                <div class="bar-container"><div class="hp-bar" style="width:${(e.hp/e.maxHp)*100}%; background:var(--danger);"></div></div>
            </div>
        `;
    });

    let bossBtn = document.getElementById('boss-btn');
    if (gameState.bossAvailable && !gameState.inBossFight) {
        bossBtn.style.display = "block";
    } else {
        bossBtn.style.display = "none";
    }
}

// 產生怪物波次
function spawnWave() {
    let dung = DUNGEONS.find(d => d.id === gameState.activeDungeonId);
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

// 觸發 Boss 戰
function triggerBossFight() {
    let dung = DUNGEONS.find(d => d.id === gameState.activeDungeonId);
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

// 自動戰鬥與自然恢復主迴圈 (每秒執行)
function startBattleLoop() {
    setInterval(() => {
        if (gameState.isPaused) return;

        let threshold = parseInt(document.getElementById('auto-potion-threshold').value) || 40;
        let potionType = document.getElementById('auto-potion-type').value;

        gameState.heroes.forEach(h => {
            let st = getHeroStats(h);
            if (h.hp > 0 && h.hp < st.maxHp) {
                h.hp = Math.min(st.maxHp, h.hp + st.hpRegen);
            }
            if (h.hp > 0 && (h.hp / st.maxHp * 100) < threshold) {
                usePotion(h, potionType);
            }
        });

        if (gameState.currentEnemies.length > 0) {
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
                    
                    // 每次擊殺後自動存檔一次
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

// 喝藥機制
function usePotion(hero, potionId) {
    let item = gameState.inventory.find(i => i.id === potionId && i.count > 0);
    if (item) {
        item.count--;
        let potData = SHOP_ITEMS.find(s => s.id === potionId);
        let st = getHeroStats(hero);
        hero.hp = Math.min(st.maxHp, hero.hp + potData.heal);
        log(`🧪 ${hero.name} 使用了 ${potData.name}，恢復 ${potData.heal} HP`);
        if (item.count <= 0) {
            gameState.inventory = gameState.inventory.filter(i => i !== item);
        }
    }
}

// 暫停與撤退
function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    document.getElementById('pause-btn').innerText = gameState.isPaused ? "▶️ 恢復戰鬥" : "⏸️ 暫停休息";
    log(gameState.isPaused ? "[系統] 戰鬥暫停，全隊進行休息..." : "[系統] 恢復討伐！");
}

function retreat() {
    gameState.isPaused = false;
    gameState.currentEnemies = [];
    gameState.waveCount = 0;
    gameState.bossAvailable = false;
    gameState.inBossFight = false;
    gameState.heroes.forEach(h => {
        let st = getHeroStats(h);
        h.hp = st.maxHp;
    });
    log(`🏃 全隊撤退回城，HP 完全恢復！`);
    saveGame();
    renderAll();
}

// 渲染冒險者與轉職詳情 Modal
function renderHeroList() {
    let container = document.getElementById('hero-list');
    container.innerHTML = "";
    gameState.heroes.forEach(h => {
        let st = getHeroStats(h);
        container.innerHTML += `
            <div class="card">
                <h4>${h.name}</h4>
                <p style="font-size:12px; color:var(--accent);">${JOBS[h.job].name} (Lv.${h.level})</p>
                <p style="font-size:12px;">STR: ${st.str} | CON: ${st.con} | MND: ${st.mnd}</p>
                <p style="font-size:12px;">DEX: ${st.dex} | AGI: ${st.agi} | LUK: ${st.luk}</p>
                <button class="btn btn-primary" style="width:100%; margin-top:8px;" onclick="openHeroModal('${h.id}')">查看詳情 / 轉職</button>
            </div>
        `;
    });
}

function openHeroModal(heroId) {
    let h = gameState.heroes.find(x => x.id === heroId);
    let st = getHeroStats(h);
    let body = document.getElementById('modal-hero-body');
    
    let jobOptionsHtml = "";
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

    body.innerHTML = `
        <h3>${h.name} 詳情面板</h3>
        <p style="color:var(--accent);">當前職業: ${JOBS[h.job].name} (可用點數: ${h.freePoints})</p>
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
        log(`✨ ${h.name} 成功轉職為 ${JOBS[jobId].name}！`);
        openHeroModal(heroId);
        renderAll();
        saveGame();
    }
}

function closeHeroModal() {
    document.getElementById('hero-modal').style.display = 'none';
}

function recruitHero() {
    if (gameState.gold >= 100) {
        gameState.gold -= 100;
        let names = ["洛克", "卡爾", "艾莉亞", "席娜", "格雷"];
        let randomName = names[Math.floor(Math.random()*names.length)];
        gameState.heroes.push(createHero(randomName, { str: 10, con: 10, mnd: 10, dex: 10, agi: 10, luk: 10 }));
        log(`🍻 成功招募了新冒險者 ${randomName}！`);
        renderAll();
        saveGame();
    } else {
        alert("金幣不足！");
    }
}

// 渲染背包、商店、任務與圖鑑
function renderInventory() {
    let container = document.getElementById('inventory-grid');
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
    event.target.classList.add('active');
    renderInventory();
}

function renderShop() {
    let container = document.getElementById('shop-items');
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

// 系統日誌
function log(msg) {
    let logBox = document.getElementById('battle-log');
    if (logBox) {
        let div = document.createElement('div');
        div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logBox.appendChild(div);
        logBox.scrollTop = logBox.scrollHeight;
    }
}
