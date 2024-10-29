import { useState, useEffect, useReducer, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import combatFns from '../utils/combatFns';
import PlayerSchema from "../schemas/PlayerSchema";
import FieldSchema from "../schemas/FieldSchema";
import testdata from '../data/testdata.json';
import enemyData from '../data/enemies.json';
import abiltyData from '../data/abilities.json';
import statusData from '../data/statuses.json';
import PlayersContainer from "../components/PlayersContainer";
import AttackMenu from "../components/AttackMenu";
import Log from "../components/Log";
import ActionQueue from "../components/ActionQueue";
import UserContext from "../data/Context";
import AbilitySchema from "../schemas/AbilitySchema";
import ActionSchema from "../schemas/ActionSchema";
import StatusSchema from "../schemas/StatusSchema";
import PLAYERS_REDUCER_ACTIONS from "../schemas/reducers/PLAYER_REDUCER_ACTIONS";
import accountFns from '../utils/accountFns';
import partyFns from "../utils/partyFns";
import { ref, set } from "firebase/database";
import Inventory from "../components/Inventory";
import ResourceBar from "../components/ResourceBar";

const { 
    getPlayer, getAbility, getAbilityCosts, assignMaxOrMinStat, assignHeal,
    createAction, getTargets, createStatus, getStatus, assignBuffs, getActionValue,
    initiateBattle, connectToBattle, upload, getLoot, assignItem, getXpReceived,
    assignXp, getAbilityRef, assignAbilityLevelStats, getLevelUpReq, assignDamage,
    respawn, checkIfCC, assignStatus, assignShield
} = combatFns;
const { db } = accountFns;
const { uploadParty, leaveParty, syncPartyMemberToAccount } = partyFns;

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
    REPLACE,
}

type ACTION_QUEUE_ACTIONS = {
    type: ACTION_QUEUE_REDUCER_ACTIONS,
    payload: {
        fieldId: string,
        players?: PlayerSchema[],
        action?: ActionSchema,
        replacement? : ActionSchema[],
    } 
}

const sortBySpeed = (actionQueue: ActionSchema[], players: PlayerSchema[]) => {
    const updatedQueue = [];
    const playersSortedBySpeed = [...players].sort((p1, p2) => { 
        const p1Speed = assignBuffs(p1.status, 'speed', p1.stats.combat.speed);
        const p2Speed = assignBuffs(p2.status, 'speed', p2.stats.combat.speed);

        return p2Speed - p1Speed;
    });

    for(const player of playersSortedBySpeed) {
        for(const action of actionQueue) {
            if(action.user === player.pid) updatedQueue.push(action);
        }
    }

    return updatedQueue;
}

const actionQueueReducer = (state: ActionSchema[], action: ACTION_QUEUE_ACTIONS) => {
    const { fieldId } = action.payload;
    const updatedQueue = [...state];

    switch(action.type) {
        case ACTION_QUEUE_REDUCER_ACTIONS.target:
            if(action.payload.action) updatedQueue.push(action.payload.action);
            upload('actionQueue', {actionQueue: updatedQueue, fieldId});
            return [...updatedQueue];
        case ACTION_QUEUE_REDUCER_ACTIONS.REMOVE_TOP:
            updatedQueue.shift();
            return [...updatedQueue];
        case ACTION_QUEUE_REDUCER_ACTIONS.SORT_BY_SPEED:
            return sortBySpeed(updatedQueue, action.payload.players ?? []) ?? [];
        case ACTION_QUEUE_REDUCER_ACTIONS.CLEAR:
            return [];
        case ACTION_QUEUE_REDUCER_ACTIONS.REPLACE:
            return action.payload.replacement ? action.payload.replacement : [];
        default:
            return state;
    }
}

type PLAYERS_ACTIONS = {
    type: PLAYERS_REDUCER_ACTIONS,
    payload: {
        replaceArr?: PlayerSchema[],
        playerObj?: PlayerSchema,
        status?: StatusSchema,
        amount?: number,
        damageType?: string,
        resource?: string,
        pid: string,
        fieldId: string,
    } 
}

