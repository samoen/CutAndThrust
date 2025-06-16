import type { HeroId, LandscapeImage } from './utils';
import {
	enemiesInScene,
	enemyTemplates,
	spawnEnemy,
	type EnemyStatuses,
	type EnemyTemplateId
} from './enemies';
import { equipItem, items, type ItemId } from './items';
import type { EnemyForSpawning, VisualActionSource } from './logic';
import type { HeroName, Flag, Player } from './users';

export const scenesData: Scene[] = [];

export type SceneDataId = string;
export type UniqueSceneIdenfitier =
	| { kind: 'solo'; dataId: SceneDataId; p: HeroId }
	| { kind: 'multi'; dataId: string };

export function getSceneData(player: Player): Scene {
	const s = getSceneDataSimple(player.currentUniqueSceneId.dataId);
	return s;
}
export function getSceneDataSimple(id: SceneDataId): Scene {
	const s = scenesData.find((sd) => sd.sceneDataId == id);
	if (!s) return dead;
	return s;
}

export function uniqueFromSceneDataId(hId: HeroId, sId: SceneDataId): UniqueSceneIdenfitier {
	const startSceneData = getSceneDataSimple(sId);
	let startUnique: UniqueSceneIdenfitier | undefined = undefined;
	if (startSceneData.solo) {
		startUnique = { kind: 'solo', dataId: startSceneData.sceneDataId, p: hId };
	} else {
		startUnique = { kind: 'multi', dataId: startSceneData.sceneDataId };
	}
	return startUnique;
}

export type Scene = {
	sceneDataId: SceneDataId;
	displayName: string;
	healsOnEnter?: boolean;
	healsOnVictory?: boolean;
	setsFlagOnVictory?: Flag;
	setsFlagOnEnter?: Flag;
	setCheckpointOnEnter?: boolean;
	spawnsEnemiesOnEnter?: EnemyForSpawning[];
	spawnsEnemiesOnBattleJoin?: EnemyForSpawning[];
	sceneTexts?: SceneTexts;
	actions?: (player: Player) => void;
	vases?: VisualActionSource[];
	solo?: boolean;
	landscape?: LandscapeImage;
};

export const alreadySpawnedCurrentBattle: Map<SceneDataId, Set<HeroId>> = new Map();
export function hasPlayerAlreadySpawnedForBattle(player: Player): boolean {
	const scene = getSceneData(player);
	const forScene = alreadySpawnedCurrentBattle.get(scene.sceneDataId);
	if (!forScene) return false;
	if (forScene.has(player.unitId)) return true;
	return false;
}
export function spawnedOngoing(player: Player) {
	const scene = getSceneData(player);
	const forScene = alreadySpawnedCurrentBattle.get(scene.sceneDataId);
	if (!forScene) {
		spawnedNewBattle(player);
		return;
	}
	forScene.add(player.unitId);
}
export function spawnedNewBattle(player: Player) {
	const scene = getSceneData(player);
	const set: Set<HeroId> = new Set();
	set.add(player.unitId);
	alreadySpawnedCurrentBattle.set(scene.sceneDataId, set);
}

export type SceneTexts = {
	[k: SceneDataId]: string;
} & {
	fallback: string;
};

export const startSceneDataId = 'tutorial';

export const dead: Scene = {
	sceneDataId: 'dead',
	displayName: 'Halls Of the Dead',
	healsOnEnter: true,
	sceneTexts: {
		fallback:
			'You see a bright light and follow it. After a short eternity you decide wandering the halls of the dead is not for you.'
	},
	vases: [
		{
			unitId: 'vasDeath',
			displayName: 'Death',
			sprite: 'spectre',
			startText: `I'm afraid your dead. Take a portal to go back to the world of the living.`,
			responses: [
				{
					responseId: 'howAreYou',
					responseText: `Hows running the underworld treating you?`,
					retort: `Oh you know, same old.`
				},
				{
					responseId: 'dev',
					responseText: `I hear there's a secret room for balance testing.`,
					retort: `Yep. Take this portal to the dev room.`,
					unlockVas: [`vasDev`]
				}
			],
			actionsWithRequirements: []
		},
		{
			unitId: 'vasCheckpoint',
			displayName: 'Portal',
			sprite: 'portal',
			startText: `A portal that takes you to your last checkpoint`,
			actionsWithRequirements: [{ travelToCheckpoint: true }]
		},
		{
			unitId: 'vasDev',
			startsLocked: true,
			displayName: 'Dev Room',
			sprite: 'portal',
			startText: `A room for testing battles`,
			actionsWithRequirements: [{ travelTo: 'armory' }]
		}
	]
};

