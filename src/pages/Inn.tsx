import { useContext } from "react"
import UserContext from "../data/Context"
import TownSchema from "../schemas/TownSchema"
import Inventory from "../components/Inventory"
import combatFns from "../utils/combatFns"

const { getItem } = combatFns;

type Props = {
    town: TownSchema
    applyRest: () => void;
    logMessage: (message: string) => void;
}

export default function Inn({town, applyRest, logMessage}: Props) {
    const { character } = useContext(UserContext);
    
    return (
        <div className="inn" >
            <Inventory  
                inventory={character.inventory}
                position="left"
                buttons={town?.storage.level > 0 ? ["deposit"] : []}
                storage={town.storage.inventory}
                limit={10}
                logMessage={logMessage}
            />
            {town?.storage?.level > 0
            &&
            <Inventory  
                inventory={town.storage.inventory}
                position="right"
                buttons={["withdraw"]}
                limit={town.storage.level * 5}
                logMessage={logMessage}
            />
            }
            <button 
                className="menu_btn center_abs_hor" 
                style={{bottom: "50px", position: "absolute"}}
                onClick={() => {
                    applyRest();
                    logMessage(`${character.name} has rested and has recovered.`);
                }}
                disabled={getItem(character.inventory, { id: "000", amount: 100 }).state.amount < 100}
            >
                Rest 100G
            </button>
        </div>
    )
}