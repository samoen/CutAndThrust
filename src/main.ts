import './style.css'
import bowman from 'src/assets/units/bowman.png'
import general from 'src/assets/units/general.png'
import plain from 'src/assets/landscapes/landscape-plain.webp'
import { addNewUser } from './users'
import { sendAction } from './action'

document.querySelector<HTMLDivElement>('#loading')!.remove()

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

let yourSceneLabel = document.createElement('span')
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

let imageBackgroundImg = document.createElement('img')
imageBackgroundImg.style.minWidth = '100vw'
imageBackgroundImg.src = plain
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
let units1 = document.createElement('div')
applyUnitsStyle(units1)
visual.appendChild(units1)

function createUnitHolder(): { unitHolder: HTMLElement, heroSprite: HTMLImageElement, nameTag:HTMLElement } {
  let unitHolder = document.createElement('div')

  let homePlaceholder = document.createElement('div')
  homePlaceholder.style.order = '1'
  homePlaceholder.style.border = '2px dashed transparent'
  homePlaceholder.style.borderRadius = '10px'
  homePlaceholder.style.width = '50%'
  homePlaceholder.style.height = 'auto'
  unitHolder.appendChild(homePlaceholder)

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
  return { unitHolder: unitHolder, heroSprite: heroSprite, nameTag: nameTag }
}

function putAlly(arg:{displayName:string, sprite:string}){
  let unitHolder = createUnitHolder()
  unitHolder.heroSprite.src = arg.sprite
  unitHolder.nameTag.textContent = arg.displayName
  units1.appendChild(unitHolder.unitHolder)
}
function putVas(arg:{displayName:string, sprite:string}){
  let unitHolder = createUnitHolder()
  unitHolder.heroSprite.style.transform = 'scaleX(-1)'
  unitHolder.heroSprite.src = arg.sprite
  unitHolder.nameTag.textContent = arg.displayName
  units2.appendChild(unitHolder.unitHolder)
}

putAlly({displayName: 'cool guy', sprite: bowman})
putAlly({displayName: 'friend', sprite: general})


let centerPlaceHolder = document.createElement('div')
centerPlaceHolder.style.height = 'clamp(25px, 5vw + 1px, 50px)'
centerPlaceHolder.style.width = 'clamp(25px, 5vw + 1px, 50px)'
centerPlaceHolder.style.position = 'absolute'
centerPlaceHolder.style.top = '50%'
centerPlaceHolder.style.left = '50%'
centerPlaceHolder.style.backgroundColor = 'blue'
centerPlaceHolder.addEventListener('click',()=>{
  // sendAction("")
})
visual.appendChild(centerPlaceHolder)

let units2 = document.createElement('div')
applyUnitsStyle(units2)
visual.appendChild(units2)
putVas({displayName:'Arthur', sprite:general})

addNewUser("coolest")


