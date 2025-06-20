import './style.css'
import * as Ui from './ui'
import * as Logic from './logic'
import { addNewUser, users, type PlayerCommonStats, type PlayerInClient } from './users'
import { buildNextMessage, type MessageFromServer } from './messaging'
import { changeScene, updatePlayerActions, type VisualActionSourceInClient } from './logic'
import { anySprites, enemySprites, getHeroPortrait, getLandscape, getPortrait, getStatusImage, heroSpriteFromClass } from './assets'
import type { BattleAnimation, EnemyInClient, HeroId, StatusState, UnitId, VisualActionSourceId } from './utils'
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
import shieldHealth from './assets/ui/shield-health.png';
import { equipItem } from './items'

document.querySelector<HTMLDivElement>('#loading')!.remove()

export const uiEvents = {
  rerender: 'rerender',
  animate: 'animate'
} as const
export const bus = new EventTarget();
export function listenBus(uiEvent: UIEvent, fire: () => void): () => void {
  let listener = (event: Event) => {
    // const customEvent = event as CustomEvent<UIEvent>;
    // let msg: UIEvent = customEvent.detail
    fire()
  }
  bus.addEventListener(uiEvent, listener)
  return () => {
    bus.removeEventListener(uiEvent, listener)
  }
}
export function dispatchBus(uiEvent: UIEvent) {
  bus.dispatchEvent(new CustomEvent(uiEvent, {
    detail: {}
  }))
}


export type UIEvent = typeof uiEvents[keyof typeof uiEvents]

export let intraSyncUnits: { element: HTMLElement, guestArea: HTMLElement, homeArea: HTMLElement, unitId: UnitId, kind: 'enemy' | 'vas' | 'ally' }[] = []

document.body.style.backgroundColor = 'aliceblue'
document.body.style.padding = '0'
document.body.style.margin = '0'
document.body.style.overflowWrap = 'break-word'

let wrapGameField = document.createElement('div')
wrapGameField.style.height = '70svh'
wrapGameField.style.overflowY = 'auto'
wrapGameField.style.overflowX = 'hidden'
wrapGameField.style.backgroundColor = 'black';
document.body.appendChild(wrapGameField)

export let yourSceneLabel = document.createElement('span')
yourSceneLabel.style.position = 'absolute'
yourSceneLabel.style.paddingInline = '6px'
yourSceneLabel.style.zIndex = '2'
yourSceneLabel.style.fontWeight = 'bold'
yourSceneLabel.style.borderBottomRightRadius = '15px'
yourSceneLabel.style.border = '3px solid bisque'
yourSceneLabel.style.borderTopWidth = '1px'
yourSceneLabel.style.borderLeftWidth = '1px'
yourSceneLabel.style.color = 'brown'
yourSceneLabel.style.backgroundColor = 'beige'
listenBus(uiEvents.rerender, () => {
  if (!Ui.uiStateYep.lastMsgFromServer) return
  yourSceneLabel.textContent = Ui.uiStateYep.lastMsgFromServer.yourInfo.currentSceneDisplay
})
wrapGameField.appendChild(yourSceneLabel)

let visual = document.createElement('div')
visual.style.position = 'relative'
visual.style.backgroundColor = 'black'
visual.style.display = 'grid'
visual.style.columnGap = '1px'
visual.style.gridTemplateColumns = '1fr 1fr'
visual.style.justifyContent = 'center'
visual.style.alignItems = 'center'
visual.style.height = 'max-content'
visual.style.minHeight = '100%'
wrapGameField.appendChild(visual)
listenBus(uiEvents.animate, async () => {
  let anim = getCurrentAnim()
  if (!anim) return
  if (anim.behavior.kind == 'travel' || anim.teleporting) {
    if (anim.source == Ui.uiStateYep.lastMsgFromServer?.yourInfo.unitId) {
      visual.style.transition = `opacity ${Ui.animationDurations.meleeThere}ms ease-in-out`
      visual.style.opacity = '0'
      await Ui.waitAnimStep('meleeThere')
      visual.style.opacity = '1'
    }
  }
})

let imageBackground = document.createElement('div')
imageBackground.style.position = 'absolute'
imageBackground.style.top = '0'
imageBackground.style.overflow = 'hidden'
imageBackground.style.height = '100%'
imageBackground.style.width = '100%'
visual.appendChild(imageBackground)

let bgAndGrad = document.createElement('div')
bgAndGrad.style.position = 'relative'
imageBackground.appendChild(bgAndGrad)

export let imageBackgroundImg = document.createElement('img')
imageBackgroundImg.draggable = false
imageBackgroundImg.style.minWidth = '100vw'
listenBus(uiEvents.rerender, () => {
  if (!Ui.uiStateYep.lastMsgFromServer) return
  imageBackgroundImg.src = getLandscape(Ui.uiStateYep.lastMsgFromServer.landscape)
})
bgAndGrad.appendChild(imageBackgroundImg)

let bgGrad = document.createElement('div')
bgGrad.style.position = 'absolute'
bgGrad.style.height = '50px'
bgGrad.style.bottom = '0'
bgGrad.style.width = '100%'
bgGrad.style.background = 'linear-gradient(to bottom, transparent 0%, black 90%)'
bgAndGrad.appendChild(bgGrad)

type Team = 'ally' | 'enemy' | 'vas'

