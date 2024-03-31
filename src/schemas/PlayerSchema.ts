import AbilitySchema from "./AbilitySchema";

type Bar = {
    max: number,
    cur: number,
}

interface PlayerSchema {
    username: string,
    pid: string,
    npc?: boolean,
    location: { map: string, coordinates: number[] },
    abilities: AbilitySchema[],
    stats: {
        combat: {
            shield: number,
            health: Bar
            resources: {
                mana?: Bar,
                msp?: Bar,
                psp?: Bar,
                soul?: Bar,
            },
            attack: number,
            pAttack: number,
            mAttack: number,
            defence: number,
            resistance: number,
            speed: number,
            debuffs: string[],
        },
    }  
}

export default PlayerSchema;
