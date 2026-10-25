const RACES = {
    western_human: { id: "western_human", name: "西方人族", desc: "各項能力均衡發展。", mod: { str: 1.0, con: 1.0, mnd: 1.0, dex: 1.0, agi: 1.0, luk: 1.0 } },
    elf: { id: "elf", name: "精靈", desc: "精神與靈巧極高，擅長遠距。", mod: { str: 0.7, con: 0.8, mnd: 1.35, dex: 1.2, agi: 1.1, luk: 1.0 } },
    dwarf: { id: "dwarf", name: "矮人", desc: "擁有極高體質與防禦。", mod: { str: 1.2, con: 1.4, mnd: 0.8, dex: 0.8, agi: 0.8, luk: 1.1 } }
};

const HERO_NAMES = {
    male: ["亞瑟", "洛克", "卡爾", "格雷"],
    female: ["莉莉絲", "艾莉亞", "席娜", "海倫娜"]
};

const ITEMS_DATABASE = [
    { id: "pot_small", name: "初級回復藥水", type: "potion", category: "potion", heal: 80, cost: 30, sell: 10, desc: "恢復 80 點生命值" },
    { id: "iron_sword", name: "鐵劍", type: "equipment", slot: "weapon", category: "equipment", equipType: "sword", range: 1, atk: 15, cost: 120, sell: 40, desc: "近戰長劍 (射程:1)" },
    { id: "wooden_bow", name: "獵弓", type: "equipment", slot: "weapon", category: "equipment", equipType: "bow", range: 3, atk: 12, dex: 5, cost: 120, sell: 40, desc: "遠程木弓 (射程:3)" },
    { id: "apprentice_staff", name: "學徒短杖", type: "equipment", slot: "weapon", category: "equipment", equipType: "staff", range: 2, matk: 18, mnd: 4, cost: 180, sell: 60, desc: "魔力木杖 (射程:2)" }
];

const DUNGEONS = [
    {
        id: "goblin_cave", name: "第 1 層：哥布林洞窟", tier: 1,
        frontMobs: [
            { id: "goblin", name: "哥布林戰士", hp: 320, atk: 45, def: 12, spd: 14, range: 1, exp: 30, gold: 15 }
        ],
        backMobs: [
            { id: "goblin_archer", name: "哥布林弓手", hp: 250, atk: 55, def: 8, spd: 16, range: 3, exp: 35, gold: 18 }
        ],
        boss: { id: "goblin_king", name: "哥布林萬人王 [Boss]", hp: 2500, atk: 120, def: 35, spd: 18, range: 1, exp: 300, gold: 200 }
    }
];

const SKILLS = {
    tackle: { id: "tackle", name: "撞擊", type: "attack", actionCd: 2, power: 1.2, desc: "造成 120% 傷害 (CD:2行動)" },
    bash: { id: "bash", name: "重擊", type: "attack", actionCd: 3, power: 1.6, desc: "造成 160% 物理傷害 (CD:3行動)" },
    power_shot: { id: "power_shot", name: "強力射擊", type: "attack", actionCd: 3, power: 1.8, desc: "精準遠程狙擊 (CD:3行動)" },
    firebolt: { id: "firebolt", name: "火彈術", type: "attack", actionCd: 2, power: 1.9, desc: "元素魔法攻擊 (CD:2行動)" }
};

const JOBS = {
    novice: { id: "novice", name: "無業遊民", tier: 0, allowedEquip: ["all"], unlockSkills: { 1: "tackle" } },
    warrior: { id: "warrior", name: "戰士", tier: 1, req: { str: 15 }, allowedEquip: ["sword", "axe"], unlockSkills: { 1: "bash" } },
    archer: { id: "archer", name: "弓箭手", tier: 1, req: { dex: 15 }, allowedEquip: ["bow"], unlockSkills: { 1: "power_shot" } },
    apprentice: { id: "apprentice", name: "魔法學徒", tier: 1, req: { mnd: 15 }, allowedEquip: ["staff"], unlockSkills: { 1: "firebolt" } }
};