function createUnitAndArea(arg: { unitId: UnitId, team: Team }): { unitAndArea: HTMLElement, heroSprite: HTMLImageElement, nameTag: HTMLElement, homePlaceholder: HTMLElement, onRemove: () => void, visualUnitTop: HTMLElement, guestArea: HTMLElement } {
  let unitAndArea = document.createElement('div')
  unitAndArea.style.display = 'flex'
  unitAndArea.style.flexDirection = 'row'

  let homePlaceholder = document.createElement('div')
  // homePlaceholder.style.order = '1'
  // homePlaceholder.style.border = '2px dashed transparent'
  homePlaceholder.style.borderRadius = '10px'
  homePlaceholder.style.width = '50%'
  homePlaceholder.style.height = 'auto'
  unitAndArea.appendChild(homePlaceholder)

  let visualUnitTop = document.createElement('div')
  homePlaceholder.appendChild(visualUnitTop)

  let nameHolder = document.createElement('div')
  nameHolder.style.display = 'flex'
  nameHolder.style.alignItems = 'center'
  nameHolder.style.justifyContent = 'center'
  visualUnitTop.appendChild(nameHolder)

  let nameTag = document.createElement('span')
  nameTag.style.color = 'white'
  // nameTag.textContent = arg.vup.ac
  nameHolder.appendChild(nameTag)

  let outerHeroSprite = document.createElement('div')
  outerHeroSprite.style.position = 'relative'
  outerHeroSprite.style.width = '100%'
  visualUnitTop.appendChild(outerHeroSprite)

  let statuses = document.createElement('div')
  statuses.style.position = 'absolute';
  statuses.style.top = '0';
  statuses.style.left = '0';
  statuses.style.zIndex = '2';
  outerHeroSprite.appendChild(statuses)

  function updateStatuses() {
    statuses.replaceChildren()
    if (!Ui.uiStateYep.lastMsgFromServer) return
    let statusStates: StatusState[] = []
    let enemy = Ui.uiStateYep.lastMsgFromServer.enemiesInScene.find(e => e.unitId == arg.unitId)
    if (enemy) {
      statusStates = enemy.statuses
    }
    if (arg.unitId == Ui.uiStateYep.lastMsgFromServer.yourInfo.unitId) {
      statusStates = Ui.uiStateYep.lastMsgFromServer.yourInfo.statuses
    }
    for (let s of statusStates) {
      let status = document.createElement('img')
      status.style.display = 'flex'
      status.style.height = 'clamp(14px, 1vw + 10px, 30px)'
      status.src = getStatusImage(s.statusId)
      statuses.appendChild(status)
    }
  }
  updateStatuses()
  let removeStatusListen = listenBus(uiEvents.rerender, () => {
    updateStatuses()
  })
  let removeAnimStatusListen = listenBus(uiEvents.animate, async () => {
    let anim = getCurrentAnim()
    if (!anim) return
    if (!anim.putsStatuses) {
      return
    }
    await Ui.waitAnimStep('missile')
    updateStatuses()
  })


  let removeAnimateSelfInclictListener = listenBus(uiEvents.animate, async () => {
    let anim = getCurrentAnim()
    if (!anim) return
    if (anim.behavior.kind != 'selfInflicted') return
    if (anim.source != arg.unitId) return
    let inflictImg = document.createElement('img')
    inflictImg.src = anySprites[anim.behavior.extraSprite]
    inflictImg.style.position = 'absolute'
    if (arg.team == 'ally') {
      inflictImg.style.left = '0px'
    } else {
      inflictImg.style.right = '0px'
    }
    guestAreaPlaceholder.appendChild(inflictImg)
    await Ui.nextAnimFrame()
    inflictImg.style.transition = `transform ${Ui.animationDurations.inflict}ms ease-in`
    inflictImg.style.transform = 'translateY(50%)'
    await Ui.waitAnimStep('halfStrike')
    inflictImg.remove()
  })

  let heroSprite = document.createElement('img')
  heroSprite.style.display = 'block'
  heroSprite.style.width = '100%'
  heroSprite.style.aspectRatio = '1/1'
  outerHeroSprite.appendChild(heroSprite)
  heroSprite.draggable = false

  let guestAreaPlaceholder = document.createElement('div')
  guestAreaPlaceholder.style.position = 'relative'
  guestAreaPlaceholder.style.width = '50%'
  guestAreaPlaceholder.style.height = 'auto'
  unitAndArea.appendChild(guestAreaPlaceholder)
  function indicateSelected() {
    if (!Ui.uiStateYep.lastUnitClicked) return
    if (Ui.uiStateYep.lastUnitClicked == arg.unitId) {
      homePlaceholder.style.boxShadow = '0 0 10px rgb(0, 0, 0, 0.9)';
    } else {
      homePlaceholder.style.boxShadow = 'none'
    }
  }
  indicateSelected()
  let removeSelectedListener = listenBus(uiEvents.rerender, () => {
    indicateSelected()
  })
  let removeHideWhenAnimatingListener = listenBus(uiEvents.animate, () => {
    homePlaceholder.style.boxShadow = 'none'
  })

  homePlaceholder.addEventListener('click', () => {
    Ui.uiStateYep.lastUnitClicked = arg.unitId
    dispatchBus(uiEvents.rerender)
  })

  let removeAnimateToListener = listenBus(uiEvents.animate, async () => {
    // if (!Ui.uiStateYep.lastMsgFromServer) return
    let currentAnim = getCurrentAnim()
    if (!currentAnim) return
    if (currentAnim.behavior.kind != 'melee' && currentAnim.behavior.kind != 'travel') return
    if (currentAnim.source !== arg.unitId) return
    let destinationUnitElement = intraSyncUnits.find(ue => ue.unitId == currentAnim.animateTo)
    if (!destinationUnitElement) return
    // animate to unit
    const { top: top1, left: left1 } = destinationUnitElement.element.getBoundingClientRect()
    const { top: top2, left: left2 } = visualUnitTop.getBoundingClientRect()
    let topDiff = top1 - top2
    let leftDiff = left1 - left2
    if (destinationUnitElement.kind === 'ally') {
      leftDiff += destinationUnitElement.element.offsetWidth / 2
    }
    visualUnitTop.style.transition = `transform ${Ui.animationDurations.meleeThere}ms ease`;
    visualUnitTop.style.transform = `translateX(${leftDiff}px) translateY(${topDiff}px)`
    await Ui.waitAnimStep('meleeThere')

    // strikes
    if (currentAnim.alsoDamages) {
      let outgoingStrikes = currentAnim.alsoDamages.find(ad => ad.target == currentAnim.animateTo)
      if (outgoingStrikes) {
        for (let i = 0; i < outgoingStrikes.amount.length; i++) {
          // console.log('anim hit', i, outgoingStrikes)
          let appendTransform = ''
          if (heroSprite.style.transform != 'none') {
            appendTransform = heroSprite.style.transform
          }
          heroSprite.style.transform = appendTransform + 'rotate(10deg) translateX(20px) translateY(-5px)'
          await Ui.waitAnimStep("halfStrike")
          heroSprite.style.transform = appendTransform
          await Ui.waitAnimStep("halfStrike")
        }
      }
    }

    if (currentAnim.behavior.kind == 'travel') {
      visualUnitTop.style.transform = 'none'
      visualUnitTop.style.transition = 'none'
      return
    }

    // back again
    visualUnitTop.style.transform = 'none'
    await Ui.waitAnimStep('meleeThere')
    visualUnitTop.style.transition = 'none'
  })

  let onRemove = () => {
    removeHideWhenAnimatingListener()
    removeSelectedListener()
    removeStatusListen()
    removeAnimStatusListen()
    removeAnimateToListener()
    removeAnimateSelfInclictListener()
  }

  return {
    unitAndArea: unitAndArea,
    heroSprite: heroSprite,
    guestArea: guestAreaPlaceholder,
    nameTag: nameTag,
    homePlaceholder: homePlaceholder,
    onRemove: onRemove,
    visualUnitTop: visualUnitTop
  }
}

