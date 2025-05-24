import { items, type ItemId, type ItemState, type Item, type ItemDamageData } from './items';
import { deepEqual, getDamageLimit, getDamageReduction, type EnemyForSpawning, hasStatusWithKey } from './logic';
import { pushHappening } from './messaging';
import { scenesData, type UniqueSceneIdenfitier } from './scenes';
import { PROTECT_LIMIT, type StatusId } from './statuses';
import { activePlayersInScene, type Player, type UnitStatsState } from './users';
import type { EnemyId, EnemyName, HeroId, DamageEvent, BattleEventEntity, BattleAnimation } from './utils';

export const activeEnemies: ActiveEnemy[] = [];

export type ActiveEnemy = {
	unitId: EnemyId;
	displayName: EnemyName;
	currentUniqueSceneId: UniqueSceneIdenfitier;
	health: number;
	maxHealth: number;
	bonusStats: UnitStatsState;
	aggros: Map<HeroId, number>;
	template: EnemyTemplate;
	statuses: EnemyStatuses;
	inventory: ItemState[];
};

export function getAggroForPlayer(enemy: ActiveEnemy, player: Player): number {
	let existing = enemy.aggros.get(player.unitId);
	if (existing == undefined) {
		enemy.aggros.set(player.unitId, enemy.template.startAggro);
		existing = enemy.template.startAggro;
	}
	return existing;
}
export type EnemyTemplateId = string

export type EnemyTemplate = {
	id:EnemyTemplateId
	portrait?: string;
	baseHealth: number;
	aggroGain: number;
	startAggro: number;
	hasItem: ItemId[];
} & UnitStatsState;

export const enemyTemplates: EnemyTemplate[] = [
	{
		id:'rat',
		baseHealth: 5,
		strength: 0,
		agility: 2,
		mind:0,
		aggroGain: 25,
		startAggro: 70,
		hasItem: ['fist','thiefCloak'],
	},
	{
		id:'goblin',
		baseHealth: 50,
		strength: 0,
		agility: 3,
		mind:0,
		aggroGain: 30,
		startAggro: 30,
		hasItem: ['fist', 'goblinArmor']
	},
	{
		id:'darter',
		baseHealth: 50,
		strength: 0,
		aggroGain: 60,
		mind:0,
		startAggro: 10,
		agility: 4,
		hasItem: ['fist', 'poisonDart']
	},
	{
		id:'orc',
		portrait: 'grunt',
		baseHealth: 50,
		strength: 2,
		mind:0,
		aggroGain: 40,
		startAggro: 10,
		agility: 4,
		hasItem: ['club', 'orcPlate'],
	},
	{
		id:'fireGremlin',
		baseHealth: 10,
		strength: 0,
		mind:3,
		aggroGain: 50,
		startAggro: 25,
		agility: 5,
		hasItem: ['gremlinStaff'],
	},
	{
		id:'troll',
		baseHealth: 150,
		strength: 10,
		mind:0,
		aggroGain: 40,
		startAggro: 80,
		agility: 1,
		hasItem: ['club'],
	}
];

export const PERCENT_OF_BASE_ADDED_PER_PLAYER = 0.5;

export function modifiedEnemyHealth(baseHealth: number, numPlayers: number): number {
	if (numPlayers < 2) return baseHealth;
	return baseHealth + Math.floor((numPlayers - 1) * PERCENT_OF_BASE_ADDED_PER_PLAYER * baseHealth);
}
let enemyCounter = 0
export function spawnEnemy(
	spawnTemplate: EnemyForSpawning,
	where: UniqueSceneIdenfitier,
	triggeredBy: HeroId
) {
	const template = enemyTemplates.find(t=>t.id == spawnTemplate.template);
	if(!template)return

	let modifiedBaseHealth = template.baseHealth;
	const scene = scenesData.find((s) => s.sceneDataId == where.dataId);
	if (!scene) return;
	const playersInScene = activePlayersInScene(where);
	if (!scene.solo) {
		modifiedBaseHealth = modifiedEnemyHealth(modifiedBaseHealth, playersInScene.length);
	}

	// let modifiedBaseHealth = scenes.get(where)?.solo ? baseHealth : modifiedEnemyHealth(baseHealth)

	const aggros: Map<HeroId, number> = new Map();
	for (const p of playersInScene) {
		aggros.set(p.unitId, template.startAggro);
	}

	const mapStatuses: EnemyStatuses = new Map();

	if (spawnTemplate.statuses) {
		const mapForHeroStatuses: Map<StatusId, number> = new Map();
		for (const k of spawnTemplate.statuses) {
			mapForHeroStatuses.set(k.statusId, k.count);
		}
		mapStatuses.set(triggeredBy, mapForHeroStatuses);
	}
  enemyCounter++
	const uid = enemyCounter.toString();


	const inventory: ItemState[] = []
	for (const templateItem of template.hasItem) {
		const item = items.find((i) => i.id == templateItem);
		if (!item) return;
		const createState: ItemState = {
			cooldown: 0,
			warmup: item.warmup ?? 0,
			stats: item,
			stock: item.startStock
		};
		inventory.push(createState)

	}

	activeEnemies.push({
		unitId: `enemy${uid}`,
		displayName: spawnTemplate.displayName ?? spawnTemplate.template,
		currentUniqueSceneId: where,
		health: modifiedBaseHealth,
		maxHealth: modifiedBaseHealth,
		bonusStats: {
			strength: 0,
			agility: 0,
			mind:0,
		},
		aggros: aggros,
		template: template,
		statuses: mapStatuses,
		inventory: inventory,
	});
}
export type EnemyStatuses = Map<HeroId, Map<StatusId, number>>;

