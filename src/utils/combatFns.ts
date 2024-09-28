import PlayerSchema from "../schemas/PlayerSchema";
import StatusSchema from "../schemas/StatusSchema";
import AbilitySchema from "../schemas/AbilitySchema";
import FieldSchema from "../schemas/FieldSchema";
import enemyData from '../data/enemies.json';
import abiltyData from '../data/abilities.json';
import classData from '../data/classes.json';
import accountFns from '../utils/accountFns';
import { set, ref, get, child, onValue } from "firebase/database";
import ActionSchema from "../schemas/ActionSchema";

const { db } = accountFns;

export default (() => {
    const getPlayer = (players: PlayerSchema[], pid: string) => {
        for(let i = 0; i < players.length; i++) {
            if(pid === players[i].pid) return {state: players[i], index: i};
        }
        return {state: players[0], index: -1};
    }

    const getTargets = (abilityName: string, players: PlayerSchema[], userPid: string) => {
        const ability = getAbility(abilityName);
        
        if(ability?.type === "single") {
            const ran = Math.floor(Math.random() * players.length);
            return [players[ran].pid];
        } else if(ability?.type === "aoe") {
            return Array.from([...players], (p) => p.pid);
        } else if(ability?.type === "self") {
            return [userPid];
        } else if(ability?.type === "ally") {
            const ran = Math.floor(Math.random() * (players.length - 1));
            const targets = [...players].filter((p) => p.pid !== userPid);
            return targets.length ? [targets[ran].pid] : [];
        }

        return [];
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

    const getStatus = (statuses: StatusSchema[], name: string) => {
        for(let i = 0; i < statuses.length; i++) {
            if(name === statuses[i].name) return {state: statuses[i], index: i};
        }
        for(let i = 0; i < statuses.length; i++) {
           for(let j = 0; j < statuses[i].refs.length; j++) {
                if(name === statuses[i].refs[j]) return {state: statuses[i], index: i}
           }
        }
        return {state: statuses[0], index: -1};
    }

    const getActionValue = (player: PlayerSchema) => {
        let speed = player.stats.combat.speed; 
        speed = assignBuffs(player.status, 'speed', speed);

        const av = Math.floor(speed / 10);
        return av > 0 && speed > 0 ? av : 1;
    }

    const assignMaxOrMinStat = (player: PlayerSchema, players: PlayerSchema[], index: number) => {
        const { health, resources } = player.stats.combat;
        const { mana } = resources;
    
        if(health.cur <= 0) { 
            players[index].dead = true;
            players[index].stats.combat.health.cur = 0;
        } else if(health.cur > health.max) {
            players[index].stats.combat.health.cur = health.max;
        }
    
        if(mana.cur <= 0) {
            players[index].stats.combat.resources.mana.cur = 0;
        } else if(mana.cur > mana.max) {
            players[index].stats.combat.resources.mana.cur = mana.max;
        }
    
        return [...players];
    }

    const assignBuffs = (status: StatusSchema[], stat: string, amount: number) => {
        for(const state of status) { 
            for(const affected of state.affects) {
                const updatedAmount = state.type === "buff" ? state.amount : (state.amount * -1);
                if(affected === stat) amount = amount + updatedAmount;
            }
        }
        
        return amount;
    }

    const assignAbilities = (playerClass: string) => {
        const usableAbilities = [];

        for(const ability of abiltyData.all) {
            for(const users of ability.users) {
                if(users === playerClass) usableAbilities.push(ability);
            }
        }

        return usableAbilities;
    }

    const createPlayer = (name: string, pid: string, playerClass: string, combatStats, status) => {
        const stats = combatStats ? combatStats : classData.naturalist.stats;
        const abilities = assignAbilities(playerClass);
        const player: PlayerSchema = {
            name,
            pid,
            npc: false,
            dead: false,
            isAttacking: 0,
            location: { map: "", coordinates: [0, 0] },
            inventory: [],
            status: status ?? [],
            stats,
            abilities,
        }

        return player;
    }

    const createEnemy = (
        name: string, pid: string, maxHealth: number, abilityIds: string[],
        attack: number, defence: number, speed: number, status,
    ) => {
        const health = {
            max: maxHealth,
            cur: maxHealth,
        }
        const shield = {
            max: maxHealth,
            cur: maxHealth,
        }
        const mana = {
            max: 0,
            cur: 0,
        }

        const abilities: AbilitySchema[] = [];
        for(const id of abilityIds) {
            const ability = getAbility(id);
            if(ability) abilities.push(ability);
        }

        const enemy: PlayerSchema = {
            name,
            pid,
            inventory: [],
            location: { map: '', coordinates: [] },
            npc: true,
            dead: false,
            isAttacking: 0,
            abilities,
            status: status ?? [],
            stats: {
                combat: {
                    health,
                    shield,
                    resources: {
                        mana,
                        psp: {
                            max: 0,
                            cur: 0,
                        },
                        msp: {
                            max: 0,
                            cur: 0
                        },
                        soul: {
                            max: 0,
                            cur: 0
                        }
                    },
                    attack,
                    defence,
                    speed,
                }
            }
        }

        return enemy;
    }

    const createAction = (abilityName: string, pid: string, targetIds: string[]) => {
        const action = {
            ability: abilityName,
            user: pid,
            targets: targetIds
        }

        return action;
    }

    const createStatus = (name: string, type: "dot" | "buff" | "debuff", amount: number, duration: number, affects: string[], refs: string[]) => {
        const status = {
            name,
            type,
            amount,
            duration,
            affects,
            refs,
        }

        return status;
    }

    const initiateBattle = async (players: PlayerSchema[]) => {
        const field: FieldSchema = {
            players: [],
            enemies: [],
            actionQueue: [],
            start: false,
            joinedPlayers: 0,
        }
        const partyRef = ref(db, `party/${players[0].pid}`);
        await get(partyRef).then( async (snapshot) => {
            const data = await snapshot.val();
            for(const p in data) field.players.push(data[p]);
            console.log(field);
        });

        const enemyList = enemyData.all;
        const { attack, defence, speed, name, health, abilities } = enemyList[0];
        
        const enemies = [];
        const newEnemy = createEnemy(name, `E${field.enemies.length}`, health, abilities, attack, defence, speed, []); 
        enemies.push(newEnemy);

        enemies.forEach((enemy) => {
            field.enemies.push(enemy);
        })

        uploadField({ ...field, actionQueue: false });
        return field;
    }

    const populatePlayers = (players: PlayerSchema[]) => {
        return Array.from(players, (player: PlayerSchema) => {
            return createPlayer(player.name, player.pid, 'naturalist', player.stats, player.status);
        });
    }

    const populateEnemies = (enemies: PlayerSchema[]) => {
        return Array.from(enemies, (enemy: PlayerSchema) => {
            const abilities = Array.from(enemy.abilities, (e) => e.id); 
            const { attack, defence, speed } = enemy.stats.combat;
            const updatedEnemy = createEnemy(enemy.name, enemy.pid, enemy.stats.combat.health.max, abilities, attack, defence, speed, enemy.status);
            updatedEnemy.stats.combat.health.cur = enemy.stats.combat.health.cur;
            return updatedEnemy;
        });
    }

    const connectToBattle = async (
        initialize: (players: PlayerSchema[], enemies: PlayerSchema[], actionQueue: ActionSchema[], fieldId: string, start: boolean, joinedPlayers: number) => void,
        party: PlayerSchema[],
    ) => {
        try {
            const fieldRef = ref(db, `/fields`);
            const playersRef = ref(db, '/fields/players');
            const enemyRef = ref(db, '/fields/enemies');
            const actionRef = ref(db, '/fields/actionQueue');
            await get(fieldRef).then( async (snapshot) => {
                const data = await snapshot.val();
                const updatedPlayers = populatePlayers(data.players);
                const updatedEnemies = populateEnemies(data.enemies);
                const joinedPlayers = data.joinedPlayers + 1;
                await set(child(fieldRef, '/joinedPlayers'), joinedPlayers);
                const shouldStart = joinedPlayers === party.length;
                initialize(updatedPlayers ?? [], updatedEnemies ?? [], data.actionQueue ?? [], data.id, shouldStart, joinedPlayers);
            });
            await onValue(fieldRef, async (snapshot) => {
                const data = await snapshot.val();
                const shouldStart = data.joinedPlayers === party.length;
                initialize([], [], [], '', shouldStart, data.joinedPlayers);
            });
            await onValue(playersRef, async (snapshot) => {
                const data = await snapshot.val();
                const updatedPlayers = populatePlayers(data);
                initialize(updatedPlayers ?? [], [], [], '', data.start, data.joinedPlayers);
            });
            await onValue(enemyRef, async (snapshot) => {
                const data = await snapshot.val();
                const updatedEnemies = populateEnemies(data);
                initialize([], updatedEnemies ?? [], [], '', data.start, data.joinedPlayers);
            });
            await onValue(actionRef, async (snapshot) => {
                const data = await snapshot.val();
                const updatedActionQueue = !data ? [] : Array.from(data ?? [], (action: ActionSchema) => {
                    return createAction(action.ability, action.user, action.targets ?? []);
                });
                initialize([], [], updatedActionQueue ?? [], '', data.start, data.joinedPlayers);
            });
        } catch(e) {
            console.error(e);
        }
    }

    const upload = async (
        type: string, 
        payload: { 
            field?: FieldSchema,
            actionQueue?: ActionSchema[],
            player?: { state: PlayerSchema, index: number },
        }
    ) => {
        const { field, actionQueue, player } = payload;

        switch(type) {
            case "field":
                uploadField(field ?? {} as FieldSchema);
                break;
            case "actionQueue":
                uploadActionQueue(actionQueue ?? []);
                break;
            case "player":
                if(!player) return console.error("No Player");
                uploadPlayer(player.state, player.index);
                break;
            case "enemy":
                if(!player) return console.error("No Enemy");
                uploadEnemy(player.state, player.index);
                break;
        }
    }

    const uploadField = async (field: FieldSchema) => {
        const fieldRef = ref(db, `/fields`);
        const updatedField = { ...field };
        if(!updatedField.actionQueue.length) updatedField.actionQueue = false;
        await set(fieldRef, field);
    }

    const uploadActionQueue = async (actionQueue: ActionSchema[]) => {
        const actionQueueRef = ref(db, `/fields/actionQueue`);
        await set(actionQueueRef, actionQueue.length ? actionQueue : false);
    }

    const uploadPlayer = async (player: PlayerSchema, index: number) => {
        const playerRef = ref(db, `/fields/players/${index}`);
        await set(playerRef, assignMaxOrMinStat(player, [player], index)[0]);
    }

    const uploadEnemy = async (enemy: PlayerSchema, index: number) => {
        const enemyRef = ref(db, `/fields/enemies/${index}`);
        await set(enemyRef, enemy);
    }


    return {
        getPlayer,
        getTargets,
        getAbility,
        getAbilityCosts,
        getStatus,
        getActionValue,
        assignMaxOrMinStat,
        assignBuffs,
        createPlayer,
        createEnemy,
        createAction,
        createStatus,
        initiateBattle,
        connectToBattle,
        upload,
    }
})();