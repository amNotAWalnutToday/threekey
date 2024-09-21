import { useState, useEffect, useReducer, useCallback, useContext } from "react";
import PlayerSchema from "../schemas/PlayerSchema";
import FieldSchema from "../schemas/FieldSchema";
import testdata from '../data/testdata.json';
import PlayersContainer from "../components/PlayersContainer";
import AttackMenu from "../components/AttackMenu";
import UserContext from "../data/Context";

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

const cb = (attack, enemySelectAttack) => {
    const { procTime } = battleTimer;
    const currentTime = Date.now();
    battleTimer.initTime = procTime - currentTime;
    if(currentTime > procTime) { 
        attack();
        enemySelectAttack();
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
        action: {
            ability: string,
            user: string, 
            targets: number[],
        }
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
        amount?: number,
        pid: string
    } 
}

const playersReducer = (state, action: PLAYERS_ACTIONS) => {
    const players = [...state];
    const { amount, pid } = action.payload;
    const player = getPlayer(players, pid);
    if(player.index < 0) return state;

    switch(action.type) {
        case PLAYERS_REDUCER_ACTIONS.receive_damage:
            players[player.index].stats.combat.health.cur -= amount ?? 0;
            player.state.stats.combat.health.cur <= 0 ? players[player.index].dead = true : null;
            return [...players];
        default:
            return state;
    }
}

export default function Combat() {
    const { user } = useContext(UserContext);

    const [currentTime, setCurrentTime] = useState(0);
    const [inProgress, setInProgress] = useState(true);

    /**GAME DATA*/
    const [field, setField] = useState<FieldSchema>({
        players: [user],
        enemies: [testdata.user2],
        actionQueue: [],
    });
    const [actionQueue, dispatchActionQueue] = useReducer(actionQueueReducer, field.actionQueue);
    const [players, dispatchPlayers] = useReducer(playersReducer, field.players);
    const [enemies, dispatchEnemies] = useReducer(playersReducer, field.enemies);

    /**CLIENT STATE*/
    const [selectedPlayer, setSelectedPlayer] = useState<{state: PlayerSchema, index: number} | null>({ state: players[0], index: 0 });
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
        const filteredPlayers = [...enemies]; 
        if(ability === "single" && selectedTargets.length > 1) {
            setSelectedTargets((prev) => [filteredPlayers[0].pid]);
        }
        else if(ability === "aoe") {
            setSelectedTargets((prev) => {
                return Array.from(filteredPlayers, (player) => player.pid);
            });
        } else if(ability === "ally") {
            setSelectedTargets((prev) => {
                return [...players][0].pid;
            })
        } else if(ability === "self") {
            setSelectedTargets((prev) => user.pid);
        }
    }

    const target = useCallback((targets: string[]) => {
        const action = {
            ability: "attack",
            user: user.pid,
            targets,
        }
        dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.target, payload: { action}});
    }, [dispatchActionQueue, user]);

    const checkIfBattleOver = useCallback(() => {
        const side1 = [...enemies];
        const side2 = [...players];
        const count = [0, 0]
        for(const p of side1) if(p.dead) count[0]++;
        for(const p of side2) if(p.dead) count[1]++;
        if(count[0] >= side1.length || count[1] >= side2.length) setInProgress(() => false);        
    }, [players, enemies]);

    const attack = useCallback(() => {
        checkIfBattleOver();

        actionQueue.forEach((action) => {
            const user = getPlayer([...players, ...enemies], action.user).state;
            action.targets.forEach((targetRef: string, i: number) => {
                const target = getPlayer([...players, ...enemies], targetRef);
                const targetStats = target.state.stats.combat;
                const amount = user.stats.combat.attack - targetStats.defence;
                if(target.state.npc) dispatchEnemies({type: PLAYERS_REDUCER_ACTIONS.receive_damage, payload: {pid: action.targets[i], amount}}); 
                else dispatchPlayers({type: PLAYERS_REDUCER_ACTIONS.receive_damage, payload: {pid: action.targets[i], amount }})
            });
        });
        
        dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.CLEAR, payload: {action: null}});
    }, [actionQueue, players, enemies, dispatchPlayers, checkIfBattleOver]);

    const enemySelectAttack = useCallback(() => {
        enemies.forEach((enemy) => {
            const action = {
                ability: "attack",
                user: "2",
                targets: [user.pid],
            }
            dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.target, payload: { action }});
        })
    }, [enemies, user]);

    useEffect(() => {
        if(!inProgress) return;
        const interval = setInterval(() => {
            cb(attack, enemySelectAttack);
            setCurrentTime(battleTimer.initTime);
        }, 24);

        return () => clearInterval(interval);
    }, [attack, inProgress, enemySelectAttack]);

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
                players={enemies}
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
            {/* <button style={{position: "absolute", zIndex: 5}} onClick={() => console.log(actionQueue)}>action queue</button> */}
        </div>
    )
}