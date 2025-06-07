import type { BattleEventEntity, BattleEvent, ItemAnimationBehavior, DamageEvent, HealEvent, AggroModifierEvent, StatusModifierEvent, AnimationBehavior, DamageAnimation, AnySprite, HealAnimation, AggroModifier, HeroId, BattleAnimation, StatusModifyAnimation, GameActionSentToClient, VisualActionSourceId, StatusState, UnitId } from './utils';
import {
	enemiesInScene,
	activeEnemies,
	addAggro,
	pushAnimation,
	getAggroForPlayer,
	damageEntity,
	modifyAggroForPlayer,
	modifiedEnemyHealth,
	type EnemyTemplateId,
	spawnEnemy,
	type EnemyStatuses,
	type ActiveEnemy,
	checkEnemyDeath
} from './enemies';
import {
	items,
	type Item,
	equipItem,
	checkHasItem,
	type ItemId,
	type CanTarget,
	type CanEffect
} from './items';
import { pushHappening } from './messaging';
import {
	alreadySpawnedCurrentBattle,
	spawnedNewBattle,
	hasPlayerAlreadySpawnedForBattle,
	spawnedOngoing,
	getSceneData,
	type UniqueSceneIdenfitier,
	type SceneDataId,
	getSceneDataSimple,
	dead,
	uniqueFromSceneDataId
} from './scenes';
import { statusDatas, type StatusData, type StatusId, type StatusDataKey, PROTECT_LIMIT } from './statuses';
import {
	users,
	type Player,
	type GameAction,
	healEntity,
	type Flag,
	activePlayersInScene,
	type UnitStat,
	playerMaxHealth
} from './users';

export function updateAllPlayerActions() {
	for (const allPlayer of users.values()) {
		updatePlayerActions(allPlayer);
	}
}

export function createPossibleBattleEventsFromEntity(
	bee: BattleEventEntity,
	triggeredBy: Player
): BattleEvent[] {
	let scenePlayers = activePlayersInScene(triggeredBy.currentUniqueSceneId)
	let scenePlayersEntities: BattleEventEntity[] = scenePlayers.map((sp) => {
		return {
			kind: 'player',
			entity: sp
		};
	})
	let sceneEnemiesEntities: BattleEventEntity[] = enemiesInScene(triggeredBy.currentUniqueSceneId).map(se => {
		return {
			kind: 'enemy',
			entity: se
		}
	})
	let alliesOfBee: BattleEventEntity[] = []
	let opponentsOfBee: BattleEventEntity[] = []
	if (bee.kind == 'player') {
		alliesOfBee = scenePlayersEntities
		opponentsOfBee = sceneEnemiesEntities
	}
	if (bee.kind == 'enemy') {
		alliesOfBee = sceneEnemiesEntities
		opponentsOfBee = scenePlayersEntities
	}

	let result: BattleEvent[] = []
	for (const itemState of bee.entity.inventory) {
		const i = items.find((item) => item.id == itemState.stats.id);
		if (i == undefined) continue;
		if (!i.useableOutOfBattle && !opponentsOfBee.length) continue;
		if (!entityCanUseItem(bee, i)) continue

		let targetables: BattleEventEntity[] = [];
		if (i.targets.kind == 'anyEnemy') {
			targetables = opponentsOfBee;
		} else if (i.targets.kind == 'anyFriendly') {
			targetables = alliesOfBee;
		} else {
			targetables = [bee];
		}

		for (const t of targetables) {

			// mobs can only directly target the player that triggered the event
			if (bee.kind == 'enemy' && t.kind == 'player') {
				if (t.entity.unitId != triggeredBy.unitId) continue
			}

			if (!validSourceAndTarget(bee, t, i)) continue

			const perTargbe: BattleEvent = {
				source: bee,
				primaryTarget: t,
				itemUsed: i,
			};
			result.push(perTargbe)
		}
	}


	return result
}

export function entityCanUseItem(bee: BattleEventEntity, i: Item): boolean {
	const itemState = bee.entity.inventory.find(is => is.stats.id == i.id)
	if (!itemState) return false
	if (i.noAction) return false;
	if (i.requiresSourceDead && bee.entity.health > 0) return false;
	if (!i.requiresSourceDead && bee.entity.health < 1) return false;
	if (itemState.cooldown > 0) return false;
	if (itemState.warmup > 0) return false;
	if (itemState.stock != undefined && itemState.stock < 1) return false;
	return true
}

export function validSourceAndTarget(bee: BattleEventEntity, t: BattleEventEntity, i: Item): boolean {
	if (!entityCanUseItem(bee, i)) {


		return false
	}

	// can't target untargetable entity not on your team
	if (bee.kind != t.kind) {
		if (hasStatusWithKey(t, 'untargetable')) {
			console.log(`${bee.entity.displayName} cant target untargetable`)
			return false
		}
	}

	if (i.requiresTargetDamaged && (t.entity.health >= t.entity.maxHealth)) return false

	if (i.requiresTargetWithoutStatus && checkHasStatus(t, i.requiresTargetWithoutStatus)) return false

	if (t.entity.health < 1 && !i.requiresTargetDead) return false

	return true
}

