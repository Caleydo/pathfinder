define(["d3", "jquery", "./config", "./setinfo", "./list/path/settings", "./uiutil"], function (d3, $, config, setInfo, pathSettings, uiUtil) {

  function PropertyMapper(propertyName, domainAccessor) {
    this.propertyName = propertyName;
    this.getScaleDomain = domainAccessor;
  }

  PropertyMapper.prototype = {
    getValue: function (node) {
      return node.properties[this.propertyName];
    },
    getLabel: function (node) {
      return this.propertyName;
    },
    getColor: function (node) {
      return config.getNodePropertyColorFromPropertyName(this.propertyName);
    }
  };

  return {
    PropertyMapper: PropertyMapper,

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

    indexOfNodeInPath: function (node, path) {
      for (var i = 0; i < path.nodes.length; i++) {
        if (path.nodes[i].id === node.id) {
          return i;
        }
      }
      return -1;
    },

    getCommonNodes: function (path1, path2) {
      var nodes = [];

      for (var i = 0; i < path1.nodes.length; i++) {
        var currentNodeId = path1.nodes[i].id;
        for (var j = 0; j < path2.nodes.length; j++) {
          if (currentNodeId === path2.nodes[j].id) {
            nodes.push(path2.nodes[j]);
            break;
          }
        }
      }
      return nodes;
    },

    getNonCommonNodesOfPath: function (path, referencePath) {
      var nodes = [];

      for (var i = 0; i < path.nodes.length; i++) {
        var currentNodeId = path.nodes[i].id;
        var common = false;
        for (var j = 0; j < referencePath.nodes.length; j++) {
          if (currentNodeId === referencePath.nodes[j].id) {
            common = true;
            break;
          }
        }
        if (!common) {
          nodes.push(path.nodes[i]);
        }
      }
      return nodes;
    },

    getNodeUrl: function (node) {
      var property = config.getNodeUrlProperty(node);
      if (property) {
        return node.properties[property];
      }
    },

    getDefaultNodeOverlayItems: function (node) {
      //var items = queryUtil.getFilterOverlayItems("name", d.node.properties[config.getNodeNameProperty(node)]);

      var items = require("./query/queryutil").getFilterOverlayItems("name", node.properties[config.getNodeNameProperty(node)], config.getNodeType(node));
      var url = this.getNodeUrl(node);
      if (url) {
        items.push({
          text: "Show",
          icon: "\uf08e",
          callback: function () {
            window.open(url);
          }
        })
      }

      return items;
    },

    getSetIdsOfNodes: function (nodes) {
      var that = this;
      var setIds = d3.set([]);

      nodes.forEach(function (node) {
        that.forEachNodeSet(node, function (setType, setId) {
          setIds.add(setId);
        })
      });
      return setIds.values();
    },

    getSetIdsOfEdges: function (edges) {
      var that = this;
      var setIds = d3.set([]);

      edges.forEach(function (edge) {
        that.forEachEdgeSet(edge, function (setType, setId) {
          setIds.add(setId);
        })
      });
      return setIds.values();
    },

    renderNode: function (parent, node, x, y, width, height, clipPath, textWidthFunction, overlayItems, showOnNodeMapping) {
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

      if (showOnNodeMapping) {
        var onNodeMapping = parent.append("g").
          classed("onNodeMapping", true)
          .attr({
            transform: "translate(" + (x+5) + "," + (y + height-3) + ")"
          });
        uiUtil.appendBars(onNodeMapping, [pathSettings.onNodeMapper.getValue(node)], d3.scale.linear().domain(pathSettings.onNodeMapper.getScaleDomain()).range([0, width]),
          5, pathSettings.onNodeMapper.getColor(), pathSettings.onNodeMapper.getLabel(), false, false);
      }

    },

    updateNode: function (parent, node, x, y, width, height, textWidthFunction, overlayItems, showOnNodeMapping) {
      parent.select("rect")
        .attr({
          rx: 5,
          ry: 5,
          x: x,
          y: y,
          width: width,
          height: height
        });

      parent.select("text")
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
          }
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

        parent.select("path.nodeTypeSymbol")
          .classed("nodeTypeSymbol", true)
          .attr({
            d: symbol,
            transform: function () {

              return "translate(" + (x + 10) + "," + (y + height / 2) + ")";
            }
          });
      }

      $(parent[0]).off("mouseenter.overlay");
      $(parent[0]).off("mouseleave.overlay");

      if (typeof overlayItems !== "undefined" && overlayItems.length > 0) {
        uiUtil.createTemporalMenuOverlayButton(parent, x + width, y, false, overlayItems);
      }

      if (showOnNodeMapping) {
        var onNodeMapping = parent.select("g.onNodeMapping");
        if (onNodeMapping.empty()) {
          onNodeMapping = parent.append("g")
            .classed("onNodeMapping", true)
            .attr({
              transform: "translate(" + (x+5) + "," + (y + height-3) + ")"
            });

          uiUtil.appendBars(onNodeMapping, [pathSettings.onNodeMapper.getValue(node)], d3.scale.linear().domain(pathSettings.onNodeMapper.getScaleDomain()).range([0, width-10]),
            5, pathSettings.onNodeMapper.getColor(), pathSettings.onNodeMapper.getLabel(), false, false);
        } else {
          uiUtil.updateBars(onNodeMapping, [pathSettings.onNodeMapper.getValue(node)], d3.scale.linear().domain(pathSettings.onNodeMapper.getScaleDomain()).range([0, width-10]),
            5, pathSettings.onNodeMapper.getColor(), pathSettings.onNodeMapper.getLabel(), false)
        }
      } else {
        parent.select("g.onNodeMapping").remove();
      }

    }

  }
});
