import { useContext, useState } from "react";
import combatFns from "../utils/combatFns";
import partyFns from "../utils/partyFns";
import itemData from '../data/items.json';
import UserContext from "../data/Context";

const { populateItem, applyItem, removeItem, getPlayer } = combatFns;
const { uploadParty, syncPartyMemberToAccount } = partyFns;

type Props = {
    inventory: {id: string, amount: number}[],
}

export default function Inventory({inventory}: Props) {
    const { character, party, setCharacter } = useContext(UserContext);
    const [selectedItem, setSelectedItem] = useState<{state: typeof itemData[0] | null, index: number}>({state: null, index: -1});
    const [selectedAmount, setSelectedAmount] = useState(0);

    const mapInventory = () => {
        if(!inventory) return;
        if(!inventory.length) return;
        return inventory.map((item, index) => {
            const fullItem = populateItem(item);
            if(!fullItem) return;
            return (
                <div
                    className={`inventory_item ${selectedItem?.state?.id === item.id && 'selected'}`}
                    onClick={() => {
                        setSelectedAmount(() => 1);
                        setSelectedItem(() => ({state: fullItem, index}));
                    }}
                    key={`item-${index}`}
                >
                    <p>{fullItem?.name}</p>
                    <p>{item.amount}</p>
                </div>
            )
        });
    }

    return (
        <div className="inventory menu" >
            <div className="inventory_items">
                {mapInventory()}
            </div>
            <div className="cen-flex" style={{gap: '1rem', margin: "5rem 0 0 0"}} >
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
            </div>
            <div className="cen-flex" style={{gap: '1rem'}}>
                <input
                    className="menu_input"
                    min={0}
                    max={selectedItem.state && inventory.length ? inventory[selectedItem?.index]?.amount : 0}
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
                    max={selectedItem.state && inventory.length ? inventory[selectedItem?.index]?.amount : 0}
                    onChange={(e) => setSelectedAmount(() => Number(e.target.value) )}
                    value={selectedAmount}
                />
            </div>
        </div>
    )
}