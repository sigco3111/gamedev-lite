
import { GameGenre, GameTheme, GamePlatform, StaffMember, StaffSkills, StaffStatus, GameEngine, SpecialistRole, SpecialistRoleConfig, OfficeUpgrade, AwardCategory, CompetitorCompany } from './types';

export const INITIAL_FUNDS = 84000; // Increased by 20% from 70000
export const INITIAL_YEAR = 1980;
export const INITIAL_MONTH = 1;
export const INITIAL_RESEARCH_POINTS = 100; // Remains for now, but less directly used
export const MONTHS_PER_YEAR = 12;

export const BASE_STAFF_SALARY = 500; // Increased
export const STAFF_SALARY_PER_SKILL_POINT = 50; // Increased

export const MAX_STAFF_COUNT = 8;

// Staff Energy, Burnout, Vacation
export const BASE_MAX_ENERGY = 100;
export const ENERGY_RECOVERY_PER_IDLE_MONTH = 4;
export const ENERGY_DECREASE_PER_MONTH_WORKING = 7;
export const BURNOUT_THRESHOLD = 10;
export const LOW_ENERGY_PERFORMANCE_PENALTY_THRESHOLD = 30;
export const LOW_ENERGY_PERFORMANCE_MULTIPLIER = 0.6;
export const FORCED_VACATION_DURATION_MONTHS = 2;
export const VOLUNTARY_VACATION_DURATION_MONTHS = 1;
export const ENERGY_RECOVERY_PER_VACATION_MONTH = 35;
export const VOLUNTARY_VACATION_COST_FLAT = 3000; // Increased

export const STAFF_STATUS_KOREAN_NAMES: Record<StaffStatus, string> = {
  idle: "대기 중",
  working_on_game: "게임 개발 중",
  training: "교육 중",
  on_vacation: "휴가 중",
  burnt_out: "번아웃 (강제 휴가)",
  developing_engine: "엔진 개발 중",
};

// Game Engines
export const MAX_STAFF_ON_ENGINE_PROJECT = 3;
export const INITIAL_ENGINES: Omit<GameEngine, 'status'>[] = [ // Status removed, managed by researchLevel
  {
    id: 'eng_basic_2d',
    name: '기본 2D 엔진',
    description: '간단한 2D 게임 개발을 위한 초기 엔진입니다. 약간의 개발 속도 향상을 제공합니다.',
    researchCost: 750, // Base cost for L1 blueprint, Increased significantly
    developmentMonthsRequired: 3, // Increased
    benefits: { speedBoost: 0.05, funBoost: 0.02 },
    researchLevel: 0, maxResearchLevel: 3,
  },
  {
    id: 'eng_adv_gfx',
    name: '고급 그래픽 엔진',
    description: '향상된 그래픽 표현력을 제공하여 게임의 시각적 품질을 높입니다.',
    researchCost: 3000, // Increased significantly
    developmentMonthsRequired: 7, // Increased
    benefits: { graphicsBoost: 0.15, bugReductionFactor: 0.95 },
    researchLevel: 0, maxResearchLevel: 4,
  },
  {
    id: 'eng_rpg_master',
    name: 'RPG 마스터 엔진',
    description: 'RPG 장르 게임 개발에 특화된 엔진으로, 창의성과 재미를 크게 향상시킵니다.',
    researchCost: 6000, // Increased significantly
    developmentMonthsRequired: 9, // Increased
    benefits: { creativityBoost: 0.20, funBoost: 0.15, programmingBoost: 0.05 },
    researchLevel: 0, maxResearchLevel: 5,
  },
  {
    id: 'eng_sim_core',
    name: '시뮬레이션 코어',
    description: '시뮬레이션 게임의 복잡한 로직 처리를 돕고 혁신성을 증대시킵니다.',
    researchCost: 5000, // Increased significantly
    developmentMonthsRequired: 8, // Increased
    benefits: { innovationBoost: 0.20, programmingBoost: 0.10, bugReductionFactor: 0.90 },
    researchLevel: 0, maxResearchLevel: 5,
  }
];

