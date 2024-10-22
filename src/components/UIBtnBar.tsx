type Props = {
    showInventory: () => void;
    showProfile: () => void;
    showTree: () => void;
}

export default function UIButtonBar({showInventory, showProfile, showTree}: Props) {
    return (
        <div className="ui_btn_bar" >
            <button 
                className="menu_btn"
                onClick={showInventory}
            >
                Inventory
            </button>
            <button 
                className="menu_btn"
                onClick={showProfile}
            >
                Profile
            </button>
            <button 
                className="menu_btn"
                onClick={showTree}
            >
                Skills
            </button>
        </div>
    )
}