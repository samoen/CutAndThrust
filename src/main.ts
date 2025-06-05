import './style.css'
import { addNewUser, users } from './users'
import { buildNextMessage, type MessageFromServer } from './messaging'
import { updatePlayerActions, type VisualActionSourceInClient } from './logic'
import { allVisualUnitProps, choose, chooseVasResponse, convoStateForEachVAS, ensureSelectedUnit, resetSceneConvos, selectedDetail, selectedVasResponsesToShow, selectedVisualActionSourceState, syncVisualsToMsg, typedInventory, uiStateYep, vasesToShow, visualActionSources, type ConvoState, type UIVas, type VisualUnitProps } from './ui'
import { anySprites, getHeroPortrait, getLandscape, getPortrait } from './assets'
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
listenBus((uiEvent)=>{
  if(uiEvent.kind != 'ping')return
  if(!uiStateYep.lastMsgFromServer)return
  yourSceneLabel.textContent = uiStateYep.lastMsgFromServer.yourInfo.currentSceneDisplay
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
  if(!uiStateYep.lastMsgFromServer?.landscape)return
  imageBackgroundImg.src = getLandscape(uiStateYep.lastMsgFromServer.landscape)
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
  for (let vup of allVisualUnitProps) {
    if (!unitElements.some(ue => ue.unitId == vup.actual.entity.unitId)) {
      putUnit({ vup: vup })
    }
  }
})

function createUnitAndArea(arg: { unitId: UnitId }): { unitAndArea: HTMLElement, heroSprite: HTMLImageElement, nameTag: HTMLElement, homePlaceholder: HTMLElement, onRemove: () => void } {
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
  function indicateSelected(){
    if(!uiStateYep.lastUnitClicked)return
    if (uiStateYep.lastUnitClicked == arg.unitId) {
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
    uiStateYep.lastUnitClicked = arg.unitId
    dispatchBus({ uiEvent: { kind: 'visual-thing-selected', unitId: arg.unitId } })
  })

  return { unitAndArea: unitAndArea, heroSprite: heroSprite, nameTag: nameTag, homePlaceholder: homePlaceholder, onRemove: onRemove }
}

export function putUnit(arg: { vup: VisualUnitProps }) {
  let unitHolder = createUnitAndArea({ unitId: arg.vup.actual.entity.unitId })
  unitHolder.heroSprite.src = arg.vup.sprite
  unitHolder.nameTag.textContent = arg.vup.actual.entity.displayName
  if (arg.vup.actual.kind == 'enemy') {
    unitHolder.heroSprite.style.transform = 'scaleX(-1)'
    unitHolder.homePlaceholder.style.order = '1'
  }
  let onRemove = () => { }
  let updateOrRemoveUnit = () => {
    let vup = allVisualUnitProps.find(vup => vup.actual.entity.unitId == arg.vup.actual.entity.unitId)
    // console.log('unit event', vup)
    if (vup) {
      unitHolder.heroSprite.src = vup.sprite
      unitHolder.nameTag.textContent = vup.actual.entity.displayName
    } else {
      onRemove()
      unitHolder.unitAndArea.remove()
      unitHolder.onRemove()
      unitElements = unitElements.filter(ue => ue.unitId != arg.vup.actual.entity.unitId)
    }
  }
  onRemove = listenBus((uiEvent) => {
    updateOrRemoveUnit()
  })
  if (arg.vup.actual.kind == 'enemy') {
    units2.appendChild(unitHolder.unitAndArea)
  }
  if (arg.vup.actual.kind == 'player') {
    units1.appendChild(unitHolder.unitAndArea)
  }
  unitElements.push({ element: unitHolder.unitAndArea, unitId: arg.vup.actual.entity.unitId })
}

