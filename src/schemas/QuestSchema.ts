interface Item {
    id: string,
    amount: number
}

type QuestSchema = {
    item: Item,
    rank: number,
    reward: Item,
}

export default QuestSchema;