// Specialist Roles
export const SPECIALIST_ROLE_KOREAN_NAMES: Record<SpecialistRole, string> = {
  [SpecialistRole.NONE]: "없음",
  [SpecialistRole.LEAD_PROGRAMMER]: "리드 프로그래머",
  [SpecialistRole.ART_DIRECTOR]: "아트 디렉터",
  [SpecialistRole.SOUND_LEAD]: "사운드 리드",
  [SpecialistRole.LEAD_DESIGNER]: "리드 디자이너",
  [SpecialistRole.MARKETING_GURU]: "마케팅 전문가",
  [SpecialistRole.SPEED_DEMON]: "개발 귀재",
};

export const SPECIALIST_ROLES_CONFIG: Record<Exclude<SpecialistRole, SpecialistRole.NONE>, SpecialistRoleConfig> = {
  [SpecialistRole.LEAD_PROGRAMMER]: { name: "리드 프로그래머", description: "프로젝트의 프로그래밍 효율과 코드 품질을 향상시킵니다. 버그 발생률 감소.", primaryStatReq: 'programming', minPrimaryStat: 15, costToAssign: 12000, salaryIncreaseFactor: 1.20, bonuses: { programmingBoost: 0.1, bugReductionFactor: 0.90 }}, // Cost up, salary factor up
  [SpecialistRole.ART_DIRECTOR]: { name: "아트 디렉터", description: "프로젝트의 시각적 품질을 극대화합니다.", primaryStatReq: 'graphics', minPrimaryStat: 15, costToAssign: 12000, salaryIncreaseFactor: 1.20, bonuses: { graphicsBoost: 0.15 }}, // Cost up, salary factor up
  [SpecialistRole.SOUND_LEAD]: { name: "사운드 리드", description: "프로젝트의 사운드 품질을 향상시키고 몰입도를 높입니다.", primaryStatReq: 'sound', minPrimaryStat: 12, costToAssign: 10000, salaryIncreaseFactor: 1.18, bonuses: { soundBoost: 0.15 }}, // Cost up, salary factor up
  [SpecialistRole.LEAD_DESIGNER]: { name: "리드 디자이너", description: "게임의 재미와 창의성을 증폭시킵니다.", primaryStatReq: 'creativity', minPrimaryStat: 15, costToAssign: 13000, salaryIncreaseFactor: 1.20, bonuses: { funBoost: 0.1, creativityBoost: 0.1 }}, // Cost up, salary factor up
  [SpecialistRole.MARKETING_GURU]: { name: "마케팅 전문가", description: "게임 마케팅 예산의 효율을 증대시키고 초기 인지도를 높입니다.", primaryStatReq: 'marketing', minPrimaryStat: 12, costToAssign: 9000, salaryIncreaseFactor: 1.15, bonuses: { marketingEffectivenessBoost: 0.2 }}, // Cost up, salary factor up
  [SpecialistRole.SPEED_DEMON]: { name: "개발 귀재", description: "모든 작업에서 개인의 개발 속도를 크게 향상시킵니다.", primaryStatReq: 'speed', minPrimaryStat: 12, costToAssign: 15000, salaryIncreaseFactor: 1.22, bonuses: { speedBoost: 0.2 }}, // Cost up, salary factor up
};
export const MAX_SPECIALISTS_PER_ROLE = 1;


// Franchise & Sequel Constants
export const MIN_SCORE_FOR_FRANCHISE_STARTER = 7.0;
export const SEQUEL_HYPE_BONUS_PER_PREVIOUS_SCORE_POINT = 5;
export const SEQUEL_POINT_CARRYOVER_FACTOR = 0.10;
export const FRANCHISE_NAME_PREFIXES = ["대서사시", "연대기", "모험", "귀환"];
export const FRANCHISE_NAME_SUFFIXES = ["세계관", "유산", "의 부활", "재탄생"];


