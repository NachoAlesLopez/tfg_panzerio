import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Redux from 'redux';
import { storeEdit, saveState } from './StoreEdit';
import { ReducerEdit, StateEdit, EditActions, InitialStateEdit} from './GameEditState';
import { Cell } from './Cell';
import { EditCell } from './EditCell';
import { TerrainCell } from './TerrainCell';
import { Pair, Cubic, myIndexOf, cubic_directions, myIndexOfCubic, Pathfinding } from './Utils';
import { UnitCell } from './UnitCell';
import { UnitStats } from './UnitStats';
import { EditStats } from './EditStats';
import { Unit, Infantry, Tank, General } from './Unit';
import { Terrain, Plains, ImpassableMountain, Hills, Forest } from './Terrains';

/** Representa el mapa que contendrá las unidades y las casillas **/
export class EditMap extends React.Component<any, any> {
    editStats: EditStats = null;

    restartState() {
        this.state = { cells: new Array<Array<EditCell>>(this.props.horizontal), rows: this.props.vertical, columns: this.props.horizontal };
        storeEdit.dispatch(EditActions.generateSetListener(this));
    }

    /** @constructor  Deben introducirse los elementos horizontal y vertical **/
    constructor(props: any) {
        super(props);
        this.restartState();
    }

    /** Renderiza el mapa **/
    render() {
        // El mapa se renderizará en un div con estilo, por ello debemos usar className="map"
        console.log("valor del type: "+storeEdit.getState().type);
        return (
            <div>
                {storeEdit.getState().type!="CREATE_UNIT"?<button id="unitButton" name="unitButton" onClick={this.onClickCreateUnit.bind(this)}>Crear unidad</button>:""}
                {storeEdit.getState().type!="CREATE_TERRAIN"?<button id="terrainButton" name="terrainButton" onClick={this.onClickCreateTerrain.bind(this)}>Crear terreno</button>:""}
                {storeEdit.getState().type!="DELETE"?<button id="deleteButton" name="deleteButton" onClick={this.onClickDelete.bind(this)}>Eliminar unidad</button>:""}
                {storeEdit.getState().type=="CREATE_UNIT"?<p>Acción: Creación de unidad. Bando actual: {storeEdit.getState().side?"Jugador":"Enemigo"}</p>:""}
                {storeEdit.getState().type=="CREATE_UNIT"?<button id="sideButton" name="sideButton" onClick={this.onClickSide.bind(this)}>Cambiar bando</button>:""}
                    {storeEdit.getState().type=="CREATE_UNIT"?<select value={storeEdit.getState().selected} onChange={evt => this.selected(evt.target.value)}>
                        <option value="Infantry">Infantería</option>
                        <option value="Tank">Tanque</option>
                        {storeEdit.getState().units.filter(x => x.player==storeEdit.getState().side && x.name=="General").length==0?<option value="General">General</option>:""}
                    </select>:""}
                {storeEdit.getState().type=="CREATE_TERRAIN"?<p>Acción= Creación de terreno</p>:""}
                    {storeEdit.getState().type=="CREATE_TERRAIN"?<select value={storeEdit.getState().selected} onChange={evt => this.selected(evt.target.value)}>
                        <option value="Plains">Llanura</option>
                        <option value="Mountains">Montaña</option>
                        <option value="Hills">Colina</option>
                        <option value="Forest">Bosque</option>
                    </select>:""}
                <button id="exitButton" name="exitButton" onClick={this.onClickExit.bind(this)}>Salir del juego</button>
                <div>
                    <EditStats map={this}/>
                    <div id="map" className="map" onClick={this.onClick.bind(this)} tabIndex={0} onKeyDown={this.onKey.bind(this)} onContextMenu={this.onRightClick.bind(this)}>
                        {this.generateMap.bind(this)().map((a: any) => {
                            return a;
                        })}
                    </div>
                </div>
            </div>
        );
    }

    selected(evt: string) {
        saveState(EditActions.selected(this, evt));
    }

    onClickCreateUnit(event : React.MouseEvent<HTMLElement>) {
        saveState(EditActions.onClickCreateUnit(this));
    }

    onClickSide(event : React.MouseEvent<HTMLElement>) {
        saveState(EditActions.onClickSide(this));
    }

    onClickCreateTerrain(event : React.MouseEvent<HTMLElement>) {
        saveState(EditActions.onClickCreateTerrain(this));
    }

    onClickDelete(event : React.MouseEvent<HTMLElement>) {
        saveState(EditActions.onClickDelete(this));
    }

    onClickExit(event : React.MouseEvent<HTMLElement>) {
        this.props.parentObject.changeGameState(0); // Salir de la partida.
    }

