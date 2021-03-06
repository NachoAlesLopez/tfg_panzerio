import * as sqlite from 'sqlite3';

import { Unit, UNITS_CREATE, UNIT_CREATE} from './Unit';
import { store } from './Store';
import { Terrain } from './Terrains';
import { Army } from './Army';
import { Map } from './Map';
import { EditMap } from './EditMap';
import { Profile } from './Profile';
import { State, Actions } from './GameState';
import { StateEdit } from './GameEditState';
import { StateProfile } from './GameProfileState';
import * as Units from './Unit';

//Aquí se encuentran clases útiles para todo el proyecto, desde el pair hasta conexión al servidor o parseadores de json, etc.

export class Pair {
    row : any;
    column : any;

    constructor(x: any, y: any) {
        this.row = x;
        this.column = y;
    }

    getColumn() {
        return this.column;
    }

    getRow() {
        return this.row;
    }

    setColumn(x: any) {
        this.column = x;
    }

    setRow(y: any) {
        this.row = y;
    }

    add(pair : Pair) : Pair {
        var new_pair = new Pair(0,0);
        new_pair.row = this.row + pair.row;
        new_pair.column = this.column + pair.column;
        return new_pair;
    }

    public equals(pair: Pair): boolean {
        return this.row == pair.row && this.column == pair.column;
    }

    public toString = () : string => {
        return "("+this.row+", "+this.column+")";
    }
}

/* Representación cúbica del hexágono */
export class Cubic {
    x : number;
    y : number;
    z : number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static create(pair : Pair): Cubic{
        let cubic = new Cubic(0, 0, 0);
        cubic.x = pair.column;
        cubic.z = pair.row - (pair.column - (pair.column&1))/2
        cubic.y = -cubic.x-cubic.z;
        return cubic;
    }

    /* Calcula la distancia Manhattan */
    distanceTo(cubic : Cubic) {
        return Math.max(Math.abs(this.x - cubic.x), Math.abs(this.y - cubic.y), Math.abs(this.z - cubic.z));
    }

    getPair(){
        return new Pair(this.z+(this.x-(this.x&1))/2,this.x);
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }

    getZ(){
        return this.z;
    }

    add(cubic : Cubic) : Cubic {
        var new_cubic = Object.create(this);
        new_cubic.sum(cubic);
        return new_cubic;
    }

    sum(cubic: Cubic){
        this.x = this.x+cubic.getX();
        this.y = this.y+cubic.getY();
        this.z = this.z+cubic.getZ();
    }

    public toString = () : string => {
        return "("+this.x+", "+this.y+", "+this.z+")";
    }
}

export const CUBIC_DIRECTIONS = [
    new Cubic(0,1,-1), new Cubic(1,0,-1), new Cubic(1,-1,0),
    new Cubic(0,-1,1), new Cubic(-1,0,1), new Cubic(-1,1,0)
];

//Debido a que indexOf de los array iguala con ===, no es posible saber si un objeto está dentro de un array sino es identicamente el mismo objeto
//por eso se ha creado este método auxiliar para ayudar al cálculo
export function myIndexOf(arr: Array<Pair>, o: Pair) {
    if(arr != null && arr != undefined) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].column == o.column && arr[i].row == o.row) {
                return i;
            }
        }
    }
    return -1;
}

//Igual que el de arriba pero para cúbica
export function myIndexOfCubic(arr: Array<Cubic>, o: Cubic) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].getX() == o.getX() && arr[i].getY() == o.getY() && arr[i].getZ() == o.getZ()) {
            return i;
        }
    }
    return -1;
}

// Esta clase contendrá funciones relacionadas con el Pathfinding y encontrar si una unidad tiene acceso a cierta casilla o unidad
export class Pathfinding {
    public static getAttackableUnits(unit: Unit) {
        // Primero, necesitamos encontrar las casillas de las unidades enemigas
        let enemyUnitsPos: Pair[] = store.getState().units.filter(x => x.player != unit.player).map(x => x.position);
        let enemyUnitsReachable: Pair[] = [];
        // Ahora, realizaremos una iteración igual que el proceso de obtener las posiciones accesibles por la unidad.
        var visitables_cubic : Array<Cubic> = [Cubic.create(unit.position)];
        // Los vecinos estarán compuestos por la posición cúbica y el número de movimientos para pasar la posición
        var neighbours : Cubic[] = new Array<Cubic>();
        for(var i = 0 ; i < unit.range ; i++) {
            // Calculamos los próximos vecinos:
            var new_neighbours: Cubic[] = [];
            visitables_cubic = visitables_cubic.concat(neighbours);

            for(var index_directions = 0; index_directions < CUBIC_DIRECTIONS.length; index_directions++) {
                visitables_cubic.forEach(cubic => {
                    var new_cubic = cubic.add(CUBIC_DIRECTIONS[index_directions]);
                    // Mientras la casilla actual no sea ya visitada o esté contenida en los vecinos anteriores
                    if(myIndexOfCubic(visitables_cubic, new_cubic) == -1 && myIndexOfCubic(neighbours, new_cubic) == -1) {
                        // En el caso de que no sea ninguno de los anteriores, la añadiremos a los visitados
                        new_neighbours.push(new_cubic);
                        // Y comprobamos que exista una unidad enemiga en esa posición
                        let index = myIndexOf(enemyUnitsPos, new_cubic.getPair())
                        //Si es artilleria y es cuerpo a cuerpo (i==0) entonces no se usa
                        if(index > -1 && !(unit.name=="Artillery" && i==0)) {
                            // En el caso de exista, la añadimos a los alcanzables
                            enemyUnitsReachable.push(enemyUnitsPos[index]);
                        }
                    }
                });
                neighbours = new_neighbours;
            }
        }
        return enemyUnitsReachable;
    }