export const DEFAULT_GENRES: GameGenre[] = [
  { id: 'g1', name: 'RPG', researchCost: 200, basePoints: { fun: 20, innovation: 15 }, researchLevel: 1, maxResearchLevel: 7 }, // Starts at L1, cost is for L2+
  { id: 'g2', name: '액션', researchCost: 1200, basePoints: { fun: 25, innovation: 10 }, researchLevel: 0, maxResearchLevel: 5 }, // Cost up
  { id: 'g3', name: '시뮬레이션', researchCost: 1800, basePoints: { fun: 15, innovation: 25 }, researchLevel: 0, maxResearchLevel: 6 }, // Cost up
  { id: 'g4', name: '전략', researchCost: 2200, basePoints: { fun: 18, innovation: 20 }, researchLevel: 0, maxResearchLevel: 6 }, // Cost up
  { id: 'g5', name: '퍼즐', researchCost: 1000, basePoints: { fun: 30, innovation: 5 }, researchLevel: 0, maxResearchLevel: 4 }, // Cost up
  { id: 'g6', name: '슈팅', researchCost: 1300, basePoints: { fun: 28, innovation: 8 }, researchLevel: 0, maxResearchLevel: 5 }, // Cost up
  { id: 'g7', name: '격투', researchCost: 1900, basePoints: { fun: 22, innovation: 12 }, researchLevel: 0, maxResearchLevel: 4 }, // Cost up
  { id: 'g8', name: '레이싱', researchCost: 1800, basePoints: { fun: 26, innovation: 10 }, researchLevel: 0, maxResearchLevel: 4 }, // Cost up
  { id: 'g9', name: '스포츠', researchCost: 1850, basePoints: { fun: 24, innovation: 11 }, researchLevel: 0, maxResearchLevel: 4 }, // Cost up
  { id: 'g10', name: '어드벤처', researchCost: 2400, basePoints: { fun: 18, innovation: 28 }, researchLevel: 0, maxResearchLevel: 6 }, // Cost up
  { id: 'g11', name: '음악/리듬', researchCost: 2700, basePoints: { fun: 32, innovation: 18 }, researchLevel: 0, maxResearchLevel: 5 }, // Cost up
  { id: 'g12', name: '교육', researchCost: 600, basePoints: { fun: 10, innovation: 15 }, researchLevel: 0, maxResearchLevel: 3 }, // Cost up
  { id: 'g13', name: '보드게임', researchCost: 750, basePoints: { fun: 20, innovation: 10 }, researchLevel: 0, maxResearchLevel: 3 }, // Cost up
  { id: 'g14', name: '카드게임', researchCost: 950, basePoints: { fun: 22, innovation: 13 }, researchLevel: 0, maxResearchLevel: 4 }, // Cost up
  { id: 'g15', name: '경영 시뮬레이션', researchCost: 3000, basePoints: { fun: 12, innovation: 35 }, researchLevel: 0, maxResearchLevel: 7 }, // Cost up
  { id: 'g16', name: '핵앤슬래시', researchCost: 2100, basePoints: { fun: 30, innovation: 9 }, researchLevel: 0, maxResearchLevel: 5 }, // Cost up
  { id: 'g17', name: '비주얼 노벨', researchCost: 700, basePoints: { fun: 15, innovation: 20 }, researchLevel: 0, maxResearchLevel: 3 }, // Cost up
  { id: 'g18', name: '생존', researchCost: 2500, basePoints: { fun: 18, innovation: 22 }, researchLevel: 0, maxResearchLevel: 5 }, // Cost up
  { id: 'g19', name: '로그라이크', researchCost: 2800, basePoints: { fun: 25, innovation: 30 }, researchLevel: 0, maxResearchLevel: 6 }, // Cost up
  { id: 'g20', name: '메트로배니아', researchCost: 2900, basePoints: { fun: 20, innovation: 25 }, researchLevel: 0, maxResearchLevel: 5 }, // Cost up
];

