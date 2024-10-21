import { useContext } from "react"
import UserContext from "../data/Context"
import TownSchema from "../schemas/TownSchema"
import Inventory from "../components/Inventory"

type Props = {
    town: TownSchema
    applyRest: () => void;
}

export default function Inn({town, applyRest}: Props) {
    const { character } = useContext(UserContext);
    
    return (
        <div className="inn" >
            <Inventory  
                inventory={character.inventory}
                position="left"
                buttons={town?.storage.level > 0 ? ["deposit"] : []}
                storage={town.storage.inventory}
                limit={10}
            />
            {town?.storage?.level > 0
            &&
            <Inventory  
                inventory={town.storage.inventory}
                position="right"
                buttons={["withdraw"]}
                limit={town.storage.level * 5}
            />
            }
            <button 
                className="menu_btn center_abs_hor" 
                style={{bottom: "50px", position: "absolute"}}
                onClick={applyRest}
            >
                Rest
            </button>
        </div>
    )
}