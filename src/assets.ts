import rage from 'src/assets/extras/rage.png';
import skull from 'src/assets/extras/suppose_dead.png';
import hidden from 'src/assets/extras/hidden.png';
import plainsLandscape from 'src/assets/landscapes/landscape-plain.webp';
import castleLandscape from 'src/assets/landscapes/landscape-castle.webp';
import grimForestLandscape from 'src/assets/landscapes/grim-altar.jpg';
import bridgeLandscape from 'src/assets/landscapes/landscape-bridge.webp';
import peasantPortrait from 'src/assets/portraits/peasant-fists.webp';
import woodsmanPortrait from 'src/assets/portraits/woodsman.webp';
import bowmanPortrait from 'src/assets/portraits/bowman.webp';
import generalPortrait from 'src/assets/portraits/general.webp';
import swordsmanPortrait from 'src/assets/portraits/swordsman.webp';
import ladyPortrait from 'src/assets/portraits/lady.webp';
import thiefPortrait from 'src/assets/portraits/thief.webp';
import thugPortrait from 'src/assets/portraits/thug.webp';
import heavyInfantryPortrait from 'src/assets/portraits/heavy-infantry.webp';
import whiteMagePortrait from 'src/assets/portraits/mage-white.webp';
import ruffianPortrait from 'src/assets/portraits/ruffian.webp';
import magePortrait from 'src/assets/portraits/mage.webp';
import peasant from 'src/assets/units/peasant.png';
import rogue from 'src/assets/units/rogue.png';
import thug from 'src/assets/units/thug.png';
import heavyInfantry from 'src/assets/units/heavyinfantry.png';
import whiteMage from 'src/assets/units/white-mage.png';
import woodsman from 'src/assets/units/woodsman.png';
import bowman from 'src/assets/units/bowman.png';
import general from 'src/assets/units/general.png';
import druid from 'src/assets/units/druid.png';
import lady from 'src/assets/units/lady.png';
import spectre from 'src/assets/units/spectre.png';
import necromancer from 'src/assets/units/necromancer.png';
import gruntPortrait from 'src/assets/portraits/grunt.webp';
import longbowmanPortrait from 'src/assets/portraits/longbowman.webp';
import spearman from 'src/assets/units/spearman.png';
import longbowman from 'src/assets/units/longbowman.png';
import swordsman from 'src/assets/units/swordsman.png';
import rat from 'src/assets/units/giant-rat.png';
import grunt from 'src/assets/units/grunt.png';
import troll from 'src/assets/units/young-ogre.png';
import greenDrip from 'src/assets/extras/green-drip.png';
import ruffian from 'src/assets/units/ruffian.png';
import fireghost from 'src/assets/units/fireghost.png';
import thief from 'src/assets/units/thief.png';
import mage from 'src/assets/units/mage.png';
import arrow from 'src/assets/extras/arrow.png';
import bomb from 'src/assets/extras/bomb.png';
import box from 'src/assets/scenery/box.png';
import shield from 'src/assets/extras/shield.png';
import smoke from 'src/assets/extras/smoke.png';
import noShield from 'src/assets/extras/vulnerable.png';
import flame from 'src/assets/extras/flame.png';
import heal from 'src/assets/extras/heal.png';
import lighthouse from 'src/assets/scenery/lighthouse.png';
import forest from 'src/assets/scenery/mixed-summer-small.png';
import stoneDoor from 'src/assets/scenery/dwarven-doors-closed.png';
import portal from 'src/assets/scenery/summoning-center.png';
import signpost from 'src/assets/scenery/signpost.png';
import temple from 'src/assets/scenery/temple1.png';
import armor from 'src/assets/scenery/armor.png';
import pendant from 'src/assets/scenery/ankh-necklace.png';
import bombpad from 'src/assets/scenery/bomb-pad.png';
import altar from 'src/assets/scenery/altar.png';
import staff from 'src/assets/scenery/staff-magic.png';
import whiteRing from 'src/assets/extras/ring-white.png';
import bag from 'src/assets/scenery/leather-pack.png';
import scarecrow from 'src/assets/scenery/scarecrow.png';
import dagger from 'src/assets/scenery/dagger.png';
import bow from 'src/assets/scenery/bow.png';
import potion from 'src/assets/scenery/potion-red.png';
import club from 'src/assets/extras/club.png';
import potionSlot from 'src/assets/equipment/potion-slot.png';
import skullSlot from 'src/assets/equipment/skull-slot.png';
import dressSlot from 'src/assets/equipment/dress_silk_green.png';
import tunicSlot from 'src/assets/equipment/tunic_elven.png';
import clubSlot from 'src/assets/equipment/club-small.png';
import bombSlot from 'src/assets/equipment/bomb-slot.png';
import fistSlot from 'src/assets/equipment/fist-human.png';
import shieldSlot from 'src/assets/equipment/heater-shield.png';
import waitSlot from 'src/assets/equipment/wait-slot.png';
import blankSlot from 'src/assets/equipment/blank-attack.png';
import cloakSlot from 'src/assets/equipment/cloak_leather_brown.png';
import poisonDartSlot from 'src/assets/equipment/dagger-thrown-poison-human.png';
import dartSlot from 'src/assets/equipment/dagger-thrown-human.png';
import fireballSlot from 'src/assets/equipment/fireball.png';
import cuirassSlot from 'src/assets/equipment/cuirass_muscled.png';
import leatherSlot from 'src/assets/equipment/armor_leather.png';
import ankhSlot from 'src/assets/equipment/ankh_necklace.png';
import ankhNecklace from 'src/assets/scenery/ankh-necklace.png';
import magicStaffSlot from 'src/assets/equipment/staff-magic-slot.png';
import daggerSlot from 'src/assets/equipment/dagger-human.png';
import bowSlot from 'src/assets/equipment/bow-short.png';
import type { EnemyTemplateId } from 'src/enemies';
import type { Item, ItemId, ItemState } from 'src/items';
import type { PlayerInClient } from 'src/users';
import type { AnySprite, LandscapeImage } from 'src/utils';
import type { StatusId } from 'src/statuses';

