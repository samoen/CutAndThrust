import './style.css'
import bowman from './assets/units/bowman.png'
import { addNewUser, users } from './users'
import { buildNextMessage, type MessageFromServer } from './messaging'
import { updatePlayerActions, type VisualActionSourceInClient } from './logic'
import { allVisualUnitProps, convoStateForEachVAS, selectedDetail, visualLandscape, worldReceived, type UIVas, type VisualUnitProps } from './ui'
import { anySprites, getLandscape, getPortrait } from './assets'
import type { UnitId, VisualActionSourceId } from './utils'
import sidebar from './assets/ui/sidebar.png'
import minimap from './assets/ui/minimap.png'

document.querySelector<HTMLDivElement>('#loading')!.remove()

export const bus = new EventTarget();
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
yourSceneLabel.textContent = 'dungeon'
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
imageBackgroundImg.style.minWidth = '100vw'
bus.addEventListener('ping', (event: Event) => {
  imageBackgroundImg.src = getLandscape(visualLandscape)
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
bus.addEventListener('ping', (event: Event) => {
  const customEvent = event as CustomEvent<EventDetail>;
  let msg: EventDetail = customEvent.detail
  for (let vup of msg.allVisualUnitProps) {
    if (!unitElements.some(ue => ue.unitId == vup.actual.entity.unitId)) {
      putUnit({ vup: vup })
    }
  }
})

function createUnitAndArea(arg: {}): { unitAndArea: HTMLElement, heroSprite: HTMLImageElement, nameTag: HTMLElement, homePlaceholder: HTMLElement } {
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
  heroSprite.src = bowman
  outerHeroSprite.appendChild(heroSprite)

  let guestAreaPlaceholder = document.createElement('div')
  guestAreaPlaceholder.style.zIndex = '2'
  guestAreaPlaceholder.style.position = 'relative'
  guestAreaPlaceholder.style.border = '2px dashed transparent'
  guestAreaPlaceholder.style.borderRadius = '10px'
  guestAreaPlaceholder.style.width = '50%'
  guestAreaPlaceholder.style.height = 'auto'
  guestAreaPlaceholder.style.backgroundColor = 'red'
  unitAndArea.appendChild(guestAreaPlaceholder)


  return { unitAndArea: unitAndArea, heroSprite: heroSprite, nameTag: nameTag, homePlaceholder: homePlaceholder }
}
export type EventDetail = {
  allVisualUnitProps: VisualUnitProps[]
  uiVases: UIVas[]
}
export function putUnit(arg: { vup: VisualUnitProps }) {
  let unitHolder = createUnitAndArea({})
  unitHolder.heroSprite.src = arg.vup.sprite
  unitHolder.nameTag.textContent = arg.vup.actual.entity.displayName
  if (arg.vup.actual.kind == 'enemy') {
    unitHolder.heroSprite.style.transform = 'scaleX(-1)'
  }
  let listen = (event: Event) => {
    const customEvent = event as CustomEvent<EventDetail>;
    let msg: EventDetail = customEvent.detail
    let vup = msg.allVisualUnitProps.find(vup => vup.actual.entity.unitId == arg.vup.actual.entity.unitId)
    console.log('unit event', vup)
    if (vup) {
      unitHolder.heroSprite.src = vup.sprite
      unitHolder.nameTag.textContent = vup.actual.entity.displayName
    } else {
      bus.removeEventListener('ping', listen)
      unitHolder.unitAndArea.remove()
      unitElements = unitElements.filter(ue => ue.unitId != arg.vup.actual.entity.unitId)
    }
  }
  bus.addEventListener('ping', listen);
  units1.appendChild(unitHolder.unitAndArea)
  unitElements.push({ element: unitHolder.unitAndArea, unitId: arg.vup.actual.entity.unitId })
}
export function putVas(arg: { uiVas: UIVas }) {
  let unitHolder = createUnitAndArea({ unitId: arg.uiVas.id })
  unitHolder.heroSprite.style.transform = 'scaleX(-1)'
  unitHolder.heroSprite.src = anySprites[arg.uiVas.sprite]
  unitHolder.nameTag.textContent = arg.uiVas.displayName
  unitHolder.homePlaceholder.style.order = '1'
  units2.appendChild(unitHolder.unitAndArea)
}

let centerPlaceHolder = document.createElement('div')
centerPlaceHolder.style.height = 'clamp(25px, 5vw + 1px, 50px)'
centerPlaceHolder.style.width = 'clamp(25px, 5vw + 1px, 50px)'
centerPlaceHolder.style.position = 'absolute'
centerPlaceHolder.style.top = '50%'
centerPlaceHolder.style.left = '50%'
centerPlaceHolder.style.backgroundColor = 'blue'
visual.appendChild(centerPlaceHolder)

let units2 = document.createElement('div')
// units2.style.backgroundColor = 'red'
applyUnitsStyle(units2)
visual.appendChild(units2)
bus.addEventListener('ping', (event: Event) => {
  const customEvent = event as CustomEvent<EventDetail>;
  let msg: EventDetail = customEvent.detail
  let uiVasesToShow = msg.uiVases.filter((s) => {
    const csForE = convoStateForEachVAS.get(s.scene);
    if (!csForE) return false;
    const cs = csForE.get(s.id);
    if (!cs) return false;
    return !cs.isLocked;
  });
  for (let uiVas of uiVasesToShow) {
    if (!vasElements.some(ue => ue.vasId == uiVas.id)) {
      putVas({ uiVas: uiVas })
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
selectedPortrait.appendChild(portrait)

let portraitImg = document.createElement('img')
portraitImg.style.display = 'block';
portraitImg.style.height = '100%';
portraitImg.style.width = '100%';
portraitImg.style.objectFit = 'cover';
portraitImg.src = getPortrait('general')
portrait.appendChild(portraitImg)

let underPortrait = document.createElement('div')
underPortrait.textContent = 'selected guy'
underPortrait.style.textAlign = 'center';
underPortrait.style.whiteSpace = 'nowrap';
underPortrait.style.display = 'flex';
underPortrait.style.justifyContent = 'center';
underPortrait.style.alignItems = 'center';
underPortrait.style.height = '4svh';
underPortrait.style.zIndex = '2';
underPortrait.style.color = 'white';
underPortrait.style.borderTop = 'none';
underPortrait.style.wordWrap = 'break-word';
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
vasdPrompt.textContent = 'a retort'
vasdPromptAndButtons.appendChild(vasdPrompt)

let vasdButtons = document.createElement('div')
vasdButtons.style.marginTop = '7px';
vasdButtons.style.display = 'flex';
vasdButtons.style.flexWrap = 'wrap';
vasdButtons.style.gap = '5px';
vasdPromptAndButtons.appendChild(vasdButtons)

let vasResponses = ['cool', 'yes']
for (let vr of vasResponses) {
  let vasResponse = document.createElement('button')
  vasResponse.style.paddingInline = '0.7em';
  vasResponse.style.paddingBlock = '0.6em';
  vasResponse.style.border = 'none';
  vasResponse.style.borderRadius = '1px';
  vasResponse.style.color = 'white';
  vasResponse.style.backgroundColor = 'brown';
  vasResponse.textContent = vr
  vasdButtons.appendChild(vasResponse)
}


let added = addNewUser("cood")
if (added) {
  updatePlayerActions(added.player)
  let msg = buildNextMessage(added.player, added.player.unitId)
  worldReceived(msg)

  console.log(msg)
  console.log(allVisualUnitProps)
}


