import * as React from 'react';
import * as Redux from 'redux';
import { GoogleLogin, GoogleLogout, GoogleLoginResponse } from 'react-google-login'

import { Map } from './Map';
import { Actions, getInitialState } from './GameState';
import { EditMap } from './EditMap';
import { store, saveState } from './Store';
import { Network, Pair } from './Utils';
import { Profile } from './Profile'
import { Infantry, Tank, General, Unit } from './Unit';
import * as StoreEdit from './StoreEdit';
import * as GameEditState from './GameEditState';

class EnterGameButton extends React.Component<any, any> {
    constructor(props: any) {
        super(props);
    }

    render() {
        return <button id="enterGame" name="enterGame" className="btn btn-primary btn-sm" onClick={this.onClick.bind(this)}>Jugar</button>
    }

    onClick() {
        if(this.props.parentObject.state.clientId==null){
            window.alert("Necesita iniciar sesión para usar esta opción");
        }else{
            // Realizamos una llamada al servidor para obtener el estado inicial de las partidas
            getInitialState((height, width) => {
                // Reiniciamos el estado
                store.dispatch(Actions.generateFinish());
                // Y también cambiamos el estado del juego
                this.props.parentObject.changeGameState(5);
                // TODO En caso de partida jugada, echar a este jugador ya que no debería poder jugar
                // Comprobamos si hay ganador o perdedor, en cuyo caso se reiniciará el estado al entrar en el juego
                if (store.getState().map && store.getState().actualState > 0) {
                    // Si se ha producido esto, debemos reiniciar el estado
                    store.dispatch(Actions.generateFinish());
                    // Ejecutamos también el reiniciado de estado del mapa
                    store.getState().map.restartState();
                }
            });
        }

    }
}

class EditGameButton extends React.Component<any, any> {
    constructor(props : any) {
        super(props);
    }

    render() {
        return <button id="editGame" name="editGame" className="btn btn-primary btn-sm" onClick={this.onClick.bind(this)}>Acceder a la edición de mapa</button>
    }

    onClick() {
        if(this.props.parentObject.state.clientId==null){
            window.alert("Necesita iniciar sesión para usar esta opción");
        }else{
            this.props.parentObject.changeGameState(3);
        }
    }
}

class ProfileButton extends React.Component<any, any> {
    constructor(props : any) {
        super(props);
    }

    render() {
        return <button id="profileButton" name="profileButton" className="btn btn-primary btn-sm" onClick={this.onClick.bind(this)}>Acceder al perfil personal</button>
    }

    onClick() {
        if(this.props.parentObject.state.clientId==null){
            window.alert("Necesita iniciar sesión para usar esta opción");
        }else{
            this.props.parentObject.changeGameState(6);
        }
    }
}


class OptionsMenuButton extends React.Component<any, any> {
    constructor(props : any) {
        super(props);
    }

    render() {
        return <button id="optionsMenu" name="optionsMenu" className="btn btn-primary btn-sm" onClick={this.onClick.bind(this)}>Acceder al menu de opciones</button>
    }

    onClick() {
        this.props.parentObject.changeGameState(1);
    }
}

class OptionsMenu extends React.Component<any, any> {
    constructor(props : any) {
        super(props);
    }

    render() {
        return <div className="optionsMenu">
            <button id="exitButton" name="exitButton" onClick={this.onClick.bind(this)}>Volver al menu</button>
        </div>
    }

    onClick(clickEvent : React.MouseEvent<HTMLElement>) {
        this.props.parentObject.changeGameState(0);
    }
}

class SideOptionMenu extends React.Component<any, any> {
    constructor(props: any) {
        super(props);
        this.state = { player: props.player };
    }

    render() {
        return (
            <div className={"sideOption"+this.state.player?"Player":"Enemy"}>
                <p>Introduce en el siguiente campo el código de ejército: </p>

                <textarea id={"army_"+this.props.player} onChange={this.onChangeArmy.bind(this)} placeholder="Introduzca aqui el código de ejército" />
            </div>
        );
    }

