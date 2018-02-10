import * as sqlite from 'sqlite3';

export class MapsDatabase {
    static connection: sqlite.Database;

    /// Este método se encargará de inicializar la conexión con la BD
    public static initOrCallDatabase(callback: (err: Error) => void) {
        // Si la BD no está inicializada
        if(!MapsDatabase.connection) {
            // Ejecutamos el método de inicialización, que llamará al callback
            MapsDatabase.connection = new sqlite.Database("maps-database.sqlite", callback);
        // En el caso de que lo esté
        } else {
            // Sólamente llamaremos el callback
            callback(null);
        }     
    }

    /// Esta función se encargará de guardar el mapa y los terrenos del mapa,
    /// al terminar ejecutará el callback introducido con el código.
    /// code.status indicará si ha habido un error
    /// code.error indicará el error o en su defecto, "Success"
    public static saveMap(mapData: { rows: number, cols: number, map: any[] }, callback: (code: { status: boolean, error: string }) => void) {
        // Inicializamos o no la BD
        MapsDatabase.initOrCallDatabase((err: Error) => {
            // Comprobamos el mensaje de error
            if(err) {
                // Si hay error, lo mostramos en pantalla
                console.error("Se ha producido un error intentando abrir la BD!");
                callback({ status: false, error: "Can't connect to DB" });
            } else {
                console.log(mapData);
                // Preparamos el guardado del mapa
                let statement = MapsDatabase.connection.prepare("INSERT INTO map(rows, cols) VALUES ($rows, $cols);");
                // Y lo ejecutamos con los valores obtenidos del mapa
                statement.run({
                    $rows: mapData.rows, 
                    $cols: mapData.cols
                }, (runResult: sqlite.RunResult, error: Error) => {
                    // Comprobamos si hay error:
                    if(err) {
                        // Se ha producido un error
                        console.error("Se ha producido un error creando el mapa");
                        callback({ status: false, error: "Error saving map" });
                    } else {
                        // Trás ejecutar la creación del mapa, obtenemos el último ID para poder crear los terrenos
                        MapsDatabase.connection.get("SELECT last_insert_rowid() FROM map;", (err: Error, rows: any) => {
                            // Si hay error
                            if(err) {
                                console.log("Error trying to get the ID of the last map created");
                                callback({ status: false, error: "Error trying to get the ID of the last map created" });
                            } else {
                                // En este caso, tendremos el ID
                                let mapId = rows['last_insert_rowid()'];
                                // Primero, creamos el statement con el comando de creación del terreno
                                let statement = MapsDatabase.connection.prepare("INSERT INTO terrain(id_map, name, image, movement_penalty," + 
                                     "position_row, position_cols, defense_weak, defense_strong, attack_weak, attack_strong)" + 
                                     " VALUES ($id_map, $name, $image, $movement_penalty, $position_row, $position_cols,"+
                                     " $defense_weak, $defense_strong, $attack_weak, $attack_strong)");
                                // Ahora empezamos a crear los mapas
                                for(let index = 0; index < mapData.map.length; index++) {
                                    let terrain = mapData.map[index];
                                    // Por cada uno, asignamos los valores del comando antes creado y lo ejecutamos
                                    statement.run({
                                        $id_map: mapId,
                                        $name: terrain.name,
                                        $image: terrain.image,
                                        $movement_penalty: terrain.movement_penalty,
                                        $position_row: terrain.position.row,
                                        $position_cols: terrain.position.column,
                                        $defense_weak: terrain.defenseWeak,
                                        $defense_strong: terrain.defenseStrong,
                                        $attack_weak: terrain.attackWeak,
                                        $attack_strong: terrain.attackStrong
                                    });
                                }
                            }
                        });
                    }
                });
                // Indicamos que hemos terminado de añadir elementos
                statement.finalize();
            }
        });
    }
}