const playersReducer = (state: PlayerSchema[], action: PLAYERS_ACTIONS) => {
    const players = [...state];
    const { fieldId, amount, pid, resource, playerObj, damageType, status, replaceArr } = action.payload;
    const player = getPlayer(players, pid);
    const playersOrEnemies = player.state ? player.state.npc ? "enemy" : "player" : null;

    switch(action.type) {
        case PLAYERS_REDUCER_ACTIONS.add_player:
            if(playerObj) players.push(playerObj);
            return [...players];
        case PLAYERS_REDUCER_ACTIONS.revive_player:
            players[player.index].dead = false;
            upload(playersOrEnemies ?? '', { player, fieldId });
            return [...players];
        case PLAYERS_REDUCER_ACTIONS.add_status:
            if(!status) return state;
            players[player.index] = assignStatus(player.state, status, status.name);
            upload(playersOrEnemies ?? '', { player, fieldId });
            return [...players];
        case PLAYERS_REDUCER_ACTIONS.reduce_status_duration:
            if(!status) return state;
            if(status.duration < 1){
                players[player.index].status.splice(getStatus(player.state.status, status.name).index, 1);
            } else {
                players[player.index].status[getStatus(player.state.status, status.name).index].duration -= 1;
            }
            upload(playersOrEnemies ?? '', { player, fieldId });
            return [...players];
        case PLAYERS_REDUCER_ACTIONS.receive_damage:
            if(!damageType || !amount) return state;
            if(damageType === "heal") players[player.index] = assignHeal(player.state, amount, true);
            else if(damageType === "shield") players[player.index] = assignShield(player.state, amount);
            else players[player.index] = assignDamage(player.state, amount);
            upload(playersOrEnemies ?? '', { player, fieldId });
            return assignMaxOrMinStat(player.state, players, player.index);
        case PLAYERS_REDUCER_ACTIONS.resource_change:
            if(resource === "mana"  ) players[player.index].stats.combat.resources.mana.cur -= amount ?? 0;
            if(resource === "health") players[player.index].stats.combat.health.cur -= amount ?? 0
            if(resource === "shield") players[player.index].stats.combat.shield.cur -= amount ?? 0
            if(resource === "psp") players[player.index].stats.combat.resources.psp.cur -= amount ?? 0;
            if(resource === "msp") players[player.index].stats.combat.resources.msp.cur -= amount ?? 0;
            upload(playersOrEnemies ?? '', { player, fieldId });
            return assignMaxOrMinStat(player.state, players, player.index);
        case PLAYERS_REDUCER_ACTIONS.play__attack_animation:
            players[player.index].isAttacking += 1;
            return [...players];
        case PLAYERS_REDUCER_ACTIONS.REPLACE_ALL:
            return replaceArr ? replaceArr : [];
        default:
            return state;
    }
}