    // Este método calcula las posiciones movibles de la unidad introducida. Alto coste computacional
    public static getMovableCells(state: State, unit_id: number, unit_player: boolean): Array<Pair> {
        // Iniciamos las casillas visitables por la posición actual de la unidad
        var visitables_cubic : Array<Cubic> = [Cubic.create(state.units[unit_id].position)];
        // Obtenemos también el movimiento de la unidad, que delimita el número de iteraciones.
        var movements : number = state.units[unit_id].movement;
        // Los vecinos estarán compuestos por la posición cúbica y el número de movimientos para pasar la posición
        var neighbours : [Cubic, number][] = new Array<[Cubic, number]>();
        // En esta variable se guardarán las posiciones de las unidades atacables, que deben separarse porque no se pueden considerar como atravesables.
        var enemyUnits : Cubic[] = new Array<Cubic>();
        // Primero, iteraremos desde 0 hasta el número de movimientos
        for(var i = 0 ; i <= movements ; i++) {
            // Calculamos los próximos vecinos:
            var new_neighbours: [Cubic, number][] = [];
            // Añadimos los vecinos anteriores que sean alcanzables a la lista de casillas visitables.
            visitables_cubic = visitables_cubic.concat(neighbours.filter(possible_tuple => possible_tuple[1] == 0).map(x => x[0]));
            // Para cada una de las direcciones posibles
            for(var index_directions = 0; index_directions < CUBIC_DIRECTIONS.length; index_directions++) {
                // Por cada casilla visitable
                visitables_cubic.forEach(cubic => {
                    // Obtenemos la nueva casilla a visitar
                    var new_cubic = cubic.add(CUBIC_DIRECTIONS[index_directions]);
                    // Siempre que la nueva casilla no esté en la lista de visitables ni sea una posición no alcanzable.
                    if(myIndexOfCubic(visitables_cubic, new_cubic) == -1) {
                        var indexOfNeighbours = myIndexOfCubic(neighbours.map(x => x[0]), new_cubic);
                        // Para añadir la posición, comprobamos primero que no esté la posición:
                        if(indexOfNeighbours == -1) {
                            // Si es el caso, debemos comprobar que la posición no esté ocupada por una de las unidades del jugador
                            var positionIndex = state.units
                                .filter(x => x.player==unit_player) // Si debe estar ocupada por una unidad, que sea únicamente la enemigas
                                .map(y => y.position);
                            if(myIndexOf(positionIndex, new_cubic.getPair()) == -1) {
                                // Primero, comprobamos que se trate de una unidad enemiga, simplemente comprobando si está en la lista es suficiente
                                let indexUnit = myIndexOf(state.units.map(x => x.position), new_cubic.getPair());
                                // En el caso en el que esté, la añadimos a la lista de atacables y acabamos
                                if(indexUnit != -1) {
                                    // Añadimos a lista de atacables, sólo si no está en la lista y ésta iteración es el alcance del ataque más uno.
                                    myIndexOfCubic(enemyUnits, new_cubic) == -1 && i < state.units[unit_id].range?enemyUnits.push(new_cubic):false;
                                } else { // En caso contrario, es una posición sin unidades
                                    // Obtenemos el índice del obstáculo, si es que está.
                                    let indexOfObstacle = myIndexOf(state.terrains.map(x => x.position), new_cubic.getPair());
                                    // Si se admite, añadimos la posición y la cantidad de movimientos para pasar por la casilla
                                    // Por ahora se comprueba si está en la lista de obstáculos, en cuyo caso coge la cantidad. En caso contrario, asumimos Plains
                                    // No tiene sentido las restricciones de movimiento para unidades aéreas
                                    new_neighbours.push([new_cubic, indexOfObstacle > -1 && state.units[unit_id].property!=1?state.terrains[indexOfObstacle].movement_penalty-1:0]);
                                }
                            }
                        } else { // Si no, esta casilla ya la tenemos en vecinos, pero tiene un movimiento != 0, por lo que reducimos el movimiento de la casilla
                            // Actualizamos el movimiento de la unidad, si es el caso.
                            var cell = neighbours[indexOfNeighbours];
                            // Siempre que sea reducible
                            if (cell[1] > 0) {
                                // Obtenemos el índice de la iteración actual
                                var index = myIndexOfCubic(new_neighbours.map(x => x[0]), cell[0]);
                                // Si no está en nuestra lista de vecinos
                                if (index == -1) {
                                    // Lo añadimos y le reducimos el peso
                                    new_neighbours.push([new_cubic, cell[1] - 1]);
                                } else {
                                    // Si ya está en nuestra lista de vecinos, accedemos y lo reemplazamos reducciendo en uno
                                    new_neighbours[index] = [new_cubic, cell[1] - 1];
                                }
                            }
                        }
                    }
                });
                // Finalmente, se actualizan los vecinos.
                neighbours = new_neighbours;
            }
        }
        let visitables_pair = visitables_cubic.map(cubic => cubic.getPair());

        // Finalmente convertimos el resultado a un sistema de coordenadas (row, column)
        return visitables_pair;
    }