    onChangeArmy(mouseEvent: React.MouseEvent<HTMLElement>) {
        console.log("Changed for "+this.props.player);
        // Obtenemos el dato de entrada
        let textArea: HTMLTextAreaElement = document.getElementById("army_"+this.props.player) as HTMLTextAreaElement;
        let unitsJSON = textArea.value;
        // Lo transformamos en el tipo requerido
        let unitsPair: Array<{ type: string, number: number }> = JSON.parse(unitsJSON);
        console.log()
        // Cambiamos el estado del padre
        this.props.parentObject.setState({
            custom: this.props.parentObject.state.custom,
            // Dependiendo de que sea el jugador o no, cambiamos el elemento del estado
            playerArmy: this.props.player?unitsPair:this.props.parentObject.state.playerArmy,
            enemyArmy: !this.props.player?unitsPair:this.props.parentObject.state.enemyArmy
        })
    }
}

class PreGameMenu extends React.Component<any, any> {
    constructor(props: any) {
        super(props);
        this.state = {
            playerArmy: [] as Array<{type: string, number: number}>,
            enemyArmy: [] as Array<{type: string, number: number}>,
            mapId: [] as Array<number>,
            mapName: [] as Array<string>,
            armyId: [] as Array<number>,
            armyName: [] as Array<string>,
            selected: null,
            selectedPlayer: null,
            selectedEnemy: null,
            isPlayer: store.getState().isPlayer
        };
        this.getUserIdFromServer((error: { status: boolean, errorCode: string, userId: number })=>{
            this.getArmyIdFromServer(error);
        });
    }

    render() {
        return (
        <div className="jumbotron text-center">
            <h2>Menu de selección <button className="btn btn-primary btn-sm" onClick={this.exitPreGame.bind(this)}>Volver</button></h2>
            {this.showPlayerMenu()}
            <button className="btn btn-primary btn-sm" onClick={this.startGame.bind(this)}>Empezar juego</button><br/>
        </div>);
    }

    updatePlayer(evt: string) {
        // Comprobamos que el select tenga seleccionado el 'custom'
        this.setState({ selectedPlayer: Number(evt) });
    }

    updateEnemy(evt: string) {
        // Comprobamos que el select tenga seleccionado el 'custom'
        this.setState({ selectedEnemy: Number(evt) });
    }

    selectUnits(){
        console.log(this.state.armyId);
        let army = null;
        if(this.state.armyId) {
            army = [<option selected value={null}>--Selecciona--</option>];
            for(var i = 0; i < this.state.armyId.length; i++){
                army.push(<option value={this.state.armyId[i]}>{this.state.armyName[i]}</option>);
            }
        }
        return army;
    }

    selectMaps(){
        console.log(this.state.mapId);
        let map = null;
        if(this.state.mapId){
            map = [<option selected value={null}>--Selecciona--</option>];
            for(var i = 0; i < this.state.mapId.length; i++){
                map.push(<option value={this.state.mapId[i]}>{this.state.mapName[i]}</option>);
            }
        }
        return map;
    }

    showPlayerMenu() {
        if(this.state.isPlayer) {
            return (
            <div>
                <div className="form-group">
                    <label> Seleccione el batallón aliado:
                    <select className="form-control" id="player" defaultValue={null} value={this.state.selectedPlayer} onChange={evt => this.updatePlayer(evt.target.value)}>
                        {this.selectUnits()}
                    </select>
                    </label>
                </div>
                <div className="form-group">
                    <label> Seleccione el mapa:
                    <select className="form-control" id="map" defaultValue={null} value={this.state.selected} onChange={evt => this.updateMap(evt.target.value)}>
                        {this.selectMaps()}
                    </select>
                    </label>
                </div>
            </div>);
        } else {
            return (<div className="form-group">
                <label> Seleccione el batallón enemigo:
                <select className="form-control" id="enemy" defaultValue={null} value={this.state.selectedEnemy} onChange={evt => this.updateEnemy(evt.target.value)}>
                    {this.selectUnits()}
                </select>
                </label>
            </div>);
        }
    }

