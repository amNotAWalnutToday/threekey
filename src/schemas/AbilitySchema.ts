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
        shield?: number,
        mana?: number,
        psp?: number,
        msp?: number,
        soul?: number,
    },
    av: number,
    users: string[],
    description?: string,
    unlocks: Requirements
}

export default AbilitySchema;