export const DEFAULT_THEMES: GameTheme[] = [
  { id: 't1', name: '판타지', researchCost: 150, pointMultiplier: { creativity: 1.2, graphics: 1.1 }, researchLevel: 1, maxResearchLevel: 7 }, // Starts at L1
  { id: 't2', name: 'SF', researchCost: 600, pointMultiplier: { programming: 1.1, sound: 1.2 }, researchLevel: 0, maxResearchLevel: 5 }, // Cost up
  { id: 't3', name: '역사', researchCost: 750, pointMultiplier: { creativity: 1.15, fun: 1.05 }, researchLevel: 0, maxResearchLevel: 4 }, // Cost up
  { id: 't4', name: '현대', researchCost: 450, pointMultiplier: { fun: 1.1, graphics: 1.05 }, researchLevel: 0, maxResearchLevel: 4 }, // Cost up
  { id: 't5', name: '추상', researchCost: 1100, pointMultiplier: { programming: 1.2, innovation: 1.2 }, researchLevel: 0, maxResearchLevel: 3 }, // Cost up
  { id: 't6', name: '공포', researchCost: 900, pointMultiplier: { sound: 1.25, creativity: 1.1 }, researchLevel: 0, maxResearchLevel: 5 }, // Cost up
  { id: 't7', name: '미스터리', researchCost: 950, pointMultiplier: { creativity: 1.2, innovation: 1.1 }, researchLevel: 0, maxResearchLevel: 4 }, // Cost up
  { id: 't8', name: '서부극', researchCost: 700, pointMultiplier: { graphics: 1.15, fun: 1.05 }, researchLevel: 0, maxResearchLevel: 3 }, // Cost up
  { id: 't9', name: '사이버펑크', researchCost: 1300, pointMultiplier: { programming: 1.15, graphics: 1.15, innovation: 1.1 }, researchLevel: 0, maxResearchLevel: 6 }, // Cost up
  { id: 't10', name: '스팀펑크', researchCost: 1200, pointMultiplier: { creativity: 1.1, graphics: 1.2, programming: 1.05 }, researchLevel: 0, maxResearchLevel: 5 }, // Cost up
  { id: 't11', name: '일상', researchCost: 500, pointMultiplier: { fun: 1.15, creativity: 1.05 }, researchLevel: 0, maxResearchLevel: 3 }, // Cost up
  { id: 't12', name: '요리', researchCost: 600, pointMultiplier: { fun: 1.2, graphics: 1.05 }, researchLevel: 0, maxResearchLevel: 4 }, // Cost up
  { id: 't13', name: '연애', researchCost: 700, pointMultiplier: { creativity: 1.25, fun: 1.1 }, researchLevel: 0, maxResearchLevel: 4 }, // Cost up
  { id: 't14', name: '슈퍼히어로', researchCost: 1000, pointMultiplier: { graphics: 1.2, programming: 1.1, fun: 1.1 }, researchLevel: 0, maxResearchLevel: 5 }, // Cost up
  { id: 't15', name: '포스트 아포칼립스', researchCost: 1400, pointMultiplier: { creativity: 1.1, sound: 1.15, innovation: 1.15 }, researchLevel: 0, maxResearchLevel: 5 }, // Cost up
  { id: 't16', name: '해적', researchCost: 800, pointMultiplier: { graphics: 1.15, fun: 1.1, creativity: 1.05 }, researchLevel: 0, maxResearchLevel: 4 }, // Cost up
  { id: 't17', name: '닌자/사무라이', researchCost: 900, pointMultiplier: { programming: 1.1, graphics: 1.1 }, researchLevel: 0, maxResearchLevel: 4 }, // Cost up
  { id: 't18', name: '마법학교', researchCost: 1100, pointMultiplier: { creativity: 1.3, graphics: 1.1 }, researchLevel: 0, maxResearchLevel: 6 }, // Cost up
  { id: 't19', name: '탐정', researchCost: 980, pointMultiplier: { creativity: 1.2, innovation: 1.15 }, researchLevel: 0, maxResearchLevel: 4 }, // Cost up
  { id: 't20', name: '전쟁', researchCost: 1250, pointMultiplier: { programming: 1.15, graphics: 1.1, innovation: 1.1 }, researchLevel: 0, maxResearchLevel: 5 }, // Cost up
];