    getUserIdFromServer(callback?: (error: { status: boolean, errorCode: string, userId: number }) => void) {
        // Primero, establecemos la conexión con el servidor
        let connection = Network.getConnection();
        let armyprofileclient: {
            googleId: number
        } = {
            // Incluimos el id del usuario de Google
            googleId: this.props.parentObject.state.clientId
        };
        Network.receiveProfileIdFromServer(armyprofileclient,(statusCode: { status: boolean, error: string, id: number }) => {
            if(!statusCode.status) {
                // Si ha salido mal, alertamos al usuario
                console.log("No se ha podido obtener correctamente el perfil");
            } else {
                callback({status: statusCode.status, errorCode: statusCode.error, userId: statusCode.id});
            }
        });
    }

    getArmyIdFromServer(errorCode: { status: boolean, errorCode: string, userId: number }, callback?: (error: { status: boolean, errorCode: string, armyId: number[], armyName: string[] }) => void) {
        // Primero, establecemos la conexión con el servidor
        var game = this;
        let connection = Network.getConnection();
        let armyclient: {
            userId: number
        } = {
            // Incluimos el id del usuario de Google
            userId: errorCode.userId
        };
        connection.onmessage = function(event: MessageEvent) {
            // Generalmente, no esperaremos una respuesta, por lo que simplemente aseguramos que
            // el comando se haya entendido
            console.log("recepción de la información del servidor "+JSON.stringify(event));
            if(event.data == "Command not understood") {
                // Lanzamos un error
                console.log("Error when attempting to save, server didn't understood request");
                //No es necesario llamar al callback porque este ya es el nivel final (cliente)
            } else {
                console.log(event.data);
                let data = JSON.parse(event.data);
                game.setState({
                    mapId: game.state.mapId,
                    mapName: game.state.mapName,
                    selected: game.state.selected,
                    selectedPlayer: game.state.selectedPlayer,
                    selectedEnemy: game.state.selectedEnemy,
                    custom: game.state.custom,
                    playerArmy: game.state.playerArmy,
                    enemyArmy: game.state.enemyArmy,
                    armyId: data.armyId,
                    armyName: data.armyName});
                    let connection = Network.getConnection();
                let mapclient: {
                    googleId: number
                } = {
                    // Incluimos el id del usuario de Google
                    googleId: game.props.parentObject.state.clientId
                };
                connection.onmessage = function(event: MessageEvent) {
                    // Generalmente, no esperaremos una respuesta, por lo que simplemente aseguramos que
                    // el comando se haya entendido
                    console.log("recepción de la información del servidor "+JSON.stringify(event));
                    if(event.data == "Command not understood") {
                        // Lanzamos un error
                        console.log("Error when attempting to save, server didn't understood request");
                        //No es necesario llamar al callback porque este ya es el nivel final (cliente)
                    } else {
                        console.log(event.data);
                        let data = JSON.parse(event.data);
                        game.setState({
                            armyId: game.state.armyId,
                            armyName: game.state.armyName,
                            selected: game.state.selected,
                            selectedPlayer: game.state.selectedPlayer,
                            selectedEnemy: game.state.selectedEnemy,
                            custom: game.state.custom,
                            playerArmy: game.state.playerArmy,
                            enemyArmy: game.state.enemyArmy,
                            mapId: data.mapId,
                            mapName: data.mapName
                        });
                    }
                };
                // Al abrirse la conexión, informamos al servidor del mapa
                connection.send(JSON.stringify({
                    tipo: "getMapId",
                    mapclient: mapclient
                }));
            }
        };
        // Al abrirse la conexión, informamos al servidor del mapa
        connection.send(JSON.stringify({
            tipo: "getArmyId",
            armyclient: armyclient
        }));
    }

