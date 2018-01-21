import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Redux from 'redux';

import { storeEdit } from './StoreEdit';
import { TerrainCell } from './TerrainCell';
import { UnitCell } from './UnitCell';
import { Pair, myIndexOf } from './Utils';
import * as Terrain from './Terrains';

//ESta clase es similar a Cell pero obteniendo los datos de storeEdit (quizas se pudiera generalizar y de esa forma juntar con Cell)
class EditCell extends React.Component<any, any> {
    /** Debe introducirse los atributos horizontal y vertical
        @param props debe contener horizontal y vertical**/
    constructor(props : any) {
        super(props);
        let pair = new Pair(props.row, props.column);
        let indexTerrain = myIndexOf(storeEdit.getState().terrains.map(x => x.position), pair);
        this.state = {
            terrain: indexTerrain > -1?storeEdit.getState().terrains[indexTerrain]:Terrain.Plains.create(new Pair(props.row, props.column)),
        }
    }

    /** Renderiza el objeto **/
    render() {
        // Comprobamos si una unidad está en esta posición
        let indexUnit = myIndexOf(storeEdit.getState().units.map(x => x.position), this.state.terrain.position);
        let unit = indexUnit == -1?null:storeEdit.getState().units[indexUnit];
        // Comprobamos si la casilla actual contiene el cursor, primero obteniendo su posición
        let positionCursor = storeEdit.getState().cursorPosition;
        // Despues comprobando que esta casilla esté en esa posición
        let cursor = positionCursor.column == this.props.column && positionCursor.row == this.props.row;
        let pair = new Pair(this.props.row, this.props.column);
        let indexTerrain = myIndexOf(storeEdit.getState().terrains.map(x => x.position), pair);
        let terrain = indexTerrain > -1?storeEdit.getState().terrains[indexTerrain]:Terrain.Plains.create(pair);
        return (
                <div className="div_cell">
                    <img className="cell" id={"hex"+this.props.row+"_"+this.props.column}
                        src={
                            cursor?this.props.used?"imgs/hex_base_numpad_used.png"
                                :this.props.selected?"imgs/hex_base_numpad_selected.png"
                                :this.props.attack?"imgs/hex_base_numpad_attack.png"
                                :this.props.actual?"imgs/hex_base_numpad_actual.png"
                                :"imgs/hex_base_numpad.png"
                            :this.props.used?"imgs/hex_base_used.png"
                            :this.props.selected?"imgs/hex_base_selected.png"
                            :this.props.attack?"imgs/hex_base_attack.png"
                            :this.props.actual?"imgs/hex_base_actual.png"
                            :"imgs/hex_base.png"} />
                    <TerrainCell terrain={terrain} />
                    {unit!=null?<UnitCell unit={unit} />:""}
                </div>
        );
    }
}

export { EditCell };