const tutorial: Scene = {
	sceneDataId: `tutorial`,
	displayName: 'Tutorial',
	setCheckpointOnEnter: true,
	solo: true,
	sceneTexts: {
		fallback: `You are standing at a castle barracks. Soliders mill around swinging swords and grunting in cool morning air. You see Arthur, the captain of the castle guard marching towards you.`
	},
	vases: [
		{
			unitId: 'vasSkipTutorial',
			displayName: 'Skip Tutorial',
			sprite: 'portal',
			startText: `True heroes never skip the tutorial..`,
			startsLocked: true,
			actionsWithRequirements: [
				{
					travelTo: 'forest'
				}
			]
		},
		{
			unitId: 'vasTutorTutorial',
			displayName: 'Arthur',
			startText: `Look alive recruit! The first day of training can be the most dangerous of a guardsman's career.`,
			responses: [
				{
					responseId: 'scared',
					responseText: `Huh? Danger? I didn't sign up for this!`,
					retort: `Oh, I mistook you for our new recruit. Here's a portal to skip the tutorial.`,
					unlock: ['saidWrong'],
					lock: ['cheeky', 'brave', 'open'],
					lockVas: ['vasGoTrainTutorial'],
					unlockVas: ['vasSkipTutorial']
				},
				{
					responseId: 'open',
					responseText: `Aye sir, Reporting for duty!`,
					retort: `Welcome to basic training. Many great heroes started their journey on the very ground you stand. Follow orders and you might just join their ranks.`,
					unlock: ['brave', 'cautious', 'saidWrong'],
					lock: ['scared', 'cheeky'],
					lockVas: ['vasSkipTutorial']
				},
				{
					responseId: 'cheeky',
					responseText: `Yeah yeah, get on with it.`,
					retort: `Watch your tone, recruit. Many great heroes started their journey on the very ground you stand, and they all knew the importance of a good tutorial.`,
					unlock: ['saidWrong', 'brave', 'cautious'],
					lock: ['scared', 'open']
				},
				{
					startsLocked: true,
					responseId: 'cautious',
					responseText: `I'll do my best sir!`,
					retort: `Great to hear. You can select a unit by tapping or clicking it. When a unit is selected you will see available actions. Select the training room and enter.`,
					unlockVas: ['vasGoTrainTutorial'],
					lockVas: ['vasSkipTutorial'],
					lock: ['wantsToSkip', 'scared', 'cheeky', 'saidWrong', 'brave']
				},
				{
					startsLocked: true,
					responseId: 'brave',
					responseText: `I'm a hero already, this will be easy.`,
					retort: `We will see. You can select a unit by tapping or clicking it. When a unit is selected you will see available actions. Select the training room and enter.`,
					unlockVas: ['vasGoTrainTutorial'],
					lockVas: ['vasSkipTutorial'],
					lock: ['wantsToSkip', 'scared', 'cheeky', 'saidWrong', 'cautious']
				},
				{
					startsLocked: true,
					responseId: 'saidWrong',
					responseText: `Oops, can I reset our conversation?`,
					retort: `Yep, click my portrait to the left of this text to reset the conversation.`
				}
			],
			sprite: 'general',
			portrait: 'general'
		},
		{
			unitId: 'vasGoTrainTutorial',
			displayName: 'Training Room',
			startsLocked: true,
			sprite: 'castle',
			startText: `An entrance to a training room. You will fight one rat, just punch it!`,
			actionsWithRequirements: [
				{
					travelTo: `soloTrain0`
				}
			]
		}
	]
};