export function createBattleBar({ unitId }: { unitId: UnitId }): { bars: HTMLElement, onRemoveBattleBar: () => void } {
  let bars = document.createElement('div')
  bars.style.height = 'clamp(17px, 1vw + 10px, 30px)';
  bars.style.opacity = '0.7';
  bars.style.display = 'flex';
  bars.style.flexDirection = 'column';
  bars.style.alignItems = 'center';

  let healthBar = document.createElement('div')
  healthBar.style.width = '100%'
  healthBar.style.height = '50%'
  healthBar.style.border = '2px solid black'
  healthBar.style.borderRadius = '5px'
  healthBar.style.backgroundColor = 'black'
  healthBar.style.marginBottom = '1px'
  bars.appendChild(healthBar)

  let healthBarHealth = document.createElement('div')
  healthBarHealth.style.borderRadius = '5px'
  healthBarHealth.style.backgroundColor = 'green';
  healthBarHealth.style.transition = 'width 0.2s ease-in-out'
  healthBarHealth.style.height = '100%'
  healthBar.appendChild(healthBarHealth)

  function syncHealthToCurrent() {
    if (!Ui.uiStateYep.lastMsgFromServer) return
    // let lastMsgHps = getMsgHps(Ui.uiStateYep.lastMsgFromServer)
    let percent = 0
    if (unitId == Ui.uiStateYep.lastMsgFromServer.yourInfo.unitId) {
      percent = 100 * Ui.uiStateYep.lastMsgFromServer.yourInfo.health / Ui.uiStateYep.lastMsgFromServer.yourInfo.maxHealth
    }
    let enemy = Ui.uiStateYep.lastMsgFromServer.enemiesInScene.find(e => e.unitId == unitId)
    if (enemy) {
      percent = 100 * enemy.health / enemy.maxHealth
    }
    healthBarHealth.style.width = `${percent}%`
  }

  syncHealthToCurrent()
  let removeHealthListener = listenBus(uiEvents.rerender, () => {
    syncHealthToCurrent()
  })

  let removeHealthLossListener = listenBus(uiEvents.animate, async () => {
    if (!Ui.uiStateYep.previousMsgFromServer) return
    let currentAnim = getCurrentAnim()
    if (!currentAnim) return
    if (!currentAnim.alsoDamages) return
    let dmgAnimForMe = currentAnim.alsoDamages.find(ad => ad.target == unitId)
    if (!dmgAnimForMe) return
    if (currentAnim.behavior.kind == 'melee') {
      await Ui.waitAnimStep('meleeThere')
    }
    if (currentAnim.behavior.kind == 'missile') {
      await Ui.waitAnimStep('missile')
    }
    if (currentAnim.behavior.kind == 'center') {
      await Ui.waitAnimStep('toCenter')
    }
    let enemyInPreviousMsg = Ui.uiStateYep.previousMsgFromServer.enemiesInScene.find(e => e.unitId == unitId)
    let heroInPreviousMsg = undefined
    if (Ui.uiStateYep.previousMsgFromServer.yourInfo.unitId == unitId) {
      heroInPreviousMsg = Ui.uiStateYep.previousMsgFromServer.yourInfo
    }

    for (let amt of dmgAnimForMe.amount) {
      let percent = 0
      if (enemyInPreviousMsg) {
        enemyInPreviousMsg.health -= amt
        if (enemyInPreviousMsg.health < 1) {
          percent = 0
        } else {
          percent = 100 * (enemyInPreviousMsg.health / enemyInPreviousMsg.maxHealth)
        }
      }
      if (heroInPreviousMsg) {
        heroInPreviousMsg.health -= amt
        if (heroInPreviousMsg.health < 1) {
          percent = 0
        } else {
          percent = 100 * (heroInPreviousMsg.health / heroInPreviousMsg.maxHealth)
        }
      }
      // percent = Math.floor(percent)
      healthBarHealth.style.width = `${percent}%`
      if (currentAnim.behavior.kind == 'melee') {
        await Ui.waitAnimStep('halfStrike')
        await Ui.waitAnimStep('halfStrike')
      } else {
        await Ui.waitAnimStep('seeResult')
      }
    }
  })
  let removeHealthGainListener = listenBus(uiEvents.animate, async () => {
    if (!Ui.uiStateYep.previousMsgFromServer) return
    let currentAnim = getCurrentAnim()
    if (!currentAnim) return
    if (!currentAnim.alsoHeals) return
    let dmgAnimForMe = currentAnim.alsoHeals.find(ad => ad.target == unitId)
    if (!dmgAnimForMe) return
    if (currentAnim.behavior.kind == 'melee') {
      await Ui.waitAnimStep('meleeThere')
    }
    if (currentAnim.behavior.kind == 'missile') {
      await Ui.waitAnimStep('missile')
    }
    if (currentAnim.behavior.kind == 'center') {
      await Ui.waitAnimStep('toCenter')
    }
    let enemyInPreviousMsg = Ui.uiStateYep.previousMsgFromServer.enemiesInScene.find(e => e.unitId == unitId)
    let heroInPreviousMsg = undefined
    if (Ui.uiStateYep.previousMsgFromServer.yourInfo.unitId == unitId) {
      heroInPreviousMsg = Ui.uiStateYep.previousMsgFromServer.yourInfo
    }

    let amt = dmgAnimForMe.amount
    let percent = 0
    if (enemyInPreviousMsg) {
      enemyInPreviousMsg.health += amt
      if (enemyInPreviousMsg.health < 1) {
        percent = 0
      } else {
        percent = 100 * (enemyInPreviousMsg.health / enemyInPreviousMsg.maxHealth)
      }
    }
    if (heroInPreviousMsg) {
      heroInPreviousMsg.health += amt
      if (heroInPreviousMsg.health < 1) {
        percent = 0
      } else {
        percent = 100 * (heroInPreviousMsg.health / heroInPreviousMsg.maxHealth)
      }
    }
    // percent = Math.floor(percent)
    healthBarHealth.style.width = `${percent}%`
    if (currentAnim.behavior.kind == 'melee') {
      await Ui.waitAnimStep('halfStrike')
      await Ui.waitAnimStep('halfStrike')
    } else {
      await Ui.waitAnimStep('seeResult')
    }

  })

  let onRemoveBattleBar = () => {
    removeHealthListener()
    removeHealthLossListener()
    removeHealthGainListener()
  }
  return {
    bars: bars,
    onRemoveBattleBar: onRemoveBattleBar,
  }
}