    onKey(keyEvent : React.KeyboardEvent<HTMLElement>) {
        let keyCode = keyEvent.key;
        let cursorPosition, newCursorPosition : Pair;
        console.log("KeyCode: "+keyCode);
        switch(keyCode) {
            case 'Escape':
                this.props.parentObject.changeGameState(0); // Retornamos al menu.
                break;
            // Los siguientes casos corresponden con las teclas del numpad, para mover el cursor
            case '1':
                // La tecla 1 del numpad (-1,+1)
                // Primero, obtenemos la posición de la casilla
                cursorPosition = storeEdit.getState().cursorPosition;
                // Crearemos una nueva posición resultado
                newCursorPosition = new Pair(cursorPosition.row + (cursorPosition.column&1?1:0), cursorPosition.column - 1);
                // Llamamos a la acción para cambiarlo
                break;
            case '2':
                // La tecla 2 del numpad (0,+1)
                cursorPosition = storeEdit.getState().cursorPosition;
                newCursorPosition = new Pair(cursorPosition.row + 1, cursorPosition.column);
                break;
            case '3':
                // La tecla 3 del numpad (+1,+1)
                cursorPosition = storeEdit.getState().cursorPosition;
                newCursorPosition = new Pair(cursorPosition.row + (cursorPosition.column&1?1:0), cursorPosition.column + 1);
                break;
            case '7':
                // La tecla 7 del numpad (-1,-1)
                cursorPosition = storeEdit.getState().cursorPosition;
                newCursorPosition = new Pair(cursorPosition.row - (cursorPosition.column&1?0:1), cursorPosition.column - 1);
                break;
            case '8':
                // La tecla 8 del numpad (0, -1)
                cursorPosition = storeEdit.getState().cursorPosition;
                newCursorPosition = new Pair(cursorPosition.row - 1, cursorPosition.column);
                break;
            case '9':
                // La tecla 9 del numpad (+1, -1)
                cursorPosition = storeEdit.getState().cursorPosition;
                newCursorPosition = new Pair(cursorPosition.row - (cursorPosition.column&1?0:1), cursorPosition.column + 1);
                break;
            case '5':
            case ' ':
                // Realizar el click en la posición
                cursorPosition = storeEdit.getState().cursorPosition;
                this.clickAction(cursorPosition.row, cursorPosition.column);
                break;
        }
        // Si puede hacerse el movimiento, realiza la acción
        if(newCursorPosition && newCursorPosition.row >= 0 && newCursorPosition.column >= 0 && newCursorPosition.column <= this.props.vertical && newCursorPosition.row <= this.props.horizontal) {
            saveState(EditActions.saveState(this,
                storeEdit.getState().side,
                storeEdit.getState().units,
                storeEdit.getState().terrains,
                newCursorPosition,
                storeEdit.getState().selected,
                storeEdit.getState().type));
        }
    }

    onClick(event : React.MouseEvent<HTMLElement>) {
        let position = Pathfinding.getPositionClicked(event.clientX, event.clientY);

        //Guardamos la posición actual y la nueva posición
        this.clickAction(position.row, position.column);
    }

    onRightClick(event: React.MouseEvent<HTMLElement>) {
        // Primero, evitamos que genere el menú del navegador
        event.preventDefault();
        // Obtenemos la posición donde ha realizado click
        let position = Pathfinding.getPositionClicked(event.clientX, event.clientY);
        // Comprobamos que exista una unidad en esa posición
        let unit = storeEdit.getState().units[myIndexOf(storeEdit.getState().units.map(x => x.position), position)];
        // También comprobamos que exista un terreno en la posición
        // Pero antes, vemos que la posición sea alcanzable
        let terrain = null;
        if(position.row >= 0 && position.row <= this.props.vertical &&
            position.column >= 0 && position.column <= this.props.horizontal) {
                // Si es válida, iteramos por los terrenos y si no se encuentra, se emite un Plains
                let terrainIndex = myIndexOf(storeEdit.getState().terrains.map(x => x.position), position);
                terrain = terrainIndex > -1?storeEdit.getState().terrains[terrainIndex]:Plains.create(position);
        }
        // Actualizamos el estado de la barra de estadísticas
        this.editStats.setState({ unit: unit, terrain: terrain });
    }