    public static getPositionClicked(xCoor: number, yCoor: number) : Pair {
        // Para obtener las posiciones relativas al mapa, obtenemos las posiciones absolutas del primer objeto, que es el hexágono primero.
        var dimensions = document.getElementById("hex0_0").getBoundingClientRect();

        // Para soportar mejor los cambios de pantalla, obtenemos las dimensiones del hex primero, para los demás será igual.
        var height = dimensions.bottom - dimensions.top; // Hardcoded, se deberían realizar más pruebas
        var width = Math.round(height * 1.153846154); // El valor que se multiplica es la proporción entre el height y width

        var x = xCoor - dimensions.left; // A las coordenadas absolutas les restamos las dimensiones en el extremo superior izquierdo del primer hex.
        var y = yCoor - dimensions.top;

        var column: number = Math.floor(x / (3 / 4 * width)); // Primero, encontramos la columna aproximada, dividiendo la posición por 3/4 la anchura (debido a los siguientes cálculos)
        var row: number; // Definimos el número de fila.

        var isOdd = column % 2 == 1; // Comprobamos si la columna de hexes es impar, ya que estará bajada por la mitad de la altura
        switch (isOdd) {
            case true:
                // Se le restará la mitad de la altura del hex.
                row = Math.floor((y - (height / 2)) / height);
                break;
            case false:
                // En otro caso, se obtendrá de forma parecida a la columna. Dividiendo la altura del hex (como se verá, no es multiplicado por 3/4 al no existir un extremo en esa posición).
                row = Math.floor(y / height);
        }

        // En este momento, tendrémos la casilla correcta aproximada.
        var centerX = Math.round(column * (3 / 4 * width) + width / 2); // Para encontrar el punto central del hex más cercano. 3/4 ya que los hexes están solapados.
        var centerY;
        switch (isOdd) {
            case true:
                // El punto central equivale a la fila por el tamaño del hex más la mitad (punto medio) más el offset por la fila impar
                centerY = Math.round(row * height + height);
                break;
            case false:
                // En otro caso, no existirá el offset por la fila impar.
                centerY = Math.round(row * height + (height / 2));
        }
        var radius = Math.round(height / 4); // Tomamos el radio más pequeño, siendo este la mitad de la altura del hex.

        // Comprobación de si está el punto en el círculo
        if (!Pathfinding.getInCircle(centerX, centerY, radius, x, y)) {
            // Debemos calcular la distancia entre los otros hexágonos:
            // Debe tenerse en cuenta que estamos intentando encontrar si el punto está en el extremo de forma "<"
            // Primero comprobamos si debemos escoger el hexágono superior o inferior
            var isUpper = y < centerY;
            // Recogemos la posición del hex horizontal siguiente:
            var comparingHexX = Math.round(centerX - (width * 3 / 4));
            // Y dependiendo de que esté arriba o debajo, la posición vertical del hex posible:
            var comparingHexY = Math.round(isUpper ? (centerY - (height / 2)) : (centerY + (height / 2)));
            // Calculamos la distancia entre todos los posibles hexes:
            var distanceCircle = Pathfinding.calculateDistance(centerX, centerY, x, y);
            var distancePossibleHex = Pathfinding.calculateDistance(comparingHexX, comparingHexY, x, y);
            // Si la distancia del hex posible es menor al del círculo, entonces cambiamos el row y column
            if (distancePossibleHex < distanceCircle) {
                // Debido al sistema de identificación usado, es necesario añadir reglas si el hex es impar o par.
                if (isOdd) {
                    column--;
                    if (!isUpper) {
                        row++;
                    }
                } else {
                    column--;
                    if (isUpper) {
                        row--;
                    }
                }
            }
        }

        return new Pair(row, column);
    }

    // Calcula si dado los datos del circulo y  un punto cualquiuera, el punto cualquiera está dentro del círculo
    static getInCircle(centerX: number, centerY: number, radius: number, x: number, y: number) {
        // Raiz cuadrada de la distancia vectorial entre el centro y el punto debe ser menor al radio
        return this.calculateDistance(centerX, centerY, x, y) < radius;
    }

    // Calcula la distancia vectorial entre dos puntos
    public static calculateDistance(x0: number, y0: number, x1: number, y1: number) {
        return Math.sqrt(Math.pow((x0-x1),2) + Math.pow((y0-y1),2));
    }
}

// Esta clase contendrán métodos auxiliares con respecto a la conexión entre cliente y servidor
export class Network {
    private static connection: WebSocket = undefined;
    public static gameId: string = undefined;

    /// Esta función permitirá crear la conexión, con la idea de cambiar los parametros en el caso de cambio
    public static getConnection() {
        // Retornamos la conexión
        if(this.connection == undefined) {
            this.connection = new WebSocket("ws://"+location.hostname+":8080");
        }
        return this.connection;
    }