const trainingRoom0: Scene = {
	sceneDataId: `soloTrain0`,
	displayName: 'Training Room 1',
	landscape: 'bridge',
	solo: true,
	setCheckpointOnEnter: true,
	healsOnVictory:true,
	spawnsEnemiesOnEnter: [
		{
			displayName: 'Skitters',
			template: 'rat'
		}
	],
	sceneTexts: {
		fallback:
			'You enter the training room. It is well worn by many training sessions. The walls are covered in blast marks, dents and splinters.'
	},
	vases: [
		{
			unitId: 'vasEquipClub',
			displayName: 'Club',
			sprite: 'club',
			startText:
				'A club deals a hefty chunk of damage in a single strike. That makes it effective against lightly armored foes.',
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'club' }]
		},
		{
			unitId: 'vasEquipBomb',
			displayName: 'Bomb',
			sprite: 'bombPadded',
			startText: 'A powderbomb deals splash damage to all nearby enemies. Good against swarms and stealth enemies.',
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'bomb' }]
		},
		{
			unitId: 'vasTutor0',
			displayName: 'Arthur',
			sprite: 'general',
			portrait: 'general',
			startText: `What a great punch! You're a natural. Any questions?`,
			responses: [
				{
					responseId: 'explainAggro',
					responseText: `What's that purple bar beneath the enemies health bar?`,
					retort: `That is the enemy's aggression towards you. It indicates the likelihood of it attacking you on your next action. Some enemies gain aggression faster than others, and some actions provoke more.`
				},
				{
					responseId: 'gimmie',
					responseText: `Can I get some equipment?`,
					retort: `Sure, here's some gear. Select the items and and equip them.`,
					unlockVas: ['vasEquipClub', `vasEquipBomb`]
				},
				{
					responseId: 'explainNext',
					responseText: `What's my next challenge?`,
					retort: `Next you will fight a goblin. Goblins wear light armor, which reduces the damage of each incoming strike. Also there's a bit of a rat problem in there right now..`,
					unlockVas: ['vasGoTrain1']
				}
			]
		},
		{
			unitId: 'vasGoTrain1',
			displayName: 'Training Room 2',
			sprite: 'castle',
			startsLocked: true,
			startText: `A sign on the door says: 'Glornak's office'`,
			actionsWithRequirements: [
				{
					requiresGear: ['bomb', 'club'],
					travelTo: `soloTrain1`
				}
			]
		}
	]
};
const trainingRoom1: Scene = {
	sceneDataId: `soloTrain1`,
	displayName: 'Training Room 2',
	landscape: 'bridge',
	solo: true,
	setCheckpointOnEnter: true,
	spawnsEnemiesOnEnter: [
		{
			displayName: 'Glornak',
			template: 'goblin',
		},
		{
			displayName: 'Squeaky',
			template: 'rat'
		},
		{
			displayName: 'Scratchy',
			template: 'rat'
		},
		{
			displayName: 'Nibbles',
			template: 'rat'
		}
	],
	sceneTexts: {
		fallback:
			'"You enter the training room. It is well worn by many training sessions. The walls are covered in blast marks, dents and splinters."'
	},
	vases: [
		{
			unitId: 'vasTutor1',
			displayName: 'Arthur',
			sprite: 'general',
			portrait: 'general',
			startText: `Great job! Questions? Concerns?`,
			responses: [
				{
					responseId: 'imhurt',
					responseText: `I'm hurt!`,
					retort: `Here's a potion. Equip it, select yourself and take a sip`,
					unlockVas: ['vasEquipBandage']
				},
				{
					responseId: 'whyslow',
					responseText: `I got hit before my attack landed, what's up with that?`,
					retort: `An enemy with a higher agility than you will strike first. Some weapons give bonus agility - like this bow.`,
					unlockVas: ['vasWep']
				},
				{
					responseId: 'gimmie',
					responseText: `What's my next battle?`,
					retort: `Orcs wear heavy armor, which limits the amount of damage taken from each strike.`,
					unlockVas: ['vasGoTrain2']
				}
			]
		},
		{
			unitId: 'vasWep',
			displayName: 'Bow',
			sprite: 'bow',
			startText:
				'A bow is fast and provokes only the target. It is good at sniping high priority enemies.',
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'bow' }]
		},
		{
			unitId: 'vasEquipBandage',
			displayName: 'Potion',
			sprite: 'potion',
			startText: `Use potions when you get low on health. It has limited uses in each area, and gets refilled when you travel.`,
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'potion' }]
		},
		{
			unitId: 'vasGoTrain2',
			displayName: 'Training Room 3',
			sprite: 'castle',
			startsLocked: true,
			startText: `The sign reads: 'Kill the fire gremlin as soon as possible!'`,
			actionsWithRequirements: [
				{
					requiresGear: ['bow', 'potion'],
					travelTo: `soloTrain2`
				}
			]
		}
	]
};

const trainingRoom2: Scene = {
	sceneDataId: `soloTrain2`,
	displayName: 'Training Room 3',
	solo: true,
	setCheckpointOnEnter: true,
	healsOnVictory: true,
	spawnsEnemiesOnEnter: [
		{
			displayName: 'Borgus',
			template: 'orc',
		},
		{
			displayName: 'Scortchy',
			template: 'fireGremlin',
			statuses: [
				{
					statusId: 'fervor',
					count: 3
				}
			]
		}
	],
	vases: [
		{
			unitId: 'vasTutor3',
			displayName: 'Arthur',
			sprite: 'general',
			portrait: 'general',
			startText: `Brilliant work recruit! Alright, last one. We don't normally do this but I see something great in you. You are going to fight a troll.`,
			responses: [
				{
					responseId: 'ok',
					responseText: `I ain't 'fraid of no troll`,
					retort: `Trolls have very high damage and health, this equipment will let you handle him.`,
					unlockVas: ['vasEquipDart', `vasEquipCloak`, `vasEquipStaff`]
				},
				{
					responseId: 'whatifdie',
					responseText: `What if the troll wins the battle?`,
					retort: `It's not a problem. Just succumb to your wounds, respawn at your checkpoint and try again.`
				}
			]
		},
		{
			unitId: 'vasEquipStaff',
			displayName: 'Staff',
			sprite: 'staff',
			startText: `A magic staff will take a while to warmup before use. You must take other actions first.`,
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'fireStaff' }]
		},
		{
			unitId: 'vasEquipDart',
			displayName: 'Poison Dart',
			sprite: 'arrow',
			startText: `Poison deals more damage the bigger the enemy. It deals it's damage over 3 turns, so you need to be able to survive in the meantime.`,
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'poisonDart' }]
		},
		{
			unitId: 'vasEquipCloak',
			displayName: 'Thief Cloak',
			sprite: 'armorStand',
			startText: `A thief's cloak lets you become hidden, preventing retaliation from enemies. Hiding is a good way to wait for cooldowns and poison.`,
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'thiefCloak' }]
		},
		{
			unitId: 'vasGoTrain3',
			displayName: 'Training Room 4',
			sprite: 'stoneDoor',
			startText: `The next room looks more like a prison cell than a training room. The bones of previous recruits are strewn about the place..`,
			actionsWithRequirements: [
				{
					requiresGear: ['fireStaff', 'poisonDart', 'thiefCloak'],
					travelTo: `soloTrain3`
				}
			]
		}
	]
};