export function putHero({ playerInClient }: { playerInClient: PlayerInClient }) {
  let unitHolder = createUnitAndArea({ unitId: playerInClient.unitId, team: 'ally' })
  unitHolder.nameTag.textContent = playerInClient.displayName
  unitHolder.heroSprite.src = heroSpriteFromClass(playerInClient.class)

  let battleBar = createBattleBar({ unitId: playerInClient.unitId })
  unitHolder.visualUnitTop.appendChild(battleBar.bars)

  function updateHero() {
    if (!Ui.uiStateYep.lastMsgFromServer) return
    unitHolder.heroSprite.src = heroSpriteFromClass(Ui.uiStateYep.lastMsgFromServer.yourInfo.class)
    unitHolder.nameTag.textContent = Ui.uiStateYep.lastMsgFromServer.yourInfo.displayName
    // unitHolder.visualUnitTop.style.transform = 'none'
    // unitHolder.visualUnitTop.style.transition = 'none'
  }
  let removeUpdateHeroListener = listenBus(uiEvents.rerender, () => {
    updateHero()
  })
  let removeReskinListener = listenBus(uiEvents.animate, async () => {
    let currentAnim = getCurrentAnim()
    if (!currentAnim) return
    if (!currentAnim.takesItem) return
    if (!currentAnim.animateTo) return
    if (currentAnim.source !== playerInClient.unitId) return
    await Ui.waitAnimStep('meleeThere')
    updateHero()
  })


  units1.appendChild(unitHolder.unitAndArea)
  intraSyncUnits.push({
    element: unitHolder.unitAndArea,
    homeArea: unitHolder.homePlaceholder,
    guestArea: unitHolder.guestArea,
    unitId: playerInClient.unitId,
    kind: 'ally'
  })
}

export function getCurrentAnim(): BattleAnimation | undefined {
  if (!Ui.uiStateYep.lastMsgFromServer) return undefined
  let currentAnim = Ui.uiStateYep.lastMsgFromServer.animations.at(Ui.uiStateYep.currentAnimIndex)
  if (!currentAnim) return undefined
  return currentAnim
}

export function putEnemy({ enemyInClient }: { enemyInClient: EnemyInClient }) {
  let unitHolder = createUnitAndArea({ unitId: enemyInClient.unitId, team: 'enemy' })
  unitHolder.nameTag.textContent = enemyInClient.displayName
  unitHolder.heroSprite.src = enemySprites[enemyInClient.template.id]
  unitHolder.heroSprite.style.transform = 'scaleX(-1)'
  unitHolder.homePlaceholder.style.order = '1'

  let battleBar = createBattleBar({ unitId: enemyInClient.unitId })
  unitHolder.visualUnitTop.appendChild(battleBar.bars)

  let aggroBar = document.createElement('div')
  aggroBar.style.height = '50%';
  aggroBar.style.borderRadius = '5px';
  aggroBar.style.backgroundColor = 'black';
  aggroBar.style.width = '85%';
  aggroBar.style.border = '2px solid black';
  battleBar.bars.appendChild(aggroBar)

  function getMyAggro() {
    if (!Ui.uiStateYep.lastMsgFromServer) return 0
    let vu = Ui.uiStateYep.lastMsgFromServer.enemiesInScene.find(e => e.unitId == enemyInClient.unitId)
    if (!vu) return 0
    return vu.myAggro
  }
  let aggro = document.createElement('div')
  aggro.style.width = `${getMyAggro()}%`
  aggro.style.backgroundColor = 'purple';
  aggro.style.transition = 'width 0.2s ease-in-out';
  aggro.style.height = '100%';
  aggroBar.appendChild(aggro)
  let removeAggroListener = listenBus(uiEvents.rerender, () => {
    aggro.style.width = `${getMyAggro()}%`
  })

  let removeAnimateAggroListener = listenBus(uiEvents.animate, async () => {
    let anim = getCurrentAnim()
    if (!anim) return
    if (anim.noResetAggro) return
    if (anim.source != enemyInClient.unitId) return
    aggro.style.width = `0%`
  })

  let removeDieListener = listenBus(uiEvents.animate, async () => {
    let anim = getCurrentAnim()
    if (!anim) return
    if (!anim.alsoDamages) return
    let meDamaged = anim.alsoDamages.find(d => d.target == enemyInClient.unitId)
    if (!meDamaged) return
    if (!meDamaged.causedDeath) return
    if (anim.behavior.kind == 'melee') {
      await Ui.waitAnimStep("meleeThere")
    }
    if (anim.behavior.kind == 'center') {
      await Ui.waitAnimStep("toCenter")
    }
    for (let _ of meDamaged.amount) {
      if (anim.behavior.kind == "missile") {
        await Ui.waitAnimStep("missile")
      }
      if (anim.behavior.kind == 'melee') {
        await Ui.waitAnimStep('halfStrike')
      }
    }
    unitHolder.visualUnitTop.style.transition = 'opacity 0.5s ease-in-out'
    unitHolder.visualUnitTop.style.opacity = '0'
  })

  let updateOrRemoveUnit = () => {
    if (!Ui.uiStateYep.lastMsgFromServer) return
    let enemy = Ui.uiStateYep.lastMsgFromServer.enemiesInScene.find(eic => eic.unitId == enemyInClient.unitId)
    if (enemy) {
      unitHolder.heroSprite.src = enemySprites[enemy.template.id]
      unitHolder.nameTag.textContent = enemy.displayName
      return
    }
    removeDieListener()
    removeUpdateUnitListener()
    removeAnimateAggroListener()
    battleBar.onRemoveBattleBar()
    removeAggroListener()
    unitHolder.unitAndArea.remove()
    unitHolder.onRemove()
    intraSyncUnits = intraSyncUnits.filter(ue => ue.unitId != enemyInClient.unitId)
  }
  let removeUpdateUnitListener = listenBus(uiEvents.rerender, () => {
    updateOrRemoveUnit()
  })
  units2.appendChild(unitHolder.unitAndArea)
  intraSyncUnits.push({
    element: unitHolder.unitAndArea,
    guestArea: unitHolder.guestArea,
    homeArea: unitHolder.homePlaceholder,
    unitId: enemyInClient.unitId,
    kind: 'enemy'
  })
}

