import itemData from '../data/items.json';

type Props = {
    item: typeof itemData[0],
    amount: number,
    selected: boolean,
    click?: () => void,
}

export default function Item({item, amount, selected, click}: Props) {
    return (
        <div
            className={`inventory_item ${selected && 'selected'}`}
            onClick={click}
        >
            <p>{item.name}</p>
            <p>{amount}</p>
        </div>
    )
}
