import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Redux from 'redux';
import { Profile } from './Profile';
import { State } from './GameState';
import { Pair, Cubic } from '../src/Utils';
import { Unit } from '../src/Unit';
import { Army } from '../src/Army';
import { Terrain } from '../src/Terrains';

export type StateProfile = {
    readonly profile: Profile,
    readonly armies: Array<Army>,
    readonly selectedArmy: number,
    readonly selected: string,
    readonly type: string
}

function getInitialStateProfile(): StateProfile {
    return {
        profile: null,
        armies: new Array<Army>(),
        selectedArmy: null,
        selected: null,
        type: "0"
    };
}

export const InitialStateProfile: StateProfile = getInitialStateProfile();

//Se actualizan cada uno de los estados, está puesto un forceUpdate ya que no se actualizaba
export const ReducerProfile : Redux.Reducer<StateProfile> =
    (state: StateProfile = InitialStateProfile, action: Redux.AnyAction) => {
        switch(action.actionType) {
            case "SAVE":
                //action.profile.forceUpdate();
                return{
                    profile: action.profile,
                    armies: action.armies,
                    selectedArmy: action.selectedArmy,
                    selected: action.selected,
                    type: action.type
                };
            default:
                return state;
        }
    }