export function putVas(arg: { uiVas: Logic.VisualActionSourceInClient }) {
  let unitHolder = createUnitAndArea({ unitId: arg.uiVas.id, team: 'vas' })
  unitHolder.heroSprite.style.transform = 'scaleX(-1)'
  unitHolder.heroSprite.src = anySprites[arg.uiVas.sprite]
  unitHolder.nameTag.textContent = arg.uiVas.displayName
  unitHolder.homePlaceholder.style.order = '1'
  unitHolder.visualUnitTop.style.opacity = '0'
    ; (async () => {
      await Ui.nextAnimFrame()
      unitHolder.visualUnitTop.style.transition = 'opacity 300ms ease-in'
      unitHolder.visualUnitTop.style.opacity = '1'
    })()
  units2.appendChild(unitHolder.unitAndArea)


  intraSyncUnits.push({
    element: unitHolder.unitAndArea,
    guestArea: unitHolder.guestArea,
    homeArea: unitHolder.homePlaceholder,
    unitId: arg.uiVas.id,
    kind: 'vas'
  })

  function updateOrRemoveVas() {
    let vas = Ui.vasesToShow2().find(vas => vas.id == arg.uiVas.id)
    if (vas) {
      unitHolder.heroSprite.src = anySprites[vas.sprite]
      unitHolder.nameTag.textContent = vas.displayName
    } else {
      removeUpdateListener()
      removePickedUpListener()
      unitHolder.onRemove()
      unitHolder.unitAndArea.remove()
      intraSyncUnits = intraSyncUnits.filter(ve => ve.unitId != arg.uiVas.id)
    }
  }
  let removeUpdateListener = listenBus(uiEvents.rerender, () => {
    updateOrRemoveVas()
  })

  // Item dissapears when picked up
  let removePickedUpListener = listenBus(uiEvents.animate, async () => {
    let currentAnim = getCurrentAnim()
    if (!currentAnim) return
    if (!currentAnim.takesItem) return
    if (!currentAnim.animateTo) return
    if (currentAnim.animateTo !== arg.uiVas.id) return
    await Ui.waitAnimStep('meleeThere')
    unitHolder.visualUnitTop.style.transition = 'opacity 300ms ease-in'
    unitHolder.visualUnitTop.style.opacity = '0'
    await Ui.waitAnimStep('seeResult')
    Ui.changeVasLocked(arg.uiVas.id, false)
    updateOrRemoveVas()
  })
}

let centerPlaceHolder = document.createElement('div')
centerPlaceHolder.style.height = 'clamp(25px, 5vw + 1px, 50px)'
centerPlaceHolder.style.width = 'clamp(25px, 5vw + 1px, 50px)'
centerPlaceHolder.style.position = 'absolute'
centerPlaceHolder.style.top = '50%'
centerPlaceHolder.style.left = '50%'
// centerPlaceHolder.style.backgroundColor = 'blue'
visual.appendChild(centerPlaceHolder)

// animate missle
listenBus(uiEvents.animate, async () => {
  let anim = getCurrentAnim()
  if (!anim) return
  if (anim.behavior.kind != 'missile') return
  let sourceElem = intraSyncUnits.find(ue => ue.unitId == anim.source)
  if (!sourceElem) return
  if (!anim.animateTo) return
  let destination = intraSyncUnits.find(ue => ue.unitId == anim.animateTo)
  if (!destination) return

  let missileFlights = 1
  if (anim.alsoDamages) {
    let missileStrikes = anim.alsoDamages.at(0)?.amount.length
    if (missileStrikes) {
      missileFlights = missileStrikes
    }
  }

  for (let i = 0; i < missileFlights; i++) {
    let missleElement = document.createElement('img')
    missleElement.style.height = '30%'
    // missleElement.style.backgroundColor = 'purple'
    // missleElement.style.position = 'absolute'
    missleElement.style.marginTop = '40%'
    missleElement.src = anySprites[anim.behavior.extraSprite]
    sourceElem.guestArea.appendChild(missleElement)

    await Ui.nextAnimFrame()

    const destRect = destination.homeArea.getBoundingClientRect()
    let topDest = destRect.top + (destRect.height / 2.5)
    const { top: top2, left: left2 } = missleElement.getBoundingClientRect()
    let topDiff = topDest - top2
    let leftDiff = destRect.left - left2
    missleElement.style.transition = `transform ${Ui.animationDurations.missile}ms linear`;
    missleElement.style.transform = `translateX(${leftDiff}px) translateY(${topDiff}px)`
    await Ui.waitAnimStep('missile')

    missleElement.remove()
  }
})
// animate center
listenBus(uiEvents.animate, async () => {
  let anim = getCurrentAnim()
  if (!anim) return
  if (anim.behavior.kind != 'center') return
  let sourceElem = intraSyncUnits.find(ue => ue.unitId == anim.source)
  if (!sourceElem) return
  let destination = centerPlaceHolder
  let animatingToCenter = document.createElement('img')
  animatingToCenter.style.height = '30%'
  // centeringElement.style.position = 'absolute'
  // animatingToCenter.style.top = '40%'
  animatingToCenter.style.marginTop = '50%'
  animatingToCenter.src = anySprites[anim.behavior.extraSprite]
  sourceElem.guestArea.appendChild(animatingToCenter)

  await Ui.nextAnimFrame()

  const { top: top1, left: left1 } = destination.getBoundingClientRect()
  const { top: top2, left: left2 } = animatingToCenter.getBoundingClientRect()
  let topDiff = top1 - top2
  let leftDiff = left1 - left2
  animatingToCenter.style.transition = `transform ${Ui.animationDurations.toCenter}ms linear`;
  animatingToCenter.style.transform = `translateX(${leftDiff}px) translateY(${topDiff}px)`
  await Ui.waitAnimStep('toCenter')

  animatingToCenter.remove()
})

let applyUnitsStyle = (units: HTMLDivElement) => {
  units.style.display = 'grid'
  units.style.rowGap = '2px'
  units.style.gridTemplateColumns = 'repeat(auto-fit, clamp(120px, 50%, 200px))'
  units.style.justifyContent = 'center'
  units.style.zIndex = '1'
}


export let units1 = document.createElement('div')
applyUnitsStyle(units1)
units1.style.position = 'relative'
visual.appendChild(units1)

let units2 = document.createElement('div')
applyUnitsStyle(units2)
visual.appendChild(units2)

listenBus(uiEvents.rerender, () => {
  for (let uiVas of Ui.vasesToShow2()) {
    if (!intraSyncUnits.some(ue => ue.unitId == uiVas.id)) {
      putVas({ uiVas: uiVas })
    }
  }
})

listenBus(uiEvents.rerender, () => {
  if (!Ui.uiStateYep.lastMsgFromServer) return
  for (let enemy of Ui.uiStateYep.lastMsgFromServer.enemiesInScene) {
    if (!intraSyncUnits.some(ue => ue.unitId == enemy.unitId)) {
      putEnemy({ enemyInClient: enemy })
    }
  }
})

