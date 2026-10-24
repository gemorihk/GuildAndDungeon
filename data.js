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

const JOBS = {
    novice: { id: "novice", name: "0階 無業遊民", tier: 0, req: {}, modifiers: { str: 0, con: 0, mnd: 0, dex: 0, agi: 0, luk: 0 }, skills: [] },
    warrior: { id: "warrior", name: "戰士", tier: 1, req: { str: 15 }, modifiers: { str: 6, con: 4, atk: 12 }, skills: ["bash"] },
    knight: { id: "knight", name: "騎士", tier: 1, req: { con: 15 }, modifiers: { con: 8, def: 10 }, skills: ["taunt"] },
    archer: { id: "archer", name: "弓箭手", tier: 1, req: { dex: 15 }, modifiers: { dex: 6, agi: 4 }, skills: ["power_shot"] },
    thief: { id: "thief", name: "小偷", tier: 1, req: { luk: 15, agi: 12 }, modifiers: { agi: 6, luk: 6 }, skills: ["steal"] },
    apprentice: { id: "apprentice", name: "魔法學徒", tier: 1, req: { mnd: 15 }, modifiers: { mnd: 8, matk: 15 }, skills: ["firebolt"] },
    acolyte: { id: "acolyte", name: "僧侶", tier: 1, req: { con: 10, mnd: 10 }, modifiers: { con: 4, mnd: 4 }, skills: ["heal"] },
    berserker: { id: "berserker", name: "狂戰士", tier: 2, req: { str: 30, con: 20 }, modifiers: { str: 15, con: 10, atk: 30 }, skills: ["whirlwind"] },
    paladin: { id: "paladin", name: "聖騎士", tier: 2, req: { con: 30, mnd: 20 }, modifiers: { con: 15, mnd: 10, def: 25 }, skills: ["holy_shield"] },
    mage: { id: "mage", name: "大魔法師", tier: 2, req: { mnd: 35 }, modifiers: { mnd: 20, matk: 40 }, skills: ["chain_lightning"] },
    priest: { id: "priest", name: "祭司", tier: 2, req: { mnd: 25, con: 25 }, modifiers: { mnd: 12, con: 12 }, skills: ["group_heal"] }
};

const SKILLS = {
    bash: { id: "bash", name: "重擊", type: "attack", cd: 2, power: 1.6, desc: "造成 160% 物理傷害" },
    taunt: { id: "taunt", name: "挑釁", type: "buff", cd: 4, power: 0, desc: "吸引敵人注意力並增加防禦" },
    power_shot: { id: "power_shot", name: "強力射擊", type: "attack", cd: 3, power: 1.8, desc: "造成 180% 精準傷害" },
    steal: { id: "steal", name: "偷竊", type: "attack", cd: 5, power: 1.1, desc: "攻擊並額外獲取金幣" },
    firebolt: { id: "firebolt", name: "火彈術", type: "attack", cd: 2, power: 1.9, desc: "造成 190% 魔法傷害" },
    heal: { id: "heal", name: "治癒術", type: "heal", cd: 4, power: 2.2, desc: "恢復友方大量生命值" },
    whirlwind: { id: "whirlwind", name: "旋風斬", type: "attack", cd: 3, power: 2.4, desc: "造成 240% 強力物理傷害" },
    holy_shield: { id: "holy_shield", name: "聖光盾", type: "buff", cd: 6, power: 0, desc: "大幅提升防禦力與格擋" },
    chain_lightning: { id: "chain_lightning", name: "閃電鏈", type: "attack", cd: 4, power: 2.8, desc: "造成 280% 高額魔法傷害" },
    group_heal: { id: "group_heal", name: "群體治癒", type: "heal", cd: 7, power: 2.0, desc: "恢復全隊生命值" }
};

// 大幅上調敵人實力與平衡金幣產出
const DUNGEONS = [
    {
        id: "goblin_cave", name: "哥布林洞窟 [地]", element: "earth", reqLv: 1,
        mobs: [
            { id: "goblin", name: "哥布林戰士", hp: 350, atk: 48, def: 15, exp: 25, gold: 12, type: "melee" },
            { id: "goblin_archer", name: "哥布林弓手", hp: 280, atk: 58, def: 10, exp: 30, gold: 15, type: "ranged" }
        ],
        boss: { id: "goblin_king", name: "哥布林萬人王 [Boss]", hp: 2800, atk: 130, def: 40, exp: 250, gold: 150, type: "melee" }
    },
    {
        id: "mist_forest", name: "迷霧森林 [風]", element: "wind", reqLv: 5,
        mobs: [
            { id: "wind_wolf", name: "疾風魔狼", hp: 650, atk: 90, def: 28, exp: 50, gold: 25, type: "melee" },
            { id: "treant", name: "樹精守衛", hp: 950, atk: 75, def: 48, exp: 60, gold: 30, type: "melee" }
        ],
        boss: { id: "forest_dragon", name: "翡翠毒龍 [Boss]", hp: 6000, atk: 220, def: 75, exp: 600, gold: 350, type: "ranged" }
    }
];

const SHOP_ITEMS = [
    { id: "pot_small", name: "小型回復藥水", type: "potion", heal: 80, cost: 35, desc: "恢復 80 點 HP" },
    { id: "pot_medium", name: "濃縮回復藥水", type: "potion", heal: 250, cost: 100, desc: "恢復 250 點 HP" },
    { id: "pot_large", name: "高級急救藥水", type: "potion", heal: 700, cost: 280, desc: "恢復 700 點 HP" }
];
