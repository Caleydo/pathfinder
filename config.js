define(['d3', 'jquery', "../caleydo_core/main", "colors", "./list/path/settings", "./listeners"], function (d3, $, C, colors, pathSettings, listeners) {

  var DEFAULT_NODE_WIDTH = 60;
  var DEFAULT_NODE_HEIGHT = 20;

  var DEFAULT_EDGE_SIZE = 30;

  var isAutoColor = true;
  var colorsEnabled = true;

  var nodeWidth = DEFAULT_NODE_WIDTH;

  var config = {};
  var nodeNamePropertyNames = {};

  var nodeSets = {};
  var edgeSets = {};

  var nodeTypeSymbols = {};

  var setTypeColors = {};
  var propertyColors = {};
  var datasetColors = {};

  return {

    COLOR_UPDATE: "COLOR_UPDATE",
    NODE_SIZE_UPDATE: "NODE_SIZE_UPDATE",

    setConfig: function (c) {
      var that = this;
      config = c;


      nodeWidth = config.settings["node_width"];
      nodeWidth = (typeof nodeWidth === "undefined") ? DEFAULT_NODE_WIDTH : nodeWidth;
      $("#nodeWidth").val(nodeWidth);

      var symbols = d3.svg.symbolTypes;

      if (config.sets) {
        assignColors(config.sets, function (setConfig) {
          return setConfig["set_property"]
        }, setTypeColors);
      }

      var numericalNodeProperties = [];
      config.nodes.forEach(function (nodeConfig, i) {

        Object.keys(nodeConfig.properties).forEach(function (key) {
          var prop = nodeConfig.properties[key];
          var propType = prop.type;
          if (typeof propType !== "undefined" && propType === "set") {
            var sets = nodeSets[nodeConfig["node_label"]];
            if (typeof sets === "undefined") {
              sets = {};
              nodeSets[nodeConfig["node_label"]] = sets;
            }
            sets[key] = prop;
          }
          if (config.nodes.length > 1) {
            nodeTypeSymbols[nodeConfig["node_label"]] = symbols[i];
          }

          if (prop === "numerical") {
            numericalNodeProperties.push(key);
          }

        });
      });

      assignColors(numericalNodeProperties, function (property) {
        return property;
      }, propertyColors);
      if (config.datasets) {
        assignColors(config.datasets, function (dataset) {
          return dataset["id"]
        }, datasetColors);
      }

      function assignColors(array, idAccessor, map) {
        if (array.length <= colors.colorsLeft) {
          array.forEach(function (el) {
            map[idAccessor(el)] = colors.nextColor();
          });
        } else {
          array.forEach(function (el) {
            map[idAccessor(el)] = "gray";
          });
        }
      }

      $("#enable_colors").on("click", function () {
        colorsEnabled = true;
        isAutoColor = false;
        listeners.notify(that.COLOR_UPDATE, colorsEnabled);
      });

      $("#disable_colors").on("click", function () {
        colorsEnabled = false;
        isAutoColor = false;
        listeners.notify(that.COLOR_UPDATE, colorsEnabled);
      });

      $("#auto_colors").on("click", function () {
        isAutoColor = true;
        colorsEnabled = (typeof pathSettings.referencePathId === "undefined");

        listeners.notify(that.COLOR_UPDATE, colorsEnabled);
      });


      $("#applyNodeWidth").on("click", function () {
        var width = parseInt($("#nodeWidth").val());
        if (width !== nodeWidth) {
          nodeWidth = width;
          listeners.notify(that.NODE_SIZE_UPDATE, nodeWidth);
        }
      });

      config.edges.forEach(function (edgeConfig) {

        Object.keys(edgeConfig.properties).forEach(function (key) {
          var prop = edgeConfig.properties[key];
          var propType = prop.type;
          if (typeof propType !== "undefined" && propType === "set") {
            var sets = edgeSets[edgeConfig["label"]];
            if (typeof sets === "undefined") {
              sets = {};
              edgeSets[edgeConfig["label"]] = sets;
            }
            sets[key] = prop;
          }
        });

      });
    },

    isAutoColor: function () {
      return isAutoColor;
    },

    enableColors: function (enable) {
      colorsEnabled = enable;
    },

    isEnableColors: function () {
      return colorsEnabled;
    },

    isSetEdgesOnly: function () {
      return config.settings["set_edges_only"] ? true : false;
    },

    getUseCase: function () {
      return C.hash.getProp('uc', C.param.getProp('uc', 'dblp'));
    },

    getSamplePathsFile: function () {
      return config["sample_paths"];
    },

    getSampleQueryInfo: function(key) {
      var sampleQueryConfig = config["sample_query"];
      if(sampleQueryConfig){
        return sampleQueryConfig[key];
      }
    },

    getSampleQueryStartInfo: function() {
      return this.getSampleQueryInfo("start");
    },

    getSampleQueryEndInfo: function() {
      return this.getSampleQueryInfo("end");
    },

    isNodeSetProperty: function (node, property) {
      var type = this.getNodeType(node);
      var sets = nodeSets[type];
      if (typeof sets !== "undefined") {
        var set = sets[property];
        if (typeof set !== "undefined") {
          return true;
        }
      }
      return false;
    }
    ,

    getSetColorFromSetTypePropertyName: function (name) {
      if (colorsEnabled) {
        return setTypeColors[name];
      }
      return "gray";
    }
    ,

    getDatasetColorFromDatasetId: function (id) {
      if (colorsEnabled) {
        return datasetColors[id];
      }
      return "gray";
    }
    ,

    getNodePropertyColorFromPropertyName: function (name) {
      if (colorsEnabled) {
        return propertyColors[name];
      }
      return "gray";
    }
    ,


    getSetTypeFromSetPropertyName: function (propertyName) {

      var setConfig = this.getSetConfigFromSetPropertyName(propertyName)
      if (setConfig) {
        return setConfig["name"];
      }
    }
    ,

    getSetConfigFromSetPropertyName: function (propertyName) {
      for (var i = 0; i < config.sets.length; i++) {
        var setConfig = config.sets[i];
        if (setConfig["set_property"] === propertyName) {
          return setConfig;
        }
      }
    },


    getSetTypeFromNodeSetProperty: function (node, property) {
      var type = this.getNodeType(node);
      var sets = nodeSets[type];
      if (typeof sets !== "undefined") {
        var set = sets[property];
        if (typeof set !== "undefined") {
          return getSetTypeFromSetTypeId(set.set);
        }
      }
    }
    ,

    isEdgeSetProperty: function (edge, property) {
      var sets = edgeSets[edge.type];
      if (typeof sets !== "undefined") {
        var set = sets[property];
        if (typeof set !== "undefined") {
          return true;
        }
      }
      return false;
    }
    ,

    getEdgeSetProperties: function (edge) {
      var sets = edgeSets[edge.type];
      if (typeof sets !== "undefined") {
        return Object.keys(sets);
      }
      return [];
    }
    ,

    getSetTypeFromEdgeSetProperty: function (edge, property) {
      var sets = nodeSets[edge.type];
      if (typeof sets !== "undefined") {
        var set = sets[property];
        if (typeof set !== "undefined") {

          return getSetTypeFromSetTypeId(set.set);
        }
      }
    }
    ,

    getConfig: function () {
      return config;
    }
    ,

    isSetEdge: function (edge) {

      var edgeConfig = this.getEdgeConfig(edge);
      if (typeof edgeConfig === "undefined") {
        return false;
      }

      var propertyKeys = Object.keys(edgeConfig.properties);

      for (var i = 0; i < propertyKeys.length; i++) {
        var key = propertyKeys[i];
        var propType = edgeConfig.properties[key].type;
        if (typeof propType !== "undefined" && propType === "flag") {
          var edgeProperty = edge.properties[key];
          if (typeof edgeProperty !== "undefined" && edgeProperty === true)
            return true;
        }
      }

      return false;
    }
    ,

    isNetworkEdge: function (edge) {
      var edgeConfig = this.getEdgeConfig(edge);
      if (typeof edgeConfig === "undefined") {
        return false;
      }

      var propertyKeys = Object.keys(edgeConfig.properties);

      for (var i = 0; i < propertyKeys.length; i++) {
        var key = propertyKeys[i];
        var property = edgeConfig.properties[key];
        if (typeof property !== "undefined" && property === "flag_network") {
          var edgeProperty = edge.properties[key];
          if (typeof edgeProperty !== "undefined" && edgeProperty === true)
            return true;

        }
      }

      return false;
    }
    ,

    getNodeWidth: function () {
      return nodeWidth;
    }
    ,

    getNodeHeight: function () {
      var nodeHeight = config.settings["node_height"];
      return (typeof nodeHeight === "undefined") ? DEFAULT_NODE_HEIGHT : nodeHeight;
    }
    ,

    getEdgeSize: function () {
      var edgeSize = config.settings["edge_size"];
      return (typeof edgeSize === "undefined") ? DEFAULT_EDGE_SIZE : edgeSize;
    }
    ,

    getNodeConfig: function (node) {
      for (var i = 0; i < node.labels.length; i++) {
        var currentLabel = node.labels[i];

        for (var j = 0; j < config.nodes.length; j++) {
          var nodeConfig = config.nodes[j];
          if (nodeConfig["node_label"] === currentLabel) {
            return nodeConfig;
          }
        }
      }
    }
    ,

    getEdgeConfig: function (edge) {
      for (var j = 0; j < config.edges.length; j++) {
        var edgeConfig = config.edges[j];
        if (edgeConfig["label"] === edge.type) {
          return edgeConfig;
        }
      }
    }
    ,

    getSetConfigByLabel: function (label) {

      for (var j = 0; j < config.sets.length; j++) {
        var setConfig = config.sets[j];
        if (setConfig["node_label"] === label) {
          return setConfig;
        }
      }
    }
    ,

    getSetConfig: function (setNode) {
      for (var i = 0; i < setNode.labels.length; i++) {
        var setConfig = this.getSetConfigByLabel(setNode.labels[i]);
        if (typeof setConfig !== "undefined") {
          return setConfig;
        }
      }
    }
    ,

    getNodeNameProperty: function (node) {
      var nodeConfig = this.getNodeConfig(node);

      var propertyName = nodeNamePropertyNames[nodeConfig["node_label"]];

      if (typeof propertyName !== "undefined") {
        return propertyName;
      }
      var keys = Object.keys(nodeConfig.properties);

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (nodeConfig.properties[key] === "name") {
          nodeNamePropertyNames[nodeConfig["node_label"]] = key;
          return key;
        }
      }
    }
    ,

    isNumericalNodeProperty: function (node, property) {

      var nodeConfig = this.getNodeConfig(node);
      var keys = Object.keys(nodeConfig.properties);

      for (var i = 0; i < keys.length; i++) {
        var key = key[i];
        if (nodeConfig.properties[key] === "numerical" && key === property) {
          return true;
        }
      }

      return false;
    }
    ,

    getNumericalNodeProperties: function (node) {
      var nodeConfig = this.getNodeConfig(node);
      var properties = [];
      Object.keys(nodeConfig.properties).forEach(function (prop) {
        if (nodeConfig.properties[prop] === "numerical" && typeof node.properties[prop] !== "undefined") {
          properties.push(prop);
        }
      });
      return properties;
    }
    ,

    getSetNameProperty: function (setNode) {
      var setConfig = this.getSetConfig(setNode);

      var propertyName = nodeNamePropertyNames[setConfig["node_label"]];

      if (typeof propertyName !== "undefined") {
        return propertyName;
      }
      var keys = Object.keys(setConfig.properties);

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (setConfig.properties[key] === "name") {
          nodeNamePropertyNames[setConfig["node_label"]] = key;
          return key;
        }
      }
    }
    ,

    getSetNodeLabel: function (setNode) {
      var setConfig = this.getSetConfig(setNode);

      return setConfig["node_label"];
    }
    ,

    getSetNodeLabels: function () {
      var labels = [];

      config.sets.forEach(function (set) {
        labels.push(set["node_label"]);
      });

      return labels;
    }
    ,

    getSetPropertyOfConfig: function (setConfig, property) {
      var keys = Object.keys(setConfig.properties);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (setConfig.properties[key] === property) {
          return key;
        }
      }
    }
    ,

    getSetNameProperties: function () {
      var nameProperties = [];
      var that = this;

      config.sets.forEach(function (setConfig) {
        nameProperties.push(that.getSetPropertyOfConfig(setConfig, "name"));
      });

      return nameProperties;
    }
    ,

    getSetNamePropertyOfType: function (label) {
      var setConfig = this.getSetConfigByLabel(label);
      return this.getSetPropertyOfConfig(setConfig, "name");
    }
    ,

    getSetUrlPropertyOfType: function (label) {
      var setConfig = this.getSetConfigByLabel(label);
      return this.getSetPropertyOfConfig(setConfig, "url");
    }
    ,

    getSetUrlProperty: function (setNode) {
      var setConfig = this.getSetConfig(setNode);
      return this.getSetPropertyOfConfig(setConfig, "url");
    }
    ,

    /**
     * returns the property that is used in nodes and edges to refer to a set with the specified label
     * @param label
     */
    getSetProperty: function (label) {
      var setConfig = this.getSetConfigByLabel(label);
      return setConfig["set_property"];
    }
    ,

    getSetTypeFromLabel: function (label) {
      var setConfig = this.getSetConfigByLabel(label);
      return setConfig["name"];
    }
    ,

    getEdgeTypeOfOriginSetPropertyName: function (propertyName) {
      var setConfig = this.getSetConfigFromSetPropertyName(propertyName);
      return setConfig["originOf"];
    },

    isSetTypeEdgeOrigin: function (propertyName) {
      return typeof this.getEdgeTypeOfOriginSetPropertyName(propertyName) !== "undefined"
    },

    isSetOriginOfEdge: function (setId, edge) {

      var origins = edge.properties["_edgeOrigin"];
      if (typeof origins === "undefined") {
        return false;
      }

      for (var i = 0; i < origins.length; i++) {
        if (origins[i] === setId) {
          return true;
        }
      }
      return false;
    },

    getNodeType: function (node) {
      var nodeConfig = this.getNodeConfig(node);
      var type = nodeConfig ? nodeConfig["node_label"] : undefined;
      if (typeof type === "undefined") {
        return "Unknown";
      }
      return type;
    }
    ,

    getNodeUrlProperty: function (node) {
      var nodeConfig = this.getNodeConfig(node);
      if (nodeConfig) {
        return nodeConfig.properties["url"];
      }
    }
    ,

    getNodeTypeSymbol: function (nodeType) {
      return nodeTypeSymbols[nodeType];
    }
    ,

    getTypeSymbolForNode: function (node) {
      return this.getNodeTypeSymbol(this.getNodeType(node));
    }
    ,

    getNodeTypes: function () {
      return config.nodes.map(function (nodeConfig) {
        return nodeConfig["node_label"];
      });
    }
    ,

    getDatasetConfigs: function () {
      return config["datasets"] || [];
    }
    ,

    getDatasetConfig: function (datasetId) {

      for (var i = 0; i < config["datasets"].length; i++) {
        var dsConfig = config["datasets"][i];
        if (dsConfig.id === datasetId) {
          return dsConfig;
        }
      }
    }
    ,

    getStratification: function () {
      return config["stratification"];
    }
  }


})
;
