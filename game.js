let gameState = {
    gold: 500,
    heroes: [],
    inventory: [
        { id: "iron_sword", name: "鐵劍", type: "equipment", slot: "weapon", range: 1, atk: 15, count: 1, desc: "近戰長劍" },
        { id: "wooden_bow", name: "獵弓", type: "equipment", slot: "weapon", range: 3, atk: 12, count: 1, desc: "遠程木弓" }
    ],
    activeDungeonId: "goblin_cave",
    isExploring: false,
    currentEnemies: [], // 包含 gridPos (0-8)
    tempSpoils: { gold: 0, items: [] }
};

window.onload = function() {
    loadGame();
    if (gameState.heroes.length === 0) {
        initDefaultHeroes();
        saveGame();
    }
    renderAll();
    startBattleLoop();
};

function createHero(name, gender) {
    return {
        id: "hero_" + Date.now() + "_" + Math.floor(Math.random()*1000),
        name: name,
        gender: gender,
        level: 1, exp: 0, maxExp: 100,
        job: "novice",
        gridPos: Math.floor(Math.random() * 9), // 0-8 的 3x3 九宮格位置
        hp: 120, maxHp: 120,
        atk: 20, def: 10, spd: 15,
        equippedItems: { weapon: { name: "鐵劍", range: 1, atk: 15 } },
        skillCooldowns: {}, // 以行動次數計算 CD
        ct: 0
    };
}

function initDefaultHeroes() {
    gameState.heroes = [
        createHero("亞瑟", "male"),
        createHero("莉莉絲", "female")
    ];
    gameState.heroes[0].gridPos = 3; // 中列前排
    gameState.heroes[1].gridPos = 6; // 左側後排
}

function loadGame() {
    let saved = localStorage.getItem('tactical_game_save');
    if (saved) gameState = JSON.parse(saved);
}

function saveGame() {
    localStorage.setItem('tactical_game_save', JSON.stringify(gameState));
}

function manualSaveGame() {
    saveGame();
    alert("遊戲進度已儲存！");
}

function resetSaveData() {
    localStorage.removeItem('tactical_game_save');
    location.reload();
}

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    btn.classList.add('active');
    renderAll();
}

function renderAll() {
    renderGrid3x3('player-grid-3x3', gameState.heroes, true);
    renderGrid3x3('enemy-grid-3x3', gameState.currentEnemies, false);
    renderHeroList();
    renderInventory();
}

function renderGrid3x3(containerId, entities, isPlayer) {
    let container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    for (let i = 0; i < 9; i++) {
        let cell = document.createElement('div');
        cell.className = 'grid-cell';
        
        let entity = entities.find(e => e.gridPos === i && (isPlayer ? !e.isDead : e.hp > 0));
        if (entity) {
            cell.classList.add('occupied');
            let hpPercent = Math.max(0, (entity.hp / (entity.maxHp || entity.hp)) * 100);
            cell.innerHTML = `
                <div class="pixel-token ${isPlayer ? '' : 'enemy'}">${entity.name.charAt(0)}</div>
                <div style="font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${entity.name}</div>
                <div class="mini-bar"><div class="mini-hp" style="width:${hpPercent}%"></div></div>
            `;
        } else {
            cell.innerHTML = `<span style="color:#444;">${i+1}</span>`;
        }
        container.appendChild(cell);
    }
}

function toggleExplore() {
    gameState.isExploring = !gameState.isExploring;
    document.getElementById('explore-btn').innerText = gameState.isExploring ? "🛑 停止探索" : "🚀 開始戰術探索";
    if (gameState.isExploring && gameState.currentEnemies.length === 0) spawnWave();
    log(gameState.isExploring ? "🚀 進入戰術探索狀態！" : "⏸️ 探索暫停。");
}

function changeDungeon(id) {
    gameState.activeDungeonId = id;
    gameState.currentEnemies = [];
    renderAll();
}

function spawnWave() {
    let dung = DUNGEONS.find(d => d.id === gameState.activeDungeonId) || DUNGEONS[0];
    let frontMob = dung.frontMobs[0];
    let backMob = dung.backMobs[0];

    gameState.currentEnemies = [
        { ...frontMob, gridPos: 4, hp: frontMob.hp, maxHp: frontMob.hp }, // 敵方前排中央
        { ...backMob, gridPos: 7, hp: backMob.hp, maxHp: backMob.hp }   // 敵方後排中央
    ];
    log(`⚔️ 遭遇敵人：${frontMob.name} 與 ${backMob.name}！`);
}

