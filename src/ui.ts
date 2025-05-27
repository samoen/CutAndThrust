import { users, type Flag, type HeroName, type PlayerInClient } from './users';

import type { ItemId, ItemState } from './items';
import { handlePlayerAction, updateAllPlayerActions, type VisualActionSourceInClient } from './logic';
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
import { bus, imageBackgroundImg, putUnit, units1, yourSceneLabel, type EventDetail } from './main';

type HeroSpecificEnemyState = { hName: HeroName; agg: number; sts: StatusState[] };

type UnitDetails =
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

export const clientState = {
  waitingForMyEvent: false,
  status: 'starting up',
  loading: true
};

export type UIVas = VisualActionSourceInClient & { actionsInClient: GameActionSentToClient[] };

export let waitingForMyAnimation = false;
export let lastMsgFromServer: MessageFromServer | undefined = undefined;
export let allVisualUnitProps: VisualUnitProps[] = [];
export let visualActionSources: UIVas[] = [];
export let currentAnimationIndex: number = 999;
export let currentAnimationsWithData: BattleAnimation[] = [];
export let subAnimationStage: 'start' | 'fire' | 'sentHome' = 'start';
export let convoStateForEachVAS:
  Map<SceneDataId, Map<VisualActionSourceId, ConvoState>
  > = new Map();
export const latestSlotButtonInput: ItemId | undefined = undefined;
export const lastUnitClicked: UnitId | 'background' | undefined = undefined;
export let visualLandscape: LandscapeImage = 'plains';
export let visualOpacity = false;
export let visualSceneLabel = 'nowhere';
export const successcreds: SignupResponse | undefined = undefined;


export const allies = () => {
  const calAllies = allVisualUnitProps.filter((v) => v.actual.kind == 'player');
  return calAllies;
};

export const enemies = () => {
  return allVisualUnitProps.filter((p) => p.actual.kind == 'enemy');
};

