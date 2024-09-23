import { useState, useEffect, useReducer, useCallback, useContext } from "react";
import PlayerSchema from "../schemas/PlayerSchema";
import FieldSchema from "../schemas/FieldSchema";
import testdata from '../data/testdata.json';
import enemyData from '../data/enemies.json';
import abiltyData from '../data/abilities.json';
import PlayersContainer from "../components/PlayersContainer";
import AttackMenu from "../components/AttackMenu";
import UserContext from "../data/Context";
import AbilitySchema from "../schemas/AbilitySchema";
import ActionSchema from "../schemas/ActionSchema";

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

const cb = (attack, enemySelectAttack, checkIfBattleOver, actionQueue: ActionSchema[], sortQueue) => {
    const { procTime } = battleTimer;
    const currentTime = Date.now();
    battleTimer.initTime = procTime - currentTime;
    if(currentTime > procTime) { 
        if(actionQueue.length > 0) {
            takeAction(actionQueue, attack, sortQueue);
            return;
        }
        enemySelectAttack();
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
        action: {
            ability: string,
            user: string, 
            targets: number[],
        }
    } 
}

const sortBySpeed = (actionQueue, players) => {
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
            // console.log(state);
            return [...state, {...action.payload.action}];
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

const getPlayer = (players: PlayerSchema[], pid: string) => {
    for(let i = 0; i < players.length; i++) {
        if(pid === players[i].pid) return {state: players[i], index: i};
    }
    return {state: players[0], index: -1};
}

const getAbility = (id: string) => {
    for(const ability of abiltyData.all) {
        if(id === ability.id || id === ability.name) return ability;
    }
}

const getAbilityCosts = (abilityId: string) => {
    const ability = getAbility(abilityId);
    if(!ability) return []; 

    const usedResources = [];
    for(const cost in ability.cost) usedResources.push(cost);
    return usedResources;
}

const enum PLAYERS_REDUCER_ACTIONS {
    add_player,
    receive_damage,
    resource_change,
    play__attack_animation,
}

type PLAYERS_ACTIONS = {
    type: PLAYERS_REDUCER_ACTIONS,
    payload: {
        playerObj?: PlayerSchema,
        amount?: number,
        damageType?: string,
        resource?: string,
        pid: string,
    } 
}

const playersReducer = (state, action: PLAYERS_ACTIONS) => {
    const players = [...state];
    const { amount, pid, resource, playerObj, damageType } = action.payload;
    const player = getPlayer(players, pid);

    switch(action.type) {
        case PLAYERS_REDUCER_ACTIONS.add_player:
            return [...players, {...playerObj}];
        case PLAYERS_REDUCER_ACTIONS.receive_damage:
            if(!damageType || !amount) return state;
            players[player.index].stats.combat.health.cur -= damageType === "heal" ? amount * -1 : amount ?? 0;
            player.state.stats.combat.health.cur <= 0 ? players[player.index].dead = true : null;
            return [...players];
        case PLAYERS_REDUCER_ACTIONS.resource_change:
            if(resource === "mana"  ) players[player.index].stats.combat.resources.mana.cur -= amount ?? 0;
            if(resource === "health") players[player.index].stats.combat.health.cur -= amount ?? 0
            return [...players];
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
        players: [user],
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

    const spawnEnemy = useCallback(() => {
        const enemyList = enemyData.all;
        const { attack, defence, speed, debuffs, name } = enemyList[0];
        const health = {
            max: enemyList[0].health,
            cur: enemyList[0].health
        }
        
        const abilities = [];
        for(const id of enemyList[0].abilities) abilities.push(getAbility(id));
        
        const newEnemy = {
            name,
            pid: `E${enemies.length}`,
            npc: true,
            dead: false,
            isAttacking: 0,
            stats: {
                combat: {
                    health,
                    abilities,
                    attack,
                    defence,
                    speed: ((enemies.length + 1) * 10) - speed, 
                    debuffs,
                },
            },
        }
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
        const action = {
            ability: ability.name,
            user: user.pid,
            targets,
        }
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

    const getDamageFormula = (attack, defence, abilityDamage) => {
        const damage = Math.floor(((attack / 4) * abilityDamage)) - defence;
        return damage > 0 ? damage : 1;
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
                // player attacks enemy //
                dispatchEnemies({
                    type: PLAYERS_REDUCER_ACTIONS.receive_damage, 
                    payload: { pid: targets[i], amount, damageType }
                }); 
                dispatchPlayers({
                    type: PLAYERS_REDUCER_ACTIONS.play__attack_animation, 
                    payload: { pid: userId }
                });
            }
            else if(!target.state.npc && user.npc) {
                // enemy attacks player //
                dispatchPlayers({
                    type: PLAYERS_REDUCER_ACTIONS.receive_damage,
                    payload: {pid: targets[i], amount, damageType }})
                dispatchEnemies({
                    type: PLAYERS_REDUCER_ACTIONS.play__attack_animation, 
                    payload: { pid: userId }
                });
            }
            else if(!target.state.npc && !user.npc) {
                // player attacks ally //
                dispatchPlayers({
                    type: PLAYERS_REDUCER_ACTIONS.receive_damage,
                    payload: { pid: targets[i], amount, damageType }
                });
            }
            else if(target.state.npc && user.npc) {
                // enemey attacks enemy //
            }
        });
        dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.REMOVE_TOP, payload: {action: null}});
    }, [players, enemies]);

    const enemySelectAttack = useCallback(() => {
        dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.target, payload: { action: {ability: 'sort', user: 'N/A', targets: [] },  }})
        enemies.forEach((enemy) => {
            const action = {
                ability: "seed shot",
                user: enemy.pid,
                targets: [user.pid],
            }
            dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.target, payload: { action }});
        })
    }, [enemies, user]);

    const sortQueue = useCallback(() => {
        dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.SORT_BY_SPEED, payload: { players: [...players, ...enemies], action: null }})
    }, [players, enemies]);

    useEffect(() => {
        if(!inProgress) return;
        const interval = setInterval(() => {
            cb(attack, enemySelectAttack, checkIfBattleOver, actionQueue, sortQueue);
            setCurrentTime(battleTimer.initTime);
        }, 24);

        return () => clearInterval(interval);
    }, [attack, inProgress, enemySelectAttack, checkIfBattleOver, actionQueue, sortQueue]);

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