import { useState, useEffect, useReducer, useCallback } from "react";
import PlayerSchema from "../schemas/PlayerSchema";
import FieldSchema from "../schemas/FieldSchema";
import testdata from '../data/testdata.json';
import PlayersContainer from "../components/PlayersContainer";
import AttackMenu from "../components/AttackMenu";

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

    /**GAME DATA*/
    const [field, setField] = useState<FieldSchema>({
        players: [testdata.user1, testdata.user2, testdata.user3],
        actionQueue: [],
    });
    const [actionQueue, dispatchActionQueue] = useReducer(actionQueueReducer, field.actionQueue);
    const [players, dispatchPlayers] = useReducer(playersReducer, field.players);

    /**CLIENT STATE*/
    const [selectedPlayer, setSelectedPlayer] = useState<{state: PlayerSchema, index: number} | null>(null);
    const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

    const selectPlayer = (player: { state: PlayerSchema, index: number } | null) => {
        setSelectedPlayer((prev) => {
            if(prev === null || player === null) return player;
            else return prev.state.pid === player.state.pid ? null : player;
        });
        // if(selectedPlayer) {
        //     setSelectedPlayer(() => null);
        // }
    }

    const selectTarget = (target: string) => {
        setSelectedTargets((prev) => {
            if(!prev.length || prev[0] !== target) return [target];
            else return [];    
        });
    }

    const selectTargetByAbility = (ability: string) => {
        const filteredPlayers = [...players].filter((player) => player.npc); 
        if(ability === "single" && selectedTargets.length > 1) {
            setSelectedTargets((prev) => [filteredPlayers[0].pid]);
        }
        else if(ability === "aoe") {
            setSelectedTargets((prev) => {
                return Array.from(filteredPlayers, (player) => player.pid);
            });
        }
    }

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
            action.targets.forEach((target, i) => {
                dispatchPlayers({type: PLAYERS_REDUCER_ACTIONS.receive_damage, payload: {pid: action.targets[i]}})
            });
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

    const props = {
        players,
        selectedTargets,
        selectPlayer,
        selectTarget,
        selectTargetByAbility
    }

    return (
        <div>
            <AttackMenu 
                {...props}
                selectedPlayer={selectedPlayer}
                target={target}
            />
            <PlayersContainer
                {...props}
                sideIndex={1}
            />
            <PlayersContainer
                {...props}
                sideIndex={2}
            />
            <div className="cen-flex">
                <div className="battleTimer">
                    <div style={{width: getTime()}} className="fill"></div>
                </div>
            </div>
            <button style={{position: "absolute", zIndex: 5}} onClick={() => console.log(actionQueue)}>action queue</button>
        </div>
    )
}