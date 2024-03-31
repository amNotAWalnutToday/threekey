import { useState, useEffect, useReducer, useCallback } from "react";
import PlayerSchema from "../schemas/PlayerSchema";
import FieldSchema from "../schemas/FieldSchema";
import testdata from '../data/testdata.json';

const battleTimer = {
    initTime: 0,
    procTime: 0,
    done: true,
}

const setBattleTimer = () => {
    const time = Date.now();
    battleTimer.procTime = time + 10000;
    battleTimer.done = false;
}

setBattleTimer();

const cb = (attack) => {
    const { procTime } = battleTimer;
    const currentTime = Date.now();
    battleTimer.initTime = procTime - currentTime;
    if(currentTime > procTime) { 
        attack();
        battleTimer.done = true;
    }
    if(battleTimer.done) setBattleTimer();
}

const enum ACTION_QUEUE_REDUCER_ACTIONS {
    target,
    CLEAR,
}

type ACTION_QUEUE_ACTIONS = {
    type: ACTION_QUEUE_REDUCER_ACTIONS,
    payload: {
        action: any
    } 
}

const actionQueueReducer = (state, action: ACTION_QUEUE_ACTIONS) => {
    switch(action.type) {
        case ACTION_QUEUE_REDUCER_ACTIONS.target:
            console.log(state);
            return [...state, {...action.payload.action}];
        case ACTION_QUEUE_REDUCER_ACTIONS.CLEAR:
            return [];
        default:
            return state;
    }
}

const getPlayer = (players: PlayerSchema[], pid: string) => {
    for(let i = 0; i < players.length; i++) {
        if(pid === players[i].pid) return {state: players[i], index: i};
    }
    return {state: players[0], index: -1};
}

const enum PLAYERS_REDUCER_ACTIONS {
    receive_damage,
}

type PLAYERS_ACTIONS = {
    type: PLAYERS_REDUCER_ACTIONS,
    payload: {
        pid: string
    } 
}

const playersReducer = (state, action: PLAYERS_ACTIONS) => {
    const players = [...state];
    const player = getPlayer(players, action.payload.pid);
    if(player.index < 0) return state;

    switch(action.type) {
        case PLAYERS_REDUCER_ACTIONS.receive_damage:
            players[player.index].stats.combat.health.cur -= 5;
            return [...players];
        default:
            return state;
    }
}

export default function Combat() {
    const [currentTime, setCurrentTime] = useState(0);

    const [field, setField] = useState<FieldSchema>({
        players: [testdata.user1, testdata.user2],
        actionQueue: [],
    });
    const [actionQueue, dispatchActionQueue] = useReducer(actionQueueReducer, field.actionQueue);
    const [players, dispatchPlayers] = useReducer(playersReducer, field.players);

    const [player, setPlayer] = useState<PlayerSchema>(testdata.user1);
    
    const [enemy, setEnemy] = useState<PlayerSchema>(testdata.user2);

    const target = useCallback((targets: string[]) => {
        const action = {
            ability: "attack",
            targets,
        }
        dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.target, payload: { action}});
    }, [dispatchActionQueue]);

    const attack = useCallback(() => {
        players.forEach((player) => {
            if(player.npc) {
                dispatchPlayers({type: PLAYERS_REDUCER_ACTIONS.receive_damage, payload: {pid: '1'}})
            }
        });
        actionQueue.forEach((action) => {
            dispatchPlayers({type: PLAYERS_REDUCER_ACTIONS.receive_damage, payload: {pid: action.targets[0]}})
        });
        dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.CLEAR, payload: {action: null}})
    }, [actionQueue, players, dispatchPlayers]);

    useEffect(() => {
        const interval = setInterval(() => {
            cb(attack);
            setCurrentTime(battleTimer.initTime);
        }, 24);

        return () => clearInterval(interval);
    }, [attack, target]);

    const getTime = () => {
        return currentTime / 10;
    }

    return (
        <div>
            <div className="player">
                <div className="emptyBar">
                    <div style={{width: player.stats.combat.health.cur}} className="health">
                      <p style={{fontSize: "10px"}} >{player.stats.combat.health.cur} / {player.stats.combat.health.max}</p>
                    </div>
                </div>
            </div>
            <div onClick={() => console.log(players[1])} className="enemy player">
                <div className="emptyBar">
                    <div style={{width: enemy.stats.combat.health.cur}} className="health">
                        <p style={{fontSize: "10px"}} >{enemy.stats.combat.health.cur} / {enemy.stats.combat.health.max}</p>
                    </div>
                </div>
            </div>
            <div className="cen-flex">
                <div className="battleTimer">
                    <div style={{width: getTime()}} className="fill"></div>
                </div>
            </div>
            <button onClick={() => target(['2'])}>Attack</button>
            <button onClick={() => attack()}>con</button>
        </div>
    )
}