const trainingRoom3: Scene = {
	sceneDataId: `soloTrain3`,
	displayName: 'Training Room 4',
	solo: true,
	setCheckpointOnEnter: true,
	healsOnVictory: true,
	spawnsEnemiesOnEnter: [
		{
			displayName: 'Ragor',
			template: 'troll'
		}
	],
	sceneTexts: {
		fallback:
			'You enter a dark, stinking place. Iron bars slam shut behind you. A giant figure emerges from the darkness.'
	},
	vases: [
		{
			unitId: 'vasTutor4',
			displayName: 'Arthur',
			sprite: 'general',
			portrait: 'general',
			startText: `Well done recruit! You may be the chosen one after all..`,
			responses: [
				{
					responseId: 'go',
					responseText: 'Thanks Arthur',
					retort: `Now we can't have you starting the game with all that loot. Please drop your weapon in the box, put your farmer stuff back on, and head through the portal.`,
					unlockVas: ['vasLeaveTutorial', 'vasBox', 'vasBag', 'vasClothes']
				}
			]
		},
		{
			unitId: 'vasLeaveTutorial',
			displayName: 'Finish Tutorial',
			sprite: 'portal',
			startText: 'Take this portal to enter the world. Have fun :)',
			startsLocked: true,
			actionsWithRequirements: [
				{
					requiresGear: ['fist', 'belt', 'rags'],
					travelTo: 'forest'
				}
			]
		},
		{
			unitId: 'vasBox',
			displayName: 'Box',
			sprite: 'box',
			startText: `Drop your weapon into this box.`,
      startsLocked: true,
			actionsWithRequirements: [
				{
					pickupItem: 'fist'
				}
			]
		},
		{
			unitId: 'vasBag',
			displayName: 'Empty Bag',
			sprite: 'bag',
			startText: `Your trusty bag. It's empty`,
      startsLocked: true,
			actionsWithRequirements: [
				{
					pickupItem: 'belt'
				}
			]
		},
		{
			unitId: 'vasClothes',
			displayName: 'Clothes',
			sprite: 'scarecrow',
			startText: 'Just your old farmers clothes',
      startsLocked: true,
			actionsWithRequirements: [
				{
					pickupItem: 'rags'
				}
			]
		}
	]
};

export const forest: Scene = {
	sceneDataId: `forest`,
	displayName: 'Bramblefoot Woods',
	landscape: 'grimForest',
	setCheckpointOnEnter: true,
	sceneTexts: {
		dead: `You awake in a cold sweat with no memory of anything. \n\nThe world around you seems dark and permeated by an unholy madness. \n\nThere's a strange sickly smell that seems familiar. The smell of corruption. The smell of death.`,
		castle: `Despite your rising panic at the mere thought of entering that hellish maze of rotting plant matter and creatures beyond imagination, you push your way back into the depths.`,
		forestPassage: `You get out the passage, and stumble into the surrounding overgrowth`,
		fallback: `With every slight movement you feel sharp foliage digging into your flesh. The forest is green and verdent. It teems with life. The sound of insects buzzing fills the air like the distant screams of the innocent. Unseen creatures shuffle just out of sight, their eyes fixed firmly upon you: the unwanted visitor. There is something distinctly unwell about this place.`
	},
	vases: [
		{
			unitId: 'vascastle',
			displayName: 'Castle',
			sprite: 'castle',
			startText: `You are surrounded by dense undergrowth. In the distance you see a castle`,
			actionsWithRequirements: [{ travelTo: 'castle' }],
			responses: [
				{
					responseId: 'searchForest',
					responseText: 'Search around the undergrowth',
					unlockVas: ['vasBow']
				}
			]
		},
		{
			unitId: 'vasBow',
			displayName: 'Bow',
			sprite: 'bow',
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'bow' }],
			startText: `An old wooden bow`
		},
		{
			unitId: 'vasForestPassageFromForest',
			displayName: 'Hidden Passage',
			sprite: 'stoneDoor',
			startsLocked: true,
			actionsWithRequirements: [
				{ requiresFlags: ['heardAboutHiddenPassage'], travelTo: 'forestPassage' }
			],
			startText: `Delve into the secret passage`,
			detect: [
				{
					flag: 'heardAboutHiddenPassage'
				}
			]
		}
	]
};

