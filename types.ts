
export type StaffStatus = 'idle' | 'working_on_game' | 'training' | 'on_vacation' | 'burnt_out' | 'developing_engine';

export enum SpecialistRole {
  NONE = 'NONE',
  LEAD_PROGRAMMER = 'LEAD_PROGRAMMER',
  ART_DIRECTOR = 'ART_DIRECTOR',
  SOUND_LEAD = 'SOUND_LEAD',
  LEAD_DESIGNER = 'LEAD_DESIGNER',
  MARKETING_GURU = 'MARKETING_GURU',
  SPEED_DEMON = 'SPEED_DEMON',
}

export interface SpecialistRoleConfig {
  name: string;
  description: string;
  primaryStatReq?: keyof StaffSkills;
  minPrimaryStat?: number;
  costToAssign: number;
  salaryIncreaseFactor: number;
  bonuses: {
    programmingBoost?: number;
    graphicsBoost?: number;
    soundBoost?: number;
    creativityBoost?: number;
    funBoost?: number;
    marketingEffectivenessBoost?: number;
    speedBoost?: number;
    bugReductionFactor?: number;
    researchPointBoost?: number;
  };
}

export interface StaffMember {
  id: string;
  name: string;
  programming: number;
  graphics: number;
  sound: number;
  creativity: number;
  marketing: number;
  speed: number;
  salary: number;
  energy: number;

  status: StaffStatus;
  trainingSkill?: keyof StaffSkills | null;
  trainingMonthsRemaining?: number;
  vacationMonthsRemaining?: number;

  specialistRole: SpecialistRole;
  monthsInCurrentRole: number;
}

export interface StaffSkills {
  programming: number;
  graphics: number;
  sound: number;
  creativity: number;
  marketing: number;
  speed: number;
}

export interface GameGenre {
  id: string;
  name: string;
  researchCost: number; // Base cost for one level increment
  basePoints: { fun: number; innovation: number };
  researchLevel: number;
  maxResearchLevel: number;
}

export interface GameTheme {
  id: string;
  name: string;
  researchCost: number; // Base cost for one level increment
  pointMultiplier: {
    programming?: number;
    graphics?: number;
    sound?: number;
    creativity?: number;
    fun?: number;
    innovation?: number;
  };
  researchLevel: number;
  maxResearchLevel: number;
}

export interface GamePlatform {
  id: string;
  name: string;
  marketShare: number;
  licenseCost: number;
  releaseYear: number;
  researchLevel: number;
  maxResearchLevel: number;
  researchCost?: number; // Base cost for one level increment, optional
}

export interface GameEngineBenefit {
  programmingBoost?: number;
  graphicsBoost?: number;
  soundBoost?: number;
  creativityBoost?: number;
  funBoost?: number;
  innovationBoost?: number;
  bugReductionFactor?: number;
  speedBoost?: number;
}

export type EngineStatus = 'locked' | 'developing' | 'available'; // 'unresearched' is implicit via researchLevel = 0

export interface GameEngine {
  id: string;
  name: string;
  description: string;
  researchCost: number; // Base cost for one blueprint level increment
  developmentMonthsRequired: number; // Base months, can be affected by blueprint research level
  benefits: GameEngineBenefit;
  researchLevel: number; // For the blueprint
  maxResearchLevel: number; // For the blueprint
  status?: EngineStatus; // Set only if researchLevel > 0
}

export interface GameProject {
  id: string;
  name: string;
  genre: GameGenre;
  theme: GameTheme;
  platform: GamePlatform;
  budget: number;
  developmentMonths: number;
  monthsSpent: number;
  points: {
    fun: number;
    graphics: number;
    sound: number;
    creativity: number;
    bugs: number;
  };
  assignedStaffIds: string[];
  status: 'planning' | 'developing' | 'polishing' | 'completed' | 'released';
  hype: number;
  engineUsedId?: string | null;
  isSequelToGameId?: string | null;
  franchiseName?: string;
  sequelNumber?: number;
}

export interface ReleasedGame extends GameProject {
  releaseYear: number;
  releaseMonth: number;
  reviewScore: number;
  unitsSold: number;
  revenue: number;
  canBeFranchiseStarter: boolean;
  isFranchise: boolean;
  currentHype: number;
}

export interface ActiveFranchise {
  id: string;
  name: string;
  lastGameId: string;
  lastGameScore: number;
  gamesInFranchise: number;
  genreId: string;
  themeId: string;
}

export interface OfficeUpgradeEffect {
  staffEnergyRecoveryBoost?: number;
  staffMaxEnergyBoost?: number;
  globalSpeedBoost?: number;
  globalCreativityBoost?: number;
  trainingEffectivenessBoost?: number;
  passiveHypeGeneration?: number;
  bugReductionFactor?: number;
}

export interface OfficeUpgradeTier {
  level: number;
  name: string;
  description: string;
  cost: number;
  effects: OfficeUpgradeEffect;
}