    public static parseStateFromServer(data: string): State {
        // Definimos la salida, un mapa, y lo populamos con datos por defecto
        let result = {
            turn: 0,
            actualState: 0,
            units: [] as Array<Unit>,
            visitables: [] as Array<Pair>,
            terrains: [] as Array<Terrain>,
            cursorPosition: new Pair(0, 0),
            map: undefined as Map,
            selectedUnit: 0,
            type: "",
            height: 5,
            width: 5,
            isTurn: true,
            isPlayer: true,
            id: ""
        };
        // Primero, convertimos el objeto en un mapa
        let json = JSON.parse(data);
        result.isTurn = json.isTurn;
        result.isPlayer = json.isPlayer;
        result.height = json.height;
        result.width = json.width;
        // Después iteramos por cada uno de los atributos y crearemos el objeto cuando sea necesario
        // Para empezar, asignamos las variables primitivas, al no necesitar inicializarlas
        result.turn = json.turn;
        result.actualState = json.actualState;
        result.selectedUnit = json.selectedUnit;
        result.type = json.type;
        // Después, creamos un Pair con los datos introducidos
        if(json.cursorPosition) {
            result.cursorPosition = new Pair(json.cursorPosition.row, json.cursorPosition.column);
        }
        // Ahora nos encargamos de visitables
        // Inicializamos una lista con los datos de las casillas visitables
        let visitables: Array<{row: number, column:number}> = json.visitables;
        // Y asignamos al estado las casillas
        if(visitables)
            result.visitables = visitables.map(pair => new Pair(pair.row, pair.column));
        // Ahora vamos con las unidades:
        let units: Array<{name: string, type: string, movement: number, position:{row: number,column: number}, player: boolean, used: boolean, attackWeak: number, attackStrong: number, defenseWeak: number, defenseStrong: number, health: number, range: number, property: number, hasAttacked: boolean}> = json.units
        // Para cada uno, crearemos una unidad con esos datos.
        if(units) {
            result.units = units.map(unit => new Unit(unit.name, unit.type, unit.movement, new Pair(unit.position.row, unit.position.column),
                unit.player, unit.used, unit.attackWeak, unit.attackStrong, unit.defenseWeak, unit.defenseStrong, unit.health, unit.range, 0, unit.property, unit.hasAttacked));
        }
        // Finalmente, nos quedan los terrenos, mismo proceso
        result.terrains = this.parseMap(json.terrains);
        result.id = json.id;
        // Retornamos el estado final
        return result;
    }

    public static parseStateEditFromServer(data: string): StateEdit {
        // Definimos la salida, un mapa, y lo populamos con datos por defecto
        let result = {
            map: undefined as EditMap,
            terrains: [] as Array<Terrain>,
            cursorPosition: new Pair(0, 0),
            selected: "",
            type: 0
        };
        // Primero, convertimos el objeto en un mapa
        let json = JSON.parse(data);
        // Después iteramos por cada uno de los atributos y crearemos el objeto cuando sea necesario
        // Para empezar, asignamos las variables primitivas, al no necesitar inicializarlas
        result.selected = json.selected;
        result.type = json.type;
        // Después, creamos un Pair con los datos introducidos
        result.cursorPosition = new Pair(json.cursorPosition.row, json.cursorPosition.column);
        // Finalmente, nos quedan los terrenos, mismo proceso
        result.terrains = this.parseMap(json.terrains);
        // Retornamos el estado final
        return result;
    }

    public static parseStateProfileFromServer(data: string): StateProfile {
        // Definimos la salida, un mapa, y lo populamos con datos por defecto
        let result = {
            profile: undefined as Profile,
            armies: [] as Array<Army>,
            selectedArmy: 0,
            selected: "",
            type: "0"
        };
        // Primero, convertimos el objeto en un mapa
        let json = JSON.parse(data);
        // Después iteramos por cada uno de los atributos y crearemos el objeto cuando sea necesario
        // Para empezar, asignamos las variables primitivas, al no necesitar inicializarlas
        result.selected = json.selected;
        result.selectedArmy = json.selectedArmy;
        result.type = json.type;
        // Ahora vamos con los batallones:
        let armies: Array<{army: Array<{ type: string, number: number }>, name: string}> = json.armies;
        // Para cada uno, crearemos una unidad con esos datos.
        for(var i = 0; i < armies.length; i++){
            var army = new Array<{type: string, number: number}>();
            for(var j = 0; i < armies[i].army.length; j++){
                army.push({type: armies[i].army[j].type, number:armies[i].army[j].number});
            }
            result.armies.push(new Army(army,armies[i].name));
        }
        // Retornamos el estado final
        return result;
    }

    public static parseMap(terrains:
        Array<{ name: string, image: string, movement_penalty: number,
             position: { row: number, column: number} ,
             defenseWeak: number, defenseStrong: number
             attackWeak: number, attackStrong: number }
        >): Terrain[] {
        let result: Terrain[] = [];
        if(terrains) {
            result = terrains.map(terrain => new Terrain(terrain.name, terrain.image, terrain.movement_penalty,
                new Pair(terrain.position.row, terrain.position.column), terrain.defenseWeak ,terrain.defenseStrong,
                terrain.attackWeak, terrain.attackStrong));
        }

        return result;
    }

