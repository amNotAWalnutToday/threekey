import PlayerSchema from "../schemas/PlayerSchema";
import StatusSchema from "../schemas/StatusSchema";
import ActionSchema from "../schemas/ActionSchema";
import AbilitySchema from "../schemas/AbilitySchema";
import FieldSchema from "../schemas/FieldSchema";
import enemyData from '../data/enemies.json';
import itemData from '../data/items.json';
import abiltyData from '../data/abilities.json';
import classData from '../data/classes.json';
import accountFns from '../utils/accountFns';
import { set, ref, get, child, onValue } from "firebase/database";
import FloorSchema from "../schemas/FloorSchema";
import UserSchema from "../schemas/UserSchema";
import PartySchema from "../schemas/PartySchema";

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

    const getLoot = (enemies: PlayerSchema[]) => {
        const loot = [];
        for(const enemy of enemies) {
            const ran = Math.floor(Math.random() * enemy.inventory.length);
            if(ran < enemy.inventory.length) {
                loot.push(enemy.inventory[ran]);
            }
        }
        return loot;
    }

    const assignItem = (player: PlayerSchema, item: {id:string, amount:number}) => {
        const fullItem = populateItem(item);
        let inInventory = false;
        for(let i = 0; i < player.inventory.length; i++) {
            if(!fullItem) return;
            if(player.inventory[i].id === item.id) {
                const stackedAmount = player.inventory[i].amount + item.amount;
                if(stackedAmount >= fullItem.stack) player.inventory[i].amount = fullItem.stack;
                else player.inventory[i].amount += item.amount;
                inInventory = true;
            }
        }
        if(!inInventory) player.inventory.push(item);
        return player;
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

    const createPlayer = (
        name: string, pid: string, playerClass: string, 
        combatStats: typeof classData.naturalist.stats, 
        status: StatusSchema[], location: { map: string, XY: number[] },
        inventory: { id: string, amount: number }[],
    ) => {
        const stats = combatStats ? combatStats : classData.naturalist.stats;
        const abilities = assignAbilities(playerClass);
        const player: PlayerSchema = {
            name,
            pid,
            npc: false,
            dead: false,
            isAttacking: 0,
            location: location ?? { map: "-1", XY: [1, 1] },
            inventory: inventory ?? [],
            status: status ?? [],
            stats,
            abilities,
        }

        return player;
    }

    const createEnemy = (
        name: string, pid: string, maxHealth: number, abilityIds: string[],
        attack: number, defence: number, speed: number, status: StatusSchema[],
        dead: boolean, inventory: {id: string, amount: number}[],
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
            inventory: inventory ?? [],
            location: { map: '', XY: [] },
            npc: true,
            dead,
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

    const initiateBattle = async (players: PlayerSchema[], enemyIds: string[]) => {
        const field: FieldSchema = {
            players: [],
            enemies: [],
            actionQueue: [],
            start: false,
            joinedPlayers: 0,
            id: '',
        }

        const partyRef = ref(db, `party/${players[0].pid}`);
        await get(partyRef).then( async (snapshot) => {
            const data: PartySchema = await snapshot.val();
            for(const p in data.players) field.players.push(data.players[p]);
        });

        const enemyList = enemyData.all;
        const enemies = [];
        for(let i = 0; i < enemyIds.length; i++) {
            for(const enemy of enemyList) {
                if(enemy.id === enemyIds[i]) {
                    const { attack, defence, speed, name, health, abilities, inventory } = enemy;
                    const newEnemy = createEnemy(name, `E${i}`, health, abilities, attack, defence, speed, [], false, inventory); 
                    enemies.push(newEnemy);
                }    
            }
        } 

        enemies.forEach((enemy) => {
            field.enemies.push(enemy);
        });

        field.id = players[0].pid;
        uploadField(field, players[0].pid);
        return field;
    }

    const populatePlayers = (players: PlayerSchema[]) => {
        return Array.from(players, (player: PlayerSchema) => {
            return createPlayer(player.name, player.pid, 'naturalist', player.stats, player.status, player.location, player.inventory);
        });
    }

    const populateItem = (item: { id: string, amount: number }) => {
        for(const fullItem of itemData) {
            if(item.id === fullItem.id) return fullItem;
        }
    }

    const populateEnemies = (enemies: PlayerSchema[]) => {
        return Array.from(enemies, (enemy: PlayerSchema) => {
            const abilities = Array.from(enemy.abilities, (e) => e.id); 
            const { attack, defence, speed } = enemy.stats.combat;
            const updatedEnemy = createEnemy(enemy.name, enemy.pid, enemy.stats.combat.health.max, abilities, attack, defence, speed, enemy.status, enemy.dead ?? false, enemy.inventory);
            updatedEnemy.stats.combat.health.cur = enemy.stats.combat.health.cur;
            return updatedEnemy;
        });
    }

    const connectToBattle = async (
        initialize: (players: PlayerSchema[], enemies: PlayerSchema[], actionQueue: ActionSchema[], fieldId: string, start: boolean, joinedPlayers: number) => void,
        party: PartySchema,
    ) => {
        try {
            console.log(party, party.players[0].pid);
            const fieldRef = ref(db, `/fields/${party.players[0].pid}`);
            const playersRef = ref(db, `/fields/${party.players[0].pid}/players`);
            const enemyRef = ref(db, `/fields/${party.players[0].pid}/enemies`);
            const actionRef = ref(db, `/fields/${party.players[0].pid}/actionQueue`);
            await get(fieldRef).then( async (snapshot) => {
                const data = await snapshot.val();
                const updatedPlayers = populatePlayers(data.players);
                const updatedEnemies = populateEnemies(data.enemies);
                const joinedPlayers = data.joinedPlayers + 1;
                await set(child(fieldRef, '/joinedPlayers'), joinedPlayers);
                const shouldStart = joinedPlayers === party.players.length;
                initialize(updatedPlayers ?? [], updatedEnemies ?? [], data.actionQueue ?? [], data.id, shouldStart, joinedPlayers);
            });
            await onValue(fieldRef, async (snapshot) => {
                const data = await snapshot.val();
                const shouldStart = data.joinedPlayers === party.players.length;
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
            fieldId: string,
            field?: FieldSchema,
            actionQueue?: ActionSchema[],
            user?: UserSchema,
            player?: { state: PlayerSchema, index: number },
            floor?: FloorSchema,
        }
    ) => {
        const { fieldId, field, actionQueue, player, floor, user } = payload;

        switch(type) {
            case "field":
                uploadField(field ?? {} as FieldSchema, fieldId);
                break;
            case "actionQueue":
                uploadActionQueue(actionQueue ?? [], fieldId);
                break;
            case "player":
                if(!player) return console.error("No Player");
                uploadPlayer(player.state, player.index, fieldId);
                break;
            case "enemy":
                if(!player) return console.error("No Enemy");
                uploadEnemy(player.state, player.index, fieldId);
                break;
            case "floor":
                if(!floor) return console.error("No Floor");
                uploadFloor(floor);
                break;
            case "character":
                if(!player || !user) return; 
                uploadCharacter(user, player.state, player.index);
                break;
        }
    }

    const uploadField = async (field: FieldSchema, fieldId: string) => {
        const fieldRef = ref(db, `/fields/${fieldId}`);
        const updatedField = { ...field };
        // if(!updatedField.actionQueue.length) updatedField.actionQueue = false;
        await set(fieldRef, Object.assign({}, updatedField, {actionQueue: field.actionQueue.length ? field.actionQueue : false}));
    }

    const uploadActionQueue = async (actionQueue: ActionSchema[], fieldId: string) => {
        const actionQueueRef = ref(db, `/fields/${fieldId}/actionQueue`);
        await set(actionQueueRef, actionQueue.length ? actionQueue : false);
    }

    const uploadPlayer = async (player: PlayerSchema, index: number, fieldId: string) => {
        const playerRef = ref(db, `/fields/${fieldId}/players/${index}`);
        await set(playerRef, assignMaxOrMinStat(player, [player], 0)[0]);
    }

    const uploadEnemy = async (enemy: PlayerSchema, index: number, fieldId: string) => {
        const enemyRef = ref(db, `/fields/${fieldId}/enemies/${index}`);
        await set(enemyRef, assignMaxOrMinStat(enemy, [enemy], 0)[0]);
    }

    const uploadFloor = async (floor: FloorSchema) => {
        const floorRef = ref(db, `/dungeon/${floor.number}`);
        await set(floorRef, floor);
    }

    const uploadCharacter = async (user: UserSchema, player: PlayerSchema, index: number) => {
        const characterRef = ref(db, `/users/${user.uid}/characters/${index}`);
        await set(characterRef, player);
    }

    return {
        getPlayer,
        getTargets,
        getAbility,
        getAbilityCosts,
        getStatus,
        getActionValue,
        getLoot,
        assignItem,
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