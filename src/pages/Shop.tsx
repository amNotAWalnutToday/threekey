import { useContext } from "react"
import UserContext from "../data/Context"
import TownSchema from "../schemas/TownSchema"
import Inventory from "../components/Inventory"
import townFns from "../utils/townFns"

const { getShopStock } = townFns;

type Props = {
    town: TownSchema,
    logMessage: (message: string) => void;
}

export default function Shop({town, logMessage}: Props) {
    const { character } = useContext(UserContext);

    return (
        <div>
            <Inventory  
                inventory={character.inventory}
                position="left"
                buttons={["sell"]}
                limit={10}
                logMessage={logMessage}
            />
            <Inventory
                inventory={getShopStock(town.shop.level) ?? []}
                position="right"
                buttons={["buy"]}
                limit={1000}
                logMessage={logMessage}
            />
        </div>
    )
}