import './style.css'
import * as Ui from './ui'
import * as Logic from './logic'
import { addNewUser, users, type PlayerCommonStats, type PlayerInClient } from './users'
import { buildNextMessage, type MessageFromServer } from './messaging'
import { changeScene, updatePlayerActions, type VisualActionSourceInClient } from './logic'
import { anySprites, enemySprites, getHeroPortrait, getLandscape, getPortrait, heroSpriteFromClass } from './assets'
import type { HeroId, UnitId, VisualActionSourceId } from './utils'
import sidebar from './assets/ui/sidebar.png'
import minimap from './assets/ui/minimap.png'

document.querySelector<HTMLDivElement>('#loading')!.remove()

export const bus = new EventTarget();
export function listenBus(fire: (uiEvent: UIEvent) => void): () => void {
  let listener = (event: Event) => {
    const customEvent = event as CustomEvent<UIEvent>;
    let msg: UIEvent = customEvent.detail
    fire(msg)
  }
  bus.addEventListener('bus', listener)
  return () => {
    bus.removeEventListener('bus', listener)
  }
}
export function dispatchBus(arg: { uiEvent: UIEvent }) {
  bus.dispatchEvent(new CustomEvent('bus', {
    detail: arg.uiEvent
  }))
}

export type UIEvent = {
  kind: 'visual-thing-selected'
  unitId: UnitId
} | {
  kind: 'scene-reset' | 'ping' | 'response-chosen' | 'rerender'
}

export let unitElements: { element: HTMLElement, unitId: UnitId }[] = []
export let vasElements: { element: HTMLElement, vasId: VisualActionSourceId }[] = []


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
listenBus((uiEvent) => {
  if (uiEvent.kind != 'ping') return
  if (!Ui.uiStateYep.lastMsgFromServer) return
  yourSceneLabel.textContent = Ui.uiStateYep.lastMsgFromServer.yourInfo.currentSceneDisplay
})
wrapGameField.appendChild(yourSceneLabel)