    /// Esta función se encargará de obtener el conjunto de unidades dado el par indicado
    /// Aunque no es usado por ningún archivo relacionado con el servidor, será usado
    /// cuando se disponga del guardado de ejércitos en servidor
    ///
    /// El argumento side permitirá indicar el bando del ejército, sea del jugador o enemigo
    public static parseArmy(unitsPair: Array<{ type: string, number: number }>, side: boolean): Array<Unit> {
        // Primero, creamos el array que contendrá el resultado
        let units: Array<Unit> = new Array<Unit>();
        // Iteramos por los elementos del array
        for(let index = 0; index < unitsPair.length; index++) {
            let pair = unitsPair[index];
            // Este contador indicará el número de unidades restantes del tipo
            let unitsLeft = pair.number;
            // Mientras queden unidades por crear
            while(unitsLeft > 0) {
                // Dependiendo del tipo, se creará una unidad u otra
                // Todas las unidades se crearán en la posición (-1, -1)
                const sel : keyof UNIT_CREATE = pair.type;
                units.push(UNITS_CREATE[sel].create(new Pair(-1, -1), side));
                // Finalmente, indicamos que hemos creado la unidad de este tipo
                --unitsLeft;
            }
        }
        // Retornamos el conjunto de unidades del bando
        return units;
    }

    public static createGame(callback: (error: { status: boolean, message: string, gameId: string }) => void) {
        let connection = Network.getConnection();

        connection.onmessage = (event: MessageEvent) => {
            if(event.data == "Command not understood") {
                console.log("Error attempting to create the game");
                callback({ status: false, message: event.data, gameId: undefined });
            } else {
                let json = JSON.parse(event.data);
                callback({ status: true, message: undefined, gameId: json.id });
            }
        }

        connection.send(JSON.stringify({
            tipo: "createGame"
        }));
    }

    public static joinGame(gameId: string, callback: (error: { status: boolean, message: string, gameId: string }) => void) {
        let connection = Network.getConnection();

        connection.onmessage = (event: MessageEvent) => {
            if(event.data == "Command not understood") {
                console.log("Error attempting to join game");
                callback({ status: false, message: event.data, gameId: undefined });
            } else {
                let json = JSON.parse(event.data);
                if(json.status) {
                    callback({ status: true, message: undefined, gameId: json.id });
                } else {
                    callback({ status: false, message: json.error, gameId: undefined });
                }
            }
        }

        connection.send(JSON.stringify({
            tipo: "joinGame",
            id: gameId
        }))
    }

    public static sendGetGameList(callback: (status: { status: boolean, games: any[] }) => void) {
        let connection = Network.getConnection();

        connection.onmessage = (event: MessageEvent) => {
            if(event.data == "Command not understood") {
                console.log("Error attempting to join game");
                callback({ status: false, games: [] });
            } else {
                let json = JSON.parse(event.data);
                callback({ status: true, games: json.games });
            }
        }

        connection.send(JSON.stringify({
            tipo: "getGames"
        }))
    }

    // Este método se encargará de enviar los datos del mapa al servidor, para que se guarden en BD
    public static sendMapToServer(map: { id: number, rows: number, columns: number, map: Array<Terrain>, name: string, googleId: number }
        , callback?: (error: { status: boolean, errorCode: string }) => void) {
        // Primero, establecemos la conexión con el servidor
        let connection = Network.getConnection();
        connection.onmessage = function(event: MessageEvent) {
            // Generalmente, no esperaremos una respuesta, por lo que simplemente aseguramos que
            // el comando se haya entendido
            if(event.data == "Command not understood") {
                // Lanzamos un error
                console.log("Error when attempting to save, server didn't understood request");
                if(callback) {
                    callback({ status: false, errorCode: event.data });
                }
            } else {
                // En caso contrario, ejecutamos el callback sin errores
                if(callback) {
                    callback({ status: true, errorCode: "Success" });
                }
            }
        };
        // Al abrirse la conexión, informamos al servidor del mapa
        connection.send(JSON.stringify({
            tipo: "saveMap",
            map: map
        }));
    }

    // Este método se encargará de enviar los datos del mapa al servidor, para que se borren en BD
    public static deleteMapToServer(map: { id: number }
        , callback?: (error: { status: boolean, errorCode: string }) => void) {
        // Primero, establecemos la conexión con el servidor
        let connection = Network.getConnection();
        connection.onmessage = function(event: MessageEvent) {
            // Generalmente, no esperaremos una respuesta, por lo que simplemente aseguramos que
            // el comando se haya entendido
            if(event.data == "Command not understood") {
                // Lanzamos un error
                console.log("Error when attempting to save, server didn't understood request");
                if(callback) {
                    callback({ status: false, errorCode: event.data });
                }
            } else {
                // En caso contrario, ejecutamos el callback sin errores
                if(callback) {
                    callback({ status: true, errorCode: "Success" });
                }
            }
        };
        connection.send(JSON.stringify({
            tipo: "deleteMap",
            map: map
        }));
    }