export function updatePlayerActions(player: Player) {
	const possibleBattleEvents = createPossibleBattleEventsFromEntity({ kind: 'player', entity: player }, player)
	player.itemActions = [];
	for (let possibleBe of possibleBattleEvents) {
		let associate = possibleBe.primaryTarget.entity.unitId
		const ga: GameAction = {
			buttonText: `${possibleBe.source.entity.unitId} use ${possibleBe.itemUsed.id} on ${associate}`,
			battleEvent: possibleBe,
			itemId: possibleBe.itemUsed.id,
			associateWithUnit: associate,
		};
		player.itemActions.push(ga);
	}

	const scene = getSceneDataSimple(player.currentUniqueSceneId.dataId);

	player.devActions = [];
	if (scene.actions) {
		scene.actions(player);
	}
	player.devActions.push({
		buttonText: 'Give up',
		associateWithUnit: player.unitId,
		devAction() {
			player.health = 0
		},
	})

	player.vasActions = [];
	player.visualActionSources = [];
	const sceneEnemies = enemiesInScene(player.currentUniqueSceneId);
	if (!sceneEnemies.length) {
		if (scene.vases) {
			for (const vas of scene.vases) {
				player.visualActionSources.push(vas);
				const acts = getValidGameActionsFromVas(vas, player);
				player.vasActions.push(...acts);
			}
		}
	}
}

export function checkHasStatus(bee: BattleEventEntity, st: StatusId): boolean {
	if (bee.kind == 'player') {
		const found = bee.entity.statuses.get(st);
		return found != undefined && found > 0;
	}
	if (bee.kind == 'enemy') {
		if (
			Array.from(bee.entity.statuses.values()).some((s) => {
				const c = s.get(st);
				return c && c > 0;
			})
		) {
			return true;
		}
	}

	return false;
}


export function removeStatus(bee: BattleEventEntity, st: StatusData) {
	if (st.giveBonus && !st.giveBonus.persists) {
		bee.entity.bonusStats[st.giveBonus.stat] = 0
	}
	if (bee.kind == 'player') {
		bee.entity.statuses.delete(st.id);
	}
	if (bee.kind == 'enemy') {
		for (const [key, value] of bee.entity.statuses) {
			value.delete(st.id);
		}
	}
}

export function enterSceneOrWakeup(player: Player) {
  console.log('enter')
	const enteringScene = getSceneData(player);
	const scenePlayers = activePlayersInScene(player.currentUniqueSceneId);

	const onlyMeInScene = !scenePlayers.filter((p) => p.unitId != player.unitId).length;

	if (onlyMeInScene) {
		// No players except me in here remove enemies
		for (const e of enemiesInScene(player.currentUniqueSceneId)) {
			const index = activeEnemies.indexOf(e);
			if (index != -1) {
				activeEnemies.splice(index, 1);
			}
		}
	}

	const sceneEnemies = enemiesInScene(player.currentUniqueSceneId);

	if (!sceneEnemies.length) {
		if (enteringScene.spawnsEnemiesOnEnter) {
			// start new battle
			spawnedNewBattle(player);

			for (const es of enteringScene.spawnsEnemiesOnEnter) {
				spawnEnemy(es, player.currentUniqueSceneId, player.unitId);
			}
		}
	} else {
		// we are joining a battle
		console.log('joining battle');
		for (const e of sceneEnemies) {
			// init enemy aggro towards me
			if (!e.aggros.has(player.unitId)) {
				e.aggros.set(player.unitId, e.template.startAggro);
			}
			// scale health to player count
			if (!enteringScene.solo) {
				scaleEnemyHealth(e, scenePlayers.length);
			}
		}

		if (enteringScene.spawnsEnemiesOnBattleJoin && !hasPlayerAlreadySpawnedForBattle(player)) {
			console.log('spawning on join');
			// spawn extra enemies
			spawnedOngoing(player);
			// let extraEnemyName = player.heroName.split('').reverse().join('')
			for (const es of enteringScene.spawnsEnemiesOnBattleJoin) {
				spawnEnemy(es, player.currentUniqueSceneId, player.unitId);
			}
		}
	}

	// Always perform these
	if (enteringScene.healsOnEnter) {
		player.health = player.maxHealth;
	}
	if (enteringScene.setCheckpointOnEnter) {
		player.lastCheckpoint = player.currentUniqueSceneId;
	}
	if (enteringScene.setsFlagOnEnter) {
		player.flags.add(enteringScene.setsFlagOnEnter);
	}

	// scene texts will be repopulated
	player.sceneTexts = [];
	if (enteringScene.sceneTexts) {
		const { fallback, ...froms } = enteringScene.sceneTexts;
		let useDefault = true;
		for (const [from, txt] of Object.entries(froms)) {
			if (player.previousScene.dataId == from && txt) {
				player.sceneTexts.push(txt);
				useDefault = false;
				break;
			}
		}
		if (useDefault) {
			player.sceneTexts.push(fallback);
		}
	}
}

export function scaleEnemyHealth(enemy: ActiveEnemy, playerCount: number) {
	const percentHealthBefore = enemy.health / enemy.maxHealth;
	enemy.maxHealth = Math.floor(modifiedEnemyHealth(enemy.template.baseHealth, playerCount));
	enemy.health = Math.floor(percentHealthBefore * enemy.maxHealth);
}