export const DEFAULT_PLATFORMS: GamePlatform[] = [
  { id: 'p1', name: '아케이드', marketShare: 0.7, licenseCost: 1500, researchCost: 375, releaseYear: 1980, researchLevel: 1, maxResearchLevel: 3 },
  { id: 'p2', name: 'PC-80', marketShare: 0.4, licenseCost: 6000, researchCost: 1500, releaseYear: 1982, researchLevel: 0, maxResearchLevel: 4 },
  { id: 'p3', name: '가정용 콘솔 X', marketShare: 0.6, licenseCost: 15000, researchCost: 3750, releaseYear: 1985, researchLevel: 0, maxResearchLevel: 5 },
  { id: 'p4', name: '슈퍼 시스템', marketShare: 0.8, licenseCost: 30000, researchCost: 7500, releaseYear: 1990, researchLevel: 0, maxResearchLevel: 5 },
  { id: 'p5', name: '휴대용 게임기 알파', marketShare: 0.5, licenseCost: 22000, researchCost: 5500, releaseYear: 1989, researchLevel: 0, maxResearchLevel: 4 },
  { id: 'p6', name: '게임 스테이션', marketShare: 0.85, licenseCost: 45000, researchCost: 11250, releaseYear: 1994, researchLevel: 0, maxResearchLevel: 6 },
  { id: 'p7', name: 'PC-98 호환기종', marketShare: 0.3, licenseCost: 12000, researchCost: 3000, releaseYear: 1991, researchLevel: 0, maxResearchLevel: 3 },
  { id: 'p8', name: '드림기어', marketShare: 0.75, licenseCost: 37000, researchCost: 9250, releaseYear: 1998, researchLevel: 0, maxResearchLevel: 5 },
  { id: 'p9', name: '플레이박스', marketShare: 0.9, licenseCost: 60000, researchCost: 15000, releaseYear: 2001, researchLevel: 0, maxResearchLevel: 6 },
  { id: 'p10', name: '넥서스 콘솔', marketShare: 0.95, licenseCost: 75000, researchCost: 18750, releaseYear: 2005, researchLevel: 0, maxResearchLevel: 7 },
];

export const INITIAL_STAFF: Omit<StaffMember, 'id' | 'status' | 'trainingSkill' | 'trainingMonthsRemaining' | 'vacationMonthsRemaining' | 'specialistRole' | 'monthsInCurrentRole'>[] = [
  {
    name: '신희정',
    programming: 5, graphics: 3, sound: 2, creativity: 4, marketing: 1, speed: 5,
    salary: BASE_STAFF_SALARY + (5+3+2+4+1+5) * STAFF_SALARY_PER_SKILL_POINT, energy: BASE_MAX_ENERGY,
  },
  {
    name: '이상재',
    programming: 2, graphics: 5, sound: 4, creativity: 6, marketing: 2, speed: 4,
    salary: BASE_STAFF_SALARY + (2+5+4+6+2+4) * STAFF_SALARY_PER_SKILL_POINT, energy: BASE_MAX_ENERGY,
  },
];

