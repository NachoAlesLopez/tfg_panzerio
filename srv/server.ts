import * as Units from '../src/Unit';
import * as Utils from '../src/Utils';
import * as Terrains from '../src/Terrains';
import * as webSocket from 'ws';

var server = new webSocket.Server({ port: 8080 });

server.on('connection', function connect(ws) {
    // Este será el inicio del servidor, por ahora nos encargaremos de mostrarle el estado
    console.log("Connected with someone");
    ws.on("message", function getInitialState(data) {
        // Dependiendo del estado, retornaremos una cosa u otra
        console.log("Data: "+data);
        let message = JSON.parse(data as string);
        switch (message.type) {
            case "getInitialState":
                // Retornaremos el estado inicial
                var state = {
                    turn: 0,
                    actualState: 0,
                    units: [Units.General.create(new Utils.Pair(-1, -1), true), Units.Infantry.create(new Utils.Pair(-1, -1), true), Units.Tank.create(new Utils.Pair(-1, -1), true), Units.General.create(new Utils.Pair(-1, -1), false),
                        Units.Infantry.create(new Utils.Pair(-1, -1), false), Units.Tank.create(new Utils.Pair(-1, -1), false)],
                    visitables: null,
                    terrains: [Terrains.ImpassableMountain.create(new Utils.Pair(2, 2)), Terrains.ImpassableMountain.create(new Utils.Pair(3, 2)), Terrains.Hills.create(new Utils.Pair(2, 3)), Terrains.Forest.create(new Utils.Pair(3, 3))],
                    cursorPosition: new Utils.Pair(0, 0),
                    map: null,
                    selectedUnit: null,
                    type: "SET_LISTENER"
                };
                ws.send(JSON.stringify(state));
                break;
            default:
                ws.send("Command not understood");
        }
    });
});
