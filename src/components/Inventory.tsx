import { useContext, useState } from "react";
import combatFns from "../utils/combatFns";
import partyFns from "../utils/partyFns";
import itemData from '../data/items.json';
import UserContext from "../data/Context";
import townFns from "../utils/townFns";
import Item from "./Item";

const { populateItem, applyItem, removeItem, getPlayer, assignItem, getItem } = combatFns;
const { uploadParty, syncPartyMemberToAccount } = partyFns;
const { assignItemToStorage, uploadTown, removeStoredItem } = townFns;

type Props = {
    inventory: {id: string, amount: number}[],
    position: "left" | "right" | "center",
    buttons: string[],
    storage?: {id: string, amount: number}[],
    limit: number,
}

export default function Inventory({inventory, position, buttons, storage, limit}: Props) {
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
                    amount={item.amount}
                    selected={selectedItem?.state?.id === item.id}
                    click={selectItem}
                />
            )
        });
    }

    const getButton = (button: string) => {
        return buttons.includes(button);
    }

    const getMaxRange = () => {
        if (!selectedItem?.state || !inventory.length) return 0;
        const stackSize = selectedItem.state.stack;
        let amount = inventory[selectedItem.index]?.amount || 0;
        if(getButton("withdraw")) {
            amount = getItem(character.inventory, {id: selectedItem.state.id, amount: 0}).state.amount;
            return stackSize - amount > stackSize ? 0 : stackSize - amount;
        }
        return amount;
    }

    return (
        <div className={`inventory menu ${position}_abs_hor`} >
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
                            if(party.players) {
                                const playerIndex = getPlayer(party.players, character.pid).index;
                                party.players[playerIndex] = updatedPlayer;
                                await uploadParty("players", { partyId: party.players[0].pid, players: party.players });
                            }
                            await syncPartyMemberToAccount(updatedPlayer);
                            setSelectedItem(() => ({state: null, index: 0}));
                            setCharacter(updatedPlayer);
                        }}
                        className="menu_btn"
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
                            if(party.players) {
                                const playerIndex = getPlayer(party.players, character.pid).index;
                                party.players[playerIndex] = updatedPlayer;
                                await uploadParty("players", { partyId: party.players[0].pid, players: party.players });
                            }
                            await syncPartyMemberToAccount(updatedPlayer);
                            setSelectedItem(() => ({state: null, index: 0}));
                            setCharacter(updatedPlayer);
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
                            uploadTown("inventory", {storageInventory: updatedStorageInventory});
                            if(party.players) {
                                const playerIndex = getPlayer(party.players, character.pid).index;
                                party.players[playerIndex] = updatedPlayer;
                                await uploadParty("players", { partyId: party.players[0].pid, players: party.players });
                            }
                            await syncPartyMemberToAccount(updatedPlayer);
                            setSelectedItem(() => ({state: null, index: 0}));
                            setCharacter(updatedPlayer);
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
                            if(party.players) {
                                const playerIndex = getPlayer(party.players, character.pid).index;
                                party.players[playerIndex] = updatedPlayer;
                                await uploadParty("players", { partyId: party.players[0].pid, players: party.players });
                            }
                            await syncPartyMemberToAccount(updatedPlayer);
                            setSelectedItem(() => ({state: null, index: 0}));
                            setCharacter(updatedPlayer);
                        }}
                        disabled={!selectedItem.state || getMaxRange() < 1}
                    >
                        Withdraw
                    </button>
                    }
                </div>
                <div className="cen-flex" style={{gap: '1rem'}}>
                    <input
                        className="menu_input"
                        min={0}
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
                        min={0}
                        max={getMaxRange()}
                        onChange={(e) => setSelectedAmount(() => Number(e.target.value) )}
                        value={selectedAmount}
                    />
                </div>
            </div>
        </div>
    )
}