    public static parseMapServer(data: string): {terrains: {name: string, image: string, movement_penalty: number,
            position: Pair, defenseWeak: number, defenseStrong: number, attackWeak: number, attackStrong: number}[], rows: number, columns: number, mapName: string} {
        // Definimos la salida, un mapa, y lo populamos con datos por defecto
        let result = {
            terrains: [] as Array<Terrain>,
            rows: 0,
            columns: 0,
            mapName: ""
        };
        // Primero, convertimos el objeto en un mapa
        let json = JSON.parse(data);
        // Después iteramos por cada uno de los atributos y crearemos el objeto cuando sea necesario
        // Para empezar, asignamos las variables primitivas, al no necesitar inicializarlas
        result.rows = json.map.rows;
        result.columns = json.map.columns;
        result.mapName = json.map.mapName;
        // Finalmente, nos quedan los terrenos, mismo proceso
        for(var i = 0; i < json.map.terrains.length; i++){
            let terrain = json.map.terrains[i];
            result.terrains.push(new Terrain(terrain.name, terrain.image, terrain.movement_penalty,
                new Pair(terrain.position_row, terrain.position_cols), terrain.defenseWeak ,terrain.defenseStrong,
                terrain.attackWeak, terrain.attackStrong));
        }
        // Retornamos el estado final
        return result;
    }

    public static parseMapServerEdit(data: string): {terrains: {name: string, image: string, movement_penalty: number,
            position: Pair, defenseWeak: number, defenseStrong: number, attackWeak: number, attackStrong: number}[], rows: number, columns: number, mapName: string} {
        // Definimos la salida, un mapa, y lo populamos con datos por defecto
        let result = {
            terrains: [] as Array<Terrain>,
            rows: 0,
            columns: 0,
            mapName: ""
        };
        // Primero, convertimos el objeto en un mapa
        let json = JSON.parse(data);
        // Después iteramos por cada uno de los atributos y crearemos el objeto cuando sea necesario
        // Para empezar, asignamos las variables primitivas, al no necesitar inicializarlas
        result.rows = json.map.rows;
        result.columns = json.map.columns;
        result.mapName = json.map.mapName;
        // Finalmente, nos quedan los terrenos, mismo proceso
        for(var i = 0; i < json.map.terrains.length; i++){
            let terrain = json.map.terrains[i];
            result.terrains.push(new Terrain(terrain.name, terrain.image, terrain.movement_penalty,
                new Pair(terrain.position_row, terrain.position_cols), terrain.defense_weak ,terrain.defense_strong,
                terrain.attack_weak, terrain.attack_strong));
        }
        // Retornamos el estado final
        return result;
    }

    public static sendProfileToServer(profile: {
            id: number,
            name: string,
            gamesWon: number,
            gamesLost: number,
            armies: Array<{ id: number, name: string, pair: Array<{ type: string, number: number }> }>,
            googleId: number
        }, callback?: (error: { status: boolean, errorCode: string }) => void) {
        // Primero, establecer la conexión con el servidor
        let connection = Network.getConnection();
        // Definimos el evento de recepción de mensaje
        connection.onmessage = function(event: MessageEvent) {
            // Comprobamos cuál ha sido la respuesta
            if(event.data == "Command not understood") {
                // Retornamos al callback el fallo de la conexión
                callback({ status: false, errorCode: event.data});
            } else {
                // En caso contrario, el comando se entendió. Comprobamos ahora si el mensaje contiene éxito de la operación
                let statusCode: { status: boolean, error: string } = JSON.parse(event.data);
                if(statusCode.status) {
                    // Se ha realizado la operación correctamente
                    callback({ status: true, errorCode: statusCode.error });
                } else {
                    // Avisamos por pantalla y emitiremos el resultado
                    console.warn("¡Ha fallado la petición de guardado del perfil al servidor!");
                    console.warn("Error: "+statusCode.error);
                    callback({ status: false, errorCode: statusCode.error });
                }
            }
        };
        // Enviamos el mensaje
        connection.send(JSON.stringify({
            tipo: "saveProfile",
            profile: profile
        }));
    }

    public static receiveProfileFromServer(profile: {
            googleId: number
        }, callback?: (code: { status: boolean, error: string, name: string, gamesWon: number, gamesLost: number }) => void) {
        // Primero, establecer la conexión con el servidor
        let connection = Network.getConnection();
        // Definimos el evento de recepción de mensaje
        connection.onmessage = function(event: MessageEvent) {
            // Comprobamos cuál ha sido la respuesta
            if(event.data == "Command not understood") {
                // Retornamos al callback el fallo de la conexión
                callback({ status: false, error: JSON.stringify(event.data), name: null, gamesWon: null, gamesLost: null });
            } else {
                // En caso contrario, el comando se entendió. Comprobamos ahora si el mensaje contiene éxito de la operación
                let statusCode: { status: boolean, error: string, name: string, gamesWon: number, gamesLost: number } = JSON.parse(event.data);
                if(statusCode.status) {
                    // Se ha realizado la operación correctamente
                    callback({ status: true, error: statusCode.error, name: statusCode.name, gamesWon: statusCode.gamesWon, gamesLost: statusCode.gamesLost });
                } else {
                    // Avisamos por pantalla y emitiremos el resultado
                    console.warn("Ha fallado la petición de guardado del perfil al servidor!");
                    console.warn("Error: "+statusCode.error);
                    callback({ status: false, error: statusCode.error, name: null, gamesWon: null, gamesLost: null });
                }
            }
        };
        // Enviamos el mensaje
        connection.send(JSON.stringify({
            tipo: "getProfile",
            profile: profile
        }));
    }

