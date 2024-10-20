interface TownSchema {
    storage: {
        level: number,
        inventory: {id: string, amount: number}[],
    },
    inn: {
        level: number,
    },
    guild: {
        level: number,
        quests: {id: string, amount: number}[],
        questsCompleted: {pid: string, name: string, amount: number}[],
    },
    shop: {
        level: number,
    }
}

export default TownSchema;
