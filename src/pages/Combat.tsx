import { useState, useEffect, useReducer, useCallback, useContext } from "react";
import combatFns from '../utils/combatFns';
import PlayerSchema from "../schemas/PlayerSchema";
import FieldSchema from "../schemas/FieldSchema";
import testdata from '../data/testdata.json';
import enemyData from '../data/enemies.json';
import abiltyData from '../data/abilities.json';
import statusData from '../data/statuses.json';
import PlayersContainer from "../components/PlayersContainer";
import AttackMenu from "../components/AttackMenu";
import UserContext from "../data/Context";
import AbilitySchema from "../schemas/AbilitySchema";
import ActionSchema from "../schemas/ActionSchema";
import StatusSchema from "../schemas/StatusSchema";

const { 
    getPlayer, getAbility, getAbilityCosts, assignMaxOrMinStat, createEnemy,
    createAction, getTargets, createStatus, getStatus
} = combatFns;

const battleTimer = {
    initTime: 0,
    procTime: 0,
    delay: 10000,
    done: true,
}

const actionTimer = {
    initTime: 0,
    procTime: 0,
    delay: 700,
    done: true,
}

const setBattleTimer = (timer: { initTime: number, procTime: number, done: boolean, delay: number }) => {
    const time = Date.now();
    timer.procTime = time + timer.delay;
    timer.done = false;
}

setBattleTimer(battleTimer);

const cb = (
    attack: (userId: string, targets: string[], ability: AbilitySchema) => void, 
    enemySelectAttack: () => void, 
    checkIfBattleOver: () => void, 
    actionQueue: ActionSchema[], 
    sortQueue: () => void,
    endTurn: () => void,
) => {
    const { procTime } = battleTimer;
    const currentTime = Date.now();
    battleTimer.initTime = procTime - currentTime;
    if(currentTime > procTime) { 
        if(actionQueue.length > 0) {
            takeAction(actionQueue, attack, sortQueue);
            return;
        }
        if(currentTime < actionTimer.procTime) return;
        enemySelectAttack();
        endTurn();
        battleTimer.done = true;
    }
    if(battleTimer.initTime > 9000) checkIfBattleOver();
    if(battleTimer.done) setBattleTimer(battleTimer);
}

const takeAction = (actionQueue: ActionSchema[], attack, sortQueue) => {
    const { procTime } = actionTimer;
    const currentTime = Date.now();

    if(currentTime > procTime) {
        const updatedQueue = [...actionQueue];
        const thisAction = updatedQueue.shift();
        setBattleTimer(actionTimer);
        if(thisAction?.ability === "sort") return sortQueue();
        attack(thisAction?.user, thisAction?.targets, getAbility(thisAction?.ability ?? ''));
    }
}

const enum ACTION_QUEUE_REDUCER_ACTIONS {
    target,
    REMOVE_TOP,
    SORT_BY_SPEED,
    CLEAR,
}

type ACTION_QUEUE_ACTIONS = {
    type: ACTION_QUEUE_REDUCER_ACTIONS,
    payload: {
        players?: PlayerSchema[],
        action?: ActionSchema
    } 
}

const sortBySpeed = (actionQueue: ActionSchema[], players: PlayerSchema[]) => {
    const updatedQueue = [];
    const playersSortedBySpeed = [...players].sort((p1, p2) => p2.stats.combat.speed - p1.stats.combat.speed);

    for(const player of playersSortedBySpeed) {
        for(const action of actionQueue) {
            if(action.user === player.pid) updatedQueue.push(action);
        }
    }

    return updatedQueue;
}

const actionQueueReducer = (state: ActionSchema[], action: ACTION_QUEUE_ACTIONS) => {
    const updatedQueue = [...state];

    switch(action.type) {
        case ACTION_QUEUE_REDUCER_ACTIONS.target:
            if(action.payload.action) updatedQueue.push(action.payload.action);
            return [...updatedQueue];
        case ACTION_QUEUE_REDUCER_ACTIONS.REMOVE_TOP:
            updatedQueue.shift();
            return [...updatedQueue];
        case ACTION_QUEUE_REDUCER_ACTIONS.SORT_BY_SPEED:
            return sortBySpeed(updatedQueue, action.payload.players ?? []) ?? [];
        case ACTION_QUEUE_REDUCER_ACTIONS.CLEAR:
            return [];
        default:
            return state;
    }
}

