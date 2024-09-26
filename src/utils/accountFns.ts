import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import firebaseConfig from '../../firebaseConfig';

export default (() => {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app, firebaseConfig.databaseURL);
    
    return {
        db
    }
})();