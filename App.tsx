
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CompanyState, StaffMember, GameProject, ReleasedGame, GameGenre, GameTheme, GamePlatform, FinancialRecord, GameView, StaffSkills, ResearchableItemType, StaffStatus, GameEngine, SpecialistRole, SpecialistRoleConfig, ActiveFranchise, OfficeUpgrade, OfficeUpgradeTier, AwardCategory, Award, TargetedMarketingPush, EngineStatus, CompetitorCompany, CompetitorGameProject, CompetitorReleasedGame } from './types';
import {
    INITIAL_FUNDS, INITIAL_YEAR, INITIAL_MONTH, DEFAULT_GENRES, DEFAULT_THEMES, DEFAULT_PLATFORMS, INITIAL_STAFF, MONTHS_PER_YEAR, MAX_STAFF_COUNT,
    BASE_STAFF_SALARY, STAFF_SALARY_PER_SKILL_POINT, GAME_DEV_STAGES_MONTHS, MAX_GAME_NAME_LENGTH, NOTIFICATION_LIMIT, GAME_POINT_PER_SKILL,
    BUG_GENERATION_CHANCE, BUGS_PER_EVENT, HYPE_PER_MARKETING_DOLLAR, HYPE_DECAY_RATE, KOREAN_NAMES_POOL, TRAINING_COST_PER_MONTH,
    TRAINING_MONTHS_DURATION, BASE_TRAINING_SKILL_INCREASE, SKILL_KOREAN_NAMES, TRAINABLE_SKILLS, TOTAL_TRAINING_COST,
    STAFF_STATUS_KOREAN_NAMES, ENERGY_RECOVERY_PER_IDLE_MONTH, ENERGY_DECREASE_PER_MONTH_WORKING, BURNOUT_THRESHOLD, BASE_MAX_ENERGY,
    LOW_ENERGY_PERFORMANCE_PENALTY_THRESHOLD, LOW_ENERGY_PERFORMANCE_MULTIPLIER, FORCED_VACATION_DURATION_MONTHS,
    VOLUNTARY_VACATION_DURATION_MONTHS, ENERGY_RECOVERY_PER_VACATION_MONTH, VOLUNTARY_VACATION_COST_FLAT,
    INITIAL_ENGINES, MAX_STAFF_ON_ENGINE_PROJECT, MIN_SCORE_FOR_FRANCHISE_STARTER, SEQUEL_HYPE_BONUS_PER_PREVIOUS_SCORE_POINT,
    SEQUEL_POINT_CARRYOVER_FACTOR, FRANCHISE_NAME_PREFIXES, FRANCHISE_NAME_SUFFIXES, SPECIALIST_ROLES_CONFIG, MAX_SPECIALISTS_PER_ROLE, SPECIALIST_ROLE_KOREAN_NAMES,
    DEFAULT_OFFICE_UPGRADES, INITIAL_COMPANY_REPUTATION, HALL_OF_FAME_THRESHOLD_SCORE, AWARD_CONFIGS, TARGET_AWARD_GENRE_CATEGORIES,
    TARGETED_MARKETING_PUSH_COST, TARGETED_MARKETING_PUSH_DURATION_MONTHS, TARGETED_MARKETING_PUSH_INITIAL_HYPE_BOOST,
    TARGETED_MARKETING_PUSH_MONTHLY_HYPE_BOOST, TARGETED_MARKETING_PUSH_REPUTATION_BOOST_ON_COMPLETION, MARKETING_PUSH_ELIGIBILITY_MONTHS_POST_RELEASE,
    INITIAL_COMPETITORS, COMPETITOR_MAX_RELEASED_GAMES_HISTORY, COMPETITOR_BASE_DEV_MONTHS, COMPETITOR_MIN_FUNDS_TO_START_PROJECT, COMPETITOR_MONTHLY_OPERATIONAL_COST_PER_SKILL, COMPETITOR_GAME_PRICE, COMPETITOR_PROJECT_COOLDOWN_MONTHS, COMPETITOR_GAME_DEV_COST_PER_SKILL_MONTH, COMPETITOR_REPUTATION_GAIN_PER_SUCCESSFUL_GAME, COMPETITOR_SKILL_GAIN_CHANCE_ON_SUCCESS, COMPETITOR_START_NEW_PROJECT_BASE_CHANCE
} from './constants';
import Modal from './components/Modal';
import ActionButton from './components/ActionButton';
import FinancialChart from './components/FinancialChart';
import ProjectSpiderChart from './components/ProjectSpiderChart';
import StaffSkillsSpiderChart from './components/StaffSkillsSpiderChart';
import CompetitorComparisonChart, { ComparisonData } from './components/CompetitorComparisonChart';


const generateId = () => Math.random().toString(36).substr(2, 9);
const generateAwardId = () => `award-${generateId()}`;
const generateCompetitorGameId = () => `compgame-${generateId()}`;

const LOCAL_STORAGE_COMPANY_KEY = 'gameDevStoryLite_companyState';
const LOCAL_STORAGE_FINANCIAL_HISTORY_KEY = 'gameDevStoryLite_financialHistory';
const DELEGATION_MODE_TIMER_MS = 1500;

