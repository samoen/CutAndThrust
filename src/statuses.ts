import type { AnySprite } from './utils';
import type { UnitStat } from './users';

// export type StatusId = 'poison' | 'rage' | 'hidden'
export type StatusId = string;
export type Prettify<T> = {
	[K in keyof T]: T[K];
  } & {};
export type StatusDataKey = Prettify< keyof StatusData>

export type StatusData = {
	id: StatusId;
	damagesEachTurn?: {perc : number, minDmg:number};
	healsEachTurn?: number;
	eachTurnSprite?: AnySprite;
	giveBonus?:{stat:UnitStat, amount:number, accumulates?:boolean, persists?:boolean}
	disarmors?:boolean;
	untargetable?: boolean;
	protects?:boolean;
	removeOnProvoke?: boolean;
	decayAnyPlayer?:boolean;
	bad?:boolean;
	// statusSprite:AnySprite;
};

export const PROTECT_LIMIT = 4

export const statusDatas: StatusData[] = [
	{
		id: 'poisoned',
		damagesEachTurn: {perc:0.25,minDmg: 5},
		eachTurnSprite: 'poison',
		bad:true,
	},
	{
		id: 'vulnerable',
		disarmors:true,
		decayAnyPlayer:true,
		bad:true,
	},
	{
		id: 'blessed',
		healsEachTurn: 10,
		eachTurnSprite: 'heal',
	},
	{
		id: 'rage',
		giveBonus:{stat:'strength',amount:5,accumulates:true},
		eachTurnSprite: 'flame'
	},
	{
		id: 'fervor',
		giveBonus:{stat:'mind',amount:5,accumulates:true, persists:true},
		eachTurnSprite: 'flame'
	},
	{
		id: 'hidden',
		untargetable: true,
		removeOnProvoke: true,
		eachTurnSprite: 'smoke',
		decayAnyPlayer:true,
	},
	{
		id: 'protected',
		protects:true,
		eachTurnSprite: 'shield',
		decayAnyPlayer:true,
		removeOnProvoke:true,
	},
];
