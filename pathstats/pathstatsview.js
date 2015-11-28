define(['jquery', 'd3', '../view', '../hierarchyelements', '../selectionutil', './statdata', '../pathutil', '../listeners',
    '../query/pathquery', '../sorting', '../setinfo', '../config', '../query/queryutil', '../uiutil', '../list/path/pathdata', '../datastore', '../settings/visibilitysettings'],
  function ($, d3, view, hierarchyElements, selectionUtil, statData, pathUtil, listeners, pathQuery, sorting, setInfo, config, queryUtil, uiUtil, pathData, dataStore, vs) {

    var HierarchyElement = hierarchyElements.HierarchyElement;
    var NodeTypeWrapper = statData.NodeTypeWrapper;
    var SetTypeWrapper = statData.SetTypeWrapper;
    var Level1HierarchyElement = statData.Level1HierarchyElement;

    var HIERARCHY_ELEMENT_HEIGHT = 12;
    var COLLAPSE_BUTTON_SPACING = 10;
    var BAR_START_X = 110;
    var MAX_BAR_WIDTH = 80;
    var MAX_LIST_HEIGHT = 200;

    function appendLabelClipPath(svg) {
      //  .classed("setTypeGroup", true);
      svg.append("clipPath")
        .attr("id", "LabelClipPath")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 90)
        .attr("height", 20);
    }

    function getKey(d) {
      return d.id;
    }

    function PathStatsView() {
      //view.call(this, "#pathstats");
      this.paths = [];
      this.nodeTypeDict = {};
      this.setTypeDict = {};
      this.dataRoot = new HierarchyElement();
      this.nodeTypeWrappers = new Level1HierarchyElement(this.dataRoot);
      this.setTypeWrappers = new Level1HierarchyElement(this.dataRoot);
      this.dataRoot.children.push(this.nodeTypeWrappers);
      this.dataRoot.children.push(this.setTypeWrappers);


      this.selectionListeners = [];
    }

    //PathStatsView.prototype = Object.create(view.prototype);


    PathStatsView.prototype.init = function () {
      //view.prototype.init.call(this);

      var that = this;

      pathData.addUpdateListener(function (changes) {
        if (changes.pathsChanged) {
          that.paths = pathData.getPaths(true);
          that.updateToAllPaths();
          //that.updateToFilteredPaths();
        }
      });

      //var svg = d3.select("#pathstats svg");
      //svg.append("g")
      //  .classed("nodeTypeGroup", true);
      //svg.append("g")


      //listeners.add(function (query) {
      //  if (pathQuery.isRemoveFilteredPaths() || pathQuery.isRemoteQuery()) {
      //    that.updateToFilteredPaths();
      //  } else {
      //    that.updateView();
      //  }
      //}, listeners.updateType.QUERY_UPDATE);

      listeners.add(updateSets, listeners.updateType.SET_INFO_UPDATE);

      //listeners.add(function (remove) {
      //  if (remove) {
      //    that.updateToFilteredPaths();
      //  } else {
      //    that.updateToAllPaths();
      //  }
      //}, listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE);


      listeners.add(function (showNonEdgeSets) {
        that.render();
      }, "UPDATE_SET_VISIBILITY");

      listeners.add(function () {
        that.updateView();
      }, config.COLOR_UPDATE);


      $(window).on('resize.updatev', function (e) {
        that.updateViewSize();
      });
    };

    PathStatsView.prototype.getTextWidth = function (string, fontStyle) {
      return uiUtil.getTextBBox(this.textSizeDomElement, string, fontStyle).width;
    };


    PathStatsView.prototype.updateToFilteredPaths = function () {
      var that = this;


      for (var i = 0; i < this.nodeTypeWrappers.children.length; i++) {
        var nodeTypeWrapper = this.nodeTypeWrappers.children[i];

        var nodesToRemove = [];

        nodeTypeWrapper.children.forEach(function (nodeWrapper) {
          if (nodeWrapper.isFiltered()) {
            nodesToRemove.push(nodeWrapper);
          }
        });
        if (nodesToRemove.length === nodeTypeWrapper.children.length) {
          this.nodeTypeWrappers.children.splice(i, 1);
          delete this.nodeTypeDict[nodeTypeWrapper.type];
          i--;
        } else {

          nodesToRemove.forEach(function (nodeWrapper) {
            nodeWrapper.parent.removeNode(nodeWrapper.node);
          });
        }
      }

      for (var i = 0; i < this.setTypeWrappers.children.length; i++) {
        var setTypeWrapper = this.setTypeWrappers.children[i];

        var setsToRemove = [];

        setTypeWrapper.children.forEach(function (setWrapper) {
          if (setWrapper.isFiltered()) {
            setsToRemove.push(setWrapper);
          }
        });

        if (setsToRemove.length === setTypeWrapper.children.length) {
          this.setTypeWrappers.children.splice(i, 1);
          delete this.setTypeDict[setTypeWrapper.type];
          i--;
        } else {

          setsToRemove.forEach(function (setWrapper) {
            setWrapper.parent.removeSet(setWrapper.setId);
          });
        }
      }

      selectionUtil.removeListeners(this.selectionListeners);
      this.selectionListeners = [];

      this.paths.forEach(function (path) {
        if (!pathQuery.isPathFiltered(path.id)) {
          that.addPathElements(path);
        } else {
          that.nodeTypeWrappers.children.forEach(function (nodeTypeWrapper) {
            nodeTypeWrapper.removePath(path);
          });
          that.setTypeWrappers.children.forEach(function (setTypeWrapper) {
            setTypeWrapper.removePath(path);
          });
        }
      });

      this.render();
    };

    PathStatsView.prototype.updateToAllPaths = function () {
      var that = this;

      that.reset();

      //that.nodeTypeWrappers.children = [];
      //that.setTypeWrappers.children = [];
      //selectionUtil.removeListeners(this.selectionListeners);
      //this.selectionListeners = [];

      this.paths.forEach(function (path) {
        that.addPathElements(path);
      });

      this.render();
    };

    //PathStatsView.prototype.setPaths = function (paths) {
    //  var that = this;
    //  paths.forEach(function (path) {
    //    that.addPath(path);
    //  });
    //};

    PathStatsView.prototype.addPathElements = function (path) {
      var that = this;
      path.nodes.forEach(function (node) {
        addNode(node, path, pathUtil.getNodeType(node));

        pathUtil.forEachNodeSet(node, function (setType, setId) {
          addNodeSet(setType, setId, path, node);
        });

      });

      path.edges.forEach(function (edge) {

        pathUtil.forEachEdgeSet(edge, function (setType, setId) {
          addEdgeSet(setType, setId, path, edge);
        });
      });

      function addNode(node, path, type) {
        var nodeType = that.nodeTypeDict[type];
        if (typeof nodeType === "undefined") {
          nodeType = new NodeTypeWrapper(that.nodeTypeWrappers, type);
          that.nodeTypeDict[type] = nodeType;
          that.nodeTypeWrappers.children.push(nodeType);
        }
        nodeType.addNode(node, path);
      }

      function addNodeSet(type, setId, path, node) {
        var setType = that.setTypeDict[type];
        if (typeof setType === "undefined") {
          setType = new SetTypeWrapper(that.setTypeWrappers, type);
          that.setTypeDict[type] = setType;
          that.setTypeWrappers.children.push(setType);
        }
        setType.addNode(setId, node, path);
      }

      function addEdgeSet(type, setId, path, edge) {
        var setType = that.setTypeDict[type];
        if (typeof setType === "undefined") {
          setType = new SetTypeWrapper(that.setTypeWrappers, type);
          that.setTypeDict[type] = setType;
          that.setTypeWrappers.children.push(setType);
        }
        setType.addEdge(setId, edge, path);
      }


    };

    //PathStatsView.prototype.addPath = function (path) {
    //  this.paths.push(path);
    //  this.addPathElements(path);
    //};


    PathStatsView.prototype.reset = function () {

      this.nodeTypeDict = {};
      this.setTypeDict = {};
      //this.dataRoot = new HierarchyElement();
      this.nodeTypeWrappers.children = [];
      this.setTypeWrappers.children = [];
      this.dataRoot.children = [];
      this.dataRoot.children.push(this.nodeTypeWrappers);
      this.dataRoot.children.push(this.setTypeWrappers);
      //this.dataRoot.children.push(this.nodeTypeWrappers);
      //this.dataRoot.children.push(this.setTypeWrappers);
      selectionUtil.removeListeners(this.selectionListeners);
      this.selectionListeners = [];
      //currentNodeTypeWrapperId = 0;
      //currentNodeWrapperId = 0;
      //var svg = d3.select("#pathstats svg");
      //svg.selectAll("g.nodeTypeGroup")
      //  .remove();
      //svg.selectAll("g.setTypeGroup")
      //  .remove();
      //svg.append("g")
      //  .classed("nodeTypeGroup", true);
      //svg.append("g")
      //  .classed("setTypeGroup", true);

    };

    PathStatsView.prototype.getBarScale = function () {
      var scaleDomain = [0, Math.max(this.nodeTypeWrappers.children.length <= 0 ? 0 : (d3.max(this.nodeTypeWrappers.children, function (d) {
        return d.getNumPaths();
      })), this.setTypeWrappers.children.length <= 0 ? 0 : d3.max(this.setTypeWrappers.children, function (d) {
        return d.getNumPaths();
      }))];

      return d3.scale.linear()
        .domain(scaleDomain)
        .range([0, MAX_BAR_WIDTH]);
    };


    function updateSets(setInfo) {

      var svg = d3.select("#pathstats");

      //Title needs to be appended every time as text() on a text element removes existing subelements with the text
      svg.selectAll("g.set_stat text")
        .text(function (stat) {
          return stat.getLabel();
        })
        .append("title")
        .text(function (stat) {
          return stat.getLabel();
        });

      //var titles = svg.selectAll("g.set_stat text title");
      //
      //titles
      //  .text(function (d) {
      //    return setInfo.getSetLabel(d.setId);
      //  });
    }

    PathStatsView.prototype.getMinSize = function () {
      var totalHeight = 0;
      this.nodeTypeWrappers.children.forEach(function (nodeTypeWrapper) {
        if (nodeTypeWrapper.canBeShown()) {
          totalHeight += nodeTypeWrapper.getHeight();
        }
      });

      this.setTypeWrappers.children.forEach(function (setTypeWrapper) {
        if (setTypeWrapper.canBeShown()) {
          totalHeight += setTypeWrapper.getHeight();
        }
      });


      return {width: BAR_START_X + MAX_BAR_WIDTH, height: this.dataRoot.getHeight()};
    };

    PathStatsView.prototype.render = function () {

      var that = this;

      function appendLevel1Text(parent, text, countText, countId) {
        parent.append("text")
          .text(text)
          .attr({
            x: 0,
            y: 18
          })
          .style({
            "font-size": 14,
            "font-weight": "bolder",
            "fill": "gray"
          });
        parent.append("text")
          .text(countText)
          .attr({
            id: countId,
            x: BAR_START_X - 10,
            y: 18
          })
          .style({
            "font-size": 12,
            "text-anchor": "end",
            "font-weight": "bolder",
            "fill": "gray"
          });
      }

      if (d3.select("#pathstats div.pathCounts").empty()) {
        var svg = d3.select("#pathstats").append("div").style({height:"22px"}).classed("pathCounts", true).append("svg")
          .attr({
            height: 22,
            width: 200
          });
        appendLevel1Text(svg, "Paths", pathQuery.getRemainingPathIds().length + "/" + dataStore.getPaths().length, "numPaths");

      }

      if (d3.select("#pathstats div.edgeCounts").empty()) {
        var svg = d3.select("#pathstats").append("div").style({height:"22px"}).classed("edgeCounts", true).append("svg")
          .attr({
            height: 22,
            width: 200
          });

        appendLevel1Text(svg, "Edges", pathQuery.getRemainingEdgeIds().length + "/" + Object.keys(dataStore.allEdgeIds).length, "numEdges");
      }

      var allLevel1HierarchyElements = d3.select("#pathstats").selectAll("div.level1HierarchyElement").data(this.dataRoot.children);

      allLevel1HierarchyElements.enter()
        .append("div")
        .classed("level1HierarchyElement", true)
        .each(function (d) {

          var svg = d3.select(this).append("svg")
            .attr({
              height: function (d) {
                return d.getBaseHeight() + 2;
              },
              width: 200
            });

          if (!that.textSizeDomElement) {
            that.textSizeDomElement = uiUtil.createFontSizeTextElement(svg);
          }

          if (d === that.nodeTypeWrappers) {

            d3.select(this).classed("nodeTypeGroup", true);

            appendLevel1Text(svg, "Nodes", pathQuery.getRemainingNodeIds().length + "/" + dataStore.getTotalNumNodes(), "numNodes");

            //svg.append("text")
            //  .text("Nodes")
            //  .attr({
            //    x: 0,
            //    y: d.getBaseHeight()
            //  })
            //  .style({
            //    "font-size": 14
            //  });
            //svg.append("text")
            //  .text(pathQuery.getRemainingNodeIds().length + "/" + dataStore.getTotalNumNodes())
            //  .attr({
            //    id: "numNodes",
            //    x: BAR_START_X - 10,
            //    y: d.getBaseHeight()
            //  })
            //  .style({
            //    "font-size": 12,
            //    "text-anchor": "end"
            //  });

          } else if (d === that.setTypeWrappers) {
            d3.select(this).classed("setTypeGroup", true);

            appendLevel1Text(svg, "Sets", (vs.isShowNonEdgeSets() ? pathQuery.getRemainingNodeSetIds().length : pathQuery.getRemainingEdgeSetIds().length) + "/" + dataStore.getTotalNumSets(), "numSets");
            //svg.append("text")
            //  .text("Sets")
            //  .attr({
            //    x: 0,
            //    y: d.getBaseHeight()
            //  })
            //  .style({
            //    "font-size": 14
            //  });
	    //
            //svg.append("text")
            //  .text((vs.isShowNonEdgeSets() ? pathQuery.getRemainingNodeSetIds().length : pathQuery.getRemainingEdgeSetIds().length) + "/" + dataStore.getTotalNumSets())
            //  .attr({
            //    id: "numSets",
            //    x: BAR_START_X - 10,
            //    y: d.getBaseHeight()
            //  })
            //  .style({
            //    "font-size": 12,
            //    "text-anchor": "end"
            //  });

          }

          appendAxis(svg, that.getBarScale(), d.getBaseHeight());
        });


      allLevel1HierarchyElements.each(function (d) {
        updateAxis(d3.select(this).select("svg"), that.getBarScale());
      });

      function appendAxis(parent, scaleX, posY) {
        parent
          .append("g")
          .classed("axis", true)
          .attr({
            transform: "translate(" + BAR_START_X + "," + posY + ")"
          })
          .call(axis(scaleX));
      }

      function updateAxis(parent, scaleX) {
        parent.select("g.axis")
          .call(axis(scaleX));
      }

      function axis(scaleX) {
        return d3.svg.axis()
          .scale(scaleX)
          .orient("top")
          .tickValues([scaleX.domain()[0], scaleX.domain()[1]])
          .tickFormat(d3.format(".0f"))
          .tickSize(3, 3);
      }


      selectionUtil
        .removeListeners(this.selectionListeners);
      this.selectionListeners = [];

      this.renderStats(d3.select("#pathstats div.nodeTypeGroup"), this.nodeTypeWrappers.children, function (d) {
        return d.node.id;
      }, "node");
      //this.renderStats();
      this.renderStats(d3.select("#pathstats div.setTypeGroup"), this.setTypeWrappers.children, function (d) {
        return d.setId;
      }, "set");

      //this.updateView();

    };

    PathStatsView.prototype.renderStats = function (parent, statTypes, statSelectionFunction, idType) {

      var that = this;

      var allStatTypes = parent.selectAll("div.statTypes")
        .data(statTypes, getKey);

      var scaleX = this.getBarScale();

      var statType = allStatTypes
        .enter()
        .append("div")
        .classed("statTypes", true)
        .attr({
          display: function (d) {
            return d.canBeShown() ? "block" : "none";
          }
          //transform: "translate(0," + Math.max($(this.parentSelector)[0].offsetHeight, that.getMinSize().height) + ")"
        });


      statType.each(function (statType, i) {

        var $statType = d3.select(this);

        var typeCont = $statType.append("svg")
          .classed("statTypeCont", true)
          .attr({
            width: 200,
            height: function (d) {
              return d.getBaseHeight();
            }
          });

        appendLabelClipPath(typeCont);

        if (statType.hasOverlayItems()) {
          uiUtil.createTemporalMenuOverlayButton(typeCont, BAR_START_X - 20, statType.getBaseHeight() - uiUtil.SMALL_BUTTON_SIZE - 2, true, function () {
            return statType.getOverlayMenuItems();
          });
        }

        typeCont.append("rect")
          .classed("filler", true)
          .attr({
            x: 0,
            y: 0,
            width: "100%",
            height: statType.getBaseHeight()

          });

        typeCont.append("text")
          .attr("class", "collapseIconSmall")
          .attr("x", 5)
          .attr("y", statType.getBaseHeight() - 2)
          .text(statType.collapsed ? "\uf0da" : "\uf0dd")
          .on("click", function (typeWrapper) {
            typeWrapper.collapsed = !typeWrapper.collapsed;
            d3.select(this).text(typeWrapper.collapsed ? "\uf0da" : "\uf0dd");
            that.updateView();
          });

        var typeLabelStyle = {"font-weight": "bolder"};

        var allTypeIds = idType === "node" ? Object.keys(dataStore.allNodeIds[statType.type]) : Object.keys(dataStore.allSetIds[statType.type]);

        var typeText = statType.getLabel() + " (" + statType.getVisibleChildren(true).length + "/" + allTypeIds.length + ")";
        var useSymbol = false;

        if (idType === "node") {
          var symbolType = config.getNodeTypeSymbol(statType.type);

          if (typeof symbolType !== "undefined") {
            useSymbol = true;
            var symbol = d3.svg.symbol().type(symbolType)
              .size(40);
            //var textWidth = that.getTextWidth(typeText, typeLabelStyle);

            typeCont.append("path")
              .classed("nodeTypeSymbol", true)
              .attr({
                d: symbol,
                transform: "translate(" + (COLLAPSE_BUTTON_SPACING + 4) + "," + (statType.getBaseHeight() / 2 + 2) + ")"
              });
          }
        }

        var typeLabel = typeCont.append("text")
          .classed("typeLabel", true)
          .text(typeText)
          .attr({
            x: COLLAPSE_BUTTON_SPACING + ((useSymbol) ? 10 : 0),
            y: statType.getBaseHeight() - 2,
            //"clip-path": "url(#LabelClipPath)"
          })
          .style(typeLabelStyle);

        typeLabel.append("title")
          .text(statType.getLabel());

        typeLabel.style("fill", statType.getColor());


        addPathOccurrenceBar(typeCont, function (d) {
          return d.getColor();
        });


        var statGroup = $statType.append("div")
          .classed("statGroup", true)
          .style({
            overflow: "auto",
            width: "100%",
            height: "100px",
            "vertical-align": "top"
          });

        var svg = statGroup.append("svg")
          .attr({
            width: 200,
            height: statType.getHeight() - statType.getBaseHeight()
          });

        appendLabelClipPath(svg);

      });

      allStatTypes.each(function (statType) {
        var allStats = d3.select(this).select("div.statGroup svg").selectAll("g.stats")
          .data(statType.getVisibleChildren(), getKey);


        var stats = allStats
          .enter()
          .append("g")
          .classed("stats", true)
          .classed(idType + "_stat", true)
          .attr({
            display: hierarchyElements.displayFunction,
            transform: function (stat) {
              var posY = (stat.getPosYRelativeToParent() - statType.getBaseHeight());

              return "translate(0," + posY + ")";
            }
          })
          .on("dblclick", function (d) {
            d.onDoubleClick();
          });

        stats.each(function (stat) {
          var $stat = d3.select(this);
          if (stat.hasOverlayItems()) {
            uiUtil.createTemporalMenuOverlayButton($stat, BAR_START_X - 20, 0, true, function () {
              return stat.getOverlayMenuItems();
            });
          }

          $stat.append("rect")
            .classed("filler", true)
            .attr({
              x: COLLAPSE_BUTTON_SPACING,
              y: 0,
              width: "100%",
              height: HIERARCHY_ELEMENT_HEIGHT
            });


          var statLabel = $stat.append("text")
            .classed("statLabel", true)
            .text(stat.getLabel())
            .attr({
              x: COLLAPSE_BUTTON_SPACING,
              y: HIERARCHY_ELEMENT_HEIGHT - 2,
              "clip-path": "url(#LabelClipPath)"
            });

          statLabel.style("fill", stat.getColor());


          statLabel.append("title")
            .text(function () {
              return stat.getLabel();
            });

          addPathOccurrenceBar($stat, function (d) {
            return d.getColor();
          });

        });

        allStats.exit()
          .remove();
      });


      this.updateView();


      allStatTypes.exit()
        .remove();

      var l = selectionUtil.addDefaultListener(allStatTypes.selectAll("div.statGroup svg"), "g.stats", statSelectionFunction, idType);
      that.selectionListeners.push(l);

      function addPathOccurrenceBar(parent, barColor) {
        var setPathOccurrenceBar = parent.append("rect")
          .classed("pathOccurrences", true)
          .attr({
            x: BAR_START_X,
            y: function (stat) {
              return stat.getBaseHeight() + 2 - HIERARCHY_ELEMENT_HEIGHT;
            },
            width: function (stat) {
              return scaleX(stat.getNumPaths());
            },
            height: HIERARCHY_ELEMENT_HEIGHT - 4,
            fill: barColor
          });

        setPathOccurrenceBar.append("title")
          .text(function (stat) {
            return stat.getTooltip();
          });
      }


    }
    ;

    PathStatsView.prototype.updateViewSize = function () {
      var totalViewHeight = $("#pathStatsView")[0].offsetHeight;

      var usedHeight = this.nodeTypeWrappers.getBaseHeight() + this.setTypeWrappers.getBaseHeight() + 300;
      var numStatTypes = 0;
      this.nodeTypeWrappers.children.forEach(function (statType) {
        if (statType.canBeShown()) {
          usedHeight += statType.getBaseHeight();
          numStatTypes++;
        }
      });
      this.setTypeWrappers.children.forEach(function (statType) {
        if (statType.canBeShown()) {
          usedHeight += statType.getBaseHeight();
          numStatTypes++;
        }
      });

      var maxStatHeight = Math.max((totalViewHeight - usedHeight - (15 * numStatTypes)) / numStatTypes, 50);


      var statTypeGroups = d3.selectAll("div.level1HierarchyElement").data(this.dataRoot.children);

      statTypeGroups.each(function (d) {
        var allStatTypes = d3.select(this).selectAll("div.statTypes")
          .data(d.children, getKey);

        allStatTypes.selectAll("div.statGroup")
          .data(d.children, getKey)
          .transition()
          .each("start", function (statType) {
            if (statType.collapsed) {
              d3.select(this)
                .attr({
                  display: "none"
                })
            }
          })
          .style({
            height: function (statType) {
              return statType.collapsed ? "0px" : (Math.min(statType.getHeight() - statType.getBaseHeight() + 5, maxStatHeight) + "px")
            }
          })
          .each("end", function (statType) {
            if (!statType.collapsed) {
              d3.select(this)
                .attr({
                  display: "block"
                })

            }
          });
      });

    };

    PathStatsView.prototype.updateView = function () {

      var scaleX = this.getBarScale();

      //d3.selectAll("g.nodeTypeGroup").data([this.nodeTypeWrappers]);
      var that = this;

      d3.select("#numPaths")
        .text(pathQuery.getRemainingPathIds().length + "/" + dataStore.getPaths().length);

      d3.select("#numEdges")
        .text(pathQuery.getRemainingEdgeIds().length + "/" + Object.keys(dataStore.allEdgeIds).length);

      d3.select("#numNodes")
        .text(pathQuery.getRemainingNodeIds().length + "/" + dataStore.getTotalNumNodes());

      d3.select("#numSets")
        .text((vs.isShowNonEdgeSets() ? pathQuery.getRemainingNodeSetIds().length : pathQuery.getRemainingEdgeSetIds().length) + "/" + dataStore.getTotalNumSets());

      var statTypeGroups = d3.selectAll("div.level1HierarchyElement");


      //.transition()
      //.attr({
      //  transform: hierarchyElements.transformFunction
      //});

      var comparator = sorting.chainComparators([function (a, b) {
        return d3.descending(a.getNumPaths(), b.getNumPaths());
      }, function (a, b) {
        return d3.descending(a.id, b.id);
      }]);

      statTypeGroups.each(function (d) {
        d.children.sort(comparator);
        var allStatTypes = d3.select(this).selectAll("div.statTypes")
          .data(d.children, getKey);

        allStatTypes
          .sort(comparator)
          .transition()
          .attr({
            display: function (d) {
              return d.canBeShown() ? "block" : "none";
            },
            transform: hierarchyElements.transformFunction
          });

        allStatTypes.each(function (statType) {

          var typeCont = d3.select(this).select("svg.statTypeCont");

          statType.children.sort(comparator);

          var allTypeIds = statType instanceof NodeTypeWrapper ? Object.keys(dataStore.allNodeIds[statType.type]) : Object.keys(dataStore.allSetIds[statType.type]);

          var typeText = statType.getLabel() + " (" + statType.getVisibleChildren(true).length + "/" + allTypeIds.length + ")";

          typeCont.select("text.typeLabel")
            .text(typeText)
            .style("fill", statType.getColor());

          typeCont.select("text.collapseIconSmall")
          .attr("class", "collapseIconSmall")
          .on("click", function () {
            statType.collapsed = !statType.collapsed;
            d3.select(this).text(statType.collapsed ? "\uf0da" : "\uf0dd");
            that.updateView();
          });

          typeCont.select("rect.pathOccurrences")
            .transition()
            .attr({
              width: scaleX(statType.getNumPaths()),
              fill: statType.getColor()
            });

          typeCont.select("rect.pathOccurrences title")
            .text(statType.getTooltip());

          typeCont.transition()
            .style("opacity", function (d) {
              return d.isFiltered() ? 0.5 : 1;
            });

          d3.select(this).select("div.statGroup svg").transition()
            .attr({
              height: statType.getHeight() - statType.getBaseHeight()
            });


          var stats = d3.select(this).select("div.statGroup svg").selectAll("g.stats")
            .data(statType.getVisibleChildren(), getKey);

          stats.each(function (stat) {
            var $stat = d3.select(this);

            $stat.select("text.statLabel")
              .style("fill", statType.getColor());

            $stat.select("rect.pathOccurrences")
              .transition()
              .attr({
                width: scaleX(stat.getNumPaths()),
                fill: stat.getColor()
              });

            $stat.select("rect.pathOccurrences title")
              .text(stat.getTooltip());

            $stat.transition()
              .attr({
                display: hierarchyElements.displayFunction,
                transform: function (stat) {
                  var posY = (stat.getPosYRelativeToParent() - statType.getBaseHeight());

                  return "translate(0," + posY + ")";
                }
              })
              .style("opacity", stat.isFiltered() ? 0.5 : 1);
          });


          //d3.select(this).selectAll("g.statTypeCont")
          //  .transition()
          //  .style("opacity", function (d) {
          //    return d.isFiltered() ? 0.5 : 1;
          //  });
          //
          //d3.select(this).selectAll("g.stats")
          //  .sort(comparator)
          //  .transition()
          //  .attr({
          //    display: hierarchyElements.displayFunction,
          //    transform: hierarchyElements.transformFunction
          //  })
          //  .style("opacity", function (d) {
          //    return d.isFiltered() ? 0.5 : 1;
          //  });
        });

        //  allStatTypes.selectAll("div.statGroup")
        //    .transition()
        //    .each("start", function (statType) {
        //      if (statType.collapsed) {
        //        d3.select(this)
        //          .attr({
        //            display: "none"
        //          })
        //      }
        //    })
        //    .style({
        //      height: function (statType) {
        //        return statType.collapsed ? "0px" : "100px"
        //      }
        //    })
        //    .each("end", function (statType) {
        //      if (!statType.collapsed) {
        //        d3.select(this)
        //          .attr({
        //            display: "block"
        //          })
        //          .style({
        //            height: "100px"
        //          });
        //        ;
        //      }
        //    });
        //
      });


      this.updateViewSize();
    };

    return new PathStatsView();
  })
;
