// 1. 六大基礎屬性：STR(力量), CON(體質), MND(精神), DEX(靈巧), AGI(敏捷), LUK(幸運)

// 2. 隨機生成角色名字庫 (分性別)
const HERO_NAMES = {
    male: ["亞瑟", "洛克", "卡爾", "格雷", "克里斯", "蘭斯洛特", "高文", "凱爾"],
    female: ["莉莉絲", "艾莉亞", "席娜", "海倫娜", "桂妮薇兒", "莫甘娜", "露西", "伊娃"]
};

// 3. 職業定義與門檻 (萬年騎士團式轉職門檻)
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

    // 三階專精職業
    archmage: { id: "archmage", name: "大魔導師", tier: 3, req: { mnd: 60 }, isMastery: true, skills: ["meteor"] },
    cardinal: { id: "cardinal", name: "神官", tier: 3, req: { mnd: 45, con: 45 }, isMastery: true, skills: ["divine_blessing"] }
};

// 4. 地下城資料
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
    }
];

// 5. 商店藥水項目
const SHOP_ITEMS = [
    { id: "pot_small", name: "小型回復藥水", type: "potion", heal: 80, cost: 20, desc: "恢復 80 點 HP" },
    { id: "pot_medium", name: "濃縮回復藥水", type: "potion", heal: 250, cost: 60, desc: "恢復 250 點 HP" },
    { id: "pot_large", name: "高級急救藥水", type: "potion", heal: 700, cost: 180, desc: "恢復 700 點 HP" }
];