export const enemySprites: Record<EnemyTemplateId, string> = {
	goblin: spearman,
	rat: rat,
	darter: spearman,
	orc: grunt,
	troll: troll,
	fireGremlin: fireghost
};

export function getSlotImage(item:Item): string {
    if(!item.visualBase){
        if(item.slot == 'weapon')return fistSlot
        if(item.slot == 'body')return tunicSlot
        if(item.slot == 'utility')return bombSlot
    }
    let id = item.visualBase
	if (id == 'club') return clubSlot;
	if (id == 'dagger') return daggerSlot;
	if (id == 'staff') return magicStaffSlot;
	if (id == 'bomb') return bombSlot;
	if (id == 'bow') return bowSlot;
	if (id == 'dart') return dartSlot;
	if (id == 'necklace') return ankhSlot;
	if (id == 'cloak') return cloakSlot;
	if (id == 'healer') return potionSlot;
	if (id == 'lightArmor') return leatherSlot;
	if (id == 'heavyArmor') return cuirassSlot;
	if (item.id == 'wait') return waitSlot;
	if (item.id == 'succumb') return skullSlot;
	return blankSlot;
}

export function getHeroPortrait(className: string): string {
	if (className == 'peasant') return peasantPortrait;
	if (className == 'thief') return thiefPortrait;
	if (className == 'rogue') return thiefPortrait;
	if (className == 'swordsman') return swordsmanPortrait;
	if (className == 'woodsman') return woodsmanPortrait;
	if (className == 'bowman') return bowmanPortrait;
	if (className == 'longbowman') return longbowmanPortrait;
	if (className == 'ruffian') return ruffianPortrait;
	if (className == 'thug') return thugPortrait;
	if (className == 'heavy') return heavyInfantryPortrait;
	if (className == 'mage') return magePortrait;
	if (className == 'cleric') return whiteMagePortrait;
	return peasantPortrait;
}

export function getPortrait(key: string): string {
	if (key == 'grunt') return gruntPortrait;
	if (key == 'lady') return ladyPortrait;
	if (key == 'general') return generalPortrait;
	return gruntPortrait;
}

export function getStatusImage(statusDataId:string): string {
    if(statusDataId == 'poisoned')return greenDrip
    if(statusDataId == 'rage')return rage
    if(statusDataId == 'fervor')return rage
    if(statusDataId == 'hidden')return hidden
    if(statusDataId == 'blessed')return heal
    if(statusDataId == 'protected')return shield
    if(statusDataId == 'vulnerable')return noShield
    return hidden
};

export function heroSpriteFromClass(className: string): string {
	if (className == 'peasant') return peasant;
	if (className == 'thief') return thief;
	if (className == 'rogue') return rogue;
	if (className == 'swordsman') return swordsman;
	if (className == 'ruffian') return ruffian;
	if (className == 'thug') return thug;
	if (className == 'woodsman') return woodsman;
	if (className == 'bowman') return bowman;
	if (className == 'longbowman') return longbowman;
	if (className == 'mage') return mage;
	if (className == 'heavy') return heavyInfantry;
	if (className == 'cleric') return whiteMage;
	return peasant;
}

export const anySprites: Record<AnySprite, string> = {
	arrow: arrow,
	bomb: bomb,
	smoke: smoke,
	shield: shield,
	flame: flame,
	heal: heal,
	poison: greenDrip,
	skull: skull,
	castle: lighthouse,
	forest: forest,
	stoneDoor: stoneDoor,
	portal: portal,
	signpost: signpost,
	temple: temple,
	club: club,
	bag: bag,
	box: box,
	whiteRing: whiteRing,
	scarecrow: scarecrow,
	dagger: dagger,
	bow: bow,
	staff: staff,
	necklace: ankhNecklace,
	pendant: pendant,
	potion: potion,
	altar: altar,
	bombPadded: bombpad,
	armorStand: armor,
	general: general,
	spectre: spectre,
	druid: druid,
	lady: lady,
	necromancer: necromancer
};

export function getLandscape(key: LandscapeImage): string {
	if (key == 'plains') {
		return plainsLandscape;
	} else if (key == 'castle') {
		return castleLandscape;
	} else if (key == 'grimForest') {
		return grimForestLandscape;
	} else if (key == 'bridge') {
		return bridgeLandscape;
	}
	return plainsLandscape;
}
