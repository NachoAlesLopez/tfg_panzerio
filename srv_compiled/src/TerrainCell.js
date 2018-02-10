"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");

var TerrainCell = function (_React$Component) {
    _inherits(TerrainCell, _React$Component);

    function TerrainCell(props) {
        _classCallCheck(this, TerrainCell);

        return _possibleConstructorReturn(this, (TerrainCell.__proto__ || Object.getPrototypeOf(TerrainCell)).call(this, props));
    }
    //Este es el render del obstacle


    _createClass(TerrainCell, [{
        key: "render",
        value: function render() {
            return React.createElement("div", { className: "obstacle" }, React.createElement("img", { id: "obstacle" + this.props.terrain.position.getRow() + "_" + this.props.terrain.position.getColumn(), src: this.props.terrain.image }));
        }
    }]);

    return TerrainCell;
}(React.Component);

exports.TerrainCell = TerrainCell;