    clickAction(row: number, column: number) {
        let newPosition: Pair = new Pair(row,column);
        let side : boolean = storeEdit.getState().side; // Representa el bando del jugador actual
        let unitIndex: number = myIndexOf(storeEdit.getState().units.map(x=>x.position), newPosition); // Obtenemos la posición de la unidad donde ha realizado click o -1.
        let terrainIndex: number = myIndexOf(storeEdit.getState().terrains.map(x=>x.position), newPosition);

        if(unitIndex!=-1 && storeEdit.getState().type=="DELETE"){
            storeEdit.getState().units.splice(unitIndex, 1);
            saveState(EditActions.saveState(this,
                storeEdit.getState().side,
                storeEdit.getState().units,
                storeEdit.getState().terrains,
                storeEdit.getState().cursorPosition,
                storeEdit.getState().selected,
                storeEdit.getState().type));
        }else if(unitIndex==-1 && (terrainIndex==-1 ||(terrainIndex!=-1 && storeEdit.getState().terrains[terrainIndex].name!="Mountains")) && storeEdit.getState().type=="CREATE_UNIT"){
            let unit: Unit;
            switch(storeEdit.getState().selected) {
                case "General":
                    unit = General.create(newPosition, side);
                    storeEdit.getState().units.push(unit);
                case "Infantry":
                    unit = Infantry.create(newPosition, side);
                    storeEdit.getState().units.push(unit);
                case "Tank":
                    unit = Tank.create(newPosition, side);
                    storeEdit.getState().units.push(unit);
                default:
            }
            saveState(EditActions.saveState(this,
                storeEdit.getState().side,
                storeEdit.getState().units,
                storeEdit.getState().terrains,
                storeEdit.getState().cursorPosition,
                storeEdit.getState().selected,
                storeEdit.getState().type));
        }else if(terrainIndex==-1 && storeEdit.getState().type=="CREATE_TERRAIN"){
            let terrain: Terrain;
            switch(storeEdit.getState().selected) {
                case "Plains":
                    terrain = Plains.create(newPosition);
                    storeEdit.getState().terrains.push(terrain);
                case "Mountains":
                    if(unitIndex==-1){
                        terrain = ImpassableMountain.create(newPosition);
                        storeEdit.getState().terrains.push(terrain);
                    }
                case "Hills":
                    terrain = Hills.create(newPosition);
                    storeEdit.getState().terrains.push(terrain);
                case "Forest":
                    terrain = Forest.create(newPosition);
                    storeEdit.getState().terrains.push(terrain);
                default:
            }
            saveState(EditActions.saveState(this,
                storeEdit.getState().side,
                storeEdit.getState().units,
                storeEdit.getState().terrains,
                storeEdit.getState().cursorPosition,
                storeEdit.getState().selected,
                storeEdit.getState().type));
        }
    }

    /** Función auxiliar usada para renderizar el mapa. Consiste en recorrer todas las columnas acumulando las casillas. **/
    generateMap() {
        var accum = [];
        // Repetirá este for hasta que se llegue al número de columnas especificado
        for(var i = 0; i <= this.props.vertical*2 + 1; i++) { // Necesitamos 2*verticales para ordenarlos correctamente
            // Este método retornará una lista con las casillas en fila
            accum.push(this.generateCellRow.bind(this)(i));
        }

        return accum;
    }

    /** Función auxiliar que servirá para generar las casillas en una fila **/
    generateCellRow(num_row: number) {
        var accum2 = [];
        this.state.cells[num_row] = new Array<EditCell>(this.props.horizontal);
        // Este bucle iterará hasta el número de celdas horizontales especificado en el props.
        for(var j = num_row%2==0?0:1; j <= this.props.horizontal; j = j+2) { // Incrementamos en 2 porque el elemento entre cada hex tendrá el valor j + 1.
            let column = j;
            let row = num_row%2==0?num_row/2:Math.floor(num_row/2);
            let pos = new Pair(row, column);
            //Se generan las unidades
            let indexUnit = myIndexOf(storeEdit.getState().units.map(x=>x.position), pos);
            if (indexUnit!=-1){
                var cell = <EditCell cursorPosition={storeEdit.getState().cursorPosition} units={storeEdit.getState().units} terrains={storeEdit.getState().terrains} row={row} column={column} unit={indexUnit} />;
                this.state.cells[row][column] = cell;
                accum2.push(cell);
            }else{
                // Se introducirá el elemento en una lista
                var cell = <EditCell cursorPosition={storeEdit.getState().cursorPosition} units={storeEdit.getState().units} terrains={storeEdit.getState().terrains} row={row} column={column} />; // Si es num_row % 2, es una columna sin offset y indica nueva fila, ecc necesitamos el anterior.
                this.state.cells[row][column] = cell;
                accum2.push(cell);
            }
        }

        // Se retorna en un div que dependiendo de que se trate de la fila par o impar, contendrá también la clase celRowOdd.
        return (
            <div className={"cellRow" + (num_row%2==0?"":" cellRowOdd")}>
                {accum2}
            </div>
        );
    }
}