export function addAggro(actor: Player, provoke: number | undefined, respondingEnemy:ActiveEnemy) {
	if(provoke == undefined)return
	if(actor.health < 1)return
	if(respondingEnemy.health < 1)return
	// for (const respondingEnemy of enemiesInScene(actor.currentUniqueSceneId)) {
		const aggroGain = provoke + respondingEnemy.template.aggroGain;
		const existingAggro = getAggroForPlayer(respondingEnemy, actor);
		let newAggro = existingAggro + aggroGain;
		if (newAggro > 100) {
			newAggro = 100;
		}
		respondingEnemy.aggros.set(actor.unitId, newAggro);
	// }
}

export function modifyAggroForPlayer(
	player: Player,
	enemy: ActiveEnemy,
	baseAmount: number
): { increasedBy: number } {
	let existing = enemy.aggros.get(player.unitId);
	if (existing == undefined) {
		enemy.aggros.set(player.unitId, enemy.template.startAggro);
		existing = enemy.template.startAggro;
	}
	let wantNext = existing + baseAmount;
	if (wantNext > 100) {
		wantNext = 100;
	}
	if (wantNext < 0) {
		wantNext = 0;
	}
	enemy.aggros.set(player.unitId, wantNext);
	return { increasedBy: wantNext - existing };
}

export function enemiesInScene(sceneKey: UniqueSceneIdenfitier): ActiveEnemy[] {
	return activeEnemies.filter((e) => deepEqual(e.currentUniqueSceneId, sceneKey));
}

export function damageEntity(
	// hme: DamageEvent,
	idd:ItemDamageData,
	source: BattleEventEntity,
	toDamage: BattleEventEntity,
): { dmgDone: number[] } {
	if (toDamage.entity.health < 1) return { dmgDone: [] };
	let bonusDmg = 0
	if(idd.offenseKind){
		if (idd.offenseKind.includes("brutal")) {
			let str = source.entity.bonusStats.strength
			if (source.kind == 'player') {
				str += source.entity.strength
			} else if (source.kind == 'enemy') {
				str += source.entity.template.strength
			}
			bonusDmg += Math.floor(str)
		}
		if (idd.offenseKind.includes("skillful")) {
			let agi = source.entity.bonusStats.agility
			if (source.kind == 'player') {
				agi += source.entity.agility
			} else if (source.kind == 'enemy') {
				agi += source.entity.template.agility
			}
			bonusDmg += Math.floor(agi)
		}
		if (idd.offenseKind.includes("magical")) {
			let mind = source.entity.bonusStats.mind
			if (source.kind == 'player') {
				mind += source.entity.mind
			} else if (source.kind == 'enemy') {
				mind += source.entity.template.mind
			}
			bonusDmg += Math.floor(mind)
		}
	}
	let strikes = idd.strikes

	let damageReduction = getDamageReduction(toDamage)
	let damageLimit = getDamageLimit(toDamage)
	if(hasStatusWithKey(toDamage, 'protects')){
		if(!damageLimit || damageLimit > PROTECT_LIMIT){
			damageLimit = PROTECT_LIMIT
		}
	}

	const dmgDone: number[] = [];
	let dmgSum = 0
	for (let i = 0; i < strikes; i++) {
		let dmg = idd.baseDmg;
		if (i == strikes - 1) {
			dmg += bonusDmg;
		}
		dmg = dmg - damageReduction;
		if (dmg < 1) dmg = 1;

		if (damageLimit != undefined) {
			if (dmg > damageLimit) {
				dmg = damageLimit;
			}
		}
		toDamage.entity.health -= dmg;
		dmgDone.push(dmg);
		dmgSum += dmg
		if (toDamage.entity.health < 1) break;
	}
	pushHappening(
		`${source.entity.displayName} hit ${toDamage.entity.displayName} for ${dmgSum} damage`
	);
	if (toDamage.kind == 'enemy') {
		const result = checkEnemyDeath(toDamage.entity);
		if (result.killed) {
			pushHappening(`${source.entity.displayName} killed ${toDamage.entity.displayName}`);
		}
	}
	return { dmgDone: dmgDone };
}

export function pushAnimation({
	sceneId,
	battleAnimation,
}: {
	sceneId: UniqueSceneIdenfitier;
	battleAnimation: BattleAnimation;
}) {
	activePlayersInScene(sceneId).forEach((p) => {
		p.animations.push(battleAnimation);
	});
}

export function checkEnemyDeath(target: ActiveEnemy): { killed: boolean } {
	if (target.health < 1) {
		const i = activeEnemies.findIndex((e) => e === target);
		if (i >= 0) {
			activeEnemies.splice(i, 1);
		}
		return { killed: true };
	}
	return { killed: false };
}
