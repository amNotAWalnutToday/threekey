import PlayerSchema from "../schemas/PlayerSchema";
import abiltyData from '../data/abilities.json';

export default (() => {
    const getPlayer = (players: PlayerSchema[], pid: string) => {
        for(let i = 0; i < players.length; i++) {
            if(pid === players[i].pid) return {state: players[i], index: i};
        }
        return {state: players[0], index: -1};
    }

    const getTargets = (abilityName: string, players: PlayerSchema[], enemies, userPid: string) => {
        const ability = getAbility(abilityName);
        
        if(ability?.type === "single") {
            const ran = Math.floor(Math.random() * players.length);
            return [players[ran].pid];
        } else if(ability?.type === "aoe") {
            return Array.from([...players], (p) => p.pid);
        } else if(ability?.type === "self") {
            return [userPid];
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

    const createEnemy = (
        name: string, pid: string, maxHealth: number, abilityIds: string[],
        attack: number, defence: number, speed: number, 
    ) => {
        const health = {
            max: maxHealth,
            cur: maxHealth,
        }
        const mana = {
            max: 0,
            cur: 0,
        }

        const abilities = [];
        for(const id of abilityIds) abilities.push(getAbility(id));

        const enemy = {
            name,
            pid,
            npc: true,
            dead: false,
            isAttacking: 0,
            abilities,
            stats: {
                combat: {
                    health,
                    resources: {
                        mana
                    },
                    attack,
                    defence,
                    speed,
                    debuffs: [],
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


    return {
        getPlayer,
        getTargets,
        getAbility,
        getAbilityCosts,
        assignMaxOrMinStat,
        createEnemy,
        createAction,
    }
})();