    //Get map
    getMapFromServer(mapData: { id: number }, callback?: (error: { status: boolean, errorCode: string, map: string }) => void) {
        // Primero, establecemos la conexión con el servidor
        var game= this;
        let connection = Network.getConnection();
        connection.onmessage = function(event: MessageEvent) {
            // Generalmente, no esperaremos una respuesta, por lo que simplemente aseguramos que
            // el comando se haya entendido
            let data = Network.parseMapServer(event.data);
            if(event.data == "Command not understood") {
                // Lanzamos un error
                console.log("Error when attempting to save, server didn't understood request");
            } else {
                // En caso contrario, ejecutamos el callback sin errores
                console.log("Terrenos en estado: "+data.terrains);
                if(callback) {
                    callback({ status: true, errorCode: "Success", map: null});
                }
            }
        };
        // Al abrirse la conexión, informamos al servidor del mapa
        connection.send(JSON.stringify({
            tipo: "getMap",
            mapData: mapData.id
        }));
    }

    //Get player units
    getPlayerFromServer(army: number
        , callback?: (error: { status: boolean, errorCode: string, units: Array<Unit> }) => void) {
        // Primero, establecemos la conexión con el servidor
        var game= this;
        let connection = Network.getConnection();
        connection.onmessage = function(event: MessageEvent) {
            // Generalmente, no esperaremos una respuesta, por lo que simplemente aseguramos que
            // el comando se haya entendido
            console.log("Datos "+JSON.stringify(event.data));
            if(event.data == "Command not understood") {
                // Lanzamos un error
                console.log("Error when attempting to save, server didn't understood request");
            } else {
                let data = JSON.parse(event.data);
                let units = new Array<Unit>();
                console.log("Unidades aliadas "+JSON.stringify(data.units));
                units = units.concat(Network.parseArmy(data.units, true));
                callback({status: data.status, errorCode: data.error, units: units});
            }
        };
        // Al abrirse la conexión, informamos al servidor del mapa
        connection.send(JSON.stringify({
            tipo: "getUnits",
            armyclient: army,
            side: true
        }));
    }

    //Get enemy units
    getEnemyFromServer(army: number
        , callback?: (error: { status: boolean, errorCode: string, units: Array<Unit> }) => void) {
        // Primero, establecemos la conexión con el servidor
        var game= this;
        let connection = Network.getConnection();
        connection.onmessage = function(event: MessageEvent) {
            // Generalmente, no esperaremos una respuesta, por lo que simplemente aseguramos que
            // el comando se haya entendido
            console.log("Datos "+JSON.stringify(event.data));
            if(event.data == "Command not understood") {
                // Lanzamos un error
                console.log("Error when attempting to save, server didn't understood request");
            } else {
                let data = JSON.parse(event.data);
                let units = new Array<Unit>();
                console.log("Unidades enemigas "+JSON.stringify(data.units));
                units = units.concat(Network.parseArmy(data.units, false));
                callback({status: data.status, errorCode: data.error, units: units});
            }
        };
        // Al abrirse la conexión, informamos al servidor del mapa
        connection.send(JSON.stringify({
            tipo: "getUnits",
            armyclient: army,
            side: false
        }));
    }

