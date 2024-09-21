interface AbilitySchema {
    id: string,
    type: string,
    name: string,
    damage: number,
    cost: {
        mana?: number,
    },
    users: string,
}

export default AbilitySchema;
