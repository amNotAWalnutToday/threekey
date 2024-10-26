interface Requirements {
    req: {id: string, amount: number}[],
    pre?: string,
}

interface AbilitySchema {
    id: string,
    type: string,
    damageType: string, // "damage" | "heal" | "status",
    name: string,
    damage: number,
    cost: {
        health?: number,
        mana?: number,
    },
    av: number,
    users: string[],
    description?: string,
    unlocks: Requirements
}

export default AbilitySchema;
