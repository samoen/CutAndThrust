import rage from './assets/extras/rage.png';
import skull from './assets/extras/suppose_dead.png';
import hidden from './assets/extras/hidden.png';
import plainsLandscape from './assets/landscapes/landscape-plain.webp?inline';
import castleLandscape from './assets/landscapes/landscape-castle.webp?inline';
import grimForestLandscape from './assets/landscapes/grim-altar.jpg?inline';
import bridgeLandscape from './assets/landscapes/landscape-bridge.webp';
import peasantPortrait from './assets/portraits/peasant-fists.webp';
import woodsmanPortrait from './assets/portraits/woodsman.webp';
import bowmanPortrait from './assets/portraits/bowman.webp';
import generalPortrait from './assets/portraits/general.webp';
import swordsmanPortrait from './assets/portraits/swordsman.webp';
import ladyPortrait from './assets/portraits/lady.webp';
import thiefPortrait from './assets/portraits/thief.webp';
import thugPortrait from './assets/portraits/thug.webp';
import heavyInfantryPortrait from './assets/portraits/heavy-infantry.webp';
import whiteMagePortrait from './assets/portraits/mage-white.webp';
import ruffianPortrait from './assets/portraits/ruffian.webp';
import magePortrait from './assets/portraits/mage.webp';
import peasant from './assets/units/peasant.png';
import rogue from './assets/units/rogue.png';
import thug from './assets/units/thug.png';
import heavyInfantry from './assets/units/heavyinfantry.png';
import whiteMage from './assets/units/white-mage.png';
import woodsman from './assets/units/woodsman.png';
import bowman from './assets/units/bowman.png';
import general from './assets/units/general.png';
import druid from './assets/units/druid.png';
import lady from './assets/units/lady.png';
import spectre from './assets/units/spectre.png';
import necromancer from './assets/units/necromancer.png';
import gruntPortrait from './assets/portraits/grunt.webp';
import longbowmanPortrait from './assets/portraits/longbowman.webp';
import spearman from './assets/units/spearman.png';
import longbowman from './assets/units/longbowman.png';
import swordsman from './assets/units/swordsman.png';
import rat from './assets/units/giant-rat.png';
import grunt from './assets/units/grunt.png';
import troll from './assets/units/young-ogre.png';
import greenDrip from './assets/extras/green-drip.png';
import ruffian from './assets/units/ruffian.png';
import fireghost from './assets/units/fireghost.png';
import thief from './assets/units/thief.png';
import mage from './assets/units/mage.png';
import arrow from './assets/extras/arrow.png';
import bomb from './assets/extras/bomb.png';
import box from './assets/scenery/box.png';
import shield from './assets/extras/shield.png';
import smoke from './assets/extras/smoke.png';
import noShield from './assets/extras/vulnerable.png';
import flame from './assets/extras/flame.png';
import heal from './assets/extras/heal.png';
import lighthouse from './assets/scenery/lighthouse.png';
import forest from './assets/scenery/mixed-summer-small.png';
import stoneDoor from './assets/scenery/dwarven-doors-closed.png';
import portal from './assets/scenery/summoning-center.png';
import signpost from './assets/scenery/signpost.png';
import temple from './assets/scenery/temple1.png';
import armor from './assets/scenery/armor.png';
import pendant from './assets/scenery/ankh-necklace.png';
import bombpad from './assets/scenery/bomb-pad.png';
import altar from './assets/scenery/altar.png';
import staff from './assets/scenery/staff-magic.png';
import whiteRing from './assets/extras/ring-white.png';
import bag from './assets/scenery/leather-pack.png';
import scarecrow from './assets/scenery/scarecrow.png';
import dagger from './assets/scenery/dagger.png';
import bow from './assets/scenery/bow.png';
import potion from './assets/scenery/potion-red.png';
import club from './assets/extras/club.png';
import potionSlot from './assets/equipment/potion-slot.png';
import skullSlot from './assets/equipment/skull-slot.png';
import dressSlot from './assets/equipment/dress_silk_green.png';
import tunicSlot from './assets/equipment/tunic_elven.png';
import clubSlot from './assets/equipment/club-small.png';
import bombSlot from './assets/equipment/bomb-slot.png';
import fistSlot from './assets/equipment/fist-human.png';
import shieldSlot from './assets/equipment/heater-shield.png';
import waitSlot from './assets/equipment/wait-slot.png';
import blankSlot from './assets/equipment/blank-attack.png';
import cloakSlot from './assets/equipment/cloak_leather_brown.png';
import poisonDartSlot from './assets/equipment/dagger-thrown-poison-human.png';
import dartSlot from './assets/equipment/dagger-thrown-human.png';
import fireballSlot from './assets/equipment/fireball.png';
import cuirassSlot from './assets/equipment/cuirass_muscled.png';
import leatherSlot from './assets/equipment/armor_leather.png';
import ankhSlot from './assets/equipment/ankh_necklace.png';
import ankhNecklace from './assets/scenery/ankh-necklace.png';
import magicStaffSlot from './assets/equipment/staff-magic-slot.png';
import daggerSlot from './assets/equipment/dagger-human.png';
import bowSlot from './assets/equipment/bow-short.png';

import type { EnemyTemplateId } from './enemies';
import type { Item, ItemId, ItemState } from './items';
import type { PlayerInClient } from './users';
import type { AnySprite, LandscapeImage } from './utils';
import type { StatusId } from './statuses';

export const enemySprites: Record<EnemyTemplateId, string> = {
  goblin: spearman,
  rat: rat,
  darter: spearman,
  orc: grunt,
  troll: troll,
  fireGremlin: fireghost
};

export function getSlotImage(item: Item): string {
  if (!item.visualBase) {
    if (item.slot == 'weapon') return fistSlot
    if (item.slot == 'body') return tunicSlot
    if (item.slot == 'utility') return bombSlot
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

export function getStatusImage(statusDataId: string): string {
  if (statusDataId == 'poisoned') return greenDrip
  if (statusDataId == 'rage') return rage
  if (statusDataId == 'fervor') return rage
  if (statusDataId == 'hidden') return hidden
  if (statusDataId == 'blessed') return heal
  if (statusDataId == 'protected') return shield
  if (statusDataId == 'vulnerable') return noShield
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

export function prefetchImages() {
  const img = new Image()
  img.src = castleLandscape
  img.src = grimForestLandscape
}

prefetchImages()
