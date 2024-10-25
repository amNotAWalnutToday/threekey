import QuestSchema from "./QuestSchema"

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
        quests: QuestSchema[],
        questsCompleted: {pid: string, name: string, amount: number, score: number}[],
        cancelCd: number,
    },
    shop: {
        level: number,
    }
}

export default TownSchema;