export const vasesToShow = () => {
  return visualActionSources.filter((s) => {
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

export const currentAnimation = () => {
  return currentAnimationsWithData?.at(currentAnimationIndex);
}

export function actionsForSlot(
  lm: MessageFromServer | undefined,
  iId: ItemId
): GameActionSentToClient[] {
  if (!lm) return [];
  return lm.itemActions.filter((ia) => ia.itemId == iId);
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
    if (!lastMsgFromServer) {
      return inventory;
    }
    for (const state of lastMsgFromServer.yourInfo.inventory) {
      const acts = actionsForSlot(lastMsgFromServer, state.stats.id);
      const d = !acts.length || waitingForMyAnimation || clientState.waitingForMyEvent;
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
  | { kind: 'vup'; entity: VisualUnitProps }
  | { kind: 'vas'; entity: UIVas }
  | { kind: 'bg' };

export const selectedDetail: () => DetailWindow | undefined = () => {
  if (lastUnitClicked == 'background') {
    return { kind: 'bg' } satisfies DetailWindow;
  }

  const vupAt = allVisualUnitProps.find((v) => v.actual.entity.unitId == lastUnitClicked);
  if (vupAt) return { kind: 'vup', entity: vupAt } satisfies DetailWindow;

  const vasAt = vasesToShow().find((v) => v.id == lastUnitClicked);
  if (vasAt) return { kind: 'vas', entity: vasAt } satisfies DetailWindow;

  // if last unit clicked not valid, fall back to first enemy
  const firstEnemy = allVisualUnitProps.find((v) => v.actual.kind == 'enemy');
  if (firstEnemy) return { kind: 'vup', entity: firstEnemy } satisfies DetailWindow;

  // if no enemies fall back to first unlocked vas with an unlock action or response

  let firstVas = undefined;
  outer: for (const vas of vasesToShow()) {
    const csForE = convoStateForEachVAS.get(vas.scene);
    if (!csForE) continue;
    const cs = csForE.get(vas.id);
    if (!cs) continue;
    // if (cs.kind != 'seen') continue
    for (const act of vas.actionsInClient) {
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
    return { kind: 'vas', entity: firstVas } satisfies DetailWindow;
  }

  // if no unlocked vas fall back to self
  const me = allVisualUnitProps.at(0);
  if (me) return { kind: 'vup', entity: me } satisfies DetailWindow;

  return undefined;
}


export const selectedVisualActionSourceState =
  () => {
    let selectedDetail2 = selectedDetail()
    if (!selectedDetail2 || selectedDetail2.kind != 'vas') return undefined;
    const csForE = convoStateForEachVAS.get(selectedDetail2.entity.scene);
    if (!csForE) return undefined;
    const state = csForE.get(selectedDetail2.entity.id);
    if (!state) {
      return undefined;
    }
    return state;
  }

export const selectedVasResponsesToShow =
  () => {
    let selectedDetail2 = selectedDetail()
    let selectedVisualActionSourceState2 = selectedVisualActionSourceState()
    if (!selectedDetail2 || !selectedVisualActionSourceState2 || selectedDetail2.kind != 'vas')
      return [];

    return selectedDetail2.entity.responses.filter((r) => {
      if (!r.responseId) return true;
      const locked = selectedVisualActionSourceState2.lockedResponseHandles.get(r.responseId);
      return !locked;
    });
  }

export const selectedVasActionsToShow =
  () => {
    let selectedDetail2 = selectedDetail()
    let selectedVisualActionSourceState2 = selectedVisualActionSourceState()
    if (!selectedDetail2 || !selectedVisualActionSourceState2 || selectedDetail2.kind != 'vas')
      return [];

    return selectedDetail2.entity.actionsInClient.filter((r) => {
      return true;
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

export function syncVisualsToMsg(lastMsgFromServ: MessageFromServer | undefined) {
  // do this here for some reason
  waitingForMyAnimation = false
  currentAnimationIndex = 999

  const lastMsg = structuredClone(lastMsgFromServ);
  if (!lastMsg) {
    console.log('tried to sync with bad msg');
  }
  if (lastMsg) {

    visualLandscape = lastMsg.landscape;
    visualSceneLabel = lastMsg.yourInfo.currentSceneDisplay
    yourSceneLabel.textContent = lastMsg.yourInfo.currentSceneDisplay

    const newVups: VisualUnitProps[] = [];
    // console.log(`I am class ${lastMsg.yourInfo.class}`)

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
    for (const p of lastMsg.otherPlayers) {
      newVups.push({
        sprite: heroSpriteFromClass(p.class),
        portrait: getHeroPortrait(p.class),
        actual: {
          kind: 'player',
          entity: p
        },
        actionsThatCanTargetMe: lastMsg.itemActions.filter((a) => a.associateWithUnit == p.unitId)
      });
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
    bus.dispatchEvent(new CustomEvent('ping', {
      detail: { 
        allVisualUnitProps: newVups,
        uiVases: uiVases,
      } satisfies EventDetail
    }));
  }
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

export const centerFieldTarget =
  () => {
    let currentAnimation2 = currentAnimation()
    if (!currentAnimation2) return undefined;
    if (currentAnimation2.behavior.kind == 'center' && subAnimationStage == 'fire') {
      return { projectileImg: anySprites[currentAnimation2.behavior.extraSprite] };
    }
    return undefined;
  }

export type AnimsInWaiting = { prev: MessageFromServer; withAnims: MessageFromServer };
export let animationsInWaiting: AnimsInWaiting | undefined = undefined;

export async function nextAnimationIndex(start: boolean, someoneDied: boolean) {
  visualOpacity = false;
  const curAnimations = currentAnimationsWithData;
  const latest = lastMsgFromServer;
  if (!latest) {
    console.log('tried next anim but last msg from server undefined!');
    currentAnimationIndex = 999;
    waitingForMyAnimation = false;
    return;
  }
  let cai = currentAnimationIndex;
  let prevAnim = curAnimations.at(cai)

  if (start) {
    cai = 0;
  } else {
    cai++;
  }
  currentAnimationIndex = cai;

  if (cai > curAnimations.length - 1) {
    const animsInWaiting = animationsInWaiting;
    if (!animsInWaiting) {
      // give some time for enemies slain on the last animation to fade out.
      if (prevAnim && (prevAnim.behavior.kind == 'center' || prevAnim.behavior.kind == 'missile')) {
        await new Promise((r) => setTimeout(r, 300));
      }
      syncVisualsToMsg(latest);
      console.log('finished animating');
      return;
    }
    if (animsInWaiting) {
      // console.log('playing anims in waiting')
      animationsInWaiting = undefined;
      syncVisualsToMsg(animsInWaiting.prev);
      startAnimating(animsInWaiting.withAnims);
      return;
    }

    return;
  }

  const nextAnim = curAnimations.at(cai);
  if (!nextAnim || !checkAnimationValid(nextAnim)) {
    console.log('invalid next anim!');
    syncVisualsToMsg(latest);
    return;
  }

  if (nextAnim.behavior.kind == 'travel' || nextAnim.teleporting) {
    if (nextAnim.source == latest?.yourInfo.unitId) {
      visualOpacity = true;
    }
  }

  subAnimationStage = 'start';

  subAnimationStage = 'fire';
}

function checkAnimationValid(ba: BattleAnimation): boolean {
  const enemiesToCheck = enemies;
  const alliesToCheck = allies();
  const vasesToCheck = vasesToShow;

  const foundSource =
    enemiesToCheck().some((e) => e.actual.entity.unitId == ba.source) ||
    alliesToCheck.some((a) => a.actual.entity.unitId == ba.source);
  let foundTarget = false;
  // const cb = ba.behavior;
  if (ba.animateTo) {
    foundTarget =
      enemiesToCheck().some((e) => e.actual.entity.unitId == ba.animateTo) ||
      alliesToCheck.some((a) => a.actual.entity.unitId == ba.animateTo) ||
      vasesToCheck().some((v) => v.id == ba.animateTo);
  } else {
    foundTarget = true;
  }

  return foundSource && foundTarget;
}

export async function choose(
  chosen: GameActionSentToClient
) {
  clientState.waitingForMyEvent = true;
  clientState.status = 'submitting action';

  let toChoose: GameActionSelected = { buttonText: chosen.buttonText }

  const player = users.get("me");
  if (!player) return
  const actionFromId = [...player.devActions, ...player.itemActions, ...player.vasActions].find(
    (g) => g.buttonText == chosen.buttonText
  );
  if (!actionFromId) {
    return
  }
  player.animations = [];
  handlePlayerAction(player, actionFromId);
  updateAllPlayerActions()
  let msg = buildNextMessage(player, player.unitId)
  worldReceived(msg)

  clientState.status = 'playing';
  clientState.waitingForMyEvent = false;
}

function isMsgFromServer(msg: object): msg is MessageFromServer {
  return 'triggeredBy' in msg;
}

function handleAnimationsOnMessage(
  previous: MessageFromServer | undefined,
  latest: MessageFromServer
) {
  const currentAnim = currentAnimation();
  // console.log(`got animations: ${JSON.stringify(latest.animations)}`);

  // first message just sync instant
  if (!previous) {
    console.log('first message, just sync it');
    if (currentAnim) {
      throw Error('first message but animating already, should be impossible');
      // await cancelAnimations();
    }
    syncVisualsToMsg(latest);
    return;
  }

  // my message with no animations
  if (
    latest.triggeredBy === latest.yourInfo.unitId &&
    !latest.animations.length &&
    currentAnim != undefined
  ) {
    console.log(
      'my message with no animations, but we are animating. Ignore, it will be synced when current anims finish'
    );
    return;
  }

  // someone else's message and we are animating
  if (latest.triggeredBy != latest.yourInfo.unitId && currentAnim != undefined) {
    console.log(
      `someone else message but ignoring because we are animating: ${JSON.stringify(currentAnim)}`
    );
    return;
  }

  // anyone's message with no animations and not animating
  if (currentAnim == undefined && !latest.animations.length) {
    // console.log('Anyones message with no animations and not animating, just sync');
    syncVisualsToMsg(latest);
    return;
  }

  // My message with animations but animation is in progress
  if (
    latest.animations.length &&
    currentAnim != undefined &&
    latest.triggeredBy == latest.yourInfo.unitId
  ) {
    console.log(
      'My message with anims but we are animating. store these anims to play once current is done'
    );
    animationsInWaiting = { prev: previous, withAnims: latest };
    // await cancelAnimations();
    // syncVisualsToMsg(previous);
    // await startAnimating(previous, latest);
    return;
  }

  // console.log(`precheck start anim ${JSON.stringify($currentAnimation)}`)

  // new animations and we aren't animating, start animating
  if (latest.animations.length && currentAnim == undefined) {
    console.log('anyones message, we not animating. starting');
    // await cancelAnimations();
    syncVisualsToMsg(previous);
    startAnimating(latest);
    return;
  }
  // syncVisualsToMsg(latest);
  console.log('no specific anim handling, ignore');
}

function startAnimating(msgWithAnims: MessageFromServer) {
  currentAnimationsWithData = msgWithAnims.animations;
  if (msgWithAnims.animations.length && msgWithAnims.triggeredBy == msgWithAnims.yourInfo.unitId) {
    console.log('start waiting my anim');
    waitingForMyAnimation = true;
  }
  // console.log(`starting anims ${JSON.stringify(msgWithAnims.animations)}`);
  nextAnimationIndex(true, false);
}

export async function worldReceived(sMsg: MessageFromServer) {
  const prevMsg = structuredClone(lastMsgFromServer);
  lastMsgFromServer = sMsg;
  handleAnimationsOnMessage(prevMsg, sMsg);
}