export function putVas(arg: { uiVas: UIVas }) {
  let unitHolder = createUnitAndArea({ unitId: arg.uiVas.id })
  unitHolder.heroSprite.style.transform = 'scaleX(-1)'
  unitHolder.heroSprite.src = anySprites[arg.uiVas.sprite]
  unitHolder.nameTag.textContent = arg.uiVas.displayName
  unitHolder.homePlaceholder.style.order = '1'
  units2.appendChild(unitHolder.unitAndArea)
  vasElements.push({ element: unitHolder.unitAndArea, vasId: arg.uiVas.id })
  let onRemove = () => { }
  let updateOrRemoveVas = () => {
    let vas = vasesToShow().find(vas => vas.id == arg.uiVas.id)
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
    if (uiEvent.kind == 'ping' || uiEvent.kind == 'scene-reset' || uiEvent.kind == 'response-chosen') {
      updateOrRemoveVas()
    }
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
  for (let uiVas of vasesToShow()) {
    if (!vasElements.some(ue => ue.vasId == uiVas.id)) {
      putVas({ uiVas: uiVas })
    }
  }
}

listenBus((uiEvent) => {
  if (uiEvent.kind == 'ping' || uiEvent.kind == 'response-chosen') {
    putMissingVases()
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
  let selDetail = selectedDetail()
  if (!(selDetail && selDetail.kind == 'vas')) {
    return;
  }
  resetSceneConvos(selDetail.entity.scene);
  dispatchBus({ uiEvent: { kind: 'scene-reset' } })

  let sd = selectedDetail()
  if (sd?.kind == 'vas') {
    uiStateYep.lastUnitClicked = sd.entity.id
    dispatchBus({ uiEvent: { kind: 'visual-thing-selected', unitId: sd.entity.id } })
  }
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
  // if (uiEvent.kind != 'visual-thing-selected') return
  if(!uiStateYep.lastUnitClicked)return
  let vas = visualActionSources.find(vas => vas.id == uiStateYep.lastUnitClicked)
  if (vas) {
    underPortrait.textContent = vas.displayName
    if (vas.portrait) {
      portraitImg.src = getPortrait(vas.portrait)
      return
    }
    portraitImg.src = anySprites[vas.sprite]
    return
  }
  let vup = allVisualUnitProps.find(vup => vup.actual.entity.unitId == uiStateYep.lastUnitClicked)
  if (vup) {
    portraitImg.src = vup.portrait
    underPortrait.textContent = vup.actual.entity.displayName
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
  let vasState = selectedVisualActionSourceState()
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

function refreshActionButtons(arg: { unitId: UnitId }) {
  vasdButtons.replaceChildren()
  let vas = visualActionSources.find(vas => vas.id == arg.unitId)
  // console.log("populate vas actions", vas)
  if (vas) {
    for (let gastc of vas.actionsInClient) {
      let vasActionButton = document.createElement('button')
      vasActionButton.style.paddingInline = '0.7em';
      vasActionButton.style.paddingBlock = '0.6em';
      vasActionButton.style.border = 'none';
      vasActionButton.style.borderRadius = '1px';
      vasActionButton.style.color = 'white';
      vasActionButton.style.backgroundColor = 'brown';
      vasActionButton.textContent = gastc.buttonText
      vasActionButton.addEventListener('click', () => {
        choose(gastc)
        dispatchBus({uiEvent:{kind:'ping'}})
      })
      vasdButtons.appendChild(vasActionButton)
    }
    for (let convoResponse of selectedVasResponsesToShow()) {
      let vasActionButton = document.createElement('button')
      vasActionButton.style.paddingInline = '0.7em';
      vasActionButton.style.paddingBlock = '0.6em';
      vasActionButton.style.border = 'none';
      vasActionButton.style.borderRadius = '1px';
      vasActionButton.style.color = 'white';
      vasActionButton.style.backgroundColor = 'brown';
      vasActionButton.textContent = convoResponse.responseText
      vasActionButton.addEventListener('click', () => {
        chooseVasResponse(convoResponse)
        dispatchBus({ uiEvent: { kind: 'response-chosen' } })
      })
      vasdButtons.appendChild(vasActionButton)
    }
    return
  }
  let vup = allVisualUnitProps.find(vup => vup.actual.entity.unitId == arg.unitId)
  if (vup) {
    for (let value of typedInventory()) {
      // for (let gastc of vup.actionsThatCanTargetMe) {
      let slotButton = document.createElement('button')
      slotButton.style.position = 'relative';
      slotButton.style.border = 'none';
      slotButton.style.background = 'none';
      slotButton.style.cursor = 'pointer';
      if (value.disabled) {
        // slotButton.disabled = true
      }

      slotButton.addEventListener('click', () => {
        if (value.acts.length == 1) {
          let act = value.acts.at(0)
          if (act) {
            console.log('choosing only option')
            choose(act)
            return
          }
        }
        let gastc = vup.actionsThatCanTargetMe.find(a => a.itemId == value.itemState.stats.id)
        if (gastc) {
          console.log('choosing', gastc.buttonText)
          choose(gastc)
          return
        }
      })
      vasdButtons.appendChild(slotButton)
      let slotImg = document.createElement('img')
      slotImg.draggable = false
      slotImg.src = value.img
      slotImg.style.display = 'block';
      slotImg.style.borderRadius = '10px';
      console.log('refreshing slot', value)
      if (value.disabled) {
        slotImg.style.opacity = '0.5'
      }
      slotButton.appendChild(slotImg)
    }
  }
}
listenBus((uiEvent) => {
  if (uiStateYep.lastUnitClicked) {
    refreshActionButtons({ unitId: uiStateYep.lastUnitClicked })
  }
})

let added = addNewUser("my name")
if (added) {
  updatePlayerActions(added.player)
  let msg = buildNextMessage(added.player, added.player.unitId)
  uiStateYep.lastMsgFromServer = msg
  syncVisualsToMsg()
  ensureSelectedUnit()
  console.log('first ping')
  dispatchBus({ uiEvent: { kind: 'ping' } })
}


