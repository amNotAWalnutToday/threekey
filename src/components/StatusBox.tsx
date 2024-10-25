import { useState } from "react";
import StatusSchema from "../schemas/StatusSchema"

type Props = {
    status: StatusSchema;
}

export default function StatusBox({status}: Props) {
    const [showTooltip, setShowTooltip] = useState(false);

    const mapAffects = () => {
        if(!status.affects) return;
        if(!status.affects.length) return;
        return status.affects.map((stat, index) => {
            return stat.length ? (
                <p key={`status-${stat}-${index}`} >{stat}: {status.amount}</p>
            ) : <p key={`status-dps-${stat}-${index}`} >{status.amount} DMG</p>
        });
    }

    return (
        <div 
            className="status" 
            onMouseEnter={() => setShowTooltip(() => true)}
            onMouseLeave={() => setShowTooltip(() => false)}
        >
            <p>{status.name}: {status.duration}</p>
            {showTooltip 
            &&
            <div className="tooltip" >
                {mapAffects()}
            </div>}
        </div>
    )
}