export function resetBonusStats(bee: BattleEventEntity) {
	bee.entity.bonusStats.agility = 0
	bee.entity.bonusStats.strength = 0
	bee.entity.bonusStats.mind = 0
}

export function resetCooldowns(player: Player) {
	for (const itemState of player.inventory) {
		itemState.cooldown = 0;
		if (itemState.stats.warmup) {
			itemState.warmup = itemState.stats.warmup;
		} else {
			itemState.warmup = 0;
		}
		if (itemState.stats.startStock != undefined) {
			itemState.stock = itemState.stats.startStock;
		}
	}
}

export function changeScene(player: Player, goTo: SceneDataId) {
	const uniqueTo = uniqueFromSceneDataId(player.unitId, goTo);

	player.previousScene = player.currentUniqueSceneId;
	player.currentUniqueSceneId = uniqueTo;

	resetCooldowns(player)
	resetBonusStats({ kind: 'player', entity: player })

	// should status persist after battles?
	player.statuses = new Map();

	enterSceneOrWakeup(player);
}

export function handlePlayerAction(player: Player, action: GameAction) {
	// const actionStartedInSceneId = player.currentUniqueSceneId;

	if (action.devAction) {
		action.devAction();
		return;
	}

	if (action.unlockableActData) {
		if (action.unlockableActData.travelTo) {
			pushAnimation({
				sceneId: player.currentUniqueSceneId,
				battleAnimation: {
					triggeredBy: player.unitId,
					source: player.unitId,
					behavior: { kind: 'travel' },
					animateTo: action.associateWithUnit,
				}
			});
			changeScene(player, action.unlockableActData.travelTo);
			return
		}

		if (action.unlockableActData.pickupItem) {
			const idToPickup = action.unlockableActData.pickupItem;
			equipItem(player, idToPickup);
			pushAnimation({
				sceneId: player.currentUniqueSceneId,
				battleAnimation: {
					triggeredBy: player.unitId,
					source: player.unitId,
					behavior: { kind: 'melee' },
					animateTo: action.associateWithUnit,
					takesItem: true
				}
			});
		}

		if (action.unlockableActData.setsFlag) {
			player.flags.add(action.unlockableActData.setsFlag);
		}

		if(action.unlockableActData.trainStat){
			let decremented = player[action.unlockableActData.trainStat.dec] - 1
			if(decremented >= 0){
				player[action.unlockableActData.trainStat.inc] += 1
				player[action.unlockableActData.trainStat.dec] = decremented
				pushAnimation({
					sceneId: player.currentUniqueSceneId,
					battleAnimation: {
						triggeredBy: player.unitId,
						source: player.unitId,
						behavior: { kind: 'melee' },
						animateTo: action.associateWithUnit,
					}
				});
				player.maxHealth = playerMaxHealth(player)
				player.health = player.maxHealth
			}
		}

		if (action.unlockableActData.spawnsEnemies) {
			for (const e of action.unlockableActData.spawnsEnemies) {
				spawnEnemy(e, player.currentUniqueSceneId, player.unitId);
			}
		}

		return;
	}

	if (!action.battleEvent) return;
	if (!action.itemId) return;
	if (!action.battleEvent) return;
	const triggeredFromItem = items.find((i) => i.id == action.itemId);
	if (!triggeredFromItem) return

	if (triggeredFromItem.teleportTo) {
		const battleAnimation: BattleAnimation = {
			triggeredBy: player.unitId,
			source: player.unitId,
			behavior: triggeredFromItem.animation ?? { kind: 'selfInflicted', extraSprite: 'skull' },
			teleporting: true
		};
		pushAnimation({
			sceneId: player.currentUniqueSceneId,
			battleAnimation: battleAnimation,
		})
		changeScene(player, triggeredFromItem.teleportTo)
		return
	}

	pushHappening('----');
	console.log('-----starting combat round----')

	let chosenBattleEvents: BattleEvent[] = []

	chosenBattleEvents.push(action.battleEvent)

	let startEnemies = enemiesInScene(player.currentUniqueSceneId)
	let didntSelectAction : ActiveEnemy[] = []
	for (const enemy of startEnemies) {
		let bEventsForEnemy = createPossibleBattleEventsFromEntity(
			{ kind: 'enemy', entity: enemy },
			player,
		)
		// enemy prioritize a finishing blow
		let foundFinisher = bEventsForEnemy.find(be => {
			if (be.itemUsed.damages) {
				if ((be.itemUsed.damages.baseDmg * be.itemUsed.damages.strikes) >= be.primaryTarget.entity.health) {
					return true
				}
			}
			return false
		})
		let chosenForEnemy: BattleEvent | undefined = undefined
		if (foundFinisher) {
			chosenForEnemy = foundFinisher
			// console.log(`${enemy.displayName} chose finishing blow ${chosenForEnemy.itemUsed.id}`)
		} else {
			let itemsPossible = bEventsForEnemy
				.map(be => be.itemUsed)
				.filter((value, index, self) => self.indexOf(value) === index);
			const randomItemIndex = Math.floor(Math.random() * itemsPossible.length);
			const randomItemSel = itemsPossible.at(randomItemIndex)
			if (randomItemSel) {
				let besOfSelItem = bEventsForEnemy.filter(be => be.itemUsed.id == randomItemSel.id)
				const randomIndex = Math.floor(Math.random() * besOfSelItem.length);
				let selected = besOfSelItem.at(randomIndex)
				if (selected) {
					chosenForEnemy = selected
					// console.log(`${enemy.displayName} randomly selected ${chosenForEnemy.itemUsed.id}`)
				}
			}
		}

		if (chosenForEnemy) {
			chosenBattleEvents.push(chosenForEnemy)
		}else{
			console.log(`${enemy.displayName} has no valid actions`)
			didntSelectAction.push(enemy)
		}
	}

	chosenBattleEvents.sort((a, b) => {
		return getActionSpeed(b.source, b.itemUsed) - getActionSpeed(a.source, a.itemUsed)
	})

	for (let chosenBe of chosenBattleEvents) {
		decrementCooldowns(chosenBe.source);

		if (validSourceAndTarget(chosenBe.source, chosenBe.primaryTarget, chosenBe.itemUsed)) {
			let succeedRoll = true
			if(chosenBe.source.kind == 'enemy'){
				const aggroForActor = getAggroForPlayer(chosenBe.source.entity, player);
				let r = Math.floor(Math.random() * 100)
				console.log(`${chosenBe.source.entity.displayName} rolled ${r} with aggro ${aggroForActor}`)
				// if (r > aggroForActor) {
				if ( aggroForActor < 100) {
					succeedRoll = false
				}
			}
			if(succeedRoll){
				processBattleEvent(chosenBe, player);
			}
		}

		handleStatusEffects(chosenBe.source,player);
	}
	
	for (const enemy of didntSelectAction) {
		decrementCooldowns({kind: 'enemy', entity: enemy });
		handleStatusEffects({kind: 'enemy', entity: enemy }, player);
	}
	
	decrementStatusCounts({kind:'player',entity:player},player)
	const postReactionEnemies = enemiesInScene(player.currentUniqueSceneId);
	for(const enemy of postReactionEnemies){
		decrementStatusCounts({ kind: 'enemy', entity: enemy }, player)
		addAggro(player, triggeredFromItem.provoke, enemy);
	}

	const playerScene = getSceneDataSimple(player.currentUniqueSceneId.dataId);
	if (startEnemies.length && !postReactionEnemies.length) {
		for (const playerInScene of activePlayersInScene(player.currentUniqueSceneId)) {
			resetCooldowns(playerInScene)
			resetBonusStats({ kind: 'player', entity: playerInScene })
			if (playerScene.healsOnVictory) {
				playerInScene.health = playerInScene.maxHealth;
			}
			if (playerScene.setsFlagOnVictory) {
				playerInScene.flags.add(playerScene.setsFlagOnVictory);
			}
		}
	}
}

