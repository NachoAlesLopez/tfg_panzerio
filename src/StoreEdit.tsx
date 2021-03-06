import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Redux from 'redux';

import { EditMap } from './EditMap';
import { ReducerEdit, StateEdit } from './GameEditState';
import { Pair, Network, Parsers } from './Utils';
import { Terrain } from './Terrains';

//Igual que Store pero con el estado de edición
export interface StoreEdit extends Redux.Store<StateEdit> {
    dispatch: Redux.Dispatch<StateEdit>
}

export var storeEdit = Redux.createStore<StateEdit>(ReducerEdit);

export function saveState(act: Redux.AnyAction) {
    //saveStateServer(()=>{}, act);
    storeEdit.dispatch(act);
    // Refresca el mapa y el resto de variables del estado
    var map: EditMap = storeEdit.getState().map;
    var terrains: Array<Terrain> = storeEdit.getState().terrains;
    var selected: string = storeEdit.getState().selected;
    var cursorPosition: Pair = storeEdit.getState().cursorPosition;
    var type: number = storeEdit.getState().type;
}

//Este será el estado actual que se guardará en cliente, el servidor tendrá guardado el estado real
export var actualState: StateEdit = undefined;

export function saveStateServer(callback: () => void, act: Redux.AnyAction){
    var connection = Network.getConnection();
    // Establecemos la conexión
    connection.onmessage = function(event: MessageEvent) {
        if(event.data == "Command not understood") {
            // Enviamos un error, algo ha pasado con el servidor
            throw new Error;
        }
        // Obtenemos el estado
        actualState = Network.parseStateEditFromServer(event.data);
        // Una vez tengamos el estado, llamamos al callback aportado, que permitirá saber con certeza que el estado está disponible
        callback();
    };
    // Enviamos la solicitud
    connection.send(Parsers.stringifyCyclicObject(act));
}
