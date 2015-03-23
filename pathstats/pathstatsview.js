define(['jquery', 'd3', '../view', '../hierarchyelements', '../selectionutil', './statdata', '../pathutil', '../listeners'],
  function ($, d3, view, hierarchyElements, selectionUtil, statData, pathUtil, listeners) {

    var HierarchyElement = hierarchyElements.HierarchyElement;
    var NodeTypeWrapper = statData.NodeTypeWrapper;
    var SetTypeWrapper = statData.SetTypeWrapper;
    var Level1HierarchyElement = statData.Level1HierarchyElement;

    var HIERARCHY_ELEMENT_HEIGHT = 12;
    var COLLAPSE_BUTTON_SPACING = 10;
    var BAR_START_X = 110;
    var MAX_BAR_WIDTH = 80;

    function getKey(d) {
      return d.id;
    }

    function PathStatsView() {
      view.call(this, "#pathstats");
      this.paths = [];
      this.nodeTypeDict = {};
      this.setTypeDict = {};
      this.dataRoot = new HierarchyElement();
      this.nodeTypeWrappers = new Level1HierarchyElement(this.dataRoot);
      this.setTypeWrappers = new Level1HierarchyElement(this.dataRoot);
      this.dataRoot.childDomElements.push(this.nodeTypeWrappers);
      this.dataRoot.childDomElements.push(this.setTypeWrappers);


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

      var that = this;

      listeners.add(function(query) {
        that.updateView();
      }, listeners.updateType.QUERY_UPDATE);
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
        addNode(node, path, pathUtil.getNodeType(node));


        //var nodeSetTypes = pathUtil.getNodeSetTypes(node);
        //nodeSetTypes.forEach(function(setType) {
        //
        //});

        pathUtil.forEachNodeSet(node, function (setType, setId) {
          addNodeSet(setType, setId, path, node);
        });

        //for (var key in node.properties) {
        //  if (pathUtil.isNodeSetProperty(key)) {
        //    var property = node.properties[key];
        //    if (property instanceof Array) {
        //      property.forEach(function (setId) {
        //        addNodeSet(key, setId, path, node);
        //      });
        //    } else {
        //      addNodeSet(key, property, path, node);
        //    }
        //  }
        //}


      });

      function addNode(node, path, type) {
        var nodeType = that.nodeTypeDict[type];
        if (typeof nodeType === "undefined") {
          nodeType = new NodeTypeWrapper(that.nodeTypeWrappers, type);
          that.nodeTypeDict[type] = nodeType;
          that.nodeTypeWrappers.childDomElements.push(nodeType);
        }
        nodeType.addNode(node, path);
      }

      function addNodeSet(type, setId, path, node) {
        var setType = that.setTypeDict[type];
        if (typeof setType === "undefined") {
          setType = new SetTypeWrapper(that.setTypeWrappers, type);
          that.setTypeDict[type] = setType;
          that.setTypeWrappers.childDomElements.push(setType);
        }
        setType.addNode(setId, node, path);
      }

      function addEdgeSet(type, setId, path, edge) {
        var setType = that.setTypeDict[type];
        if (typeof setType === "undefined") {
          setType = new SetTypeWrapper(that.setTypeWrappers, type);
          that.setTypeDict[type] = setType;
          that.setTypeWrappers.childDomElements.push(setType);
        }
        setType.addEdge(setId, edge, path);
      }

      path.edges.forEach(function (edge) {

        pathUtil.forEachEdgeSet(edge, function (setType, setId) {
          addEdgeSet(setType, setId, path, edge);
        });

        //for (var key in edge.properties) {
        //
        //
        //
        //  //if (pathUtil.isEdgeSetProperty(key)) {
        //  //  var property = edge.properties[key];
        //  //  if (property instanceof Array) {
        //  //    property.forEach(function (setId) {
        //  //      addEdgeSet(key, setId, path, edge);
        //  //    });
        //  //  } else {
        //  //    addEdgeSet(key, property, path, edge);
        //  //  }
        //  //}
        //}
      });
    };

    PathStatsView.prototype.reset = function () {
      this.paths = [];
      this.nodeTypeDict = {};
      this.setTypeDict = {};
      this.dataRoot = new HierarchyElement();
      this.nodeTypeWrappers = new Level1HierarchyElement(this.dataRoot);
      this.setTypeWrappers = new Level1HierarchyElement(this.dataRoot);
      this.dataRoot.childDomElements.push(this.nodeTypeWrappers);
      this.dataRoot.childDomElements.push(this.setTypeWrappers);
      selectionUtil.removeListeners(this.selectionListeners);
      this.selectionListeners = [];
      //currentNodeTypeWrapperId = 0;
      //currentNodeWrapperId = 0;
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

    PathStatsView.prototype.getBarScale = function () {
      var scaleDomain = [0, Math.max(this.nodeTypeWrappers.childDomElements.length <= 0 ? 0 : (d3.max(this.nodeTypeWrappers.childDomElements, function (d) {
        return d.pathIds.length;
      })), this.setTypeWrappers.childDomElements.length <= 0 ? 0 : d3.max(this.setTypeWrappers.childDomElements, function (d) {
        return d.pathIds.length;
      }))];

      return d3.scale.linear()
        .domain(scaleDomain)
        .range([0, MAX_BAR_WIDTH]);
    };

    PathStatsView.prototype.updateView = function () {

      //d3.selectAll("g.nodeTypeGroup").data([this.nodeTypeWrappers]);
      var statTypeGroups = d3.selectAll("g.level1HierarchyElement")
        .attr({
          transform: hierarchyElements.transformFunction
        });

      var comparator = function (a, b) {
        return d3.descending(a.pathIds.length, b.pathIds.length);
      };

      statTypeGroups.each(function (d) {
        d.childDomElements.sort(comparator);
        var allStatTypes = d3.select(this).selectAll("g.statTypes")
          .data(d.childDomElements, getKey);

        allStatTypes
          .sort(comparator)
          .transition()
          .attr({
            display: hierarchyElements.displayFunction,
            transform: hierarchyElements.transformFunction
          });

        allStatTypes.each(function (typeWrapper) {

          typeWrapper.childDomElements.sort(comparator);

          d3.select(this).selectAll("g.stats")
            .data(typeWrapper.childDomElements, getKey);

          d3.select(this).selectAll("g.stats")
            .sort(comparator)
            .transition()
            .attr({
              display: hierarchyElements.displayFunction,
              transform: hierarchyElements.transformFunction
            })
            .style("opacity", function (d) {
              return d.isFiltered() ? 0.5 : 1;
            });
        });

        allStatTypes.selectAll("g.statGroup")
          .attr({
            display: function (typeWrapper) {
              return typeWrapper.collapsed ? "none" : "inline";
            }
          }
        );
      });

      var scaleX = this.getBarScale();

      var bars = d3.select("#pathstats svg").selectAll("rect.pathOccurrences")
        .transition()
        .attr("width", function (d) {
          return scaleX(d.pathIds.length)
        });
      bars.selectAll("title")
        .text(function (d) {
          return d.pathIds.length
        });

      this.updateViewSize();
    };

    PathStatsView.prototype.getMinSize = function () {
      var totalHeight = 0;
      this.nodeTypeWrappers.childDomElements.forEach(function (nodeTypeWrapper) {
        if (nodeTypeWrapper.canBeShown()) {
          totalHeight += nodeTypeWrapper.getHeight();
        }
      });

      this.setTypeWrappers.childDomElements.forEach(function (setTypeWrapper) {
        if (setTypeWrapper.canBeShown()) {
          totalHeight += setTypeWrapper.getHeight();
        }
      });


      return {width: BAR_START_X + MAX_BAR_WIDTH, height: this.dataRoot.getHeight()};
    };

    PathStatsView.prototype.render = function () {

      var that = this;

      var allLevel1HierarchyElements = d3.select("#pathstats svg").selectAll("g.level1HierarchyElement").data(this.dataRoot.childDomElements);

      allLevel1HierarchyElements.enter()
        .append("g")
        .classed("level1HierarchyElement", true)
        .each(function (d) {
          if (d === that.nodeTypeWrappers) {
            d3.select(this)
              .classed("nodeTypeGroup", true)
              .append("text")
              .text("Nodes")
              .attr({
                x: 0,
                y: d.getBaseHeight()
              });


          } else if (d === that.setTypeWrappers) {
            d3.select(this)
              .classed("setTypeGroup", true)
              .append("text")
              .text("Sets")
              .attr({
                x: 0,
                y: d.getBaseHeight()
              });
          }
        });
      this.renderStats("g.nodeTypeGroup", this.nodeTypeWrappers.childDomElements, function (d) {
        return d.node.id;
      }, "node");
      //this.renderStats();
      this.renderStats("g.setTypeGroup", this.setTypeWrappers.childDomElements, function (d) {
        return d.setId;
      }, "set");

      this.updateView();

    };

    PathStatsView.prototype.renderStats = function (rootSelector, statTypes, statSelectionFunction, idType) {

      var statTypeGroup = d3.selectAll(rootSelector)
        .attr({
          transform: hierarchyElements.transformFunction
        });
      var that = this;

      var allStatTypes = statTypeGroup.selectAll("g.statTypes")
        .data(statTypes, getKey);

      var scaleX = this.getBarScale();

      var statType = allStatTypes
        .enter()
        .append("g")
        .classed("statTypes", true)
        .attr({
          display: hierarchyElements.displayFunction,
          transform: "translate(0," + Math.max($(this.parentSelector)[0].offsetHeight, that.getMinSize().height) + ")"
        });

      statType.append("rect")
        .classed("filler", true)
        .attr({
          x: 0,
          y: 0,
          width: "100%",
          height: HIERARCHY_ELEMENT_HEIGHT
        });

      statType.append("text")
        .attr("class", "collapseIconSmall")
        .attr("x", 5)
        .attr("y", HIERARCHY_ELEMENT_HEIGHT)
        .text(function (typeWrapper) {
          return typeWrapper.collapsed ? "\uf0da" : "\uf0dd";
        })
        .on("click", function (typeWrapper) {
          typeWrapper.collapsed = !typeWrapper.collapsed;
          d3.select(this).text(typeWrapper.collapsed ? "\uf0da" : "\uf0dd");
          that.updateView();
        });

      var typeLabel = statType.append("text")
        .text(function (typeWrapper) {
          return typeWrapper.type;
        })
        .attr({
          x: COLLAPSE_BUTTON_SPACING,
          y: HIERARCHY_ELEMENT_HEIGHT,
          "clip-path": "url(#LabelClipPath)"
        }
      );

      typeLabel.append("title")
        .text(function (typeWrapper) {
          return typeWrapper.type;
        });

      addPathOccurrenceBar(statType);

      var statGroup = statType.append("g")
        .classed("statGroup", true);

      var allStats = allStatTypes.selectAll("g.statGroup").selectAll("g.stats")
        .data(function (typeWrapper) {
          return typeWrapper.childDomElements;
        }, getKey);

      var stats = allStats
        .enter()
        .append("g")
        .classed("stats", true)
        .attr({
          display: hierarchyElements.displayFunction,
          transform: "translate(0," + Math.max($(this.parentSelector)[0].offsetHeight, that.getMinSize().height) + ")"
        })
        .on("dblclick", function (d) {
          d.onDoubleClick();
        });

      stats.append("rect")
        .classed("filler", true)
        .attr({
          x: COLLAPSE_BUTTON_SPACING,
          y: 0,
          width: "100%",
          height: HIERARCHY_ELEMENT_HEIGHT
        });

      var l = selectionUtil.addDefaultListener(allStatTypes.selectAll("g.statGroup"), "g.stats", statSelectionFunction, idType
      );
      that.selectionListeners.push(l);

      var setLabel = stats.append("text")
        .text(function (stat) {
          return stat.getLabel();
        })
        .attr({
          x: COLLAPSE_BUTTON_SPACING,
          y: HIERARCHY_ELEMENT_HEIGHT,
          "clip-path": "url(#LabelClipPath)"
        });

      setLabel.append("title")
        .text(function (stat) {
          return stat.getLabel();
        });

      addPathOccurrenceBar(stats);

      function addPathOccurrenceBar(parent) {
        var setPathOccurrenceBar = parent.append("rect")
          .classed("pathOccurrences", true)
          .attr({
            x: BAR_START_X,
            y: 2,
            width: function (stat) {
              return scaleX(stat.pathIds.length);
            },
            height: HIERARCHY_ELEMENT_HEIGHT - 4,
            fill: "gray"
          });

        setPathOccurrenceBar.append("title")
          .text(function (stat) {
            return stat.pathIds.length;
          });
      }

    };

    return new PathStatsView();
  })
;
