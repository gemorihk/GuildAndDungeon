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

// 技能資料庫 (含類型、CD、威力與基礎解鎖說明)
const SKILLS = {
    // 無業遊民技能
    tackle: { id: "tackle", name: "撞擊", type: "attack", cd: 2, power: 1.2, desc: "造成 120% 基礎傷害" },
    stone_throw: { id: "stone_throw", name: "投石", type: "attack", cd: 3, power: 1.3, desc: "造成 130% 遠程傷害" },
    first_aid: { id: "first_aid", name: "包紮", type: "heal", cd: 5, power: 1.2, desc: "恢復少量生命值" },
    focus: { id: "focus", name: "凝神", type: "buff", cd: 6, power: 0, desc: "提升下次攻擊命中與暴擊" },

    // 戰士技能 (Lv.1, Lv.3, Lv.6, Lv.10)
    bash: { id: "bash", name: "重擊", type: "attack", cd: 2, power: 1.6, desc: "造成 160% 物理傷害" },
    defend: { id: "defend", name: "防禦姿態", type: "buff", cd: 4, power: 0, desc: "提升自身 30% 防禦力" },
    cleave: { id: "cleave", name: "順勢斬", type: "attack", cd: 3, power: 2.0, desc: "造成 200% 強力物理傷害" },
    war_cry: { id: "war_cry", name: "戰吼", type: "buff", cd: 6, power: 0, desc: "提升全隊 20% 攻擊力" },

    // 弓箭手技能
    power_shot: { id: "power_shot", name: "強力射擊", type: "attack", cd: 3, power: 1.8, desc: "造成 180% 精準傷害" },
    rapid_fire: { id: "rapid_fire", name: "連射", type: "attack", cd: 3, power: 2.2, desc: "快速發射兩箭" },
    poison_arrow: { id: "poison_arrow", name: "毒箭", type: "attack", cd: 4, power: 1.5, desc: "造成傷害並使敵人中毒" },
    snipe: { id: "snipe", name: "狙擊", type: "attack", cd: 5, power: 3.2, desc: "造成 320% 超高物理傷害" },

    // 魔法學徒技能
    firebolt: { id: "firebolt", name: "火彈術", type: "attack", cd: 2, power: 1.9, desc: "造成 190% 魔法傷害" },
    ice_spike: { id: "ice_spike", name: "冰錐術", type: "attack", cd: 3, power: 2.1, desc: "造成 210% 水屬性傷害" },
    magic_barrier: { id: "magic_barrier", name: "魔力護盾", type: "buff", cd: 5, power: 0, desc: "吸收傷害護盾" },
    fireball: { id: "fireball", name: "大火球術", type: "attack", cd: 4, power: 3.0, desc: "造成 300% 爆炸魔法傷害" }
};

// 職業資料 (設定限制裝備與 Lv.1, 3, 6, 10 技能解鎖鏈)
const JOBS = {
    novice: {
        id: "novice", name: "0階 無業遊民", tier: 0, req: {},
        allowedEquip: ["all"],
        modifiers: { str: 0, con: 0, mnd: 0, dex: 0, agi: 0, luk: 0 },
        unlockSkills: { 1: "tackle", 3: "stone_throw", 6: "first_aid", 10: "focus" }
    },
    warrior: {
        id: "warrior", name: "戰士", tier: 1, req: { str: 15 },
        allowedEquip: ["sword", "axe", "heavy_armor", "shield"],
        modifiers: { str: 8, con: 6, atk: 15 },
        unlockSkills: { 1: "bash", 3: "defend", 6: "cleave", 10: "war_cry" }
    },
    archer: {
        id: "archer", name: "弓箭手", tier: 1, req: { dex: 15 },
        allowedEquip: ["bow", "light_armor"],
        modifiers: { dex: 8, agi: 6, atk: 12 },
        unlockSkills: { 1: "power_shot", 3: "rapid_fire", 6: "poison_arrow", 10: "snipe" }
    },
    apprentice: {
        id: "apprentice", name: "魔法學徒", tier: 1, req: { mnd: 15 },
        allowedEquip: ["staff", "robe"],
        modifiers: { mnd: 10, matk: 20 },
        unlockSkills: { 1: "firebolt", 3: "ice_spike", 6: "magic_barrier", 10: "fireball" }
    }
};

