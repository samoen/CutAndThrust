import { users, type Flag, type HeroName, type PlayerInClient } from './users';

import type { ItemId, ItemState } from './items';
import { handlePlayerAction, updateAllPlayerActions, updatePlayerActions, type ConversationResponse, type VisualActionSourceInClient } from './logic';
import { buildNextMessage, type MessageFromServer } from './messaging';
import type { SceneDataId } from './scenes';
import {
  anySprites,
  enemySprites,
  getHeroPortrait,
  getLandscape,
  getPortrait,
  getSlotImage,
  heroSpriteFromClass
} from './assets';
import type { BattleAnimation, EnemyInClient, GameActionSelected, GameActionSentToClient, HeroId, LandscapeImage, SignupResponse, StatusState, UnitId, VisualActionSourceId } from './utils';
import { dispatchBus, uiEvents } from './main';

type HeroSpecificEnemyState = { hName: HeroName; agg: number; sts: StatusState[] };

export type UnitDetails =
  | {
    kind: 'enemy';
    entity: EnemyInClient;
    heroSpecificStates: HeroSpecificEnemyState[];
  }
  | {
    kind: 'player';
    entity: PlayerInClient;
  };

export type VisualUnitProps = {
  portrait: string;
  sprite: string;
  tilt?: boolean;
  actual: UnitDetails;
  actionsThatCanTargetMe: GameActionSentToClient[];
};

export type ProjectileProps = {
  projectileImg: string;
};

export type Guest = VisualUnitProps | undefined;
export type Projectile = undefined | ProjectileProps;
export type ConvoState = {
  currentRetort: string;
  detectStep?: Flag;
  lockedResponseHandles: Map<string, boolean>;
  isLocked: boolean;
};

export type UIVas = VisualActionSourceInClient & { actionsInClient: GameActionSentToClient[] };
export let waitingForMyAnimation = false;
export let visualActionSources: UIVas[] = [];
export let convoStateForEachVAS:
  Map<SceneDataId, Map<VisualActionSourceId, ConvoState>
  > = new Map();

export const uiStateYep = {
  lastUnitClicked: undefined as UnitId | undefined,
  lastMsgFromServer: undefined as MessageFromServer | undefined,
  previousMsgFromServer: undefined as MessageFromServer | undefined,
  currentAnimIndex: -1,
}
export type Entity = PlayerInClient | EnemyInClient
export function getEntity(unitId: UnitId, msg: MessageFromServer | undefined): Entity | undefined {
  if (!msg) return undefined
  if (msg.yourInfo.unitId == unitId) {
    return msg.yourInfo
  }
  let enemy = msg.enemiesInScene.find(e => e.unitId == unitId)
  if (enemy) return enemy
  return undefined
}

export function vasesToShow2(): VisualActionSourceInClient[] {
  if (!uiStateYep.lastMsgFromServer) return []
  return uiStateYep.lastMsgFromServer.visualActionSources.filter((s) => {
    const csForE = convoStateForEachVAS.get(s.scene);
    if (!csForE) return false;
    const cs = csForE.get(s.id);
    if (!cs) return false;
    return !cs.isLocked;
  });
}

export function resetSceneConvos(sceneId: SceneDataId) {
  const vasesToReset = visualActionSources.filter((v) => v.scene == sceneId);
  convoStateForEachVAS.delete(sceneId);
  vasesToReset.forEach((v) => {
    syncConvoStateToVas(v);
  });
}

export function numberShownOnSlot(itemState: ItemState): string | undefined {
  if (itemState.stock != undefined && itemState.stock < 1) {
    return '0';
  }
  const higherOfCooldownOrWarmup = Math.max(itemState.cooldown, itemState.warmup);
  if (higherOfCooldownOrWarmup > 0) return `${higherOfCooldownOrWarmup}`;
  return undefined;
}

export function stockDotsOnSlotButton(itemState: ItemState): string {
  let dots = '';
  if (itemState.stock != undefined) {
    // if(itemState.stock < 1)return '-'
    for (const _ of Array.from({ length: itemState.stock })) {
      dots = dots + '.';
    }
  }
  return dots;
}