function getActionSpeed(bee: BattleEventEntity, itemUsed: Item): number {
	let agi = 0
	if (bee.kind == 'player') {
		agi = bee.entity.agility
	}
	if (bee.kind == 'enemy') {
		agi = bee.entity.template.agility
	}
	agi += (itemUsed.speed ?? 0)
	return agi;
}

function handleStatusEffects(on: BattleEventEntity, playerTriggered: Player) {
	if (on.entity.health < 1) return
	let check = (statusMap: Map<StatusId, number>) => {
		for (const [k, v] of statusMap) {
			if (on.entity.health < 0) break
			if (v < 1) continue;
			const statusData = statusDatas.find((s) => s.id == k);
			if (!statusData) continue;
			if (statusData.damagesEachTurn) {
				let dmg = Math.ceil(on.entity.health * statusData.damagesEachTurn.perc);
				if (dmg < statusData.damagesEachTurn.minDmg) dmg = statusData.damagesEachTurn.minDmg
				if(hasStatusWithKey(on, 'protects')){
					if(dmg > PROTECT_LIMIT){
						dmg = PROTECT_LIMIT
					}
				}
				on.entity.health -= dmg;
				if (statusData.eachTurnSprite) {
					pushAnimation({
						sceneId: playerTriggered.currentUniqueSceneId,
						battleAnimation: {
							triggeredBy: playerTriggered.unitId,
							source: on.entity.unitId,
							alsoDamages: [{ target: on.entity.unitId, amount: [dmg] }],
							behavior: { kind: 'selfInflicted', extraSprite: statusData.eachTurnSprite },
							noResetAggro: true,
						}
					});

				}
				pushHappening(`${on.entity.unitId} took ${dmg} damage from ${k}`);
			}
			if (statusData.healsEachTurn) {
				healEntity(on, statusData.healsEachTurn)
				if (statusData.eachTurnSprite) {
					pushAnimation({
						sceneId: playerTriggered.currentUniqueSceneId,
						battleAnimation: {
							triggeredBy: playerTriggered.unitId,
							source: on.entity.unitId,
							alsoHeals: [{ target: on.entity.unitId, amount: statusData.healsEachTurn }],
							behavior: { kind: 'selfInflicted', extraSprite: statusData.eachTurnSprite },
							noResetAggro: true,
						}
					});

				}
			}
			if (statusData.giveBonus) {
				if (statusData.giveBonus.accumulates) {
					on.entity.bonusStats[statusData.giveBonus.stat] += statusData.giveBonus.amount
				} else {
					let existingBonus = on.entity.bonusStats[statusData.giveBonus.stat]
					if (existingBonus < statusData.giveBonus.amount) {
						on.entity.bonusStats[statusData.giveBonus.stat] = statusData.giveBonus.amount
					}
				}
				// sprite = statusData.selfInflictSprite
				pushHappening(`${on.entity.displayName} grows in strength!`);
			}
			// statusMap.set(k, v - 1);
		}
	}
	if (on.kind == 'player') {
		check(on.entity.statuses)
	}
	if (on.kind == 'enemy') {
		let fp = on.entity.statuses.get(playerTriggered.unitId)
		if (fp) {
			check(fp)
		}
		checkEnemyDeath(on.entity)
	}
}