const castle: Scene = {
	sceneDataId: `castle`,
	displayName: 'Castle Bramblemore',
	landscape: 'castle',
	sceneTexts: {
		throne: 'You climb back down those darn steps. So many steps.',
		forest: `You push your way through the piercing thorns and supple branches that seem to whip at your exposed flesh. After hours of arduous travel, you find yourself amongst thatch roof huts and tents. There are few people to be found, and those that are here seem dead behind the eyes.`,
		house: `You exit the housing of the greiving mother. The castle looms, and the forest beckons.`,
		fallback: `This castle contains the memory of great beauty, but it feels long gone. In its place is an emptiness. A confusion. Wherevery ou turn, it feels as though there is an entity just at the periphery of your visual. The sense of something obscene inhabits this place. What should be a structure of strength and security, has become something maddening to the senses.`
	},
	vases: [
		{
			unitId: 'vasKeep',
			displayName: 'Keep',
			sprite: 'castle',
			responses: [
				{
					responseId: 'rummage',
					responseText: 'Search around the old barracks',
					unlockVas: ['vasCastleBandage']
				}
			],
			actionsWithRequirements: [{ travelTo: 'throne' }],
			startText: `In the center of the castle lies the Bramblemore throne room. Along the path is a long abandoned barracks with broken gear strewn around.`
		},
		{
			unitId: 'vasHouse',
			displayName: 'House',
			sprite: 'stoneDoor',
			actionsWithRequirements: [{ travelTo: 'house' }],
			startText: `You see a beautiful little thatched roof cottage. It looks inviting.`
		},
		{
			unitId: 'vasCastleBandage',
			displayName: 'Potion',
			sprite: 'potion',
			startText: `You find a potion!`,
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'potion' }]
		},
		{
			unitId: 'vasForestFromCastle',
			displayName: 'Forest',
			sprite: 'forest',
			actionsWithRequirements: [{ travelTo: 'forest' }],
			startText: `Outside the castle grounds is a forest`
		}
	]
};

const house: Scene = {
	sceneDataId: `house`,
	displayName: `House`,
	landscape: 'bridge',
	setsFlagOnEnter: 'heardAboutHiddenPassage',
	sceneTexts: {
		fallback: `The air is sweet with the smell of flowery perfume, but there is a sense of sadness in the air. You notice the door slightly ajar and knock on it quietly. There is no response.\n\nYou gently push the door open.`
	},
	vases: [
		{
			unitId: 'vasHouseWoman',
			displayName: 'Giselle',
			sprite: 'lady',
			portrait: 'lady',
			startText: `Traveller, what is it you do here? Do you not see I grieve? My son... he was murdered by Gorlak and his rowdy band of filthy goblin scum. He was barely a man yet had the stars in his eyes. He sought adventure but found his demise far too soon. Will you avenge him on my behalf? I don't have much but I'm sure I can find somethign to reward you`,
			responses: [
				{
					responseId: `accepted`,
					responseText: `I will`,
					retort: `Thank you kind traveller. There is a passage in the forest hidden from normal view. My son would often go searching in the lands beyond. Search the dark recesses of the forest and you will come upon this place. Find those wretched curs and show them no mercy.`,
					lock: ['reward', 'rejected'],
					unlockVas: ['vasLeatherGift', 'vasForestPassageFromForest']
				},
				{
					responseId: `rejected`,
					responseText: `I won't`,
					retort: `Not much of a hero are you?`,
					lock: ['accepted']
				},
				{
					responseId: `reward`,
					responseText: `What's in it for me?`,
					retort: `My son had this set of leather armour. If only he had been wearing it when he went on his adventure.`,
					unlockVas: ['vasLeatherGift']
				}
			],
			detect: [
				{
					flag: 'killedGoblins',
					startText: `Dear Sir! You return with the stench of goblin blood about yourself. Thank you for obtaining vengence on my behalf.`,
					responses: [
						{
							responseId: 'cool',
							responseText: `All in a day's work ma'am`,
							retort: `I bequeath the armor to you so that my son's legacy may live on. Good luck out there.`
						}
					]
				}
			]
		},
		{
			unitId: 'vasLeatherGift',
			displayName: 'Reward',
			sprite: 'armorStand',
			startText: `Leather armor reduces the damage of each incoming strike.`,
			startsLocked: true,
			actionsWithRequirements: [
				{
					requiresFlags: ['killedGoblins'],
					pickupItem: 'leatherArmor'
				}
			],
			detect: [
				{
					flag: 'killedGoblins',
					locked: false,
					startText: `Leather armor reduces the damage of each incoming strike`
				}
			]
		},
		{
			unitId: 'vasGoCastle',
			displayName: 'Travel',
			sprite: 'signpost',
			startText: 'Leave the house',
			actionsWithRequirements: [{ travelTo: 'castle' }, { travelTo: 'forest' }]
		}
	]
};

