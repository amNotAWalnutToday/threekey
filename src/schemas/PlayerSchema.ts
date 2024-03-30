type Bar = {
    max: number,
    min: number,
}

interface PlayerSchema {
    username: string,
    location: { map: string, coordinates: [number, number] },
    stats: {
        combat: {
            shield: number,
            health: Bar
            resources: {
                mana: Bar,
                msp: Bar,
                psp: Bar,
                soul: Bar,
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