    public static receiveProfileIdFromServer(profile: {
            googleId: number
        }, callback?: (code: { status: boolean, error: string, id: number }) => void) {
        // Primero, establecer la conexión con el servidor
        let connection = Network.getConnection();
        // Definimos el evento de recepción de mensaje
        connection.onmessage = function(event: MessageEvent) {
            // Comprobamos cuál ha sido la respuesta
            if(event.data == "Command not understood") {
                // Retornamos al callback el fallo de la conexión
                callback({ status: false, error: JSON.stringify(event.data), id: null });
            } else {
                // En caso contrario, el comando se entendió. Comprobamos ahora si el mensaje contiene éxito de la operación
                let statusCode: { status: boolean, error: string, id: number } = JSON.parse(event.data);
                if(statusCode.status) {
                    // Se ha realizado la operación correctamente
                    callback({ status: true, error: statusCode.error, id: statusCode.id });
                } else {
                    // Avisamos por pantalla y emitiremos el resultado
                    console.warn("Ha fallado la petición de guardado del perfil al servidor!");
                    console.warn("Error: "+statusCode.error);
                    callback({ status: false, error: statusCode.error, id: null });
                }
            }
        };
        // Enviamos el mensaje
        connection.send(JSON.stringify({
            tipo: "getProfileId",
            profile: profile
        }));
    }

    public static saveProfileGameToServer(profile: {
            gamesWon: number,
            gamesLost: number,
            googleId: number
        }, callback?: (error: { status: boolean, error: string }) => void) {
        // Primero, establecer la conexión con el servidor
        let connection = Network.getConnection();
        // Definimos el evento de recepción de mensaje
        connection.onmessage = function(event: MessageEvent) {
            // Comprobamos cuál ha sido la respuesta
            if(event.data == "Command not understood") {
                // Retornamos al callback el fallo de la conexión
                callback({ status: false, error: event.data});
            } else {
                // En caso contrario, el comando se entendió. Comprobamos ahora si el mensaje contiene éxito de la operación
                let statusCode: { status: boolean, error: string } = JSON.parse(event.data);
                if(statusCode.status) {
                    // Se ha realizado la operación correctamente
                    callback({ status: true, error: statusCode.error });
                } else {
                    // Avisamos por pantalla y emitiremos el resultado
                    console.warn("Ha fallado la petición de guardado del perfil al servidor!");
                    console.warn("Error: "+statusCode.error);
                    callback({ status: false, error: statusCode.error });
                }
            }
        };
        // Enviamos el mensaje
        connection.send(JSON.stringify({
            tipo: "saveProfileGame",
            profile: profile
        }));
    }

    public static saveProfileNameToServer(profile: {
            name: string,
            googleId: number
        }, callback?: (error: { status: boolean, error: string }) => void) {
        // Primero, establecer la conexión con el servidor
        let connection = Network.getConnection();
        // Definimos el evento de recepción de mensaje
        connection.onmessage = function(event: MessageEvent) {
            // Comprobamos cuál ha sido la respuesta
            if(event.data == "Command not understood") {
                // Retornamos al callback el fallo de la conexión
                callback({ status: false, error: event.data});
            } else {
                // En caso contrario, el comando se entendió. Comprobamos ahora si el mensaje contiene éxito de la operación
                let statusCode: { status: boolean, error: string } = JSON.parse(event.data);
                if(statusCode.status) {
                    // Se ha realizado la operación correctamente
                    callback({ status: true, error: statusCode.error });
                } else {
                    // Avisamos por pantalla y emitiremos el resultado
                    console.warn("Ha fallado la petición de guardado del perfil al servidor!");
                    console.warn("Error: "+statusCode.error);
                    callback({ status: false, error: statusCode.error });
                }
            }
        };
        // Enviamos el mensaje
        connection.send(JSON.stringify({
            tipo: "saveProfileName",
            profile: profile
        }));
    }

    public static saveProfileToServer(profile: {
            armies: Array<{ id: number, name: string, pair: Array<{ type: string, number: number }> }>,
            googleId: number
        }, callback?: (error: { status: boolean, error: string }) => void) {
        // Primero, establecer la conexión con el servidor
        let connection = Network.getConnection();
        // Definimos el evento de recepción de mensaje
        connection.onmessage = function(event: MessageEvent) {
            // Comprobamos cuál ha sido la respuesta
            if(event.data == "Command not understood") {
                // Retornamos al callback el fallo de la conexión
                callback({ status: false, error: event.data});
            } else {
                // En caso contrario, el comando se entendió. Comprobamos ahora si el mensaje contiene éxito de la operación
                let statusCode: { status: boolean, error: string } = JSON.parse(event.data);
                if(statusCode.status) {
                    // Se ha realizado la operación correctamente
                    callback({ status: true, error: statusCode.error });
                } else {
                    // Avisamos por pantalla y emitiremos el resultado
                    console.warn("Ha fallado la petición de guardado del perfil al servidor!");
                    console.warn("Error: "+statusCode.error);
                    callback({ status: false, error: statusCode.error });
                }
            }
        };
        // Enviamos el mensaje
        connection.send(JSON.stringify({
            tipo: "updateProfile",
            profile: profile
        }));
    }