function decrementStatusCounts(bee: BattleEventEntity, playerTriggered: Player) {
	let decayed: StatusData[] = []

	let dec = (statusMap: Map<StatusId, number>, full: boolean) => {
		for (const [k, v] of statusMap) {
			const statusData = statusDatas.find((s) => s.id == k);
			if (!statusData) continue;
			if (full || statusData.decayAnyPlayer) {
				let decremented = v - 1
				statusMap.set(k, decremented)
				if (decremented < 1) {
					decayed.push(statusData)
				}
			}
		}
	}
	if (bee.kind == 'player') {
		dec(bee.entity.statuses, true)
	}
	if (bee.kind == 'enemy') {
		for (let [p, statuses] of bee.entity.statuses) {
			dec(statuses, p == playerTriggered.unitId)
		}
	}
	for (const d of decayed){
		removeStatus(bee, d)
	}
}

function decrementCooldowns(bee: BattleEventEntity) {
	for (const cd of bee.entity.inventory) {
		if (cd.cooldown > 0) cd.cooldown--;
		if (cd.warmup > 0) cd.warmup--;
	}
}

export function hasStatusWithKey(bee: BattleEventEntity, key: StatusDataKey): boolean {
	const check = (statusMap: Map<StatusId, number>) => {
		let hasIt = false;
		for (const [k, v] of statusMap) {
			if (v < 1) continue;
			const foundData = statusDatas.find((d) => d.id == k);
			if (!foundData) continue;
			if (foundData[key]) {
				hasIt = true;
			}
		}
		return hasIt;
	}
	if (bee.kind == 'player') {
		return check(bee.entity.statuses)
	}
	if (bee.kind == 'enemy') {
		for (const [p, statuses] of bee.entity.statuses) {
			let checked = check(statuses)
			if (checked) {
				return true
			}
		}
	}
	return false
}


function handleRemoveStatusOnProvoke(bee: BattleEventEntity, triggeredBy: Player, provoke: number | undefined) {
	let decayed: StatusData[] = []
	if (!provoke) return
	// const r = removeStatusesOnProvoke(bee);
	// let r: StatusData[] = [];
	let rem = (s: Map<StatusId, number>) => {
		for (const [k, v] of s) {
			const statusData = statusDatas.find((s) => s.id == k);
			if (!statusData) continue;
			if (statusData.removeOnProvoke) {
				removeStatus(bee, statusData)
				decayed.push(statusData);
				// s.delete(k);
			}
		}

	}

	if (bee.kind == 'player') {
		rem(bee.entity.statuses)
	}
	if (bee.kind == 'enemy') {
		for (const [sForp, statuses] of bee.entity.statuses) {
			rem(statuses)
		}
	}
	// if (r) {
	// 	decayed.push(...r)
	// }
	if (decayed.length) {
		let ptstatuses = decayed.map(d => {
			return {
				statusId: d.id,
				target: bee.entity.unitId,
				remove: true
			} satisfies StatusModifyAnimation
		})
		pushAnimation({
			sceneId: triggeredBy.currentUniqueSceneId,
			battleAnimation: {
				triggeredBy: triggeredBy.unitId,
				source: bee.entity.unitId,
				behavior: { kind: 'selfInflicted', extraSprite: 'smoke' },
				putsStatuses: ptstatuses
			}
		});
	}
}