    startGame(event: MouseEvent) {
        if((this.state.selected!=null || !this.state.isPlayer) && (this.state.selectedPlayer!=null || !this.state.isPlayer) && (this.state.selectedEnemy!=null || this.state.isPlayer)){
            console.log("Valor de selected en Game = "+ this.state.selected+" Valor de selectedPlayer en game= "+this.state.selectedPlayer+ " y de enemy= "+this.state.selectedEnemy);
            //Por ahora se hará este triple callback pero si hubiera multijugador no sería necesario, solo uno
            var game= this;
            // Definimos objetos que nos servirán para hacer el polling del inicio del juego
            var parentObject = this.props.parentObject;
            let pollingStart = function pollingStart() {
                console.log("Polling pre game state from server");
                Network.sendSyncState(store.getState(), parentObject.state.rows, parentObject.state.columns, (statusCode) => {
                    console.dir(statusCode.state);
                    if (statusCode.status == false) {
                        console.error("Ha fallado la sincronización con el servidor");
                    } else {
                        // Cuando salga bien, emitiremos un guardado de estado y cambiamos al inicio del juego
                        console.dir(statusCode.state);
                        saveState(statusCode.state);
                        parentObject.setState({
                            gameState: 2,
                            rows: statusCode.state.height,
                            columns: statusCode.state.width
                        });
                        // Comprobamos si el jugador actual es el 2º
                        if(!store.getState().isPlayer) {
                            // Si lo es, necesitaremos esperar al turno del otro jugador
                            store.dispatch(Actions.generateNextTurn());
                        }
                    }
                });
            };
            if(this.state.isPlayer) {
                game.getMapFromServer({id: game.state.selected}, (error: any) => {
                    game.getPlayerFromServer(game.state.selectedPlayer, (errorplayer: { status: boolean, errorCode: string, units: Array<Unit> })=>{
                        pollingStart();
                    });
                });
            } else {
                game.getEnemyFromServer(game.state.selectedEnemy,(errorenemy: { status: boolean, errorCode: string, units: Array<Unit> })=>{
                    // Iniciamos el proceso de polling para comprobar que el otro usuario haya terminado con su configuración
                    pollingStart();
                })
            }


        }else{
            window.alert("Debe seleccionar los batallones y el mapa para continuar");
        }
    }

    // Actualiza el componente de poder introducir el mapa, en el caso de seleccionar
    // la opción de 'Personalizado'.
    updateMap(evt: string) {
        // Comprobamos que el select tenga seleccionado el 'custom'
        this.setState({ selected: Number(evt) });
    }

    exitPreGame(mouseEvent: MouseEvent) {
        // Avisamos al servidor también
        Network.sendExitPreGame((statusCode: { status: boolean, message: string }) => {
            // No hacemos nada, hemos enviado una finalización de la partida.
        });
        // Para salir, cambiamos el estado del menu del juego.
        this.props.parentObject.setState({ gameState: 0 });
    }
}



class CreateMenu extends React.Component<any, any> {
    constructor(props : any) {
        super(props);
        this.state = { error: false,
            mapId: [] as Array<number>,
            mapName: [] as Array<string>};
        this.getMapIdFromServer();
    }

    getMapIdFromServer(callback?: (error: { status: boolean, errorCode: string, mapId: number[], mapName: string[] }) => void) {
        // Primero, establecemos la conexión con el servidor
        let game = this;
        let connection = Network.getConnection();
        let mapclient: {
            googleId: number
        } = {
            // Incluimos el id del usuario de Google
            googleId: this.props.parentObject.state.clientId
        };
        connection.onmessage = function(event: MessageEvent) {
            // Generalmente, no esperaremos una respuesta, por lo que simplemente aseguramos que
            // el comando se haya entendido
            console.log("recepción de la información del servidor "+JSON.stringify(event));
            if(event.data == "Command not understood") {
                // Lanzamos un error
                console.log("Error when attempting to save, server didn't understood request");
                //No es necesario llamar al callback porque este ya es el nivel final (cliente)
            } else {
                console.log(event.data);
                let data = JSON.parse(event.data);
                game.setState({mapId: data.mapId, mapName: data.mapName});
            }
        };
        connection.send(JSON.stringify({
            tipo: "getMapId",
            mapclient: mapclient
        }));
    }