let visual = document.createElement('div')
visual.style.position = 'relative'
visual.style.transition = 'opacity 0.6s ease-in-out'
visual.style.backgroundColor = 'black'
visual.style.display = 'grid'
visual.style.columnGap = '1px'
visual.style.gridTemplateColumns = '1fr 1fr'
visual.style.justifyContent = 'center'
visual.style.alignItems = 'center'
visual.style.height = 'max-content'
visual.style.minHeight = '100%'
wrapGameField.appendChild(visual)

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
listenBus((uiEvent) => {
  if (uiEvent.kind != 'ping') return
  if (!Ui.uiStateYep.lastMsgFromServer?.landscape) return
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

let applyUnitsStyle = (units: HTMLDivElement) => {
  units.style.display = 'grid'
  units.style.rowGap = '2px'
  units.style.gridTemplateColumns = 'repeat(auto-fit, clamp(120px, 50%, 200px))'
  units.style.justifyContent = 'center'
  units.style.zIndex = '1'
}


export let units1 = document.createElement('div')
applyUnitsStyle(units1)
visual.appendChild(units1)
listenBus((uiEvent) => {
  if (uiEvent.kind != 'ping') return
  if(!Ui.uiStateYep.lastMsgFromServer)return
  let playerElement = unitElements.find(ue=>ue.unitId == Ui.uiStateYep.lastMsgFromServer!.yourInfo.unitId)  
  if(!playerElement){
    putUnit({vup:{kind:'player',entity:Ui.uiStateYep.lastMsgFromServer!.yourInfo}})
  }
  for (let vup of Ui.uiStateYep.lastMsgFromServer.enemiesInScene) {
    if (!unitElements.some(ue => ue.unitId == vup.unitId)) {
      putUnit({ vup: {kind:'enemy',entity:vup} })
    }
  }
})

function createUnitAndArea(arg: { unitId: UnitId }): { unitAndArea: HTMLElement, heroSprite: HTMLImageElement, nameTag: HTMLElement, homePlaceholder: HTMLElement, onRemove: () => void, visualUnitTop: HTMLElement } {
  let unitAndArea = document.createElement('div')
  unitAndArea.style.display = 'flex'
  unitAndArea.style.flexDirection = 'row'


  let homePlaceholder = document.createElement('div')
  // homePlaceholder.style.order = '1'
  homePlaceholder.style.border = '2px dashed transparent'
  homePlaceholder.style.borderRadius = '10px'
  homePlaceholder.style.width = '50%'
  homePlaceholder.style.height = 'auto'
  unitAndArea.appendChild(homePlaceholder)

  let visualUnitTop = document.createElement('div')
  visualUnitTop.style.transition = 'opacity 0.5s ease-in-out'
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

  let heroSprite = document.createElement('img')
  heroSprite.style.display = 'block'
  heroSprite.style.width = '100%'
  heroSprite.style.aspectRatio = '1/1'
  // heroSprite.src = bowman
  outerHeroSprite.appendChild(heroSprite)
  heroSprite.draggable = false

  let guestAreaPlaceholder = document.createElement('div')
  guestAreaPlaceholder.style.zIndex = '2'
  guestAreaPlaceholder.style.position = 'relative'
  guestAreaPlaceholder.style.border = '2px dashed transparent'
  guestAreaPlaceholder.style.borderRadius = '10px'
  guestAreaPlaceholder.style.width = '50%'
  guestAreaPlaceholder.style.height = 'auto'
  unitAndArea.appendChild(guestAreaPlaceholder)
  function indicateSelected() {
    if (!Ui.uiStateYep.lastUnitClicked) return
    if (Ui.uiStateYep.lastUnitClicked == arg.unitId) {
      homePlaceholder.style.boxShadow = '0 0 20px rgb(0, 0, 0, 0.4)';
    } else {
      homePlaceholder.style.boxShadow = 'none'
    }
  }
  indicateSelected()
  let onRemove = listenBus((uiEvent) => {
    indicateSelected()
  })

  homePlaceholder.addEventListener('click', () => {
    Ui.uiStateYep.lastUnitClicked = arg.unitId
    dispatchBus({ uiEvent: { kind: 'ping' } })
  })

  return { unitAndArea: unitAndArea, heroSprite: heroSprite, nameTag: nameTag, homePlaceholder: homePlaceholder, onRemove: onRemove, visualUnitTop: visualUnitTop }
}

export function putUnit(arg: { vup: Ui.HeroOrEnemy }) {
  let unitHolder = createUnitAndArea({ unitId: arg.vup.entity.unitId })
  if (arg.vup.kind == 'enemy') {
    unitHolder.nameTag.textContent = arg.vup.entity.displayName
    unitHolder.heroSprite.src = enemySprites[arg.vup.entity.template.id]
    unitHolder.heroSprite.style.transform = 'scaleX(-1)'
    unitHolder.homePlaceholder.style.order = '1'
  }
  if (arg.vup.kind == 'player') {
    unitHolder.nameTag.textContent = arg.vup.entity.displayName
    unitHolder.heroSprite.src = heroSpriteFromClass(arg.vup.entity.class)

  }
  

  let bars = document.createElement('div')
  bars.style.height = 'clamp(17px, 1vw + 10px, 30px)';
  bars.style.opacity = '0.7';
  bars.style.display = 'flex';
  bars.style.flexDirection = 'column';
  bars.style.alignItems = 'center';
  unitHolder.visualUnitTop.appendChild(bars)

  let healthBar = document.createElement('div')
  healthBar.style.width = '100%'
  healthBar.style.height = '50%'
  healthBar.style.border = '2px solid black'
  healthBar.style.borderRadius = '5px'
  healthBar.style.backgroundColor = 'black'
  healthBar.style.marginBottom = '1px'
  bars.appendChild(healthBar)

  let healthBarHealth = document.createElement('div')
  function getHpPercent() {
    if (!Ui.uiStateYep.lastMsgFromServer) return
    if (arg.vup.entity.unitId == Ui.uiStateYep.lastMsgFromServer.yourInfo.unitId) {
      if (Ui.uiStateYep.lastMsgFromServer.yourInfo.health > 0) {
        return 100 * (Ui.uiStateYep.lastMsgFromServer.yourInfo.health / Ui.uiStateYep.lastMsgFromServer.yourInfo.maxHealth)
      }
    }
    let vu = Ui.uiStateYep.lastMsgFromServer.enemiesInScene.find(e => e.unitId == arg.vup.entity.unitId)
    if (vu) {
      if (vu.health > 0) {
        return 100 * (vu.health / vu.maxHealth)
      }
    }
    return 0
  }
  healthBarHealth.style.width = `${getHpPercent()}%`
  healthBarHealth.style.borderRadius = '5px'
  healthBarHealth.style.backgroundColor = 'green';
  healthBarHealth.style.transition = 'width 0.2s ease-in-out'
  healthBarHealth.style.height = '100%'
  healthBar.appendChild(healthBarHealth)
  listenBus((uiEvent) => {
    healthBarHealth.style.width = `${getHpPercent()}%`
  })


  let onRemove = () => { }
  let updateOrRemoveUnit = () => {
    if (!Ui.uiStateYep.lastMsgFromServer) return
    if (arg.vup.entity.unitId == Ui.uiStateYep.lastMsgFromServer.yourInfo.unitId) {
      unitHolder.heroSprite.src = heroSpriteFromClass(Ui.uiStateYep.lastMsgFromServer.yourInfo.class)
      unitHolder.nameTag.textContent = Ui.uiStateYep.lastMsgFromServer.yourInfo.displayName
      return
    }
    let enemy = Ui.uiStateYep.lastMsgFromServer.enemiesInScene.find(eic => eic.unitId == arg.vup.entity.unitId)
    if (enemy) {
      unitHolder.heroSprite.src = enemySprites[enemy.template.id]
      unitHolder.nameTag.textContent = enemy.displayName
      return
    }
    onRemove()
    unitHolder.unitAndArea.remove()
    unitHolder.onRemove()
    unitElements = unitElements.filter(ue => ue.unitId != arg.vup.entity.unitId)
  }
  onRemove = listenBus((uiEvent) => {
    updateOrRemoveUnit()
  })
  if (arg.vup.kind == 'enemy') {
    units2.appendChild(unitHolder.unitAndArea)
  }
  if (arg.vup.kind == 'player') {
    units1.appendChild(unitHolder.unitAndArea)
  }
  unitElements.push({ element: unitHolder.unitAndArea, unitId: arg.vup.entity.unitId })
}

export function putVas(arg: { uiVas: Logic.VisualActionSourceInClient }) {
  let unitHolder = createUnitAndArea({ unitId: arg.uiVas.id })
  unitHolder.heroSprite.style.transform = 'scaleX(-1)'
  unitHolder.heroSprite.src = anySprites[arg.uiVas.sprite]
  unitHolder.nameTag.textContent = arg.uiVas.displayName
  unitHolder.homePlaceholder.style.order = '1'
  units2.appendChild(unitHolder.unitAndArea)
  vasElements.push({ element: unitHolder.unitAndArea, vasId: arg.uiVas.id })
  let onRemove = () => { }
  let updateOrRemoveVas = () => {
    let vas = Ui.vasesToShow2().find(vas => vas.id == arg.uiVas.id)
    if (vas) {
      unitHolder.heroSprite.src = anySprites[vas.sprite]
      unitHolder.nameTag.textContent = vas.displayName
    } else {
      onRemove()
      unitHolder.onRemove()
      unitHolder.unitAndArea.remove()
      vasElements = vasElements.filter(ve => ve.vasId != arg.uiVas.id)
    }
  }
  onRemove = listenBus((uiEvent) => {
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

let units2 = document.createElement('div')
// units2.style.backgroundColor = 'red'
applyUnitsStyle(units2)
visual.appendChild(units2)
function putMissingVases() {
  for (let uiVas of Ui.vasesToShow2()) {
    if (!vasElements.some(ue => ue.vasId == uiVas.id)) {
      putVas({ uiVas: uiVas })
    }
  }
}

listenBus((uiEvent) => {
  putMissingVases()
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
  if(!Ui.uiStateYep.lastUnitClicked)return
  let vasPortraitClicked = Ui.vasesToShow2().find(vas=>vas.id == Ui.uiStateYep.lastUnitClicked)
  if(!vasPortraitClicked)return
  Ui.resetSceneConvos(vasPortraitClicked.scene);
  
  let validToBeSelected = Ui.checkSelectedUnitValid()
  if(!validToBeSelected)return
  Ui.uiStateYep.lastUnitClicked = validToBeSelected
  dispatchBus({ uiEvent: { kind: 'ping' }})
})
selectedPortrait.appendChild(portrait)

let portraitImg = document.createElement('img')
portraitImg.draggable = false
portraitImg.style.display = 'block';
portraitImg.style.height = '100%';
portraitImg.style.width = '100%';
portraitImg.style.objectFit = 'cover';
portrait.appendChild(portraitImg)
listenBus((uiEvent) => {
  if (!Ui.uiStateYep.lastUnitClicked) return
  if(!Ui.uiStateYep.lastMsgFromServer) return
  if(Ui.uiStateYep.lastUnitClicked == Ui.uiStateYep.lastMsgFromServer.yourInfo.unitId){
    underPortrait.textContent = Ui.uiStateYep.lastMsgFromServer.yourInfo.displayName
    portraitImg.src = getHeroPortrait(Ui.uiStateYep.lastMsgFromServer.yourInfo.class)
    return
  }
  let vas = Ui.uiStateYep.lastMsgFromServer.visualActionSources.find(vas=>vas.id == Ui.uiStateYep.lastUnitClicked)
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
    if(enemy.template.portrait){
      portraitImg.src = getPortrait(enemy.template.portrait)
    }else{
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
selectedRest.style.flexBasis = '85%';
selectedRest.style.height = '100%';
selectedRest.style.padding = '10px';
selectedDetails.appendChild(selectedRest)

let vasdPromptAndButtons = document.createElement('div')
vasdPromptAndButtons.style.display = 'flex';
vasdPromptAndButtons.style.height = '100%';
vasdPromptAndButtons.style.flexDirection = 'column';
vasdPromptAndButtons.style.color = 'white';
vasdPromptAndButtons.style.overflowY = 'auto';
vasdPromptAndButtons.style.borderLeft = 'none';
selectedRest.appendChild(vasdPromptAndButtons)

let vasdPrompt = document.createElement('div')
vasdPrompt.style.whiteSpace = 'pre-wrap';
vasdPrompt.style.lineHeight = '17px';
function refreshPrompt() {
  vasdPrompt.remove()
  let vasState = Ui.selectedVisualActionSourceState()
  if (!vasState) return
  vasdPrompt.textContent = vasState.currentRetort
  vasdPromptAndButtons.insertAdjacentElement('afterbegin', vasdPrompt)
}
listenBus((uiEvent) => {
  refreshPrompt()
  // if (uiEvent.kind == 'visual-thing-selected' || uiEvent.kind == 'response-chosen') {
  // }
})

let vasdButtons = document.createElement('div')
vasdButtons.style.marginTop = '7px';
vasdButtons.style.display = 'flex';
vasdButtons.style.flexWrap = 'wrap';
vasdButtons.style.gap = '5px';
vasdPromptAndButtons.appendChild(vasdButtons)

function refreshActionButtons() {
  if(!Ui.uiStateYep.lastUnitClicked)return
  if(!Ui.uiStateYep.lastMsgFromServer)return
  vasdButtons.replaceChildren()
  let vas = Ui.visualActionSources.find(vas => vas.id == Ui.uiStateYep.lastUnitClicked)
  // console.log("populate vas actions", vas)
  if (vas) {
    let actionsForSelectedVas = Ui.uiStateYep.lastMsgFromServer.vasActions.filter((va) => va.associateWithUnit == Ui.uiStateYep.lastUnitClicked);
    for (let gastc of actionsForSelectedVas) {
      let vasActionButton = document.createElement('button')
      vasActionButton.style.paddingInline = '0.7em';
      vasActionButton.style.paddingBlock = '0.6em';
      vasActionButton.style.border = 'none';
      vasActionButton.style.borderRadius = '1px';
      vasActionButton.style.color = 'white';
      vasActionButton.style.backgroundColor = 'brown';
      vasActionButton.textContent = gastc.buttonText
      vasActionButton.addEventListener('click', () => {
        Ui.choose(gastc)
      })
      vasdButtons.appendChild(vasActionButton)
    }
    for (let convoResponse of Ui.selectedVasResponsesToShow()) {
      let vasActionButton = document.createElement('button')
      vasActionButton.style.paddingInline = '0.7em';
      vasActionButton.style.paddingBlock = '0.6em';
      vasActionButton.style.border = 'none';
      vasActionButton.style.borderRadius = '1px';
      vasActionButton.style.color = 'white';
      vasActionButton.style.backgroundColor = 'brown';
      vasActionButton.textContent = convoResponse.responseText
      vasActionButton.addEventListener('click', () => {
        Ui.chooseVasResponse(convoResponse)
        dispatchBus({ uiEvent: { kind: 'ping' } })
      })
      vasdButtons.appendChild(vasActionButton)
    }
    return
  }
  let meSelected = Ui.uiStateYep.lastMsgFromServer?.yourInfo.unitId == Ui.uiStateYep.lastUnitClicked
  let enemy = Ui.uiStateYep.lastMsgFromServer?.enemiesInScene.find(vup => vup.unitId == Ui.uiStateYep.lastUnitClicked)
  if (enemy || meSelected) {
    for (let value of Ui.typedInventory()) {
      // for (let gastc of vup.actionsThatCanTargetMe) {
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
      vasdButtons.appendChild(slotButton)
      let slotImg = document.createElement('img')
      slotImg.draggable = false
      slotImg.src = value.img
      slotImg.style.display = 'block';
      slotImg.style.borderRadius = '10px';
      if (value.disabled || (!gastc && value.acts.length != 1)) {
        slotImg.style.opacity = '0.5'
      }
      slotButton.appendChild(slotImg)
    }
  }
}
listenBus((uiEvent) => {
  if (Ui.uiStateYep.lastUnitClicked) {
    refreshActionButtons()
  }
})

let added = addNewUser("my name")
if (added) {
  // changeScene(added.player, 'soloTrain0')
  updatePlayerActions(added.player)
  let msg = buildNextMessage(added.player, added.player.unitId)
  Ui.uiStateYep.lastMsgFromServer = msg
  Ui.syncVisualsToMsg()
  Ui.ensureSelectedUnit()
  dispatchBus({ uiEvent: { kind: 'ping' } })
}