// 裝備範本數據
const EQUIPMENT_TEMPLATES = [
    { id: "iron_sword", name: "鐵劍", type: "weapon", equipType: "sword", atk: 15, desc: "基礎戰士長劍" },
    { id: "wooden_bow", name: "獵弓", type: "weapon", equipType: "bow", atk: 12, dex: 5, desc: "輕巧的木弓" },
    { id: "apprentice_staff", name: "學徒短杖", type: "weapon", equipType: "staff", matk: 18, mnd: 4, desc: "帶有微弱魔力的木杖" },
    { id: "iron_armor", name: "鐵甲", type: "armor", equipType: "heavy_armor", def: 12, con: 5, desc: "笨重但堅固的重甲" },
    { id: "leather_vest", name: "皮甲", type: "armor", equipType: "light_armor", def: 6, agi: 4, desc: "輕盈靈便的皮質防具" },
    { id: "mage_robe", name: "法師長袍", type: "armor", equipType: "robe", def: 4, mnd: 6, desc: "編織魔力絲線的長袍" },
    { id: "bronze_ring", name: "青銅戒指", type: "accessory", equipType: "ring", hp: 30, desc: "微幅增加生命值的飾品" }
];

// 新增第 2 層與第 3 層地下城
const DUNGEONS = [
    {
        id: "goblin_cave", name: "第 1 層：哥布林洞窟 [地] (Lv.1+)", element: "earth", reqLv: 1,
        mobs: [
            { id: "goblin", name: "哥布林戰士", hp: 320, atk: 45, def: 12, exp: 30, gold: 15, type: "melee" },
            { id: "goblin_archer", name: "哥布林弓手", hp: 250, atk: 55, def: 8, exp: 35, gold: 18, type: "ranged" }
        ],
        boss: { id: "goblin_king", name: "哥布林萬人王 [Boss]", hp: 2500, atk: 120, def: 35, exp: 300, gold: 200, type: "melee" }
    },
    {
        id: "skeleton_crypt", name: "第 2 層：地下骷髏墓穴 [暗] (Lv.3+)", element: "dark", reqLv: 3,
        mobs: [
            { id: "skeleton_warrior", name: "骷髏劍士", hp: 650, atk: 85, def: 25, exp: 60, gold: 35, type: "melee" },
            { id: "skeleton_mage", name: "亡靈法師", hp: 480, atk: 110, def: 15, exp: 75, gold: 45, type: "ranged" }
        ],
        boss: { id: "lich_king", name: "死靈領主 [Boss]", hp: 5500, atk: 220, def: 60, exp: 800, gold: 500, type: "ranged" }
    },
    {
        id: "lava_volcano", name: "第 3 層：熾熱熔岩火山 [火] (Lv.5+)", element: "fire", reqLv: 5,
        mobs: [
            { id: "fire_elemental", name: "熔岩火靈", hp: 1200, atk: 160, def: 40, exp: 120, gold: 70, type: "ranged" },
            { id: "magma_golem", name: "岩漿巨石人", hp: 2200, atk: 140, def: 90, exp: 150, gold: 90, type: "melee" }
        ],
        boss: { id: "flame_dragon", name: "滅世赤龍 [Boss]", hp: 12000, atk: 380, def: 120, exp: 2000, gold: 1200, type: "melee" }
    }
];

const SHOP_ITEMS = [
    { id: "pot_small", name: "小型回復藥水", type: "potion", heal: 80, cost: 35, desc: "恢復 80 點 HP" },
    { id: "pot_medium", name: "濃縮回復藥水", type: "potion", heal: 250, cost: 100, desc: "恢復 250 點 HP" },
    { id: "pot_large", name: "高級急救藥水", type: "potion", heal: 700, cost: 280, desc: "恢復 280 點 HP" }
];
