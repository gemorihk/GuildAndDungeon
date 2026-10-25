// ==========================================
// 1. 種族血統與能力修正資料庫
// ==========================================
const RACES = {
    western_human: { id: "western_human", name: "西方人族", desc: "各項能力均衡發展，適應力極強。", mod: { str: 1.0, con: 1.0, mnd: 1.0, dex: 1.0, agi: 1.0, luk: 1.0 } },
    eastern_human: { id: "eastern_human", name: "東方人族", desc: "靈巧與精神較高，擅長武藝與氣息運轉。", mod: { str: 0.9, con: 0.9, mnd: 1.1, dex: 1.1, agi: 1.0, luk: 1.0 } },
    cat_folk: { id: "cat_folk", name: "貓人", desc: "敏捷與幸運極高，擅長高速迴避與暴擊。", mod: { str: 0.8, con: 0.8, mnd: 0.9, dex: 1.2, agi: 1.4, luk: 1.2 } },
    lion_folk: { id: "lion_folk", name: "獅子人", desc: "力量與體質極其優秀的戰鬥民族。", mod: { str: 1.3, con: 1.2, mnd: 0.7, dex: 1.0, agi: 1.0, luk: 0.9 } },
    half_elf: { id: "half_elf", name: "半精靈", desc: "兼具靈巧與魔法天賦的混血種族。", mod: { str: 0.9, con: 0.9, mnd: 1.15, dex: 1.15, agi: 1.05, luk: 1.0 } },
    elf: { id: "elf", name: "精靈", desc: "精神與靈巧極高，大自然的魔法寵兒。", mod: { str: 0.7, con: 0.8, mnd: 1.35, dex: 1.2, agi: 1.1, luk: 1.0 } },
    dwarf: { id: "dwarf", name: "矮人", desc: "擁有極高體質與力量，防禦力驚人。", mod: { str: 1.2, con: 1.4, mnd: 0.8, dex: 0.8, agi: 0.8, luk: 1.1 } },
    demon_folk: { id: "demon_folk", name: "魔人", desc: "擁有恐怖的攻擊與精神力，成長潛力巨大。", mod: { str: 1.25, con: 1.1, mnd: 1.25, dex: 0.9, agi: 1.0, luk: 0.85 } }
};

// ==========================================
// 2. 隨機生成人名列表 (按性別與種族)
// ==========================================
const HERO_NAMES = {
    male: ["亞瑟", "洛克", "卡爾", "格雷", "克里斯", "蘭斯洛特", "高文", "凱爾", "雷恩", "巴德"],
    female: ["莉莉絲", "艾莉亞", "席娜", "海倫娜", "桂妮薇兒", "莫甘娜", "露西", "伊娃", "菲歐娜", "瑟琳娜"]
};

