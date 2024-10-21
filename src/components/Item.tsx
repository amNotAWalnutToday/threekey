import itemData from '../data/items.json';

type Props = {
    item: typeof itemData[0],
    amount: number,
    requiredAmount?: number,
    selected: boolean,
    click?: () => void,
}

export default function Item({item, amount, requiredAmount, selected, click}: Props) {
    return (
        <div
            className={`inventory_item ${item.rarity} ${requiredAmount && amount < requiredAmount ? "border_red" : ""} ${selected && 'selected'}`}
            onClick={click}
        >
            <p>{item.name}</p>
            <p>{amount} {requiredAmount && <span>/ {requiredAmount}</span>}</p>
        </div>
    )
}