export const KOREAN_NAMES_POOL: string[] = [
  "김민준", "이서준", "박도윤", "최주원", "정하준",
  "강지호", "윤시우", "임예준", "오서진", "한선우",
  "송유준", "권은우", "황지안", "안현우", "홍로운",
  "고건우", "문이안", "배수호", "조아인", "우지후",
  "신이준", "허준서", "남유찬", "유이현", "채은성",
  "천시윤", "임도현", "나하람", "차지한", "서라온",
  "백서윤", "송지유", "장하윤", "노서아", "홍지아",
  "강하은", "김아윤", "이지우", "박수아", "최아린",
  "정다은", "윤예린", "임유나", "오시아", "한예나",
  "권이서", "황도아", "안예서", "배예원", "조로아"
];


export const GAME_DEV_STAGES_MONTHS = {
    planning: 1,
    developing: 3,
    polishing: 1,
};

export const MAX_GAME_NAME_LENGTH = 30;
export const NOTIFICATION_LIMIT = 7;

export const GAME_POINT_PER_SKILL = 2.5; // Increased from 0.55
export const BUG_GENERATION_CHANCE = 0.18;
export const BUGS_PER_EVENT = 4;
export const HYPE_PER_MARKETING_DOLLAR = 0.0012;
export const HYPE_DECAY_RATE = 4;

// Staff Training Constants
export const TRAINING_COST_PER_MONTH = 2000; // Increased significantly
export const TRAINING_MONTHS_DURATION = 3;
export const BASE_TRAINING_SKILL_INCREASE = 2;
export const TOTAL_TRAINING_COST = TRAINING_COST_PER_MONTH * TRAINING_MONTHS_DURATION;

export const SKILL_KOREAN_NAMES: Record<keyof StaffSkills, string> = {
  programming: "프로그래밍",
  graphics: "그래픽",
  sound: "사운드",
  creativity: "창의력",
  marketing: "마케팅",
  speed: "속도",
};
export const TRAINABLE_SKILLS: (keyof StaffSkills)[] = ["programming", "graphics", "sound", "creativity", "marketing", "speed"];


// Office Upgrades
export const DEFAULT_OFFICE_UPGRADES: OfficeUpgrade[] = [
  {
    id: 'ergonomic_chairs',
    categoryName: '업무 환경',
    upgradeName: '인체공학 의자',
    currentLevel: 0,
    tiers: [
      { level: 1, name: '기본형', description: '기본적인 편안함을 제공하여 직원들의 피로를 약간 덜어줍니다.', cost: 12000, effects: { staffEnergyRecoveryBoost: 0.2, staffMaxEnergyBoost: 2 } }, // Cost up
      { level: 2, name: '고급형', description: '향상된 지지력으로 자세를 교정하고 집중력을 높입니다.', cost: 35000, effects: { staffEnergyRecoveryBoost: 0.5, staffMaxEnergyBoost: 5 } }, // Cost up
      { level: 3, name: '최상급', description: '최고급 소재와 설계로 장시간 근무에도 최적의 컨디션을 유지시켜줍니다.', cost: 70000, effects: { staffEnergyRecoveryBoost: 0.8, staffMaxEnergyBoost: 10, globalSpeedBoost: 0.02 } }, // Cost up
    ],
  },
  {
    id: 'coffee_machine',
    categoryName: '휴게 공간',
    upgradeName: '커피 머신',
    currentLevel: 0,
    tiers: [
      { level: 1, name: '캡슐 커피 머신', description: '간편하게 커피를 즐길 수 있어 업무 효율을 약간 향상시킵니다.', cost: 9000, effects: { globalSpeedBoost: 0.01, passiveHypeGeneration: 0.1 } }, // Cost up
      { level: 2, name: '전자동 에스프레소 머신', description: '다양한 고급 커피를 제공하여 직원 만족도와 개발 속도를 높입니다.', cost: 28000, effects: { globalSpeedBoost: 0.02, passiveHypeGeneration: 0.25 } }, // Cost up
    ],
  },
  {
    id: 'dev_computers',
    categoryName: '개발 도구',
    upgradeName: '개발용 컴퓨터',
    currentLevel: 0,
    tiers: [
      { level: 1, name: '중급 사양 PC', description: '표준적인 개발 작업에 적합한 성능을 제공합니다.', cost: 40000, effects: { globalSpeedBoost: 0.03, trainingEffectivenessBoost: 0.05 } }, // Cost up
      { level: 2, name: '고급 워크스테이션', description: '복잡한 작업도 원활하게 처리하여 개발 효율을 크게 향상시킵니다.', cost: 90000, effects: { globalSpeedBoost: 0.06, trainingEffectivenessBoost: 0.10, bugReductionFactor: 0.97 } }, // Cost up
      { level: 3, name: '최첨단 슈퍼컴퓨터 액세스', description: '업계 최고 수준의 연산 능력으로 개발 속도와 품질을 극대화합니다.', cost: 200000, effects: { globalSpeedBoost: 0.10, trainingEffectivenessBoost: 0.15, bugReductionFactor: 0.93, globalCreativityBoost: 0.03 } }, // Cost up
    ],
  },
  {
    id: 'company_library',
    categoryName: '교육 시설',
    upgradeName: '사내 도서관',
    currentLevel: 0,
    tiers: [
      { level: 1, name: '기술 서적 코너', description: '개발 관련 서적들을 비치하여 직원들의 학습을 돕습니다.', cost: 25000, effects: { trainingEffectivenessBoost: 0.08 } }, // Cost up
      { level: 2, name: '종합 자료실', description: '다양한 분야의 전문 서적과 온라인 강의 구독으로 직원 역량 강화에 기여합니다.', cost: 60000, effects: { trainingEffectivenessBoost: 0.15, globalCreativityBoost: 0.02 } }, // Cost up
    ],
  }
];