// ==========================================
// 3. 素材、道具及裝備資料庫
// ==========================================
const ITEMS_DATABASE = [
    { id: "pot_small", name: "初級回復藥水", type: "potion", category: "potion", rarity: "N", heal: 80, cost: 30, sell: 10, tierReq: 1, desc: "恢復 80 點生命值" },
    { id: "pot_medium", name: "中級回復藥水", type: "potion", category: "potion", rarity: "R", heal: 250, cost: 90, sell: 30, tierReq: 2, desc: "恢復 250 點生命值" },
    { id: "pot_large", name: "高級急救藥水", type: "potion", category: "potion", rarity: "SR", heal: 700, cost: 250, sell: 83, tierReq: 3, desc: "恢復 700 點生命值" },

    { id: "iron_sword", name: "鐵劍", type: "equipment", slot: "weapon", category: "equipment", equipType: "sword", rarity: "N", atk: 15, cost: 120, sell: 40, tierReq: 1, desc: "基礎戰士長劍 (攻擊+15)" },
    { id: "wooden_bow", name: "獵弓", type: "equipment", slot: "weapon", category: "equipment", equipType: "bow", rarity: "N", atk: 12, dex: 5, cost: 120, sell: 40, tierReq: 1, desc: "輕巧木弓 (攻擊+12, 靈巧+5)" },
    { id: "apprentice_staff", name: "學徒短杖", type: "equipment", slot: "weapon", category: "equipment", equipType: "staff", rarity: "R", matk: 18, mnd: 4, cost: 180, sell: 60, tierReq: 2, desc: "魔力木杖 (魔攻+18, 精神+4)" },
    { id: "iron_armor", name: "鐵甲", type: "equipment", slot: "armor", category: "equipment", equipType: "heavy_armor", rarity: "R", def: 12, con: 5, cost: 200, sell: 66, tierReq: 2, desc: "堅固重甲 (防禦+12, 體質+5)" },
    { id: "leather_vest", name: "皮甲", type: "equipment", slot: "armor", category: "equipment", equipType: "light_armor", rarity: "N", def: 6, agi: 4, cost: 100, sell: 33, tierReq: 1, desc: "靈便皮甲 (防禦+6, 敏捷+4)" },
    { id: "bronze_ring", name: "青銅戒指", type: "equipment", slot: "accessory", category: "equipment", equipType: "ring", rarity: "SR", hp: 30, cost: 150, sell: 50, tierReq: 3, desc: "銅質戒指 (HP上限+30)" },

    { id: "mat_goblin_fur", name: "哥布林皮毛", type: "material", category: "material", rarity: "N", cost: 30, sell: 10, desc: "粗糙的哥布林皮毛" },
    { id: "mat_rag", name: "碎布", type: "material", category: "material", rarity: "N", cost: 20, sell: 6, desc: "破損的破布" },
    { id: "mat_bone", name: "枯骨碎塊", type: "material", category: "material", rarity: "N", cost: 40, sell: 13, desc: "散發陰氣的枯骨" },
    { id: "mat_magic_residue", name: "魔力殘渣", type: "material", category: "material", rarity: "R", cost: 60, sell: 20, desc: "殘存微弱魔力的粉末" },
    { id: "mat_lava_ore", name: "熔岩礦石", type: "material", category: "material", rarity: "SR", cost: 100, sell: 33, desc: "帶有高溫熱力的赤紅礦石" }
];

// 裝備範本，方便隨機掉落
const EQUIPMENT_TEMPLATES = ITEMS_DATABASE.filter(i => i.type === "equipment");

// ==========================================
// 4. 探索區域與怪物掉落資料庫
// ==========================================
const DUNGEONS = [
    {
        id: "goblin_cave", name: "第 1 層：哥布林洞窟 [地] (Lv.1+)", element: "earth", reqLv: 1, tier: 1,
        mobs: [
            { id: "goblin", name: "哥布林戰士", race: "goblin", hp: 320, atk: 45, def: 12, spd: 14, exp: 30, gold: 15, type: "melee", drops: [{ name: "鐵劍", chance: 1.0 }, { name: "哥布林皮毛", chance: 1.0 }] },
            { id: "goblin_archer", name: "哥布林弓手", race: "goblin", hp: 250, atk: 55, def: 8, spd: 16, exp: 35, gold: 18, type: "ranged", drops: [{ name: "獵弓", chance: 1.0 }, { name: "碎布", chance: 1.0 }] }
        ],
        boss: { id: "goblin_king", name: "哥布林萬人王 [Boss]", race: "goblin", hp: 2500, atk: 120, def: 35, spd: 18, exp: 300, gold: 200, type: "melee", drops: [{ name: "鐵甲", chance: 1.0 }, { name: "青銅戒指", chance: 1.0 }] }
    },
    {
        id: "skeleton_crypt", name: "第 2 層：地下骷髏墓穴 [暗] (Lv.3+)", element: "dark", reqLv: 3, tier: 2,
        mobs: [
            { id: "skeleton_warrior", name: "骷髏劍士", race: "undead", hp: 650, atk: 85, def: 25, spd: 15, exp: 60, gold: 35, type: "melee", drops: [{ name: "鐵劍", chance: 1.0 }, { name: "枯骨碎塊", chance: 1.0 }] },
            { id: "skeleton_mage", name: "亡靈法師", race: "undead", hp: 480, atk: 110, def: 15, spd: 17, exp: 75, gold: 45, type: "ranged", drops: [{ name: "學徒短杖", chance: 1.0 }, { name: "魔力殘渣", chance: 1.0 }] }
        ],
        boss: { id: "lich_king", name: "死靈領主 [Boss]", race: "undead", hp: 5500, atk: 220, def: 60, spd: 22, exp: 800, gold: 500, type: "ranged", drops: [{ name: "學徒短杖", chance: 1.0 }, { name: "青銅戒指", chance: 1.0 }] }
    },
    {
        id: "lava_volcano", name: "第 3 層：熾熱熔岩火山 [火] (Lv.5+)", element: "fire", reqLv: 5, tier: 3,
        mobs: [
            { id: "fire_elemental", name: "熔岩火靈", race: "advanced_monster", hp: 1200, atk: 160, def: 40, spd: 18, exp: 120, gold: 70, type: "ranged", drops: [{ name: "熔岩礦石", chance: 1.0 }, { name: "學徒短杖", chance: 1.0 }] },
            { id: "magma_golem", name: "岩漿巨石人", race: "advanced_monster", hp: 2200, atk: 140, def: 90, spd: 10, exp: 150, gold: 90, type: "melee", drops: [{ name: "熔岩礦石", chance: 1.0 }, { name: "鐵甲", chance: 1.0 }] }
        ],
        boss: { id: "flame_dragon", name: "滅世赤龍 [Boss]", race: "advanced_monster", hp: 12000, atk: 380, def: 120, spd: 25, exp: 2000, gold: 1200, type: "melee", drops: [{ name: "鐵甲", chance: 1.0 }, { name: "青銅戒指", chance: 1.0 }] }
    }
];