const throne: Scene = {
	sceneDataId: `throne`,
	displayName: 'Bramblemore Throne Room',
	sceneTexts: {
		fallback: `Before you is a great throne. Sitting aside it are two giant sculptures carved from marble. The one of the left depicts an angel, its wings spread to a might span. It wields a sword from which a great fire burns. To the left of the throne is a garoyle, its lips pulled back in a monstrous snarl revealing rows of serrated teeth. One of its arms are raised and it appears to hold a ball of pure electricity which crackles in the dim light. Atop the throne sits an emaciated figure.`,
		tunnelChamber: `The dishevelled king turns to you and opens his arms as if to welcome you back.`
	},
	vases: [
		{
			unitId: 'vasThroneGuard',
			displayName: 'Guard',
			sprite: 'general',
			startText: `What business have you here, stranger? This is the throne room of the mighty king. I suggest you turn back until you have some business here.`,
			responses: [
				{
					responseId: 'ok',
					responseText: 'Fine',
					retort: 'Go do a quest or something'
				}
			],
			detect: [
				{
					flag: 'killedGoblins',
					startText: `Word of your deeds has reached the king and he has decided to give you an audience.`,
					responses: [
						{
							responseId: 'thanks',
							responseText: `Great`,
							retort: `You don't see this retort`,
							unlockVas: ['vasKing'],
							lockVas: ['vasThroneGuard']
						}
					]
				},
				{
					flag: 'smashedMedallion',
					locked: true
				},
				{
					flag: 'placedMedallion',
					locked: true
				}
			]
		},
		{
			unitId: 'vasKing',
			displayName: 'The King',
			startsLocked: true,
			sprite: 'necromancer',
			startText: `You have proven your worth traveller, but there is a greater threat at hand! The forces of good and evil are no longer in balance! You must take this medallion and complete the ritual before it's too late!`,
			responses: [
				{
					responseId: 'yep',
					responseText: 'Yep will do',
					retort: 'Yes good, gooooood...',
					unlockVas: ['vasChamberFromThrone'],
					lock: ['nope']
				},
				{
					responseId: 'nope',
					responseText: 'No can do, sorry',
					retort: 'Hmm well I think you will find me quite persuasive',
					lock: ['yep'],
					unlockVas: ['vasChamberFromThrone'],
					lockVas: ['vasCastleFromThrone']
				}
			],
			detect: [
				{
					flag: 'smashedMedallion',
					startText: `You have betrayed me stranger. And after I put my faith in you. You will suffer. Prepare yourself, I am sending you to a place from which there is no return.`,
					responses: [
						{
							responseId: 'ohno',
							responseText: `Oh noooo`,
							retort: 'hehehehe'
						}
					]
				},
				{
					flag: 'placedMedallion',
					startText: `'Stranger. You have done my bidding, I thank you.`,
					responses: [
						{
							responseId: 'yep',
							responseText: `Happy to help.`,
							retort:
								'I have more tasks for you. I have opened a portal to a place where great treasures are. Go gather some treasure.'
						}
					]
				}
			]
		},
		{
			unitId: 'vasRealmFromThrone',
			startsLocked: true,
			displayName: 'Portal',
			sprite: 'portal',
			startText: 'A portal to an unknown realm',
			actionsWithRequirements: [{ travelTo: 'realmOfMadness' }],
			detect: [
				{
					locked: false,
					flag: 'smashedMedallion'
				},
				{
					locked: false,
					flag: 'placedMedallion'
				}
			]
		},
		{
			unitId: 'vasChamberFromThrone',
			startsLocked: true,
			displayName: 'Dungeon',
			sprite: 'temple',
			startText: 'A musty staircase down into the depths of the castle',
			actionsWithRequirements: [
				{ requiresNotFlags: ['smashedMedallion'], travelTo: 'tunnelChamber' }
			],
			detect: [
				{
					flag: 'smashedMedallion',
					locked: true
				},
				{
					flag: 'placedMedallion',
					locked: false
				}
			]
		},
		{
			unitId: 'vasCastleFromThrone',
			displayName: 'Castle Grounds',
			sprite: 'castle',
			startText: 'Go back to the castle grounds',
			actionsWithRequirements: [
				{
					requiresNotFlags: ['smashedMedallion'],
					travelTo: 'castle'
				}
			],
			detect: [
				{
					flag: 'smashedMedallion',
					locked: true
				}
			]
		}
	]
};

const realmOfMadness: Scene = {
	sceneDataId: `realmOfMadness`,
	displayName: 'The Realm of Madness',
	sceneTexts: {
		fallback: `Such madness`
	},
	spawnsEnemiesOnEnter: [
		{
			displayName: 'Mad Troll',
			template: 'troll'
		}
	],
	vases: [
		{
			displayName: 'Portal',
			sprite: 'portal',
			startText: `A portal back to the throne room`,
			unitId: 'vasPortalMad',
			actionsWithRequirements: [
				{
					travelTo: 'throne'
				}
			]
		},
		{
			unitId: 'vasMadShrine',
			displayName: 'Shrine',
			sprite: 'altar',
			startText: `You can use this shrine to modify your stats`,
			actionsWithRequirements: [
				{
					bText:'Gain strength, lose agility',
					requiresNonzeroStat:'agility',
					trainStat:{inc:'strength',dec:'agility'}
				},
				{
					bText:'Gain strength, lose intelligence',
					requiresNonzeroStat:'mind',
					trainStat:{inc:'strength', dec:'mind'}
				},
				{
					bText:'Gain agility, lose intelligence',
					requiresNonzeroStat:'mind',
					trainStat:{inc:'agility', dec:'mind'}
				},
				{
					bText:'Gain agility, lose strength',
					requiresNonzeroStat:'strength',
					trainStat:{inc:'agility', dec:'strength'}
				},
				{
					bText:'Gain intelligence, lose strength',
					requiresNonzeroStat:'strength',
					trainStat:{inc:'mind', dec:'strength'}
				},
				{
					bText:'Gain intelligence, lose agility',
					requiresNonzeroStat:'agility',
					trainStat:{inc:'mind', dec:'agility'}
				},
			],
		},
	]
};

