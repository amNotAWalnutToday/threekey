import PlayerSchema from "../schemas/PlayerSchema"

type Props = {
    player: PlayerSchema,
    index: number,
}

export default function Player({player, index}: Props) {

    return (
        <div style={{}} className="player">
            <div className="emptyBar">
                <div style={{width: player.stats.combat.health.cur}} className="health">
                    <p style={{fontSize: "10px"}} >{player.stats.combat.health.cur} / {player.stats.combat.health.max}</p>
                </div>
            </div>
        </div>
    )
}
