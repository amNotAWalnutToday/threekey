import AbilitySchema from "./AbilitySchema";
import StatusSchema from "./StatusSchema";

type Bar = {
    max: number,
    cur: number,
}

type AbilityRefSchema = {
    id: string,
    level: number,
}

interface PlayerSchema {
    name: string,
    role: string,
    pid: string,
    npc?: boolean,
    dead?: boolean,
    isAttacking: number,
    location: { map: string, XY: number[] },
    abilities: AbilityRefSchema[],
    inventory: { id: string, amount: number }[], //IDS
    status: StatusSchema[],
    stats: {
        level: number,
        xp: number,
        rank: string,
        combat: {
            shield: Bar,
            health: Bar
            resources: {
                mana: Bar,
                msp: Bar,
                psp: Bar,
                soul: Bar,
            },
            attack: number,
            defence: number,
            speed: number,
        },
    }  
}

export default PlayerSchema;
