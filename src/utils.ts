// This file is for stuff available to both the server and browser

import { anySprites } from './assets';
import type { ActiveEnemy, EnemyTemplate, EnemyTemplateId } from './enemies';
import type { Item, ItemDamageData, ItemId, ItemState } from './items';
import type { SceneDataId } from './scenes';
import type { StatusId } from './statuses';
import type { HeroName, Player, UnitStatsState } from './users';

export type UnitId = HeroId | EnemyId | VisualActionSourceId;
export type HeroId = `hero${string}`;
export type EnemyId = `enemy${string}`;
export type VisualActionSourceId = `vas${string}`;

export type BattleAnimation = {
	triggeredBy: HeroId;
	source: UnitId;
	putsStatuses?: StatusModifyAnimation[];
	behavior: AnimationBehavior;
	animateTo?:UnitId;
	alsoDamages?: DamageAnimation[];
	alsoHeals?: HealAnimation[];
	alsoModifiesAggro?: AggroModifier[];
	takesItem?: boolean;
	teleporting?: boolean;
	noResetAggro?:boolean;
};

export type DataFirstLoad = {
	cookieMissing?: boolean;
	noPlayer?: boolean;
	yourHeroCookie?: string;
	noMatch?: boolean;
	readyToSubscribe?: boolean;
	userId?: string;
};

export type BattleEventEntity =
	| { kind: 'player'; entity: Player }
	| { kind: 'enemy'; entity: ActiveEnemy };

export type BattleEvent = {
	source: BattleEventEntity;
	primaryTarget:BattleEventEntity;
	itemUsed:Item;
};


export type OffenseKind = 'brutal' | 'skillful' | 'magical'

export type StatusMod = { statusId: StatusId; count: number };
export type StatusModifyAnimation = { target: UnitId, statusId: StatusId; count?: number, remove?:boolean };
export type StatusModifierEvent = { target: BattleEventEntity, dispell?:'good'|'bad', statusMod?:StatusMod };
export type DamageAnimation = { target: UnitId; amount: number[], causedDeath:boolean };
export type HealAnimation = { target: UnitId; amount: number };

export type DamageEvent = {
	target: BattleEventEntity;
	itemDamageData:ItemDamageData;
};
export type HealEvent = {
	target: BattleEventEntity;
	baseHeal: number;
};

export type AggroModifier = {
	target: EnemyId;
	forHeros: { hId: HeroId; amount: number }[];
};
export type AggroModifierEvent = {
	targetEnemy: ActiveEnemy;
	baseAmount: number;
	forHeros: Player[];
};
export type AnySprite = keyof typeof anySprites

export type LandscapeImage = 'plains' | 'castle' | 'bridge' | 'grimForest';

// export type UseBonus = 'strength' | 'agility'

export type MeleeAnimation = { kind: 'melee' };
export type MissleAnimation = { kind: 'missile'; extraSprite: AnySprite };
export type TravelAnimation = { kind: 'travel' };
export type CenterAnimation = { kind: 'center'; extraSprite: AnySprite };
export type SelfInflictAnimation = { kind: 'selfInflicted'; extraSprite: AnySprite };

export type AnimateToUnit = { animateTo: UnitId };

export type AnimationBehavior =
	| (MissleAnimation)
	| (MeleeAnimation)
	| (TravelAnimation)
	| CenterAnimation
	| SelfInflictAnimation;

export type AnimationBehaviorAnimatesToUnit = MissleAnimation | MeleeAnimation | TravelAnimation;
export type ItemAnimationBehaviorAnimatesToUnit = MissleAnimation | MeleeAnimation;

export type ItemAnimationBehavior =
	| MissleAnimation
  | MeleeAnimation
	| CenterAnimation
	| SelfInflictAnimation;

export type StatusEffect = {
	status: StatusId;
	counter?: number;
};

export type EnemyInClient = {
	unitId: UnitId;
	displayName: EnemyName;
	health: number;
	maxHealth: number;
	myAggro: number;
	template: EnemyTemplate;
	aggros: AggroInClient[];
	statuses: EnemyStatusInClient[];
	bonusStats:UnitStatsState;
	inventory:ItemState[];
};

export type StatusState = { statusId: StatusId; count: number };
export type EnemyStatusInClient = { hId: HeroId } & StatusState;
export type AggroInClient = { hId: HeroId; agg: number };

export type GameActionSelected = {
	buttonText: string;
};
export function isGameActionSelected(msg: object): msg is GameActionSelected {
	return 'buttonText' in msg;
}

export type GameActionSentToClient = {
	buttonText: string;
	itemId?: ItemId;
	associateWithUnit?: UnitId;
  pickupItem?:ItemId
};

export type EnemyName = string;

export type JoinGame = {
	join: HeroName;
};

export function isJoin(msg: any): msg is JoinGame {
	if (typeof msg === 'object' && msg) {
		if ('join' in msg) {
			if (typeof msg.join === 'string') {
				if (msg.join.length > 0) {
					return true;
				}
			}
		}
	}
	return false;
}