// Game Awards
export const INITIAL_COMPANY_REPUTATION = 0;
export const HALL_OF_FAME_THRESHOLD_SCORE = 9.0;

export interface AwardConfig {
  displayName: string;
  prizeMoney: number;
  reputationGain: number;
  genreId?: string;
}

export const AWARD_CONFIGS: Record<AwardCategory, AwardConfig> = {
  [AwardCategory.GAME_OF_THE_YEAR]: { displayName: "올해의 게임", prizeMoney: 250000, reputationGain: 50 },
  [AwardCategory.BEST_RPG_GAME]: { displayName: "최고 RPG 게임", prizeMoney: 50000, reputationGain: 10, genreId: 'g1' },
  [AwardCategory.BEST_ACTION_GAME]: { displayName: "최고 액션 게임", prizeMoney: 50000, reputationGain: 10, genreId: 'g2' },
  [AwardCategory.BEST_SIMULATION_GAME]: { displayName: "최고 시뮬레이션 게임", prizeMoney: 50000, reputationGain: 10, genreId: 'g3' },
  [AwardCategory.BEST_STRATEGY_GAME]: { displayName: "최고 전략 게임", prizeMoney: 50000, reputationGain: 10, genreId: 'g4' },
  [AwardCategory.BEST_GRAPHICS]: { displayName: "최고 그래픽상", prizeMoney: 30000, reputationGain: 5 },
  [AwardCategory.BEST_SOUND]: { displayName: "최고 사운드상", prizeMoney: 30000, reputationGain: 5 },
  [AwardCategory.BEST_CREATIVITY]: { displayName: "최고 창의력상", prizeMoney: 30000, reputationGain: 5 },
  [AwardCategory.BEST_SELLER]: { displayName: "최고 판매량상", prizeMoney: 100000, reputationGain: 15 },
  [AwardCategory.HALL_OF_FAME_INDUCTION]: { displayName: "명예의 전당 입성", prizeMoney: 0, reputationGain: 25 },
};