function startBattleLoop() {
    setInterval(() => {
        if (!gameState.isExploring) return;

        let activeHeroes = gameState.heroes.filter(h => !h.isDead && h.hp > 0);
        let livingEnemies = gameState.currentEnemies.filter(e => e.hp > 0);

        if (livingEnemies.length === 0) {
            spawnWave();
            return;
        }

        // 簡單回合模擬與行動條推進
        activeHeroes.forEach(h => {
            h.ct = (h.ct || 0) + h.spd;
            if (h.ct >= 100) {
                h.ct -= 100;
                executeHeroAction(h, livingEnemies);
            }
        });

        livingEnemies.forEach(e => {
            e.ct = (e.ct || 0) + e.spd;
            if (e.ct >= 100) {
                e.ct -= 100;
                executeEnemyAction(e, activeHeroes);
            }
        });

        renderAll();
    }, 300);
}

// 攻擊距離與行動回數 CD 判定邏輯
function executeHeroAction(hero, enemies) {
    // 扣減該角色身上所有技能的行動 CD
    if (hero.skillCooldowns) {
        Object.keys(hero.skillCooldowns).forEach(sk => {
            if (hero.skillCooldowns[sk] > 0) hero.skillCooldowns[sk]--;
        });
    }

    // 距離判定：武器或預設攻擊距離 (預設近戰為 1，遠程可跨越)
    let weaponRange = hero.equippedItems.weapon ? hero.equippedItems.weapon.range : 1;
    
    // 尋找射程內的敵人 (簡易 3x3 距離計算：前排 0-2, 中排 3-5, 後排 6-8)
    let target = enemies.find(e => {
        let heroRow = Math.floor(hero.gridPos / 3);
        let enemyRow = Math.floor(e.gridPos / 3);
        let distance = Math.abs(heroRow - enemyRow);
        return distance <= weaponRange;
    }) || enemies[0]; // 若超出射程則攻擊最近目標

    if (target) {
        let dmg = Math.max(5, hero.atk - Math.floor(target.def * 0.3));
        target.hp -= dmg;
        log(`⚡ [${hero.name}] 攻擊 [${target.name}] 造成 ${dmg} 傷害 (距離判定OK)`);

        if (target.hp <= 0) {
            log(`☠️ 擊敗 [${target.name}]！獲得 ${target.gold} 金幣`);
            gameState.gold += target.gold;
            gameState.currentEnemies = gameState.currentEnemies.filter(e => e !== target);
        }
    }
}

function executeEnemyAction(enemy, heroes) {
    let target = heroes[Math.floor(Math.random() * heroes.length)];
    if (target) {
        let dmg = Math.max(3, enemy.atk - Math.floor(target.def * 0.4));
        target.hp -= dmg;
        log(`💥 [${enemy.name}] 反擊 [${target.name}] 造成 ${dmg} 傷害`);
        if (target.hp <= 0) target.isDead = true;
    }
}

function recruitHero() {
    if (gameState.gold >= 120) {
        gameState.gold -= 120;
        gameState.heroes.push(createHero("新冒險者", "male"));
        renderAll();
        alert("成功招募新冒險者！");
    } else {
        alert("金幣不足 120！");
    }
}

function renderHeroList() {
    let container = document.getElementById('hero-list');
    if (!container) return;
    container.innerHTML = gameState.heroes.map(h => `
        <div class="card">
            <h4>${h.name} (位置格子: ${h.gridPos + 1})</h4>
            <p>HP: ${h.hp}/${h.maxHp} | 武器射程: ${h.equippedItems.weapon ? h.equippedItems.weapon.range : 1}</p>
        </div>
    `).join('');
}

function renderInventory() {
    let container = document.getElementById('inventory-grid');
    if (!container) return;
    container.innerHTML = gameState.inventory.map(i => `
        <div class="card"><strong>${i.name}</strong> - ${i.desc} (射程: ${i.range || 1})</div>
    `).join('');
}

function retreatAndSettle() {
    gameState.isExploring = false;
    renderAll();
    alert("已安全撤退回城！");
}

function log(msg) {
    let box = document.getElementById('battle-log');
    if (box) {
        box.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
        box.scrollTop = box.scrollHeight;
    }
}