let selectedDetails = document.createElement('div')
selectedDetails.style.backgroundRepeat = 'no-repeat';
selectedDetails.style.backgroundSize = 'calc(max(100%, 700px)) 100%';
selectedDetails.style.backgroundPosition = 'left top';
selectedDetails.style.display = 'flex';
selectedDetails.style.position = 'relative';
selectedDetails.style.height = '30svh';
selectedDetails.style.backgroundImage = `url(${sidebar})`
document.body.appendChild(selectedDetails)

let selectedPortrait = document.createElement('div')
selectedPortrait.style.backgroundImage = `url(${minimap})`
selectedPortrait.style.backgroundRepeat = 'no-repeat';
selectedPortrait.style.backgroundSize = '100% 100%';
selectedPortrait.style.minWidth = '100px';
selectedPortrait.style.flexBasis = '15%';
selectedPortrait.style.display = 'flex';
selectedPortrait.style.flexDirection = 'column';
selectedPortrait.style.height = '100%';
selectedPortrait.style.justifyContent = 'flex-start';
selectedPortrait.style.overflow = 'hidden';
selectedDetails.appendChild(selectedPortrait)

let portrait = document.createElement('div')
portrait.style.flexShrink = '1';
portrait.style.flexGrow = '1';
portrait.style.overflow = 'hidden';
portrait.style.display = 'block';
portrait.style.height = '10svh';
portrait.style.paddingTop = '4px';
portrait.style.paddingInline = '4px';
portrait.addEventListener('click', () => {
  if (!Ui.uiStateYep.lastUnitClicked) return
  let vasPortraitClicked = Ui.vasesToShow2().find(vas => vas.id == Ui.uiStateYep.lastUnitClicked)
  if (!vasPortraitClicked) return
  Ui.resetSceneConvos(vasPortraitClicked.scene);
  Ui.ensureSelectedUnit()
  dispatchBus(uiEvents.rerender)
})
selectedPortrait.appendChild(portrait)

let portraitImg = document.createElement('img')
portraitImg.draggable = false
portraitImg.style.display = 'block';
portraitImg.style.height = '100%';
portraitImg.style.width = '100%';
portraitImg.style.objectFit = 'cover';
portrait.appendChild(portraitImg)
listenBus(uiEvents.rerender, () => {
  if (!Ui.uiStateYep.lastUnitClicked) return
  if (!Ui.uiStateYep.lastMsgFromServer) return
  if (Ui.uiStateYep.lastUnitClicked == Ui.uiStateYep.lastMsgFromServer.yourInfo.unitId) {
    underPortrait.textContent = Ui.uiStateYep.lastMsgFromServer.yourInfo.displayName
    portraitImg.src = getHeroPortrait(Ui.uiStateYep.lastMsgFromServer.yourInfo.class)
    return
  }
  let vas = Ui.uiStateYep.lastMsgFromServer.visualActionSources.find(vas => vas.id == Ui.uiStateYep.lastUnitClicked)
  if (vas) {
    underPortrait.textContent = vas.displayName
    if (vas.portrait) {
      portraitImg.src = getPortrait(vas.portrait)
      return
    }
    portraitImg.src = anySprites[vas.sprite]
    return
  }
  let enemy = Ui.uiStateYep.lastMsgFromServer.enemiesInScene.find(e => e.unitId == Ui.uiStateYep.lastUnitClicked)
  if (enemy) {
    underPortrait.textContent = enemy.displayName
    if (enemy.template.portrait) {
      portraitImg.src = getPortrait(enemy.template.portrait)
    } else {
      portraitImg.src = enemySprites[enemy.template.id]
    }
  }
})

let underPortrait = document.createElement('div')
underPortrait.style.textAlign = 'center';
underPortrait.style.whiteSpace = 'nowrap';
underPortrait.style.display = 'flex';
underPortrait.style.justifyContent = 'center';
underPortrait.style.alignItems = 'center';
underPortrait.style.height = '4svh';
underPortrait.style.zIndex = '2';
underPortrait.style.color = 'white';
underPortrait.style.borderTop = 'none';
underPortrait.style.overflowWrap = 'break-word';
selectedPortrait.appendChild(underPortrait)

let selectedRest = document.createElement('div')
// selectedRest.style.flexBasis = '85%';
selectedRest.style.display = 'flex'
// selectedRest.style.gap = '10px'
selectedRest.style.height = '100%'
// selectedRest.style.padding = '10px';
// selectedDetails.appendChild(selectedRest)

