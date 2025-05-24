import type {
	BattleAnimation,
	BattleEvent,
	BattleEventEntity,
	HeroId,
	StatusState,
	UnitId,
	VisualActionSourceId
} from './utils';
import { equipItem, items, type Item, type ItemId, type ItemState } from './items';
import { deepEqual, type VasActionData, type VisualActionSource } from './logic';
import { pushHappening } from './messaging';
import {
	startSceneDataId,
	uniqueFromSceneDataId,
	type SceneDataId,
	type UniqueSceneIdenfitier
} from './scenes';
import type { StatusId } from './statuses';

export const users = new Map<UserId, Player>();

export function addNewUser(heroName: string): { id: string; player: Player } | undefined {
	const pId: HeroId = `hero${heroName}`;

	const startflags: Set<Flag> = new Set();
	// startflags.add('heardAboutHiddenPassage')
	// startflags.add('gotFreeStarterWeapon')
	// startflags.add('killedGoblins')

	let startSceneId: SceneDataId = startSceneDataId;
	// startSceneId = 'soloTrain3'
	// startSceneId = 'throne'
	// startSceneId = 'armory'

	const startUnique = uniqueFromSceneDataId(pId, startSceneId);

	const player: Player = {
		unitId: pId,
		connectionState: {
			con: undefined,
			stream: undefined
		},
		displayName: heroName,
		previousScene: startUnique,
		lastCheckpoint: startUnique,
		currentUniqueSceneId: startUnique,
		inventory: [],
		health: 1,
		maxHealth:1,
		agility: 2,
		strength: 2,
		mind:0,
		bonusStats:{
			strength:0,
			agility:0,
			mind:0,
		},
		devActions: [],
		itemActions: [],
		vasActions: [],
		visualActionSources: [],
		sceneTexts: [],
		flags: startflags,
		animations: [],
		statuses: new Map()
	};

	player.maxHealth = playerMaxHealth(player)
	player.health = player.maxHealth

	items
		.filter((i) => i.default)
		.forEach((i) => {
			equipItem(player, i.id);
		});
		// equipItem(player,'thiefCloak')
		// equipItem(player,'fireStaff')
		// equipItem(player,'poisonDart')

	const userId = "me";
	users.set(userId, player);
	return { id: userId, player: player };
}

export type UserId = string;
export type HeroName = string;
export type Flag =
	| 'metArthur'
	| 'heardAboutHiddenPassage'
	| 'gotFreeStarterWeapon'
	| 'killedGoblins'
	| 'sawArthurAfterBattle'
	| 'smashedMedallion'
	| 'placedMedallion';


export type Player = {
	connectionState: {
		// ip: string | null;
		con: ReadableStreamController<unknown> | undefined;
		stream: ReadableStream | undefined;
	};
	previousScene: UniqueSceneIdenfitier;
	lastCheckpoint: UniqueSceneIdenfitier;
	itemActions: GameAction[];
	devActions: GameAction[];
	vasActions: GameAction[];
	sceneTexts: string[];
	flags: Set<Flag>;
	animations: BattleAnimation[];
	visualActionSources: VisualActionSource[];
	currentUniqueSceneId: UniqueSceneIdenfitier;
	statuses: Map<StatusId, number>;
} & PlayerCommonStats;

export function playerMaxHealth(p:Player):number{
	return (p.strength * 25) + 25
}

export type PlayerCommonStats = {
	inventory: ItemState[];
	unitId: HeroId;
	displayName: HeroName;
	health: number;
	maxHealth: number;
	bonusStats:UnitStatsState;
} & UnitStatsState;

export type UnitStat = 'strength' | 'agility' | 'mind'
export type UnitStatsState = Record<UnitStat,number>

export type PlayerInClient = {
	currentSceneDisplay: string;
	class: string;
	statuses: StatusState[];
} & PlayerCommonStats;

export type GameAction = {
	devAction?: () => void;
	battleEvent?: BattleEvent;
	buttonText: string;
	itemId?: ItemId;

	// What npc is offering the action? Or selecting which unit chooses that action
	associateWithUnit: UnitId;


	unlockableActData?: VasActionData;
};

// export type withVasId = {
// 	vasId: VisualActionSourceId;
// };

export function healEntity(bee: BattleEventEntity, amount: number): { healed: number } {
	const missing = bee.entity.maxHealth - bee.entity.health;
	let toHeal = amount;
	if (missing < amount) {
		toHeal = missing;
	}

	bee.entity.health += toHeal;
	pushHappening(`${bee.entity.displayName} was healed for ${toHeal}hp`);
	return { healed: toHeal };
}

export function activePlayers(): Player[] {
	return Array.from(users.values()).filter((usr) => {
		return (
			usr.connectionState.con && usr.connectionState.stream && usr.connectionState.stream.locked
		);
	});
}

export function activePlayersInScene(scene: UniqueSceneIdenfitier) {
	const ap = activePlayers();
	const apIs = ap.filter((usr) => deepEqual(usr.currentUniqueSceneId, scene));
	return apIs;
}

export function cleanConnections() {
	for (const p of activePlayers()) {
		if (p.connectionState != null && !p.connectionState.stream?.locked) {
			p.connectionState.con?.close();
		}
	}
}