function processBattleEvent(battleEvent: BattleEvent, player: Player) {
	handleRemoveStatusOnProvoke(battleEvent.source, player, battleEvent.itemUsed.provoke)

	let scenePlayers = activePlayersInScene(player.currentUniqueSceneId)
	let scenePlayersEntities: BattleEventEntity[] = scenePlayers.map((sp) => {
		return {
			kind: 'player',
			entity: sp
		};
	})
	let sceneEnemiesEntities: BattleEventEntity[] = enemiesInScene(player.currentUniqueSceneId).map(se => {
		return {
			kind: 'enemy',
			entity: se
		}
	})
	let alliesOfBee: BattleEventEntity[] = []
	let opponentsOfBee: BattleEventEntity[] = []
	if (battleEvent.source.kind == 'player') {
		alliesOfBee = scenePlayersEntities
		opponentsOfBee = sceneEnemiesEntities
	}
	if (battleEvent.source.kind == 'enemy') {
		alliesOfBee = sceneEnemiesEntities
		opponentsOfBee = scenePlayersEntities
	}
	const affectedsFromCanEffect = (ca: CanEffect) => {
		let affecteds: BattleEventEntity[] = [];
		if (ca == 'allEnemy') {
			affecteds = opponentsOfBee;
		} else if (ca == 'allFriendly') {
			affecteds = alliesOfBee;
		} else if (ca == 'selfOnly') {
			affecteds = [battleEvent.source];
		} else if (ca == 'targetOnly') {
			affecteds = [battleEvent.primaryTarget];
		}
		return affecteds;
	};

	const iAb: ItemAnimationBehavior = battleEvent.itemUsed.animation ?? { kind: 'melee' };
	let beBehav: AnimationBehavior = iAb;
	if (battleEvent.itemUsed.targets.kind == 'anyFriendly') {
		if (battleEvent.primaryTarget.entity.unitId == battleEvent.source.entity.unitId) {
			beBehav = { kind: 'selfInflicted', extraSprite: battleEvent.itemUsed.targets.selfAfflictSprite };
		}
	}

	let statusModAnims: StatusModifyAnimation[] = []
	if (battleEvent.itemUsed.modifiesStatus) {
		const statusAffected = affectedsFromCanEffect(battleEvent.itemUsed.modifiesStatus.affects);
		for (const put of statusAffected) {
			if (put.entity.health < 1) continue;
			if (battleEvent.itemUsed.modifiesStatus.dispell != undefined) {
				let toRemove: StatusData[] = []
				if (battleEvent.itemUsed.modifiesStatus.dispell == 'bad') {
					toRemove = statusDatas.filter(sd => sd.bad)
				}
				if (battleEvent.itemUsed.modifiesStatus.dispell == 'good') {
					toRemove = statusDatas.filter(sd => !sd.bad)
				}
				for (const r of toRemove) {
					if (checkHasStatus(put, r.id)) {
						removeStatus(put, r)
						statusModAnims.push({
							statusId: r.id,
							target: put.entity.unitId,
							remove: true,
						})
					}
				}
				resetBonusStats(put)
			}
			if (battleEvent.itemUsed.modifiesStatus.statusMod) {
				let countToAdd = battleEvent.itemUsed.modifiesStatus.statusMod.count
				let mind = 0
				if (battleEvent.source.kind == 'player') {
					mind = battleEvent.source.entity.mind
				}
				if (battleEvent.source.kind == 'enemy') {
					mind = battleEvent.source.entity.template.mind
				}
				mind += battleEvent.source.entity.bonusStats.mind
				let bonusLongevity = Math.floor(mind / 2)
				countToAdd += bonusLongevity

				if (put.kind == 'enemy') {
					let found = put.entity.statuses.get(player.unitId);
					if (!found) {
						found = new Map();
					}
					const exist = found.get(battleEvent.itemUsed.modifiesStatus.statusMod.statusId);

					if (!exist || exist < countToAdd) {
						found.set(battleEvent.itemUsed.modifiesStatus.statusMod.statusId, countToAdd);
					}
					put.entity.statuses.set(player.unitId, found);
				}
				if (put.kind == 'player') {
					const exist = put.entity.statuses.get(battleEvent.itemUsed.modifiesStatus.statusMod.statusId);
					if (!exist || exist < countToAdd) {
						put.entity.statuses.set(battleEvent.itemUsed.modifiesStatus.statusMod.statusId, countToAdd);
					}
				}

				// if (battleEvent.itemUsed.modifiesStatus.statusMod.remove) {
				// 	removeStatus(put, battleEvent.itemUsed.modifiesStatus.statusMod.statusId);
				// }
				statusModAnims.push({
					target: put.entity.unitId,
					statusId: battleEvent.itemUsed.modifiesStatus.statusMod.statusId,
					count: countToAdd,
				})
			}
		}
	}
	const healAnimations: HealAnimation[] = [];
	if (battleEvent.itemUsed.heals) {
		const healAffected = affectedsFromCanEffect(battleEvent.itemUsed.heals.affects);
		for (const healthModifyEvent of healAffected) {
			if (healthModifyEvent.entity.health < 1)
				continue;
			const r = healEntity(healthModifyEvent, battleEvent.itemUsed.heals.baseHeal);
			healAnimations.push({
				target: healthModifyEvent.entity.unitId,
				amount: r.healed
			});
		}
	}
	const aggroModifiedAnimations: AggroModifier[] = [];
	if (battleEvent.itemUsed.modifiesAggro) {
		const aggroAffected = affectedsFromCanEffect(battleEvent.itemUsed.modifiesAggro.affects);
		const aggroAffectedEnemies: ActiveEnemy[] = []
		for (const ae of aggroAffected) {
			if (ae.kind == 'enemy') {
				aggroAffectedEnemies.push(ae.entity)
			}
		}
		for (const affEnemy of aggroAffectedEnemies) {
			if (affEnemy.health < 1) continue;
			const foHeros: { hId: HeroId; amount: number }[] = [];
			if (battleEvent.itemUsed.modifiesAggro.aggroFor == "allPlayers") {
				for (const hero of scenePlayers) {
					const r = modifyAggroForPlayer(hero, affEnemy, battleEvent.itemUsed.modifiesAggro.amount);
					foHeros.push({
						hId: hero.unitId,
						amount: r.increasedBy
					});
				}
			} else {
				modifyAggroForPlayer(player, affEnemy, battleEvent.itemUsed.modifiesAggro.amount)
				foHeros.push({
					hId: player.unitId,
					amount: battleEvent.itemUsed.modifiesAggro.amount
				})
			}
			aggroModifiedAnimations.push({
				forHeros: foHeros,
				target: affEnemy.unitId
			});
		}
	}


	const damageAnimations: DamageAnimation[] = [];
	let damageAnimationForMissleTarget: DamageAnimation | undefined = undefined;
	if (battleEvent.itemUsed.damages) {
		let ads = affectedsFromCanEffect(battleEvent.itemUsed.damages.affects)
		for (const healthModifyEvent of ads) {
			if (healthModifyEvent.entity.health < 1) {
				continue;
			}
			if (battleEvent.itemUsed.damages.baseDmg) {
				const r = damageEntity(
					battleEvent.itemUsed.damages,
					battleEvent.source,
					healthModifyEvent,
				);
				if (
					beBehav.kind == 'missile' &&
					healthModifyEvent.entity.unitId == battleEvent.primaryTarget.entity.unitId &&
					damageAnimationForMissleTarget == undefined
				) {
					damageAnimationForMissleTarget = {
						target: healthModifyEvent.entity.unitId,
						amount: r.dmgDone
					};
				} else {
					damageAnimations.push({
						target: healthModifyEvent.entity.unitId,
						amount: r.dmgDone
					});
				}
			}
		}
	}
	if (damageAnimationForMissleTarget) {
		const firstStrike = damageAnimationForMissleTarget.amount.at(0);
		if (firstStrike) {
			damageAnimations.push({
				target: damageAnimationForMissleTarget.target,
				amount: [firstStrike]
			});
			damageAnimationForMissleTarget.amount.splice(0, 1);
		}
	}

	const battleAnimation: BattleAnimation = {
		triggeredBy: player.unitId,
		source: battleEvent.source.entity.unitId,
		behavior: beBehav,
		animateTo: battleEvent.primaryTarget.entity.unitId,
		alsoDamages: damageAnimations,
		alsoHeals: healAnimations,
		alsoModifiesAggro: aggroModifiedAnimations,
		putsStatuses: statusModAnims,
	};

	pushAnimation({
		sceneId: player.currentUniqueSceneId,
		battleAnimation: battleAnimation,
	});
	if (damageAnimationForMissleTarget) {
		for (const i of damageAnimationForMissleTarget.amount) {
			const xba: BattleAnimation = {
				triggeredBy: player.unitId,
				source: battleEvent.source.entity.unitId,
				behavior: beBehav,
				animateTo: battleEvent.primaryTarget.entity.unitId,
				alsoDamages: [{ target: damageAnimationForMissleTarget.target, amount: [i] }]
			};
			pushAnimation({
				sceneId: player.currentUniqueSceneId,
				battleAnimation: xba,
			});
		}
	}
	if (battleEvent.itemUsed.id) {
		const itemState = battleEvent.source.entity.inventory.find((i) => i.stats.id == battleEvent.itemUsed.id);
		if (itemState) {
			if (itemState.stats.cooldown) {
				itemState.cooldown = itemState.stats.cooldown;
			}
			if (itemState.stock) {
				itemState.stock--;
			}
		}
	}
	if (battleEvent.source.kind == 'enemy') {
		// enemy aggro to all players goes to zero when it uses an item
		for (const key of battleEvent.source.entity.aggros.keys()) {
			battleEvent.source.entity.aggros.set(key, 0);
		}
	}
}