export function actionsForSlot(
  iId: ItemId
): GameActionSentToClient[] {
  if (!uiStateYep.lastMsgFromServer) return [];
  return uiStateYep.lastMsgFromServer.itemActions.filter((ia) => ia.itemId == iId);
}

export type SlotButtonProps = {
  itemState: ItemState;
  disabled: boolean;
  acts: GameActionSentToClient[];
  overlayNumber: string | undefined;
  dots: string;
  img: string;
};

export const typedInventory =
  () => {
    const inventory: SlotButtonProps[] = [];
    if (!uiStateYep.lastMsgFromServer) {
      return inventory;
    }
    for (const state of uiStateYep.lastMsgFromServer.yourInfo.inventory) {
      const acts = actionsForSlot(state.stats.id);
      const d = !acts.length
      const num = numberShownOnSlot(state);
      let include = true;
      if (state.stats.excludeFromDetail && !acts.length) {
        include = false;
      }

      if (include) {
        inventory.push({
          itemState: state,
          disabled: d,
          acts: acts,
          overlayNumber: num,
          dots: stockDotsOnSlotButton(state),
          img: getSlotImage(state.stats)
        });
      }
    }

    return inventory;
  }

export type DetailWindow =
  | { kind: 'vup'; entity: VisualUnitProps; unitId: UnitId; }
  | { kind: 'vas'; entity: UIVas; unitId: UnitId }
// | { kind: 'bg' };

export function checkSelectedUnitValid(): UnitId | undefined {
  if (!uiStateYep.lastMsgFromServer) return undefined
  // if(!uiStateYep.lastUnitClicked)return undefined
  if (uiStateYep.lastUnitClicked) {
    if (uiStateYep.lastUnitClicked == uiStateYep.lastMsgFromServer.yourInfo.unitId) return uiStateYep.lastUnitClicked
    const vupAt = uiStateYep.lastMsgFromServer.enemiesInScene.find((v) => v.unitId == uiStateYep.lastUnitClicked)
    if (vupAt) return uiStateYep.lastUnitClicked
    const vasAt = vasesToShow2().find((v) => v.id == uiStateYep.lastUnitClicked);
    if (vasAt) return uiStateYep.lastUnitClicked
  }

  // if last unit clicked not valid, fall back to first enemy
  const firstEnemy = uiStateYep.lastMsgFromServer.enemiesInScene.at(0)
  if (firstEnemy) return firstEnemy.unitId

  // if no enemies fall back to first unlocked vas with an unlocked action or response
  let firstVas = undefined;
  outer: for (const vas of vasesToShow2()) {
    const csForE = convoStateForEachVAS.get(vas.scene);
    if (!csForE) continue;
    const cs = csForE.get(vas.id);
    if (!cs) continue;
    // if (cs.kind != 'seen') continue
    let actionsForThisVas = uiStateYep.lastMsgFromServer.vasActions.filter((va) => va.associateWithUnit == vas.id);
    for (const act of actionsForThisVas) {
      firstVas = vas;
      break outer;
    }
    for (const r of vas.responses) {
      if (cs.lockedResponseHandles.get(r.responseId) == false) {
        firstVas = vas;
        break outer;
      }
    }
  }
  if (firstVas) {
    return firstVas.id;
  }

  // if no unlocked vas fall back to self
  return uiStateYep.lastMsgFromServer.yourInfo.unitId
}

export function chooseVasResponse(c: ConversationResponse) {
  let state = selectedVisualActionSourceState2();
  if (!state) return;
  if (c.lock) {
    for (const handleToLock of c.lock) {
      state.lockedResponseHandles.set(handleToLock, true);
    }
  }
  if (c.unlock) {
    for (const handleToUnlock of c.unlock) {
      state.lockedResponseHandles.set(handleToUnlock, false);
    }
  }
  if (c.responseId) {
    state.lockedResponseHandles.set(c.responseId, true);
  }
  if (c.unlockVas) {
    for (const handleToUnlock of c.unlockVas) {
      changeVasLocked(handleToUnlock, true);
    }
  }
  if (c.lockVas) {
    for (const handleToLock of c.lockVas) {
      changeVasLocked(handleToLock, false);
    }
  }
  if (c.retort) {
    state.currentRetort = c.retort;
  }
}

