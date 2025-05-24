import { updateAllPlayerActions } from './logic';
import { sendEveryoneWorld } from './messaging';
import { users } from './users';
import { handlePlayerAction } from './logic';
import type { GameActionSelected } from './utils';


export function sendAction(msg : GameActionSelected){
    const player = users.get("me");
    if(!player)return
  	const actionFromId = [...player.devActions, ...player.itemActions, ...player.vasActions].find(
		(g) => g.buttonText == msg.buttonText
	);
  	if (!actionFromId) {
		return
	}
	player.animations = [];
	handlePlayerAction(player, actionFromId);
  updateAllPlayerActions()
  sendEveryoneWorld(player.unitId)
}