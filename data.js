const HERO_NAMES = {
    male: ["亞瑟", "洛克", "卡爾", "格雷", "克里斯", "蘭斯洛特", "高文", "凱爾"],
    female: ["莉莉絲", "艾莉亞", "席娜", "海倫娜", "桂妮薇兒", "莫甘娜", "露西", "伊娃"]
};

const TRAITS = [
    { id: "brave", name: "勇敢", desc: "攻擊力 +15%，防禦力 -5%", effect: { atkMult: 1.15, defMult: 0.95 } },
    { id: "coward", name: "膽小", desc: "迴避率 +15%，攻擊力 -10%", effect: { agiMult: 1.15, atkMult: 0.90 } },
    { id: "genius", name: "天資聰穎", desc: "精神與魔法威力 +20%", effect: { mndMult: 1.20 } },
    { id: "clumsy", name: "笨拙", desc: "靈巧與命中 -10%", effect: { dexMult: 0.90 } },
    { id: "strong", name: "強壯", desc: "體質與生命上限 +15%", effect: { conMult: 1.15 } },
    { id: "lazy", name: "懶散", desc: "全屬性 -5%", effect: { allMult: 0.95 } },
    { id: "calm", name: "冷靜", desc: "防禦與格擋 +10%", effect: { defMult: 1.10 } },
    { id: "reckless", name: "魯莽", desc: "暴擊率 +15%，防禦力 -10%", effect: { critMult: 1.15, defMult: 0.90 } }
];

const GROWTH_GRADES = ["E", "D", "C", "B", "A", "S", "SS", "SSS"];
const GRADE_VALUES = { "E": 0.8, "D": 1.0, "C": 1.3, "B": 1.7, "A": 2.2, "S": 2.8, "SS": 3.5, "SSS": 4.5 };

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
    fireball: { id: "fireball", name: "大火球術", type: "attack", cd: 4, power: 3.0, desc: "造成 300% 爆炸魔法傷害" },

    heal: { id: "heal", name: "治癒術", type: "heal", cd: 3, power: 2.0, desc: "恢復 200% 魔攻生命" },
    holy_light: { id: "holy_light", name: "聖光彈", type: "attack", cd: 2, power: 1.5, desc: "造成 150% 魔法傷害" },
    bless: { id: "bless", name: "祝福", type: "buff", cd: 5, power: 0, desc: "提升全隊 15% 攻防" },
    group_heal: { id: "group_heal", name: "群體急救", type: "heal", cd: 6, power: 1.5, desc: "恢復全隊 150% 魔攻生命" }
};

const JOBS = {
    novice: {
        id: "novice", name: "0階 無業遊民", tier: 0, req: {},
        desc: "尚未決定職業方向的冒險者，能適應各種裝備。",
        allowedEquip: ["all"],
        modifiers: { str: 0, con: 0, mnd: 0, dex: 0, agi: 0, luk: 0 },
        unlockSkills: { 1: "tackle", 3: "stone_throw", 6: "first_aid", 10: "focus" }
    },
    warrior: {
        id: "warrior", name: "1階 戰士", tier: 1, req: { str: 15 },
        desc: "近戰物理核心，精通重型防具與正面迎敵。",
        allowedEquip: ["sword", "axe", "heavy_armor", "shield", "ring"],
        modifiers: { str: 8, con: 6, atk: 15 },
        unlockSkills: { 1: "bash", 3: "defend", 6: "cleave", 10: "war_cry" }
    },
    archer: {
        id: "archer", name: "1階 弓箭手", tier: 1, req: { dex: 15 },
        desc: "敏捷遠程打手，精通弱點打擊與高暴擊爆發。",
        allowedEquip: ["bow", "light_armor", "ring"],
        modifiers: { dex: 8, agi: 6, atk: 12 },
        unlockSkills: { 1: "power_shot", 3: "rapid_fire", 6: "poison_arrow", 10: "snipe" }
    },
    apprentice: {
        id: "apprentice", name: "1階 魔法學徒", tier: 1, req: { mnd: 15 },
        desc: "掌控元素魔法，具備強大的遠程範圍傷害。",
        allowedEquip: ["staff", "robe", "ring"],
        modifiers: { mnd: 10, matk: 20 },
        unlockSkills: { 1: "firebolt", 3: "ice_spike", 6: "magic_barrier", 10: "fireball" }
    },
    acolyte: {
        id: "acolyte", name: "1階 僧侶", tier: 1, req: { con: 12, mnd: 12 },
        desc: "虔誠聖職者，能為全隊提供急救治癒與庇護。",
        allowedEquip: ["staff", "robe", "shield", "ring"],
        modifiers: { con: 5, mnd: 8 },
        unlockSkills: { 1: "heal", 3: "holy_light", 6: "bless", 10: "group_heal" }
    }
};