export function getDamageReduction(from: BattleEventEntity): number {
	if (hasStatusWithKey(from, 'disarmors')) {
		return 0
	}
	let dmgReduc: number = 0
	for (const item of from.entity.inventory) {
		if (item.stats.damageReduction) {
			dmgReduc += item.stats.damageReduction
		}
	}

	return dmgReduc
}
export function getDamageLimit(from: BattleEventEntity): number | undefined {
	if (hasStatusWithKey(from, 'disarmors')) {
		return undefined
	}

	let dmgLim: number | undefined = undefined
	for (const item of from.entity.inventory) {
		if (item.stats.damageLimit) {
			if (dmgLim == undefined || dmgLim > item.stats.damageLimit) {
				dmgLim = item.stats.damageLimit
			}
		}
	}
	return dmgLim
}

export function getValidGameActionsFromVas(vas: VisualActionSource, player: Player): GameAction[] {
	const validUnlockableActions: GameAction[] = [];
	if (vas.actionsWithRequirements) {
		for (const unlockableActData of vas.actionsWithRequirements) {
			let passedRequirements = true;
			if (unlockableActData.requiresGear) {
				for (const requiredItem of unlockableActData.requiresGear) {
					if (!checkHasItem(player, requiredItem)) {
						passedRequirements = false;
						break;
					}
				}
			}
			if (unlockableActData.requiresFlags != undefined) {
				for (const flagRequired of unlockableActData.requiresFlags) {
					if (!player.flags.has(flagRequired)) {
						passedRequirements = false;
					}
				}
			}
			if (unlockableActData.requiresNonzeroStat != undefined) {
				if(player[unlockableActData.requiresNonzeroStat] < 1){
					passedRequirements = false
				}
			}
			if (unlockableActData.requiresNotFlags != undefined) {
				for (const flagNotAllowed of unlockableActData.requiresNotFlags) {
					if (player.flags.has(flagNotAllowed)) {
						passedRequirements = false;
					}
				}
			}
			if (passedRequirements) {
				let ga: GameAction;

				let txt = 'no text';
				if (unlockableActData.pickupItem) {
					const id = unlockableActData.pickupItem;
					txt = `Equip ${id}`;
				}
				if (unlockableActData.travelTo) {
					const scene = getSceneDataSimple(unlockableActData.travelTo);
					txt = `Travel to ${scene.displayName}`;
				}
				if (unlockableActData.travelToCheckpoint) {
					const travelTo = player.lastCheckpoint.dataId;
					unlockableActData.travelTo = travelTo;

					const scene = getSceneDataSimple(travelTo);
					txt = `Respawn at checkpoint: ${scene.displayName}`;
				}

				if (unlockableActData.bText) {
					txt = unlockableActData.bText;
				}

				ga = {
					buttonText: txt,
					unlockableActData: unlockableActData,
					associateWithUnit: vas.unitId
				};

				validUnlockableActions.push(ga);
			}
		}
	}
	return validUnlockableActions;
}

