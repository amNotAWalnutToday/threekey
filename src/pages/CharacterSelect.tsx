import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import accountFns from '../utils/accountFns';
import UserContext from '../data/Context';
import PlayerSchema from '../schemas/PlayerSchema';
import CharacterCreateMenu from '../components/CharacterCreateMenu';

const { getCharacters } = accountFns;

export default function CharacterSelect() {
    const { user, setCharacter } = useContext(UserContext);
    const navigate = useNavigate();

    const [characters, setCharacters] = useState<PlayerSchema[]>([]);
    const [showCreateMenu, setShowCreateMenu] = useState(false);

    const assignCharacters = async () => {
        if(!user) return;
        const characters = await getCharacters(user);
        if(!characters) return;
        setCharacters(() => {
            return characters;
        });
    }

    const mapCharacters = () => {
        return characters.map((character, index) => {
            return (
                <div
                    key={`character-${index}`}
                    className='character_btn'
                    onClick={() => {
                        setCharacter(character);
                        navigate('../town');
                    }}
                >
                    <p>{character.name}</p>
                    <p>{character.role}</p>
                    <p>Rank: {character.stats.rank.length ? character.stats.rank : '*_*'}</p>
                    <p>Level: {character.stats.level}</p>
                </div>
            )
        });
    }

    useEffect(() => {
        assignCharacters();
        /*eslint-disable-next-line*/
    }, []);

    return (
        <div className='character_select' >
            <div className="character_menu">
                <p className='menu_title' >💎Select Character</p>
                { mapCharacters() }
                <button 
                    className='menu_btn'
                    onClick={() => setShowCreateMenu((prev) => !prev)}
                >
                    New Character
                </button>
            </div>
            <div>

            </div>
            {
                showCreateMenu
                &&
                <CharacterCreateMenu />
            }
            {/* <button
                onClick={() => navigate('../town')}
            >
                Skip to town
            </button> */}
        </div>
    )
}