let selectedStats = document.createElement('div')
selectedStats.style.overflowY = 'auto'
// selectedStats.style.minWidth = '20vw'
selectedStats.style.borderLeft = 'none'
selectedStats.style.color = 'white'
selectedDetails.appendChild(selectedStats)
function updateSelectedStats() {
  selectedStats.replaceChildren()
  if (!Ui.uiStateYep.lastMsgFromServer) return
  let enemy = Ui.uiStateYep.lastMsgFromServer.enemiesInScene.find(e => e.unitId == Ui.uiStateYep.lastUnitClicked)
  let me = undefined
  if (Ui.uiStateYep.lastUnitClicked == Ui.uiStateYep.lastMsgFromServer.yourInfo.unitId) {
    me = Ui.uiStateYep.lastMsgFromServer.yourInfo
  }
  if (!me && !enemy) return
  let ent: EnemyInClient | PlayerInClient | undefined = undefined
  let str = 0
  let agi = 0
  let mind = 0
  let aggGain = 0
  let bonusStr = ''
  let bonusAgi = ''
  let bonusMind = ''
  if (me) {
    ent = me
    str = me.strength
    agi = me.agility
    mind = me.mind
  }
  if (enemy) {
    ent = enemy
    str = enemy.template.strength
    agi = enemy.template.agility
    mind = enemy.template.mind
    aggGain = enemy.template.aggroGain
  }
  if (!ent) return
  bonusStr = ent.bonusStats.strength ? ` +${ent.bonusStats.strength}` : ''
  bonusAgi = ent.bonusStats.agility ? ` +${ent.bonusStats.agility}` : ''
  bonusMind = ent.bonusStats.mind ? ` +${ent.bonusStats.mind}` : ''

  let top = document.createElement('div')
  top.style.padding = '10px'
  top.style.display = 'flex'
  top.style.flexDirection = 'column'
  selectedStats.appendChild(top)

  let classTitle = document.createElement('div')
  classTitle.innerText = enemy ? enemy.template.id : me!.class
  classTitle.style.fontWeight = 'bold'
  top.appendChild(classTitle)

  function statLineStyle(el: HTMLElement) {
    el.style.display = 'inline-flex';
    el.style.gap = '5px';
    el.style.paddingRight = '5px';
    el.style.flexDirection = 'row';
  }
  let statLineHealth = document.createElement('div')
  statLineStyle(statLineHealth)
  top.appendChild(statLineHealth)

  let heartImg = document.createElement('img')
  heartImg.src = heart
  statLineHealth.appendChild(heartImg)

  let healthDisplay = document.createElement('div')
  healthDisplay.innerText = `${ent.maxHealth}`
  statLineHealth.appendChild(healthDisplay)

  if (str > 0 || bonusStr.length) {
    let statLineStrength = document.createElement('div')
    statLineStyle(statLineStrength)
    top.appendChild(statLineStrength)

    let strImg = document.createElement('img')
    strImg.src = arm
    statLineStrength.appendChild(strImg)

    let strDisplay = document.createElement('div')
    strDisplay.textContent = `${str}${bonusStr}`
    statLineStrength.appendChild(strDisplay)
  }
  if (agi > 0 || bonusAgi.length) {
    let statLineAgi = document.createElement('div')
    statLineStyle(statLineAgi)
    top.appendChild(statLineAgi)

    let agiImg = document.createElement('img')
    agiImg.src = foot
    statLineAgi.appendChild(agiImg)

    let agiDisplay = document.createElement('div')
    agiDisplay.textContent = `${agi}${bonusAgi}`
    statLineAgi.appendChild(agiDisplay)
  }
  if (mind > 0 || bonusMind.length) {
    let statLineMind = document.createElement('div')
    statLineStyle(statLineMind)
    top.appendChild(statLineMind)

    let mindImg = document.createElement('img')
    mindImg.src = brain
    statLineMind.appendChild(mindImg)

    let mindDisplay = document.createElement('div')
    mindDisplay.textContent = `${mind}${bonusMind}`
    statLineMind.appendChild(mindDisplay)
  }
  if (enemy) {
    let statLineAggroGain = document.createElement('div')
    statLineStyle(statLineAggroGain)
    top.appendChild(statLineAggroGain)

    let aggroGainImg = document.createElement('img')
    aggroGainImg.src = teeth
    statLineAggroGain.appendChild(aggroGainImg)

    let aggroGainDisplay = document.createElement('div')
    aggroGainDisplay.textContent = `${aggGain}`
    statLineAggroGain.appendChild(aggroGainDisplay)
  }
  for (let i of ent.inventory) {
    if (i.stats.excludeFromDetail) continue
    let itemStatTop = document.createElement('div')
    itemStatTop.style.display = 'block'
    top.appendChild(itemStatTop)

    let title = document.createElement('div')
    title.innerText = i.stats.id
    title.style.display = 'block'
    title.style.fontWeight = 'bold'
    title.style.marginLeft = '3px'
    top.appendChild(title)

    let stats = document.createElement('div')
    stats.style.display = 'inline-flex'
    stats.style.flexDirection = 'column'
    top.appendChild(stats)
    if (i.stats.damageReduction) {
      let lightArmorStatline = document.createElement('div')
      statLineStyle(lightArmorStatline)
      stats.appendChild(lightArmorStatline)

      let lightArmorImg = document.createElement('img')
      lightArmorImg.src = lightShield
      lightArmorStatline.appendChild(lightArmorImg)

      let lightArmorNum = document.createElement('div')
      lightArmorNum.innerText = `${i.stats.damageReduction}`
      lightArmorStatline.appendChild(lightArmorNum)
    }
    if (i.stats.damageLimit) {
      let heavyArmorStatline = document.createElement('div')
      statLineStyle(heavyArmorStatline)
      stats.appendChild(heavyArmorStatline)

      let heavyArmorImg = document.createElement('img')
      heavyArmorImg.src = heavyShield
      heavyArmorStatline.appendChild(heavyArmorImg)

      let heavyArmorNum = document.createElement('div')
      heavyArmorNum.innerText = `${i.stats.damageLimit}`
      heavyArmorStatline.appendChild(heavyArmorNum)
    }
    if (i.stats.damages) {
      let damagesStatline = document.createElement('div')
      statLineStyle(damagesStatline)
      stats.appendChild(damagesStatline)

      let damagesImg = document.createElement('img')
      damagesImg.src = sword
      damagesStatline.appendChild(damagesImg)

      let damagesNum = document.createElement('div')
      damagesNum.innerText = `${i.stats.damages.baseDmg}`
      damagesStatline.appendChild(damagesNum)
    }
    if (i.stats.damages && i.stats.damages.strikes > 1) {
      let strikesStatline = document.createElement('div')
      statLineStyle(strikesStatline)
      stats.appendChild(strikesStatline)

      let strikesImg = document.createElement('img')
      strikesImg.src = arrows
      strikesStatline.appendChild(strikesImg)

      let damagesNum = document.createElement('div')
      damagesNum.innerText = `${i.stats.damages.strikes}`
      strikesStatline.appendChild(damagesNum)
    }
    if (i.stats.speed && i.stats.speed > 0) {
      let speedStatline = document.createElement('div')
      statLineStyle(speedStatline)
      stats.appendChild(speedStatline)

      let speedImg = document.createElement('img')
      speedImg.src = footy
      speedStatline.appendChild(speedImg)

      let speedNum = document.createElement('div')
      speedNum.innerText = `${i.stats.speed}`
      speedStatline.appendChild(speedNum)
    }

  }
}
listenBus(uiEvents.rerender, () => {
  updateSelectedStats()
})

let vasdPromptAndButtons = document.createElement('div')
vasdPromptAndButtons.style.height = '100%';
vasdPromptAndButtons.style.display = 'flex';
vasdPromptAndButtons.style.flexDirection = 'column';
vasdPromptAndButtons.style.gap = '10px'
vasdPromptAndButtons.style.color = 'white';
vasdPromptAndButtons.style.overflowY = 'auto';
vasdPromptAndButtons.style.borderLeft = 'none';
vasdPromptAndButtons.style.padding = '10px'
listenBus(uiEvents.rerender, () => {
  let vasState = Ui.selectedVisualActionSourceState2()
  if (!vasState) {
    vasdPromptAndButtons.remove()
    return
  }
  selectedDetails.appendChild(vasdPromptAndButtons)
})

let vasdPrompt = document.createElement('div')
vasdPrompt.style.whiteSpace = 'pre-wrap';
vasdPrompt.style.lineHeight = '17px';
vasdPromptAndButtons.appendChild(vasdPrompt)
function refreshPrompt() {
  let vasState = Ui.selectedVisualActionSourceState2()
  if (!vasState) return
  vasdPrompt.textContent = vasState.currentRetort
}
listenBus(uiEvents.rerender, () => {
  refreshPrompt()
})

