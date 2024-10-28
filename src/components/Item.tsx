import { useState } from 'react';
import itemData from '../data/items.json';

type Props = {
    item: typeof itemData[0],
    amount: number,
    requiredAmount?: number,
    selected: boolean,
    click?: () => void,
    inShop?: boolean,
}

export default function Item({item, amount, requiredAmount, selected, inShop, click}: Props) {
    const [showTooltip, setShowTooltip] = useState(false); 
    
    return (
        <div
            className={`inventory_item ${item.rarity} ${requiredAmount && amount < requiredAmount ? "border_red" : ""} ${selected && 'selected'}`}
            onClick={click}
            onMouseEnter={() => setShowTooltip(() => true)}
            onMouseLeave={() => setShowTooltip(() => false)}
        >
            {showTooltip
            &&
            <div className="tooltip">
                <p>{item.name}</p> 
                <p className={`${item.rarity}_text`} >{item.rarity}</p>
                <p>{item?.description}</p>
                <p>Max Stack: {item.stack}</p>
                <p>Buy: {item.price} | Sell: {Math.floor(item.price / 2)}</p>
            </div>}
            <p>{item.name}</p>
            <p>{amount}{inShop && " G"} {requiredAmount && <span>/ {requiredAmount}</span>}</p>
        </div>
    )
}
