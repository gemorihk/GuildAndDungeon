// 1. 六大基礎屬性說明：STR(力量), CON(體質), MND(精神力), DEX(靈巧), AGI(敏捷), LUK(幸運)

// 2. 職業定義與門檻 (包含萬年騎士團式轉職門檻)
const JOBS = {
    novice: { id: "novice", name: "0階 無業遊民", tier: 0, req: {}, skills: [] },
    
    // 一階初級職業
    warrior: { id: "warrior", name: "戰士", tier: 1, req: { str: 15 }, skills: ["bash"] },
    knight: { id: "knight", name: "騎士", tier: 1, req: { con: 15 }, skills: ["taunt"] },
    archer: { id: "archer", name: "弓箭手", tier: 1, req: { dex: 15 }, skills: ["power_shot"] },
    thief: { id: "thief", name: "小偷", tier: 1, req: { luk: 15, agi: 12 }, skills: ["steal"] },
    apprentice: { id: "apprentice", name: "魔法學徒", tier: 1, req: { mnd: 15 }, skills: ["firebolt"] },
    acolyte: { id: "acolyte", name: "僧侶", tier: 1, req: { con: 10, mnd: 10 }, skills: ["heal"] },

    // 二階中級職業
    berserker: { id: "berserker", name: "狂戰士", tier: 2, req: { str: 30, con: 20 }, skills: ["whirlwind"] },
    paladin: { id: "paladin", name: "聖騎士", tier: 2, req: { con: 30, mnd: 20 }, skills: ["holy_shield"] },
    mage: { id: "mage", name: "大魔法師", tier: 2, req: { mnd: 35 }, skills: ["chain_lightning"] },
    priest: { id: "priest", name: "祭司", tier: 2, req: { mnd: 25, con: 25 }, skills: ["group_heal"] },

    // 三階專精職業 (每個角色只能綁定一個三級專精)
    archmage: { id: "archmage", name: "大魔導師", tier: 3, req: { mnd: 60 }, isMastery: true, skills: ["meteor"] },
    cardinal: { id: "cardinal", name: "神官", tier: 3, req: { mnd: 45, con: 45 }, isMastery: true, skills: ["divine_blessing"] }
};

// 3. 技能資料庫
const SKILLS = {
    bash: { id: "bash", name: "重擊", mpCost: 5, power: 1.5, type: "physical", desc: "造成 150% 物理傷害" },
    taunt: { id: "taunt", name: "挑釁", mpCost: 3, power: 0, type: "buff", desc: "吸引敵人注意力並增加防禦" },
    power_shot: { id: "power_shot", name: "強力射擊", mpCost: 6, power: 1.6, type: "physical", desc: "造成 160% 精準傷害" },
    steal: { id: "steal", name: "偷竊", mpCost: 4, power: 1.0, type: "physical", desc: "攻擊並有機會額外獲得金幣" },
    firebolt: { id: "firebolt", name: "火彈術", mpCost: 8, power: 1.8, type: "magic", desc: "造成 180% 魔法傷害" },
    heal: { id: "heal", name: "治癒術", mpCost: 10, power: 2.0, type: "heal", desc: "恢復友方 HP" },
    whirlwind: { id: "whirlwind", name: "旋風斬", mpCost: 12, power: 2.2, type: "physical", desc: "造成 220% 強力物理傷害" },
    holy_shield: { id: "holy_shield", name: "聖光盾", mpCost: 15, power: 0, type: "buff", desc: "大幅提升自身防禦力" },
    chain_lightning: { id: "chain_lightning", name: "閃電鏈", mpCost: 18, power: 2.5, type: "magic", desc: "造成 250% 高額魔法傷害" },
    group_heal: { id: "group_heal", name: "群體治癒", mpCost: 25, power: 1.8, type: "heal_all", desc: "恢復全隊 HP" },
    meteor: { id: "meteor", name: "隕石術", mpCost: 40, power: 4.0, type: "magic", desc: "毀滅性的 400% 魔法傷害" },
    divine_blessing: { id: "divine_blessing", name: "神聖賜福", mpCost: 35, power: 3.0, type: "heal_all", desc: "全隊大量恢復 HP" }
};

// 4. 地下城與怪物資料
const DUNGEONS = [
    {
        id: "goblin_cave", name: "哥布林洞窟 [地]", element: "earth", reqLv: 1,
        mobs: [
            { id: "goblin", name: "哥布林戰士", hp: 60, atk: 12, def: 3, exp: 15, gold: 10 },
            { id: "goblin_archer", name: "哥布林弓手", hp: 45, atk: 16, def: 1, exp: 18, gold: 12 }
        ],
        boss: { id: "goblin_king", name: "哥布林萬人王 [Boss]", hp: 350, atk: 35, def: 10, exp: 150, gold: 120 }
    },
    {
        id: "mist_forest", name: "迷霧森林 [風]", element: "wind", reqLv: 5,
        mobs: [
            { id: "wind_wolf", name: "疾風魔狼", hp: 120, atk: 25, def: 6, exp: 35, gold: 25 },
            { id: "treant", name: "樹精守衛", hp: 200, atk: 18, def: 15, exp: 40, gold: 30 }
        ],
        boss: { id: "forest_dragon", name: "翡翠毒龍 [Boss]", hp: 850, atk: 65, def: 25, exp: 350, gold: 300 }
    },
    {
        id: "lava_dungeon", name: "熔岩地牢 [火]", element: "fire", reqLv: 12,
        mobs: [
            { id: "fire_elemental", name: "熔岩元素", hp: 280, atk: 45, def: 18, exp: 80, gold: 60 }
        ],
        boss: { id: "flame_lord", name: "炎魔領主 [Boss]", hp: 1800, atk: 110, def: 45, exp: 800, gold: 700 }
    }
];

// 5. 商店藥水項目
const SHOP_ITEMS = [
    { id: "pot_small", name: "小型回復藥水", type: "potion", heal: 80, cost: 20, desc: "恢復 80 點 HP" },
    { id: "pot_medium", name: "濃縮回復藥水", type: "potion", heal: 250, cost: 60, desc: "恢復 250 點 HP" },
    { id: "pot_large", name: "高級急救藥水", type: "potion", heal: 700, cost: 180, desc: "恢復 700 點 HP" }
];