const enum PLAYERS_REDUCER_ACTIONS {
    add_player,
    add_status,
    reduce_status_duration,
    receive_damage,
    resource_change,
    play__attack_animation,
}

type PLAYERS_ACTIONS = {
    type: PLAYERS_REDUCER_ACTIONS,
    payload: {
        playerObj?: PlayerSchema,
        status?: StatusSchema,
        amount?: number,
        damageType?: string,
        resource?: string,
        pid: string,
    } 
}

const playersReducer = (state: PlayerSchema[], action: PLAYERS_ACTIONS) => {
    const players = [...state];
    const { amount, pid, resource, playerObj, damageType, status } = action.payload;
    const player = getPlayer(players, pid);

    switch(action.type) {
        case PLAYERS_REDUCER_ACTIONS.add_player:
            if(playerObj) players.push(playerObj);
            return [...players];
        case PLAYERS_REDUCER_ACTIONS.add_status:
            if(!status) return state;
            if(getStatus(player.state.status, status.name).index > -1) {
                // refresh duration on already applied status //
                players[player.index].status.splice(getStatus(player.state.status, status.name).index, 1);
            }
            players[player.index].status.push(status); 
            return [...players];
        case PLAYERS_REDUCER_ACTIONS.reduce_status_duration:
            if(!status) return state;
            if(status.duration < 1){
                players[player.index].status.splice(getStatus(player.state.status, status.name).index, 1);
            } else {
                players[player.index].status[getStatus(player.state.status, status.name).index].duration -= 1;
            }
            return [...players];
        case PLAYERS_REDUCER_ACTIONS.receive_damage:
            if(!damageType || !amount) return state;
            players[player.index].stats.combat.health.cur -= damageType === "heal" ? amount * -1 : amount ?? 0;
            return assignMaxOrMinStat(player.state, players, player.index);
        case PLAYERS_REDUCER_ACTIONS.resource_change:
            if(resource === "mana"  ) players[player.index].stats.combat.resources.mana.cur -= amount ?? 0;
            if(resource === "health") players[player.index].stats.combat.health.cur -= amount ?? 0
            return assignMaxOrMinStat(player.state, players, player.index);
        case PLAYERS_REDUCER_ACTIONS.play__attack_animation:
            players[player.index].isAttacking += 1;
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
        players: [user, testdata.ally_1],
        enemies: [],
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
        if(ability === "single") {
            if(!filteredPlayers.length) return;
            setSelectedTargets(() => [filteredPlayers[0].pid]);
        }
        else if(ability === "aoe") {
            setSelectedTargets(() => {
                return Array.from(filteredPlayers, (player) => player.pid);
            });
        } else if(ability === "ally") {
            setSelectedTargets(() => {
                return [[...players].filter((p) => p.pid !== user.pid)[0].pid];
            })
        } else if(ability === "self") {
            setSelectedTargets(() => [user.pid]);
        }
    }

    const spawnEnemy = useCallback(() => {
        const enemyList = enemyData.all;
        const { attack, defence, speed, name, health, abilities } = enemyList[0];
                
        const newEnemy = createEnemy(name, `E${enemies.length}`, health, abilities, attack, defence, speed); 

        dispatchEnemies({type: PLAYERS_REDUCER_ACTIONS.add_player, payload: {playerObj: newEnemy}})
        setInProgress(() => true);
    }, [enemies]);

    const matchKeyToAmount = (key: string, ability: AbilitySchema) => {
        switch(key) {
            case "mana":
                return ability.cost.mana;
            case "health":
                return ability.cost.health;
        }
        return;
    }

    const target = useCallback((targets: string[], ability: AbilitySchema) => {
        const action = createAction(ability.name, user.pid, targets);
        for(const resourceName of getAbilityCosts(ability.id)) {
            const amount = matchKeyToAmount(resourceName, ability);
            dispatchPlayers({
                type: PLAYERS_REDUCER_ACTIONS.resource_change, 
                payload: { pid: user.pid, amount: amount ? amount / 2 : 0, resource: resourceName  }
            });
        }
        dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.target, payload: { action}});
    }, [dispatchActionQueue, user]);

    const checkIfBattleOver = useCallback(() => {
        const side1 = [...enemies];
        const side2 = [...players];
        const count = [0, 0]
        for(const p of side1) if(p.dead) count[0]++;
        for(const p of side2) if(p.dead) count[1]++;
        if(count[0] >= side1.length || count[1] >= side2.length) {
            setInProgress(() => false);
        }        
    }, [players, enemies]);

    const getDamageFormula = (attack: number, defence: number, abilityDamage: number) => {
        const damage = Math.floor(((attack / 4) * abilityDamage)) - defence;
        return damage > 0 ? damage : 1;
    }

    const playerTargetsEnemy = (
        userId: string, damageType: string, amount: number, targets: string[], 
        i: number, abilityId: string,
    ) => {        
        dispatchEnemies({
            type: PLAYERS_REDUCER_ACTIONS.receive_damage, 
            payload: { pid: targets[i], amount, damageType }
        }); 
        dispatchPlayers({
            type: PLAYERS_REDUCER_ACTIONS.play__attack_animation, 
            payload: { pid: userId }
        });
        if(damageType === "status") {
            const { name, type, duration, amount } = getStatus([...statusData.all] as StatusSchema[], abilityId).state
            const status: StatusSchema = createStatus(name, type, amount, duration);
            console.log(status);
            dispatchEnemies({
                type: PLAYERS_REDUCER_ACTIONS.add_status,
                payload: { pid: targets[i], amount, damageType, status: { ...status } }
            })
        }
    }

    const playerTargetsPlayer = (
        userId: string, damageType: string, amount: number, targets: string[],
        i: number,
    ) => {
        dispatchPlayers({
            type: PLAYERS_REDUCER_ACTIONS.receive_damage,
            payload: { pid: targets[i], amount, damageType }
        }); 
    }

    const enemyTargetsPlayer = (
        userId: string, damageType: string, amount: number, targets: string[], 
        i: number, abilityId: string,
    ) => {
        dispatchPlayers({
            type: PLAYERS_REDUCER_ACTIONS.receive_damage,
            payload: {pid: targets[i], amount, damageType }})
        dispatchEnemies({
            type: PLAYERS_REDUCER_ACTIONS.play__attack_animation, 
            payload: { pid: userId }
        });
        if(damageType === "status") {
            const { name, type, duration, amount } = getStatus([...statusData.all] as StatusSchema[], abilityId).state
            const status: StatusSchema = createStatus(name, type, amount, duration);
            console.log('a', {status});
            dispatchPlayers({
                type: PLAYERS_REDUCER_ACTIONS.add_status,
                payload: { pid: targets[i], amount, damageType, status }
            })
        }
    }

    const enemyTargetsEnemy = (
        userId: string, damageType: string, amount: number, targets: string[], 
        i: number 
    ) => {
        dispatchEnemies({
            type: PLAYERS_REDUCER_ACTIONS.receive_damage,
            payload: { pid: targets[i], amount, damageType }
        });
    }

    const attack = useCallback((userId: string, targets: string[], ability: AbilitySchema) => {
        const user = getPlayer([...players, ...enemies], userId).state;
        const { damageType } = ability;

        targets.forEach((targetRef: string, i: number) => {
            const target = getPlayer([...players, ...enemies], targetRef);
            const targetStats = target.state.stats.combat;
            const amount = (
                damageType === "heal" 
                    ? ability.damage / 2
                    : getDamageFormula(user.stats.combat.attack, targetStats.defence, ability.damage)
            );

            if(target.state.npc && !user.npc) {
                playerTargetsEnemy(userId, damageType, amount, targets, i, ability.id);
            }
            else if(!target.state.npc && user.npc) {
                enemyTargetsPlayer(userId, damageType, amount, targets, i, ability.id);
            }
            else if(!target.state.npc && !user.npc) {
                playerTargetsPlayer(userId, damageType, amount, targets, i);
            }
            else if(target.state.npc && user.npc) {
                enemyTargetsEnemy(userId, damageType, amount, targets, i);
            }
        });
        dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.REMOVE_TOP, payload: {}});
    }, [players, enemies]);

    const procDot = useCallback((unit: PlayerSchema) => {
        for(const state of unit.status) {
            if(state.type !== 'dot') return; 
            if(unit.npc) {
                dispatchEnemies({
                    type: PLAYERS_REDUCER_ACTIONS.reduce_status_duration,
                    payload: {
                        pid: unit.pid,
                        status: state,
                    }
                });
                dispatchEnemies({
                    type: PLAYERS_REDUCER_ACTIONS.receive_damage,
                    payload: {
                        pid: unit.pid,
                        amount: state.amount,
                        damageType: "damage",
                    }
                });
            } else {
                dispatchPlayers({
                    type: PLAYERS_REDUCER_ACTIONS.reduce_status_duration,
                    payload: {
                        pid: unit.pid,
                        status: state,
                    }
                });
                dispatchPlayers({
                    type: PLAYERS_REDUCER_ACTIONS.receive_damage,
                    payload: {
                        pid: unit.pid,
                        amount: state.amount,
                        damageType: "damage",
                    }
                });
            }
        }
    }, [])

    const endTurn = useCallback(() => {
        players.forEach((player, index) => {
            dispatchPlayers({
                type: PLAYERS_REDUCER_ACTIONS.resource_change, 
                payload: { 
                    pid: player.pid, 
                    resource: "mana",
                    amount: -1 * Math.floor(player.stats.combat.resources.mana.max / 10)
                }
            });
            procDot(player);
        });
        enemies.forEach((enemy, index) => {
            procDot(enemy);
        });
    }, [players, enemies, procDot]);

    const enemySelectAttack = useCallback(() => {
        dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.target, payload: { action: {ability: 'sort', user: 'N/A', targets: [] },  }})
        enemies.forEach((enemy) => {
            if(enemy.dead) return;
            const ran = Math.floor(Math.random() * enemy.abilities.length);
            const abilityName = enemy.abilities[ran].name;
            const targets = getTargets(abilityName, players, enemies, enemy.pid);
            const action = createAction(abilityName, enemy.pid, [...targets]);
            dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.target, payload: { action }});
        });
    }, [players, enemies]);

    const sortQueue = useCallback(() => {
        dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.SORT_BY_SPEED, payload: { players: [...players, ...enemies] }})
    }, [players, enemies]);

    useEffect(() => {
        if(!inProgress) return;
        const interval = setInterval(() => {
            cb(attack, enemySelectAttack, checkIfBattleOver, actionQueue, sortQueue, endTurn);
            setCurrentTime(battleTimer.initTime);
        }, 24);

        return () => clearInterval(interval);
    }, [attack, inProgress, enemySelectAttack, checkIfBattleOver, actionQueue, sortQueue, endTurn]);

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
            <button style={{position: "absolute", zIndex: 5}} onClick={() => console.log({enemies, players})}>enemies</button>
            <button style={{position: "absolute", zIndex: 5, transform: "translateY(100px)"}} onClick={() => spawnEnemy()}>spawn enemies</button>
            <button style={{position: "absolute", zIndex: 5, transform: "translateY(200px)"}} onClick={() => setInProgress((e) => !e)}>pause</button>        
            <button style={{position: "absolute", zIndex: 5, transform: "translateY(300px)"}} onClick={() => { 
                    sortBySpeed(actionQueue, [...players, ...enemies]);
                    console.log(actionQueue);
                }}
            >sort</button>        
        </div>
    )
}