    render() {
        return <div className="jumbotron text-center">
            <h2> Creación del mapa <button className="btn btn-primary btn-sm" id="exitButton" name="exitButton" onClick={this.onClickExit.bind(this)}>Volver al menu</button></h2>
            <label> Anchura:
                <input type="text" className="form-control" placeholder="Anchura" value={this.props.parentObject.state.editx} onChange={evt => this.updateInput(evt.target.value,this.props.parentObject.state.edity)} />
            </label>
            <label> Altura:
                <input type="text" className="form-control" placeholder="Altura" value={this.props.parentObject.state.edity} onChange={evt => this.updateInput(this.props.parentObject.state.editx,evt.target.value)} />
            </label>
            <button className="btn btn-primary btn-sm" id="createButton" name="createButton" onClick={this.onClickCreate.bind(this)}>Crear mapa</button><br/>
            {this.state.error?<div className="alert alert-danger" id="error">Deben introducirse valores numéricos</div>:""}
            <h2> Edición del mapa </h2>
            <label> Seleccione el mapa:
            <select className="form-control" id="map" defaultValue={null} value={this.state.selected} onChange={evt => this.updateMap(evt.target.value)}>
                {this.selectMaps()}
            </select>
            </label>
            <button className="btn btn-primary btn-sm" id="createButton" name="createButton" onClick={this.onClick.bind(this)}>Modificar mapa</button>
            <button className="btn btn-primary btn-sm" id="createButton" name="createButton" onClick={this.onClickDelete.bind(this)}>Eliminar mapa</button><br />
        </div>
    }

    onClickDelete(event: React.MouseEvent<HTMLElement>) {
        let jsonResult = {
            id: this.props.parentObject.state.selected
        };
        if(this.props.parentObject.state.selected!=null){
            // Enviaremos al servidor el contenido del mapa
            Network.deleteMapToServer(jsonResult);
            // Finalmente, mostramos en el textarea el resultado
            this.getMapIdFromServer();
            this.props.parentObject.changeSelected(null);
            window.alert("Se ha eliminado correctamente el perfil");
        }
    }

    // Actualiza el componente de poder introducir el mapa, en el caso de seleccionar
    // la opción de 'Personalizado'.
    updateMap(evt: string) {
        // Comprobamos que el select tenga seleccionado el 'custom'
        this.props.parentObject.changeSelected(evt);
    }

    selectMaps(){
        let map = [<option selected value={null}>--Selecciona--</option>];
        for(var i = 0; i < this.state.mapId.length; i++){
            map.push(<option value={this.state.mapId[i]}>{this.state.mapName[i]}</option>);
        }
        return map;
    }

    updateInput(x: string, y: string) {
        this.props.parentObject.setMapSize(x,y);
    }

    onClickCreate(clickEvent : React.MouseEvent<HTMLElement>) {
        this.props.parentObject.changeSelected(null);
        if(this.props.parentObject.state.editx.match(/^[1-9][0-9]*$/g) && this.props.parentObject.state.edity.match(/^[1-9][0-9]*$/g)){
            this.setState({ error: false });
            this.props.parentObject.changeGameState(4);
        }else{
            this.setState({ error: true });
            this.props.parentObject.changeGameState(3);
        }
    }

    onClick(clickEvent : React.MouseEvent<HTMLElement>) {
        if(this.props.parentObject.state.selected!=null){
            this.setState({ error: false });
            //Es necesario porque rows y columns no se actualizan
            let game = this;
            let connection = Network.getConnection();
            connection.onmessage = function(event: MessageEvent) {
                // Generalmente, no esperaremos una respuesta, por lo que simplemente aseguramos que
                // el comando se haya entendido
                console.log("Datos "+JSON.stringify(event.data));
                let data = Network.parseMapServer(event.data);
                if(event.data == "Command not understood") {
                    // Lanzamos un error
                    console.log("Error when attempting to save, server didn't understood request");
                } else {
                    // En caso contrario, ejecutamos el callback sin errores
                    game.props.parentObject.setMapSize(data.rows, data.columns);
                }
            };
            connection.send(JSON.stringify({
                tipo: "getMap",
                mapData: Number(this.props.parentObject.state.selected)
            }));

            this.props.parentObject.changeGameState(4);
        }else{
            window.alert("Se debe seleccionar un mapa");
            this.props.parentObject.changeGameState(3);
        }
    }

    onClickExit(clickEvent : React.MouseEvent<HTMLElement>){
        this.setState({ error: false });
        this.props.parentObject.changeGameState(0);
    }
}