const forestPassage: Scene = {
	sceneDataId: `forestPassage`,
	landscape: 'grimForest',
	displayName: 'Passage',
	sceneTexts: {
		fallback: `After what feels like hours scrambling in the fetid soil and dodging the bites of the foul crawling creatures that call the forest home, you stumble upon an entrace.\n\nIt's so dark that you can hardly make out an exit. Feeling around, your hand brush against the walls. They feel warm. As if they were alive.`,
		goblinCamp: `You leave the camp and squeeze back into the dank passage`
	},
	vases: [
		{
			unitId: 'vasDweller',
			displayName: 'Forest Dweller',
			startText: `I mean you no harm. I can give you melee weapon - would you like a dagger, or are you more the clubbing sort?`,
			responses: [
				{
					responseId: 'freeDagger',
					responseText: `I choose the dagger`,
					retort: `Not the best against goblins but hey, stab em up! You remember how to reset NPC conversations right?`,
					unlockVas: ['vasFreeDagger'],
					lock: ['freeClub'],
					unlock: ['tips']
				},
				{
					responseId: 'freeClub',
					responseText: `I choose the club`,
					retort: `A fine choice! Bludgeon those enemies!`,
					unlockVas: ['vasFreeClub'],
					lock: ['freeDagger'],
					unlock: ['tips']
				},
				{
					responseId: 'tips',
					startsLocked: true,
					responseText: `Any tips for the battle?`,
					retort: `Remember goblins wear light armor. Target enraged enemies first. Psst.. there's a potion hidden at the castle.`
				}
			],
			sprite: 'druid'
		},
		{
			unitId: 'vasFreeClub',
			displayName: 'Club',
			sprite: 'club',
			startText: `A well worn club. It's slow but hits hard. Good against light armor.`,
			startsLocked: true,
			actionsWithRequirements: [
				{
					pickupItem: 'club'
				}
			]
		},
		{
			unitId: 'vasFreeDagger',
			displayName: 'Dagger',
			sprite: 'dagger',
			startText: `A rusty dagger. It's fast and strikes multiple times. Not good against light armor.`,
			startsLocked: true,
			actionsWithRequirements: [
				{
					pickupItem: 'dagger'
				}
			]
		},
		{
			unitId: 'vasPassageTravel',
			displayName: 'Travel',
			sprite: 'signpost',
			startText: `You are in a passage. At one end you see Bramblefoot Woods. At the other, a campsite`,
			actionsWithRequirements: [
				{
					travelTo: 'goblinCamp'
				},
				{
					travelTo: 'forest'
				}
			]
		}
	]
};

const goblinCamp: Scene = {
	sceneDataId: `goblinCamp`,
	displayName: 'Goblin Campsite',
	setsFlagOnVictory: 'killedGoblins',
	spawnsEnemiesOnEnter: [
		{
			displayName: 'Gorlak',
			template: 'goblin'
		},
		{
			displayName: 'Murk',
			template: 'goblin',
			statuses: [
				{
					statusId: 'rage',
					count: 3
				}
			]
		}
	],
	spawnsEnemiesOnBattleJoin: [
		{
			template: 'rat'
		}
	],
	sceneTexts: {
		fallback: `Urged on by by your own fear and by some unknown inspiration, you fumble your way through the darkness towards the light. You are blinded as you step through and are greeted with the sight of a ramshackle encampment`
	},
	vases: [
		{
			unitId: 'vasCastleFromCamp',
			displayName: 'Travel',
			sprite: 'signpost',
			startText: 'With the goblins slain you are free to travel about the lands',
			actionsWithRequirements: [{ travelTo: 'forestPassage' }, { travelTo: 'castle' }]
		},
		{
			unitId: 'vasPendant',
			displayName: 'Pendant',
			sprite: 'pendant',
			startText: 'A pendant of protection',
			actionsWithRequirements: [{ pickupItem:'pendantOfProtection' }]
		},
	]
};

