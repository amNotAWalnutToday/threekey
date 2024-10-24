import { useContext } from "react"
import UserContext from "../data/Context"
import TownSchema from "../schemas/TownSchema"
import Inventory from "../components/Inventory"
import Item from "../components/Item"
import itemData from '../data/items.json';
import combatFns from "../utils/combatFns"
import PlayerSchema from "../schemas/PlayerSchema"

const { 
    getRankValue, getItem, populateItem, getLevelUpReq, getRank,
    removeItem, assignRankStatUpsByRole,
} = combatFns;

type Props = {
    town: TownSchema;
    uploadCharacterTown: (character: PlayerSchema) => void;
    logMessage: (message: string) => void;
}

export default function Guild({town, logMessage, uploadCharacterTown}: Props) {
    const { character } = useContext(UserContext);
    
    const getRankUpItems = () => {
        const rankValue = getRankValue(character.stats.rank);
        const item = { id: "", amount: 0 };
        switch(rankValue) {
            case 0:
                item.id = "002";
                item.amount = 1;
                break;
            case 1:
                item.id = "002";
                item.amount = 5;
                break;
            case 2:
                item.id = "003";
                item.amount = 1;
                break;
            case 3:
                item.id = "003";
                item.amount = 5;
                break;
            case 4:
                item.id = "004";
                item.amount = 3;
                break;
            case 5:
                item.id = "004";
                item.amount = 10;
                break;
            case 6:
                item.id = "005";
                item.amount = 5;
                break;
            case 7:
                item.id = "005";
                item.amount = 20;
                break;
            case 8:
                item.id = "006";
                item.amount = 5;
                break;
            case 9:
                item.id = "006";
                item.amount = 20;
                break;
        }
        return item;
    }

    const getRequiredXp = () => {
        const rankVal = getRankValue(character.stats.rank);
        const xp = getLevelUpReq(character.stats.level, character.stats.rank);
        const currentMaxLevel = rankVal > 0 ? rankVal * 10 : 5;
        return { xp, level: currentMaxLevel }
    }

    return (
        <div>
            <div className="rankup_box center_abs_hor">
                <p>Level: {character.stats.level} / {getRequiredXp().level}</p>
                <Item 
                    item={populateItem(getRankUpItems()) ?? {} as typeof itemData[0]}
                    amount={getItem(character.inventory, getRankUpItems()).state.amount}
                    requiredAmount={getRankUpItems().amount}
                    selected={true}
                />
                <button
                    className="menu_btn"
                    onClick={() => {
                        const { xp, level, rank } = character.stats;
                        const levelReqs = getRequiredXp();
                        const itemReqs = getRankUpItems();
                        if(levelReqs.xp > xp && level < levelReqs.level) return;
                        if(getItem(character.inventory, itemReqs).state.amount < getRankUpItems().amount) return;
                        const updatedRank = getRank(getRankValue(rank) + 1);
                        let updatedPlayer = {...character};
                        updatedPlayer = assignRankStatUpsByRole(updatedPlayer);
                        updatedPlayer = removeItem(updatedPlayer, itemReqs);
                        updatedPlayer.stats.rank = updatedRank;
                        updatedPlayer.stats.level = 1;
                        updatedPlayer.stats.xp = 0;
                        uploadCharacterTown(updatedPlayer);
                        logMessage(`${character.name} has reached the new rank of ${updatedRank}`);
                    }}
                >
                    Rank Up
                </button>
            </div>
        </div>
    )
}