// ==========================================
// 5. 敵人列表與捕獲標記資料庫
// ==========================================
const ENEMIES_DATABASE = [
    { id: "goblin", name: "哥布林戰士", race: "goblin", captureable: true },
    { id: "goblin_archer", name: "哥布林弓手", race: "goblin", captureable: true },
    { id: "goblin_king", name: "哥布林萬人王", race: "goblin", captureable: false },
    { id: "skeleton_warrior", name: "骷髏劍士", race: "undead", captureable: true },
    { id: "skeleton_mage", name: "亡靈法師", race: "undead", captureable: true },
    { id: "lich_king", name: "死靈領主", race: "undead", captureable: false },
    { id: "fire_elemental", name: "熔岩火靈", race: "advanced_monster", captureable: true },
    { id: "magma_golem", name: "岩漿巨石人", race: "advanced_monster", captureable: true },
    { id: "flame_dragon", name: "滅世赤龍", race: "advanced_monster", captureable: false }
];

// ==========================================
// 6. 職業、技能與轉職條件資料庫 (新增解鎖消耗參數)
// ==========================================
const SKILLS = {
    tackle: { id: "tackle", name: "撞擊", type: "attack", cd: 2, power: 1.2, desc: "造成 120% 基礎傷害" },
    stone_throw: { id: "stone_throw", name: "投石", type: "attack", cd: 3, power: 1.3, desc: "造成 130% 遠程傷害" },
    first_aid: { id: "first_aid", name: "包紮", type: "heal", cd: 5, power: 1.2, desc: "恢復少量生命值" },
    focus: { id: "focus", name: "凝神", type: "buff", cd: 6, power: 0, desc: "提升下次攻擊命中與暴擊" },

    bash: { id: "bash", name: "重擊", type: "attack", cd: 2, power: 1.6, desc: "造成 160% 物理傷害" },
    defend: { id: "defend", name: "防禦姿態", type: "buff", cd: 4, power: 0, desc: "提升自身 30% 防禦力" },
    cleave: { id: "cleave", name: "順勢斬", type: "attack", cd: 3, power: 2.0, desc: "造成 200% 強力物理傷害" },
    war_cry: { id: "war_cry", name: "戰吼", type: "buff", cd: 6, power: 0, desc: "全隊提升 20% 攻擊力" },

    power_shot: { id: "power_shot", name: "強力射擊", type: "attack", cd: 3, power: 1.8, desc: "造成 180% 精準傷害" },
    rapid_fire: { id: "rapid_fire", name: "連射", type: "attack", cd: 3, power: 2.2, desc: "快速發射兩箭" },
    poison_arrow: { id: "poison_arrow", name: "毒箭", type: "attack", cd: 4, power: 1.5, desc: "造成傷害並使敵人中毒" },
    snipe: { id: "snipe", name: "狙擊", type: "attack", cd: 5, power: 3.2, desc: "造成 320% 超高物理傷害" },

    firebolt: { id: "firebolt", name: "火彈術", type: "attack", cd: 2, power: 1.9, desc: "造成 190% 魔法傷害" },
    ice_spike: { id: "ice_spike", name: "冰錐術", type: "attack", cd: 3, power: 2.1, desc: "造成 210% 水屬性傷害" },
    magic_barrier: { id: "magic_barrier", name: "魔力護盾", type: "buff", cd: 5, power: 0, desc: "吸收傷害護盾" },
    fireball: { id: "fireball", name: "大火球術", type: "attack", cd: 4, power: 3.0, desc: "造成 300% 爆炸魔法傷害" }
};