    public static sendWaitTurn(callback: (statusCode: { status: boolean, error: string, state: State }) => void) {
        // Como siempre, iniciamos la conexión
        if(Network.gameId == undefined) {
            callback({ status: false, error: "Game id not defined", state: null });
        } else {
            let connection = Network.getConnection();

            connection.send(JSON.stringify({
                tipo: "waitTurn",
                id: Network.gameId
            }));

            connection.onmessage = function(message: MessageEvent) {
                if(message.data == "Command not understood") {
                    callback({ status: false, error: message.data, state: null });
                } else {
                    // Se comprueba la respuesta, generalmente será correcta
                    let result = JSON.parse(message.data);
                    console.dir(result);
                    // Vemos el resultado
                    if(result.status == false) {
                        callback({ status: false, error: "Disconnected", state: store.getState() });
                    } else {
                        // Si es correcto, obtenemos el estado y llamamos al callback
                        let newState = Network.parseStateFromServer(JSON.stringify(result.state));
                        callback({ status: true, error: "Success", state: newState });
                    }
                }
            }
        }
    }

    public static sendLogInInfo(callback: (statusCode: { status: boolean, error: string}) => void, logInData: number) {
        let connection = Network.getConnection();

        connection.onmessage = function(message: MessageEvent) {
            // Si el comando enviado es correcto
            if(message.data == "Command not understoood") {
                callback({ status: false, error: message.data });
            } else {
                // Comprobamos el éxito de la operación
                let result = JSON.parse(message.data);
                callback({ status: result.status, error: result.error });
            }
        }

        // Comprobamos si la conexión es la inicial
        if(connection.onopen) {
            // Enviaremos el mensaje como si nada
            connection.send(JSON.stringify({
                tipo: "logIn",
                token: logInData
            }));
        } else {
            // Como es la primera conexión del cliente, necesitamos espera las respuesta.
            connection.onopen = () => {
                connection.send(JSON.stringify({
                        tipo: "logIn",
                        token: logInData
                }));
            };
        }
    }

    public static sendLogOut(callback: (statusCode: { status: boolean , error: string }) => void) {
        let connection = Network.getConnection();
        connection.send(JSON.stringify({
            tipo: "logOut"
        }));
        connection.onmessage = function(message: MessageEvent) {
            if(message.data == "Command not understood") {
                callback({ status: false, error: message.data });
            } else {
                let result = JSON.parse(message.data);
                callback({ status: result.status, error: result.error });
            }
        }
    }

    public static sendSyncState(callback: (statusCode: { status: boolean, state: any, message: string }, height?: number, width?: number) => void) {
        if(Network.gameId == undefined) {
            callback({ status: false, state: null, message: null });
        } else {
            let connection = Network.getConnection();

            connection.onmessage = (message: MessageEvent) => {
                if (message.data == "Command not understood") {
                    callback({ status: false, state: null, message: null });
                } else {
                    let result = JSON.parse(message.data);
                    let state;
                    if (result.status == true) {
                        // Para facilitar el traspaso de los datos de servidor, necesitamos realizar una conversión a string y pasarlo a estado compatible
                        let stateString = JSON.stringify(result.state);
                        state = Network.parseStateFromServer(stateString);
                        callback({ status: result.status, state: state, message: result.message}, result.state.height, result.state.width);
                    } else {
                        callback({ status: false, state: result.size, message: result.message }, 0, 0);
                    }
                }
            }
            connection.send(JSON.stringify({
                tipo: "SYNC_STATE",
                id: Network.gameId
            }));
        }
    }

    public static sendExitPreGame(callback: (statusCode: { status: boolean, message: string}) => void) {
        if(Network.gameId == undefined) {
            callback({ status: false, message: "Game id not defined" });
        } else {
            let connection = Network.getConnection();
            connection.onmessage = (message: MessageEvent) => {
                // Comprobamos el tipo de mensaje
                let data = message.data;
                if (data == "Command not understood") {
                    callback({ status: false, message: data });
                } else {
                    // Asumimos que ha salido bien
                    callback({ status: true, message: "Success" });
                }
            }
            connection.send(JSON.stringify({
                tipo: "exitPreGame",
                id: Network.gameId
            }));
        }
    }
}

export class Parsers {
    public static stringifyCyclicObject(obj: any): string {
        let result = "";
        let isAlreadyInJSON: Object[] = [];
        // Ejecutamos el stringify, pero incluimos el callback que realizará la comprobación de si está el objeto o no
        result = JSON.stringify(obj, (key: string, value: any) => {
            // Primero, ¿El valor es válido? Esto será es distinto de null y el tipo es un objeto
            if(value != null && value instanceof Object) {
                // Si es el caso, vemos si lo hemos puesto
                if(isAlreadyInJSON.indexOf(value) > -1) {
                    // Lo hemos puesto, por lo que lo saltamos
                    return ;
                } else {
                    // En otro caso, lo pondremos y lo añadimos a visitados
                    isAlreadyInJSON.push(value);
                }
            }
            // Finalmente retornamos el valor a introducir, que sólo lo retornará cuando es válido ponerlo
            return value;
        });
        return result;
    }
}
