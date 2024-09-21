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
    location: { map: string, coordinates: number[] },
    abilities: AbilityRefSchema[],
    inventory: string[], //IDS
    stats: {
        combat: {
            shield: Bar,
            health: Bar
            resources: {
                mana?: Bar,
                msp?: Bar,
                psp?: Bar,
                soul?: Bar,
            },
            attack: number,
            defence: number,
            speed: number,
            debuffs: string[],
        },
    }  
}

export default PlayerSchema;
