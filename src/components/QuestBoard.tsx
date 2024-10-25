import { useContext } from "react"
import UserContext from "../data/Context"
import QuestSchema from "../schemas/QuestSchema"
import PlayerSchema from "../schemas/PlayerSchema"
import combatFns from "../utils/combatFns"
import townFns from "../utils/townFns"
import Item from "./Item";

const { populateItem, getItem, getRank, removeItem, assignItem } = combatFns;
const { uploadTown, createQuestCompletion, assignQuestCompleted } = townFns

type Props = {
    quests: QuestSchema[];
    questsCompleted: {pid: string, name: string, amount: number, score: number}[]
    uploadCharacterTown: (character: PlayerSchema) => void;
    generateQuest: () => void;
    cancelCd: number,
    guildLevel: number,
}

export default function QuestBoard({
    quests, 
    questsCompleted, 
    generateQuest, 
    uploadCharacterTown,
    cancelCd,
    guildLevel,
}: Props) {
    const { character } = useContext(UserContext);

    const mapQuests = () => {
        return quests.map((quest, index) => {
            const requiredItem = populateItem(quest.item);
            const rewardItem = populateItem(quest.reward);
            const yourItem = getItem(character.inventory, quest.item);
            if(!requiredItem || !rewardItem) return;
            return (
                <div
                    key={`quest-${index}`}
                    className="quest"
                >
                    <p className="text_shadow" >Difficulty: {getRank(quest.rank)}</p>
                    <div>
                        Collect
                        <Item
                            item={requiredItem}
                            amount={yourItem.state.amount}
                            requiredAmount={quest.item.amount}
                            selected={false}
                        />
                    </div>
                    <div>
                        Reward
                        <Item
                            item={rewardItem}
                            amount={quest.reward.amount}
                            selected={true}
                        />
                    </div>
                    <div>
                        <button
                            className="menu_btn"
                            onClick={() => {
                                if(yourItem.state.amount < quest.item.amount) return;
                                let updatedPlayer = {...character};
                                updatedPlayer = removeItem(updatedPlayer, quest.item);
                                updatedPlayer = assignItem(updatedPlayer, quest.reward);
                                uploadCharacterTown(updatedPlayer);

                                const completedQuest = createQuestCompletion(updatedPlayer.pid, updatedPlayer.name, 1, quest.rank);
                                const updatedQuestsCompleted = assignQuestCompleted(completedQuest, [...questsCompleted], quest.rank);
                                uploadTown("questsCompleted", { questsCompleted: updatedQuestsCompleted });

                                const updatedTownQuests = [...quests];
                                updatedTownQuests.splice(index, 1);
                                uploadTown("quests", { quests: updatedTownQuests });
                            }}
                        >
                            Submit
                        </button>
                        <button
                            className="menu_btn"
                            onClick={() => {
                                if(Date.now() < cancelCd) return;
                                const updatedTownQuests = [...quests];
                                updatedTownQuests.splice(index, 1);
                                uploadTown("quests", { quests: updatedTownQuests });
                                uploadTown("cancelCd", { cancelCd: Date.now() + 1800000 });
                            }}
                        >
                            Cancel
                        </button>
                    </div>                 
                </div>
            )
        })
    }

    const mapQuestsCompletedPlayers = () => {
        return questsCompleted.map((completedQuest, index) => {
            return (
                <div
                    key={`quest-completed-player-${index}`}
                >
                    <p className="text_shadow">{index + 1} ). {completedQuest.name} | {completedQuest.amount} Quests | {completedQuest.score} Difficulty Score</p>
                </div>
            )
        })
    }

    const convertTime = (time: number) => {
        let seconds = Math.floor(time / 1000);
        const minutes = Math.floor(seconds / 60);
        seconds -= (minutes * 60);
        if(cancelCd < Date.now()) return 'Ready';
        return `${minutes}m` + ' ' + `${seconds}s`; 
    }
    
    return (
        <>
            <div className="quest_board left_abs_hor">
                <h1 className="menu_title" >Quest Board <span className="small_title_font">{convertTime(cancelCd - Date.now())} {quests.length} / {guildLevel * 2 + 1} </span></h1>
                <button
                    className="menu_btn cen-flex"
                    onClick={() => {
                        generateQuest();
                    }}
                >
                    New Quest
                </button>
                {mapQuests()}
            </div>
            <div className="quest_board right_abs_hor">
                <h1 className="menu_title">Quests Completions</h1>
                {mapQuestsCompletedPlayers()}
            </div>
        </>
    )
}