const SHOP_ITEMS_BY_TIER = {
    1: [
        { id: "pot_small", name: "初級回復藥水", type: "potion", category: "potion", heal: 80, cost: 30, desc: "恢復 80 點生命值", tierReq: 1 },
        { id: "iron_sword", name: "鐵劍", type: "equipment", slot: "weapon", category: "equipment", equipType: "sword", atk: 15, cost: 120, desc: "基礎戰士長劍 (攻擊+15)", tierReq: 1 },
        { id: "wooden_bow", name: "獵弓", type: "equipment", slot: "weapon", category: "equipment", equipType: "bow", atk: 12, dex: 5, cost: 120, desc: "輕巧木弓 (攻擊+12, 靈巧+5)", tierReq: 1 },
        { id: "leather_vest", name: "皮甲", type: "equipment", slot: "armor", category: "equipment", equipType: "light_armor", def: 6, agi: 4, cost: 100, desc: "靈便皮甲 (防禦+6, 敏捷+4)", tierReq: 1 }
    ],
    2: [
        { id: "pot_medium", name: "中級回復藥水", type: "potion", category: "potion", heal: 250, cost: 90, desc: "恢復 250 點生命值", tierReq: 2 },
        { id: "apprentice_staff", name: "學徒短杖", type: "equipment", slot: "weapon", category: "equipment", equipType: "staff", matk: 18, mnd: 4, cost: 180, desc: "魔力木杖 (魔攻+18, 精神+4)", tierReq: 2 },
        { id: "iron_armor", name: "鐵甲", type: "equipment", slot: "armor", category: "equipment", equipType: "heavy_armor", def: 12, con: 5, cost: 200, desc: "堅固重甲 (防禦+12, 體質+5)", tierReq: 2 }
    ],
    3: [
        { id: "pot_large", name: "高級急救藥水", type: "potion", category: "potion", heal: 700, cost: 250, desc: "恢復 700 點生命值", tierReq: 3 },
        { id: "bronze_ring", name: "青銅戒指", type: "equipment", slot: "accessory", category: "equipment", equipType: "ring", hp: 30, cost: 150, desc: "銅質戒指 (HP上限+30)", tierReq: 3 }
    ]
};

const QUEST_DATABASE = [
    { id: "q_goblin", title: "討伐哥布林戰士", desc: "討伐哥布林洞窟中的哥布林戰士。", targetMob: "goblin", maxCount: 10, rewardGold: 120, tierReq: 1 },
    { id: "q_goblin_archer", title: "清掃哥布林弓手", desc: "消滅哥布林洞窟中的遠程威脅。", targetMob: "goblin_archer", maxCount: 8, rewardGold: 140, tierReq: 1 },
    { id: "q_skeleton", title: "清理骷髏劍士", desc: "討伐地下骷髏墓穴中的骷髏劍士。", targetMob: "skeleton_warrior", maxCount: 10, rewardGold: 220, tierReq: 2 },
    { id: "q_mage", title: "驅逐亡靈法師", desc: "消滅骷髏墓穴中的邪惡亡靈法師。", targetMob: "skeleton_mage", maxCount: 8, rewardGold: 260, tierReq: 2 }
];

const DUNGEONS = [
    {
        id: "goblin_cave", name: "第 1 層：哥布林洞窟 [地] (Lv.1+)", element: "earth", reqLv: 1, tier: 1,
        mobs: [
            { id: "goblin", name: "哥布林戰士", hp: 320, atk: 45, def: 12, exp: 30, gold: 15, type: "melee" },
            { id: "goblin_archer", name: "哥布林弓手", hp: 250, atk: 55, def: 8, exp: 35, gold: 18, type: "ranged" }
        ],
        boss: { id: "goblin_king", name: "哥布林萬人王 [Boss]", hp: 2500, atk: 120, def: 35, exp: 300, gold: 200, type: "melee" }
    },
    {
        id: "skeleton_crypt", name: "第 2 層：地下骷髏墓穴 [暗] (Lv.3+)", element: "dark", reqLv: 3, tier: 2,
        mobs: [
            { id: "skeleton_warrior", name: "骷髏劍士", hp: 650, atk: 85, def: 25, exp: 60, gold: 35, type: "melee" },
            { id: "skeleton_mage", name: "亡靈法師", hp: 480, atk: 110, def: 15, exp: 75, gold: 45, type: "ranged" }
        ],
        boss: { id: "lich_king", name: "死靈領主 [Boss]", hp: 5500, atk: 220, def: 60, exp: 800, gold: 500, type: "ranged" }
    },
    {
        id: "lava_volcano", name: "第 3 層：熾熱熔岩火山 [火] (Lv.5+)", element: "fire", reqLv: 5, tier: 3,
        mobs: [
            { id: "fire_elemental", name: "熔岩火靈", hp: 1200, atk: 160, def: 40, exp: 120, gold: 70, type: "ranged" },
            { id: "magma_golem", name: "岩漿巨石人", hp: 2200, atk: 140, def: 90, exp: 150, gold: 90, type: "melee" }
        ],
        boss: { id: "flame_dragon", name: "滅世赤龍 [Boss]", hp: 12000, atk: 380, def: 120, exp: 2000, gold: 1200, type: "melee" }
    }
];
