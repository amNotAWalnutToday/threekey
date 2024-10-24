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

const { 
    getPlayer, getAbility, getAbilityCosts, assignMaxOrMinStat, createEnemy,
    createAction, getTargets, createStatus, getStatus, assignBuffs, getActionValue,
    initiateBattle, connectToBattle, upload, getLoot, assignItem, getXpReceived,
    assignXp, getAbilityRef, getAbilityLevelEffect
} = combatFns;
const { db } = accountFns;
const { uploadParty } = partyFns;

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
        case PLAYERS_REDUCER_ACTIONS.add_status:
            if(!status) return state;
            if(getStatus(player.state.status, status.name).index > -1) {
                // refresh duration on already applied status //
                players[player.index].status.splice(getStatus(player.state.status, status.name).index, 1);
            }
            players[player.index].status.push(status);
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
            players[player.index].stats.combat.health.cur -= damageType === "heal" ? amount * -1 : amount ?? 0;
            upload(playersOrEnemies ?? '', { player, fieldId });
            return assignMaxOrMinStat(player.state, players, player.index);
        case PLAYERS_REDUCER_ACTIONS.resource_change:
            if(resource === "mana"  ) players[player.index].stats.combat.resources.mana.cur -= amount ?? 0;
            if(resource === "health") players[player.index].stats.combat.health.cur -= amount ?? 0
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
    const { character, party, setCharacter, user } = useContext(UserContext);
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
    });
    const [actionQueue, dispatchActionQueue] = useReducer(actionQueueReducer, field.actionQueue);
    const [players, dispatchPlayers] = useReducer(playersReducer, field.players);
    const [enemies, dispatchEnemies] = useReducer(playersReducer, field.enemies);

    /**CLIENT STATE*/
    const [selectedPlayer, setSelectedPlayer] = useState<{state: PlayerSchema, index: number} | null>({ state: players[0], index: 0 });
    const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
    const [selectedTargetType, setSelectedTargetType] = useState("");
    const [isHost, setIsHost] = useState(user?.uid ? party.players[0].pid === character.pid : false);
    const [messages, setMessages] = useState<string[]>([]);
    const characterIndex = user?.uid ? getPlayer(party.players, character.pid).index : 0;

    const logMessage = (message: string) => {
        const updatedGamelog = [...messages];
        updatedGamelog.push(message);
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
    ) => {
        if(players.length) dispatchPlayers({type: PLAYERS_REDUCER_ACTIONS.REPLACE_ALL, payload: { pid: '' , replaceArr: players, fieldId }});
        if(enemies.length) dispatchEnemies({type: PLAYERS_REDUCER_ACTIONS.REPLACE_ALL, payload: { pid: '' , replaceArr: enemies, fieldId }});
        if(actionQueue.length) dispatchActionQueue({type: ACTION_QUEUE_REDUCER_ACTIONS.REPLACE, payload: { replacement: actionQueue, fieldId }});
        setField((prev) => {
            return Object.assign({}, prev, { id: fieldId.length ? fieldId : prev.id, start, joinedPlayers })
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
        const filteredPlayers = [...enemies]; 
        if(ability === "single" && selectedTargetType !== "single") {
            if(!filteredPlayers.length) return;
            setSelectedTargets(() => [filteredPlayers[0].pid]);
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
                return ability.cost.health;
        }
        return;
    }

    const target = useCallback((targets: string[], ability: AbilitySchema) => {
        if(ability.av > actionValue) return;
        const action = createAction(ability.name, character.pid, targets);
        for(const resourceName of getAbilityCosts(ability.id)) {
            const amount = matchKeyToAmount(resourceName, ability);
            dispatchPlayers({
                type: PLAYERS_REDUCER_ACTIONS.resource_change, 
                payload: { pid: character.pid, amount: amount, resource: resourceName, fieldId: field.id  }
            });
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
        if(count[0] >= side1.length || count[1] >= side2.length) {
            setInProgress(() => false);
            setIsWon(() => true);
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

        const damage = Math.floor(((attack / 4) * (abilityDamage + (abilityLevel * 2)))) - defence;
        return damage > 0 ? damage : 1;
    }

    const attack = useCallback((userId: string, targets: string[], ability: AbilitySchema) => {
        const user = getPlayer([...players, ...enemies], userId).state;
        const targetNames = Array.from(targets, (id) => {
            return getPlayer([...players, ...enemies], id).state.name;
        });
        const abilityRef = getAbilityRef(user, ability.id).state;
        const { damageType } = ability;

        logMessage(`${user.name} uses ${ability.name} on ${targetNames.join(", ")}`);
        targets.forEach((targetRef: string, i: number) => {
            const target = getPlayer([...players, ...enemies], targetRef);
            let amount = (
                damageType === "heal"
                    ? ability.damage + abilityRef.level
                    : getDamageFormula(user, target.state, ability.damage, abilityRef.level)
            );
            if(damageType === "status" && ability.damage < 1) amount = 0;

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
                if(state.type !== 'dot') return; 
                dispatchEnemies({
                    type: PLAYERS_REDUCER_ACTIONS.receive_damage,
                    payload: {
                        fieldId: field.id,
                        pid: unit.pid,
                        amount: state.amount,
                        damageType: "damage",
                    }
                });
            } else {
                dispatchPlayers({
                    type: PLAYERS_REDUCER_ACTIONS.reduce_status_duration,
                    payload: {
                        fieldId: field.id,
                        pid: unit.pid,
                        status: state,
                    }
                });
                if(state.type !== 'dot') return; 
                dispatchPlayers({
                    type: PLAYERS_REDUCER_ACTIONS.receive_damage,
                    payload: {
                        fieldId: field.id,
                        pid: unit.pid,
                        amount: state.amount,
                        damageType: "damage",
                    }
                });
            }
        }
    }, [field.id]);

    const endTurn = useCallback(() => {
        setActionValue(() => getActionValue(getPlayer(players, character.pid).state));
        if(!isHost) return;
        players.forEach((player) => {
            dispatchPlayers({
                type: PLAYERS_REDUCER_ACTIONS.resource_change, 
                payload: { 
                    pid: player.pid,
                    fieldId: players[0].pid,
                    resource: "mana",
                    amount: -1 * Math.floor(player.stats.combat.resources.mana.max / 10)
                }
            });
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
            if(enemy.dead) return;
            let av = getActionValue(enemy);
            while(av > 0) {
                const ran = Math.floor(Math.random() * enemy.abilities.length);
                const ability = getAbility(enemy.abilities[ran].id);
                if(!ability) continue;
                const targets = getTargets(ability.name, ability.type === 'ally' ? enemies : players, enemy.pid);
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

    const lootAndSync = async () => {
        const loot = getLoot(field.enemies);
        for(const item of loot) {
            const ran = Math.floor(Math.random() * field.players.length);
            const player = assignItem(field.players[ran], item);
            if(!player) return;
            await upload("player", { fieldId: field.id, player: { state: player, index: ran} });
        }
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

    useEffect(() => {
        if(isWon && isHost) {
            lootAndSync();
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
        <div>
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
            {
                isWon 
                &&
                <div style={{transform: "translateY(100px)"}} >
                    <button 
                        onClick={async () => {
                            await uploadParty('enemies', { partyId: party.players[0].pid, enemyIds: [] });
                            await uploadParty('inCombat', { partyId: party.players[0].pid, isInCombat: false });
                        }}
                    >
                        Return to Dungeon
                    </button>
                </div>
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