export function convertServerActionToClientAction(sa: GameAction): GameActionSentToClient {
	return {
		buttonText: sa.buttonText,
		itemId: sa.itemId,
		associateWithUnit: sa.associateWithUnit
	};
}

export function convertVasToClient(
	vas: VisualActionSource,
	player: Player
): VisualActionSourceInClient {
	let startText = vas.startText;
	let startLocked = vas.startsLocked;
	let responses: ConversationResponse[] = [];
	if (vas.responses) responses = vas.responses;
	let detectStep = undefined;
	if (vas.detect) {
		for (const detected of vas.detect) {
			if (player.flags.has(detected.flag)) {
				detectStep = detected.flag;
				startLocked = detected.locked;
				responses = detected.responses ?? [];
				startText = detected.startText ?? vas.startText;
			}
		}
	}

	const result = {
		id: vas.unitId,
		displayName: vas.displayName,
		startText: startText,
		responses: responses,
		sprite: vas.sprite,
		portrait: vas.portrait,
		startsLocked: startLocked,
		detectStep: detectStep,
		scene: player.currentUniqueSceneId.dataId
	} satisfies VisualActionSourceInClient;
	return result;
}

export function convertUnlockableActionsToClient(
	sUnlockables: GameAction[] | undefined
): GameActionSentToClient[] {
	const clientUnlockables: GameActionSentToClient[] = [];
	if (!sUnlockables) return clientUnlockables;
	return sUnlockables.map((u) => {
		return convertServerActionToClientAction(u);
	});
}

export type VisualActionSource = {
	unitId: VisualActionSourceId;
	displayName: string;
	sprite: AnySprite;
	portrait?: string;
	actionsWithRequirements?: VasActionData[];
	startText: string;
	responses?: ConversationResponse[];
	detect?: {
		flag: Flag;
		startText?: string;
		responses?: ConversationResponse[];
		locked?: boolean;
	}[];
	startsLocked?: boolean;
};

export type VisualActionSourceInClient = {
	displayName: string;
	scene: SceneDataId;
	startsLocked?: boolean;
	id: VisualActionSourceId;
	sprite: AnySprite;
	portrait?: string;
	startText: string;
	responses: ConversationResponse[];
	detectStep?: Flag;
};

export type VasActionData = {
	requiresFlags?: Flag[];
	requiresNonzeroStat?:UnitStat;
	requiresNotFlags?: Flag[];
	requiresGear?: ItemId[];
	pickupItem?: ItemId;
	travelTo?: SceneDataId;
	travelToCheckpoint?: boolean;
	setsFlag?: Flag;
	bText?: string;
	trainStat?: {inc : UnitStat, dec:UnitStat};
	spawnsEnemies?: EnemyForSpawning[];
};

export type EnemyForSpawning = {
	displayName?: string;
	template: EnemyTemplateId;
	statuses?: StatusState[];
};

// export type EnemyStatusesObject = Record<StatusId,number>

export type ConversationResponse = {
	responseId: string;
	unlock?: string[];
	lock?: string[];
	unlockVas?: VisualActionSourceId[];
	lockVas?: VisualActionSourceId[];
	startsLocked?: boolean;
	responseText: string;
	retort?: string;
};

export function deepEqual(objA: any, objB: any): boolean {
	// Check if both objects are of the same type
	if (typeof objA !== typeof objB) {
		return false;
	}

	if (typeof objA !== 'object' || objA === null || objB === null) {
		// If both objects are not objects or are null, compare them directly
		return objA === objB;
	}

	// Get the keys of both objects
	const keysA = Object.keys(objA);
	const keysB = Object.keys(objB);

	// Check if the number of keys is the same
	if (keysA.length !== keysB.length) {
		return false;
	}

	// Check if all keys in objA are also in objB and have equal values
	for (const key of keysA) {
		if (!keysB.includes(key) || !deepEqual(objA[key], objB[key])) {
			return false;
		}
	}

	return true;
}
