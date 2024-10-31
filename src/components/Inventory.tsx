import { useContext, useState } from "react";
import combatFns from "../utils/combatFns";
import partyFns from "../utils/partyFns";
import itemData from '../data/items.json';
import UserContext from "../data/Context";
import townFns from "../utils/townFns";
import Item from "./Item";
import PlayerSchema from "../schemas/PlayerSchema";
import TileSchema from "../schemas/TileSchema";
import FloorSchema from "../schemas/FloorSchema";

const { populateItem, applyItem, removeItem, getPlayer, assignItem, getItem } = combatFns;
const { uploadParty, syncPartyMemberToAccount } = partyFns;
const { assignItemToStorage, uploadTown, removeStoredItem } = townFns;

type Props = {
    inventory: {id: string, amount: number}[],
    position: "left" | "right" | "center",
    buttons: string[],
    storage?: {id: string, amount: number}[],
    limit: number,
    logMessage: (message: string) => void,
    toggleOff?: () => void;
    disarmTrap?: () => void; 
}

export default function Inventory({
    inventory, 
    position, 
    buttons, 
    storage, 
    limit, 
    logMessage, 
    toggleOff,
    disarmTrap,
}: Props) {
    const { character, party, setCharacter } = useContext(UserContext);
    const [selectedItem, setSelectedItem] = useState<{state: typeof itemData[0] | null, index: number}>({state: null, index: -1});
    const [selectedAmount, setSelectedAmount] = useState(0);

    const mapInventory = () => {
        if(!inventory) return;
        if(!inventory.length) return;
        return inventory.map((item, index) => {
            const fullItem = populateItem(item);
            if(!fullItem) return;
            function selectItem() {
                if(!fullItem) return;
                setSelectedAmount(() => 1);
                setSelectedItem(() => ({state: fullItem, index}));
            }
            return (
                <Item 
                    key={`item-${index}`}
                    item={fullItem}
                    amount={getButton("buy") ? fullItem.price : item.amount}
                    selected={selectedItem?.state?.id === item.id}
                    click={selectItem}
                    inShop={getButton("buy")}
                />
            )
        });
    }

    const uploadCharacterInventory = async (updatedPlayer: PlayerSchema) => {
        if(party.players) {
            const playerIndex = getPlayer(party.players, character.pid).index;
            party.players[playerIndex] = updatedPlayer;
            await uploadParty("players", { partyId: party.players[0].pid, players: party.players });
        }
        await syncPartyMemberToAccount(updatedPlayer);
        setSelectedItem(() => ({state: null, index: 0}));
        setCharacter(updatedPlayer);
    }

    const getButton = (button: string) => {
        return buttons.includes(button);
    }

    const getMaxRange = () => {
        if (!selectedItem?.state || !inventory.length) return 0;
        const stackSize = selectedItem.state.stack;
        const amount = inventory[selectedItem.index]?.amount || 0;
        if(getButton("withdraw") || getButton("buy")) {
            const amountInCharacterInventory = getItem(character.inventory, {id: selectedItem.state.id, amount: 0}).state.amount;
            return Math.min(stackSize - amountInCharacterInventory, stackSize, amount);
        }
        if(getButton("sell") && !selectedItem.state.price) {
            return 0;
        }
        return amount;
    }

    return (
        <div className={`inventory ${position}_abs_hor`} >
            <div className="inventory_items">
                {mapInventory()}
            </div>
            <hr />
            <p>{inventory.length} / {limit}</p>
            <div className="bottom_abs inventory_btn_bar">
                <div className="cen-flex" style={{gap: '1rem', margin: "5rem 0 0 0"}} >
                    {
                    getButton("use")
                    &&
                    <button
                        onClick={async () => {
                            const updatedPlayer = applyItem({ id: inventory[selectedItem.index].id, amount: selectedAmount}, { player: character } );
                            if(selectedItem?.state?.id === "041") { 
                                await uploadParty("location", { partyId: party.players[0].pid, location: { ...party.location, map: "-1" } });
                                await uploadParty("enemies", { partyId: party.players[0].pid, enemyIds: []});
                            } else if(selectedItem?.state?.id === "058") {
                                if(!disarmTrap) return;
                                await disarmTrap();
                            } else if(selectedItem?.state?.id === "059") {
                                await uploadParty("enemies", { partyId: party.players[0].pid, enemyIds: []});
                            }
                            await uploadCharacterInventory(updatedPlayer);
                            logMessage(`${character.name} has used a ${selectedItem.state?.name}.`);
                        }}
                        className="menu_btn"
                        disabled={!selectedItem?.state || !selectedItem?.state?.usable}
                    >
                        Use
                    </button>
                    }
                    {getButton("destroy")
                    &&
                    <button
                        className="menu_btn"
                        onClick={async () => {
                            const updatedPlayer = removeItem(character, { id: inventory[selectedItem.index].id, amount: selectedAmount} )
                            uploadCharacterInventory(updatedPlayer);
                        }}
                        disabled={!selectedItem.state}
                    >
                        Destroy
                    </button>
                    }
                    {getButton("deposit")
                    &&
                    <button
                        className="menu_btn"
                        onClick={async () => {
                            if(!selectedItem.state || !storage) return;
                            const updatedPlayer = removeItem(character, { id: inventory[selectedItem.index].id, amount: selectedAmount} )
                            const updatedStorageInventory = assignItemToStorage(storage, {id: selectedItem.state.id, amount: selectedAmount});
                            await uploadTown("inventory", {storageInventory: updatedStorageInventory});
                            await uploadCharacterInventory(updatedPlayer);
                        }}
                        disabled={!selectedItem.state}
                    >
                        Deposit
                    </button>
                    }
                    {getButton("withdraw")
                    &&
                    <button
                        className="menu_btn"
                        onClick={async () => {
                            if(!selectedItem.state) return;
                            if(getMaxRange() < 1) return;
                            const updatedPlayer = assignItem(character, { id: inventory[selectedItem.index].id, amount: selectedAmount} )
                            const updatedStorageInventory = removeStoredItem(inventory, {id: selectedItem.state.id, amount: selectedAmount});
                            uploadTown("inventory", {storageInventory: updatedStorageInventory});
                            uploadCharacterInventory(updatedPlayer);
                        }}
                        disabled={!selectedItem.state || getMaxRange() < 1}
                    >
                        Withdraw
                    </button>
                    }
                    {getButton("buy")
                    &&
                    <button
                        className="menu_btn"
                        onClick={async () => {
                            if(!selectedItem.state) return;
                            if(getMaxRange() < 1) return;
                            if(getItem(character?.inventory ?? [], { id: "000", amount: 0 })?.state.amount < selectedItem?.state.price * selectedAmount) return
                            let updatedPlayer = assignItem(character, { id: inventory[selectedItem.index].id, amount: selectedAmount} );
                            updatedPlayer = removeItem(updatedPlayer, { id: "000", amount: selectedItem.state.price * selectedAmount });
                            uploadCharacterInventory(updatedPlayer);
                        }}
                        disabled={!selectedItem.state || getMaxRange() < 1}
                    >
                        Buy {selectedAmount && selectedItem.state && selectedItem?.state?.price * selectedAmount}G
                    </button>
                    }
                    {getButton("sell")
                    &&
                    <button
                        className="menu_btn"
                        onClick={async () => {
                            if(!selectedItem.state) return;
                            if(getMaxRange() < 1) return;
                            const price = Math.floor(selectedItem.state.price / 2) * selectedAmount
                            let updatedPlayer = removeItem(character, { id: selectedItem.state.id, amount: selectedAmount });
                            updatedPlayer = assignItem(updatedPlayer, { id: "000", amount: price });
                            uploadCharacterInventory(updatedPlayer);
                        }}
                        disabled={!selectedItem.state || selectedAmount * Math.floor(selectedItem.state.price / 2) < 1}
                    >
                        Sell {selectedAmount && selectedItem.state && Math.floor((selectedItem?.state.price / 2)) * selectedAmount}G
                    </button>
                    }
                    {toggleOff
                    &&
                    <button
                        className="menu_btn"
                        onClick={toggleOff}
                    >
                        Close
                    </button>
                    }
                </div>
                <div className="cen-flex" style={{gap: '1rem'}}>
                    <input
                        className="menu_input"
                        min={1}
                        max={getMaxRange()}
                        type="number"
                        onChange={(e) => {
                            if(!inventory.length) return;
                            let value = Number(e.target.value)
                            if(value > inventory[selectedItem.index].amount) value = inventory[selectedItem.index].amount;
                            setSelectedAmount(() => value )
                        }}
                        value={selectedAmount}
                    />
                    <input
                        type="range"
                        min={1}
                        max={getMaxRange()}
                        onChange={(e) => setSelectedAmount(() => Number(e.target.value) )}
                        value={selectedAmount}
                    />
                </div>
            </div>
        </div>
    )
}