let vasButtons = document.createElement('div')
vasButtons.style.display = 'flex';
vasButtons.style.flexWrap = 'wrap';
vasButtons.style.gap = '5px';
vasdPromptAndButtons.appendChild(vasButtons)
listenBus(uiEvents.rerender, () => {
  updateVasButtons()
})

let devActions = document.createElement('div')
devActions.style.zIndex = '999'
listenBus(uiEvents.rerender, () => {
  if (!Ui.uiStateYep.lastMsgFromServer) return
  devActions.replaceChildren()
  devActions.remove()
  if (Ui.uiStateYep.lastMsgFromServer.devActions.length < 1) return
  for (let devAction of Ui.uiStateYep.lastMsgFromServer.devActions) {
    let devActionButton = document.createElement('button')
    devActionButton.textContent = devAction.buttonText
    devActionButton.addEventListener('click', () => {
      Ui.choose(devAction)
      dispatchBus(uiEvents.rerender)
    })
    devActions.appendChild(devActionButton)
  }
  visual.appendChild(devActions)
})

function updateVasButtons() {
  if (!Ui.uiStateYep.lastUnitClicked) return
  if (!Ui.uiStateYep.lastMsgFromServer) return
  let vas = Ui.uiStateYep.lastMsgFromServer.visualActionSources.find(vas => vas.id == Ui.uiStateYep.lastUnitClicked)
  if (!vas) return
  vasButtons.replaceChildren()
  function vasButtonStyle(element: HTMLElement) {
    element.style.paddingInline = '0.7em';
    element.style.paddingBlock = '0.6em';
    element.style.border = 'none';
    element.style.borderRadius = '1px';
    element.style.color = 'white';
    element.style.backgroundColor = 'brown';
  }
  let actionsForSelectedVas = Ui.uiStateYep.lastMsgFromServer.vasActions.filter((va) => va.associateWithUnit == Ui.uiStateYep.lastUnitClicked);
  for (let gastc of actionsForSelectedVas) {
    let vasActionButton = document.createElement('button')
    vasButtonStyle(vasActionButton)
    vasActionButton.textContent = gastc.buttonText
    vasActionButton.addEventListener('click', () => {
      Ui.choose(gastc)
    })
    vasButtons.appendChild(vasActionButton)
  }
  for (let convoResponse of Ui.selectedVasResponsesToShow2()) {
    let vasResponseButton = document.createElement('button')
    vasButtonStyle(vasResponseButton)
    vasResponseButton.textContent = convoResponse.responseText
    vasResponseButton.addEventListener('click', () => {
      Ui.chooseVasResponse(convoResponse)
      Ui.ensureSelectedUnit()
      dispatchBus(uiEvents.rerender)
    })
    vasButtons.appendChild(vasResponseButton)
  }
}
let itemSlotButtons = document.createElement('div')
itemSlotButtons.style.paddingTop = '10px'
listenBus(uiEvents.rerender, () => {
  refreshItemSlotButtons()
})
listenBus(uiEvents.animate, () => {
  refreshItemSlotButtons()
})
function refreshItemSlotButtons() {
  if (!Ui.uiStateYep.lastUnitClicked) return
  if (!Ui.uiStateYep.lastMsgFromServer) return

  let meSelected = Ui.uiStateYep.lastMsgFromServer?.yourInfo.unitId == Ui.uiStateYep.lastUnitClicked
  let enemy = Ui.uiStateYep.lastMsgFromServer?.enemiesInScene.find(vup => vup.unitId == Ui.uiStateYep.lastUnitClicked)
  if (!enemy && !meSelected) {
    itemSlotButtons.remove()
    return
  }
  selectedDetails.appendChild(itemSlotButtons)
  itemSlotButtons.replaceChildren()
  for (let value of Ui.typedInventory()) {
    let slotButton = document.createElement('button')
    slotButton.style.position = 'relative';
    slotButton.style.border = 'none';
    slotButton.style.background = 'none';
    slotButton.style.cursor = 'pointer';
    let actionsAssociatedWithSelected = Ui.uiStateYep.lastMsgFromServer!.itemActions.filter((a) => a.associateWithUnit == Ui.uiStateYep.lastUnitClicked)
    let gastc = actionsAssociatedWithSelected.find(a => a.itemId == value.itemState.stats.id)
    slotButton.addEventListener('click', () => {
      if (value.acts.length == 1) {
        let firstAct = value.acts.at(0)
        if (firstAct) {
          Ui.choose(firstAct)
          return
        }
      }
      if (gastc) {
        Ui.choose(gastc)
        return
      }
    })
    itemSlotButtons.appendChild(slotButton)

    let slotImg = document.createElement('img')
    slotImg.draggable = false
    slotImg.src = value.img
    slotImg.style.display = 'block';
    slotImg.style.borderRadius = '10px';
    if (value.disabled || (!gastc && value.acts.length != 1)) {
      slotImg.style.opacity = '0.5'
    }
    slotButton.appendChild(slotImg)

    let slotCounter = document.createElement('span')
    slotCounter.style.position = 'absolute'
    slotCounter.style.top = '50%'
    slotCounter.style.left = '50%'
    slotCounter.style.transform = 'translate(-50%, -50%)'
    slotCounter.style.textAlign = 'center'
    slotCounter.style.fontSize = '30px'
    slotCounter.style.zIndex = '2'
    slotCounter.style.color = 'wheat'
    slotCounter.innerText = value.overlayNumber ?? ''
    slotButton.appendChild(slotCounter)

    let slotStockDots = document.createElement('span')
    slotStockDots.style.zIndex = '2'
    slotStockDots.style.color = 'white'
    slotStockDots.style.position = 'absolute'
    slotStockDots.style.top = '0'
    slotStockDots.style.left = '3px'
    slotStockDots.style.fontSize = '30px'
    slotStockDots.style.fontWeight = 'bold'
    slotStockDots.style.lineHeight = '1px'
    slotStockDots.innerText = value.dots
    slotButton.appendChild(slotStockDots)
  }
}

let added = addNewUser("You")
if (added) {
  // changeScene(added.player, 'soloTrain3')
  // equipItem(added.player, 'bomb')
  // equipItem(added.player, 'club')
  // equipItem(added.player, 'thiefCloak')
  // added.player.flags.add('killedGoblins')
  updatePlayerActions(added.player)
  let msg = buildNextMessage(added.player, added.player.unitId)
  Ui.uiStateYep.lastMsgFromServer = msg
  putHero({ playerInClient: msg.yourInfo })
  Ui.syncVisualsToMsg()
  Ui.ensureSelectedUnit()
  dispatchBus(uiEvents.rerender)
}


