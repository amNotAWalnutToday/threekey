import { useContext } from "react"
import UserContext from "../data/Context"
import ResourceBar from "./ResourceBar";

export default function PartyMenu() {
    const { party } = useContext(UserContext);

    const mapParty = () => {
        return party.players.map((player, index) => {
            return (
                <div
                    key={`party-player-${index}`}
                    className="party_menu_player character_btn"
                >
                    <p>{player.name} Lvl.{player.stats.level} {player.stats.rank}</p>
                    <div className="party_menu_bars">
                        <ResourceBar
                            max={player.stats.combat.health.max}
                            cur={player.stats.combat.health.cur}
                            type={"health"}
                            index={1}
                        />
                        <ResourceBar
                            max={player.stats.combat.resources.mana.max}
                            cur={player.stats.combat.resources.mana.cur}
                            type={"mana"}
                            index={1}
                        />
                    </div>
                </div>
            )
        });
    }
    
    return (
        <div className="party_menu" >
            {mapParty()}
        </div>
    )
}