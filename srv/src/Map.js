"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const Store_1 = require("./Store");
const GameState_1 = require("./GameState");
const Cell_1 = require("./Cell");
const Utils_1 = require("./Utils");
const Terrains_1 = require("./Terrains");
const UnitStats_1 = require("./UnitStats");
/** Representa el mapa que contendrá las unidades y las casillas **/
class Map extends React.Component {
    /** @constructor  Deben introducirse los elementos horizontal y vertical **/
    constructor(props) {
        super(props);
        this.unitStats = null;
        this.restartState();
    }
    restartState() {
        this.state = { cells: new Array(this.props.horizontal), rows: this.props.vertical, columns: this.props.horizontal };
        Store_1.store.dispatch(GameState_1.Actions.generateSetListener(this));
    }
    /** Renderiza el mapa **/
    render() {
        // El mapa se renderizará en un div con estilo, por ello debemos usar className="map"
        return (React.createElement("div", null,
            React.createElement("p", null,
                "Turno del ",
                Store_1.store.getState().turn % 2 == 0 ? "Jugador" : "Enemigo",
                ". D\u00EDa ",
                Store_1.store.getState().turn,
                Store_1.store.getState().actualState == 1 ? ". Victoria" : Store_1.store.getState().actualState == 2 ? ". Derrota" : ""),
            React.createElement("button", { id: "exitButton", name: "exitButton", onClick: this.onClickExit.bind(this) }, "Salir del juego"),
            Store_1.store.getState().actualState == 0 ? React.createElement("button", { id: "nextTurn", name: "nextTurn", onClick: this.onClickTurn.bind(this) }, "Pasar turno") : "",
            Store_1.store.getState().selectedUnit != null ? React.createElement("button", { id: "cancelAction", name: "cancelAction", onClick: this.onClickCancelAction.bind(this) }, "Cancelar acci\u00F3n") : "",
            Store_1.store.getState().selectedUnit != null && Store_1.store.getState().units[Store_1.store.getState().selectedUnit].action < 2 ? React.createElement("button", { id: "nextAction", name: "nextAction", onClick: this.onClickUnitAction.bind(this) }, "Pasar acci\u00F3n") : "",
            React.createElement("div", null,
                React.createElement(UnitStats_1.UnitStats, null),
                React.createElement("div", { id: "map", className: "map", onClick: this.onClick.bind(this), tabIndex: 0, onKeyDown: this.onKey.bind(this), onContextMenu: this.onRightClick.bind(this) }, this.generateMap.bind(this)().map((a) => {
                    return a;
                })))));
    }
    onClickExit(event) {
        this.props.parentObject.changeGameState(0); // Salir de la partida.
    }
    //Se debe permitir solo si esta en pardida (this.actualstate==0), sino no hace nada
    onClickTurn(event) {
        //Si se pulsa al botón se pasa de turno esto se hace para asegurar que el jugador no quiere hacer nada o no puede en su turno
        //Evitando pasar turno automaticamente ya que el jugador quiera ver alguna cosa de sus unidades o algo aunque no tenga movimientos posibles
        //Esto pasa en muchos otros juegos
        Store_1.saveState(GameState_1.Actions.nextTurn()); //Se usa para obligar a actualizar el estado (tambien actualiza los used)
    }
    onClickUnitAction(event) {
        //Dependiendo de la accion de la unidad pasará a la siguiente acción y será usada o no
        Store_1.saveState(GameState_1.Actions.nextAction(Store_1.store.getState().selectedUnit));
    }
    onClickCancelAction(event) {
        //Con esto se cancela la acción actual para que se pueda seleccionar otra unidad
        Store_1.saveState(GameState_1.Actions.generateSetListener(this));
    }
    onKey(keyEvent) {
        let keyCode = keyEvent.key;
        let cursorPosition, newCursorPosition;
        console.log("KeyCode: " + keyCode);
        switch (keyCode) {
            case 'Escape':
                this.props.parentObject.changeGameState(0); // Retornamos al menu.
                break;
            // Los siguientes casos corresponden con las teclas del numpad, para mover el cursor
            case '1':
                // La tecla 1 del numpad (-1,+1)
                // Primero, obtenemos la posición de la casilla
                cursorPosition = Store_1.store.getState().cursorPosition;
                // Crearemos una nueva posición resultado
                newCursorPosition = new Utils_1.Pair(cursorPosition.row + (cursorPosition.column & 1 ? 1 : 0), cursorPosition.column - 1);
                // Llamamos a la acción para cambiarlo
                break;
            case '2':
                // La tecla 2 del numpad (0,+1)
                cursorPosition = Store_1.store.getState().cursorPosition;
                newCursorPosition = new Utils_1.Pair(cursorPosition.row + 1, cursorPosition.column);
                break;
            case '3':
                // La tecla 3 del numpad (+1,+1)
                cursorPosition = Store_1.store.getState().cursorPosition;
                newCursorPosition = new Utils_1.Pair(cursorPosition.row + (cursorPosition.column & 1 ? 1 : 0), cursorPosition.column + 1);
                break;
            case '7':
                // La tecla 7 del numpad (-1,-1)
                cursorPosition = Store_1.store.getState().cursorPosition;
                newCursorPosition = new Utils_1.Pair(cursorPosition.row - (cursorPosition.column & 1 ? 0 : 1), cursorPosition.column - 1);
                break;
            case '8':
                // La tecla 8 del numpad (0, -1)
                cursorPosition = Store_1.store.getState().cursorPosition;
                newCursorPosition = new Utils_1.Pair(cursorPosition.row - 1, cursorPosition.column);
                break;
            case '9':
                // La tecla 9 del numpad (+1, -1)
                cursorPosition = Store_1.store.getState().cursorPosition;
                newCursorPosition = new Utils_1.Pair(cursorPosition.row - (cursorPosition.column & 1 ? 0 : 1), cursorPosition.column + 1);
                break;
            case '4':
                if (Store_1.store.getState().selectedUnit != null) {
                    //Con esto se cancela la acción actual para que se pueda seleccionar otra unidad
                    Store_1.saveState(GameState_1.Actions.generateSetListener(this));
                }
                break;
            case '6':
                if (Store_1.store.getState().selectedUnit != null && Store_1.store.getState().units[Store_1.store.getState().selectedUnit].action < 2) {
                    //Dependiendo de la accion de la unidad pasará a la siguiente acción y será usada o no
                    Store_1.saveState(GameState_1.Actions.nextAction(Store_1.store.getState().selectedUnit));
                }
                break;
            case '5':
            case ' ':
                // Realizar el click en la posición
                cursorPosition = Store_1.store.getState().cursorPosition;
                this.clickAction(cursorPosition.row, cursorPosition.column);
                break;
        }
        // Si puede hacerse el movimiento, realiza la acción
        if (newCursorPosition && newCursorPosition.row >= 0 && newCursorPosition.column >= 0 && newCursorPosition.column <= this.props.vertical && newCursorPosition.row <= this.props.horizontal) {
            Store_1.saveState(GameState_1.Actions.generateCursorMovement(newCursorPosition));
        }
    }
    onClick(event) {
        let position = Utils_1.Pathfinding.getPositionClicked(event.clientX, event.clientY);
        //Si el juego está terminado entonces no hace nada, por eso comprueba si todavía sigue la partida
        if (Store_1.store.getState().actualState == 0) {
            //Guardamos la posición actual y la nueva posición
            this.clickAction(position.row, position.column);
        }
    }
    onRightClick(event) {
        // Primero, evitamos que genere el menú del navegador
        event.preventDefault();
        // Obtenemos la posición donde ha realizado click
        let position = Utils_1.Pathfinding.getPositionClicked(event.clientX, event.clientY);
        // Comprobamos que exista una unidad en esa posición
        let unit = Store_1.store.getState().units[Utils_1.myIndexOf(Store_1.store.getState().units.map(x => x.position), position)];
        // También comprobamos que exista un terreno en la posición
        // Pero antes, vemos que la posición sea alcanzable
        let terrain = null;
        if (position.row >= 0 && position.row <= this.props.vertical &&
            position.column >= 0 && position.column <= this.props.horizontal) {
            // Si es válida, iteramos por los terrenos y si no se encuentra, se emite un Plains
            let terrainIndex = Utils_1.myIndexOf(Store_1.store.getState().terrains.map(x => x.position), position);
            terrain = terrainIndex > -1 ? Store_1.store.getState().terrains[terrainIndex] : Terrains_1.Plains.create(position);
        }
        // Actualizamos el estado de la barra de estadísticas
        this.unitStats.setState({ unit: unit, terrain: terrain });
    }
    clickAction(row, column) {
        let newPosition = new Utils_1.Pair(row, column);
        let side = Store_1.store.getState().turn % 2 == 0; // Representa el bando del jugador actual
        let unitIndex = Utils_1.myIndexOf(Store_1.store.getState().units.map(x => x.position), newPosition); // Obtenemos la posición de la unidad donde ha realizado click o -1.
        let unitEnemy; //Vale true si la unidad seleccionada es enemiga de las unidades del turno actual
        unitIndex != -1 ? // Si se ha seleccionado una unidad
            side ? // Si el turno es del "aliado"
                unitEnemy = !Store_1.store.getState().units[unitIndex].player // Asigna como enemigo el contrario de la unidad que ha hecho click
                : unitEnemy = Store_1.store.getState().units[unitIndex].player // Asigna como enemigo la unidad que ha hecho click
            : false; // En caso contrario, no hagas nada?
        //Vemos si la unidad ha sido usada (si hay una unidad seleccionada vemos si esta ha sido usada o no, y sino vemos si la unidad del click es seleccionada)
        let used = Store_1.store.getState().selectedUnit != null ?
            Store_1.store.getState().units[Store_1.store.getState().selectedUnit].used :
            unitIndex != -1 ? Store_1.store.getState().units[unitIndex].used : false;
        // También comprobaremos si la unidad ha realizado un ataque, que permitirá que la unidad ataque por separado con respecto al movimiento
        let hasAttacked = Store_1.store.getState().selectedUnit != null ?
            // Se activará este boolean cuando se ha seleccionado una unidad y además se ha seleccionado un enemigo
            Store_1.store.getState().units[Store_1.store.getState().selectedUnit].hasAttacked && unitEnemy :
            true;
        if (!used) {
            //Si el indice es != -1 (está incluido en la lista de unidades) y está en modo de espera de movimiento se generará el estado de movimiento
            if ((unitIndex != -1 && !unitEnemy) // La unidad clickeada existe y es del jugador
                && Store_1.store.getState().type == "SET_LISTENER" // El tipo de estado es esperando selección
            ) {
                Store_1.saveState(GameState_1.Actions.generateMove(unitIndex, side));
                //Si hace clic en una possición exterior, mantiene el estado de en movimiento (seleccionado) y sigue almacenando la unidad seleccionada
            }
            else if (newPosition.column < 0 // La posición no es negativa en columnas
                || newPosition.column > this.props.horizontal // Ni es superior al número de celdas horizontales
                || newPosition.row < 0 // La posición no es negativa en filas
                || newPosition.row > this.props.vertical // Ni es superior al número de celdas verticales
            ) {
                Store_1.saveState(GameState_1.Actions.generateMove(Store_1.store.getState().selectedUnit, side));
                //En caso de que no esté incluida en la lista de unidades y esté en estado de movimiento
            }
            else if (
            // unitIndex!=-1 // La unidad existe
            Store_1.store.getState().selectedUnit != null // Se tiene seleccionada una unidad
                && Utils_1.myIndexOf(Store_1.store.getState().visitables, newPosition) != -1 // Y la posición de la unidad es alcanzable
            ) {
                let selectedUnit = Store_1.store.getState().selectedUnit; // Índice de la unidad seleccionada
                let actualPosition = Store_1.store.getState().units[selectedUnit].position; //Obtenemos la posición actual
                //Primero se comprueba si es un ataque (si selecciona a un enemigo durante el movimiento)
                if (unitIndex != -1 && unitEnemy && Store_1.store.getState().units[selectedUnit].action == 1 && !Store_1.store.getState().units[selectedUnit].hasAttacked) {
                    Store_1.saveState(GameState_1.Actions.generateMove(Store_1.store.getState().selectedUnit, side));
                    // Se atacará, esto incluye el movimiento si es aplicable
                    Store_1.saveState(GameState_1.Actions.attack(unitIndex, side, null));
                }
                else {
                    // En caso contrario, se ejecutará el movimiento como siempre
                    // El valor de null es si se hace que justo tras el movimiento seleccione otra unidad, en este caso no es necesario así que se pondrá null
                    Store_1.saveState(GameState_1.Actions.generateChangeUnitPos(selectedUnit, newPosition, null, side));
                }
            }
        }
        else if (!hasAttacked) {
            // Realizamos el ataque:
            Store_1.saveState(GameState_1.Actions.attack(unitIndex, side, null));
        }
        console.log("numero unidades " + Store_1.store.getState().units.length);
    }
    /** Función auxiliar usada para renderizar el mapa. Consiste en recorrer todas las columnas acumulando las casillas. **/
    generateMap() {
        var accum = [];
        // Repetirá este for hasta que se llegue al número de columnas especificado
        for (var i = 0; i <= this.props.vertical * 2 + 1; i++) {
            // Este método retornará una lista con las casillas en fila
            accum.push(this.generateCellRow.bind(this)(i));
        }
        return accum;
    }
    /** Función auxiliar que servirá para generar las casillas en una fila **/
    generateCellRow(num_row) {
        var accum2 = [];
        this.state.cells[num_row] = new Array(this.props.horizontal);
        // Este bucle iterará hasta el número de celdas horizontales especificado en el props.
        for (var j = num_row % 2 == 0 ? 0 : 1; j <= this.props.horizontal; j = j + 2) {
            let column = j;
            let row = num_row % 2 == 0 ? num_row / 2 : Math.floor(num_row / 2);
            let pos = new Utils_1.Pair(row, column);
            //Se generan las unidades
            let indexUnit = Utils_1.myIndexOf(Store_1.store.getState().units.map(x => x.position), pos);
            if (indexUnit != -1) {
                // Si la unidad ha sido usada y ha realizado un ataque entonces se mostrará como usada
                let used = Store_1.store.getState().units[indexUnit].used && Store_1.store.getState().units[indexUnit].hasAttacked;
                //Si hay una unidad seleccionada y dicha posición esta dentro de las posiciones visitables entonces es accesible
                let visitable = Store_1.store.getState().selectedUnit != null && Utils_1.myIndexOf(Store_1.store.getState().visitables, pos) != -1;
                //Si además de ser accesible es una unidad enemiga (dependiendo del turno) entonces es atacable
                let attack = visitable && ((Store_1.store.getState().units[indexUnit].player && Store_1.store.getState().turn % 2 != 0) || (!Store_1.store.getState().units[indexUnit].player && Store_1.store.getState().turn % 2 == 0));
                //Si además de ser accesible es la misma posicion que la unidad actual entonces es la unidad elegida
                let actual = Store_1.store.getState().selectedUnit != null && Store_1.store.getState().units[Store_1.store.getState().selectedUnit].position.equals(pos);
                var cell = React.createElement(Cell_1.Cell, { row: row, column: column, unit: indexUnit, attack: attack, actual: actual, used: used });
                this.state.cells[row][column] = cell;
                accum2.push(cell);
            }
            else if (Store_1.store.getState().selectedUnit != null) {
                //Si la distancia es menor o igual a la distancia máxima entonces son posiciones validas y se seleccionaran, además se comprueba que no sea un obstáculo
                if (Utils_1.myIndexOf(Store_1.store.getState().visitables, pos) != -1 && !Store_1.store.getState().units[Store_1.store.getState().selectedUnit].hasAttacked) {
                    var cell = React.createElement(Cell_1.Cell, { row: row, column: column, selected: true }); // Si es num_row % 2, es una columna sin offset y indica nueva fila, ecc necesitamos el anterior.
                    this.state.cells[row][column] = cell;
                    //Para no añadir una nueva clase de celda seleccionada simplemente hacemos esto
                    accum2.push(cell);
                    //Es necesario hacer este else porque al entrar en este else if no podrá ejecutar el else exterior
                }
                else {
                    var cell = React.createElement(Cell_1.Cell, { row: row, column: column }); // Si es num_row % 2, es una columna sin offset y indica nueva fila, ecc necesitamos el anterior.
                    this.state.cells[row][column] = cell;
                    accum2.push(cell);
                }
            }
            else {
                // Se introducirá el elemento en una lista
                var cell = React.createElement(Cell_1.Cell, { row: row, column: column }); // Si es num_row % 2, es una columna sin offset y indica nueva fila, ecc necesitamos el anterior.
                this.state.cells[row][column] = cell;
                accum2.push(cell);
            }
        }
        // Se retorna en un div que dependiendo de que se trate de la fila par o impar, contendrá también la clase celRowOdd.
        return (React.createElement("div", { className: "cellRow" + (num_row % 2 == 0 ? "" : " cellRowOdd") }, accum2));
    }
}
exports.Map = Map;