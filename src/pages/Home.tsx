import { useNavigate } from "react-router-dom"
import { useContext, useState } from "react"
import UserContext from "../data/Context"
import testdata from '../data/testdata.json';
import accountFns from "../utils/accountFns";
import townFns from "../utils/townFns";

const { createTown } = townFns;
const { createAccountAnon } = accountFns;

export default function Home() {
    const { character, setUser, setCharacter, user } = useContext(UserContext);
    const navigate = useNavigate();

    const [signingIn, setSigningIn] = useState(false);

    return (
        <div>
            <div className='main_menu' >
                <div className='menu'>
                    {
                    !user
                    ?
                    <button
                        className={`menu_link ${signingIn ? "disabled" : ""}`}
                        onClick={(async () => {
                            await createAccountAnon(setUser);
                            setSigningIn(() => true);
                        })}
                    >
                        { !signingIn ? "Play as Guest" : "Please Wait.." }
                    </button>
                    :
                    <button
                        className='menu_link'
                        onClick={() => navigate('/characters')}
                    >
                        Continue to Game
                    </button>
                    }
                </div>
                <button 
                    onClick={() => {
                        setUser(() => testdata.tsuki);
                        setCharacter(() => testdata.tsuki.characters[0]);
                        console.log(character);
                    }}
                >
                    Select Tsuki
                </button>
                <button 
                    onClick={() => {
                        setUser(() => testdata.werly);
                        setCharacter(() => testdata.werly.characters[0]);
                        console.log(character);
                    }}
                >
                    Select Werly
                </button>
                <button className="menu_btn" onClick={() => createTown()}>
                    create town
                </button>
            </div>
        </div>
    )
}