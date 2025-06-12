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

export type HeroOrEnemy =
  | {
    kind: 'enemy';
    entity: EnemyInClient;
  }
  | {
    kind: 'player';
    entity: PlayerInClient;
  };

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
export let allVisualUnitProps: VisualUnitProps[] = [];
export let visualActionSources: UIVas[] = [];
export let convoStateForEachVAS:
  Map<SceneDataId, Map<VisualActionSourceId, ConvoState>
  > = new Map();
export const uiStateYep = {
  lastUnitClicked: undefined as UnitId | undefined,
  lastMsgFromServer: undefined as MessageFromServer | undefined
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

export function updateUnit(index: UnitId, run: (vup: VisualUnitProps) => void) {
  allVisualUnitProps.map((p, j) => {
    if (index == p.actual.entity.unitId) {
      run(p);
    }
    return p;
  });
}

export function syncVisualsToMsg() {
  const lastMsg = structuredClone(uiStateYep.lastMsgFromServer);
  if (!lastMsg) {
    console.log('tried to sync with bad msg');
    return
  }
  console.log('syncing to msg ', lastMsg)

  const newVups: VisualUnitProps[] = [];

  newVups.push({
    sprite: heroSpriteFromClass(lastMsg.yourInfo.class),
    portrait: getHeroPortrait(lastMsg.yourInfo.class),
    actual: {
      kind: 'player',
      entity: lastMsg.yourInfo
    },
    actionsThatCanTargetMe: lastMsg.itemActions.filter(
      (a) => a.associateWithUnit == lastMsg.yourInfo.unitId
    )
  } satisfies VisualUnitProps);

  for (const e of lastMsg.enemiesInScene) {
    const heroSpecifics: HeroSpecificEnemyState[] = [];
    for (const ag of e.aggros) {
      const find = e.statuses.filter((s) => s.hId == ag.hId);
      const stsForHero: StatusState[] = [];
      if (find) {
        for (const s of find) {
          stsForHero.push({
            statusId: s.statusId,
            count: s.count
          });
        }
      }
      let findPlayer: PlayerInClient | undefined = undefined;
      if (lastMsg.yourInfo.unitId == ag.hId) {
        findPlayer = lastMsg.yourInfo;
      } else {
        findPlayer = lastMsg.otherPlayers.find((p) => p.unitId == ag.hId);
      }

      if (findPlayer) {
        heroSpecifics.push({
          hName: findPlayer.displayName,
          agg: ag.agg,
          sts: stsForHero
        });
      }
    }

    newVups.push({
      sprite: enemySprites[e.template.id],
      portrait: e.template.portrait
        ? getPortrait(e.template.portrait)
        : enemySprites[e.template.id],
      actual: {
        kind: 'enemy',
        entity: e,
        heroSpecificStates: heroSpecifics
      },
      actionsThatCanTargetMe: lastMsg.itemActions.filter((a) => a.associateWithUnit == e.unitId)
    } satisfies VisualUnitProps);
  }

  allVisualUnitProps = newVups;

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

export function handleDamageAnimation(
  anim: BattleAnimation,
  strikeNumber: number,
  oneShot = false
): { died: UnitId[] } {
  const result: { died: UnitId[] } = { died: [] };
  if (anim.alsoDamages) {
    for (const other of anim.alsoDamages) {
      updateUnit(other.target, (vup) => {
        let amt = other.amount.at(strikeNumber) ?? 0;
        if (oneShot) {
          amt = other.amount.reduce((a, b) => a + b, 0);
        }
        // if(singleStrike && other.strikes && other.strikes > 0)amt = amt / other.strikes
        vup.actual.entity.health -= amt;
        if (vup.actual.entity.health < 1) vup.actual.entity.health = 0;
        if (vup.actual.entity.health < 1) {
          result.died.push(vup.actual.entity.unitId);
        }
      });
    }
  }
  return result;
}

export function handleHealAnimations(anim: BattleAnimation) {
  if (anim.alsoHeals) {
    for (const other of anim.alsoHeals) {
      updateUnit(other.target, (vup) => {
        const amt = other.amount;
        vup.actual.entity.health += amt;
        if (vup.actual.entity.health > vup.actual.entity.maxHealth) vup.actual.entity.health = vup.actual.entity.maxHealth;
      });
    }
  }
}

export function handleModAggros(anim: BattleAnimation, myId: HeroId) {
  if (anim.alsoModifiesAggro) {
    for (const other of anim.alsoModifiesAggro) {
      const findMyAggroMod = other.forHeros.find((fh) => fh.hId == myId);

      if (findMyAggroMod) {
        updateUnit(other.target, (vup) => {
          if (vup.actual.kind == 'enemy') {
            vup.actual.entity.myAggro += findMyAggroMod.amount;
            if (vup.actual.entity.myAggro > 100) vup.actual.entity.myAggro = 100;
            if (vup.actual.entity.myAggro < 0) vup.actual.entity.myAggro = 0;
          }
        });
      }
    }
  }
}

export function handleResetAggro(anim: BattleAnimation) {
  if (!anim.noResetAggro) {
    updateUnit(anim.source, (vup) => {
      if (vup.actual.kind == 'enemy') {
        vup.actual.entity.myAggro = 0;
      }
    });
  }
}

export function handlePutsStatuses(anim: BattleAnimation) {
  if (anim.putsStatuses) {
    for (const ps of anim.putsStatuses) {
      updateUnit(ps.target, (vup) => {
        if (ps.remove) {
          vup.actual.entity.statuses = vup.actual.entity.statuses.filter(
            (s) => s.statusId != ps.statusId
          );
        } else {
          if (ps.count) {
            if (vup.actual.kind == 'enemy') {
              const found = vup.actual.entity.statuses.find(
                (s) => s.statusId == ps.statusId && s.hId == anim.triggeredBy
              );
              if (found) {
                if (found.count < ps.count) {
                  found.count = ps.count;
                }
              } else {
                vup.actual.entity.statuses.push({
                  count: ps.count,
                  hId: anim.triggeredBy,
                  statusId: ps.statusId
                });
              }
            } else if (vup.actual.kind == 'player') {
              const found = vup.actual.entity.statuses.find((s) => s.statusId == ps.statusId);
              if (found) {
                if (found.count < ps.count) {
                  found.count = ps.count;
                }
              } else {
                vup.actual.entity.statuses.push({ statusId: ps.statusId, count: ps.count });
              }
            }
          }
        }
      });
    }
  }
}

export function choose(
  chosen: GameActionSentToClient
) {
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
  uiStateYep.lastMsgFromServer = msg
  syncVisualsToMsg()
  ensureSelectedUnit()
  dispatchBus(uiEvents.rerender)
}

export function ensureSelectedUnit() {
  let validToBeSelected = checkSelectedUnitValid()
  if (!validToBeSelected) return
  uiStateYep.lastUnitClicked = validToBeSelected
}