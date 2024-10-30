import ResourceBar from "./ResourceBar";
import PlayerSchema from "../schemas/PlayerSchema"
import combatFns from "../utils/combatFns";

const { getLevelUpReq } = combatFns;

type Props = {
    character: PlayerSchema;
}

export default function CharacterProfile({character}: Props) {
    
    const mapStatus = () => {
        if(!character.status) return "N/A";
        if(!character.status.length) return;
        return character.status.map((status, index) => {
            return (
                <div
                    key={`profile-status-${index}`}
                >
                    <p>{status.name}</p>
                </div>
            )
        });
    }
    
    return (
        <div className="menu inventory center_abs_hor character_profile" >
            <h1 style={{display: "flex", gap: "2rem", alignItems: "baseline"}} >{character.name} 
                <span className="small_title_font"> Lvl.{character.stats.level}</span>
                <span className="small_title_font"> {character.stats.rank.length ? character.stats.rank :  "Unranked"}</span>
            </h1>
            <h3>{character.role} <span className="small_title_font">[ {character?.order[0] ?? ""}, {character?.order[1] ?? ""} ]</span></h3>
            <div className="profile_menu_bars">
                <div className="profile_w_bar border_red">
                    Health 
                    <ResourceBar
                        max={character.stats.combat.health.max}
                        cur={character.stats.combat.health.cur}
                        type={"health"}
                        index={1}
                    />
                </div>
                {character.role === "naturalist" 
                && 
                <div className="profile_w_bar border_blue">
                    Mana
                    <ResourceBar
                        max={character.stats.combat.resources.mana.max}
                        cur={character.stats.combat.resources.mana.cur}
                        type={"mana"}
                        index={1}
                    />
                </div>}
                {character.role === "technologist" 
                && 
                <div className="profile_w_bar border_blue">
                    HSP | ESP
                    <ResourceBar
                        max={character.stats.combat.resources.psp.max}
                        cur={character.stats.combat.resources.psp.cur}
                        type={"overheat"}
                        index={1}
                    />
                    <ResourceBar
                        max={character.stats.combat.resources.msp.max}
                        cur={character.stats.combat.resources.msp.cur}
                        type={"overload"}
                        index={1}
                    />
                </div>}
                {character.role === "spiritualist" 
                && 
                <div className="profile_w_bar border_blue">
                    Soul
                    <ResourceBar
                        max={character.stats.combat.resources.soul.max}
                        cur={character.stats.combat.resources.soul.cur}
                        type={"soul"}
                        index={1}
                    />
                </div>}
                <div className="profile_w_bar border_aqua">
                    Xp
                    <ResourceBar
                        max={getLevelUpReq(character.stats.level, character.stats.rank)}
                        cur={character.stats.xp}
                        type={"xp"}
                        index={1}
                    />
                </div>
            </div>
            <div className="cen-flex" style={{justifyContent: "space-between"}}>
                <div>
                    <p>Attack: {character.stats.combat.attack}</p>
                    <p>Defence: {character.stats.combat.defence}</p>
                    <p>Speed: {character.stats.combat.speed}</p>
                    <div className={`${character.role} front player`} />
                </div>
                <div className="profile_status">
                    <h3>Status</h3>
                    {mapStatus()}
                </div>
            </div>
        </div>
    )
}