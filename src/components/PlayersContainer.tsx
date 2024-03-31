import PlayerSchema from "../schemas/PlayerSchema";
import Player from "./Player";

type Props = { 
    players: PlayerSchema[],
    sideIndex: number,
}

export default function PlayersContainer({players, sideIndex}: Props) {
    const mapPlayers = () => {
        const filteredPlayers = [...players].filter((player) => {
            return (sideIndex === 1 && player.npc) || (sideIndex === 2 && !player.npc);
        });

        return filteredPlayers.map((player, index) => {
            return (
                <Player 
                    key={`player-${index}`}
                    player={player}
                    index={index}
                />
            )
        });
    }

    return (
        <div className={`side_${sideIndex}`} >
            {mapPlayers()}
        </div>
    )
}