export const TARGET_AWARD_GENRE_CATEGORIES: AwardCategory[] = [
    AwardCategory.BEST_RPG_GAME,
    AwardCategory.BEST_ACTION_GAME,
    AwardCategory.BEST_SIMULATION_GAME,
    AwardCategory.BEST_STRATEGY_GAME,
];

// Targeted Marketing Push
export const TARGETED_MARKETING_PUSH_COST = 30000; // Increased
export const TARGETED_MARKETING_PUSH_DURATION_MONTHS = 3;
export const TARGETED_MARKETING_PUSH_INITIAL_HYPE_BOOST = 18;
export const TARGETED_MARKETING_PUSH_MONTHLY_HYPE_BOOST = 8;
export const TARGETED_MARKETING_PUSH_REPUTATION_BOOST_ON_COMPLETION = 10;
export const MARKETING_PUSH_ELIGIBILITY_MONTHS_POST_RELEASE = 6;


// Competitor Constants
export const INITIAL_COMPETITORS: Omit<CompetitorCompany, 'activeProject' | 'releasedGames' | 'monthsSinceLastGameRelease' | 'failedProjectStreak'>[] = [
  { id: 'comp1', name: '알파 게임즈', funds: 90000, reputation: 45, skillLevel: 4, preferredGenreIds: ['g1', 'g2'], preferredThemeIds: ['t1', 't6'] },
  { id: 'comp2', name: '바이트 버스터즈', funds: 120000, reputation: 55, skillLevel: 5, preferredGenreIds: ['g3', 'g4'], preferredThemeIds: ['t2', 't3'] },
  { id: 'comp3', name: '픽셀 파이오니어', funds: 70000, reputation: 35, skillLevel: 3, preferredGenreIds: ['g5', 'g12'], preferredThemeIds: ['t4', 't11'] },
  { id: 'comp4', name: '퀀텀 립 스튜디오', funds: 150000, reputation: 60, skillLevel: 6, preferredGenreIds: ['g10', 'g19', 't2'], preferredThemeIds: ['t2', 't9', 't15'] }, // Sci-fi, Adventure, Roguelike
  { id: 'comp5', name: '스토리위버 인터랙티브', funds: 100000, reputation: 50, skillLevel: 4, preferredGenreIds: ['g1', 'g10', 'g17'], preferredThemeIds: ['t1', 't7', 't18'] }, // RPG, Adventure, Visual Novel, Fantasy focus
  { id: 'comp6', name: '픽셀 퍼펙트 레트로', funds: 60000, reputation: 30, skillLevel: 5, preferredGenreIds: ['g5', 'g13', 'g20'], preferredThemeIds: ['t5', 't8'] }, // Puzzle, Boardgame, Metroidvania, Abstract/Western
];

export const COMPETITOR_MAX_RELEASED_GAMES_HISTORY = 5;
export const COMPETITOR_BASE_DEV_MONTHS = 12;
export const COMPETITOR_MIN_FUNDS_TO_START_PROJECT = 25000;
export const COMPETITOR_MONTHLY_OPERATIONAL_COST_PER_SKILL = 600; // Decreased from 700
export const COMPETITOR_GAME_PRICE = 25; // Increased from 20
export const COMPETITOR_PROJECT_COOLDOWN_MONTHS = 0; // Changed from 1
export const COMPETITOR_GAME_DEV_COST_PER_SKILL_MONTH = 1200; // Decreased from 1500
export const COMPETITOR_REPUTATION_GAIN_PER_SUCCESSFUL_GAME = 5; // Increased from 3
export const COMPETITOR_SKILL_GAIN_CHANCE_ON_SUCCESS = 0.45; // Increased from 0.3
export const COMPETITOR_START_NEW_PROJECT_BASE_CHANCE = 0.80; // Changed from 0.50
// The quality calculation is in App.tsx ( (currentComp.skillLevel * 10) + ... ) so that change is there
