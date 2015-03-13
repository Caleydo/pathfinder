define(['jquery', 'd3', './view', './hierarchyelements', './selectionutil', './listeners', './pathsorting'], function ($, d3, view, hierarchyElements, selectionUtil, listeners, pathSorting) {

  var HierarchyElement = hierarchyElements.HierarchyElement;

  var HIERARCHY_ELEMENT_HEIGHT = 12;
  var COLLAPSE_BUTTON_SPACING = 10;
  var BAR_START_X = 110;
  var MAX_BAR_WIDTH = 80;

  var currentNodeWrapperId = 0;
  var currentNodeTypeWrapperId = 0;
  var currentSetWrapperId = 0;
  var currentSetTypeWrapperId = 0;

  function getKey(d) {
    return d.id;
  }

  function BaseHierarchyElement(parentElement) {
    HierarchyElement.call(this, parentElement);
  }

  BaseHierarchyElement.prototype = Object.create(HierarchyElement.prototype);
  BaseHierarchyElement.prototype.getBaseHeight = function () {
    return HIERARCHY_ELEMENT_HEIGHT;
  }

  function NodeWrapper(parentElement, node) {
    BaseHierarchyElement.call(this, parentElement);
    this.id = currentNodeWrapperId++;
    this.node = node;
    this.pathIds = [];
  }

  NodeWrapper.prototype = Object.create(BaseHierarchyElement.prototype);

  NodeWrapper.prototype.addPath = function (path) {
    if (this.pathIds.indexOf(path.id) === -1) {
      this.pathIds.push(path.id);
    }
  }

  NodeWrapper.prototype.addPath = function (path) {
    if (this.pathIds.indexOf(path.id) === -1) {
      this.pathIds.push(path.id);
    }
  }

  function NodeTypeWrapper(parentElement, type) {
    this.id = currentNodeTypeWrapperId++;
    BaseHierarchyElement.call(this, parentElement);
    this.type = type;
    this.nodeWrapperDict = {};
    this.pathIds = [];
  }

  NodeTypeWrapper.prototype = Object.create(BaseHierarchyElement.prototype);

  NodeTypeWrapper.prototype.addNode = function (node, path) {
    var nodeWrapper = this.nodeWrapperDict[node.id.toString()];

    if (this.pathIds.indexOf(path.id) === -1) {
      this.pathIds.push(path.id);
    }

    if (typeof nodeWrapper === "undefined") {
      nodeWrapper = new NodeWrapper(this, node);
      this.nodeWrapperDict[node.id.toString()] = nodeWrapper;
      this.childElements.push(nodeWrapper);
    }
    nodeWrapper.addPath(path);
  };

  function SetWrapper(parentElement, setId) {
    this.id = currentSetWrapperId++;
    BaseHierarchyElement.call(this, parentElement);
    this.setId = setId;
    this.pathIds = [];
    this.nodeIds = [];
    this.edgeIds = [];
  }

  SetWrapper.prototype = Object.create(BaseHierarchyElement.prototype);

  SetWrapper.prototype.addNode = function (node, path) {
    if (this.pathIds.indexOf(path.id) === -1) {
      this.pathIds.push(path.id);
    }

    if (this.nodeIds.indexOf(node.id) === -1) {
      this.nodeIds.push(node.id);
    }
  }

  function SetTypeWrapper(parentElement, type) {
    this.id = currentSetTypeWrapperId++;
    BaseHierarchyElement.call(this, parentElement);
    this.type = type;
    this.setWrapperDict = {};
    this.pathIds = [];
    this.nodeIds = [];
    this.edgeIds = [];
  }

  SetTypeWrapper.prototype = Object.create(BaseHierarchyElement.prototype);

  SetTypeWrapper.prototype.addNode = function (setId, node, path) {
    var setWrapper = this.setWrapperDict[setId.toString()];

    if (this.pathIds.indexOf(path.id) === -1) {
      this.pathIds.push(path.id);
    }

    if (typeof setWrapper === "undefined") {
      setWrapper = new SetWrapper(this, setId);
      this.setWrapperDict[setId.toString()] = setWrapper;
      this.childElements.push(setWrapper);
    }
    setWrapper.addNode(node, path);
  };

  function PathStatsView() {
    view.call(this, "#pathstats");
    this.paths = [];
    this.nodeTypeDict = {};
    this.setTypeDict = {};
    this.dataRoot = new HierarchyElement();
    this.nodeTypeWrappers = new BaseHierarchyElement(this.dataRoot);
    this.setTypeWrappers = new BaseHierarchyElement(this.dataRoot);
    this.dataRoot.childElements.push(this.nodeTypeWrappers);
    this.dataRoot.childElements.push(this.setTypeWrappers);



    this.selectionListeners = [];
  }

  PathStatsView.prototype = Object.create(view.prototype);


  PathStatsView.prototype.init = function () {
    view.prototype.init.call(this);

    var svg = d3.select("#pathstats svg");
    //svg.append("g")
    //  .classed("nodeTypeGroup", true);
    //svg.append("g")
    //  .classed("setTypeGroup", true);
    svg.append("clipPath")
      .attr("id", "LabelClipPath")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 90)
      .attr("height", 20);
  };

  PathStatsView.prototype.setPaths = function (paths) {
    var that = this;
    paths.forEach(function (path) {
      that.addPath(path);
    });
  };

  PathStatsView.prototype.addPath = function (path) {
    this.paths.push(path);
    var that = this;
    path.nodes.forEach(function (node) {
      var nodeAdded = false;
      for (var i = 0; i < node.labels.length; i++) {
        var currentLabel = node.labels[i];
        if (currentLabel.charAt(0) !== "_") {
          //Assume first valid data label to be node type
          addNode(node, path, currentLabel);
          nodeAdded = true;
          break;
        }
      }

      //No proper type label found
      if(!nodeAdded) {
        addNode(node, path, "Unknown");
      }

      for (var key in node.properties) {
        if (isSetProperty(key)) {
          var property = node.properties[key];
          if (property instanceof Array) {
            property.forEach(function (setId) {
              addNodeSet(key, setId, path, node);
            });
          } else {
            addNodeSet(key, property, path, node);
          }
        }
      }


    });

    function addNode(node, path, type) {
      var nodeType = that.nodeTypeDict[type];
      if (typeof nodeType === "undefined") {
        nodeType = new NodeTypeWrapper(that.nodeTypeWrappers, type);
        that.nodeTypeDict[type] = nodeType;
        that.nodeTypeWrappers.childElements.push(nodeType);
      }
      nodeType.addNode(node, path);
    }

    function addNodeSet(type, setId, path, node) {
      var setType = that.setTypeDict[type];
      if (typeof setType === "undefined") {
        setType = new SetTypeWrapper(that.setTypeWrappers, type);
        that.setTypeDict[type] = setType;
        that.setTypeWrappers.childElements.push(setType);
      }
      setType.addNode(setId, node, path);
    }

    //path.edges.forEach(function (edge) {
    //  for (var key in edge.properties) {
    //    if (key.charAt(0) !== '_') {
    //      var property = edge.properties[key];
    //      if (property instanceof Array) {
    //        property.forEach(function (setId) {
    //          addSet(key, setId);
    //        });
    //      } else {
    //        addSet(key, property);
    //      }
    //    }
    //  }
    //});

    function isSetProperty(key) {
      return key !== "id" && key !== "idType" && key !== "name";
    }
  };

  PathStatsView.prototype.reset = function () {
    this.paths = [];
    this.nodeTypeWrappers.childElements = [];
    this.setTypeWrappers.childElements = [];
    selectionUtil.removeListeners(this.selectionListeners);
    this.selectionListeners = [];
    currentNodeTypeWrapperId = 0;
    currentNodeWrapperId = 0;
    var svg = d3.select("#pathstats svg");
    svg.selectAll("g.nodeTypeGroup")
      .remove();
    svg.selectAll("g.setTypeGroup")
      .remove();
    //svg.append("g")
    //  .classed("nodeTypeGroup", true);
    //svg.append("g")
    //  .classed("setTypeGroup", true);

  };

  PathStatsView.prototype.updateView = function () {

    //d3.selectAll("g.nodeTypeGroup").data([this.nodeTypeWrappers]);


    d3.selectAll("g.level1HierarchyElement")
      .attr({
      transform: hierarchyElements.transformFunction
    });


    var nodeTypeGroup = d3.selectAll("g.nodeTypeGroup");

    var comparator = function (a, b) {
      return d3.descending(a.pathIds.length, b.pathIds.length);
    };

    this.nodeTypeWrappers.childElements.sort(comparator);
    var allNodeTypes = nodeTypeGroup.selectAll("g.nodeTypeStats")
      .data(this.nodeTypeWrappers.childElements, getKey);


    allNodeTypes
      .sort(comparator)
      .transition()
      .attr({
        display: hierarchyElements.displayFunction,
        transform: hierarchyElements.transformFunction
      });

    allNodeTypes.each(function (nodeTypeWrapper) {

      nodeTypeWrapper.childElements.sort(comparator);

      d3.select(this).selectAll("g.nodeStats")
        .data(nodeTypeWrapper.childElements, getKey);

      d3.select(this).selectAll("g.nodeStats")
        .sort(comparator)
        .transition()
        .attr({
          display: hierarchyElements.displayFunction,
          transform: hierarchyElements.transformFunction
        });
    });


    allNodeTypes.selectAll("g.nodeGroup")
      .attr({
        display: function (nodeTypeWrapper) {
          return nodeTypeWrapper.collapsed ? "none" : "inline";
        }
      }
    );

    //d3.selectAll("g.setTypeGroup").data([this.setTypeWrappers]);

    var setTypeGroup = d3.selectAll("g.setTypeGroup");

    this.setTypeWrappers.childElements.sort(comparator);
    var allSetTypes = setTypeGroup.selectAll("g.setTypeStats")
      .data(this.setTypeWrappers.childElements, getKey);


    allSetTypes
      .sort(comparator)
      .transition()
      .attr({
        display: hierarchyElements.displayFunction,
        transform: hierarchyElements.transformFunction
      });

    allSetTypes.each(function (setTypeWrapper) {

      setTypeWrapper.childElements.sort(comparator);

      d3.select(this).selectAll("g.setStats")
        .data(setTypeWrapper.childElements, getKey);

      d3.select(this).selectAll("g.setStats")
        .sort(comparator)
        .transition()
        .attr({
          display: hierarchyElements.displayFunction,
          transform: hierarchyElements.transformFunction
        });
    });


    allSetTypes.selectAll("g.setGroup")
      .attr({
        display: function (setTypeWrapper) {
          return setTypeWrapper.collapsed ? "none" : "inline";
        }
      }
    );

    //.data(function (nodeTypeWrapper) {
    //  return nodeTypeWrapper.nodeWrappers;
    //});

    var scaleDomain = [0, Math.max(this.nodeTypeWrappers.childElements.length <= 0 ? 0 : (d3.max(this.nodeTypeWrappers.childElements, function (d) {
      return d.pathIds.length;
    })), this.setTypeWrappers.childElements.length <= 0 ? 0 : d3.max(this.setTypeWrappers.childElements, function (d) {
      return d.pathIds.length;
    }))];

    var scaleX = d3.scale.linear()
      .domain(scaleDomain)
      .range([0, MAX_BAR_WIDTH]);

    var bars = d3.select("#pathstats svg").selectAll("rect.pathOccurrences")
      .transition()
      .attr("width", function (d) {
        return scaleX(d.pathIds.length)
      });
    bars.selectAll("title")
      .text(function (d) {
        return d.pathIds.length
      });
  };

  PathStatsView.prototype.getMinSize = function () {
    var totalHeight = 0;
    this.nodeTypeWrappers.childElements.forEach(function (nodeTypeWrapper) {
      if (nodeTypeWrapper.canBeShown()) {
        totalHeight += nodeTypeWrapper.getHeight();
      }
    });

    this.setTypeWrappers.childElements.forEach(function (setTypeWrapper) {
      if (setTypeWrapper.canBeShown()) {
        totalHeight += setTypeWrapper.getHeight();
      }
    });


    return {width: BAR_START_X + MAX_BAR_WIDTH, height: this.dataRoot.getHeight()};
  };

  PathStatsView.prototype.render = function () {

    var that = this;

    var allLevel1HierarchyElements = d3.select("#pathstats svg").selectAll("g.level1HierarchyElement").data(this.dataRoot.childElements);

    allLevel1HierarchyElements.enter()
      .append("g")
      .classed("level1HierarchyElement", true)
      .each(function(d) {
        if(d === that.nodeTypeWrappers) {
          d3.select(this)
            .classed("nodeTypeGroup", true);


        } else if(d === that.setTypeWrappers) {
          d3.select(this)
            .classed("setTypeGroup", true);
        }
      });
    this.renderNodeStats();
    //this.renderNodeStats();
    this.renderSetStats();

    this.updateView();
    this.updateViewSize();
  };

  PathStatsView.prototype.renderNodeStats = function () {

    //d3.selectAll("g.nodeTypeGroup").data([this.nodeTypeWrappers]);

    var nodeTypeGroup = d3.selectAll("g.nodeTypeGroup");

    nodeTypeGroup.attr({
        transform: hierarchyElements.transformFunction
      });

    var that = this;

    var allNodeTypes = nodeTypeGroup.selectAll("g.nodeTypeStats")
      .data(this.nodeTypeWrappers.childElements, getKey);

    var scaleDomain = [0, Math.max(this.nodeTypeWrappers.childElements.length <= 0 ? 0 : (d3.max(this.nodeTypeWrappers.childElements, function (d) {
      return d.pathIds.length;
    })), this.setTypeWrappers.childElements.length <= 0 ? 0 : d3.max(this.setTypeWrappers.childElements, function (d) {
      return d.pathIds.length;
    }))];

    var scaleX = d3.scale.linear()
      .domain(scaleDomain)
      .range([0, MAX_BAR_WIDTH]);

    var nodeType = allNodeTypes
      .enter()
      .append("g")
      .classed("nodeTypeStats", true)
      .attr({
        display: hierarchyElements.displayFunction,
        transform: "translate(0," + Math.max($(this.parentSelector)[0].offsetHeight, that.getMinSize().height) + ")"
      });

    nodeType.append("rect")
      .classed("filler", true)
      .attr({
        x: 0,
        y: 0,
        width: "100%",
        height: HIERARCHY_ELEMENT_HEIGHT
      });

    nodeType.append("text")
      .attr("class", "collapseIconSmall")
      .attr("x", 5)
      .attr("y", HIERARCHY_ELEMENT_HEIGHT)
      .text(function (nodeTypeWrapper) {
        return nodeTypeWrapper.collapsed ? "\uf0da" : "\uf0dd";
      })
      .on("click", function (nodeTypeWrapper) {
        nodeTypeWrapper.collapsed = !nodeTypeWrapper.collapsed;
        d3.select(this).text(nodeTypeWrapper.collapsed ? "\uf0da" : "\uf0dd");
        that.updateView();
      });

    var nodeTypeLabel = nodeType.append("text")
      .text(function (nodeTypeWrapper) {
        return nodeTypeWrapper.type;
      })
      .attr({
        x: COLLAPSE_BUTTON_SPACING,
        y: HIERARCHY_ELEMENT_HEIGHT,
        "clip-path": "url(#LabelClipPath)"
      }
    );

    nodeTypeLabel.append("title")
      .text(function (nodeTypeWrapper) {
        return nodeTypeWrapper.type;
      });

    var nodePathOccurrenceBar = nodeType.append("rect")
      .classed("pathOccurrences", true)
      .attr({
        x: BAR_START_X,
        y: 2,
        width: function (nodeTypeWrapper) {
          return scaleX(nodeTypeWrapper.pathIds.length);
        },
        height: HIERARCHY_ELEMENT_HEIGHT - 4,
        fill: "gray"
      });

    nodePathOccurrenceBar.append("title")
      .text(function (nodeTypeWrapper) {
        return nodeTypeWrapper.pathIds.length;
      });

    var nodeGroup = nodeType.append("g")
      .classed("nodeGroup", true);

    var allNodes = allNodeTypes.selectAll("g.nodeGroup").selectAll("g.nodeStats")
      .data(function (nodeTypeWrapper) {
        return nodeTypeWrapper.childElements;
      }, getKey);

    //allNodes.attr({
    //  display: hierarchyElements.displayFunction,
    //  transform: hierarchyElements.transformFunction
    //});

    var node = allNodes
      .enter()
      .append("g")
      .classed("nodeStats", true)
      .attr({
        display: hierarchyElements.displayFunction,
        transform: "translate(0," + Math.max($(this.parentSelector)[0].offsetHeight, that.getMinSize().height) + ")"
      })
      .on("dblclick", function (d) {
        pathSorting.sortingManager.addOrReplace(pathSorting.sortingStrategies.getNodePresenceStrategy([d.node.id]));
        listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
        //sortingManager.sort(that.pathWrappers, parent, "g.pathContainer", getPathContainerTransformFunction(that.pathWrappers));
      });;

    node.append("rect")
      .classed("filler", true)
      .attr({
        x: COLLAPSE_BUTTON_SPACING,
        y: 0,
        width: "100%",
        height: HIERARCHY_ELEMENT_HEIGHT
      });

    var l = selectionUtil.addDefaultListener(allNodeTypes.selectAll("g.nodeGroup"), "g.nodeStats", function (d) {
        return d.node.id;
      },
      "node"
    );
    that.selectionListeners.push(l);

    var nodeLabel = node.append("text")
      .text(function (nodeWrapper) {
        return nodeWrapper.node.properties["name"];
      })
      .attr({
        x: COLLAPSE_BUTTON_SPACING,
        y: HIERARCHY_ELEMENT_HEIGHT,
        "clip-path": "url(#LabelClipPath)"
      });

    nodeLabel.append("title")
      .text(function (nodeWrapper) {
        return nodeWrapper.node.properties["name"];
      });

    var nodePathOccurrenceBar = node.append("rect")
      .classed("pathOccurrences", true)
      .attr({
        x: BAR_START_X,
        y: 2,
        width: function (nodeWrapper) {
          return scaleX(nodeWrapper.pathIds.length);
        },
        height: HIERARCHY_ELEMENT_HEIGHT - 4,
        fill: "gray"
      });

    nodePathOccurrenceBar.append("title")
      .text(function (nodeWrapper) {
        return nodeWrapper.pathIds.length;
      });
  };

  PathStatsView.prototype.renderSetStats = function () {
    //d3.selectAll("g.setTypeGroup").data([this.setTypeWrappers]);

    var setTypeGroup = d3.selectAll("g.setTypeGroup")
      .attr({
        transform: hierarchyElements.transformFunction
      });
    var that = this;

    var allSetTypes = setTypeGroup.selectAll("g.setTypeStats")
      .data(this.setTypeWrappers.childElements, getKey);

    var scaleDomain = [0, Math.max(this.nodeTypeWrappers.childElements.length <= 0 ? 0 : (d3.max(this.nodeTypeWrappers.childElements, function (d) {
      return d.pathIds.length;
    })), this.setTypeWrappers.childElements.length <= 0 ? 0 : d3.max(this.setTypeWrappers.childElements, function (d) {
      return d.pathIds.length;
    }))];

    var scaleX = d3.scale.linear()
      .domain(scaleDomain)
      .range([0, MAX_BAR_WIDTH]);

    var setType = allSetTypes
      .enter()
      .append("g")
      .classed("setTypeStats", true)
      .attr({
        display: hierarchyElements.displayFunction,
        transform: "translate(0," + Math.max($(this.parentSelector)[0].offsetHeight, that.getMinSize().height) + ")"
      });

    setType.append("rect")
      .classed("filler", true)
      .attr({
        x: 0,
        y: 0,
        width: "100%",
        height: HIERARCHY_ELEMENT_HEIGHT
      });

    setType.append("text")
      .attr("class", "collapseIconSmall")
      .attr("x", 5)
      .attr("y", HIERARCHY_ELEMENT_HEIGHT)
      .text(function (setTypeWrapper) {
        return setTypeWrapper.collapsed ? "\uf0da" : "\uf0dd";
      })
      .on("click", function (setTypeWrapper) {
        setTypeWrapper.collapsed = !setTypeWrapper.collapsed;
        d3.select(this).text(setTypeWrapper.collapsed ? "\uf0da" : "\uf0dd");
        that.updateView();
      });

    var setTypeLabel = setType.append("text")
      .text(function (setTypeWrapper) {
        return setTypeWrapper.type;
      })
      .attr({
        x: COLLAPSE_BUTTON_SPACING,
        y: HIERARCHY_ELEMENT_HEIGHT,
        "clip-path": "url(#LabelClipPath)"
      }
    );

    setTypeLabel.append("title")
      .text(function (nodeTypeWrapper) {
        return nodeTypeWrapper.type;
      });

    var setPathOccurrenceBar = setType.append("rect")
      .classed("pathOccurrences", true)
      .attr({
        x: BAR_START_X,
        y: 2,
        width: function (setTypeWrapper) {
          return scaleX(setTypeWrapper.pathIds.length);
        },
        height: HIERARCHY_ELEMENT_HEIGHT - 4,
        fill: "gray"
      });

    setPathOccurrenceBar.append("title")
      .text(function (setTypeWrapper) {
        return setTypeWrapper.pathIds.length;
      });

    var setGroup = setType.append("g")
      .classed("setGroup", true);

    var allSets = allSetTypes.selectAll("g.setGroup").selectAll("g.setStats")
      .data(function (setTypeWrapper) {
        return setTypeWrapper.childElements;
      }, getKey);

    //allNodes.attr({
    //  display: hierarchyElements.displayFunction,
    //  transform: hierarchyElements.transformFunction
    //});

    var set = allSets
      .enter()
      .append("g")
      .classed("setStats", true)
      .attr({
        display: hierarchyElements.displayFunction,
        transform: "translate(0," + Math.max($(this.parentSelector)[0].offsetHeight, that.getMinSize().height) + ")"
      })
      .on("dblclick", function (d) {
        pathSorting.sortingManager.addOrReplace(pathSorting.sortingStrategies.getSetPresenceStrategy([d.setId]));
        listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
        //sortingManager.sort(that.pathWrappers, parent, "g.pathContainer", getPathContainerTransformFunction(that.pathWrappers));
      });;

    set.append("rect")
      .classed("filler", true)
      .attr({
        x: COLLAPSE_BUTTON_SPACING,
        y: 0,
        width: "100%",
        height: HIERARCHY_ELEMENT_HEIGHT
      });

    var l = selectionUtil.addDefaultListener(allSetTypes.selectAll("g.setGroup"), "g.setStats", function (d) {
        return d.setId;
      },
      "set"
    );
    that.selectionListeners.push(l);

    var setLabel = set.append("text")
      .text(function (setWrapper) {
        return setWrapper.setId;
      })
      .attr({
        x: COLLAPSE_BUTTON_SPACING,
        y: HIERARCHY_ELEMENT_HEIGHT,
        "clip-path": "url(#LabelClipPath)"
      });

    setLabel.append("title")
      .text(function (setWrapper) {
        return setWrapper.setId;
      });

    var setPathOccurrenceBar = set.append("rect")
      .classed("pathOccurrences", true)
      .attr({
        x: BAR_START_X,
        y: 2,
        width: function (setWrapper) {
          return scaleX(setWrapper.pathIds.length);
        },
        height: HIERARCHY_ELEMENT_HEIGHT - 4,
        fill: "gray"
      });

    setPathOccurrenceBar.append("title")
      .text(function (setWrapper) {
        return setWrapper.pathIds.length;
      });
  };

  return new PathStatsView();
})
;