const JOBS = {
    novice: {
        id: "novice", name: "0階 無業遊民", tier: 0, req: {},
        cost: { gold: 0 },
        desc: "尚未決定職業方向的冒險者，能適應各種裝備。",
        allowedEquip: ["all"],
        modifiers: { str: 0, con: 0, mnd: 0, dex: 0, agi: 0, luk: 0 },
        unlockSkills: { 1: "tackle", 3: "stone_throw", 6: "first_aid", 10: "focus" }
    },
    warrior: {
        id: "warrior", name: "1階 戰士", tier: 1, req: { str: 15 },
        cost: { gold: 50 }, // 首次解鎖費用 50 金幣
        desc: "近戰物理核心，精通重型防具與正面迎敵。",
        allowedEquip: ["sword", "axe", "heavy_armor", "shield", "ring"],
        modifiers: { str: 8, con: 6, atk: 15 },
        unlockSkills: { 1: "bash", 3: "defend", 6: "cleave", 10: "war_cry" }
    },
    archer: {
        id: "archer", name: "1階 弓箭手", tier: 1, req: { dex: 15 },
        cost: { gold: 50 }, // 首次解鎖費用 50 金幣
        desc: "敏捷遠程打手，精通弱點打擊與高暴擊爆發。",
        allowedEquip: ["bow", "light_armor", "ring"],
        modifiers: { dex: 8, agi: 6, atk: 12 },
        unlockSkills: { 1: "power_shot", 3: "rapid_fire", 6: "poison_arrow", 10: "snipe" }
    },
    apprentice: {
        id: "apprentice", name: "1階 魔法學徒", tier: 1, req: { mnd: 15 },
        cost: { gold: 50 }, // 首次解鎖費用 50 金幣
        desc: "掌控元素魔法，具備強大的遠程範圍傷害。",
        allowedEquip: ["staff", "robe", "ring"],
        modifiers: { mnd: 10, matk: 20 },
        unlockSkills: { 1: "firebolt", 3: "ice_spike", 6: "magic_barrier", 10: "fireball" }
    }
};

const SHOP_ITEMS_BY_TIER = {
    1: [
        ITEMS_DATABASE.find(i => i.id === "pot_small"),
        ITEMS_DATABASE.find(i => i.id === "iron_sword"),
        ITEMS_DATABASE.find(i => i.id === "wooden_bow"),
        ITEMS_DATABASE.find(i => i.id === "leather_vest")
    ],
    2: [
        ITEMS_DATABASE.find(i => i.id === "pot_medium"),
        ITEMS_DATABASE.find(i => i.id === "apprentice_staff"),
        ITEMS_DATABASE.find(i => i.id === "iron_armor")
    ],
    3: [
        ITEMS_DATABASE.find(i => i.id === "pot_large"),
        ITEMS_DATABASE.find(i => i.id === "bronze_ring")
    ]
};

const QUEST_DATABASE = [
    { id: "q_goblin", title: "討伐哥布林戰士", desc: "討伐哥布林洞窟中的哥布林戰士。", targetMob: "goblin", maxCount: 10, rewardGold: 120, tierReq: 1 },
    { id: "q_goblin_archer", title: "清掃哥布林弓手", desc: "消滅哥布林洞窟中的遠程威脅。", targetMob: "goblin_archer", maxCount: 8, rewardGold: 140, tierReq: 1 }
];