export default function Combat() {
    const { character, party, setCharacter, user, setParty } = useContext(UserContext);
    const enemyIds = useContext(UserContext).enemies;
    const setEnemyIds = useContext(UserContext).setEnemies;
    const navigate = useNavigate();

    const [currentTime, setCurrentTime] = useState(0);
    const [loading, setLoading] = useState(true);
    const [inProgress, setInProgress] = useState(false);
    const [isWon, setIsWon] = useState(false);
    const [actionValue, setActionValue] = useState(0);

    /**GAME DATA*/
    const [field, setField] = useState<FieldSchema>({
        id: user?.uid ? party?.players[0]?.pid : "",
        start: false,
        joinedPlayers: 0,
        players: [],
        enemies: [],
        actionQueue: [],
        loot: [],
    });
    const [actionQueue, dispatchActionQueue] = useReducer(actionQueueReducer, field.actionQueue);
    const [players, dispatchPlayers] = useReducer(playersReducer, field.players);
    const [enemies, dispatchEnemies] = useReducer(playersReducer, field.enemies);

    /**CLIENT STATE*/
    const [selectedPlayer, setSelectedPlayer] = useState<{state: PlayerSchema, index: number} | null>({ state: players[0], index: 0 });
    const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
    const [selectedTargetType, setSelectedTargetType] = useState("");
    const [isHost, setIsHost] = useState(user?.uid ? party.players[0].pid === character.pid : false);
    const [loot, setLoot] = useState<{id: string, amount: number}[]>([]);
    const [xp, setXp] = useState(0);
    const [messages, setMessages] = useState<string[]>([]);
    const characterIndex = user?.uid ? getPlayer(party.players, character.pid).index : 0;

    const logMessage = (receivedMessages: string[]) => {
        const updatedGamelog = [...messages];
        receivedMessages.forEach((message) => updatedGamelog.push(message));
        if(updatedGamelog.length > 101) updatedGamelog.shift();
        setMessages(() => updatedGamelog);
    }

    const logSingleMessage = (receivedMessage: string) => {
        const updatedGamelog = [...messages];
        updatedGamelog.push(receivedMessage);
        if(updatedGamelog.length > 101) updatedGamelog.shift();
        setMessages(() => updatedGamelog);
    }

    const initialize = (
        players: PlayerSchema[], 
        enemies: PlayerSchema[], 
        actionQueue: ActionSchema[], 
        fieldId: string, 
        start: boolean,
        joinedPlayers: number,
        loot: {id: string, amount: number, pid: string}[],
    ) => {
        if(players.length) dispatchPlayers({type: PLAYERS_REDUCER_ACTIONS.REPLACE_ALL, payload: { pid: '' , replaceArr: players, fieldId }});
        if(enemies.length) dispatchEnemies({type: PLAYERS_REDUCER_ACTIONS.REPLACE_ALL, payload: { pid: '' , replaceArr: enemies, fieldId }});
        if(actionQueue.length) dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.REPLACE, payload: { replacement: actionQueue, fieldId }});
        if(loot.length) setLoot(() => {
            const yourItems = [];
            for(const item of loot) if(item.pid === character.pid) yourItems.push(item);
            return yourItems;
        });
        setField((prev) => {
            return Object.assign({}, prev, { id: fieldId.length ? fieldId : prev.id, start, joinedPlayers, loot: loot?.length ? loot : []});
        })
    }

    useEffect(() => {
        setField((prev) => Object.assign({}, prev, { players }));
        setCharacter((prev) => Object.assign({}, prev, players[characterIndex]));
    }, [players]);

    useEffect(() => {
        setField((prev) => Object.assign({}, prev, { enemies }));
    }, [enemies]);

    useEffect(() => {
        if(!party?.inCombat) return navigate('/dungeon');
        /*eslint-disable-next-line*/
    }, [party.inCombat]);

    const selectPlayer = (player: { state: PlayerSchema, index: number } | null) => {
        setSelectedPlayer((prev) => {
            if(prev === null || player === null) return player;
            else return prev.state?.pid === player.state.pid ? null : player;
        });
        // if(selectedPlayer) {
        //     setSelectedPlayer(() => null);
        // }
    }

    const selectTarget = (target: string) => {
        const targetPlayer = getPlayer([...players, ...enemies], target)?.state;
        setSelectedTargets((prev) => {
            if(!prev.length || prev[0] !== target) { 
                setSelectedTargetType(() => targetPlayer.npc ? "single" : targetPlayer.pid === character.pid ? "self" : "ally");
                return [target];
            }
            else return [];    
        });
    }

    const selectTargetByAbility = (ability: string) => {
        const filteredPlayers = [...enemies].filter((e) => !e.dead); 
        let enemyWithTaunt: string = "";
        for(const player of filteredPlayers) {
            const hasTaunt = getStatus(player.status, "taunt");
            if(hasTaunt.index > -1) enemyWithTaunt = player.pid; 
        }

        if(ability === "single" && (selectedTargetType !== "single" || enemyWithTaunt)) {
            if(!filteredPlayers.length) return;
            setSelectedTargets(() => {
                return [enemyWithTaunt ? enemyWithTaunt : filteredPlayers[0].pid];
            });
            setSelectedTargetType(() => "single");
        }
        else if(ability === "aoe") {
            setSelectedTargets(() => {
                return Array.from(filteredPlayers, (player) => player.pid);
            });
            setSelectedTargetType(() => "aoe");
        } else if(ability === "ally" && selectedTargetType !== "ally") {
            setSelectedTargets(() => {
                const selectableTargets = [...players].filter((p) => p.pid !== character.pid);
                return selectableTargets.length ? [selectableTargets[0].pid] : [];
            })
            setSelectedTargetType(() => "ally");
        } else if(ability === "self" && selectedTargetType !== "self") {
            setSelectedTargets(() => [character.pid]);
            setSelectedTargetType(() => "self");
        } else if(ability === "ally_all" && selectedTargetType !== "ally_all") {
            setSelectedTargets(() => Array.from([...players], (p) => p.pid));
            setSelectedTargetType(() => "ally_all");
        } else if(ability === "ally_any" && selectedTargetType !== "ally_any") {
            setSelectedTargets(() => [players[0].pid]);
            setSelectedTargetType(() => "ally_any");
        } else if(ability === "field" && selectedTargetType !== "field") {
            setSelectedTargets(() => Array.from([...players, ...enemies], (p) => p.pid));
            setSelectedTargetType(() => "field");
        }
    }

    // const spawnEnemy = useCallback(() => {
    //     const enemyList = enemyData.all;
    //     const { attack, defence, speed, name, health, abilities } = enemyList[0];
                
    //     const newEnemy = createEnemy(name, `E${enemies.length}`, health, abilities, attack, defence, speed, []); 

    //     dispatchEnemies({type: PLAYERS_REDUCER_ACTIONS.add_player, payload: {pid: newEnemy.pid, playerObj: newEnemy}})
    // }, [enemies]);

    const matchKeyToAmount = (key: string, ability: AbilitySchema) => {
        switch(key) {
            case "mana":
                return ability.cost.mana;
            case "health":
                if(!ability.cost.health) return 0;
                return Math.ceil((character.stats.combat.health.max / 100) * ability.cost.health);
            case "shield":
                if(!ability.cost.shield) return 0;
                return Math.ceil((character.stats.combat.shield.max / 100) * ability.cost.shield);
            case "psp":
                return ability.cost.psp;
            case "msp":
                return ability.cost.msp;
        }
        return 0;
    }

    const target = useCallback((targets: string[], ability: AbilitySchema) => {
        const exceptions = ["OH05", "OH06"];
        if(ability.av > actionValue && !exceptions.includes(ability.id)) return;
        const action = createAction(ability.name, character.pid, targets);
        for(const resourceName of getAbilityCosts(ability.id)) {
            const amount = matchKeyToAmount(resourceName, ability);
            dispatchPlayers({
                type: PLAYERS_REDUCER_ACTIONS.resource_change, 
                payload: { pid: character.pid, amount: amount, resource: resourceName, fieldId: field.id  }
            });
            if(amount && (resourceName === "psp" || resourceName === "msp")) {
                const oppositeName = resourceName === "psp" ? "msp" : "psp";
                dispatchPlayers({
                    type: PLAYERS_REDUCER_ACTIONS.resource_change, 
                    payload: { pid: character.pid, amount: (amount * -1), resource: oppositeName, fieldId: field.id  }
                });
            }
        }
        setActionValue((prev) => prev ? prev - ability.av : 0);
        dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.target, payload: { action, fieldId: field.id}});
    }, [dispatchActionQueue, character, actionValue, field.id]);

    const checkIfBattleOver = useCallback(() => {
        const side1 = [...enemies];
        const side2 = [...players];
        const count = [0, 0]
        for(const p of side1) if(p.dead) count[0]++;
        for(const p of side2) if(p.dead) count[1]++;
        if(count[0] >= side1.length) {
            setInProgress(() => false);
            setIsWon(() => true);
        } else if(count[1] >= side2.length) {
            setInProgress(() => false);
        }
    }, [players, enemies]);

    const playerTargetsEnemy = (
        userId: string, damageType: string, amount: number, targets: string[], 
        i: number, abilityId: string,
    ) => {  
        dispatchPlayers({
            type: PLAYERS_REDUCER_ACTIONS.play__attack_animation, 
            payload: { pid: userId, fieldId: field.id }
        });
        if(!isHost) return;      
        dispatchEnemies({
            type: PLAYERS_REDUCER_ACTIONS.receive_damage, 
            payload: { pid: targets[i], amount, damageType, fieldId: field.id }
        }); 
        if(damageType === "status") {
            const { name, type, duration, amount, affects, refs } = getStatus([...statusData.all] as StatusSchema[], abilityId).state
            const status: StatusSchema = createStatus(name, type, amount, duration, affects, refs);
            const user = getPlayer(players, userId);
            const abilityLevel = getAbilityRef(user.state, abilityId).state.level;
            status.amount += abilityLevel
            const chance = Math.floor(Math.random() * 101);
            if(type === "cc" && chance + amount < 100) return; 
            dispatchEnemies({
                type: PLAYERS_REDUCER_ACTIONS.add_status,
                payload: { pid: targets[i], amount, damageType, status: { ...status }, fieldId: field.id }
            })
        }
    }

    const playerTargetsPlayer = (
        userId: string, damageType: string, amount: number, targets: string[],
        i: number, abilityId: string,
    ) => {
        if(!isHost) return;
        dispatchPlayers({
            type: PLAYERS_REDUCER_ACTIONS.receive_damage,
            payload: { pid: targets[i], amount, damageType, fieldId: field.id }
        });
        if(damageType === "status") {
            const { name, type, duration, amount, affects, refs } = getStatus([...statusData.all] as StatusSchema[], abilityId).state
            const status: StatusSchema = createStatus(name, type, amount, duration, affects, refs);
            const user = getPlayer(players, userId);
            const abilityLevel = getAbilityRef(user.state, abilityId).state.level;
            status.amount += abilityLevel
            const chance = Math.floor(Math.random() * 101);
            if(type === "cc" && chance + amount < 100) return; 
            dispatchPlayers({
                type: PLAYERS_REDUCER_ACTIONS.add_status,
                payload: { pid: targets[i], amount, damageType, status, fieldId: field.id }
            })
        }
    }

    const enemyTargetsPlayer = (
        userId: string, damageType: string, amount: number, targets: string[], 
        i: number, abilityId: string,
    ) => {
        dispatchEnemies({
            type: PLAYERS_REDUCER_ACTIONS.play__attack_animation, 
            payload: { pid: userId, fieldId: field.id }
        });
        if(!isHost) return;
        dispatchPlayers({
            type: PLAYERS_REDUCER_ACTIONS.receive_damage,
            payload: {pid: targets[i], amount, damageType, fieldId: field.id }
        });
        if(damageType === "status") {
            const { name, type, duration, amount, affects, refs } = getStatus([...statusData.all] as StatusSchema[], abilityId).state
            const status: StatusSchema = createStatus(name, type, amount, duration, affects, refs);
            const user = getPlayer(enemies, userId);
            const abilityLevel = getAbilityRef(user.state, abilityId).state.level;
            status.amount += abilityLevel
            const chance = Math.floor(Math.random() * 101);
            if(type === "cc" && chance + amount < 100) return; 
            dispatchPlayers({
                type: PLAYERS_REDUCER_ACTIONS.add_status,
                payload: { pid: targets[i], amount, damageType, status, fieldId: field.id }
            })
        }
    }

    const enemyTargetsEnemy = (
        userId: string, damageType: string, amount: number, targets: string[], 
        i: number, abilityId: string,
    ) => {
        if(!isHost) return;
        dispatchEnemies({
            type: PLAYERS_REDUCER_ACTIONS.receive_damage,
            payload: { pid: targets[i], amount, damageType, fieldId: field.id }
        });
        if(damageType === "status") {
            const { name, type, duration, amount, affects, refs } = getStatus([...statusData.all] as StatusSchema[], abilityId).state
            const status: StatusSchema = createStatus(name, type, amount, duration, affects, refs);
            const user = getPlayer(enemies, userId);
            const abilityLevel = getAbilityRef(user.state, abilityId).state.level;
            status.amount += abilityLevel
            const chance = Math.floor(Math.random() * 101);
            if(type === "cc" && chance + amount < 100) return; 
            dispatchEnemies({
                type: PLAYERS_REDUCER_ACTIONS.add_status,
                payload: { pid: targets[i], amount, damageType, status: { ...status }, fieldId: field.id }
            })
        }
    }

    const getDamageFormula = (user: PlayerSchema, target: PlayerSchema, abilityDamage: number, abilityLevel: number) => {
        let attack = user.stats.combat.attack;
        let defence = target.stats.combat.defence;

        attack = assignBuffs(user.status, 'attack', attack);
        defence = assignBuffs(target.status, 'defence', defence);

        const updatedAbilityDamage = assignAbilityLevelStats(abilityDamage, abilityLevel, "damage");
        const damage = Math.floor((attack) * (updatedAbilityDamage / 100)) - defence;
        return damage > 0 ? damage : 1;
    }

    const chooseLogMessage = (damageType: string, name: string, amount: number, status: string) => {
        let message = "";
        if(damageType === "damage") message = `${name} took ${amount} damage`;
        else if(damageType === "heal") message = `${name} has received ${amount} of healing`;
        else if(damageType === "status") message = `${name} has received the status ${status}`
        return message;
    }

    const attack = useCallback((userId: string, targets: string[], ability: AbilitySchema) => {
        const user = getPlayer([...players, ...enemies], userId).state;
        const abilityRef = getAbilityRef(user, ability.id).state;
        const { damageType } = ability;

        const messagesToLog = [];
        if(!user.dead) {
            messagesToLog.push(`${user.name} uses ${ability.name}`);
        }

        targets.forEach((targetRef: string, i: number) => {
            if(user.dead) return;
            const target = getPlayer([...players, ...enemies], targetRef);
            let amount = (
                damageType === "heal" || damageType === "shield"
                    ? ability.damage + (abilityRef.level * 3)
                    : getDamageFormula(user, target.state, ability.damage, abilityRef.level)
            );
            
            if(damageType === "status" && ability.damage < 1) amount = 0;
            if(damageType === "damage") {
                const lifesteal = getStatus(user.status, "lifesteal"); 
                if(lifesteal.index > -1) {
                    if(!user.npc) {
                        dispatchPlayers({
                            type: PLAYERS_REDUCER_ACTIONS.receive_damage,
                            payload: {pid: userId, amount: Math.ceil((lifesteal.state.amount / 100) * amount), damageType: "heal", fieldId: field.id }
                        });
                    } else {
                        dispatchEnemies({
                            type: PLAYERS_REDUCER_ACTIONS.receive_damage,
                            payload: {pid: userId, amount: Math.ceil((lifesteal.state.amount / 100) * amount), damageType: "heal", fieldId: field.id }
                        });
                    }
                }

                const reflect = getStatus(target.state.status, "reflect");
                if(reflect.index > -1) {
                    if(!user.npc) {
                        dispatchPlayers({
                            type: PLAYERS_REDUCER_ACTIONS.receive_damage,
                            payload: {pid: userId, amount: Math.ceil((reflect.state.amount / 100) * amount), damageType: "damage", fieldId: field.id }
                        });
                    } else {
                        dispatchEnemies({
                            type: PLAYERS_REDUCER_ACTIONS.receive_damage,
                            payload: {pid: userId, amount: Math.ceil((reflect.state.amount / 100) * amount), damageType: "damage", fieldId: field.id }
                        });
                    }
                } 
            }
            // I05 is revive
            if(target.state.dead && ability.id !== "I05") return;
            messagesToLog.push(chooseLogMessage(damageType, target.state.name, amount, ability.name));

            if(target.state.npc && !user.npc) {
                playerTargetsEnemy(userId, damageType, amount, targets, i, ability.id);
            }
            else if(!target.state.npc && user.npc) {
                enemyTargetsPlayer(userId, damageType, amount, targets, i, ability.id);
            }
            else if(!target.state.npc && !user.npc) {
                playerTargetsPlayer(userId, damageType, amount, targets, i, ability.id);
            }
            else if(target.state.npc && user.npc) {
                enemyTargetsEnemy(userId, damageType, amount, targets, i, ability.id);
            }
        });

        logMessage(messagesToLog);
        dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.REMOVE_TOP, payload: { fieldId: field.id }});
    }, [players, enemies]);

    const procDot = useCallback((unit: PlayerSchema) => {
        for(const state of unit.status) {
            if(unit.npc) {
                dispatchEnemies({
                    type: PLAYERS_REDUCER_ACTIONS.reduce_status_duration,
                    payload: {
                        fieldId: field.id,
                        pid: unit.pid,
                        status: state,
                    }
                });
                if(state.type !== 'dot' && state.type !== 'hot' && state.type !== 'sot') continue; 
                dispatchEnemies({
                    type: PLAYERS_REDUCER_ACTIONS.receive_damage,
                    payload: {
                        fieldId: field.id,
                        pid: unit.pid,
                        amount: state.amount,
                        damageType: state.type === "dot" ? "damage" : state.type === "sot" ? "shield" : "heal",
                    }
                });
                if(state.name === "revival") dispatchEnemies({type: PLAYERS_REDUCER_ACTIONS.revive_player, payload: {fieldId: field.id, pid: unit.pid }})
            } else {
                if(state.name === "overheat" && state.duration === 0) {
                    dispatchPlayers({
                        type: PLAYERS_REDUCER_ACTIONS.resource_change,
                        payload: {
                            fieldId: field.id,
                            pid: unit.pid,
                            resource: "psp",
                            amount: unit.stats.combat.resources.psp.cur,
                        }
                    });
                }
                if(state.name === "overload" && state.duration === 0) {
                    dispatchPlayers({
                        type: PLAYERS_REDUCER_ACTIONS.resource_change,
                        payload: {
                            fieldId: field.id,
                            pid: unit.pid,
                            resource: "msp",
                            amount: unit.stats.combat.resources.msp.cur,
                        }
                    });
                }
                dispatchPlayers({
                    type: PLAYERS_REDUCER_ACTIONS.reduce_status_duration,
                    payload: {
                        fieldId: field.id,
                        pid: unit.pid,
                        status: state,
                    }
                });
                if(state.type !== 'dot' && state.type !== 'hot' && state.type !== 'sot') continue; 
                dispatchPlayers({
                    type: PLAYERS_REDUCER_ACTIONS.receive_damage,
                    payload: {
                        fieldId: field.id,
                        pid: unit.pid,
                        amount: state.amount,
                        damageType: state.type === "dot" ? "damage" : state.type === "sot" ? "shield" : "heal",
                    }
                });
                if(state.name === "revival") dispatchPlayers({type: PLAYERS_REDUCER_ACTIONS.revive_player, payload: {fieldId: field.id, pid: unit.pid }})
            }
        }
    }, [field.id]);

    const endTurn = useCallback(() => {
        setActionValue(() => getActionValue(getPlayer(players, character.pid).state));
        if(!isHost) return;
        players.forEach((player) => {
            const status = getStatus(player.status, "rain");
            let amount = -1 * Math.floor(player.stats.combat.resources.mana.max / 10);
            if(status.index > -1) amount += Math.ceil(status.state.amount / 2);
            dispatchPlayers({
                type: PLAYERS_REDUCER_ACTIONS.resource_change, 
                payload: { 
                    pid: player.pid,
                    fieldId: players[0].pid,
                    resource: "mana",
                    amount,
                }
            });
            const isCharge = getStatus(player.status, "charge");
            const chargeChance = Math.floor(Math.random() * 101); 
            if(isCharge.index > -1 && chargeChance + isCharge.state.amount > 100) {
                dispatchPlayers({
                    type: PLAYERS_REDUCER_ACTIONS.resource_change, 
                    payload: { 
                        pid: player.pid,
                        fieldId: players[0].pid,
                        resource: "msp",
                        amount: -1,
                    }
                });
            }
            procDot(player);
        });
        enemies.forEach((enemy) => {
            procDot(enemy);
        });
    }, [players, enemies, procDot, character, isHost]);

    const enemySelectAttack = useCallback(() => {
        if(!isHost) return;
        dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.target, payload: { action: {ability: 'sort', user: 'N/A', targets: [] }, fieldId: field.id }})
        enemies.forEach((enemy) => {
            if(enemy.dead || checkIfCC(enemy)) return;
            let av = getActionValue(enemy);
            while(av > 0) {
                const ran = Math.floor(Math.random() * enemy.abilities.length);
                const ability = getAbility(enemy.abilities[ran].id);
                if(!ability) continue;
                const targets = getTargets(ability.name, ability.type === "field" ? [...players, ...enemies] : ability.type === 'ally' || ability.type === "ally_all" || ability.type === "ally_any" ? enemies : players, enemy.pid);
                const action = createAction(ability.name, enemy.pid, [...targets]); 
                dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.target, payload: { action, fieldId: field.id }});
                av -= ability.av;
            }
        });
    }, [players, enemies, isHost, field.id]);

    const sortQueue = useCallback(() => {
        dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.SORT_BY_SPEED, payload: { players: [...players, ...enemies], fieldId: field.id }})
    }, [players, enemies, field.id]);
    
    useEffect(() => {
        if(field.start && !isWon) {
            setInProgress(() => true);
        }
    }, [field.start]);

    const functionForBelowMe = async () => {
        if(!user?.uid) return navigate('/');
        if(isHost && loading) {
            const newField = await initiateBattle([...players, character]);
            setField((field) => Object.assign({}, field, { ...newField }));
            setLoading(() => false);
        }
        await connectToBattle(initialize, party);
    }

    useEffect(() => {
        if(!user?.uid) return navigate('/');
        functionForBelowMe();
        /*eslint-disable-next-line*/
    }, []);

    useEffect(() => {
        if(!inProgress) return;
        const interval = setInterval(() => {
            cb(attack, enemySelectAttack, checkIfBattleOver, actionQueue, sortQueue, endTurn);
            setCurrentTime(battleTimer.initTime);
        }, 24);

        return () => clearInterval(interval);
    }, [attack, inProgress, enemySelectAttack, checkIfBattleOver, actionQueue, sortQueue, endTurn]);

    const dummyLoot = async () => {
        const loot = getLoot(field.enemies);
        const assignedLoot: {id: string, amount: number, pid: string}[] = [];
        for(const item of loot) {
            const ran = Math.floor(Math.random() * field.players.length);
            const convertedItem = { id: item.id, amount: item.amount, pid: field.players[ran].pid };
            assignedLoot.push(convertedItem);
        }
        await upload("loot", { loot: assignedLoot, fieldId: field.id});
    }

    const dummyXp = () => {
        let totalXp = 0;
        for(const enemy of field.enemies) {
            const xp = getXpReceived(enemy, party);
            totalXp += xp;
        }
        setXp(() => totalXp);
    }

    const assignLoot = async () => {
        for(const item of field.loot) {
            const convertedItem = { id: item.id, amount: item.amount };
            const player = getPlayer(field.players, item.pid);
            const updatedPlayer = assignItem(player.state, convertedItem);
            if(!player || !updatedPlayer) return;
            await upload("player", { fieldId: field.id, player: { state: updatedPlayer, index: player.index} });
        }
    }

    const lootAndSync = async () => {
        await assignLoot();
        for(let i = 0; i < field.players.length; i++) {
            let updatedPlayer = {...field.players[i]};
            for(const enemy of field.enemies) {
                const xp = getXpReceived(enemy, party);
                updatedPlayer = assignXp(updatedPlayer, xp);    
            }
            await upload("player", { fieldId: field.id, player: { state: updatedPlayer, index: i} });
        }
        await uploadParty("players", { partyId: field.id, players: field.players });
    }

    const respawnParty = async() => {
        if(!isHost) return;
        const updatedPartyPlayers = [];
        for(const player of party.players) {
            const respawnedPlayer = await respawn(player);
            updatedPartyPlayers.push(respawnedPlayer);
        }
        await uploadParty('players', { partyId: party.players[0].pid, players: updatedPartyPlayers });
        for(const player of updatedPartyPlayers) {
            await syncPartyMemberToAccount(player);
        }

        await uploadParty('enemies', { partyId: party.players[0].pid, enemyIds: [] });
        await uploadParty('inCombat', { partyId: party.players[0].pid, isInCombat: false });
        await uploadParty('wasInCombat', { partyId: party.players[0].pid, isInCombat: false });
        await uploadParty('location', { partyId: party.players[0].pid, location: { ...party.location, map: "-1" } });
    }

    useEffect(() => {
        if(isWon) dummyXp();
        if(isWon && isHost) {
            dummyLoot();
        }
    }, [isWon]);

    const getTime = () => {
        return currentTime / 10;
    }

    const props = {
        selectedTargets,
        selectPlayer,
        selectTarget,
        selectTargetByAbility
    }

    return (
        <div className={`combat_page ${character.dead ? 'screen_dead' : ''}`} >
            <AttackMenu 
                {...props}
                selectedPlayer={{state: character, index: -1}}
                target={target}
                actionValue={actionValue}
            />
            <PlayersContainer
                {...props}
                players={field.enemies}
                sideIndex={1}
            />
            <PlayersContainer
                {...props}
                players={field.players}
                sideIndex={2}
            />
            <Log 
                messages={messages}
            />
            <ActionQueue 
                actionQueue={actionQueue}
                players={field.players}
                enemies={field.enemies}
            />
            <div className="cen-flex">
                <div className="battleTimer">
                    <div style={{width: getTime()}} className="fill" />
                </div>
            </div>
            { loot.length && isWon
            ?
            <Inventory 
                inventory={loot}
                position="center"
                buttons={[]}
                limit={100}
                logMessage={logSingleMessage}
                toggleOff={ async () => { 
                    setLoot(() => []);
                }}
            />
            : xp > 0 && isWon
            &&
            <div className="inventory character_profile menu center_abs_hor" >
                <h1 className="menu_title_text">{character.name}</h1>
                <p>Lvl: {character.stats.level} Rank: {character.stats.rank}</p>
                <ResourceBar 
                    max={getLevelUpReq(character.stats.level, character.stats.rank)}
                    cur={character.stats.xp + xp}
                    index={0}
                    type={"xp"}
                />
                <p>received: {xp} XP</p>
                <button
                    className="menu_btn"
                    onClick={async () => {
                        await lootAndSync();
                        await uploadParty('enemies', { partyId: party.players[0].pid, enemyIds: [] });
                        await uploadParty('inCombat', { partyId: party.players[0].pid, isInCombat: false });
                    }}
                    disabled={!isHost}
                >
                        Return
                </button>
            </div>
            }
            {character.dead
            &&
            <button
                className="menu_btn center_abs_hor"
                style={{bottom: "50px", position: "absolute"}}
                onClick={() => respawnParty()}
                disabled={!isHost}
            >
                Respawn
            </button>
            }
            {/* <button style={{position: "absolute", zIndex: 5}} onClick={() => console.log(actionQueue)}>action queue</button> */}
            <button style={{position: "absolute", zIndex: 5}} onClick={() => console.log({players, enemies})}>enemies</button>
            {/* <button style={{position: "absolute", zIndex: 5, transform: "translateY(100px)"}} onClick={() => spawnEnemy()}>spawn enemies</button> */}
            <button style={{position: "absolute", zIndex: 5, transform: "translateY(200px)"}} onClick={() => setInProgress((e) => !e)}>pause</button>        
            <button style={{position: "absolute", zIndex: 5, transform: "translateY(300px)"}} onClick={() => { 
                    sortBySpeed(actionQueue, [...players, ...enemies]);
                    console.log(actionQueue);
                }}
            >sort</button>   
            <button style={{position: "absolute", zIndex: 5, transform: "translateY(400px)"}} onClick={() => { 
                    const test = ref(db, `/test`);
                    set(test, false);
                }}
            >dbtest</button>        
        </div>
    )
}