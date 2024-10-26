import { useState } from "react";
import AbilitySchema from "../schemas/AbilitySchema";
import AbilityTooltip from "./AbilityTooltip";

type Props = {
    selectTargetByAbility: (abilityType: string) => void;
    ability: AbilitySchema;
    click: () => void;
}

export default function AbilityButton({ability, selectTargetByAbility, click}: Props) {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <button 
            onClick={click} 
            onMouseEnter={() => {
                selectTargetByAbility(ability.type)
                setShowTooltip(() => true);
            }}
            onMouseLeave={() => setShowTooltip(() => false)}
            className="ability_btn"
        >
            {ability.name}
            {showTooltip
            &&
            <AbilityTooltip
                ability={ability}
            />
            }
        </button>
    )
}