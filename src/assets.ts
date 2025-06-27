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
import sidebar from './assets/ui/sidebar.png'
import minimap from './assets/ui/minimap.png'
import heart from './assets/ui/heart.png';
import arrows from './assets/ui/arrows.png';
import footy from './assets/ui/foot.png';
import arm from './assets/ui/strong.png';
import sword from './assets/ui/sword.png';
import foot from './assets/ui/foot.png';
import teeth from './assets/ui/teeth.png';
import brain from './assets/ui/brain.png';
import lightShield from './assets/ui/light-shield.png';
import heavyShield from './assets/ui/heavy-shield.png';
import type { EnemyTemplateId } from './enemies';
import type { Item, ItemId, ItemState } from './items';
import type { PlayerInClient } from './users';
import type { AnySprite, LandscapeImage } from './utils';
import type { StatusId } from './statuses';
import { newPromWithRes } from './ui';

export type SpriteUrl = string
export function getEnemySprite(templateId: EnemyTemplateId): SpriteUrl {
  if (templateId == 'goblin') return anySprites.spearman
  if (templateId == 'rat') return anySprites.rat
  if (templateId == 'darter') return anySprites.spearman
  if (templateId == 'orc') return anySprites.grunt
  if (templateId == 'troll') return anySprites.troll
  if (templateId == 'fireGremlin') return anySprites.fireghost
  else return anySprites.troll

}

export function getSlotImage(item: Item): string {
  if (!item.visualBase) {
    if (item.slot == 'weapon') return anySprites.fistSlot
    if (item.slot == 'body') return anySprites.tunicSlot
    if (item.slot == 'utility') return anySprites.bombSlot
  }
  let id = item.visualBase
  if (id == 'club') return anySprites.clubSlot;
  if (id == 'dagger') return anySprites.daggerSlot;
  if (id == 'staff') return anySprites.magicStaffSlot;
  if (id == 'bomb') return anySprites.bombSlot;
  if (id == 'bow') return anySprites.bowSlot;
  if (id == 'dart') return anySprites.dartSlot;
  if (id == 'necklace') return anySprites.ankhSlot;
  if (id == 'cloak') return anySprites.cloakSlot;
  if (id == 'healer') return anySprites.potionSlot;
  if (id == 'lightArmor') return anySprites.leatherSlot;
  if (id == 'heavyArmor') return anySprites.cuirassSlot;
  if (item.id == 'wait') return anySprites.waitSlot;
  if (item.id == 'succumb') return anySprites.skullSlot;
  return anySprites.blankSlot;
}

export function getHeroPortrait(className: string): string {
  if (className == 'peasant') return anySprites.peasantPortrait;
  if (className == 'thief') return anySprites.thiefPortrait;
  if (className == 'rogue') return anySprites.thiefPortrait;
  if (className == 'swordsman') return anySprites.swordsmanPortrait;
  if (className == 'woodsman') return anySprites.woodsmanPortrait;
  if (className == 'bowman') return anySprites.bowmanPortrait;
  if (className == 'longbowman') return anySprites.longbowmanPortrait;
  if (className == 'ruffian') return anySprites.ruffianPortrait;
  if (className == 'thug') return anySprites.thugPortrait;
  if (className == 'heavy') return anySprites.heavyInfantryPortrait;
  if (className == 'mage') return anySprites.magePortrait;
  if (className == 'cleric') return anySprites.whiteMagePortrait;
  return peasantPortrait;
}

export function getPortrait(key: string): string {
  if (key == 'grunt') return anySprites.gruntPortrait;
  if (key == 'lady') return anySprites.ladyPortrait;
  if (key == 'general') return anySprites.generalPortrait;
  return gruntPortrait;
}

export function getStatusImage(statusDataId: string): string {
  if (statusDataId == 'poisoned') return anySprites.poison
  if (statusDataId == 'rage') return anySprites.rage
  if (statusDataId == 'fervor') return anySprites.rage
  if (statusDataId == 'hidden') return anySprites.hidden
  if (statusDataId == 'blessed') return anySprites.heal
  if (statusDataId == 'protected') return anySprites.shield
  if (statusDataId == 'vulnerable') return anySprites.noShield
  return hidden
};

export function heroSpriteFromClass(className: string): string {
  if (className == 'peasant') return anySprites.peasant;
  if (className == 'thief') return anySprites.thief;
  if (className == 'rogue') return anySprites.rogue;
  if (className == 'swordsman') return anySprites.swordsman;
  if (className == 'ruffian') return anySprites.ruffian;
  if (className == 'thug') return anySprites.thug;
  if (className == 'woodsman') return anySprites.woodsman;
  if (className == 'bowman') return anySprites.bowman;
  if (className == 'longbowman') return anySprites.longbowman;
  if (className == 'mage') return anySprites.mage;
  if (className == 'heavy') return anySprites.heavyInfantry;
  if (className == 'cleric') return anySprites.whiteMage;
  return peasant;
}

export const anySprites = {
  rat,
  spearman,
  grunt,
  troll,
  fireghost,
  blankSlot: blankSlot,
  fistSlot: fistSlot,
  tunicSlot: tunicSlot,
  bombSlot: bombSlot,
  clubSlot: clubSlot,
  daggerSlot: daggerSlot,
  magicStaffSlot: magicStaffSlot,
  bowSlot: bowSlot,
  dartSlot: dartSlot,
  ankhSlot: ankhSlot,
  cloakSlot: cloakSlot,
  potionSlot: potionSlot,
  leatherSlot: leatherSlot,
  cuirassSlot: cuirassSlot,
  waitSlot: waitSlot,
  skullSlot: skullSlot,
  peasantPortrait: peasantPortrait,
  thiefPortrait: thiefPortrait,
  swordsmanPortrait: swordsmanPortrait,
  woodsmanPortrait: woodsmanPortrait,
  bowmanPortrait: bowmanPortrait,
  longbowmanPortrait: longbowmanPortrait,
  ruffianPortrait: ruffianPortrait,
  thugPortrait: thugPortrait,
  heavyInfantryPortrait: heavyInfantryPortrait,
  magePortrait: magePortrait,
  whiteMagePortrait: whiteMagePortrait,
  gruntPortrait: gruntPortrait,
  ladyPortrait: ladyPortrait,
  generalPortrait: generalPortrait,
  noShield: noShield,
  hidden: hidden,
  rage: rage,
  peasant: peasant,
  thief: thief,
  rogue: rogue,
  swordsman: swordsman,
  ruffian: ruffian,
  thug: thug,
  woodsman: woodsman,
  bowman: bowman,
  longbowman: longbowman,
  mage: mage,
  heavyInfantry: heavyInfantry,
  whiteMage: whiteMage,
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
  necromancer: necromancer,
  sidebar: sidebar,
  minimap: minimap,
  heart: heart,
  arrows: arrows,
  footy: footy,
  arm: arm,
  sword: sword,
  foot: foot,
  teeth: teeth,
  brain: brain,
  lightShield: lightShield,
  heavyShield: lightShield
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

export async function prefetchImages() {
  let toFetch = [castleLandscape, plainsLandscape, bridgeLandscape, grimForestLandscape]
  for (let i of Object.values(anySprites)) {
    toFetch.push(i)
  }
  let proms: Promise<void>[] = []
  for (let i of toFetch) {
    let p = newPromWithRes()
    proms.push(p.prom)
    // console.log('i')
    const img = new Image()
    img.src = i
    img.onload = () => {
      p.resolve()
    }
  }
  await Promise.all(proms)
  console.log('images preloaded')
}

await prefetchImages()
