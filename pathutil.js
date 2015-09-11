define(["d3", "./config", "./setinfo", "./uiutil"], function (d3, config, setInfo, uiUtil) {

    return {
        isNodeSetProperty: function (node, key) {

            return config.isNodeSetProperty(node, key);

            //return key !== "id" && key !== "idType" && key !== "name";
        },
        isEdgeSetProperty: function (edge, key) {
            return config.isEdgeSetProperty(edge, key);
            //return key.charAt(0) !== '_';
        },

        getNodeType: function (node) {
            return config.getNodeType(node);
        },

        getNodeSetTypes: function (node) {

            var setTypes = [];
            var that = this;

            Object.keys(node.properties).forEach(function (key) {
                if (that.isNodeSetProperty(node, key)) {
                    setTypes.push(key);
                }
            });

            return setTypes;
        },

        getEdgeSetTypes: function (edge) {

            var setTypes = [];
            var that = this;

            Object.keys(edge.properties).forEach(function (key) {
                if (that.isEdgeSetProperty(edge, key)) {
                    setTypes.push(key);
                }
            });

            return setTypes;
        },

        getAllSetInfosForNode: function (node) {
            var setInfos = [];
            this.forEachNodeSet(node, function (setType, setId) {
                var info = setInfo.get(setId);
                if (info) {
                    setInfos.push(info);
                }
            });

            return setInfos;
        },

        forEachNodeSet: function (node, callBack) {
            var that = this;

            Object.keys(node.properties).forEach(function (key) {
                if (that.isNodeSetProperty(node, key)) {
                    that.forEachNodeSetOfType(node, key, callBack);
                }
            });
        },

        forEachNodeSetOfType: function (node, setType, callBack) {
            var property = node.properties[setType];
            if (typeof property === "undefined") {
                return;
            }
            if (property instanceof Array) {
                property.forEach(function (setId) {
                    callBack(setType, setId);
                });
            } else {
                callBack(setType, property);
            }
        },

        forEachEdgeSet: function (edge, callBack) {
            var that = this;

            Object.keys(edge.properties).forEach(function (key) {
                if (that.isEdgeSetProperty(edge, key)) {
                    that.forEachEdgeSetOfType(edge, key, callBack);
                }
            });
        },

        forEachEdgeSetOfType: function (edge, setType, callBack) {
            var property = edge.properties[setType];
            if (typeof property === "undefined") {
                return;
            }
            if (property instanceof Array) {
                property.forEach(function (setId) {
                    callBack(setType, setId);
                });
            } else {
                callBack(setType, property);
            }
        },

        isNodeInPath: function (node, path) {
            for (var i = 0; i < path.nodes.length; i++) {
                if (path.nodes[i].id === node.id) {
                    return true;
                }
            }
            return false;
        },

        renderNode: function (parent, node, x, y, width, height, clipPath, textWidthFunction, overlayItems) {
            parent.append("rect")
                .attr({
                    rx: 5,
                    ry: 5,
                    x: x,
                    y: y,
                    width: width,
                    height: height
                });

            parent.append("text")
                .attr({
                    x: function (d) {
                        //var node = that.graph.node(d).node;
                        var text = node.properties[config.getNodeNameProperty(node)];
                        var w = textWidthFunction(text); //+ 12;
                        var nodeTypeSymbol = config.getTypeSymbolForNode(node);

                        //No symbol, text centered
                        if (typeof nodeTypeSymbol === "undefined") {
                            return x + width / 2 + Math.max(-w / 2, -width / 2 + 3);
                        }

                        //Symbol left, text centered
                        return x + width / 2 + Math.max(-w / 2, -width / 2 + 12) + 6;


                        //Symbol left, text left
                        //return -d.width / 2 + 14;

                        //Symbol centered together with text
                        //return Math.max(-width / 2, -d.width / 2+2)+12;
                    },
                    y: function (d) {
                        return y + height - 6;
                    },
                    "clip-path": clipPath
                })
                .text(function (d) {
                    //var node = that.graph.node(d).node;
                    var text = node.properties[config.getNodeNameProperty(node)];
                    //if (text.length > 7) {
                    //  text = text.substring(0, 7);
                    //}
                    return text;
                });

            parent.append("title")
                .text(node.properties[config.getNodeNameProperty(node)] + " (" + config.getNodeType(node) + ")");


            var symbolType = config.getTypeSymbolForNode(node);

            if (typeof symbolType !== "undefined") {
                var symbol = d3.svg.symbol().type(symbolType)
                    .size(64);

                parent.append("path")
                    .classed("nodeTypeSymbol", true)
                    .attr({
                        d: symbol,
                        transform: function () {

                            //var text = d.node.properties[config.getNodeNameProperty(d.node)];
                            //var width = that.view.getTextWidth(text) + 12;
                            //var nodeTypeSymbol = config.getTypeSymbolForNode(d.node);

                            //No symbol, text centered
                            //if(typeof nodeTypeSymbol === "undefined") {
                            //return "translate(" + (Math.max(-width / 2, -d.width / 2+2) + 6) + ", 0)";
                            //}

                            return "translate(" + (x + 10) + "," + (y + height / 2) + ")";
                        }
                    });
            }

            if (typeof overlayItems !== "undefined" && overlayItems.length > 0) {
                uiUtil.createTemporalMenuOverlayButton(parent, x + width, y, false, overlayItems);
            }

        }

    }
});