class Game extends React.Component<any, any> {
    constructor(props : any) {
        super(props);
        this.state = {
            gameState: 0, // 0 es el menu del juego, 1 será el menú de opciones, 2 el juego, 3 edición de map y 5 el pre juego
            editx: "5",
            edity: "5",
            clientId: null, // Id del cliente loggeado
            selected: null,
            clientAvatar: null,
        };
    }

    render() {
        let result: any;
        switch(this.state.gameState) {
            case 1:
                result = <OptionsMenu parentObject={this} />;
                break;
            case 2:
                result = <Map horizontal={this.state.columns} vertical={this.state.rows} parentObject={this} />;
                break;
            case 3:
                result = <CreateMenu parentObject={this} />;
                break;
            case 4:
                result = <EditMap horizontal={this.state.editx} vertical={this.state.edity} selected={this.state.selected} parentObject={this} />;
                break;
            case 5:
                result = <PreGameMenu parentObject={this} />;
                break;
            case 6:
                result = <Profile parentObject={this} />;
                break;
            default:
                let loginInfo = null;
                if(this.state.clientId != null) { // Si el usuario ha iniciado sesión
                    loginInfo = <GoogleLogout clientId="637676591689-hqqsmqkfh446ot5klmul2tr8q8v1dsq6" onLogoutSuccess={this.onLogOut.bind(this)} />// La sección de registro contendrá el cierre de sesión
                } else {
                    loginInfo = <GoogleLogin clientId="637676591689-hqqsmqkfh446ot5klmul2tr8q8v1dsq6" onSuccess={this.onLogIn.bind(this)} onFailure={(e) => console.error(e)}  /> // En otro caso, contendrá el inicio de sesión
                }
                result = (
                    <div>
                        <script src="https://apis.google.com/js/platform.js" async defer></script>
                        <meta name="google-signin-client_id" content=" 637676591689-00d0rmr0ib1gsidcqtdleva0qkor596k.apps.googleusercontent.com" />

                        <div className="jumbotron text-center">
                            <div className="menu">
                                <h1> PanzergIO </h1>
                                <EnterGameButton parentObject={this} /><br />
                                <EditGameButton parentObject={this} /><br />
                                <ProfileButton parentObject={this} /><br />
                                <OptionsMenuButton parentObject={this} /><br />
                            </div>
                            <div className="loginDiv">
                                {loginInfo}
                            </div>
                        </div>
                    </div>
                );
                break;
        }

        let aud = '<audio src="./sounds/menu.ogg" loop autoplay ></audio>';

        let res = this.state.gameState!=2?
                    (<div>
                        <div dangerouslySetInnerHTML={{__html: aud}}>
                        </div>
                        {result}
                    </div>):result;

        return res;
    }

    changeSelected(selected: string) {
        this.setState({
            selected: selected
        });
    }

    changeGameState(stateNumber: number) {
        this.setState({
            gameState: stateNumber,
            editx: this.state.editx,
            edity: this.state.edity,
            clientId: this.state.clientId
        });
    }

    setMapSize(x: string, y: string){
        this.setState({ gameState: this.state.gameState, editx: x, edity: y});
    }

    onLogIn(response: GoogleLoginResponse) {
        // Enviamos al servidor los datos del login
        Network.sendLogInInfo(() => {
            console.log("Datos de login enviados");
            // También cambiamos el estado de este objeto para tener en cuenta eso
            this.setState({
                gameState: this.state.gameState,
                editx: this.state.editx,
                edity: this.state.edity,
                clientId: Number(response.getBasicProfile().getId()),
                clientAvatar: response.getBasicProfile().getImageUrl()
            });
            console.log(this.state.clientId);
        }, Number(response.getBasicProfile().getId()));
    }

    onLogOut() {
        // Enviamos el cerrado de sesión al servidor
        Network.sendLogOut(() => {
            console.log("Enviado logout");
            // También cambiamos el estado de este objeto para tener en cuenta eso
            this.setState({
                gameState: this.state.gameState,
                editx: this.state.editx,
                edity: this.state.edity,
                clientId: null
            });
        })
    }
}

export { Game };