const generateRandomGameName = (baseName?: string, sequelNumber?: number): string => {
  if (baseName && sequelNumber) {
    const romanNumerals: {[key: number]: string} = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };
    return `${baseName} ${romanNumerals[sequelNumber] || sequelNumber}`;
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const length = Math.floor(Math.random() * 6) + 3;
  let name = '';
  for (let i = 0; i < length; i++) {
    name += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return name;
};

type CpuActionResult = { newState: CompanyState, notification: string } | null;

const executeCpuStartDevelopment = (
    currentCompany: CompanyState,
    name: string, genre: GameGenre, theme: GameTheme, platform: GamePlatform, engine: GameEngine | null, staffIdsToAssign: string[], budgetVal: number,
    officeEffects: ReturnType<typeof getAggregatedOfficeEffectsForCpu>
): CpuActionResult => {
    if (!currentCompany) return null;

    const assignedStaffForProject = currentCompany.staff.filter(s => staffIdsToAssign.includes(s.id) && s.status === 'idle');
    if (assignedStaffForProject.length === 0) return null;

    const totalStaffSpeed = assignedStaffForProject.reduce((sum, s) => {
        let currentSpeed = s.speed * (1 + officeEffects.globalSpeedBoost);
        if (s.specialistRole === SpecialistRole.SPEED_DEMON) currentSpeed *= (1 + (SPECIALIST_ROLES_CONFIG[SpecialistRole.SPEED_DEMON].bonuses.speedBoost || 0));
        return sum + currentSpeed;
    }, 0);
    const baseDevMonths = (GAME_DEV_STAGES_MONTHS.developing * 10) / Math.max(1, totalStaffSpeed);
    const developmentMonths = Math.ceil(GAME_DEV_STAGES_MONTHS.planning + baseDevMonths + GAME_DEV_STAGES_MONTHS.polishing);

    let marketingBudgetEffective = budgetVal;
    const marketingGuruOnProject = currentCompany.staff.find(s => assignedStaffForProject.map(as => as.id).includes(s.id) && s.specialistRole === SpecialistRole.MARKETING_GURU);
    if (marketingGuruOnProject) {
        const roleConfig = SPECIALIST_ROLES_CONFIG[SpecialistRole.MARKETING_GURU];
        marketingBudgetEffective *= (1 + (roleConfig.bonuses.marketingEffectivenessBoost || 0));
    }

    const initialHype = marketingBudgetEffective * HYPE_PER_MARKETING_DOLLAR + officeEffects.passiveHypeGeneration;

    const newProject: GameProject = {
        id: generateId(), name, genre, theme, platform, budget: budgetVal, developmentMonths, monthsSpent: 0,
        points: { fun: 0, graphics: 0, sound: 0, creativity: 0, bugs: 0 },
        assignedStaffIds: assignedStaffForProject.map(s => s.id),
        status: 'planning', hype: initialHype, engineUsedId: engine?.id || null,
        isSequelToGameId: null, franchiseName: undefined, sequelNumber: undefined
    };

    const newState: CompanyState = {
        ...currentCompany,
        funds: currentCompany.funds - platform.licenseCost - budgetVal,
        activeProject: newProject,
        staff: currentCompany.staff.map(s =>
            assignedStaffForProject.find(as => as.id === s.id) ? {...s, status: 'working_on_game'} : s
        )
    };
    const notification = `CPU: ${platform.name}에서 "${newProject.name}" 개발 시작! ${engine ? `(${engine.name} 엔진 사용)` : ''}`;
    return { newState, notification };
};

const executeCpuHireStaff = (
    currentCompany: CompanyState,
    candidate: Omit<StaffMember, 'id' | 'status' | 'trainingSkill' | 'trainingMonthsRemaining' | 'vacationMonthsRemaining' | 'specialistRole' | 'monthsInCurrentRole'>,
    officeEffects: ReturnType<typeof getAggregatedOfficeEffectsForCpu>
): CpuActionResult => {
    if (currentCompany.staff.length >= MAX_STAFF_COUNT || currentCompany.funds < candidate.salary * 2) {
      return null;
    }
    const currentMaxEnergyForNewStaff = BASE_MAX_ENERGY + officeEffects.staffMaxEnergyBoost;
    const newStaffMember: StaffMember = {
        ...candidate,
        id: generateId(),
        status: 'idle',
        trainingSkill: null, trainingMonthsRemaining: 0, vacationMonthsRemaining: 0,
        specialistRole: SpecialistRole.NONE, monthsInCurrentRole: 0,
        energy: currentMaxEnergyForNewStaff
    };
    const newState: CompanyState = {
        ...currentCompany,
        staff: [...currentCompany.staff, newStaffMember],
        funds: currentCompany.funds - candidate.salary
    };
    const notification = `CPU: ${candidate.name}이(가) 팀에 합류했습니다!`;
    return { newState, notification };
};

const executeCpuStartResearch = (
    currentCompany: CompanyState,
    type: ResearchableItemType, id: string, cost: number, researchItemName: string, targetLevel: number
): CpuActionResult => {
    if (currentCompany.funds < cost || currentCompany.researchTarget) {
        return null;
    }
    const newState: CompanyState = {
        ...currentCompany,
        funds: currentCompany.funds - cost,
        researchTarget: {type, id, targetLevel }
    };
    const notification = `CPU: ${type === 'engine_blueprint' ? '엔진 설계도' : type === 'genre' ? '장르' : type === 'theme' ? '테마' : '플랫폼'}: "${researchItemName}" Lv.${targetLevel} 연구 시작. (비용: $${cost.toLocaleString()})`;
    return { newState, notification };
};

const executeCpuPurchaseOfficeUpgrade = (
    currentCompany: CompanyState,
    upgradeId: string, tierLevel: number, tierToPurchase: OfficeUpgradeTier, upgradeName: string
): CpuActionResult => {
    const upgradeIndex = currentCompany.officeUpgrades.findIndex(upg => upg.id === upgradeId);
    if (upgradeIndex === -1) return null;
    const upgrade = currentCompany.officeUpgrades[upgradeIndex];
    if (upgrade.currentLevel !== tierLevel - 1 || currentCompany.funds < tierToPurchase.cost) {
        return null;
    }
    const updatedOfficeUpgrades = [...currentCompany.officeUpgrades];
    updatedOfficeUpgrades[upgradeIndex] = { ...upgrade, currentLevel: tierLevel };

    const newState: CompanyState = {
        ...currentCompany,
        funds: currentCompany.funds - tierToPurchase.cost,
        officeUpgrades: updatedOfficeUpgrades
    };
    const notification = `CPU: 사무실 업그레이드 - "${upgradeName} ${tierToPurchase.name}" 구매 완료! (비용: $${tierToPurchase.cost.toLocaleString()})`;
    return { newState, notification };
};

const getAggregatedOfficeEffectsForCpu = (companyState: CompanyState | null) => {
    const effects = {
      staffEnergyRecoveryBoost: 0, staffMaxEnergyBoost: 0, globalSpeedBoost: 0,
      globalCreativityBoost: 0, trainingEffectivenessBoost: 0, passiveHypeGeneration: 0,
      bugReductionFactor: 1,
    };
    if (!companyState) return effects;
    companyState.officeUpgrades.forEach(upgrade => {
      if (upgrade.currentLevel > 0) {
        const activeTier = upgrade.tiers[upgrade.currentLevel - 1];
        if (activeTier) {
          effects.staffEnergyRecoveryBoost += activeTier.effects.staffEnergyRecoveryBoost || 0;
          effects.staffMaxEnergyBoost += activeTier.effects.staffMaxEnergyBoost || 0;
          effects.globalSpeedBoost += activeTier.effects.globalSpeedBoost || 0;
          effects.globalCreativityBoost += activeTier.effects.globalCreativityBoost || 0;
          effects.trainingEffectivenessBoost += activeTier.effects.trainingEffectivenessBoost || 0;
          effects.passiveHypeGeneration += activeTier.effects.passiveHypeGeneration || 0;
          if (activeTier.effects.bugReductionFactor) {
            effects.bugReductionFactor *= activeTier.effects.bugReductionFactor;
          }
        }
      }
    });
    return effects;
};


const App: React.FC = () => {
  const [company, setCompany] = useState<CompanyState | null>(null);
  const [currentView, setCurrentView] = useState<GameView>(GameView.START_SCREEN);
  const [companyNameInput, setCompanyNameInput] = useState<string>('');

  const [devGameName, setDevGameName] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedEngine, setSelectedEngine] = useState<string | null>(null);
  const [selectedSequelToGameId, setSelectedSequelToGameId] = useState<string | null>(null);
  const [marketingBudget, setMarketingBudget] = useState<number>(0);
  const [marketingBudgetPercentage, setMarketingBudgetPercentage] = useState<number>(0);
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);

  const [financialHistory, setFinancialHistory] = useState<FinancialRecord[]>([]);
  const [lastReleasedGame, setLastReleasedGame] = useState<ReleasedGame | null>(null);

  const [engineDevModalOpen, setEngineDevModalOpen] = useState<boolean>(false);
  const [selectedEngineToDevelop, setSelectedEngineToDevelop] = useState<GameEngine | null>(null);
  const [engineDevAssignedStaffIds, setEngineDevAssignedStaffIds] = useState<string[]>([]);

  const [staffDetailModalOpen, setStaffDetailModalOpen] = useState<boolean>(false);
  const [selectedStaffForDetail, setSelectedStaffForDetail] = useState<StaffMember | null>(null);
  const [pendingAwardsToShow, setPendingAwardsToShow] = useState<Award[] | null>(null);
  const [selectedGameForMarketing, setSelectedGameForMarketing] = useState<string | null>(null);

  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [delegationActionLog, setDelegationActionLog] = useState<string[]>([]);
  const [selectedCompetitorForView, setSelectedCompetitorForView] = useState<CompetitorCompany | null>(null);
  const [showResetConfirmationModal, setShowResetConfirmationModal] = useState<boolean>(false);


  const companyRef = useRef(company);
  useEffect(() => {
    companyRef.current = company;
  }, [company]);


  const addNotification = useCallback((message: string, isUrgent: boolean = false) => {
    setCompany(prev => {
      if (!prev) return null;
      const newNotifications = [`${isUrgent ? '🔥 ' : ''}${message}`, ...prev.notifications].slice(0, NOTIFICATION_LIMIT);
      return { ...prev, notifications: newNotifications };
    });
  }, []);

  const addDelegationLog = useCallback((message: string) => {
    setDelegationActionLog(prev => [`${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}: ${message}`, ...prev].slice(0, 10));
  }, []);


  useEffect(() => {
    try {
        const savedCompanyData = localStorage.getItem(LOCAL_STORAGE_COMPANY_KEY);
        const savedFinancialHistoryData = localStorage.getItem(LOCAL_STORAGE_FINANCIAL_HISTORY_KEY);

        if (savedCompanyData && savedFinancialHistoryData) {
            const loadedCompany = JSON.parse(savedCompanyData) as CompanyState;
            const loadedFinancialHistory = JSON.parse(savedFinancialHistoryData) as FinancialRecord[];

            if (loadedCompany && loadedCompany.name && Array.isArray(loadedFinancialHistory)) {
                let migratedCompetitors = loadedCompany.competitors;
                if (!migratedCompetitors || !Array.isArray(migratedCompetitors) || migratedCompetitors.length === 0) {
                    migratedCompetitors = INITIAL_COMPETITORS.map(comp => ({
                        ...comp,
                        activeProject: null,
                        releasedGames: [],
                        monthsSinceLastGameRelease: 0,
                        failedProjectStreak: 0,
                    }));
                } else { // Ensure all fields are present for already existing competitor data
                    migratedCompetitors = migratedCompetitors.map(comp => ({
                       ...INITIAL_COMPETITORS.find(ic => ic.id === comp.id) || {}, // Base defaults
                       ...comp, // Loaded data
                       activeProject: comp.activeProject || null,
                       releasedGames: comp.releasedGames || [],
                       monthsSinceLastGameRelease: comp.monthsSinceLastGameRelease || 0,
                       failedProjectStreak: comp.failedProjectStreak || 0,
                    }));
                }


                const migratedCompany = {
                    ...loadedCompany,
                    availableGenres: loadedCompany.availableGenres.map(g => ({ ...g, researchLevel: g.researchLevel ?? ((g as any).unlocked ? 1 : 0), maxResearchLevel: g.maxResearchLevel ?? 5 })),
                    availableThemes: loadedCompany.availableThemes.map(t => ({ ...t, researchLevel: t.researchLevel ?? ((t as any).unlocked ? 1 : 0), maxResearchLevel: t.maxResearchLevel ?? 5 })),
                    availablePlatforms: loadedCompany.availablePlatforms.map(p => ({ ...p, researchLevel: p.researchLevel ?? ((p as any).unlocked ? 1 : 0), maxResearchLevel: p.maxResearchLevel ?? 3, researchCost: p.researchCost ?? Math.floor(p.licenseCost / 4) })),
                    availableEngines: loadedCompany.availableEngines.map(loadedEngine_raw => {
                        const loadedEngine = loadedEngine_raw as any;
                        let newResearchLevel = loadedEngine.researchLevel;
                        if (newResearchLevel === undefined || newResearchLevel === null) {
                            newResearchLevel = ((loadedEngine.status as string) !== 'unresearched' && loadedEngine.status !== undefined) ? 1 : 0;
                        }
                        let newEngineStatus: EngineStatus | undefined = undefined;
                        if (newResearchLevel > 0) {
                            if (loadedEngine.status === 'available' || loadedEngine.status === 'developing' || loadedEngine.status === 'locked') {
                                newEngineStatus = loadedEngine.status as EngineStatus;
                            } else {
                                newEngineStatus = 'locked';
                            }
                        }
                        return {
                            id: loadedEngine.id,
                            name: loadedEngine.name,
                            description: loadedEngine.description,
                            researchCost: loadedEngine.researchCost,
                            developmentMonthsRequired: loadedEngine.developmentMonthsRequired,
                            benefits: loadedEngine.benefits,
                            researchLevel: newResearchLevel,
                            maxResearchLevel: loadedEngine.maxResearchLevel ?? 3,
                            status: newEngineStatus,
                        };
                    }),
                    isDelegationModeActive: loadedCompany.isDelegationModeActive || false,
                    researchTarget: loadedCompany.researchTarget || null,
                    competitors: migratedCompetitors,
                };
                setCompany(migratedCompany);
                setFinancialHistory(loadedFinancialHistory);
                setCurrentView(GameView.MAIN_DASHBOARD);
            } else {
                 console.warn("저장된 게임 데이터가 손상되어 새로 시작합니다.");
                 localStorage.removeItem(LOCAL_STORAGE_COMPANY_KEY);
                 localStorage.removeItem(LOCAL_STORAGE_FINANCIAL_HISTORY_KEY);
            }
        }
    } catch (error) {
        console.error("저장된 게임을 불러오는 중 오류 발생:", error);
        localStorage.removeItem(LOCAL_STORAGE_COMPANY_KEY);
        localStorage.removeItem(LOCAL_STORAGE_FINANCIAL_HISTORY_KEY);
    }
    setIsInitialLoadComplete(true);
  }, []);

  useEffect(() => {
    if (isInitialLoadComplete && company && currentView === GameView.MAIN_DASHBOARD && localStorage.getItem(LOCAL_STORAGE_COMPANY_KEY)) {
        const initialNotifications = company.notifications || [];
        if (!initialNotifications.includes("저장된 게임을 불러왔습니다.")) {
             addNotification("저장된 게임을 불러왔습니다.");
        }
    }
  }, [isInitialLoadComplete, company, currentView, addNotification]);


  useEffect(() => {
    if (isInitialLoadComplete && company && financialHistory.length > 0 && currentView !== GameView.START_SCREEN && !company.isGameOver) {
        try {
            localStorage.setItem(LOCAL_STORAGE_COMPANY_KEY, JSON.stringify(company));
            localStorage.setItem(LOCAL_STORAGE_FINANCIAL_HISTORY_KEY, JSON.stringify(financialHistory));
        } catch (error) {
            console.error("자동 저장 중 오류 발생:", error);
        }
    }
  }, [company, financialHistory, currentView, isInitialLoadComplete]);


  const getAggregatedOfficeEffects = useCallback(() => {
    return getAggregatedOfficeEffectsForCpu(companyRef.current);
  }, []);


  const startGame = () => {
    const companyNameToUse = companyNameInput.trim() === '' ? "유밥" : companyNameInput.trim();

    const initialCompany: CompanyState = {
      name: companyNameToUse,
      funds: INITIAL_FUNDS,
      currentYear: INITIAL_YEAR,
      currentMonth: INITIAL_MONTH,
      staff: INITIAL_STAFF.map(s => ({
        ...s,
        id: generateId(),
        status: 'idle',
        trainingSkill: null,
        trainingMonthsRemaining: 0,
        vacationMonthsRemaining: 0,
        specialistRole: SpecialistRole.NONE,
        monthsInCurrentRole: 0,
      })),
      activeProject: null,
      releasedGames: [],
      researchPoints: 100, // Legacy
      availableGenres: DEFAULT_GENRES.map(g => ({...g})),
      availableThemes: DEFAULT_THEMES.map(t => ({...t})),
      availablePlatforms: DEFAULT_PLATFORMS.map(p => ({...p})),
      availableEngines: INITIAL_ENGINES.map(e => ({
          ...e,
          status: e.researchLevel > 0 ? 'locked' : undefined
      })),
      activeEngineDevelopment: null,
      activeFranchises: [],
      officeUpgrades: DEFAULT_OFFICE_UPGRADES.map(upg => ({ ...upg, tiers: upg.tiers.map(t => ({...t})) }) ),
      companyReputation: INITIAL_COMPANY_REPUTATION,
      awardsWon: [],
      hallOfFameGameIds: [],
      activeTargetedMarketingPush: null,
      isDelegationModeActive: false,
      researchTarget: null,
      isGameOver: false,
      notifications: [`${companyNameToUse}에 오신 것을 환영합니다! 멋진 게임을 만들어봅시다!`],
      competitors: INITIAL_COMPETITORS.map(comp => ({
        ...comp,
        activeProject: null,
        releasedGames: [],
        monthsSinceLastGameRelease: 0,
        failedProjectStreak: 0,
      })),
    };
    setCompany(initialCompany);
    setFinancialHistory([{ year: INITIAL_YEAR, month: INITIAL_MONTH, funds: INITIAL_FUNDS }]);
    setCurrentView(GameView.MAIN_DASHBOARD);
    setDelegationActionLog([]);
  };

  const processGameAwards = useCallback((
    playerGamesReleasedLastYear: ReleasedGame[],
    competitorGamesReleasedLastYear: CompetitorReleasedGame[],
    currentCompanyState: CompanyState
    ) => {
    const wonAwardsList: Award[] = [];
    let totalPrizeMoneyForPlayer = 0;
    let totalReputationGainForPlayer = 0;
    const awardNotifications: string[] = [];
    const newHallOfFameIdsFromThisYear: string[] = [];

    const allEligibleGamesForAwards: (ReleasedGame | CompetitorReleasedGame)[] = [
        ...playerGamesReleasedLastYear,
        ...competitorGamesReleasedLastYear
    ];

    if (allEligibleGamesForAwards.length > 0) {
        // GOTY
        const gotyWinner = [...allEligibleGamesForAwards].sort((a, b) => b.reviewScore - a.reviewScore)[0];
        if (gotyWinner) {
            const awardConfig = AWARD_CONFIGS[AwardCategory.GAME_OF_THE_YEAR];
            const isPlayerWinner = 'budget' in gotyWinner; // Check if it's a player's ReleasedGame
            const winnerName = isPlayerWinner ? currentCompanyState.name : (gotyWinner as CompetitorReleasedGame).name.split(" ")[0]; // Crude way to get company name
            
            wonAwardsList.push({
                id: generateAwardId(), category: AwardCategory.GAME_OF_THE_YEAR, categoryDisplayName: awardConfig.displayName,
                gameId: gotyWinner.id, gameName: gotyWinner.name, year: currentCompanyState.currentYear - 1,
                prizeMoney: awardConfig.prizeMoney, reputationGain: awardConfig.reputationGain,
                awardedToPlayer: isPlayerWinner, competitorName: isPlayerWinner ? undefined : (gotyWinner as CompetitorReleasedGame).name.startsWith("CPU ") ? winnerName : (gotyWinner as CompetitorReleasedGame).name // Assuming competitor name is part of game name for now or is the company name
            });
            if (isPlayerWinner) {
                totalPrizeMoneyForPlayer += awardConfig.prizeMoney;
                totalReputationGainForPlayer += awardConfig.reputationGain;
                awardNotifications.push(`🏆 ${awardConfig.displayName} 수상: "${gotyWinner.name}"! (상금 $${awardConfig.prizeMoney.toLocaleString()}, 명성 +${awardConfig.reputationGain})`);
            } else {
                awardNotifications.push(`🏆 ${awardConfig.displayName}은(는) "${gotyWinner.name}" (${(gotyWinner as CompetitorReleasedGame).name.split(" ")[0]})에게 돌아갔습니다!`);
            }
        }

        // Best Seller
        const bestSeller = [...allEligibleGamesForAwards].sort((a, b) => b.unitsSold - a.unitsSold)[0];
         if (bestSeller) {
            const awardConfig = AWARD_CONFIGS[AwardCategory.BEST_SELLER];
            const isPlayerWinner = 'budget' in bestSeller;
            const winnerName = isPlayerWinner ? currentCompanyState.name : (bestSeller as CompetitorReleasedGame).name.split(" ")[0];

            wonAwardsList.push({
                id: generateAwardId(), category: AwardCategory.BEST_SELLER, categoryDisplayName: awardConfig.displayName,
                gameId: bestSeller.id, gameName: bestSeller.name, year: currentCompanyState.currentYear -1,
                prizeMoney: awardConfig.prizeMoney, reputationGain: awardConfig.reputationGain,
                awardedToPlayer: isPlayerWinner, competitorName: isPlayerWinner ? undefined : winnerName
            });
            if (isPlayerWinner) {
                totalPrizeMoneyForPlayer += awardConfig.prizeMoney;
                totalReputationGainForPlayer += awardConfig.reputationGain;
                awardNotifications.push(`💰 ${awardConfig.displayName} 수상: "${bestSeller.name}"! (상금 $${awardConfig.prizeMoney.toLocaleString()}, 명성 +${awardConfig.reputationGain})`);
            } else {
                awardNotifications.push(`💰 ${awardConfig.displayName}은(는) "${bestSeller.name}" (${winnerName})에게 돌아갔습니다!`);
            }
        }

        // Points-based awards (Graphics, Sound, Creativity)
        for (const cat of [AwardCategory.BEST_GRAPHICS, AwardCategory.BEST_SOUND, AwardCategory.BEST_CREATIVITY]) {
            const pointField = cat === AwardCategory.BEST_GRAPHICS ? 'graphics' : cat === AwardCategory.BEST_SOUND ? 'sound' : 'creativity';
            
            // Separate player and competitor games for point comparison as structure differs
            const playerGamesWithPoints = playerGamesReleasedLastYear.filter(g => g.points && typeof g.points[pointField as keyof GameProject['points']] === 'number');
            // Competitor games don't have detailed points, so they can't win these for now, or we need to estimate/assign points
            // For now, only player games can win these specific point-based awards if they have points
            
            if (playerGamesWithPoints.length > 0) {
                const winner = [...playerGamesWithPoints].sort((a,b) => b.points[pointField as keyof GameProject['points']] - a.points[pointField as keyof GameProject['points']])[0];
                if (winner && winner.points[pointField as keyof GameProject['points']] > 0) {
                     const awardConfig = AWARD_CONFIGS[cat];
                     wonAwardsList.push({ id: generateAwardId(), category: cat, categoryDisplayName: awardConfig.displayName, gameId: winner.id, gameName: winner.name, year: currentCompanyState.currentYear -1, prizeMoney: awardConfig.prizeMoney, reputationGain: awardConfig.reputationGain, awardedToPlayer: true });
                     totalPrizeMoneyForPlayer += awardConfig.prizeMoney;
                     totalReputationGainForPlayer += awardConfig.reputationGain;
                     awardNotifications.push(`🎨 ${awardConfig.displayName} 수상: "${winner.name}"! (상금 $${awardConfig.prizeMoney.toLocaleString()}, 명성 +${awardConfig.reputationGain})`);
                }
            }
        }

        // Genre-specific awards
        TARGET_AWARD_GENRE_CATEGORIES.forEach(awardCat => {
            const awardConfig = AWARD_CONFIGS[awardCat];
            if (!awardConfig.genreId) return;

            const gamesInGenre = allEligibleGamesForAwards.filter(g => {
                if ('genre' in g) return (g as ReleasedGame).genre.id === awardConfig.genreId && (g as ReleasedGame).genre.researchLevel > 0; // Player game
                return (g as CompetitorReleasedGame).genreId === awardConfig.genreId; // Competitor game
            });

            if (gamesInGenre.length > 0) {
                const genreWinner = [...gamesInGenre].sort((a,b) => b.reviewScore - a.reviewScore)[0];
                const isPlayerWinner = 'budget' in genreWinner;
                const winnerName = isPlayerWinner ? currentCompanyState.name : (genreWinner as CompetitorReleasedGame).name.split(" ")[0];

                wonAwardsList.push({
                    id: generateAwardId(), category: awardCat, categoryDisplayName: awardConfig.displayName,
                    gameId: genreWinner.id, gameName: genreWinner.name, year: currentCompanyState.currentYear -1,
                    prizeMoney: awardConfig.prizeMoney, reputationGain: awardConfig.reputationGain,
                    awardedToPlayer: isPlayerWinner, competitorName: isPlayerWinner ? undefined : winnerName
                });
                 if (isPlayerWinner) {
                    totalPrizeMoneyForPlayer += awardConfig.prizeMoney;
                    totalReputationGainForPlayer += awardConfig.reputationGain;
                    awardNotifications.push(`🎮 ${awardConfig.displayName} 수상: "${genreWinner.name}"! (상금 $${awardConfig.prizeMoney.toLocaleString()}, 명성 +${awardConfig.reputationGain})`);
                } else {
                     awardNotifications.push(`🎮 ${awardConfig.displayName}은(는) "${genreWinner.name}" (${winnerName})에게 돌아갔습니다!`);
                }
            }
        });
    }

    // Hall of Fame (Player only)
    currentCompanyState.releasedGames.forEach(game => {
        if (game.reviewScore >= HALL_OF_FAME_THRESHOLD_SCORE && !currentCompanyState.hallOfFameGameIds.includes(game.id) && !newHallOfFameIdsFromThisYear.includes(game.id)) {
            const awardConfig = AWARD_CONFIGS[AwardCategory.HALL_OF_FAME_INDUCTION];
            totalReputationGainForPlayer += awardConfig.reputationGain;
            newHallOfFameIdsFromThisYear.push(game.id);
            awardNotifications.push(`🌟 명예의 전당 입성: "${game.name}" (점수: ${game.reviewScore})! (명성 +${awardConfig.reputationGain})`);
        }
    });

    if (wonAwardsList.some(a => a.awardedToPlayer) || newHallOfFameIdsFromThisYear.length > 0) {
        // Player won something or got into Hall of Fame
    } else if (wonAwardsList.length > 0) {
        // Competitor won something, player won nothing
    }

    const summaryNotification = `${currentCompanyState.currentYear -1}년도 게임 대상 시상식 결과를 발표합니다!`;
    if (awardNotifications.length > 0) {
        awardNotifications.unshift(summaryNotification);
    } else {
        awardNotifications.unshift(`${currentCompanyState.currentYear -1}년도 게임 대상: 아쉽게도 수상작이 없습니다.`);
    }


    return { wonAwardsList, totalPrizeMoneyForPlayer, totalReputationGainForPlayer, newHallOfFameIds: newHallOfFameIdsFromThisYear, notifications: awardNotifications };
  }, []);


  const handleNextMonth = useCallback((
    companyStateAfterCpuAction: CompanyState,
    cpuActionNotifications: string[] = []
  ) => {
    const C = companyStateAfterCpuAction;
    if (C.isGameOver) return;

    const previousYear = C.currentYear;
    const previousMonth = C.currentMonth;

    let newFunds = C.funds;
    let monthTickNotifications: string[] = [];
    let updatedStaff = [...C.staff];
    let newActiveProject = C.activeProject ? { ...C.activeProject } : null;
    let newActiveEngineDev = C.activeEngineDevelopment ? { ...C.activeEngineDevelopment } : null;
    let updatedAvailableEngines = C.availableEngines.map(e => ({...e}));
    let updatedReleasedGames = [...C.releasedGames];
    let updatedActiveFranchises = [...C.activeFranchises];
    let updatedCompanyReputation = C.companyReputation;
    let updatedAwardsWon = [...C.awardsWon];
    let updatedHallOfFameGameIds = [...C.hallOfFameGameIds];
    let updatedActiveTargetedMarketingPush = C.activeTargetedMarketingPush ? {...C.activeTargetedMarketingPush} : null;
    let updatedResearchTarget = C.researchTarget ? { ...C.researchTarget } : null;
    let updatedAvailableGenres = C.availableGenres.map(g => ({...g}));
    let updatedAvailableThemes = C.availableThemes.map(t => ({...t}));
    let updatedAvailablePlatforms = C.availablePlatforms.map(p => ({...p}));
    let updatedCompetitors = C.competitors.map(comp => ({ // Deep copy competitors
        ...comp,
        activeProject: comp.activeProject ? {...comp.activeProject} : null,
        releasedGames: comp.releasedGames.map(rg => ({...rg}))
    }));


    const officeEffects = getAggregatedOfficeEffectsForCpu(C);
    const currentMaxEnergy = BASE_MAX_ENERGY + officeEffects.staffMaxEnergyBoost;

    updatedStaff = updatedStaff.map(staff => {
      let newEnergy = staff.energy;
      let newStatus = staff.status;
      let newTrainingMonthsRemaining = staff.trainingMonthsRemaining;
      let newVacationMonthsRemaining = staff.vacationMonthsRemaining;
      let newTrainingSkill = staff.trainingSkill;
      let newSalary = staff.salary;
      let newMonthsInCurrentRole = staff.monthsInCurrentRole + 1;

      if (staff.status === 'training' && staff.trainingSkill && typeof staff.trainingMonthsRemaining === 'number') {
        newTrainingMonthsRemaining = staff.trainingMonthsRemaining - 1;
        if (newTrainingMonthsRemaining <= 0) {
          const skillToImprove = staff.trainingSkill as keyof StaffSkills;
          const currentSkillValue = staff[skillToImprove] as number;
          const skillIncrease = Math.round(BASE_TRAINING_SKILL_INCREASE * (1 + officeEffects.trainingEffectivenessBoost));
          newStatus = 'idle'; newTrainingSkill = null;
          newSalary = staff.salary + (skillIncrease * STAFF_SALARY_PER_SKILL_POINT);
          monthTickNotifications.unshift(`${staff.name}의 ${SKILL_KOREAN_NAMES[skillToImprove]} 훈련 완료! (${SKILL_KOREAN_NAMES[skillToImprove]} +${skillIncrease}, 급여 인상)`);
          newEnergy = Math.min(currentMaxEnergy, staff.energy + 10);
           return { ...staff, [skillToImprove]: currentSkillValue + skillIncrease, salary: newSalary, status: 'idle', trainingSkill: null, trainingMonthsRemaining: 0, energy: newEnergy, monthsInCurrentRole: newMonthsInCurrentRole };
        }
      } else if (staff.status === 'on_vacation' || staff.status === 'burnt_out') {
        newEnergy = Math.min(currentMaxEnergy, staff.energy + ENERGY_RECOVERY_PER_VACATION_MONTH);
        newVacationMonthsRemaining = (staff.vacationMonthsRemaining || 0) - 1;
        if (newVacationMonthsRemaining <= 0) {
          newStatus = 'idle';
          monthTickNotifications.unshift(`${staff.name}이(가) ${staff.status === 'burnt_out' ? '번아웃 회복 후' : ''} 업무에 복귀합니다. (에너지: ${newEnergy})`);
          newVacationMonthsRemaining = 0;
        }
      } else if (staff.status === 'idle') {
        newEnergy = Math.min(currentMaxEnergy, staff.energy + ENERGY_RECOVERY_PER_IDLE_MONTH + officeEffects.staffEnergyRecoveryBoost);
      } else if (staff.status === 'working_on_game' || staff.status === 'developing_engine') {
        newEnergy = Math.max(0, staff.energy - ENERGY_DECREASE_PER_MONTH_WORKING);
        if (newEnergy < BURNOUT_THRESHOLD) {
          newStatus = 'burnt_out'; newVacationMonthsRemaining = FORCED_VACATION_DURATION_MONTHS;
          monthTickNotifications.unshift(`경고! ${staff.name}이(가) 번아웃 상태가 되어 강제 휴가에 들어갑니다! (에너지: ${newEnergy})`);
        }
      }
      return { ...staff, energy: newEnergy, status: newStatus, salary: newSalary, trainingMonthsRemaining: newTrainingMonthsRemaining, vacationMonthsRemaining: newVacationMonthsRemaining, trainingSkill: newTrainingSkill, monthsInCurrentRole: newMonthsInCurrentRole };
    });

    const totalSalaries = updatedStaff.reduce((sum, staff) => sum + staff.salary, 0);
    newFunds -= totalSalaries;
    monthTickNotifications.unshift(`급여로 $${totalSalaries.toLocaleString()} 지출.`);

    if (newActiveEngineDev) {
        const engineBeingDeveloped = updatedAvailableEngines.find(e => e.id === newActiveEngineDev!.engineId);
        if (engineBeingDeveloped) {
            newActiveEngineDev.monthsSpent += 1;
            let devTimeRequired = engineBeingDeveloped.developmentMonthsRequired;
            if (engineBeingDeveloped.researchLevel > 1) {
                 devTimeRequired = Math.max(1, engineBeingDeveloped.developmentMonthsRequired - (engineBeingDeveloped.researchLevel - 1) * 0.25);
            }

            if (newActiveEngineDev.monthsSpent >= devTimeRequired) {
                const engineIndex = updatedAvailableEngines.findIndex(e => e.id === newActiveEngineDev!.engineId);
                if (engineIndex !== -1) {
                    updatedAvailableEngines[engineIndex] = { ...updatedAvailableEngines[engineIndex], status: 'available' };
                }
                monthTickNotifications.unshift(`엔진 "${engineBeingDeveloped.name}" 개발 완료!`);
                updatedStaff = updatedStaff.map(s => newActiveEngineDev!.staffIds.includes(s.id) ? {...s, status: 'idle', energy: Math.min(currentMaxEnergy, s.energy + 15)} : s);
                newActiveEngineDev = null;
            } else {
                monthTickNotifications.unshift(`엔진 "${engineBeingDeveloped.name}" 개발 진행 중: ${newActiveEngineDev.monthsSpent}/${devTimeRequired.toFixed(2)}개월`);
            }
        } else {
            monthTickNotifications.unshift(`오류: 개발 중인 엔진 ${newActiveEngineDev.engineId} 정보를 찾을 수 없습니다.`);
            newActiveEngineDev = null;
        }
    }

    if (newActiveProject && newActiveProject.status !== 'completed' && newActiveProject.status !== 'released') {
      newActiveProject.monthsSpent += 1;
      const devStaffThisMonth = updatedStaff.filter(s => newActiveProject!.assignedStaffIds.includes(s.id) && s.status === 'working_on_game');
      let pointsThisMonth = { fun: 0, graphics: 0, sound: 0, creativity: 0, bugs: 0 };
      const usedEngine = newActiveProject.engineUsedId ? updatedAvailableEngines.find(e => e.id === newActiveProject!.engineUsedId && e.status === 'available') : null;
      let projectProgrammingBoost = 0, projectGraphicsBoost = 0, projectSoundBoost = 0, projectCreativityBoostFromSpecialists = 0, projectFunBoost = 0, projectBugReductionFactor = 1;

      devStaffThisMonth.forEach(staff => {
        if (staff.specialistRole !== SpecialistRole.NONE) {
            const roleConfig = SPECIALIST_ROLES_CONFIG[staff.specialistRole as Exclude<SpecialistRole, SpecialistRole.NONE>];
            if (roleConfig) {
                projectProgrammingBoost = Math.max(projectProgrammingBoost, roleConfig.bonuses.programmingBoost || 0);
                projectGraphicsBoost = Math.max(projectGraphicsBoost, roleConfig.bonuses.graphicsBoost || 0);
                projectSoundBoost = Math.max(projectSoundBoost, roleConfig.bonuses.soundBoost || 0);
                projectCreativityBoostFromSpecialists = Math.max(projectCreativityBoostFromSpecialists, roleConfig.bonuses.creativityBoost || 0);
                projectFunBoost = Math.max(projectFunBoost, roleConfig.bonuses.funBoost || 0);
                projectBugReductionFactor = Math.min(projectBugReductionFactor, roleConfig.bonuses.bugReductionFactor || 1);
            }
        }
      });

      devStaffThisMonth.forEach(staff => {
        let performanceMultiplier = staff.energy < LOW_ENERGY_PERFORMANCE_PENALTY_THRESHOLD ? LOW_ENERGY_PERFORMANCE_MULTIPLIER : 1;
        
        let staffSpeed = staff.speed * (1 + officeEffects.globalSpeedBoost); // Base speed with office effect
        if (staff.specialistRole === SpecialistRole.SPEED_DEMON) staffSpeed *= (1 + (SPECIALIST_ROLES_CONFIG[SpecialistRole.SPEED_DEMON].bonuses.speedBoost || 0));
        
        const speedFactor = (1 + staffSpeed * 0.05); // New speed contribution factor

        let staffCreativity = staff.creativity * (1 + officeEffects.globalCreativityBoost);

        pointsThisMonth.fun += (staffCreativity + staff.programming) * GAME_POINT_PER_SKILL * performanceMultiplier * speedFactor;
        pointsThisMonth.graphics += staff.graphics * GAME_POINT_PER_SKILL * performanceMultiplier * speedFactor;
        pointsThisMonth.sound += staff.sound * GAME_POINT_PER_SKILL * performanceMultiplier * speedFactor;
        pointsThisMonth.creativity += staffCreativity * GAME_POINT_PER_SKILL * performanceMultiplier * speedFactor; 
        
        let bugChance = BUG_GENERATION_CHANCE * (usedEngine?.benefits.bugReductionFactor || 1) * projectBugReductionFactor * officeEffects.bugReductionFactor;
        if (Math.random() < bugChance) pointsThisMonth.bugs += BUGS_PER_EVENT;
      });

      // Apply specialist and relevant engine boosts to the monthly accumulated points
      pointsThisMonth.fun *= (1 + projectFunBoost + (usedEngine?.benefits.funBoost || 0));
      pointsThisMonth.graphics *= (1 + projectGraphicsBoost + (usedEngine?.benefits.graphicsBoost || 0));
      pointsThisMonth.sound *= (1 + projectSoundBoost + (usedEngine?.benefits.soundBoost || 0));
      pointsThisMonth.creativity *= (1 + projectCreativityBoostFromSpecialists + (usedEngine?.benefits.creativityBoost || 0));
      
      newActiveProject.points.fun += pointsThisMonth.fun; 
      newActiveProject.points.graphics += pointsThisMonth.graphics; 
      newActiveProject.points.sound += pointsThisMonth.sound; 
      newActiveProject.points.creativity += pointsThisMonth.creativity;
      newActiveProject.points.bugs = Math.max(0, newActiveProject.points.bugs + pointsThisMonth.bugs);
      newActiveProject.hype = Math.max(0, newActiveProject.hype - HYPE_DECAY_RATE + officeEffects.passiveHypeGeneration);

      if (newActiveProject.monthsSpent >= newActiveProject.developmentMonths) {
        newActiveProject.status = 'completed';
        const genre = updatedAvailableGenres.find(g => g.id === newActiveProject!.genre.id)!;
        const platform = updatedAvailablePlatforms.find(p => p.id === newActiveProject!.platform.id)!;
        
        let qualityScore = (newActiveProject.points.fun + newActiveProject.points.graphics + newActiveProject.points.sound + newActiveProject.points.creativity) / 4;
        qualityScore += genre.basePoints.fun; // Additive genre fun
        if (genre.basePoints.innovation) { // Additive genre innovation
            qualityScore += genre.basePoints.innovation;
        }
        if (usedEngine) { // Additive engine innovation boost, scaled
            qualityScore += (usedEngine.benefits.innovationBoost || 0) * 50;
        }
        qualityScore -= newActiveProject.points.bugs * 1.2; // Bug penalty
        qualityScore = Math.max(0, Math.min(1000, qualityScore)); // Final cap for qualityScore

        const reviewScore = Math.max(1, Math.min(10, (qualityScore / 100) + (newActiveProject.hype / 40) + (Math.random() * 1.2 -0.6) )).toFixed(1);
        const unitsSold = Math.floor((qualityScore * 100) * platform.marketShare * (1 + newActiveProject.hype / 100) * (1 + (newActiveProject.budget / 10000)) );
        const revenue = Math.floor(unitsSold * (6 + qualityScore / 100));
        newFunds += revenue;
        let releasedGame: ReleasedGame = { ...newActiveProject, releaseYear: C.currentYear, releaseMonth: C.currentMonth, status: 'released', reviewScore: parseFloat(reviewScore), unitsSold, revenue, canBeFranchiseStarter: parseFloat(reviewScore) >= MIN_SCORE_FOR_FRANCHISE_STARTER && !newActiveProject.isSequelToGameId, isFranchise: !!newActiveProject.franchiseName, currentHype: newActiveProject.hype };
        updatedReleasedGames.push(releasedGame);
        setLastReleasedGame(releasedGame);
        if (newActiveProject.isSequelToGameId && newActiveProject.franchiseName) {
            const franchiseIdx = updatedActiveFranchises.findIndex(f => f.name === newActiveProject.franchiseName);
            if (franchiseIdx !== -1) updatedActiveFranchises[franchiseIdx] = { ...updatedActiveFranchises[franchiseIdx], lastGameId: releasedGame.id, lastGameScore: releasedGame.reviewScore, gamesInFranchise: (newActiveProject.sequelNumber || 1) };
        }
        monthTickNotifications.unshift(`"${releasedGame.name}" 출시! 점수: ${releasedGame.reviewScore}/10. 판매량: ${releasedGame.unitsSold.toLocaleString()}개. 수익: $${releasedGame.revenue.toLocaleString()}`);
        updatedStaff = updatedStaff.map(s => newActiveProject!.assignedStaffIds.includes(s.id) ? {...s, status: 'idle', energy: Math.min(currentMaxEnergy, s.energy + 20)} : s);
        newActiveProject = null;
      } else { monthTickNotifications.unshift(`"${newActiveProject.name}" 진행: ${newActiveProject.monthsSpent}/${newActiveProject.developmentMonths}개월차.`); }
    }


    if (updatedResearchTarget) {
        const currentCompanyResearchTarget = updatedResearchTarget;
        let researchUpdateSuccessful = false;
        let itemName = ''; let newLevel = 0;

        if (currentCompanyResearchTarget.type === 'genre') {
            const genreIndex = updatedAvailableGenres.findIndex(g => g.id === currentCompanyResearchTarget.id);
            if (genreIndex !== -1 && updatedAvailableGenres[genreIndex].researchLevel < updatedAvailableGenres[genreIndex].maxResearchLevel) {
                updatedAvailableGenres[genreIndex].researchLevel += 1;
                newLevel = updatedAvailableGenres[genreIndex].researchLevel;
                itemName = updatedAvailableGenres[genreIndex].name;
                updatedAvailableGenres[genreIndex].basePoints.fun += 2;
                updatedAvailableGenres[genreIndex].basePoints.innovation += 2;
                researchUpdateSuccessful = true;
            }
        } else if (currentCompanyResearchTarget.type === 'theme') {
            const themeIndex = updatedAvailableThemes.findIndex(t => t.id === currentCompanyResearchTarget.id);
            if (themeIndex !== -1 && updatedAvailableThemes[themeIndex].researchLevel < updatedAvailableThemes[themeIndex].maxResearchLevel) {
                updatedAvailableThemes[themeIndex].researchLevel += 1;
                newLevel = updatedAvailableThemes[themeIndex].researchLevel;
                itemName = updatedAvailableThemes[themeIndex].name;
                Object.keys(updatedAvailableThemes[themeIndex].pointMultiplier).forEach(key => {
                    const K = key as keyof GameTheme['pointMultiplier'];
                    if (updatedAvailableThemes[themeIndex].pointMultiplier[K]) {
                         (updatedAvailableThemes[themeIndex].pointMultiplier[K] as number) += 0.02;
                    }
                });
                researchUpdateSuccessful = true;
            }
        } else if (currentCompanyResearchTarget.type === 'platform') {
             const platformIndex = updatedAvailablePlatforms.findIndex(p => p.id === currentCompanyResearchTarget.id);
             if (platformIndex !== -1 && updatedAvailablePlatforms[platformIndex].researchLevel < updatedAvailablePlatforms[platformIndex].maxResearchLevel) {
                updatedAvailablePlatforms[platformIndex].researchLevel += 1;
                newLevel = updatedAvailablePlatforms[platformIndex].researchLevel;
                itemName = updatedAvailablePlatforms[platformIndex].name;
                if (newLevel > 1) {
                    updatedAvailablePlatforms[platformIndex].licenseCost = Math.max(0, Math.floor(updatedAvailablePlatforms[platformIndex].licenseCost * 0.99));
                    updatedAvailablePlatforms[platformIndex].marketShare = Math.min(1, updatedAvailablePlatforms[platformIndex].marketShare + 0.005);
                }
                researchUpdateSuccessful = true;
            }
        } else if (currentCompanyResearchTarget.type === 'engine_blueprint') {
            const engineIndex = updatedAvailableEngines.findIndex(e => e.id === currentCompanyResearchTarget.id);
            if (engineIndex !== -1 && updatedAvailableEngines[engineIndex].researchLevel < updatedAvailableEngines[engineIndex].maxResearchLevel) {
                updatedAvailableEngines[engineIndex].researchLevel += 1;
                newLevel = updatedAvailableEngines[engineIndex].researchLevel;
                itemName = updatedAvailableEngines[engineIndex].name;
                if (updatedAvailableEngines[engineIndex].researchLevel === 1) {
                     updatedAvailableEngines[engineIndex].status = 'locked';
                } else {
                    updatedAvailableEngines[engineIndex].developmentMonthsRequired = Math.max(1, updatedAvailableEngines[engineIndex].developmentMonthsRequired - 0.25);
                    if (updatedAvailableEngines[engineIndex].benefits.funBoost) updatedAvailableEngines[engineIndex].benefits.funBoost = (updatedAvailableEngines[engineIndex].benefits.funBoost || 0) + 0.005;
                    else if (updatedAvailableEngines[engineIndex].benefits.speedBoost) updatedAvailableEngines[engineIndex].benefits.speedBoost = (updatedAvailableEngines[engineIndex].benefits.speedBoost || 0) + 0.005;
                }
                researchUpdateSuccessful = true;
            }
        }

        if (researchUpdateSuccessful) {
            monthTickNotifications.unshift(`연구 완료: ${currentCompanyResearchTarget.type === 'engine_blueprint' ? '엔진 설계도' : currentCompanyResearchTarget.type === 'genre' ? '장르' : currentCompanyResearchTarget.type === 'theme' ? '테마' : '플랫폼'} "${itemName}" Lv.${newLevel} 달성!`);
            updatedResearchTarget = null;
        }
    }


    if (updatedActiveTargetedMarketingPush) {
        updatedActiveTargetedMarketingPush.remainingMonths -= 1;
        if (newActiveProject && newActiveProject.id === updatedActiveTargetedMarketingPush.gameId) newActiveProject.hype += updatedActiveTargetedMarketingPush.monthlyHypeBoost;
        else { const releasedGameIdx = updatedReleasedGames.findIndex(g => g.id === updatedActiveTargetedMarketingPush!.gameId); if (releasedGameIdx !== -1) updatedReleasedGames[releasedGameIdx].currentHype += updatedActiveTargetedMarketingPush.monthlyHypeBoost; }
        monthTickNotifications.unshift(`"${updatedActiveTargetedMarketingPush.gameName}" 마케팅 캠페인 진행 중: ${updatedActiveTargetedMarketingPush.remainingMonths}개월 남음 (인지도 +${updatedActiveTargetedMarketingPush.monthlyHypeBoost})`);
        if (updatedActiveTargetedMarketingPush.remainingMonths <= 0) {
            updatedCompanyReputation += updatedActiveTargetedMarketingPush.reputationBoostOnCompletion;
            monthTickNotifications.unshift(`"${updatedActiveTargetedMarketingPush.gameName}" 마케팅 캠페인 종료! (회사 명성 +${updatedActiveTargetedMarketingPush.reputationBoostOnCompletion})`);
            updatedActiveTargetedMarketingPush = null;
        }
    }

    // Competitor Logic
    const competitorNotifications: string[] = [];
    updatedCompetitors = updatedCompetitors.map(comp => {
        let currentComp = {...comp};
        currentComp.monthsSinceLastGameRelease +=1;

        // 1. Update Active Project
        if (currentComp.activeProject) {
            currentComp.activeProject.currentMonthsSpent += 1;
            currentComp.funds -= COMPETITOR_GAME_DEV_COST_PER_SKILL_MONTH * currentComp.skillLevel; // Monthly dev cost

            if (currentComp.activeProject.currentMonthsSpent >= currentComp.activeProject.monthsToCompletion) {
                const project = currentComp.activeProject;
                const platform = updatedAvailablePlatforms.find(p => p.id === project.platformId);
                const genre = updatedAvailableGenres.find(g => g.id === project.genreId);
                const theme = updatedAvailableThemes.find(t => t.id === project.themeId);

                let reviewScore = (project.estimatedQuality / 10) + (Math.random() * 2 - 1); // Base score from quality + randomness
                if (platform) reviewScore += platform.marketShare * 1.5 - 0.75; // Market share impact
                reviewScore = Math.max(1, Math.min(10, parseFloat(reviewScore.toFixed(1))));

                const unitsSoldBase = project.estimatedQuality * currentComp.reputation * (platform ? platform.marketShare : 0.1);
                const unitsSold = Math.floor(unitsSoldBase * (reviewScore / 5) * (Math.random() * 0.4 + 0.8));
                const revenue = unitsSold * COMPETITOR_GAME_PRICE;

                const newReleasedGame: CompetitorReleasedGame = {
                    id: generateCompetitorGameId(), name: project.name,
                    genreId: project.genreId, themeId: project.themeId, platformId: project.platformId,
                    genreName: genre?.name || '알 수 없음', themeName: theme?.name || '알 수 없음', platformName: platform?.name || '알 수 없음',
                    reviewScore, unitsSold, revenue,
                    releaseYear: previousYear, releaseMonth: previousMonth // Use previous month/year as release occurs at month end
                };
                currentComp.releasedGames = [newReleasedGame, ...currentComp.releasedGames].slice(0, COMPETITOR_MAX_RELEASED_GAMES_HISTORY);
                currentComp.funds += revenue;
                currentComp.reputation = Math.min(100, currentComp.reputation + (reviewScore > 7 ? COMPETITOR_REPUTATION_GAIN_PER_SUCCESSFUL_GAME : (reviewScore < 4 ? -1 : 0)));
                if (reviewScore > 7 && Math.random() < COMPETITOR_SKILL_GAIN_CHANCE_ON_SUCCESS) {
                    currentComp.skillLevel = Math.min(10, currentComp.skillLevel + 1);
                }
                competitorNotifications.push(`📢 ${currentComp.name}에서 "${project.name}" 출시! (점수: ${reviewScore}/10)`);
                currentComp.activeProject = null;
                currentComp.monthsSinceLastGameRelease = 0;
                currentComp.failedProjectStreak = reviewScore < 5 ? currentComp.failedProjectStreak + 1 : 0;
            }
        } else { // No active project, try to start one
            currentComp.funds -= COMPETITOR_MONTHLY_OPERATIONAL_COST_PER_SKILL * currentComp.skillLevel; // Idle operational cost
            const startChance = COMPETITOR_START_NEW_PROJECT_BASE_CHANCE + (currentComp.skillLevel * 0.02) - (currentComp.failedProjectStreak * 0.015);
            if (currentComp.funds > COMPETITOR_MIN_FUNDS_TO_START_PROJECT &&
                 currentComp.monthsSinceLastGameRelease >= COMPETITOR_PROJECT_COOLDOWN_MONTHS &&
                 Math.random() < startChance) {

                const availableUserPlatforms = updatedAvailablePlatforms.filter(p => p.researchLevel > 0 && p.releaseYear <= previousYear);
                const researchedPlayerGenres = updatedAvailableGenres.filter(g => g.researchLevel > 0);
                const researchedPlayerThemes = updatedAvailableThemes.filter(t => t.researchLevel > 0);

                if (availableUserPlatforms.length > 0 && researchedPlayerGenres.length > 0 && researchedPlayerThemes.length > 0) {
                    const genre = researchedPlayerGenres.find(g => currentComp.preferredGenreIds.includes(g.id)) ||
                                  researchedPlayerGenres[Math.floor(Math.random() * researchedPlayerGenres.length)];
                    
                    const theme = researchedPlayerThemes.find(t => currentComp.preferredThemeIds.includes(t.id)) ||
                                  researchedPlayerThemes[Math.floor(Math.random() * researchedPlayerThemes.length)];

                    const platform = availableUserPlatforms.sort((a,b) => b.marketShare - a.marketShare)[0]; 

                    // genre, theme, and platform are guaranteed to be valid and researched if this block is reached
                    const gameName = `${currentComp.name.split(' ')[0]}의 ${genre.name.substring(0,3)}-${theme.name.substring(0,3)} 모험 ${currentComp.releasedGames.length + 1}`;
                    const baseDevelopmentMonths = Math.max(3, COMPETITOR_BASE_DEV_MONTHS - currentComp.skillLevel);
                    const estimatedQuality = Math.max(10, Math.min(100, (currentComp.skillLevel * 10) + (genre.basePoints.fun * 0.8) + (Math.random() * 25) - (currentComp.failedProjectStreak * 1.5) ));
                    const initialDevCost = baseDevelopmentMonths * COMPETITOR_GAME_DEV_COST_PER_SKILL_MONTH * currentComp.skillLevel * 0.2;

                    if (currentComp.funds > initialDevCost + COMPETITOR_MIN_FUNDS_TO_START_PROJECT * 0.25) {
                         currentComp.activeProject = {
                            name: gameName, genreId: genre.id, themeId: theme.id, platformId: platform.id,
                            monthsToCompletion: baseDevelopmentMonths, currentMonthsSpent: 0, estimatedQuality, baseDevelopmentMonths
                        };
                        currentComp.funds -= initialDevCost;
                        // competitorNotifications.push(`${currentComp.name}에서 "${gameName}" 개발 시작.`); // Less noisy
                    }
                }
            }
        }
        // Bailout logic
        if (currentComp.funds < -20000) { // Deep in debt
            if (Math.random() < 0.15) { // 15% chance for significant bailout
                currentComp.funds = Math.floor(INITIAL_FUNDS * 0.25);
                competitorNotifications.push(`💸 ${currentComp.name}이(가) 정부 지원금으로 회생합니다! (자금: $${currentComp.funds.toLocaleString()})`);
            }
        } else if (currentComp.funds < 0) { // Slightly in debt
            if (Math.random() < 0.08) { // 8% chance for minor recovery
                 currentComp.funds = Math.min(0, currentComp.funds + Math.floor(INITIAL_FUNDS * 0.1));
                 if (currentComp.funds === 0) competitorNotifications.push(`💰 ${currentComp.name}이(가) 간신히 파산을 면했습니다.`);
            }
        }
        return currentComp;
    });
    monthTickNotifications.unshift(...competitorNotifications);


    let newMonth = previousMonth + 1; let newYear = previousYear; let newYearNotificationMessages: string[] = []; let showAwardsScreenThisTurn = false;

    if (newMonth > MONTHS_PER_YEAR) {
      newMonth = 1; newYear += 1; newYearNotificationMessages.push(`${newYear}년 새해가 밝았습니다!`);
      const playerGamesReleasedLastYear = updatedReleasedGames.filter(g => g.releaseYear === previousYear);
      const competitorGamesReleasedLastYear: CompetitorReleasedGame[] = [];
      updatedCompetitors.forEach(comp => {
          competitorGamesReleasedLastYear.push(...comp.releasedGames.filter(g => g.releaseYear === previousYear));
      });

      const currentCompanyForAwardsProcessing: CompanyState = { ...C, funds: newFunds, staff: updatedStaff, activeProject: newActiveProject, releasedGames: updatedReleasedGames, availableEngines: updatedAvailableEngines, activeEngineDevelopment: newActiveEngineDev, activeFranchises: updatedActiveFranchises, companyReputation: updatedCompanyReputation, awardsWon: updatedAwardsWon, hallOfFameGameIds: updatedHallOfFameGameIds, activeTargetedMarketingPush: updatedActiveTargetedMarketingPush, currentYear: newYear, currentMonth: newMonth, researchTarget: updatedResearchTarget, availableGenres: updatedAvailableGenres, availableThemes: updatedAvailableThemes, availablePlatforms: updatedAvailablePlatforms, competitors: updatedCompetitors }; // Pass updated competitors
      const awardsResults = processGameAwards(playerGamesReleasedLastYear, competitorGamesReleasedLastYear, currentCompanyForAwardsProcessing);

      if (awardsResults.wonAwardsList.length > 0 || awardsResults.newHallOfFameIds.length > 0) {
        newFunds += awardsResults.totalPrizeMoneyForPlayer;
        updatedCompanyReputation += awardsResults.totalReputationGainForPlayer;
        updatedAwardsWon.push(...awardsResults.wonAwardsList);
        updatedHallOfFameGameIds.push(...awardsResults.newHallOfFameIds);
        newYearNotificationMessages.push(...awardsResults.notifications);
        if (!C.isDelegationModeActive) {
             setPendingAwardsToShow(awardsResults.wonAwardsList); showAwardsScreenThisTurn = true;
        } else {
            addDelegationLog(`CPU: ${newYear-1}년도 게임 어워드 처리됨. ${awardsResults.wonAwardsList.filter(a=>a.awardedToPlayer).length}개 플레이어 수상.`);
        }
      } else { newYearNotificationMessages.push(...awardsResults.notifications); }
    }

    monthTickNotifications.unshift(...newYearNotificationMessages);


    let isGameOver = C.isGameOver;
    if (newFunds < 0) {
        monthTickNotifications.unshift(`경고: 자금이 마이너스입니다! $${newFunds.toLocaleString()}`);
        if (newFunds < -25000 - totalSalaries * 1.2) {
            isGameOver = true;
            monthTickNotifications.unshift(`게임 오버! ${C.name}이(가) 파산했습니다.`);
        }
    }

    const finalCombinedNotifications = [...cpuActionNotifications, ...monthTickNotifications, ...C.notifications].slice(0, NOTIFICATION_LIMIT);

    const finalStateForReact: CompanyState = {
      name: C.name,
      funds: newFunds,
      currentYear: newYear,
      currentMonth: newMonth,
      staff: updatedStaff,
      activeProject: newActiveProject,
      releasedGames: updatedReleasedGames,
      researchPoints: C.researchPoints,
      availableGenres: updatedAvailableGenres,
      availableThemes: updatedAvailableThemes,
      availablePlatforms: updatedAvailablePlatforms,
      isGameOver: isGameOver,
      notifications: finalCombinedNotifications,
      availableEngines: updatedAvailableEngines,
      activeEngineDevelopment: newActiveEngineDev,
      activeFranchises: updatedActiveFranchises,
      officeUpgrades: C.officeUpgrades,
      companyReputation: updatedCompanyReputation,
      awardsWon: updatedAwardsWon,
      hallOfFameGameIds: updatedHallOfFameGameIds,
      activeTargetedMarketingPush: updatedActiveTargetedMarketingPush,
      isDelegationModeActive: C.isDelegationModeActive,
      researchTarget: updatedResearchTarget,
      competitors: updatedCompetitors,
    };
    setCompany(finalStateForReact);

    setFinancialHistory(prev => [...prev, { year: newYear, month: newMonth, funds: newFunds }]);

    if (showAwardsScreenThisTurn && !C.isDelegationModeActive) setCurrentView(GameView.GAME_AWARDS);
    else if (lastReleasedGame && newActiveProject === null && currentView !== GameView.GAME_AWARDS && !C.isDelegationModeActive) setCurrentView(GameView.GAME_REPORT);

  }, [processGameAwards, addDelegationLog, currentView, lastReleasedGame]);

  const hireStaff = (candidate: Omit<StaffMember, 'id' | 'status' | 'trainingSkill' | 'trainingMonthsRemaining' | 'vacationMonthsRemaining' | 'specialistRole' | 'monthsInCurrentRole'>) => {
    const C = companyRef.current;
    if (!C) return;

    const officeEffects = getAggregatedOfficeEffectsForCpu(C);
    const hireResult = executeCpuHireStaff(C, candidate, officeEffects);

    if (hireResult) {
        setCompany(hireResult.newState);
        addNotification(hireResult.notification.replace("CPU: ", ""));
        if (!C.isDelegationModeActive) setCurrentView(GameView.MAIN_DASHBOARD);
    } else {
        addNotification("고용 불가: 직원 수 최대이거나, 자금이 부족합니다.");
    }
  };

  const startDevelopment = () => {
    const C = companyRef.current;
    if (!C || !selectedGenre || !selectedTheme || !selectedPlatform || devGameName.trim() === '' || assignedStaffIds.length === 0) {
      addNotification("개발을 시작하려면 모든 항목을 채우고 최소 한 명의 직원을 배정해주세요."); return;
    }
    const genre = C.availableGenres.find(g => g.id === selectedGenre && g.researchLevel > 0)!;
    const theme = C.availableThemes.find(t => t.id === selectedTheme && t.researchLevel > 0)!;
    const platform = C.availablePlatforms.find(p => p.id === selectedPlatform && p.researchLevel > 0)!;
    const engine = selectedEngine ? C.availableEngines.find(e => e.id === selectedEngine && e.status === 'available') : null;

    if (!genre || !theme || !platform) { addNotification("선택된 장르, 테마 또는 플랫폼이 아직 연구되지 않았거나 유효하지 않습니다."); return;}
    if (selectedEngine && !engine) { addNotification("선택한 엔진을 사용할 수 없습니다 (미개발 또는 오류)."); return; }


    let marketingBudgetEffective = marketingBudget;
    const marketingGuru = C.staff.find(s => assignedStaffIds.includes(s.id) && s.specialistRole === SpecialistRole.MARKETING_GURU);
    if (marketingGuru) { const roleConfig = SPECIALIST_ROLES_CONFIG[SpecialistRole.MARKETING_GURU]; marketingBudgetEffective *= (1 + (roleConfig.bonuses.marketingEffectivenessBoost || 0)); addNotification(`${marketingGuru.name}의 전문성으로 마케팅 효과가 증대됩니다!`); }
    if (C.funds < platform.licenseCost + marketingBudget) { addNotification("라이선스 및 마케팅 자금이 부족합니다."); return; }
    const assignedStaffForProject = C.staff.filter(s => assignedStaffIds.includes(s.id) && s.status === 'idle');
    if (assignedStaffForProject.length !== assignedStaffIds.length) { addNotification("선택된 직원 중 일부는 현재 다른 업무 중이거나 휴가 중입니다."); return; }

    const officeEffects = getAggregatedOfficeEffectsForCpu(C);
    const totalStaffSpeed = assignedStaffForProject.reduce((sum, s) => { let currentSpeed = s.speed * (1 + officeEffects.globalSpeedBoost); if (s.specialistRole === SpecialistRole.SPEED_DEMON) currentSpeed *= (1 + (SPECIALIST_ROLES_CONFIG[SpecialistRole.SPEED_DEMON].bonuses.speedBoost || 0)); return sum + currentSpeed; }, 0);
    const baseDevMonths = (GAME_DEV_STAGES_MONTHS.developing * 10) / Math.max(1, totalStaffSpeed) ;
    const developmentMonths = Math.ceil(GAME_DEV_STAGES_MONTHS.planning + baseDevMonths + GAME_DEV_STAGES_MONTHS.polishing);
    let initialPoints = { fun: 0, graphics: 0, sound: 0, creativity: 0, bugs: 0 };
    let initialHype = marketingBudgetEffective * HYPE_PER_MARKETING_DOLLAR + officeEffects.passiveHypeGeneration;
    let franchiseName: string | undefined = undefined; let sequelNumber: number | undefined = undefined;

    if (selectedSequelToGameId) {
        const franchiseInfo = C.activeFranchises.find(f => f.lastGameId === selectedSequelToGameId);
        const predecessorGame = C.releasedGames.find(g => g.id === selectedSequelToGameId);
        if (predecessorGame && franchiseInfo) {
            initialHype += predecessorGame.reviewScore * SEQUEL_HYPE_BONUS_PER_PREVIOUS_SCORE_POINT;
            initialPoints.fun += predecessorGame.points.fun * SEQUEL_POINT_CARRYOVER_FACTOR; initialPoints.graphics += predecessorGame.points.graphics * SEQUEL_POINT_CARRYOVER_FACTOR; initialPoints.sound += predecessorGame.points.sound * SEQUEL_POINT_CARRYOVER_FACTOR; initialPoints.creativity += predecessorGame.points.creativity * SEQUEL_POINT_CARRYOVER_FACTOR;
            franchiseName = franchiseInfo.name; sequelNumber = franchiseInfo.gamesInFranchise + 1;
            addNotification(`"${franchiseName}" 시리즈의 후속작 개발! 전작의 명성에 힘입어 초기 인지도 및 능력치 보너스를 받습니다!`);
        }
    }
    const newProject: GameProject = { id: generateId(), name: devGameName.trim(), genre, theme, platform, budget: marketingBudget, developmentMonths, monthsSpent: 0, points: initialPoints, assignedStaffIds: assignedStaffForProject.map(s => s.id), status: 'planning', hype: initialHype, engineUsedId: selectedEngine, isSequelToGameId: selectedSequelToGameId, franchiseName, sequelNumber };
    setCompany(prev => {
      if (!prev) return null;
      return {...prev, funds: prev.funds - platform.licenseCost - marketingBudget, activeProject: newProject, staff: prev.staff.map(s => assignedStaffForProject.find(as => as.id === s.id) ? {...s, status: 'working_on_game'} : s)};
    });
    addNotification(`${platform.name}에서 "${newProject.name}" 개발을 시작했습니다! ${selectedEngine ? `(${C.availableEngines.find(e=>e.id === selectedEngine)?.name} 엔진 사용)` : ''}`);
    setDevGameName(''); setSelectedGenre(''); setSelectedTheme(''); setSelectedPlatform(''); setSelectedEngine(null); setSelectedSequelToGameId(null);
    setMarketingBudget(0); setMarketingBudgetPercentage(0); setAssignedStaffIds([]);
    if (!C.isDelegationModeActive) setCurrentView(GameView.MAIN_DASHBOARD);
  };

  const startResearch = (type: ResearchableItemType, id: string, cost: number, targetLevel: number) => {
    const C = companyRef.current;
    if (!C) return;

    let itemToResearchName = '';
    if (type === 'genre') itemToResearchName = C.availableGenres.find(i=>i.id===id)?.name || id;
    else if (type === 'theme') itemToResearchName = C.availableThemes.find(i=>i.id===id)?.name || id;
    else if (type === 'platform') itemToResearchName = C.availablePlatforms.find(i=>i.id===id)?.name || id;
    else if (type === 'engine_blueprint') itemToResearchName = C.availableEngines.find(i=>i.id===id)?.name || id;

    const researchResult = executeCpuStartResearch(C, type, id, cost, itemToResearchName, targetLevel);

    if (researchResult) {
        setCompany(researchResult.newState);
        addNotification(researchResult.notification.replace("CPU: ", ""));
        if (!C.isDelegationModeActive) setCurrentView(GameView.MAIN_DASHBOARD);
    } else {
         addNotification(C.researchTarget ? "이미 다른 기술을 연구 중입니다." : "연구 자금이 부족합니다.");
    }
  };

  const startStaffTraining = (staffId: string, skill: keyof StaffSkills) => {
    const C = companyRef.current;
    if (!C) return;
    const staffToTrain = C.staff.find(s => s.id === staffId);
    if (!staffToTrain || staffToTrain.status !== 'idle') { addNotification("해당 직원은 현재 교육을 받을 수 없습니다 (다른 작업 중이거나 휴가 중)."); return; }
    if (C.funds < TOTAL_TRAINING_COST) { addNotification(`교육 자금 부족. $${TOTAL_TRAINING_COST.toLocaleString()} 필요.`); return; }
    setCompany(prev => {
      if (!prev) return null;
      return {...prev, funds: prev.funds - TOTAL_TRAINING_COST, staff: prev.staff.map(s => s.id === staffId ? { ...s, status: 'training', trainingSkill: skill, trainingMonthsRemaining: TRAINING_MONTHS_DURATION } : s)};
    });
    addNotification(`${staffToTrain.name}의 ${SKILL_KOREAN_NAMES[skill]} 교육 시작! (${TRAINING_MONTHS_DURATION}개월 소요)`);
  };

  const sendStaffOnVoluntaryVacation = (staffId: string) => {
    const C = companyRef.current;
    if (!C) return;
    const staffMember = C.staff.find(s => s.id === staffId);
    if (!staffMember || staffMember.status !== 'idle') { addNotification("해당 직원은 현재 휴가를 보낼 수 없습니다."); return; }
    if (C.funds < VOLUNTARY_VACATION_COST_FLAT) { addNotification(`휴가 비용 부족. $${VOLUNTARY_VACATION_COST_FLAT.toLocaleString()} 필요.`); return; }
    const officeEffects = getAggregatedOfficeEffectsForCpu(C); const currentMaxEnergy = BASE_MAX_ENERGY + officeEffects.staffMaxEnergyBoost;
    setCompany(prev => {
      if(!prev) return null;
      return ({...prev, funds: prev.funds - VOLUNTARY_VACATION_COST_FLAT, staff: prev.staff.map(s => s.id === staffId ? { ...s, status: 'on_vacation', vacationMonthsRemaining: VOLUNTARY_VACATION_DURATION_MONTHS, energy: Math.min(currentMaxEnergy, s.energy + 10) } : s )});
    });
    addNotification(`${staffMember.name}을(를) ${VOLUNTARY_VACATION_DURATION_MONTHS}개월간 휴가 보냈습니다.`);
  };

  const handleStartEngineDevelopment = (engine: GameEngine) => { setSelectedEngineToDevelop(engine); setEngineDevModalOpen(true); };

  const confirmStartEngineDevelopment = () => {
    const C = companyRef.current;
    if (!C || !selectedEngineToDevelop || engineDevAssignedStaffIds.length === 0) { addNotification("엔진과 최소 1명의 직원을 선택해주세요."); return; }
    const assignedStaffForEngine = C.staff.filter(s => engineDevAssignedStaffIds.includes(s.id) && s.status === 'idle');
    if (assignedStaffForEngine.length !== engineDevAssignedStaffIds.length || assignedStaffForEngine.length > MAX_STAFF_ON_ENGINE_PROJECT) { addNotification(`직원 배정 오류: 유휴 상태의 직원 ${MAX_STAFF_ON_ENGINE_PROJECT}명 이하로 배정해주세요.`); return; }

    const engineToDevelopFromState = C.availableEngines.find(e => e.id === selectedEngineToDevelop.id);
    if (!engineToDevelopFromState || engineToDevelopFromState.researchLevel === 0 || engineToDevelopFromState.status === 'developing' || engineToDevelopFromState.status === 'available') {
        addNotification("선택한 엔진을 개발할 수 없습니다 (연구 미완료 또는 이미 개발 중/완료)."); return;
    }

    setCompany(prev => {
      if (!prev) return null;
      return ({...prev, activeEngineDevelopment: { engineId: selectedEngineToDevelop.id, staffIds: assignedStaffForEngine.map(s => s.id), monthsSpent: 0, targetEngine: selectedEngineToDevelop }, availableEngines: prev.availableEngines.map(e => e.id === selectedEngineToDevelop.id ? {...e, status: 'developing'} : e), staff: prev.staff.map(s => assignedStaffForEngine.find(as => as.id === s.id) ? {...s, status: 'developing_engine'} : s) });
    });
    addNotification(`엔진 "${selectedEngineToDevelop.name}" 개발 시작!`);
    setEngineDevModalOpen(false); setSelectedEngineToDevelop(null); setEngineDevAssignedStaffIds([]);
    if (!C.isDelegationModeActive) setCurrentView(GameView.MAIN_DASHBOARD);
  };

  const cancelEngineDevelopmentProject = () => {
     const C = companyRef.current; if (!C || !C.activeEngineDevelopment) return;
     const engineId = C.activeEngineDevelopment.engineId; const staffIds = C.activeEngineDevelopment.staffIds;
     setCompany(prev => {
      if (!prev) return null;
      return ({...prev, activeEngineDevelopment: null, availableEngines: prev.availableEngines.map(e => e.id === engineId ? {...e, status: 'locked'} : e), staff: prev.staff.map(s => staffIds.includes(s.id) ? {...s, status: 'idle'} : s) });
     });
     addNotification("엔진 개발이 취소되었습니다.");
  };

  const startFranchise = (gameId: string) => {
    const C = companyRef.current; if (!C) return;
    const gameIndex = C.releasedGames.findIndex(g => g.id === gameId); if (gameIndex === -1) return;
    const game = C.releasedGames[gameIndex];
    if (!game.canBeFranchiseStarter || game.isFranchise) { addNotification("이 게임은 프랜차이즈를 시작할 수 없거나 이미 프랜차이즈의 일부입니다."); return; }
    const franchiseName = `${FRANCHISE_NAME_PREFIXES[Math.floor(Math.random() * FRANCHISE_NAME_PREFIXES.length)]} ${game.name.substring(0,10)} ${FRANCHISE_NAME_SUFFIXES[Math.floor(Math.random() * FRANCHISE_NAME_SUFFIXES.length)]}`;
    const newFranchise: ActiveFranchise = { id: game.id, name: franchiseName, lastGameId: game.id, lastGameScore: game.reviewScore, gamesInFranchise: 1, genreId: game.genre.id, themeId: game.theme.id };
    const updatedReleasedGames = [...C.releasedGames]; updatedReleasedGames[gameIndex] = { ...game, isFranchise: true, franchiseName: franchiseName, sequelNumber: 1 };
    setCompany(prev => {
      if (!prev) return null;
      return ({...prev, releasedGames: updatedReleasedGames, activeFranchises: [...prev.activeFranchises, newFranchise]});
    });
    addNotification(`"${game.name}"을(를) 기반으로 새로운 프랜차이즈 "${franchiseName}"을(를) 시작했습니다!`);
  };

  const assignSpecialistRole = (staffId: string, role: SpecialistRole) => {
    const C = companyRef.current; if (!C || !selectedStaffForDetail || selectedStaffForDetail.id !== staffId) return;
    if (role === SpecialistRole.NONE) {
        const oldRole = selectedStaffForDetail.specialistRole; if (oldRole === SpecialistRole.NONE) return;
        const oldRoleConfig = SPECIALIST_ROLES_CONFIG[oldRole as Exclude<SpecialistRole, SpecialistRole.NONE>];
        const newSalary = Math.round(selectedStaffForDetail.salary / oldRoleConfig.salaryIncreaseFactor);
        setCompany(prev => {
          if (!prev) return null;
          return ({...prev, staff: prev.staff.map(s => s.id === staffId ? { ...s, specialistRole: SpecialistRole.NONE, salary: newSalary, monthsInCurrentRole: 0 } : s)});
        });
        addNotification(`${selectedStaffForDetail.name}의 전문 역할(${SPECIALIST_ROLE_KOREAN_NAMES[oldRole]})이 해제되었습니다. 급여가 조정됩니다.`);
        setSelectedStaffForDetail(prev => prev ? { ...prev, specialistRole: SpecialistRole.NONE, salary: newSalary, monthsInCurrentRole: 0 } : null);
        return;
    }
    const roleConfig = SPECIALIST_ROLES_CONFIG[role as Exclude<SpecialistRole, SpecialistRole.NONE>]; if (!roleConfig) return;
    if (roleConfig.primaryStatReq && selectedStaffForDetail[roleConfig.primaryStatReq] < (roleConfig.minPrimaryStat || 0)) { addNotification(`능력치 부족: ${SKILL_KOREAN_NAMES[roleConfig.primaryStatReq]} ${roleConfig.minPrimaryStat || 0} 이상 필요.`); return; }
    if (C.funds < roleConfig.costToAssign) { addNotification(`자금 부족: 역할 지정 비용 $${roleConfig.costToAssign.toLocaleString()} 필요.`); return; }
    const currentHolder = C.staff.find(s => s.specialistRole === role);
    if (currentHolder && currentHolder.id !== staffId && MAX_SPECIALISTS_PER_ROLE === 1) { addNotification(`역할 중복: ${roleConfig.name} 역할은 이미 ${currentHolder.name}이(가) 맡고 있습니다.`); return; }
    let newSalary = selectedStaffForDetail.salary;
    if (selectedStaffForDetail.specialistRole !== SpecialistRole.NONE) { const oldRoleConfig = SPECIALIST_ROLES_CONFIG[selectedStaffForDetail.specialistRole as Exclude<SpecialistRole, SpecialistRole.NONE>]; newSalary = Math.round(newSalary / oldRoleConfig.salaryIncreaseFactor); }
    newSalary = Math.round(newSalary * roleConfig.salaryIncreaseFactor);
    setCompany(prev => {
      if (!prev) return null;
      return ({...prev, funds: prev.funds - roleConfig.costToAssign, staff: prev.staff.map(s => s.id === staffId ? { ...s, specialistRole: role, salary: newSalary, monthsInCurrentRole: 0 } : s )});
    });
    addNotification(`${selectedStaffForDetail.name}에게 ${roleConfig.name} 역할을 부여했습니다! (비용: $${roleConfig.costToAssign.toLocaleString()}, 급여 인상)`);
    setSelectedStaffForDetail(prev => prev ? { ...prev, specialistRole: role, salary: newSalary, monthsInCurrentRole: 0 } : null);
  };

  const openStaffDetailModal = (staff: StaffMember) => { setSelectedStaffForDetail(staff); setStaffDetailModalOpen(true); };

  const purchaseOfficeUpgrade = (upgradeId: string, tierLevel: number) => {
    const C = companyRef.current; if (!C) return;
    const upgrade = C.officeUpgrades.find(upg => upg.id === upgradeId);
    if (!upgrade) return;
    const tierToPurchase = upgrade.tiers.find(t => t.level === tierLevel);
    if (!tierToPurchase) { addNotification("유효하지 않은 업그레이드 등급입니다."); return; }

    const purchaseResult = executeCpuPurchaseOfficeUpgrade(C, upgradeId, tierLevel, tierToPurchase, upgrade.upgradeName);

    if (purchaseResult) {
        setCompany(purchaseResult.newState);
        addNotification(purchaseResult.notification.replace("CPU: ", ""));
    } else {
        if (upgrade.currentLevel !== tierLevel - 1) addNotification("이전 등급을 먼저 구매해야 합니다.");
        else if (C.funds < tierToPurchase.cost) addNotification("자금이 부족하여 업그레이드를 구매할 수 없습니다.");
        else addNotification("업그레이드 구매에 실패했습니다.");
    }
  };

  const startTargetedMarketingPush = () => {
    const C = companyRef.current; if (!C || !selectedGameForMarketing || C.activeTargetedMarketingPush) { addNotification("마케팅 캠페인을 시작할 수 없습니다. (게임 미선택 또는 이미 캠페인 진행 중)"); return; }
    if (C.funds < TARGETED_MARKETING_PUSH_COST) { addNotification(`자금 부족: 집중 마케팅 캠페인 비용 ($${TARGETED_MARKETING_PUSH_COST.toLocaleString()})이 부족합니다.`); return; }
    let targetGameName = ""; let initialHypeApplied = false; let updatedActiveProject = C.activeProject; let updatedReleasedGames = [...C.releasedGames];
    if (C.activeProject && C.activeProject.id === selectedGameForMarketing) { targetGameName = C.activeProject.name; updatedActiveProject = { ...C.activeProject, hype: C.activeProject.hype + TARGETED_MARKETING_PUSH_INITIAL_HYPE_BOOST }; initialHypeApplied = true;
    } else { const gameIndex = C.releasedGames.findIndex(g => g.id === selectedGameForMarketing); if (gameIndex !== -1) { targetGameName = C.releasedGames[gameIndex].name; updatedReleasedGames[gameIndex] = { ...updatedReleasedGames[gameIndex], currentHype: updatedReleasedGames[gameIndex].currentHype + TARGETED_MARKETING_PUSH_INITIAL_HYPE_BOOST }; initialHypeApplied = true; } }
    if (!initialHypeApplied) { addNotification("마케팅 대상 게임을 찾을 수 없습니다."); return; }
    const newMarketingPush: TargetedMarketingPush = { gameId: selectedGameForMarketing, gameName: targetGameName, remainingMonths: TARGETED_MARKETING_PUSH_DURATION_MONTHS, totalDuration: TARGETED_MARKETING_PUSH_DURATION_MONTHS, monthlyHypeBoost: TARGETED_MARKETING_PUSH_MONTHLY_HYPE_BOOST, reputationBoostOnCompletion: TARGETED_MARKETING_PUSH_REPUTATION_BOOST_ON_COMPLETION };
    setCompany(prev => {
      if (!prev) return null;
      return ({...prev, funds: prev.funds - TARGETED_MARKETING_PUSH_COST, activeTargetedMarketingPush: newMarketingPush, activeProject: updatedActiveProject, releasedGames: updatedReleasedGames });
    });
    addNotification(`"${targetGameName}" 집중 마케팅 캠페인 시작! (초기 인지도 +${TARGETED_MARKETING_PUSH_INITIAL_HYPE_BOOST}, ${TARGETED_MARKETING_PUSH_DURATION_MONTHS}개월)`);
    setSelectedGameForMarketing(null);
    if (!C.isDelegationModeActive) setCurrentView(GameView.MAIN_DASHBOARD);
  };

  const executeActualResetGame = () => {
    try {
        localStorage.removeItem(LOCAL_STORAGE_COMPANY_KEY);
        localStorage.removeItem(LOCAL_STORAGE_FINANCIAL_HISTORY_KEY);
    } catch (error) {
        console.error("로컬 스토리지 초기화 중 오류 발생:", error);
    }
    setCompany(null);
    setFinancialHistory([]);
    setCurrentView(GameView.START_SCREEN);
    setCompanyNameInput('');
    setDevGameName('');
    setSelectedGenre('');
    setSelectedTheme('');
    setSelectedPlatform('');
    setSelectedEngine(null);
    setSelectedSequelToGameId(null);
    setMarketingBudget(0);
    setMarketingBudgetPercentage(0);
    setAssignedStaffIds([]);
    setLastReleasedGame(null);
    setEngineDevModalOpen(false);
    setSelectedEngineToDevelop(null);
    setEngineDevAssignedStaffIds([]);
    setStaffDetailModalOpen(false);
    setSelectedStaffForDetail(null);
    setPendingAwardsToShow(null);
    setSelectedGameForMarketing(null);
    setIsInitialLoadComplete(true); // Keep this true to avoid re-triggering load effect
    setDelegationActionLog([]);
    setSelectedCompetitorForView(null);
    setShowResetConfirmationModal(false);
  };

  const handleResetGame = () => {
    setShowResetConfirmationModal(true);
  };

  const confirmAndResetGame = () => {
    executeActualResetGame();
  };