const tunnelChamber: Scene = {
	sceneDataId: `tunnelChamber`,
	displayName: 'Bramblemore Dungeon',
	sceneTexts: {
		fallback: `You wend your way down a neverending series of corridors and pathways that seem to go on for an enternity. It becomes narrower and narrower, and the heat becomes almost unbearable. The path suddenly opens into a great chamber.`
	},
	setsFlagOnVictory:'placedMedallion',
	vases: [
		{
			unitId: 'vasDungeonAltar',
			displayName: 'Altar',
			sprite: 'altar',
			startText: `It's the altar the king told me about`,
			actionsWithRequirements: [
				{
					requiresNotFlags: ['placedMedallion', 'smashedMedallion'],
					bText: 'Place the medallion upon the altar',
					spawnsEnemies: [
						{
							displayName: 'Hooded Figure',
							template: 'orc'
						},
						{
							displayName: 'Shootah',
							template: 'darter',
							statuses: [{ statusId: 'hidden', count: 2 }]
						}
					]
				},
				{
					requiresNotFlags: ['placedMedallion', 'smashedMedallion'],
					setsFlag: 'smashedMedallion',
					bText: 'Smash the medallion'
				}
			],
			detect: [
				{
					flag: 'smashedMedallion',
					startText: `The altar's energies dissapated. A secret door opens, revealing an item`
				},
				{
					flag: 'placedMedallion',
					startText: `The medallion was placed on the altar, it opens a secret door, revealing an item`
				}
			]
		},
		{
			unitId: 'vasAltarReward1',
			displayName: 'Plate Mail',
			sprite: 'armorStand',
			startsLocked: true,
			startText: 'Plate mail limits the amount of damage you take from each strike.',
			actionsWithRequirements: [{ requiresFlags: ['placedMedallion'], pickupItem: 'plateMail' }],
			detect: [
				{
					flag: 'placedMedallion',
					locked: false
				}
			]
		},
		{
			unitId: 'vasAltarReward2',
			displayName: 'Staff',
			sprite: 'staff',
			startText: `An awesome staff`,
			startsLocked: true,
			actionsWithRequirements: [
				{
					requiresFlags: ['smashedMedallion'],
					pickupItem: 'fireStaff'
				}
			],
			detect: [
				{
					flag: 'smashedMedallion',
					locked: false
				}
			]
		},
		{
			unitId: 'vasThroneFromDungeon',
			displayName: 'Throne Room',
			sprite: 'castle',
			startText: 'Head back up to the throne room',
			actionsWithRequirements: [{ travelTo: 'throne' }]
		}
	]
};

const armory: Scene = {
	sceneDataId: `armory`,
	displayName: 'Dev Room',
	healsOnEnter:true,
	healsOnVictory:true,
	sceneTexts: {
		fallback: `Grab some gear!`
	},
	actions(player) {
		for (const item of items) {
			player.devActions.push({
				buttonText: `Equip ${item.id}`,
				devAction() {
					equipItem(player, item.id);
				},
				associateWithUnit:player.unitId,
			});
		}
		for (const t of enemyTemplates) {
			player.devActions.push({
				buttonText: `Spawn ${t.id}`,
				devAction() {
					const e: EnemyForSpawning = { template: t.id as EnemyTemplateId };
					spawnEnemy(e, player.currentUniqueSceneId, player.unitId);
				},
				associateWithUnit:player.unitId
			});
		}
	},
	vases: [
		{
			unitId: 'vasLeaveDev',
			displayName: 'Portal',
			sprite: 'portal',
			startText: `A portal that takes you to your last checkpoint`,
			actionsWithRequirements: [{ travelToCheckpoint: true },{travelTo:'tutorial'},{travelTo:'forest'}]
		},
		{
			unitId: 'vasShrine',
			displayName: 'Shrine',
			sprite: 'altar',
			startText: `Modify your stats`,
			actionsWithRequirements: [
				{
					bText:'Gain strength, lose agility',
					requiresNonzeroStat:'agility',
					trainStat:{inc:'strength',dec:'agility'}
				},
				{
					bText:'Gain strength, lose intelligence',
					requiresNonzeroStat:'mind',
					trainStat:{inc:'strength', dec:'mind'}
				},
				{
					bText:'Gain agility, lose intelligence',
					requiresNonzeroStat:'mind',
					trainStat:{inc:'agility', dec:'mind'}
				},
				{
					bText:'Gain agility, lose strength',
					requiresNonzeroStat:'strength',
					trainStat:{inc:'agility', dec:'strength'}
				},
				{
					bText:'Gain intelligence, lose strength',
					requiresNonzeroStat:'strength',
					trainStat:{inc:'mind', dec:'strength'}
				},
				{
					bText:'Gain intelligence, lose agility',
					requiresNonzeroStat:'agility',
					trainStat:{inc:'mind', dec:'agility'}
				},
			],
		},
	]
};

scenesData.push(dead);
scenesData.push(forest);
scenesData.push(castle);
scenesData.push(throne);
scenesData.push(house);
scenesData.push(forestPassage);
scenesData.push(goblinCamp);
scenesData.push(tunnelChamber);
scenesData.push(realmOfMadness);
scenesData.push(armory);

scenesData.push(tutorial);
scenesData.push(trainingRoom0);
scenesData.push(trainingRoom1);
scenesData.push(trainingRoom2);
scenesData.push(trainingRoom3);