export function selectedVisualActionSourceState2(): ConvoState | undefined {
  if (!uiStateYep.lastMsgFromServer) return undefined
  let selectedVas = vasesToShow2().find(vas => vas.id == uiStateYep.lastUnitClicked)
  if (!selectedVas) return undefined

  // let selectedDetail2 = selectedDetail()
  // if (!selectedDetail2 || selectedDetail2.kind != 'vas') return undefined;
  const csForE = convoStateForEachVAS.get(selectedVas.scene);
  if (!csForE) return undefined;
  const state = csForE.get(selectedVas.id);
  if (!state) {
    return undefined;
  }
  // console.log('selected vas state', state)
  return state;
}

export function selectedVasResponsesToShow2(): ConversationResponse[] {
  let selectedVas = vasesToShow2().find(vas => vas.id == uiStateYep.lastUnitClicked)
  if (!selectedVas) return []
  let selectedVisualActionSourceState = selectedVisualActionSourceState2()
  if (!selectedVisualActionSourceState) return []
  return selectedVas.responses.filter((r) => {
    if (!r.responseId) return true;
    const locked = selectedVisualActionSourceState.lockedResponseHandles.get(r.responseId);
    return !locked;
  });
}

export function syncVisualsToMsg() {
  const lastMsg = structuredClone(uiStateYep.lastMsgFromServer);
  if (!lastMsg) {
    console.log('tried to sync with bad msg');
    return
  }
  console.log('syncing to msg ', lastMsg)

  for (const vas of lastMsg.visualActionSources) {
    syncConvoStateToVas(vas);
  }

  const uiVases = lastMsg.visualActionSources.map((v) => {
    const actionsFromVas = lastMsg.vasActions.filter((va) => va.associateWithUnit == v.id);
    const uiVas = {
      ...v,
      actionsInClient: actionsFromVas
    } satisfies UIVas;
    return uiVas;
  });

  visualActionSources = uiVases;
}

export function syncConvoStateToVas(vas: VisualActionSourceInClient) {
  let cs = structuredClone(convoStateForEachVAS)

  let sceneEntry = cs.get(vas.scene);

  if (!sceneEntry) {
    sceneEntry = new Map();
  }
  const existing = sceneEntry.get(vas.id);

  if (existing && existing.detectStep == vas.detectStep) {
    return cs;
  }

  const startResponsesLocked = new Map<string, boolean>();
  for (const resp of vas.responses) {
    if (resp.responseId) {
      if (resp.startsLocked) {
        startResponsesLocked.set(resp.responseId, true);
      } else {
        startResponsesLocked.set(resp.responseId, false);
      }
    }
  }

  // default startsLocked handling
  const startLocked = vas.startsLocked ?? false;

  sceneEntry.set(vas.id, {
    currentRetort: vas.startText,
    detectStep: vas.detectStep,
    lockedResponseHandles: startResponsesLocked,
    isLocked: startLocked
  });

  cs.set(vas.scene, sceneEntry);
  convoStateForEachVAS = cs
}

export function changeVasLocked(vId: VisualActionSourceId, unlock: boolean) {
  const vases = visualActionSources;
  const found = vases.find((v) => v.id == vId);
  if (!found) return;

  let cs = convoStateForEachVAS
  const sceneEntry = cs.get(found.scene);
  if (!sceneEntry) return cs;
  const cState = sceneEntry.get(vId);
  // vas will already have a convo state
  if (!cState) return;
  if (unlock) {
    cState.isLocked = false;
  } else {
    cState.isLocked = true;
  }
  convoStateForEachVAS = cs
}

