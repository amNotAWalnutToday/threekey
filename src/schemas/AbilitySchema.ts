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
}

export default AbilitySchema;