export interface OfficeUpgrade {
  id: string;
  categoryName: string;
  upgradeName: string;
  tiers: OfficeUpgradeTier[];
  currentLevel: number;
}

export enum AwardCategory {
  GAME_OF_THE_YEAR = 'GAME_OF_THE_YEAR',
  BEST_RPG_GAME = 'BEST_RPG_GAME',
  BEST_ACTION_GAME = 'BEST_ACTION_GAME',
  BEST_SIMULATION_GAME = 'BEST_SIMULATION_GAME',
  BEST_STRATEGY_GAME = 'BEST_STRATEGY_GAME',
  BEST_GRAPHICS = 'BEST_GRAPHICS',
  BEST_SOUND = 'BEST_SOUND',
  BEST_CREATIVITY = 'BEST_CREATIVITY',
  BEST_SELLER = 'BEST_SELLER',
  HALL_OF_FAME_INDUCTION = 'HALL_OF_FAME_INDUCTION',
}

export interface Award {
  id: string;
  category: AwardCategory;
  categoryDisplayName: string;
  gameId: string; // Can be player's game ID or a competitor's game ID
  gameName: string;
  year: number;
  prizeMoney: number;
  reputationGain: number;
  awardedToPlayer: boolean;
  competitorName?: string; // If awardedToPlayer is false
}

export interface TargetedMarketingPush {
  gameId: string;
  gameName: string;
  remainingMonths: number;
  totalDuration: number;
  monthlyHypeBoost: number;
  reputationBoostOnCompletion: number;
}

export type ResearchableItemType = 'genre' | 'theme' | 'platform' | 'engine_blueprint';

export interface CompetitorGameProject {
  name: string;
  genreId: string;
  themeId: string;
  platformId: string;
  monthsToCompletion: number;
  currentMonthsSpent: number;
  estimatedQuality: number; // 0-100
  baseDevelopmentMonths: number;
}

export interface CompetitorReleasedGame {
  id: string;
  name: string;
  genreId: string; // Store ID for potential filtering/matching
  themeId: string; // Store ID for potential filtering/matching
  platformId: string; // Store ID for potential filtering/matching
  genreName: string;
  themeName: string;
  platformName: string;
  reviewScore: number; // 0-10
  unitsSold: number;
  revenue: number;
  releaseYear: number;
  releaseMonth: number;
}

export interface CompetitorCompany {
  id: string;
  name: string;
  funds: number;
  reputation: number;
  skillLevel: number;
  activeProject: CompetitorGameProject | null;
  releasedGames: CompetitorReleasedGame[];
  preferredGenreIds: string[];
  preferredThemeIds: string[];
  monthsSinceLastGameRelease: number;
  failedProjectStreak: number;
}

export interface CompanyState {
  name: string;
  funds: number;
  currentYear: number;
  currentMonth: number;
  staff: StaffMember[];
  activeProject: GameProject | null;
  releasedGames: ReleasedGame[];
  researchPoints: number;
  availableGenres: GameGenre[];
  availableThemes: GameTheme[];
  availablePlatforms: GamePlatform[];
  isGameOver: boolean;
  notifications: string[];

  availableEngines: GameEngine[];
  activeEngineDevelopment: {
    engineId: string;
    staffIds: string[];
    monthsSpent: number;
    targetEngine: GameEngine;
  } | null;

  activeFranchises: ActiveFranchise[];
  officeUpgrades: OfficeUpgrade[];

  companyReputation: number;
  awardsWon: Award[];
  hallOfFameGameIds: string[];

  activeTargetedMarketingPush: TargetedMarketingPush | null;

  isDelegationModeActive: boolean;

  researchTarget: { type: ResearchableItemType; id: string; targetLevel: number } | null;
  
  competitors: CompetitorCompany[];
}

export interface FinancialRecord {
  year: number;
  month: number;
  funds: number;
}

export enum GameView {
  START_SCREEN = 'START_SCREEN',
  MAIN_DASHBOARD = 'MAIN_DASHBOARD',
  DEVELOP_GAME = 'DEVELOP_GAME',
  HIRE_STAFF = 'HIRE_STAFF',
  RESEARCH_TECH = 'RESEARCH_TECH',
  GAME_REPORT = 'GAME_REPORT',
  STAFF_TRAINING = 'STAFF_TRAINING',
  ENGINE_DEVELOPMENT = 'ENGINE_DEVELOPMENT',
  STAFF_DETAIL_MODAL = 'STAFF_DETAIL_MODAL',
  OFFICE_MANAGEMENT = 'OFFICE_MANAGEMENT',
  GAME_AWARDS = 'GAME_AWARDS',
  TARGETED_MARKETING = 'TARGETED_MARKETING',
  COMPETITOR_OVERVIEW = 'COMPETITOR_OVERVIEW',
}