const scoreEngineForCpu = (engine: GameEngine, genre: GameGenre, theme: GameTheme): number => {
    let score = 0;
    if (!engine.benefits) return 0;

    score += (engine.benefits.funBoost || 0) * 20;
    score += (engine.benefits.innovationBoost || 0) * 25; // Highly valued for quality
    score += (engine.benefits.creativityBoost || 0) * 15;
    score += (1 - (engine.benefits.bugReductionFactor || 1)) * 30; // Bug reduction is highly valued
    score += (engine.benefits.programmingBoost || 0) * 10;
    score += (engine.benefits.graphicsBoost || 0) * 10;
    score += (engine.benefits.soundBoost || 0) * 10;
    score += (engine.benefits.speedBoost || 0) * 5; // Speed is good, but quality factors are more direct for score

    // Genre synergy (simple example)
    if (genre.name.toLowerCase().includes('rpg') && engine.name.toLowerCase().includes('rpg')) score += 10;
    if (genre.name.toLowerCase().includes('시뮬레이션') && engine.name.toLowerCase().includes('sim')) score += 10;
    if (genre.name.toLowerCase().includes('액션') && engine.name.toLowerCase().includes('gfx')) score += 5; // e.g. graphics engine for action

    return score;
};


const runDelegationCycle = useCallback(() => {
    const companyAtCycleStart = companyRef.current;
    if (!companyAtCycleStart || companyAtCycleStart.isGameOver || !companyAtCycleStart.isDelegationModeActive) return;

    let tempCompanyState: CompanyState = { ...companyAtCycleStart };
    let accumulatedCpuNotifications: string[] = [];
    let actionTakenThisCycle = false;

    const officeEffects = getAggregatedOfficeEffectsForCpu(tempCompanyState);
    const idleStaff = tempCompanyState.staff.filter(s => s.status === 'idle');
    const totalSalaries = tempCompanyState.staff.reduce((sum, staff) => sum + staff.salary, 0);
    const companyFunds = tempCompanyState.funds;

    if (!actionTakenThisCycle && !tempCompanyState.activeProject && idleStaff.length > 0) {
        const availableGenres = tempCompanyState.availableGenres.filter(g => g.researchLevel > 0);
        const availableThemes = tempCompanyState.availableThemes.filter(t => t.researchLevel > 0);
        const MIN_FUNDS_FOR_NEW_GAME_CPU = Math.max(30000, totalSalaries * 2.0 + 10000);

        const suitablePlatforms = tempCompanyState.availablePlatforms.filter(p =>
            p.researchLevel > 0 && companyFunds > p.licenseCost + Math.max(8000, totalSalaries * 0.5) && p.releaseYear <= tempCompanyState.currentYear
        );

        if (availableGenres.length > 0 && availableThemes.length > 0 && suitablePlatforms.length > 0 && companyFunds > MIN_FUNDS_FOR_NEW_GAME_CPU) {
            const genre = availableGenres[Math.floor(Math.random() * availableGenres.length)];
            const theme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
            const platform = suitablePlatforms.sort((a, b) => b.marketShare - a.marketShare)[0];
            
            const allAvailableEngines = tempCompanyState.availableEngines.filter(e => e.status === 'available');
            let bestEngine: GameEngine | null = null;
            if (allAvailableEngines.length > 0) {
                bestEngine = allAvailableEngines.sort((a, b) => scoreEngineForCpu(b, genre, theme) - scoreEngineForCpu(a, genre, theme))[0];
            }

            const gameName = `CPU ${genre.name.substring(0, 3)}-${theme.name.substring(0, 3)} ${tempCompanyState.releasedGames.length + 1}`;
            
            const staffToAssignCount = Math.min(Math.max(1, Math.floor(idleStaff.length * 0.70)), MAX_STAFF_ON_ENGINE_PROJECT + 1, idleStaff.length);
            let staffToAssignIds: string[] = [];
            const projectStaffCandidates = [...idleStaff];

            const specialistRolesForQuality: SpecialistRole[] = [
                SpecialistRole.LEAD_DESIGNER, SpecialistRole.LEAD_PROGRAMMER,
                SpecialistRole.ART_DIRECTOR, SpecialistRole.SOUND_LEAD, SpecialistRole.SPEED_DEMON
            ];

            for (const role of specialistRolesForQuality) {
                if (staffToAssignIds.length >= staffToAssignCount) break;
                const specialist = projectStaffCandidates.find(s => s.specialistRole === role && !staffToAssignIds.includes(s.id));
                if (specialist) {
                    staffToAssignIds.push(specialist.id);
                }
            }
            
            const remainingStaffToConsider = projectStaffCandidates.filter(s => !staffToAssignIds.includes(s.id));
            remainingStaffToConsider.sort((a, b) => {
                // Prioritize core dev skills and speed
                const scoreA = a.programming + a.graphics + a.sound + a.creativity + a.speed * 0.75;
                const scoreB = b.programming + b.graphics + b.sound + b.creativity + b.speed * 0.75;
                return scoreB - scoreA;
            });

            while (staffToAssignIds.length < staffToAssignCount && remainingStaffToConsider.length > 0) {
                staffToAssignIds.push(remainingStaffToConsider.shift()!.id);
            }


            if (staffToAssignIds.length > 0) {
                 const remainingFundsAfterLicense = companyFunds - platform.licenseCost;
                 const potentialBudget = Math.floor(Math.min(remainingFundsAfterLicense * 0.18, 20000));
                 const budget = Math.max(1000, potentialBudget);

                 if (remainingFundsAfterLicense > budget + totalSalaries * 1.2) {
                    const devResult = executeCpuStartDevelopment(tempCompanyState, gameName, genre, theme, platform, bestEngine, staffToAssignIds, budget, officeEffects);
                    if (devResult) {
                        tempCompanyState = devResult.newState;
                        accumulatedCpuNotifications.push(devResult.notification);
                        let staffNamesAssigned = staffToAssignIds.map(id => tempCompanyState.staff.find(s=>s.id===id)?.name).filter(Boolean).join(', ');
                        addDelegationLog(`CPU: "${gameName}" 개발 시작 (${staffNamesAssigned.substring(0,30)}... ${bestEngine ? ', 엔진: '+bestEngine.name.substring(0,10) : ''}).`);
                        actionTakenThisCycle = true;
                    } else { addDelegationLog(`CPU: "${gameName}" 개발 내부 오류로 실패.`); }
                 } else {
                    addDelegationLog(`CPU: "${gameName}" 개발 시도 - 예산 또는 잔고 부족 (플랫폼: ${platform.name}, 필요 예산: $${budget}, 현재 잔고-라이선스: $${remainingFundsAfterLicense}).`);
                 }
            }
        }
    }

    const MIN_STAFF_CPU_TARGET = 2;
    let desirableIdleStaffTarget = 1;
    if (tempCompanyState.staff.length < 2) desirableIdleStaffTarget = 0;
    else if (tempCompanyState.staff.length < 4) desirableIdleStaffTarget = 1;
    else desirableIdleStaffTarget = Math.max(1, Math.floor(tempCompanyState.staff.length * 0.20));
    const shouldHire = tempCompanyState.staff.length < MIN_STAFF_CPU_TARGET || (tempCompanyState.staff.length < MAX_STAFF_COUNT && idleStaff.length <= desirableIdleStaffTarget);


    if (!actionTakenThisCycle && shouldHire) {
        const costOfNewHireGuess = BASE_STAFF_SALARY + (6 * 5 * STAFF_SALARY_PER_SKILL_POINT);
        const MIN_FUNDS_FOR_HIRE_CPU = totalSalaries * 2.5 + costOfNewHireGuess * 3.5;

        if (companyFunds > MIN_FUNDS_FOR_HIRE_CPU) {
            const prog = Math.floor(Math.random() * 6) + 2; const graph = Math.floor(Math.random() * 6) + 2; const sound = Math.floor(Math.random() * 6) + 2; const creat = Math.floor(Math.random() * 6) + 2; const mark = Math.floor(Math.random() * 5) + 1; const speed = Math.floor(Math.random() * 7) + 2;
            const salary = BASE_STAFF_SALARY + (prog+graph+sound+creat+mark+speed) * STAFF_SALARY_PER_SKILL_POINT;
            let name = KOREAN_NAMES_POOL[Math.floor(Math.random() * KOREAN_NAMES_POOL.length)];
            if (tempCompanyState.staff.find(s => s.name === name)) name = `${name} ${tempCompanyState.staff.length + 1}`;
            const candidate = { name, programming: prog, graphics: graph, sound: sound, creativity: creat, marketing: mark, speed: speed, salary: salary, energy: BASE_MAX_ENERGY + officeEffects.staffMaxEnergyBoost };

            const hireResult = executeCpuHireStaff(tempCompanyState, candidate, officeEffects);
            if (hireResult) {
                tempCompanyState = hireResult.newState;
                accumulatedCpuNotifications.push(hireResult.notification);
                addDelegationLog(`CPU: 직원 고용 - ${name}.`);
                actionTakenThisCycle = true;
            }
        }
    }

    if (!actionTakenThisCycle && !tempCompanyState.activeEngineDevelopment && !tempCompanyState.activeProject && idleStaff.length >= MAX_STAFF_ON_ENGINE_PROJECT -1) {
        const lockedEngines = tempCompanyState.availableEngines.filter(e => e.researchLevel > 0 && e.status === 'locked');
        const MIN_FUNDS_FOR_ENGINE_DEV_CPU = totalSalaries * 3.0 + 25000;

        if (lockedEngines.length > 0 && companyFunds > MIN_FUNDS_FOR_ENGINE_DEV_CPU) {
            // Dummy genre/theme for scoring as engine dev is not tied to a specific game project yet.
            const dummyGenre = tempCompanyState.availableGenres.find(g => g.researchLevel > 0) || DEFAULT_GENRES[0];
            const dummyTheme = tempCompanyState.availableThemes.find(t => t.researchLevel > 0) || DEFAULT_THEMES[0];

            const bestEngineToDevelop = lockedEngines.sort((a,b) => scoreEngineForCpu(b, dummyGenre, dummyTheme) - scoreEngineForCpu(a, dummyGenre, dummyTheme))[0] || lockedEngines[0];
            const engineDevStaffCandidates = idleStaff.sort((a,b) => (b.programming + b.speed) - (a.programming + b.speed));
            const staffForEngineDevIds = engineDevStaffCandidates.slice(0, Math.min(MAX_STAFF_ON_ENGINE_PROJECT, engineDevStaffCandidates.length)).map(s => s.id);

            if (staffForEngineDevIds.length > 0) {
                tempCompanyState = {
                    ...tempCompanyState,
                    activeEngineDevelopment: { engineId: bestEngineToDevelop.id, staffIds: staffForEngineDevIds, monthsSpent: 0, targetEngine: bestEngineToDevelop },
                    availableEngines: tempCompanyState.availableEngines.map(e => e.id === bestEngineToDevelop.id ? {...e, status: 'developing'} : e),
                    staff: tempCompanyState.staff.map(s => staffForEngineDevIds.includes(s.id) ? {...s, status: 'developing_engine'} : s)
                };
                const notification = `CPU: 엔진 "${bestEngineToDevelop.name}" 개발 시작 (품질 고려 선택).`;
                accumulatedCpuNotifications.push(notification);
                addDelegationLog(notification);
                actionTakenThisCycle = true;
            }
        }
    }

    if (!actionTakenThisCycle && !tempCompanyState.researchTarget) {
        const MIN_FUNDS_FOR_RESEARCH_CPU = totalSalaries * 2.0 + 10000;
        if (companyFunds > MIN_FUNDS_FOR_RESEARCH_CPU) {
            type ResearchCandidate = { type: ResearchableItemType; id: string; cost: number; name: string; priority: number; targetLevel: number; currentLevel: number };
            const researchables: ResearchCandidate[] = [];

            tempCompanyState.availablePlatforms.filter(i => i.researchLevel < i.maxResearchLevel && tempCompanyState.currentYear >= i.releaseYear)
                .forEach(i => {
                    const cost = (i.researchCost || Math.floor(i.licenseCost / 2.5)) * (i.researchLevel + 1);
                    if (companyFunds > cost + totalSalaries) researchables.push({ type: 'platform', id: i.id, cost, name: i.name, priority: 1, targetLevel: i.researchLevel + 1, currentLevel: i.researchLevel });
                });
            tempCompanyState.availableEngines.filter(i => i.researchLevel < i.maxResearchLevel) // Prioritize engines that help quality
                .forEach(i => {
                    const cost = i.researchCost * (i.researchLevel + 1);
                    let qualityScore = 0;
                    if (i.benefits) {
                         qualityScore += (i.benefits.innovationBoost || 0) * 2 + (1-(i.benefits.bugReductionFactor || 1)) * 2 + (i.benefits.funBoost || 0);
                    }
                    if (companyFunds > cost + totalSalaries) researchables.push({ type: 'engine_blueprint', id: i.id, cost, name: i.name, priority: 0.5 - qualityScore, targetLevel: i.researchLevel + 1, currentLevel: i.researchLevel });
                });
            tempCompanyState.availableGenres.filter(i => i.researchLevel < i.maxResearchLevel)
                .forEach(i => {
                    const cost = i.researchCost * (i.researchLevel + 1);
                    if (companyFunds > cost + totalSalaries) researchables.push({ type: 'genre', id: i.id, cost, name: i.name, priority: 3, targetLevel: i.researchLevel + 1, currentLevel: i.researchLevel });
                });
            tempCompanyState.availableThemes.filter(i => i.researchLevel < i.maxResearchLevel)
                .forEach(i => {
                    const cost = i.researchCost * (i.researchLevel + 1);
                    if (companyFunds > cost + totalSalaries) researchables.push({ type: 'theme', id: i.id, cost, name: i.name, priority: 4, targetLevel: i.researchLevel + 1, currentLevel: i.researchLevel });
                });

            if (researchables.length > 0) {
                const pick = researchables.sort((a,b) => { if (a.priority !== b.priority) return a.priority - b.priority; if (a.currentLevel !== b.currentLevel) return a.currentLevel - b.currentLevel; return a.cost - b.cost; })[0];
                if (companyFunds >= pick.cost) {
                    const researchResult = executeCpuStartResearch(tempCompanyState, pick.type, pick.id, pick.cost, pick.name, pick.targetLevel);
                    if (researchResult) {
                        tempCompanyState = researchResult.newState;
                        accumulatedCpuNotifications.push(researchResult.notification);
                        addDelegationLog(`CPU: 연구 시작 - ${pick.type} "${pick.name}" Lv.${pick.targetLevel} (비용: $${pick.cost.toLocaleString()}).`);
                        actionTakenThisCycle = true;
                    }
                } else { addDelegationLog(`CPU: 연구 "${pick.name}" Lv.${pick.targetLevel} 시도 - 자금 부족 ($${pick.cost.toLocaleString()} 필요).`); }
            }
        }
    }

    if (!actionTakenThisCycle) {
        const MIN_FUNDS_FOR_UPGRADE_CPU = totalSalaries * 4.0 + 50000;
        if (companyFunds > MIN_FUNDS_FOR_UPGRADE_CPU) {
            const possibleUpgrades: {upgrade: OfficeUpgrade, tierToPurchase: OfficeUpgradeTier}[] = [];
            tempCompanyState.officeUpgrades.forEach(upg => {
                if (upg.currentLevel < upg.tiers.length) {
                    const nextTier = upg.tiers[upg.currentLevel];
                    if (nextTier && companyFunds >= nextTier.cost + totalSalaries * 2.0) {
                        possibleUpgrades.push({upgrade: upg, tierToPurchase: nextTier});
                    }
                }
            });
            if (possibleUpgrades.length > 0) {
                const pick = possibleUpgrades.sort((a,b) => a.tierToPurchase.cost - b.tierToPurchase.cost)[0]; // Simple cost-based for now
                const upgradeResult = executeCpuPurchaseOfficeUpgrade(tempCompanyState, pick.upgrade.id, pick.tierToPurchase.level, pick.tierToPurchase, pick.upgrade.upgradeName);
                 if (upgradeResult) {
                    tempCompanyState = upgradeResult.newState;
                    accumulatedCpuNotifications.push(upgradeResult.notification);
                    addDelegationLog(`CPU: 사무실 업그레이드 - ${pick.upgrade.upgradeName} ${pick.tierToPurchase.name}.`);
                    actionTakenThisCycle = true;
                }
            }
        }
    }

    if (!actionTakenThisCycle) {
        addDelegationLog(`CPU: 특별한 조치 없이 현상 유지 (자금: $${tempCompanyState.funds.toLocaleString()}).`);
    }

    if (tempCompanyState.isDelegationModeActive && !tempCompanyState.isGameOver) {
        handleNextMonth(tempCompanyState, accumulatedCpuNotifications);
    }
  }, [addDelegationLog, handleNextMonth]);


  useEffect(() => {
    let delegationTimerId: number | undefined = undefined;
    const currentCompany = companyRef.current;
    if (currentCompany?.isDelegationModeActive && !currentCompany?.isGameOver) {
        const autoAdvance = () => {
            if (companyRef.current?.isDelegationModeActive && !companyRef.current?.isGameOver) {
                runDelegationCycle();
                delegationTimerId = window.setTimeout(autoAdvance, DELEGATION_MODE_TIMER_MS);
            }
        };
        delegationTimerId = window.setTimeout(autoAdvance, DELEGATION_MODE_TIMER_MS);
    }
    return () => {
        if (delegationTimerId) clearTimeout(delegationTimerId);
    };
  }, [company?.isDelegationModeActive, company?.isGameOver, runDelegationCycle]);


  const toggleDelegationMode = () => {
    if (!company) return;
    const newMode = !company.isDelegationModeActive;
    setCompany(prev => ({...prev!, isDelegationModeActive: newMode}));
    addNotification(`위임 모드가 ${newMode ? '활성화' : '비활성화'}되었습니다.`);
    if (newMode) {
        addDelegationLog("CPU: 위임 모드 시작됨.");
        if (!company.isGameOver) {
            setTimeout(() => {
                if (companyRef.current?.isDelegationModeActive && !companyRef.current?.isGameOver) {
                    runDelegationCycle();
                }
            }, 50);
        }
    } else {
        addDelegationLog("CPU: 위임 모드 중지됨.");
    }
  };


  if (!isInitialLoadComplete) return <div className="text-center p-10 text-2xl text-slate-300">게임 불러오는 중...</div>;
  if (currentView === GameView.START_SCREEN || !company) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-sky-900 p-4">
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl text-center w-full max-w-md">
          <h1 className="text-5xl font-bold text-sky-400 mb-6">게임데브스토리 Lite</h1>
          <p className="text-slate-300 mb-8">게임 개발 여정을 시작하려면 회사 이름을 입력하세요!</p>
          <input type="text" value={companyNameInput} onChange={(e) => setCompanyNameInput(e.target.value)} placeholder="당신의 멋진 회사 이름" className="w-full p-3 mb-6 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" />
          <ActionButton onClick={startGame} size="lg" variant="primary" className="w-full">회사 설립!</ActionButton>
        </div>
      </div>
    );
  }

  const officeEffectsForUI = getAggregatedOfficeEffects();
  const currentMaxEnergyForUI = BASE_MAX_ENERGY + officeEffectsForUI.staffMaxEnergyBoost;

  const prepareComparisonData = (): ComparisonData[] => {
    if (!company) return [];

    const playerData: ComparisonData = {
      name: company.name,
      funds: company.funds,
      reputation: company.companyReputation,
      releasedGamesCount: company.releasedGames.length,
      averageScoreScaled: parseFloat(((company.releasedGames.reduce((sum, game) => sum + game.reviewScore, 0) / (company.releasedGames.length || 1)) * 10).toFixed(1)) || 0,
      isPlayer: true,
    };

    const competitorData: ComparisonData[] = company.competitors.map(comp => ({
      name: comp.name,
      funds: comp.funds,
      reputation: comp.reputation,
      releasedGamesCount: comp.releasedGames.length,
      averageScoreScaled: parseFloat(((comp.releasedGames.reduce((sum, game) => sum + game.reviewScore, 0) / (comp.releasedGames.length || 1)) * 10).toFixed(1)) || 0,
      isPlayer: false,
    }));

    return [playerData, ...competitorData];
  };


  const renderMainDashboard = () => (
    <div className="space-y-6">
      {company.notifications.length > 0 && !company.isDelegationModeActive && (
        <div className="bg-slate-800 p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-sky-400 mb-2">알림</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto"> {/* Custom scrollbar can be added via className if defined globally */}
            {company.notifications.map((note, idx) => (
              <div key={idx} className={`p-2 rounded-md text-sm ${note.startsWith('🔥') ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                {note}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <ActionButton onClick={() => { setDevGameName(''); setSelectedGenre(''); setSelectedTheme(''); setSelectedPlatform(''); setSelectedEngine(null); setSelectedSequelToGameId(null); setMarketingBudget(0); setMarketingBudgetPercentage(0); setAssignedStaffIds([]); setCurrentView(GameView.DEVELOP_GAME); }} disabled={!!company.activeProject || company.staff.filter(s => s.status === 'idle').length === 0 || company.isDelegationModeActive} >새 게임 개발</ActionButton>
        <ActionButton onClick={() => setCurrentView(GameView.HIRE_STAFF)} disabled={company.staff.length >= MAX_STAFF_COUNT || company.isDelegationModeActive}>직원 고용</ActionButton>
        <ActionButton onClick={() => setCurrentView(GameView.RESEARCH_TECH)} disabled={!!company.researchTarget || company.isDelegationModeActive}>기술 연구</ActionButton>
        <ActionButton onClick={() => setCurrentView(GameView.ENGINE_DEVELOPMENT)} disabled={(!!company.activeEngineDevelopment && company.staff.filter(s => s.status === 'idle').length === 0) || company.isDelegationModeActive}>엔진 관리</ActionButton>
        <ActionButton onClick={() => setCurrentView(GameView.STAFF_TRAINING)} disabled={company.isDelegationModeActive}>직원 교육/역할</ActionButton>
        <ActionButton onClick={() => setCurrentView(GameView.OFFICE_MANAGEMENT)} disabled={company.isDelegationModeActive}>사무실 관리</ActionButton>
        <ActionButton onClick={() => { setSelectedCompetitorForView(null); setCurrentView(GameView.COMPETITOR_OVERVIEW); }} disabled={company.isDelegationModeActive}>경쟁사 현황</ActionButton>
        <ActionButton onClick={() => setCurrentView(GameView.TARGETED_MARKETING)} disabled={!!company.activeTargetedMarketingPush || company.isDelegationModeActive}>집중 마케팅</ActionButton>
        <ActionButton
            onClick={() => {
                if (!company.isDelegationModeActive && companyRef.current) {
                    handleNextMonth(companyRef.current);
                }
            }}
            variant="success"
            disabled={company.isDelegationModeActive}
        >다음 달</ActionButton>
      </div>

      {company.activeProject && ( <div className="bg-slate-800 p-4 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-sky-400">진행 중인 프로젝트: {company.activeProject.franchiseName ? `${company.activeProject.franchiseName} ${company.activeProject.sequelNumber}` : company.activeProject.name} {company.activeProject.engineUsedId ? `(${company.availableEngines.find(e=>e.id === company.activeProject!.engineUsedId)?.name})` : ''}</h3> <p>상태: <span className="font-medium text-amber-400">{company.activeProject.status === 'planning' ? '기획 중' : company.activeProject.status === 'developing' ? '개발 중' : company.activeProject.status === 'polishing' ? '마무리 중' : '완료'}</span></p> <p>진행도: {company.activeProject.monthsSpent} / {company.activeProject.developmentMonths} 개월차</p> <div className="w-full bg-slate-700 rounded-full h-2.5 mt-2"><div className="bg-sky-500 h-2.5 rounded-full" style={{ width: `${(company.activeProject.monthsSpent / company.activeProject.developmentMonths) * 100}%` }}></div></div> <p className="mt-1 text-sm text-slate-400">재미: {company.activeProject.points.fun.toFixed(0)}, 그래픽: {company.activeProject.points.graphics.toFixed(0)}, 사운드: {company.activeProject.points.sound.toFixed(0)}, 창의성: {company.activeProject.points.creativity.toFixed(0)}, 버그: {company.activeProject.points.bugs.toFixed(0)}</p> <p className="mt-1 text-sm text-amber-300">인지도: {company.activeProject.hype.toFixed(1)} (+{officeEffectsForUI.passiveHypeGeneration.toFixed(1)}/월)</p> <ProjectSpiderChart points={company.activeProject.points} /> </div> )}
      {company.researchTarget && ( <div className="bg-slate-800 p-3 rounded-lg shadow-sm"><p className="text-sm text-amber-400">현재 연구 중: {company.researchTarget.type === 'engine_blueprint' ? '엔진 설계도' : company.researchTarget.type === 'genre' ? '장르' : company.researchTarget.type === 'theme' ? '테마' : '플랫폼'} "{company.availableGenres.find(g=>g.id === company.researchTarget!.id)?.name || company.availableThemes.find(t=>t.id === company.researchTarget!.id)?.name || company.availablePlatforms.find(p=>p.id === company.researchTarget!.id)?.name || company.availableEngines.find(e=>e.id === company.researchTarget!.id)?.name || company.researchTarget.id}" Lv.{company.researchTarget.targetLevel}</p></div> )}
      {company.activeEngineDevelopment && ( <div className="bg-slate-800 p-3 rounded-lg shadow-sm"> <p className="text-sm text-purple-400">엔진 개발 중: "{company.activeEngineDevelopment.targetEngine.name}" ({company.activeEngineDevelopment.monthsSpent}/{company.availableEngines.find(e=>e.id === company.activeEngineDevelopment!.engineId)?.developmentMonthsRequired.toFixed(2) || company.activeEngineDevelopment.targetEngine.developmentMonthsRequired.toFixed(2)}개월)</p> <p className="text-xs text-purple-300">참여 직원: {company.activeEngineDevelopment.staffIds.map(sid => company.staff.find(s=>s.id===sid)?.name).join(', ')}</p> </div> )}
      {company.activeTargetedMarketingPush && ( <div className="bg-slate-800 p-3 rounded-lg shadow-sm"> <p className="text-sm text-pink-400">집중 마케팅 진행 중: "{company.activeTargetedMarketingPush.gameName}" ({company.activeTargetedMarketingPush.remainingMonths}/{company.activeTargetedMarketingPush.totalDuration}개월 남음)</p> </div> )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div> <h3 className="text-xl font-semibold text-sky-400 mb-3">직원 ({company.staff.length}/{MAX_STAFF_COUNT})</h3> <div className="bg-slate-800 p-4 rounded-lg shadow-md max-h-96 overflow-y-auto space-y-3"> {company.staff.map(s => ( <div key={s.id} className={`p-3 rounded ${s.status === 'working_on_game' ? 'bg-sky-900/50' : s.status === 'training' ? 'bg-purple-900/50' : s.status === 'developing_engine' ? 'bg-indigo-900/50' : s.status === 'on_vacation' || s.status === 'burnt_out' ? 'bg-yellow-900/50' : 'bg-slate-700'}`}> <div className="flex justify-between items-start"> <div onClick={() => !company.isDelegationModeActive && openStaffDetailModal(s)} className={`${!company.isDelegationModeActive ? 'cursor-pointer' : ''} flex-grow`}> <p className="font-semibold">{s.name} <span className="text-xs text-slate-400">(${s.salary.toLocaleString()}/월)</span> {s.specialistRole !== SpecialistRole.NONE && <span className="text-xs text-cyan-400">[{SPECIALIST_ROLE_KOREAN_NAMES[s.specialistRole]}]</span>}</p> <p className="text-xs">프:{s.programming} 그:{s.graphics} 사:{s.sound} 창:{s.creativity} 마:{s.marketing} 속:{s.speed} 체:{s.energy}/{currentMaxEnergyForUI}</p> <p className={`text-xs font-semibold ${s.status === 'burnt_out' ? 'text-red-400' : s.status === 'on_vacation' ? 'text-yellow-400' : s.status === 'training' ? 'text-purple-400' : s.status === 'developing_engine' ? 'text-indigo-400' : s.status === 'working_on_game' ? 'text-sky-400' : 'text-slate-400'}`}> 상태: {STAFF_STATUS_KOREAN_NAMES[s.status]} {s.status === 'training' && s.trainingSkill && ` (${SKILL_KOREAN_NAMES[s.trainingSkill]}, ${s.trainingMonthsRemaining}개월 남음)`} {(s.status === 'on_vacation' || s.status === 'burnt_out') && ` (${s.vacationMonthsRemaining}개월 남음)`} </p> </div> {s.status === 'idle' && !company.isDelegationModeActive && ( <ActionButton onClick={() => sendStaffOnVoluntaryVacation(s.id)} size="sm" variant="secondary" className="ml-2 text-xs whitespace-nowrap self-center" disabled={company.funds < VOLUNTARY_VACATION_COST_FLAT}>휴가</ActionButton> )} </div> </div> ))} </div> </div>
        <div> <h3 className="text-xl font-semibold text-sky-400 mb-3">출시된 게임 ({company.releasedGames.length})</h3> <div className="bg-slate-800 p-4 rounded-lg shadow-md max-h-96 overflow-y-auto space-y-3"> {company.releasedGames.slice().reverse().map(g => ( <div key={g.id} className="p-3 bg-slate-700 rounded"> <p className="font-semibold">{g.franchiseName ? `${g.franchiseName} ${g.sequelNumber}` : g.name} <span className={`text-sm ${g.reviewScore >= 8 ? 'text-emerald-400' : g.reviewScore >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>({g.reviewScore}/10)</span></p> <p className="text-xs">판매량: {g.unitsSold.toLocaleString()}, 수익: ${g.revenue.toLocaleString()}</p> <p className="text-xs text-slate-400">{g.genre.name} / {g.theme.name} - {g.platform.name} {g.engineUsedId ? `(${company.availableEngines.find(e=>e.id === g.engineUsedId)?.name || '구 엔진'})` : ''}</p> <p className="text-xs text-amber-300">현재 인지도: {g.currentHype.toFixed(1)}</p> <p className="text-xs text-slate-500">출시: {g.releaseYear}년 {g.releaseMonth}월</p> {g.reviewScore >= HALL_OF_FAME_THRESHOLD_SCORE && company.hallOfFameGameIds.includes(g.id) && <p className="text-xs text-yellow-300 font-semibold">🏆 명예의 전당 입성!</p>} {g.canBeFranchiseStarter && !g.isFranchise && !company.isDelegationModeActive && ( <ActionButton onClick={() => startFranchise(g.id)} size="sm" variant="primary" className="mt-1 text-xs">프랜차이즈 시작</ActionButton> )} {g.isFranchise && <span className="text-xs text-purple-400">프랜차이즈: {g.franchiseName}</span>} </div> ))} {company.releasedGames.length === 0 && <p className="text-slate-400">아직 출시된 게임이 없습니다.</p>} </div> </div>
      </div>
       <FinancialChart data={financialHistory} />
       <div className="mt-6">
         <CompetitorComparisonChart data={prepareComparisonData()} />
       </div>
    </div>
  );

  const handleGenerateRandomName = () => {
    if (selectedSequelToGameId) { const franchise = company?.activeFranchises.find(f => f.lastGameId === selectedSequelToGameId); if (franchise) { setDevGameName(generateRandomGameName(franchise.name, franchise.gamesInFranchise + 1)); return; } }
    setDevGameName(generateRandomGameName());
  };
  const handleMarketingInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!company) return; let budget = parseInt(e.target.value, 10) || 0; budget = Math.max(0, Math.min(budget, company.funds - (company.availablePlatforms.find(p=>p.id===selectedPlatform)?.licenseCost || 0) )); setMarketingBudget(budget);
    if (company.funds > 0) { setMarketingBudgetPercentage(Math.floor((budget / company.funds) * 100)); } else { setMarketingBudgetPercentage(0); }
  };
  const handleMarketingSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!company) return; const percentage = parseInt(e.target.value, 10); setMarketingBudgetPercentage(percentage); const platformCost = company.availablePlatforms.find(p=>p.id===selectedPlatform)?.licenseCost || 0; const availableForMarketing = company.funds - platformCost; const newBudget = Math.max(0, Math.min(Math.floor((percentage / 100) * company.funds), availableForMarketing)); setMarketingBudget(newBudget);
  };
  const handleSequelSelection = (gameId: string | null) => {
    setSelectedSequelToGameId(gameId);
    if (gameId) { const franchise = company?.activeFranchises.find(f => f.lastGameId === gameId); if (franchise) { setDevGameName(generateRandomGameName(franchise.name, franchise.gamesInFranchise + 1)); addNotification(`"${franchise.name}" 시리즈의 후속작을 개발합니다. 장르와 테마를 선택해주세요.`); } else { setDevGameName(generateRandomGameName()); }
    } else { setDevGameName(generateRandomGameName()); }
  };

  const renderDevelopGameScreen = () => ( <div className="bg-slate-800 p-6 rounded-lg shadow-xl space-y-4"> <h2 className="text-2xl font-semibold text-sky-400">새 게임 개발</h2> <div> <label className="block text-sm font-medium text-slate-300 mb-1">후속작 개발 (선택 사항)</label> <select value={selectedSequelToGameId || ''} onChange={e => handleSequelSelection(e.target.value || null)} className="w-full p-2 bg-slate-700 rounded border border-slate-600 mb-2"> <option value="">새로운 게임으로 개발</option> {company.activeFranchises.map(f => { const latestGameInFranchise = company.releasedGames.find(g => g.id === f.lastGameId); return ( <option key={f.id} value={f.lastGameId}> {f.name} 시리즈 (최신작: {latestGameInFranchise?.name || '알 수 없음'} - 점수: {f.lastGameScore.toFixed(1)}) </option> ); })} </select> </div> <div> <label className="block text-sm font-medium text-slate-300 mb-1">게임 이름</label> <div className="flex items-center space-x-2"> <input type="text" placeholder="게임 이름" value={devGameName} onChange={e => setDevGameName(e.target.value.slice(0,MAX_GAME_NAME_LENGTH))} className="w-full p-2 bg-slate-700 rounded border border-slate-600 flex-grow" /> <button onClick={handleGenerateRandomName} type="button" className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded text-sm font-semibold">자동</button> </div> </div> <select value={selectedGenre} onChange={e => setSelectedGenre(e.target.value)} className="w-full p-2 bg-slate-700 rounded border border-slate-600"><option value="">장르 선택</option>{company.availableGenres.filter(g=>g.researchLevel > 0).map(g => <option key={g.id} value={g.id}>{g.name} (Lv.{g.researchLevel})</option>)}</select> <select value={selectedTheme} onChange={e => setSelectedTheme(e.target.value)} className="w-full p-2 bg-slate-700 rounded border border-slate-600"><option value="">테마 선택</option>{company.availableThemes.filter(t=>t.researchLevel > 0).map(t => <option key={t.id} value={t.id}>{t.name} (Lv.{t.researchLevel})</option>)}</select> <select value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)} className="w-full p-2 bg-slate-700 rounded border border-slate-600"> <option value="">플랫폼 선택</option> {company.availablePlatforms.filter(p=>p.researchLevel > 0 && p.releaseYear <= company.currentYear).map(p => <option key={p.id} value={p.id}>{p.name} (Lv.{p.researchLevel}, 라이선스: ${p.licenseCost.toLocaleString()})</option>)} </select> <select value={selectedEngine || ''} onChange={e => setSelectedEngine(e.target.value || null)} className="w-full p-2 bg-slate-700 rounded border border-slate-600"> <option value="">엔진 선택 (선택 사항)</option> {company.availableEngines.filter(e=>e.status === 'available').map(e => <option key={e.id} value={e.id}>{e.name} (Lv.{e.researchLevel}, {e.description.substring(0,25)}...)</option>)} </select> <div> <label className="block text-sm font-medium text-slate-300">마케팅 예산 (최대 가용: ${ (company.funds - (company.availablePlatforms.find(p=>p.id===selectedPlatform)?.licenseCost || 0)).toLocaleString() })</label> <input type="number" placeholder="마케팅 예산" value={marketingBudget} onChange={handleMarketingInputChange} className="w-full p-2 bg-slate-700 rounded border border-slate-600 mb-2" max={company.funds - (company.availablePlatforms.find(p=>p.id===selectedPlatform)?.licenseCost || 0)} min={0}/> <div className="flex items-center space-x-2"> <input type="range" min="0" max="100" value={marketingBudgetPercentage} onChange={handleMarketingSliderChange} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500" disabled={company.funds <= 0 || (company.funds - (company.availablePlatforms.find(p=>p.id===selectedPlatform)?.licenseCost || 0)) <= 0} /> <span className="text-sm text-slate-400 w-12 text-right">{marketingBudgetPercentage}%</span> </div> </div> <div> <h4 className="text-lg font-medium text-slate-300 mb-2">직원 배정 (가능: {company.staff.filter(s => s.status === 'idle').length})</h4> <div className="max-h-48 overflow-y-auto space-y-1"> {company.staff.filter(s => s.status === 'idle').map(staff => ( <label key={staff.id} className="flex items-center space-x-2 p-2 bg-slate-700 rounded hover:bg-slate-600 cursor-pointer"> <input type="checkbox" checked={assignedStaffIds.includes(staff.id)} onChange={() => setAssignedStaffIds(prev => prev.includes(staff.id) ? prev.filter(id => id !== staff.id) : [...prev, staff.id])} className="form-checkbox h-5 w-5 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-400"/> <span>{staff.name} (프:{staff.programming} 그:{staff.graphics} 사:{staff.sound} 창:{staff.creativity} 속:{staff.speed} 체:{staff.energy}) {staff.specialistRole !== SpecialistRole.NONE && <span className="text-xs text-cyan-300">[{SPECIALIST_ROLE_KOREAN_NAMES[staff.specialistRole]}]</span>}</span> </label> ))} {company.staff.filter(s => s.status === 'idle').length === 0 && <p className="text-slate-500 text-sm">배정 가능한 (유휴 상태) 직원이 없습니다.</p>} </div> </div> <div className="flex space-x-2 pt-2"> <ActionButton onClick={startDevelopment} variant="success">개발 시작</ActionButton> <ActionButton onClick={() => setCurrentView(GameView.MAIN_DASHBOARD)} variant="secondary">취소</ActionButton> </div> </div> );
  const renderHireStaffScreen = () => {
    if (!company) return null; const currentStaffNames = company.staff.map(s => s.name); let availableNamesFromPool = KOREAN_NAMES_POOL.filter(name => !currentStaffNames.includes(name)); availableNamesFromPool.sort(() => 0.5 - Math.random());
    const officeEffectsForNewStaff = getAggregatedOfficeEffectsForCpu(company); const currentMaxEnergyForNewStaffHire = BASE_MAX_ENERGY + officeEffectsForNewStaff.staffMaxEnergyBoost;
    const candidates: Omit<StaffMember, 'id' | 'status' | 'trainingSkill' | 'trainingMonthsRemaining' | 'vacationMonthsRemaining' | 'specialistRole' | 'monthsInCurrentRole'>[] = Array.from({length: 3}).map(() => { const prog = Math.floor(Math.random() * 8) + 1; const graph = Math.floor(Math.random() * 8) + 1; const sound = Math.floor(Math.random() * 8) + 1; const creat = Math.floor(Math.random() * 8) + 1; const mark = Math.floor(Math.random() * 4) + 1; const speed = Math.floor(Math.random() * 7) + 1; const salary = BASE_STAFF_SALARY + (prog+graph+sound+creat+mark+speed) * STAFF_SALARY_PER_SKILL_POINT; let candidateName: string; if (availableNamesFromPool.length > 0) { candidateName = availableNamesFromPool.pop()!; } else { candidateName = `특별 지원자 ${Math.floor(Math.random() * 1000) + 1}`; } return { name: candidateName, programming: prog, graphics: graph, sound: sound, creativity: creat, marketing: mark, speed: speed, salary: salary, energy: currentMaxEnergyForNewStaffHire }; });
    return ( <div className="bg-slate-800 p-6 rounded-lg shadow-xl space-y-4"> <h2 className="text-2xl font-semibold text-sky-400">신규 직원 고용</h2> <p className="text-slate-400">자금: ${company.funds.toLocaleString()}. 현재 직원: {company.staff.length}/{MAX_STAFF_COUNT}</p> {company.staff.length >= MAX_STAFF_COUNT ? <p className="text-red-400">직원 수가 최대입니다.</p> :  candidates.map((candidate, idx) => ( <div key={`cand-${idx}`} className="bg-slate-700 p-3 rounded flex justify-between items-center"> <div> <p className="font-semibold">{candidate.name} <span className="text-xs text-slate-400">(${candidate.salary.toLocaleString()}/월)</span></p> <p className="text-xs">프:{candidate.programming} 그:{candidate.graphics} 사:{candidate.sound} 창:{candidate.creativity} 마:{candidate.marketing} 속:{candidate.speed}</p> </div> <ActionButton onClick={() => hireStaff(candidate)} size="sm" disabled={company.funds < candidate.salary * 2}>고용</ActionButton> </div> ))} <ActionButton onClick={() => setCurrentView(GameView.MAIN_DASHBOARD)} variant="secondary">대시보드로 돌아가기</ActionButton> </div> );
  };
  const renderResearchScreen = () => ( <div className="bg-slate-800 p-6 rounded-lg shadow-xl space-y-6"> <h2 className="text-2xl font-semibold text-sky-400">신기술 연구</h2> <p className="text-slate-400">자금: ${company.funds.toLocaleString()}. 연구 중: {company.researchTarget ? `${company.researchTarget.type === 'engine_blueprint' ? '엔진 설계도' : company.researchTarget.type === 'genre' ? '장르' : company.researchTarget.type === 'theme' ? '테마' : '플랫폼'} "${company.availableGenres.find(item => item.id === company.researchTarget!.id)?.name || company.availableThemes.find(item => item.id === company.researchTarget!.id)?.name || company.availablePlatforms.find(item => item.id === company.researchTarget!.id)?.name || company.availableEngines.find(item => item.id === company.researchTarget!.id)?.name || company.researchTarget.id}" Lv.${company.researchTarget.targetLevel}` : "없음"}</p>  {[ {name:'장르', key:'Genres', type:'genre' as ResearchableItemType, items: company.availableGenres.filter(i => i.researchLevel < i.maxResearchLevel)}, {name:'테마', key:'Themes', type:'theme' as ResearchableItemType, items: company.availableThemes.filter(i => i.researchLevel < i.maxResearchLevel)}, {name:'플랫폼', key:'Platforms', type:'platform' as ResearchableItemType, items: company.availablePlatforms.filter(i => i.researchLevel < i.maxResearchLevel && i.releaseYear <= company.currentYear)}, {name:'엔진 설계도', key:'Engines', type:'engine_blueprint' as ResearchableItemType, items: company.availableEngines.filter(i => i.researchLevel < i.maxResearchLevel)} ].map(categoryInfo => ( <div key={categoryInfo.key}> <h3 className="text-xl font-medium text-sky-300 mb-2">{categoryInfo.name}</h3> {categoryInfo.items.length === 0 && <p className="text-slate-500">현재 연구할 새로운 {categoryInfo.name.toLowerCase()}(이)가 없거나, 최대 레벨입니다.</p>} <div className="space-y-2"> {categoryInfo.items.map(item => {
    let baseCost: number;
    if (categoryInfo.type === 'platform') {
        const platformItem = item as GamePlatform;
        baseCost = Math.floor(platformItem.licenseCost / 2.5); // Default fallback
        if (typeof platformItem.researchCost === 'number' && platformItem.researchCost > 0) {
            baseCost = platformItem.researchCost; // Use explicit researchCost if valid
        }
    } else {
        // For GameGenre, GameTheme, GameEngine which have a non-optional researchCost
        baseCost = (item as GameGenre | GameTheme | GameEngine).researchCost;
    }
    const researchCostForNextLevel = baseCost * (item.researchLevel + 1);
    const targetLevel = item.researchLevel + 1;
    return ( <div key={item.id} className="bg-slate-700 p-3 rounded flex justify-between items-center"> <div> <p className="font-semibold">{item.name} (현재 Lv.{item.researchLevel} / 최대 Lv.{item.maxResearchLevel})</p> <p className="text-xs text-slate-400">다음 레벨(Lv.{targetLevel}) 연구 비용: ${researchCostForNextLevel.toLocaleString()}</p> </div> <ActionButton onClick={() => startResearch(categoryInfo.type, item.id, researchCostForNextLevel, targetLevel)} size="sm" disabled={!!company.researchTarget || company.funds < researchCostForNextLevel}>연구 (Lv.{targetLevel})</ActionButton> </div> )})} </div> </div> ))} <ActionButton onClick={() => setCurrentView(GameView.MAIN_DASHBOARD)} variant="secondary">대시보드로 돌아가기</ActionButton> </div> );
  const renderStaffTrainingScreen = () => {
    if (!company) return null; const trainingSkillIncrease = Math.round(BASE_TRAINING_SKILL_INCREASE * (1 + getAggregatedOfficeEffectsForCpu(company).trainingEffectivenessBoost));
    return ( <div className="bg-slate-800 p-6 rounded-lg shadow-xl space-y-6"> <h2 className="text-2xl font-semibold text-sky-400 mb-4">직원 교육 및 역할 관리</h2> <p className="text-slate-400">자금: ${company.funds.toLocaleString()}</p> <p className="text-slate-400 text-sm">교육 비용: ${TOTAL_TRAINING_COST.toLocaleString()} / 교육 기간: {TRAINING_MONTHS_DURATION}개월 / 스킬 향상: +{trainingSkillIncrease} (사무실 효과 포함)</p> <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2"> {company.staff.map(staff => ( <div key={staff.id} className={`p-4 rounded-lg ${staff.status !== 'idle' ? 'bg-slate-700/50 opacity-70' : 'bg-slate-700'}`}> <div className="flex justify-between items-center mb-2"> <h3 className="text-lg font-semibold text-slate-100">{staff.name} {staff.specialistRole !== SpecialistRole.NONE && <span className="text-sm text-cyan-400">[{SPECIALIST_ROLE_KOREAN_NAMES[staff.specialistRole]}]</span>}</h3> <ActionButton onClick={() => openStaffDetailModal(staff)} size="sm" variant="secondary" className="text-xs">상세/역할</ActionButton> </div> <p className="text-xs text-slate-300 mb-1">프: {staff.programming}, 그: {staff.graphics}, 사: {staff.sound}, 창: {staff.creativity}, 마: {staff.marketing}, 속: {staff.speed}, 체: {staff.energy}/{currentMaxEnergyForUI}</p> {staff.status !== 'idle' ? ( <p className="text-sm text-yellow-400">현재 {STAFF_STATUS_KOREAN_NAMES[staff.status]}. 교육 불가.</p> ) : ( <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2"> {TRAINABLE_SKILLS.map(skillKey => ( <ActionButton key={skillKey} onClick={() => startStaffTraining(staff.id, skillKey)} size="sm" variant="secondary" disabled={company.funds < TOTAL_TRAINING_COST} className="text-xs">{SKILL_KOREAN_NAMES[skillKey]} 교육</ActionButton> ))} </div> )} </div> ))} </div> <ActionButton onClick={() => setCurrentView(GameView.MAIN_DASHBOARD)} variant="primary" className="mt-4">대시보드로 돌아가기</ActionButton> </div> );
  };
  const renderStaffDetailModal = () => {
    if (!selectedStaffForDetail || !company) return null; const staff = selectedStaffForDetail;
    const availableRoles = Object.entries(SPECIALIST_ROLES_CONFIG) .map(([roleKey, config]) => ({ role: roleKey as Exclude<SpecialistRole, SpecialistRole.NONE>, config })) .filter(({role, config}) => { const primaryStatMet = config.primaryStatReq ? staff[config.primaryStatReq] >= (config.minPrimaryStat || 0) : true; const roleNotTaken = MAX_SPECIALISTS_PER_ROLE === 1 ? !company.staff.some(s => s.id !== staff.id && s.specialistRole === role) : true; return primaryStatMet && roleNotTaken; });
    const staffSkillsForChart: StaffSkills = { programming: staff.programming, graphics: staff.graphics, sound: staff.sound, creativity: staff.creativity, marketing: staff.marketing, speed: staff.speed };
    return ( <Modal isOpen={staffDetailModalOpen} onClose={() => {setStaffDetailModalOpen(false); setSelectedStaffForDetail(null);}} title={`${staff.name} - 상세 정보 및 역할 지정`} size="xl"> <div className="text-slate-300 space-y-3"> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <div> <p>현재 역할: <span className="font-semibold text-cyan-400">{SPECIALIST_ROLE_KOREAN_NAMES[staff.specialistRole]}</span></p> <p>급여: ${staff.salary.toLocaleString()} / 에너지: {staff.energy}/{currentMaxEnergyForUI}</p> <p>능력치: 프:{staff.programming} 그:{staff.graphics} 사:{staff.sound} 창:{staff.creativity} 마:{staff.marketing} 속:{staff.speed}</p> <hr className="border-slate-600 my-2"/> <h4 className="font-semibold text-sky-300">전문 역할 지정:</h4> {staff.status !== 'idle' && <p className="text-yellow-500 text-sm">직원이 현재 다른 업무 중이거나 휴가 중이어서 역할을 변경할 수 없습니다.</p>} {staff.status === 'idle' && ( <> {staff.specialistRole !== SpecialistRole.NONE && ( <ActionButton onClick={() => assignSpecialistRole(staff.id, SpecialistRole.NONE)} variant="danger" size="sm" className="mb-2">현재 역할 해제</ActionButton> )} <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-48 overflow-y-auto"> {availableRoles.map(({role, config}) => ( <button key={role} onClick={() => assignSpecialistRole(staff.id, role)} disabled={staff.specialistRole === role || company.funds < config.costToAssign} className={`p-2 rounded text-left w-full ${staff.specialistRole === role ? 'bg-sky-700 cursor-default' : 'bg-slate-700 hover:bg-slate-600'} disabled:opacity-50 disabled:cursor-not-allowed`} > <p className="font-semibold text-sky-400">{config.name}</p> <p className="text-xs">{config.description}</p> <p className="text-xs">요구: {config.primaryStatReq ? `${SKILL_KOREAN_NAMES[config.primaryStatReq]} ${config.minPrimaryStat || 0}+, ` : ''}비용 $${config.costToAssign.toLocaleString()}</p> <p className="text-xs">급여 +{((config.salaryIncreaseFactor - 1) * 100).toFixed(0)}%</p> </button> ))} {availableRoles.length === 0 && <p className="text-slate-400 text-sm col-span-full">지정 가능한 역할이 없거나, 직원의 능력치가 부족합니다.</p>} </div> </> )} </div> <div> <StaffSkillsSpiderChart skills={staffSkillsForChart} /> </div> </div> <ActionButton onClick={() => {setStaffDetailModalOpen(false); setSelectedStaffForDetail(null);}} variant="secondary" className="mt-4 w-full">닫기</ActionButton> </div> </Modal> );
  };
  const renderOfficeManagementScreen = () => ( <div className="bg-slate-800 p-6 rounded-lg shadow-xl space-y-6"> <h2 className="text-2xl font-semibold text-sky-400 mb-4">사무실 관리</h2> <p className="text-slate-400">회사 자금: ${company.funds.toLocaleString()}</p> <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2"> {company.officeUpgrades.map(upgrade => ( <div key={upgrade.id} className="bg-slate-700 p-4 rounded-lg"> <h3 className="text-xl font-semibold text-sky-300">{upgrade.upgradeName} <span className="text-sm text-slate-400">({upgrade.categoryName})</span></h3> {upgrade.currentLevel > 0 && <p className="text-xs text-emerald-400 mb-1">현재 레벨: {upgrade.currentLevel} ({upgrade.tiers[upgrade.currentLevel -1].name})</p>} {upgrade.currentLevel === 0 && <p className="text-xs text-slate-400 mb-1">아직 구매하지 않음</p>} <div className="space-y-3 mt-2"> {upgrade.tiers.map(tier => { const canPurchase = upgrade.currentLevel === tier.level - 1 && company.funds >= tier.cost; const isPurchased = upgrade.currentLevel >= tier.level; const isNext = upgrade.currentLevel === tier.level - 1; return ( <div key={tier.level} className={`p-3 rounded-md ${isPurchased ? 'bg-emerald-800/30' : isNext ? 'bg-slate-600' : 'bg-slate-600/50 opacity-70'}`}> <p className="font-semibold">{tier.name} (레벨 {tier.level})</p> <p className="text-xs text-slate-300 mb-1">{tier.description}</p> <ul className="text-xs list-disc list-inside pl-2 text-sky-400"> {tier.effects.staffEnergyRecoveryBoost && <li>직원 휴식 시 에너지 회복 +{tier.effects.staffEnergyRecoveryBoost.toFixed(1)}</li>} {tier.effects.staffMaxEnergyBoost && <li>직원 최대 에너지 +{tier.effects.staffMaxEnergyBoost}</li>} {tier.effects.globalSpeedBoost && <li>전체 직원 속도 +{(tier.effects.globalSpeedBoost * 100).toFixed(0)}%</li>} {tier.effects.globalCreativityBoost && <li>전체 직원 창의력 +{(tier.effects.globalCreativityBoost * 100).toFixed(0)}%</li>} {tier.effects.trainingEffectivenessBoost && <li>훈련 효과 +{(tier.effects.trainingEffectivenessBoost * 100).toFixed(0)}%</li>} {tier.effects.passiveHypeGeneration && <li>프로젝트 인지도 자연 증가 +{tier.effects.passiveHypeGeneration.toFixed(1)}/월</li>} {tier.effects.bugReductionFactor && <li>버그 발생률 -{((1 - tier.effects.bugReductionFactor) * 100).toFixed(0)}%</li>} </ul> {!isPurchased && isNext && ( <ActionButton onClick={() => purchaseOfficeUpgrade(upgrade.id, tier.level)} disabled={!canPurchase} variant={canPurchase ? "success" : "secondary"} size="sm" className="mt-2 w-full" > 구매: ${tier.cost.toLocaleString()} </ActionButton> )} {isPurchased && <p className="text-xs text-emerald-300 mt-2">✓ 구매 완료</p>} {!isPurchased && !isNext && <p className="text-xs text-slate-500 mt-2">이전 등급 필요</p>} </div> ); })} </div> </div> ))} </div> <ActionButton onClick={() => setCurrentView(GameView.MAIN_DASHBOARD)} variant="primary" className="mt-6">대시보드로 돌아가기</ActionButton> </div> );
  const renderEngineDevelopmentScreen = () => ( <div className="bg-slate-800 p-6 rounded-lg shadow-xl space-y-6"> <h2 className="text-2xl font-semibold text-sky-400 mb-4">게임 엔진 관리</h2> {company.activeEngineDevelopment && ( <div className="mb-6 p-4 bg-purple-800/30 rounded-lg"> <h3 className="text-xl font-semibold text-purple-300">현재 개발 중인 엔진</h3> <p>엔진: {company.activeEngineDevelopment.targetEngine.name}</p> <p>진행: {company.activeEngineDevelopment.monthsSpent} / {company.availableEngines.find(e=>e.id === company.activeEngineDevelopment!.engineId)?.developmentMonthsRequired.toFixed(2) || company.activeEngineDevelopment.targetEngine.developmentMonthsRequired.toFixed(2)} 개월</p> <p>참여 직원: {company.activeEngineDevelopment.staffIds.map(sid => company.staff.find(s=>s.id===sid)?.name).join(', ')}</p> <ActionButton onClick={cancelEngineDevelopmentProject} variant="danger" size="sm" className="mt-2" disabled={company.isDelegationModeActive}>개발 취소</ActionButton> </div> )} <div> <h3 className="text-xl font-medium text-sky-300 mb-2">개발 가능한 엔진 (설계도 연구 Lv.1 이상)</h3> {company.availableEngines.filter(e => e.researchLevel > 0 && e.status === 'locked').length === 0 && <p className="text-slate-500">개발 가능한 엔진이 없습니다. 먼저 엔진 설계도를 연구하고 레벨을 올리세요.</p>} <div className="space-y-3"> {company.availableEngines.filter(e => e.researchLevel > 0 && e.status === 'locked').map(engine => ( <div key={engine.id} className="bg-slate-700 p-3 rounded"> <p className="font-semibold">{engine.name} (설계도 Lv.{engine.researchLevel}) <span className="text-xs text-slate-400">({engine.developmentMonthsRequired.toFixed(2)}개월 소요)</span></p> <p className="text-xs text-slate-300">{engine.description}</p> <ActionButton onClick={() => handleStartEngineDevelopment(engine)} size="sm" variant="success" className="mt-2" disabled={!!company.activeEngineDevelopment || company.staff.filter(s => s.status === 'idle').length === 0 || company.isDelegationModeActive}>개발 시작</ActionButton> </div> ))} </div> </div> <div> <h3 className="text-xl font-medium text-sky-300 mb-2">보유 중인 엔진 (개발 완료)</h3> {company.availableEngines.filter(e => e.status === 'available').length === 0 && <p className="text-slate-500">보유 중인 엔진이 없습니다.</p>} <div className="space-y-3"> {company.availableEngines.filter(e => e.status === 'available').map(engine => ( <div key={engine.id} className="bg-slate-700 p-3 rounded"> <p className="font-semibold text-emerald-400">{engine.name} (설계도 Lv.{engine.researchLevel})</p> <p className="text-xs text-slate-300">{engine.description}</p> <ul className="text-xs list-disc list-inside pl-2 text-sky-300"> {engine.benefits.funBoost && <li>재미 +{(engine.benefits.funBoost*100).toFixed(0)}%</li>} {engine.benefits.graphicsBoost && <li>그래픽 +{(engine.benefits.graphicsBoost*100).toFixed(0)}%</li>} {engine.benefits.soundBoost && <li>사운드 +{(engine.benefits.soundBoost*100).toFixed(0)}%</li>} {engine.benefits.creativityBoost && <li>창의력 +{(engine.benefits.creativityBoost*100).toFixed(0)}%</li>} {engine.benefits.programmingBoost && <li>프로그래밍 +{(engine.benefits.programmingBoost*100).toFixed(0)}%</li>} {engine.benefits.innovationBoost && <li>혁신성 +{(engine.benefits.innovationBoost*100).toFixed(0)}%</li>} {engine.benefits.speedBoost && <li>개발 속도 +{(engine.benefits.speedBoost*100).toFixed(0)}%</li>} {engine.benefits.bugReductionFactor && <li>버그 발생률 -{((1-engine.benefits.bugReductionFactor)*100).toFixed(0)}%</li>} </ul> </div> ))} </div> </div> <ActionButton onClick={() => setCurrentView(GameView.MAIN_DASHBOARD)} variant="primary" className="mt-4">대시보드로 돌아가기</ActionButton> </div> );
  const renderGameReportModal = () => ( <Modal isOpen={currentView === GameView.GAME_REPORT && !!lastReleasedGame} onClose={() => {setCurrentView(GameView.MAIN_DASHBOARD); setLastReleasedGame(null);}} title={`"${lastReleasedGame?.franchiseName ? `${lastReleasedGame.franchiseName} ${lastReleasedGame.sequelNumber}`: lastReleasedGame?.name}" 출시 보고서!`} size="lg"> {lastReleasedGame && ( <div className="space-y-3 text-slate-300"> <p><span className="font-semibold text-sky-400">장르:</span> {lastReleasedGame.genre.name} (Lv.{lastReleasedGame.genre.researchLevel})</p> <p><span className="font-semibold text-sky-400">테마:</span> {lastReleasedGame.theme.name} (Lv.{lastReleasedGame.theme.researchLevel})</p> <p><span className="font-semibold text-sky-400">플랫폼:</span> {lastReleasedGame.platform.name} (Lv.{lastReleasedGame.platform.researchLevel})</p> {lastReleasedGame.engineUsedId && <p><span className="font-semibold text-sky-400">사용 엔진:</span> {company.availableEngines.find(e=>e.id === lastReleasedGame.engineUsedId)?.name || '알 수 없는 엔진'} (Lv.{company.availableEngines.find(e=>e.id === lastReleasedGame.engineUsedId)?.researchLevel})</p>} {lastReleasedGame.isFranchise && <p><span className="font-semibold text-purple-400">프랜차이즈:</span> {lastReleasedGame.franchiseName} (시리즈 {lastReleasedGame.sequelNumber}번째 작품)</p>} <hr className="border-slate-600 my-2"/> <p className="text-2xl">리뷰 점수: <span className={`font-bold ${lastReleasedGame.reviewScore >= 8 ? 'text-emerald-400' : lastReleasedGame.reviewScore >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>{lastReleasedGame.reviewScore.toFixed(1)} / 10</span></p> <p><span className="font-semibold text-sky-400">최종 능력치:</span> 재미 {lastReleasedGame.points.fun.toFixed(0)}, 그래픽 {lastReleasedGame.points.graphics.toFixed(0)}, 사운드 {lastReleasedGame.points.sound.toFixed(0)}, 창의성 {lastReleasedGame.points.creativity.toFixed(0)}</p> <p><span className="font-semibold text-red-400">버그:</span> {lastReleasedGame.points.bugs.toFixed(0)}</p> <p><span className="font-semibold text-amber-400">출시 시 인지도:</span> {lastReleasedGame.hype.toFixed(0)}</p> <p><span className="font-semibold text-amber-300">현재 인지도:</span> {lastReleasedGame.currentHype.toFixed(0)}</p> <hr className="border-slate-600 my-2"/> <p><span className="font-semibold text-sky-400">판매량:</span> {lastReleasedGame.unitsSold.toLocaleString()} 개</p> <p><span className="font-semibold text-emerald-400">총 수익:</span> ${lastReleasedGame.revenue.toLocaleString()}</p> <ActionButton onClick={() => {setCurrentView(GameView.MAIN_DASHBOARD); setLastReleasedGame(null);}} className="mt-4 w-full">훌륭해요!</ActionButton> </div> )} </Modal> );
  const renderGameAwardsScreen = () => {
    if (!pendingAwardsToShow || !company) return null;
    return (
      <div className="fixed inset-0 bg-slate-900 bg-opacity-95 flex flex-col items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-6 text-center">🏆 {company.currentYear -1}년 게임 대상 🏆</h1>
          {pendingAwardsToShow.length === 0 ? (
            <p className="text-slate-300 text-center text-lg my-8">아쉽지만, {company.currentYear -1}년도에는 수상한 게임이 없습니다.</p>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {pendingAwardsToShow.map(award => (
                <div key={award.id} className={`p-4 rounded-lg shadow ${award.awardedToPlayer ? 'bg-slate-700' : 'bg-slate-600/70'}`}>
                  <h2 className="text-xl font-semibold text-sky-400">{award.categoryDisplayName}</h2>
                  <p className="text-lg text-slate-100">
                    수상작: <span className={`font-bold ${award.awardedToPlayer ? 'text-emerald-300' : 'text-amber-400'}`}>"{award.gameName}"</span>
                    {!award.awardedToPlayer && award.competitorName && <span className="text-sm text-slate-400"> ({award.competitorName})</span>}
                  </p>
                  {award.awardedToPlayer && award.prizeMoney > 0 && <p className="text-sm text-yellow-500">상금: ${award.prizeMoney.toLocaleString()}</p>}
                  {award.awardedToPlayer && award.reputationGain > 0 && <p className="text-sm text-purple-400">명성 +{award.reputationGain}</p>}
                </div>
              ))}
            </div>
          )}
          <ActionButton
            onClick={() => {
              setPendingAwardsToShow(null);
              if(lastReleasedGame && company.activeProject === null && currentView !== GameView.GAME_REPORT) {
                setCurrentView(GameView.GAME_REPORT);
              } else {
                setCurrentView(GameView.MAIN_DASHBOARD);
              }
            }}
            size="lg"
            variant="primary"
            className="w-full mt-8"
          >
            {company.currentYear}년으로 계속
          </ActionButton>
        </div>
      </div>
    );
  };
  const renderEngineDevStaffModal = () => ( <Modal isOpen={engineDevModalOpen && !!selectedEngineToDevelop} onClose={() => {setEngineDevModalOpen(false); setEngineDevAssignedStaffIds([]);}} title={`엔진 "${selectedEngineToDevelop?.name}" 개발팀 구성`} size="md"> <p className="text-slate-300 mb-2">개발 기간: {selectedEngineToDevelop?.developmentMonthsRequired.toFixed(2)}개월 (설계도 Lv.{selectedEngineToDevelop?.researchLevel}). 최대 {MAX_STAFF_ON_ENGINE_PROJECT}명 배정 가능.</p> <div className="max-h-60 overflow-y-auto space-y-2 mb-4"> {company.staff.filter(s => s.status === 'idle').map(staff => ( <label key={staff.id} className="flex items-center space-x-2 p-2 bg-slate-700 rounded hover:bg-slate-600 cursor-pointer"> <input type="checkbox" checked={engineDevAssignedStaffIds.includes(staff.id)} onChange={() => { setEngineDevAssignedStaffIds(prev => prev.includes(staff.id) ? prev.filter(id => id !== staff.id) : prev.length < MAX_STAFF_ON_ENGINE_PROJECT ? [...prev, staff.id] : prev ); }} disabled={!engineDevAssignedStaffIds.includes(staff.id) && engineDevAssignedStaffIds.length >= MAX_STAFF_ON_ENGINE_PROJECT} className="form-checkbox h-5 w-5 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-400" /> <span>{staff.name} (프:{staff.programming} 속:{staff.speed} 체:{staff.energy})</span> </label> ))} {company.staff.filter(s => s.status === 'idle').length === 0 && <p className="text-slate-400">배정 가능한 유휴 직원이 없습니다.</p>} </div> <div className="flex justify-end space-x-2"> <ActionButton onClick={() => {setEngineDevModalOpen(false); setEngineDevAssignedStaffIds([]);}} variant="secondary">취소</ActionButton> <ActionButton onClick={confirmStartEngineDevelopment} variant="success" disabled={engineDevAssignedStaffIds.length === 0}>개발 시작</ActionButton> </div> </Modal> );
  const renderTargetedMarketingScreen = () => {
    if (!company) return null;
    const eligibleGamesForMarketing = [ ...(company.activeProject && company.activeProject.status === 'polishing' ? [company.activeProject] : []), ...company.releasedGames.filter(g => { const monthsSinceRelease = (company.currentYear * 12 + company.currentMonth) - (g.releaseYear * 12 + g.releaseMonth); return monthsSinceRelease <= MARKETING_PUSH_ELIGIBILITY_MONTHS_POST_RELEASE; }) ];
    const selectedGameDetails = eligibleGamesForMarketing.find(g => g.id === selectedGameForMarketing); const totalHypeBoost = TARGETED_MARKETING_PUSH_INITIAL_HYPE_BOOST + (TARGETED_MARKETING_PUSH_MONTHLY_HYPE_BOOST * TARGETED_MARKETING_PUSH_DURATION_MONTHS);
    return ( <div className="bg-slate-800 p-6 rounded-lg shadow-xl space-y-6"> <h2 className="text-2xl font-semibold text-sky-400">집중 마케팅 캠페인</h2> {company.activeTargetedMarketingPush ? ( <div> <p className="text-lg text-pink-400">현재 "{company.activeTargetedMarketingPush.gameName}" 마케팅 캠페인 진행 중입니다.</p> <p className="text-slate-300">{company.activeTargetedMarketingPush.remainingMonths} / {company.activeTargetedMarketingPush.totalDuration} 개월 남음.</p> <ActionButton onClick={() => setCurrentView(GameView.MAIN_DASHBOARD)} variant="secondary" className="mt-4">대시보드로 돌아가기</ActionButton> </div> ) : ( <> <p className="text-slate-400">회사 자금: ${company.funds.toLocaleString()}</p> <p className="text-slate-300">하나의 게임을 선택하여 {TARGETED_MARKETING_PUSH_DURATION_MONTHS}개월간 집중 마케팅을 진행합니다.</p> <p className="text-sm text-slate-400">비용: ${TARGETED_MARKETING_PUSH_COST.toLocaleString()}, 초기 인지도 +{TARGETED_MARKETING_PUSH_INITIAL_HYPE_BOOST}, 매월 인지도 +{TARGETED_MARKETING_PUSH_MONTHLY_HYPE_BOOST}, 완료 시 명성 +{TARGETED_MARKETING_PUSH_REPUTATION_BOOST_ON_COMPLETION}</p> <div> <label htmlFor="marketing-game-select" className="block text-sm font-medium text-slate-300 mb-1">마케팅 대상 게임 선택:</label> <select id="marketing-game-select" value={selectedGameForMarketing || ""} onChange={(e) => setSelectedGameForMarketing(e.target.value || null)} className="w-full p-2 bg-slate-700 rounded border border-slate-600 text-slate-100" > <option value="">-- 게임 선택 --</option> {eligibleGamesForMarketing.map(game => ( <option key={game.id} value={game.id}> {game.name} {game.status === 'polishing' ? " (개발 중 - 마무리 단계)" : ` (출시작 - ${(game as ReleasedGame).reviewScore?.toFixed(1)}점, 인지도: ${(game as ReleasedGame).currentHype?.toFixed(0)})`} </option> ))} </select> {eligibleGamesForMarketing.length === 0 && <p className="text-sm text-slate-500 mt-1">마케팅 가능한 게임이 없습니다 (개발 마지막 단계 또는 최근 출시작).</p>} </div> {selectedGameForMarketing && selectedGameDetails && ( <div className="mt-4 p-3 bg-slate-700/50 rounded"> <p className="font-semibold">선택된 게임: {selectedGameDetails.name}</p> <p className="text-sm">예상 총 인지도 증가: +{totalHypeBoost}</p> <p className="text-sm">캠페인 완료 시 명성 증가: +{TARGETED_MARKETING_PUSH_REPUTATION_BOOST_ON_COMPLETION}</p> </div> )} <div className="flex space-x-3 mt-6"> <ActionButton onClick={startTargetedMarketingPush} variant="success" disabled={!selectedGameForMarketing || company.funds < TARGETED_MARKETING_PUSH_COST} > 마케팅 시작! (${TARGETED_MARKETING_PUSH_COST.toLocaleString()}) </ActionButton> <ActionButton onClick={() => {setSelectedGameForMarketing(null); setCurrentView(GameView.MAIN_DASHBOARD);}} variant="secondary">취소</ActionButton> </div> </> )} </div> );
  };

  const renderCompetitorOverviewScreen = () => {
    if (!company) return null;
    const competitorToShow = selectedCompetitorForView || company.competitors[0];

    return (
      <div className="bg-slate-800 p-6 rounded-lg shadow-xl space-y-6">
        <div className="flex justify-between items-center">
             <h2 className="text-2xl font-semibold text-sky-400">경쟁사 현황</h2>
             <ActionButton onClick={() => { setSelectedCompetitorForView(null); setCurrentView(GameView.MAIN_DASHBOARD);}} variant="secondary">대시보드</ActionButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 space-y-2">
                <h3 className="text-lg font-semibold text-sky-300">경쟁사 목록</h3>
                {company.competitors.map(comp => (
                    <button
                        key={comp.id}
                        onClick={() => setSelectedCompetitorForView(comp)}
                        className={`w-full text-left p-2 rounded ${selectedCompetitorForView?.id === comp.id ? 'bg-sky-700 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
                    >
                        {comp.name}
                    </button>
                ))}
            </div>
            {competitorToShow && (
                 <div className="md:col-span-3 bg-slate-700 p-4 rounded-lg space-y-3">
                    <h3 className="text-xl font-bold text-amber-400">{competitorToShow.name}</h3>
                    <p>자금: <span className={competitorToShow.funds >=0 ? 'text-emerald-400' : 'text-red-400'}>${competitorToShow.funds.toLocaleString()}</span></p>
                    <p>평판: {competitorToShow.reputation} / 기술력: {competitorToShow.skillLevel}</p>
                    <p>선호 장르: {competitorToShow.preferredGenreIds.map(gid => company.availableGenres.find(g => g.id === gid)?.name || gid).join(', ')}</p>
                    <p>선호 테마: {competitorToShow.preferredThemeIds.map(tid => company.availableThemes.find(t => t.id === tid)?.name || tid).join(', ')}</p>

                    {competitorToShow.activeProject ? (
                        <div className="mt-3 pt-3 border-t border-slate-600">
                            <h4 className="text-lg font-semibold text-sky-300">현재 개발 중인 게임:</h4>
                            <p className="font-medium">{competitorToShow.activeProject.name}</p>
                            <p className="text-xs">장르: {company.availableGenres.find(g=>g.id === competitorToShow.activeProject!.genreId)?.name || '알 수 없음'} / 테마: {company.availableThemes.find(t=>t.id === competitorToShow.activeProject!.themeId)?.name || '알 수 없음'} / 플랫폼: {company.availablePlatforms.find(p=>p.id === competitorToShow.activeProject!.platformId)?.name || '알 수 없음'}</p>
                            <p className="text-xs">진행: {competitorToShow.activeProject.currentMonthsSpent} / {competitorToShow.activeProject.monthsToCompletion} 개월 (예상 품질: {competitorToShow.activeProject.estimatedQuality}/100)</p>
                        </div>
                    ) : (
                        <p className="text-slate-400 mt-3 pt-3 border-t border-slate-600">현재 개발 중인 게임 없음. (마지막 출시 후 {competitorToShow.monthsSinceLastGameRelease}개월 경과)</p>
                    )}

                    {competitorToShow.releasedGames.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-600">
                            <h4 className="text-lg font-semibold text-sky-300">최근 출시작 (최대 {COMPETITOR_MAX_RELEASED_GAMES_HISTORY}개):</h4>
                            <ul className="space-y-1 list-disc list-inside text-xs">
                                {competitorToShow.releasedGames.map(game => (
                                    <li key={game.id}>
                                        {game.name} - {game.genreName}/{game.themeName} ({game.platformName})
                                        <span className={`ml-2 ${game.reviewScore >= 7 ? 'text-emerald-400' : game.reviewScore >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {game.reviewScore}/10
                                        </span>
                                        <span className="text-slate-400 ml-2">({game.releaseYear}년 {game.releaseMonth}월)</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                     {competitorToShow.failedProjectStreak > 0 && <p className="text-sm text-red-300 mt-2">연속 프로젝트 실패: {competitorToShow.failedProjectStreak}회</p>}
                </div>
            )}
        </div>
      </div>
    );
  };

  const renderResetConfirmationModal = () => (
    <Modal isOpen={showResetConfirmationModal} onClose={() => setShowResetConfirmationModal(false)} title="게임 초기화 확인" size="sm">
        <p className="text-slate-300 mb-6">정말로 모든 진행 상황을 초기화하고 게임을 처음부터 다시 시작하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
        <div className="flex justify-end space-x-3">
            <ActionButton onClick={() => setShowResetConfirmationModal(false)} variant="secondary">취소</ActionButton>
            <ActionButton onClick={confirmAndResetGame} variant="danger">초기화</ActionButton>
        </div>
    </Modal>
  );


  let viewToRender;
  switch (currentView) {
    case GameView.MAIN_DASHBOARD: viewToRender = renderMainDashboard(); break;
    case GameView.DEVELOP_GAME: viewToRender = renderDevelopGameScreen(); break;
    case GameView.HIRE_STAFF: viewToRender = renderHireStaffScreen(); break;
    case GameView.RESEARCH_TECH: viewToRender = renderResearchScreen(); break;
    case GameView.STAFF_TRAINING: viewToRender = renderStaffTrainingScreen(); break;
    case GameView.ENGINE_DEVELOPMENT: viewToRender = renderEngineDevelopmentScreen(); break;
    case GameView.OFFICE_MANAGEMENT: viewToRender = renderOfficeManagementScreen(); break;
    case GameView.TARGETED_MARKETING: viewToRender = renderTargetedMarketingScreen(); break;
    case GameView.COMPETITOR_OVERVIEW: viewToRender = renderCompetitorOverviewScreen(); break;
    default: viewToRender = renderMainDashboard();
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 selection:bg-sky-500 selection:text-white">
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-800 p-4 rounded-lg shadow-lg">
          <div>
            <h1 className="text-3xl font-bold text-sky-400">{company.name}</h1>
            <p className="text-slate-300">자금: <span className={company.funds >= 0 ? 'text-emerald-400' : 'text-red-400'}>${company.funds.toLocaleString()}</span> | 명성: <span className="text-purple-400">{company.companyReputation}</span></p>
            <p className="text-slate-400 text-sm">현재 날짜: {company.currentYear}년 {company.currentMonth}월</p>
          </div>
          <div className="mt-3 sm:mt-0 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <ActionButton
                onClick={toggleDelegationMode}
                variant={company.isDelegationModeActive ? "danger" : "primary"}
                size="sm"
            >
                위임 모드: {company.isDelegationModeActive ? "ON" : "OFF"}
            </ActionButton>
            <ActionButton onClick={handleResetGame} variant="danger" size="sm" className="whitespace-nowrap">게임 초기화</ActionButton>
          </div>
        </div>
         {company.isGameOver && ( <div className="fixed inset-0 z-50 bg-black bg-opacity-85 flex flex-col items-center justify-center p-4"> <div className="bg-slate-800 p-8 rounded-xl shadow-2xl text-center w-full max-w-md"> <h2 className="text-4xl font-bold text-red-500 mb-4">게임 오버!</h2> <p className="text-slate-300 mb-6">{company.name} 회사가 파산했습니다.</p> <p className="text-slate-400 mb-8">새로운 시작을 위해 게임을 초기화해주세요.</p> <ActionButton onClick={handleResetGame} variant="primary" size="lg" className="w-full">새 게임 시작</ActionButton> </div> </div> )}
         {company.isDelegationModeActive && ( <div className="mt-2 p-2 bg-sky-800/50 rounded-md text-sm text-sky-300"> <p className="font-semibold">위임 모드 활성: CPU가 자동으로 게임을 진행합니다.</p> <div className="max-h-24 overflow-y-auto mt-1 text-xs space-y-0.5"> {delegationActionLog.map((log, idx) => <p key={idx}>{log}</p>)} </div> </div> )}
      </header>

      <main className="container mx-auto">
        {viewToRender}
      </main>
      {renderGameReportModal()}
      {renderStaffDetailModal()}
      {renderEngineDevStaffModal()}
      {currentView === GameView.GAME_AWARDS && renderGameAwardsScreen()}
      {renderResetConfirmationModal()}

    </div>
  );
};

export default App;
