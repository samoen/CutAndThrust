import './style.css'
import bowman from './assets/units/bowman.png'
import { addNewUser, users } from './users'
import { buildNextMessage, type MessageFromServer } from './messaging'
import { updatePlayerActions, type VisualActionSourceInClient } from './logic'
import { allVisualUnitProps, convoStateForEachVAS, visualLandscape, worldReceived, type UIVas, type VisualUnitProps } from './ui'
import { anySprites, getLandscape } from './assets'
import type { UnitId, VisualActionSourceId } from './utils'

document.querySelector<HTMLDivElement>('#loading')!.remove()

export const bus = new EventTarget();
export let unitElements : {element:HTMLElement, unitId: UnitId}[] = []
export let vasElements : {element:HTMLElement, vasId: VisualActionSourceId}[] = []


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
bus.addEventListener('ping',(event:Event)=>{
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
bus.addEventListener('ping',(event:Event)=>{
  const customEvent = event as CustomEvent<EventDetail>;
  let msg : EventDetail = customEvent.detail
  for(let vup of msg.allVisualUnitProps){
    if(!unitElements.some(ue=>ue.unitId == vup.actual.entity.unitId)){
      putUnit({vup:vup})
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

  let guestAreaPlaceholder  = document.createElement('div')
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
    let msg : EventDetail = customEvent.detail
    let vup = msg.allVisualUnitProps.find(vup => vup.actual.entity.unitId == arg.vup.actual.entity.unitId)
    console.log('unit event', vup)
    if (vup) {
      unitHolder.heroSprite.src = vup.sprite
      unitHolder.nameTag.textContent = vup.actual.entity.displayName
    }else{
      bus.removeEventListener('ping',listen)
      unitHolder.unitAndArea.remove()
      unitElements = unitElements.filter(ue=>ue.unitId != arg.vup.actual.entity.unitId)
    }
  }
  bus.addEventListener('ping', listen);
  units1.appendChild(unitHolder.unitAndArea)
  unitElements.push({element:unitHolder.unitAndArea,unitId:arg.vup.actual.entity.unitId})
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
bus.addEventListener('ping',(event:Event)=>{
  const customEvent = event as CustomEvent<EventDetail>;
  let msg : EventDetail = customEvent.detail
  let uiVasesToShow = msg.uiVases.filter((s) => {
     const csForE = convoStateForEachVAS.get(s.scene);
     if (!csForE) return false;
     const cs = csForE.get(s.id);
     if (!cs) return false;
     return !cs.isLocked;
   });
  for(let uiVas of uiVasesToShow){
    if(!vasElements.some(ue=>ue.vasId == uiVas.id)){
      putVas({uiVas:uiVas})
    }
  }
})

let added = addNewUser("cood")
if (added) {
  updatePlayerActions(added.player)
  let msg = buildNextMessage(added.player, added.player.unitId)
  worldReceived(msg)

  console.log(msg)
  console.log(allVisualUnitProps)
}