export let animationsInProgress = false
export async function choose(
  chosen: GameActionSentToClient
) {
  if (animationsInProgress) return
  animationsInProgress = true
  const player = users.get("me");
  if (!player) {
    console.log('no player when choose')
    return
  }
  let playerActions = [...player.devActions, ...player.itemActions, ...player.vasActions]
  const actionFromId = playerActions.find(
    (g) => g.buttonText == chosen.buttonText
  );

  if (!actionFromId) {
    console.log('chosen action not valid', chosen.buttonText, playerActions.map(a => a.buttonText))
    return
  }

  handlePlayerAction(player, actionFromId);
  updatePlayerActions(player)
  let msg = buildNextMessage(player, player.unitId)
  uiStateYep.previousMsgFromServer = uiStateYep.lastMsgFromServer
  uiStateYep.lastMsgFromServer = msg
  let animsLen = msg.animations.length
  // console.log('looping anims', msg.animations)
  for (let i = 0; i < animsLen; i++) {
    let anim = msg.animations.at(i)
    if (!anim) continue
    uiStateYep.currentAnimIndex = i
    dispatchBus(uiEvents.animate)

    if (anim.behavior.kind == 'melee') {
      // animate and back again
      await waitAnimStep('meleeThere')
      await waitAnimStep('meleeThere')
    }
    if (anim.behavior.kind == 'travel' || anim.teleporting) {
      await waitAnimStep('meleeThere')
    }
    if (anim.behavior.kind == 'center') {
      await waitAnimStep('toCenter')
      await waitAnimStep('seeResult')
    }

    if (anim.behavior.kind == 'selfInflicted') {
      await waitAnimStep('inflict')
    }

    // for each strike
    if (anim.alsoDamages) {
      let firstDmged = anim.alsoDamages.at(0)
      if (firstDmged) {
        for (let i = 0; i < firstDmged.amount.length; i++) {
          if (anim.behavior.kind == 'melee') {
            await waitAnimStep('halfStrike')
            await waitAnimStep('halfStrike')
          }
          if (anim.behavior.kind == 'missile') {
            await waitAnimStep('missile')
            await waitAnimStep('seeResult')
          }
        }
      }
    }
  }

  // uiStateYep.lastMsgFromServer = msg
  // await waitAnimStep(1)
  syncVisualsToMsg()
  ensureSelectedUnit()
  dispatchBus(uiEvents.rerender)
  animationsInProgress = false
}

export const animationDurations = {
  meleeThere: 500,
  missile: 400,
  halfStrike: 150,
  seeResult: 400,
  toCenter: 500,
  inflict: 300,
}

export async function waitAnimStep(duration: 'meleeThere' | 'missile' | 'halfStrike' | 'seeResult' | 'toCenter' | 'inflict') {
  let promRes = newPromWithRes()
  let waitMs = animationDurations[duration]
  setTimeout(promRes.resolve, waitMs)
  await promRes.prom,
    await nextAnimFrame()
}

export async function nextAnimFrame() {
  let promRes = newPromWithRes()
  requestAnimationFrame(promRes.resolve)
  await promRes.prom
}

export async function waitToImpact(anim: BattleAnimation) {
  if (anim.behavior.kind == 'missile') {
    await waitAnimStep('missile')
  }
  if (anim.behavior.kind == 'melee') {
    await waitAnimStep('meleeThere')
  }
  if (anim.behavior.kind == 'center') {
    await waitAnimStep('toCenter')
  }
}

export type PromWithRes = { prom: Promise<void>, resolve: () => void }

export function newPromWithRes(): PromWithRes {
  let resolve: (() => void) = () => { }
  let prom = new Promise<void>((r) => {
    resolve = r
  })
  return {
    prom,
    resolve,
  }
}

export function ensureSelectedUnit() {
  let validToBeSelected = checkSelectedUnitValid()
  if (!validToBeSelected) return
  uiStateYep.lastUnitClicked = validToBeSelected
}