export interface Job {
    id: number;
    subIDs?: number[];
    name: string;
    icon: string;
    borderedIcon: string;
}

export const jobs: Record<string, Job> = {
    // Tanks
    DRK: {
        id: 32,
        name: "Dark Knight",
        icon: "/job-icons/drk.svg",
        borderedIcon: "/job-icons/bordered/062132_hr1.png",
    },
    GNB: {
        id: 37,
        name: "Gunbreaker",
        icon: "/job-icons/gnb.svg",
        borderedIcon: "/job-icons/bordered/062137_hr1.png",
    },
    PLD: {
        id: 19,
        subIDs: [1],
        name: "Paladin",
        icon: "/job-icons/pld.svg",
        borderedIcon: "/job-icons/bordered/062119_hr1.png",
    },
    WAR: {
        id: 21,
        subIDs: [3],
        name: "Warrior",
        icon: "/job-icons/war.svg",
        borderedIcon: "/job-icons/bordered/062121_hr1.png",
    },
    // Healers
    AST: {
        id: 33,
        name: "Astrologian",
        icon: "/job-icons/ast.svg",
        borderedIcon: "/job-icons/bordered/062133_hr1.png",
    },
    SCH: {
        id: 28,
        subIDs: [26],
        name: "Scholar",
        icon: "/job-icons/sch.svg",
        borderedIcon: "/job-icons/bordered/062128_hr1.png",
    },
    SGE: {
        id: 40,
        name: "Sage",
        icon: "/job-icons/sge.svg",
        borderedIcon: "/job-icons/bordered/062140_hr1.png",
    },
    WHM: {
        id: 24,
        subIDs: [6],
        name: "White Mage",
        icon: "/job-icons/whm.svg",
        borderedIcon: "/job-icons/bordered/062124_hr1.png",
    },
    // Melee
    DRG: {
        id: 22,
        subIDs: [4],
        name: "Dragoon",
        icon: "/job-icons/drg.svg",
        borderedIcon: "/job-icons/bordered/062122_hr1.png",
    },
    MNK: {
        id: 20,
        subIDs: [2],
        name: "Monk",
        icon: "/job-icons/mnk.svg",
        borderedIcon: "/job-icons/bordered/062120_hr1.png",
    },
    NIN: {
        id: 30,
        subIDs: [29],
        name: "Ninja",
        icon: "/job-icons/nin.svg",
        borderedIcon: "/job-icons/bordered/062130_hr1.png",
    },
    RPR: {
        id: 39,
        name: "Reaper",
        icon: "/job-icons/rpr.svg",
        borderedIcon: "/job-icons/bordered/062139_hr1.png",
    },
    SAM: {
        id: 34,
        name: "Samurai",
        icon: "/job-icons/sam.svg",
        borderedIcon: "/job-icons/bordered/062134_hr1.png",
    },
    VPR: {
        id: -1,
        name: "Viper",
        icon: "/job-icons/vpr.svg",
        borderedIcon: "/job-icons/bordered/vpr_bordered_temp.png",
    },
    // Phys Ranged
    BRD: {
        id: 23,
        subIDs: [5],
        name: "Bard",
        icon: "/job-icons/brd.svg",
        borderedIcon: "/job-icons/bordered/062123_hr1.png",
    },
    DNC: {
        id: 38,
        name: "Dancer",
        icon: "/job-icons/dnc.svg",
        borderedIcon: "/job-icons/bordered/062138_hr1.png",
    },
    MCH: {
        id: 31,
        name: "Machinist",
        icon: "/job-icons/mch.svg",
        borderedIcon: "/job-icons/bordered/062131_hr1.png",
    },
    // Casters
    BLM: {
        id: 25,
        subIDs: [7],
        name: "Black Mage",
        icon: "/job-icons/blm.svg",
        borderedIcon: "/job-icons/bordered/062125_hr1.png",
    },
    RDM: {
        id: 35,
        name: "Red Mage",
        icon: "/job-icons/rdm.svg",
        borderedIcon: "/job-icons/bordered/062135_hr1.png",
    },
    SMN: {
        id: 27,
        subIDs: [26],
        name: "Summoner",
        icon: "/job-icons/smn.svg",
        borderedIcon: "/job-icons/bordered/062127_hr1.png",
    },
    PCT: {
        id: -2,
        name: "Pictomancer",
        icon: "/job-icons/pct.svg",
        borderedIcon: "/job-icons/bordered/pct_bordered_temp.png",
    },
} as const;

export const tanks = ['DRK', 'GNB', 'PLD', 'WAR'] as const;
export const healers = ['AST', 'SCH', 'SGE', 'WHM'] as const;
export const melee = ['DRG', 'MNK', 'NIN', 'RPR', 'SAM', 'VPR'] as const;
export const physRanged = ['BRD', 'DNC', 'MCH'] as const;
export const casters = ['BLM', 'RDM', 'SMN', 'PCT'] as const;
