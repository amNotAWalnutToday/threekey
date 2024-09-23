interface AbilitySchema {
    id: string,
    type: string,
    damageType: "damage" | "heal",
    name: string,
    damage: number,
    cost: {
        health?: number,
        mana?: number,
    },
    users: string,
}

export default AbilitySchema;
