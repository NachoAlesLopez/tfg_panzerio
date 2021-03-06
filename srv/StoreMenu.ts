import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Redux from 'redux';

import { Map } from './Map';
import { Reducer, State } from './GameStateMenu';
import { Pair, Cubic } from '../src/Utils';
import { Unit } from '../src/Unit';
import { Terrain } from '../src/Terrains';

export interface StoreMenu extends Redux.Store<State> {
    dispatch: Redux.Dispatch<State>
}

export var store = Redux.createStore<State>(Reducer);

export function saveState(act: Redux.AnyAction) {
    store.dispatch(act);
    // Refresca el mapa y el resto de variables del estado
    var turn: number = store.getState().turn;
    var actualState: number = store.getState().actualState;
    var map: Map = store.getState().map;
    var units: Array<Unit> = store.getState().units;
    var terrains: Array<Terrain> = store.getState().terrains;
    var selectedUnit: number = store.getState().selectedUnit;
    var cursorPosition: Pair = store.getState().cursorPosition;
    var type: string = store.getState().type;
    var width: number = store.getState().width;
    var height: number = store.getState().height;
}
