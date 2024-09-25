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
    username: string,
    pid: string,
    npc?: boolean,
    dead?: boolean,
    isAttacking: number,
    location: { map: string, coordinates: number[] },
    abilities: AbilitySchema[],
    inventory: string[], //IDS
    status: StatusSchema[],
    stats: {
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
