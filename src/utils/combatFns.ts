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
import statusData from '../data/statuses.json';
import UserSchema from "../schemas/UserSchema";
import PartySchema from "../schemas/PartySchema";

const { db, createPlayer } = accountFns;

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

    const getAbilityRef = (character: PlayerSchema, id: string) => {
        const ability = { state: {level: 0, id: ""}, index: -1 };
        for(let i = 0; i < character.abilities.length; i++) {
            if(character.abilities[i].id === id) {
                ability.state = character.abilities[i]
                ability.index = i;
            }
        }
        return ability;
    }
    
    const getAbilityCosts = (abilityId: string) => {
        const ability = getAbility(abilityId);
        if(!ability) return []; 
    
        const usedResources = [];
        for(const cost in ability.cost) usedResources.push(cost);
        return usedResources;
    }

    const getAbilityLevelEffect = (ability: AbilitySchema, abilityLevel: number) => {
        const updatedAbility = {...ability};
        updatedAbility.damage += (abilityLevel * 3);
        return updatedAbility;
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

    const getRank = (value: number) => {
        const ranks = ['', 'F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
        return ranks[Math.min(value, ranks.length - 1)];
    }

    const getRankValue = (rank: string) => {
        const ranks = ['', 'F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
        return Math.min(ranks.indexOf(rank), ranks.length - 1);
    }

    const getXpReceived = (enemy: PlayerSchema, party: PartySchema) => {
        const rankXp = getRankValue(enemy.stats.rank);
        let floorXp = (Number(party.location.map) + 1);
        floorXp = floorXp > 0 ? floorXp : 1; 
        return rankXp * floorXp;
    }

    const getPreviousRankMaxLevelXp = (rank: string) => {
        let rankValue = getRankValue(rank);
        const currentMaxLevel = rankValue > 0 ? rankValue * 10 : 5;
        const baseXp = 5;
        rankValue++;
        const increment = (currentMaxLevel * baseXp) * rankValue;
        return baseXp + increment;
    }

    const getLevelUpReq = (level: number, rank: string) => {
        const baseXp = 5;
        const rankValue = 1 + getRankValue(rank);
        const increment = (level * baseXp) * rankValue;
        const previousRankXp = rankValue > 1 ? getPreviousRankMaxLevelXp(rank) : 0;
        return baseXp + increment + previousRankXp;
    }

    const getCanLevelUp = (player: PlayerSchema) => {
        const levelReq = getLevelUpReq(player.stats.level, player.stats.rank);
        const rankVal = getRankValue(player.stats.rank);
        const currentMaxLevel = rankVal > 0 ? rankVal * 10 : 5;
        if(player.stats.xp > levelReq && currentMaxLevel > player.stats.level) {
            return true;
        }
        return false;
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

    const getItem = (inventory: {id: string, amount: number}[], item: {id: string, amount: number}) => {
        for(let i = 0; i < inventory?.length; i++) {
            if(item.id === inventory[i].id) return {state: inventory[i], index: i};
        }
        for(let i = 0; i < itemData.length; i++) {
            if(item.id === itemData[i].id) return {state: { id: itemData[i].id, amount: 0 }, index: -1};
        }
        return {state: inventory[0], index: -1};
    }

    const assignXp = (player: PlayerSchema, xp: number) => {
        player.stats.xp += xp;
        if(getCanLevelUp(player)) {
            player.stats.level += 1;
            player.stats.xp = 0;
            player = assignStatUpsByRole(player);
        }
        return player;
    }

    const assignStatUpsByRole = (player: PlayerSchema) => {
        const updatedPlayer = {...player};
        switch(updatedPlayer.role) {
            case "naturalist":
                updatedPlayer.stats.combat.attack += 1;
                updatedPlayer.stats.combat.defence += 1;
                updatedPlayer.stats.combat.health.max += 3;
                updatedPlayer.stats.combat.shield.max += 3;
                break;
        }

        return updatedPlayer;
    }

    const assignRankStatUpsByRole = (player: PlayerSchema) => {
        const updatedPlayer = {...player};
        switch(updatedPlayer.role) {
            case "naturalist":
                updatedPlayer.stats.combat.speed += 5;
                updatedPlayer.stats.combat.health.max += 5;
                updatedPlayer.stats.combat.shield.max += 5;
                updatedPlayer.stats.combat.resources.mana.max += 10;
                break;
        }

        return updatedPlayer;
    }

    const respawn = async (player: PlayerSchema) => {
        let updatedPlayer = {...player};
        updatedPlayer = assignHeal(updatedPlayer, player.stats.combat.health.max, true);
        updatedPlayer.inventory = [];
        updatedPlayer.dead = false;
        return updatedPlayer;
    }

    const removeItem = (player: PlayerSchema, item: {id: string, amount: number}) => {
        const updatedPlayer = {...player};
        let shouldRemoveFullStack = false;
        let itemIndex = -1;
        for(let i = 0; i < updatedPlayer.inventory.length; i++) {
            if(updatedPlayer.inventory[i].id === item.id) {
                if(item.amount >= updatedPlayer.inventory[i].amount) { 
                    shouldRemoveFullStack = true;
                    itemIndex = i;
                }
                else updatedPlayer.inventory[i].amount -= item.amount;
            }
        }
        if(shouldRemoveFullStack) {
            updatedPlayer.inventory.splice(itemIndex, 1);
        }
        return player;
    }

    const applyItem = (
        item: { id: string, amount: number }, 
        payload: { 
            player: PlayerSchema
        },
    ) => {
        const { player } = payload;
        let updatedPlayer = {...player};
        switch(item.id) {
            case "001":
                if(!updatedPlayer) return updatedPlayer;
                updatedPlayer.stats.combat.health.cur += 20 * item.amount;
                updatedPlayer = assignMaxOrMinStat(updatedPlayer, [player], 0)[0];
                break;
        }

        updatedPlayer = removeItem(updatedPlayer, item);
        return updatedPlayer;
    }

    const assignDamage = (player: PlayerSchema, amount: number) => {
        const updatedPlayer = {...player};
        let totalAmount = amount;
        if(player.stats.combat.shield.cur > 0 && totalAmount > 0) {
            const shieldDamage = Math.min(updatedPlayer.stats.combat.shield.cur, totalAmount);
            updatedPlayer.stats.combat.shield.cur -= amount;
            totalAmount -= shieldDamage;
        }
        if(totalAmount > 0) updatedPlayer.stats.combat.health.cur -= totalAmount;
        return assignMaxOrMinStat(updatedPlayer, [updatedPlayer], 0)[0];
    }

    const assignHeal = (player: PlayerSchema, amount: number, isHeal: boolean) => {
        const updatedPlayer = {...player};
        const updatedHealth = isHeal ? amount : amount * -1
        updatedPlayer.stats.combat.health.cur += updatedHealth;
        return assignMaxOrMinStat(updatedPlayer, [updatedPlayer], 0)[0];
    }

    const assignResource = (player: PlayerSchema, amount: number) => {
        const updatedPlayer = {...player};
        updatedPlayer.stats.combat.resources.mana.cur += amount;
        return assignMaxOrMinStat(player, [player], 0)[0];
    }

    const assignItem = (player: PlayerSchema, item: {id:string, amount:number}) => {
        const fullItem = populateItem(item);
        let inInventory = false;
        const playerInventory = player.inventory ?? [];
        for(let i = 0; i < playerInventory.length; i++) {
            if(!fullItem) return player;
            if(playerInventory[i].id === item.id) {
                const stackedAmount = playerInventory[i].amount + item.amount;
                if(stackedAmount >= fullItem.stack) playerInventory[i].amount = fullItem.stack;
                else playerInventory[i].amount += item.amount;
                inInventory = true;
            }
        }
        if(!inInventory) playerInventory.push(item);
        player.inventory = playerInventory;
        return player;
    }

    const assignAbilityLevelStats = (abilityDamage: number, abilityLevel: number, abilityType: string, statusName?: string) => {
        if(abilityType === "damage") {
            return abilityDamage + (abilityLevel * 2);
        } else if (abilityType === "heal") {
            return abilityDamage + (abilityLevel * 3);
        } else if(abilityType === "status") {
            const status = getStatus(statusData.all, statusName??"");
            return status.state.amount + abilityLevel;
        }
        return 1;
    }

    const assignMaxOrMinStat = (player: PlayerSchema, players: PlayerSchema[], index: number) => {
        const { health, resources, shield } = player.stats.combat;
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

        if(shield.cur <= 0) {
            players[index].stats.combat.shield.cur = 0;
        } else if(shield.cur > shield.max) {
            players[index].stats.combat.shield.cur = shield.max;
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

    const createEnemy = (
        name: string, pid: string, maxHealth: number, abilityIds: string[],
        attack: number, defence: number, speed: number, status: StatusSchema[],
        dead: boolean, inventory: {id: string, amount: number}[], rank: string,
        floorNum: number, currentShield: number,
    ) => {
        const health = {
            max: maxHealth,
            cur: maxHealth,
        }
        const shield = {
            max: maxHealth,
            cur: currentShield,
        }
        const mana = {
            max: 0,
            cur: 0,
        }

        const abilities = [];
        for(const id of abilityIds) {
            const ability = {
                id,
                level: floorNum ?? 1
            };
            if(ability) abilities.push(ability);
        }

        const enemy: PlayerSchema = {
            name,
            role: '',
            pid,
            inventory: inventory ?? [],
            location: { map: '', XY: [] },
            npc: true,
            dead,
            isAttacking: 0,
            abilities,
            status: status ?? [],
            stats: {
                level: 1,
                xp: 0,
                rank: rank ?? 'E',
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

    const createStatus = (name: string, type: string, amount: number, duration: number, affects: string[], refs: string[]) => {
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
            loot: [],
            start: false,
            joinedPlayers: 0,
            id: '',
        }

        const enemyIds: string[] = [];
        let floorNum = 1;

        const partyRef = ref(db, `party/${players[0].pid}`);
        await get(partyRef).then( async (snapshot) => {
            const data: PartySchema = await snapshot.val();
            for(const p in data.players) field.players.push(data.players[p]);
            for(const e of data.enemies) enemyIds.push(e);
            if(Number(data.location.map) > 0) floorNum = Number(data.location.map); 
        });

        const enemyList = enemyData.all;
        const enemies = [];
        for(let i = 0; i < enemyIds.length; i++) {
            for(const enemy of enemyList) {
                if(enemy.id === enemyIds[i]) {
                    const { rank, attack, defence, speed, name, health, abilities, inventory, shield } = enemy;
                    const newEnemy = createEnemy(name, `E${i}`, health, abilities, attack, defence, speed, [], false, inventory, rank, floorNum, shield); 
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
            return createPlayer(player.name, player.pid, 'naturalist', player.stats, player.status, player.location, player.inventory, player.abilities);
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
            const { attack, defence, speed, shield } = enemy.stats.combat;
            const updatedEnemy = createEnemy(enemy.name, enemy.pid, enemy.stats.combat.health.max, abilities, attack, defence, speed, enemy.status, enemy.dead ?? false, enemy.inventory, enemy.stats.rank, enemy.abilities[0].level, shield);
            updatedEnemy.stats.combat.health.cur = enemy.stats.combat.health.cur;
            updatedEnemy.stats.combat.shield.cur = enemy.stats.combat.shield.cur;
            return updatedEnemy;
        });
    }

    const connectToBattle = async (
        initialize: (players: PlayerSchema[], enemies: PlayerSchema[], actionQueue: ActionSchema[], fieldId: string, start: boolean, joinedPlayers: number, loot: {id: string, amount: number, pid: string}[]) => void,
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
                initialize(updatedPlayers ?? [], updatedEnemies ?? [], data.actionQueue ?? [], data.id, shouldStart, joinedPlayers, data.loot ?? []);
            });
            await onValue(fieldRef, async (snapshot) => {
                const data = await snapshot.val();
                const shouldStart = data.joinedPlayers === party.players.length;
                initialize([], [], [], '', shouldStart, data.joinedPlayers, data.loot ?? []);
            });
            await onValue(playersRef, async (snapshot) => {
                const data = await snapshot.val();
                const updatedPlayers = populatePlayers(data);
                initialize(updatedPlayers ?? [], [], [], '', data.start, data.joinedPlayers, data.loot ?? []);
            });
            await onValue(enemyRef, async (snapshot) => {
                const data = await snapshot.val();
                const updatedEnemies = populateEnemies(data);
                initialize([], updatedEnemies ?? [], [], '', data.start, data.joinedPlayers, data.loot ?? []);
            });
            await onValue(actionRef, async (snapshot) => {
                const data = await snapshot.val();
                const updatedActionQueue = !data ? [] : Array.from(data ?? [], (action: ActionSchema) => {
                    return createAction(action.ability, action.user, action.targets ?? []);
                });
                initialize([], [], updatedActionQueue ?? [], '', data.start, data.joinedPlayers, data.loot ?? []);
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
            loot?: { id: string, amount: number, pid: string }[],
        }
    ) => {
        const { fieldId, field, actionQueue, player, user, loot } = payload;

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
            case "loot":
                if(!loot) return;
                uploadLoot(loot, fieldId);
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
    
    const uploadLoot = async (loot: {id: string, amount: number, pid: string}[], fieldId: string) => {
        const lootRef = ref(db, `/fields/${fieldId}/loot`);
        await set(lootRef, loot);
    }

    const uploadCharacter = async (user: UserSchema, player: PlayerSchema, index: number) => {
        const characterRef = ref(db, `/users/${user.uid}/characters/${index}`);
        await set(characterRef, player);
    }

    return {
        getPlayer,
        getTargets,
        getAbility,
        getAbilityRef,
        getAbilityCosts,
        getAbilityLevelEffect,
        getStatus,
        getActionValue,
        getCanLevelUp,
        getLoot,
        getXpReceived,
        getLevelUpReq,
        getRank,
        getRankValue,
        getItem,
        removeItem,
        respawn,
        applyItem,
        assignDamage,
        assignHeal,
        assignResource,
        assignXp,
        assignItem,
        assignMaxOrMinStat,
        assignRankStatUpsByRole,
        assignAbilityLevelStats,
        assignBuffs,
        createEnemy,
        createAction,
        createStatus,
        populateItem,
        initiateBattle,
        connectToBattle,
        upload,
    }
})();