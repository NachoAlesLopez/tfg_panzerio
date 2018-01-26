"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Unit_1 = require("./Unit");
const Store_1 = require("./Store");
const Terrains_1 = require("./Terrains");
class Pair {
    constructor(x, y) {
        this.toString = () => {
            return "(" + this.row + ", " + this.column + ")";
        };
        this.row = x;
        this.column = y;
    }
    getColumn() {
        return this.column;
    }
    getRow() {
        return this.row;
    }
    setColumn(x) {
        this.column = x;
    }
    setRow(y) {
        this.row = y;
    }
    add(pair) {
        var new_pair = new Pair(0, 0);
        new_pair.row = this.row + pair.row;
        new_pair.column = this.column + pair.column;
        return new_pair;
    }
    equals(pair) {
        return this.row == pair.row && this.column == pair.column;
    }
}
exports.Pair = Pair;
/* Representación cúbica del hexágono */
class Cubic {
    // TODO: Este constructor debe sólo admitir x,y y z. Se debe poner un método estático de conversión!!!
    constructor(pair) {
        this.toString = () => {
            return "(" + this.x + ", " + this.y + ", " + this.z + ")";
        };
        this.x = pair.column;
        this.z = pair.row - (pair.column - (pair.column & 1)) / 2;
        this.y = -this.x - this.z;
    }
    /* Calcula la distancia Manhattan */
    distanceTo(cubic) {
        return Math.max(Math.abs(this.x - cubic.x), Math.abs(this.y - cubic.y), Math.abs(this.z - cubic.z));
    }
    getPair() {
        return new Pair(this.z + (this.x - (this.x & 1)) / 2, this.x);
    }
    getX() {
        return this.x;
    }
    getY() {
        return this.y;
    }
    getZ() {
        return this.z;
    }
    add(cubic) {
        var new_cubic = Object.create(this);
        new_cubic.sum(cubic);
        return new_cubic;
    }
    sum(cubic) {
        this.x = this.x + cubic.getX();
        this.y = this.y + cubic.getY();
        this.z = this.z + cubic.getZ();
    }
}
exports.Cubic = Cubic;
exports.cubic_directions = [
    new Cubic(new Pair(0, 1)), new Cubic(new Pair(-1, 1)), new Cubic(new Pair(-1, 0)),
    new Cubic(new Pair(-1, -1)), new Cubic(new Pair(0, -1)), new Cubic(new Pair(1, 0))
];
//Debido a que indexOf de los array iguala con ===, no es posible saber si un objeto está dentro de un array sino es identicamente el mismo objeto
//por eso se ha creado este método auxiliar para ayudar al cálculo
function myIndexOf(arr, o) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].column == o.column && arr[i].row == o.row) {
            return i;
        }
    }
    return -1;
}
exports.myIndexOf = myIndexOf;
//Igual que el de arriba pero para cúbica
function myIndexOfCubic(arr, o) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].getX() == o.getX() && arr[i].getY() == o.getY() && arr[i].getZ() == o.getZ()) {
            return i;
        }
    }
    return -1;
}
exports.myIndexOfCubic = myIndexOfCubic;
// Esta clase contendrá funciones relacionadas con el Pathfinding y encontrar si una unidad tiene acceso a cierta casilla o unidad
class Pathfinding {
    static getAttackableUnits(unit) {
        // Primero, necesitamos encontrar las casillas de las unidades enemigas
        let enemyUnitsPos = Store_1.store.getState().units.filter(x => x.player != unit.player).map(x => x.position);
        let enemyUnitsReachable = [];
        // Ahora, realizaremos una iteración igual que el proceso de obtener las posiciones accesibles por la unidad.
        var visitables_cubic = [new Cubic(unit.position)];
        // Los vecinos estarán compuestos por la posición cúbica y el número de movimientos para pasar la posición
        var neighbours = new Array();
        for (var i = 0; i < unit.range; i++) {
            // Calculamos los próximos vecinos:
            var new_neighbours = [];
            visitables_cubic = visitables_cubic.concat(neighbours);
            for (var index_directions = 0; index_directions < exports.cubic_directions.length; index_directions++) {
                visitables_cubic.forEach(cubic => {
                    var new_cubic = cubic.add(exports.cubic_directions[index_directions]);
                    // Mientras la casilla actual no sea ya visitada o esté contenida en los vecinos anteriores
                    if (myIndexOfCubic(visitables_cubic, new_cubic) == -1 && myIndexOfCubic(neighbours, new_cubic) == -1) {
                        // En el caso de que no sea ninguno de los anteriores, la añadiremos a los visitados
                        new_neighbours.push(new_cubic);
                        // Y comprobamos que exista una unidad enemiga en esa posición
                        let index = myIndexOf(enemyUnitsPos, new_cubic.getPair());
                        if (index > -1) {
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
    static getPositionClicked(xCoor, yCoor) {
        // Para obtener las posiciones relativas al mapa, obtenemos las posiciones absolutas del primer objeto, que es el hexágono primero.
        var dimensions = document.getElementById("hex0_0").getBoundingClientRect();
        // Para soportar mejor los cambios de pantalla, obtenemos las dimensiones del hex primero, para los demás será igual.
        var height = dimensions.bottom - dimensions.top; // Hardcoded, se deberían realizar más pruebas
        var width = Math.round(height * 1.153846154); // El valor que se multiplica es la proporción entre el height y width
        var x = xCoor - dimensions.left; // A las coordenadas absolutas les restamos las dimensiones en el extremo superior izquierdo del primer hex.
        var y = yCoor - dimensions.top;
        var column = Math.floor(x / (3 / 4 * width)); // Primero, encontramos la columna aproximada, dividiendo la posición por 3/4 la anchura (debido a los siguientes cálculos)
        var row; // Definimos el número de fila.
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
                }
                else {
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
    static getInCircle(centerX, centerY, radius, x, y) {
        // Raiz cuadrada de la distancia vectorial entre el centro y el punto debe ser menor al radio
        return this.calculateDistance(centerX, centerY, x, y) < radius;
    }
    // Calcula la distancia vectorial entre dos puntos
    static calculateDistance(x0, y0, x1, y1) {
        return Math.sqrt(Math.pow((x0 - x1), 2) + Math.pow((y0 - y1), 2));
    }
}
exports.Pathfinding = Pathfinding;
// Esta clase contendrán métodos auxiliares con respecto a la conexión entre cliente y servidor
class Network {
    static parseStateFromServer(data) {
        // Definimos la salida, un mapa, y lo populamos con datos por defecto
        let result = {
            turn: 0,
            actualState: 0,
            units: [],
            visitables: [],
            terrains: [],
            cursorPosition: new Pair(0, 0),
            map: undefined,
            selectedUnit: 0,
            type: ""
        };
        // Primero, convertimos el objeto en un mapa
        let json = JSON.parse(data);
        // Después iteramos por cada uno de los atributos y crearemos el objeto cuando sea necesario
        // Para empezar, asignamos las variables primitivas, al no necesitar inicializarlas
        result.turn = json.turn;
        result.actualState = json.actualState;
        result.selectedUnit = json.selectedUnit;
        result.type = json.type;
        // Después, creamos un Pair con los datos introducidos
        result.cursorPosition = new Pair(json.cursorPosition.row, json.cursorPosition.column);
        // Ahora nos encargamos de visitables
        // Inicializamos una lista con los datos de las casillas visitables
        let visitables = json.visitables;
        // Y asignamos al estado las casillas
        if (visitables)
            result.visitables = visitables.map(pair => new Pair(pair.row, pair.column));
        // Ahora vamos con las unidades:
        let units = json.units;
        // Para cada uno, crearemos una unidad con esos datos.
        if (units) {
            result.units = units.map(unit => new Unit_1.Unit(unit.name, unit.type, unit.movement, new Pair(unit.position.row, unit.position.column), unit.player, unit.used, unit.attackWeak, unit.attackStrong, unit.defenseWeak, unit.defenseStrong, unit.health, unit.range, 0, unit.hasAttacked));
        }
        // Finalmente, nos quedan los terrenos, mismo proceso
        let terrains = json.terrains;
        if (terrains) {
            result.terrains = terrains.map(terrain => new Terrains_1.Terrain(terrain.name, terrain.image, terrain.movement_penalty, new Pair(terrain.position.row, terrain.position.column)));
        }
        // Retornamos el estado final
        return result;
    }
}
exports.Network = Network;