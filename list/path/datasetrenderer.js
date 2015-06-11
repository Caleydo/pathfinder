define(['d3', '../../hierarchyelements', '../../datastore', '../../listeners', './settings', '../../config'], function (d3, hierarchyElements, dataStore, listeners, s, config) {

  var BOX_WIDTH = 10;
  var DATA_AXIS_WIDTH = 16;
  var DATA_GROUP_V_PADDING = 4;
  var DATA_AXIS_SIZE = 60;


  function DatasetWrapper(id, name, minValue, maxValue) {
    hierarchyElements.HierarchyElement.call(this);
    this.collapsed = true;
    this.name = name;
    this.id = id;
    this.minValue = minValue;
    this.maxValue = maxValue;
  }

  DatasetWrapper.prototype = Object.create(hierarchyElements.HierarchyElement.prototype);

  DatasetWrapper.prototype.getBaseHeight = function () {
    return s.isTiltAttributes() ? DATA_AXIS_SIZE + 2 * DATA_GROUP_V_PADDING : BOX_WIDTH + 2 * DATA_GROUP_V_PADDING;
  };

  DatasetWrapper.prototype.getHeight = function () {
    var h = hierarchyElements.HierarchyElement.prototype.getHeight.call(this);
    return (!s.isTiltAttributes() && !this.collapsed) ? h + DATA_AXIS_WIDTH : h;
  };

  function DataGroupWrapper(name, parent) {
    hierarchyElements.HierarchyElement.call(this, parent);
    this.name = name;
  }

  DataGroupWrapper.prototype = Object.create(hierarchyElements.HierarchyElement.prototype);

  DataGroupWrapper.prototype.getBaseHeight = function () {
    return s.isTiltAttributes() ? DATA_AXIS_SIZE + 2 * DATA_GROUP_V_PADDING : BOX_WIDTH + 2 * DATA_GROUP_V_PADDING;
  };


  function DataRenderer(pathList) {
    this.pathList = pathList;
  }

  DataRenderer.prototype = {

    render: function () {
      var that = this;
      var allDatasetGroups = that.pathList.parent.selectAll("g.pathContainer g.datasetGroup")
        .data(that.pathList.pathWrappers, function (d) {
          return d.path.id;
        });

      allDatasetGroups.attr({
        transform: function (d) {
          return "translate(0," + (s.PATH_HEIGHT + d.getSetHeight()) + ")";
        }
      });

      allDatasetGroups.each(function (pathWrapper) {

          var allDatasets = d3.select(this).selectAll("g.dataset")
            .data(pathWrapper.datasets);

          var dataset = allDatasets.enter()
            .append("g")
            .classed("dataset", true);

          dataset.each(function (dataset, datasetIndex) {
            var $dataset = d3.select(this);
            $dataset.append("text")
              .attr("class", "collapseIconSmall");
            var datasetLabel = $dataset.append("text")
              .attr({
                x: s.SET_TYPE_INDENT,
                y: 14,
                "clip-path": "url(#SetLabelClipPath)"
              })
              .text(function (d) {
                return d.name;
              });

            datasetLabel.append("title")
              .text(function (d) {
                return d.name;
              });

            that.onDatasetEnter($dataset, pathWrapper, dataset, datasetIndex);
          });

          allDatasets.each(function (dataset, datasetIndex) {

            var $dataset = d3.select(this);

            $dataset.select("text.collapseIconSmall")
              .attr("x", 5)
              .attr("y", s.SET_TYPE_HEIGHT)
              .text(function (d) {
                return d.collapsed ? "\uf0da" : "\uf0dd";
              })
              .on("click", function (d) {
                var collapsed = !d.collapsed;
                if (d3.event.ctrlKey) {
                  listeners.notify(s.pathListUpdateTypes.COLLAPSE_ELEMENT_TYPE, {
                    type: d.name,
                    collapsed: collapsed
                  });
                } else {
                  d.collapsed = collapsed;
                  d3.select(this).text(d.collapsed ? "\uf0da" : "\uf0dd");

                  that.pathList.updatePathList();

                }
              });

            $dataset.attr({
              transform: function (d) {
                var posY = 0;
                var datasetWrappers = pathWrapper.datasets;

                for (var j = 0; j < datasetIndex; j++) {
                  var datasetWrapper = datasetWrappers[j];
                  if (datasetWrapper.canBeShown()) {
                    posY += datasetWrapper.getHeight();
                  }
                }
                return ("translate(0, " + posY + ")");
              }
            });


            that.onDatasetUpdate($dataset, pathWrapper, dataset, datasetIndex);

            if (dataset.collapsed) {
              $dataset.selectAll("g.dataGroup").remove();
              return;
            }

            var allGroups = $dataset.selectAll("g.dataGroup")
              .data(dataset.children);

            var group = allGroups.enter()
              .append("g")
              .classed("dataGroup", true);

            group.each(function (group, groupIndex) {

              var $group = d3.select(this);

              $group.append("rect")
                .classed("background", true)
                .attr({
                  x: s.SET_TYPE_INDENT,
                  y: DATA_GROUP_V_PADDING,
                  width: that.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2),
                  height: s.isTiltAttributes() ? DATA_AXIS_SIZE : BOX_WIDTH
                })
                .style({
                  //stroke: "black",
                  fill: "rgba(240,240,240,0.5)"
                });

              var groupLabel = $group.append("text")
                .attr({
                  x: s.SET_TYPE_INDENT,
                  y: 14,
                  "clip-path": "url(#SetLabelClipPath)"
                })
                .text(function (d) {
                  return d.name;
                });

              groupLabel.append("title")
                .text(function (d) {
                  return d.name;
                });

              that.onDataGroupEnter($group, pathWrapper, dataset, group, groupIndex);
            });


            allGroups.each(function (group, groupIndex) {

              var $group = d3.select(this);

              $group.attr({
                transform: function (d) {
                  var posY = dataset.getBaseHeight();
                  var groups = dataset.children;

                  for (var j = 0; j < groupIndex; j++) {
                    var g = groups[j];
                    if (g.canBeShown()) {
                      posY += g.getHeight();
                    }
                  }
                  return ("translate(0, " + posY + ")");
                }
              });

              d3.select(this).select("rect.background")
                .transition()
                .attr({
                  width: that.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2),
                  height: s.isTiltAttributes() ? DATA_AXIS_SIZE : BOX_WIDTH
                });


              that.onDataGroupUpdate($group, pathWrapper, dataset, group, groupIndex);

              var statData = [];

              pathWrapper.path.nodes.forEach(function (node, index) {
                var stats = dataStore.getStatsForNode(node, dataset.id, group.name);
                if (typeof stats !== "undefined") {
                  statData.push({
                    stats: stats,
                    node: node,
                    nodeIndex: index
                  });
                }
              });

              var allNodeData = d3.select(this).selectAll("g.nodeData")
                .data(statData, function (d) {
                  return d.node.id;
                });


              var nodeData = allNodeData.enter()
                .append("g")
                .classed("nodeData", true);

              nodeData.each(function (statData) {
                that.onNodeDataEnter(d3.select(this), pathWrapper, dataset, group, statData);
              });

              allNodeData.each(function (statData) {
                that.onNodeDataUpdate(d3.select(this), pathWrapper, dataset, group, statData);
              });

              allNodeData.exit().remove();

            });

            allGroups.exit().remove();

          });

          allDatasets.exit().remove();

        }
      )
      ;
    },

    onDatasetEnter: function ($dataset, pathWrapper, dataset, datasetIndex) {

    }
    ,

    onDatasetUpdate: function ($dataset, pathWrapper, dataset, datasetIndex) {

    }
    ,

    onDataGroupEnter: function ($group, pathWrapper, dataset, group, groupIndex) {

    }
    ,

    onDataGroupUpdate: function ($group, pathWrapper, dataset, group, groupIndex) {

    }
    ,

    onNodeDataEnter: function ($nodeData, pathWrapper, dataset, group, statData) {

    }
    ,

    onNodeDataUpdate: function ($nodeData, pathWrapper, dataset, group, statData) {

    }

  }
  ;

  function HDataRenderer(pathList) {
    DataRenderer.call(this, pathList);
  }

  HDataRenderer.prototype = Object.create(DataRenderer.prototype);

//VDataRenderer.prototype.onDataGroupEnter = function ($group, pathWrapper, dataset, group, groupIndex) {
//  var that = this;
//  var scaleY = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([DATA_AXIS_SIZE, 0]);
//  var yAxis = d3.svg.axis()
//    .scale(scaleY)
//    .orient("left")
//    .ticks(3);
//
//  $group.append("g")
//    .classed("boxPlotAxis", true)
//    .attr("transform", "translate(" + s.NODE_START + "," + DATA_GROUP_V_PADDING + ")")
//    .call(yAxis);
//};

  HDataRenderer.prototype.onDatasetEnter = function ($dataset, pathWrapper, dataset, datasetIndex) {
    var that = this;

    var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
    var scaleX = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([0, axisSize]);

    this.appendAxes($dataset, pathWrapper, dataset);

    //var allSummaryPlots = $dataset.selectAll("g.nodeSummaryData")
    //  .data(pathWrapper.path.nodes);
    //
    //allSummaryPlots.enter()
    //  .append("g")
    //  .classed("nodeSummaryData", true)
    //  .each(function (node, nodeIndex) {
    //    var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
    //    var $summaryData = d3.select(this);
    //    $summaryData.attr({
    //      transform: "translate(" + (that.pathList.getNodePositionX(pathWrapper, nodeIndex, true) - axisSize / 2) + "," + (DATA_GROUP_V_PADDING) + ")"
    //    });
    //
    //    //FIXME: Temporary adding data of first group
    //    var stats = dataStore.getStatsForNode(node, dataset.name, dataset.children[0].name);
    //
    //    appendBoxPlotH($summaryData, stats, scaleX);
    //  });


  };

  HDataRenderer.prototype.appendAxes = function ($dataset, pathWrapper, dataset) {
    var that = this;
    var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
    var scaleX = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([0, axisSize]);
    var xAxis = d3.svg.axis()
      .scale(scaleX)
      .orient("bottom")
      .ticks(3)
      .tickSize(3, 3);

    var allAxes = $dataset.selectAll("g.boxPlotAxisX")
      .data(pathWrapper.path.nodes);

    allAxes.enter()
      .append("g")
      .classed("boxPlotAxisX", true)
      .attr({
        transform: function (d, i) {
          return "translate(" + (that.pathList.getNodePositionX(pathWrapper, i, true) - axisSize / 2) + "," + (dataset.getHeight() - DATA_AXIS_WIDTH) + ")";
        }
      })
      .call(xAxis);
  };

  HDataRenderer.prototype.onDatasetUpdate = function ($dataset, pathWrapper, dataset, datasetIndex) {

    $dataset.selectAll("g.boxPlotAxisY").remove();

    var that = this;
    var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
    var scaleX = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([0, axisSize]);
    var allAxes = $dataset.selectAll("g.boxPlotAxisX")
      .data(pathWrapper.path.nodes);

    if (dataset.collapsed) {
      allAxes.remove();
    } else {
      this.appendAxes($dataset, pathWrapper, dataset);
      allAxes.transition()
        .attr({
          transform: function (d, i) {
            return "translate(" + (that.pathList.getNodePositionX(pathWrapper, i, true) - axisSize / 2) + "," + (dataset.getHeight() - DATA_AXIS_WIDTH) + ")"
          }
        });

      allAxes.exit().remove();
    }

    var statData = [];

    pathWrapper.path.nodes.forEach(function (node, index) {
      //FIXME: Temporary adding data of first group
      if(dataset.children.length > 0) {
        var stats = dataStore.getStatsForNode(node, dataset.id, dataset.children[0].name);
        if (typeof stats !== "undefined") {
          statData.push({
            stats: stats,
            node: node,
            nodeIndex: index
          });
        }
      }
    });


    var allSummaryPlots = $dataset.selectAll("g.nodeSummaryData")
      .data(statData, function (d) {
        return d.node.id;
      });

    allSummaryPlots.enter()
      .append("g")
      .classed("nodeSummaryData", true)
      .each(function (statData) {
        var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
        var $summaryData = d3.select(this);
        $summaryData.attr({
          transform: "translate(" + (that.pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true) - axisSize / 2) + "," + (DATA_GROUP_V_PADDING) + ")"
        });

        appendBoxPlotH($summaryData, statData.stats, scaleX);
      });

    allSummaryPlots
      .each(function (statData) {
        var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
        var $summaryData = d3.select(this);
        $summaryData.transition()
          .attr({
            transform: "translate(" + (that.pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true) - axisSize / 2) + "," + (DATA_GROUP_V_PADDING) + ")"
          });

        updateBoxPlotH($summaryData, statData.stats, scaleX);
      });

    allSummaryPlots.exit()
      .remove();

    //var allSummaryPlots = $dataset.selectAll("g.nodeSummaryData")
    //  .data(pathWrapper.path.nodes);


  };

  HDataRenderer.prototype.onDataGroupUpdate = function ($group, pathWrapper, dataset, group, groupIndex) {
    $group.selectAll("g.boxPlotAxisY").remove();
  };

  HDataRenderer.prototype.onNodeDataEnter = function ($nodeData, pathWrapper, dataset, group, statData) {
    var that = this;

    var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;

    var scaleX = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([0, axisSize]);

    $nodeData.attr({
      transform: "translate(" + (that.pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true) - axisSize / 2) + "," + DATA_GROUP_V_PADDING + ")"
    });

    //var stats = dataStore.getStatsForNode(node, dataset.name, group.name);

    appendBoxPlotH($nodeData, statData.stats, scaleX);
  };


  HDataRenderer.prototype.onNodeDataUpdate = function ($nodeData, pathWrapper, dataset, group, statData) {
    var that = this;

    var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
    var scaleX = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([0, axisSize]);

    $nodeData
      .transition()
      .attr({
        transform: "translate(" + (that.pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true) - axisSize / 2) + "," + DATA_GROUP_V_PADDING + ")"
      });

    updateBoxPlotH($nodeData, statData.stats, scaleX);

    //var allPoints = $nodeData.selectAll("g.dataPoint")
    //  .data(dataStore.getDataForNode(node, dataset.name, group.name));
    //
    //var point = allPoints.enter()
    //  .append("g")
    //  .classed("dataPoint", true);
    //
    //point.append("circle")
    //  .attr({
    //
    //    cy: BOX_WIDTH / 2,
    //
    //    cx: function (d) {
    //      return scaleX(d);
    //    },
    //    r: 1
    //
    //  })
    //  .style({
    //    opacity: 2,
    //    fill: "red"
    //  });
    //
    //allPoints.selectAll("circle")
    //  .transition()
    //  .attr({
    //    cy: BOX_WIDTH / 2,
    //
    //    cx: function (d) {
    //      return scaleX(d);
    //    }
    //  });
    //
    //allPoints.exit().remove();

  };


  function VDataRenderer(pathList) {
    DataRenderer.call(this, pathList);
  }

  VDataRenderer.prototype = Object.create(DataRenderer.prototype);

  VDataRenderer.prototype.onDatasetEnter = function ($dataset, pathWrapper, dataset, datasetIndex) {
    //var that = this;

    //var scaleY = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([DATA_AXIS_SIZE, 0]);
    this.appendAxis($dataset, dataset);

    //var allSummaryPlots = $dataset.selectAll("g.nodeSummaryData")
    //  .data(pathWrapper.path.nodes);

    //allSummaryPlots.enter()
    //  .append("g")
    //  .classed("nodeSummaryData", true)
    //  .each(function (node, nodeIndex) {
    //    var $summaryData = d3.select(this);
    //    $summaryData.attr({
    //      transform: "translate(" + (that.pathList.getNodePositionX(pathWrapper, nodeIndex, true)) + "," + DATA_GROUP_V_PADDING + ")"
    //    });
    //
    //    //FIXME: Temporary adding data of first group
    //    var stats = dataStore.getStatsForNode(node, dataset.name, dataset.children[0].name);
    //
    //    appendBoxPlotV($summaryData, stats, scaleY);
    //  });


  };

  VDataRenderer.prototype.onDatasetUpdate = function ($dataset, pathWrapper, dataset, datasetIndex) {
    $dataset.selectAll("g.boxPlotAxisX").remove();
    var that = this;

    var scaleY = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([DATA_AXIS_SIZE, 0]);

    if ($dataset.select("g.boxPlotAxisY").empty()) {
      this.appendAxis($dataset, dataset);
    }

    var statData = [];

    pathWrapper.path.nodes.forEach(function (node, index) {
      //FIXME: Temporary adding data of first group
      if(dataset.children.length > 0) {
        var stats = dataStore.getStatsForNode(node, dataset.id, dataset.children[0].name);
        if (typeof stats !== "undefined") {
          statData.push({
            stats: stats,
            node: node,
            nodeIndex: index
          });
        }
      }
    });


    var allSummaryPlots = $dataset.selectAll("g.nodeSummaryData")
      .data(statData, function (d) {
        return d.node.id;
      });

    allSummaryPlots.enter()
      .append("g")
      .classed("nodeSummaryData", true)
      .each(function (statData) {
        var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
        var $summaryData = d3.select(this);
        $summaryData.attr({
          transform: "translate(" + (that.pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true) - axisSize / 2) + "," + (DATA_GROUP_V_PADDING) + ")"
        });

        appendBoxPlotV($summaryData, statData.stats, scaleY);
      });

    allSummaryPlots
      .each(function (statData) {
        var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
        var $summaryData = d3.select(this);
        $summaryData.transition()
          .attr({
            transform: "translate(" + (that.pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true) - axisSize / 2) + "," + (DATA_GROUP_V_PADDING) + ")"
          });

        updateBoxPlotV($summaryData, statData.stats, scaleY);
      });

    allSummaryPlots.exit()
      .remove();

    //var allSummaryPlots = $dataset.selectAll("g.nodeSummaryData")
    //  .data(pathWrapper.path.nodes);
    //
    //allSummaryPlots
    //  .each(function (node, nodeIndex) {
    //    var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
    //    var $summaryData = d3.select(this);
    //    $summaryData.transition()
    //      .attr({
    //        transform: "translate(" + (that.pathList.getNodePositionX(pathWrapper, nodeIndex, true)) + "," + DATA_GROUP_V_PADDING + ")"
    //      });
    //
    //    //FIXME: Temporary adding data of first group
    //    var stats = dataStore.getStatsForNode(node, dataset.name, dataset.children[0].name);
    //
    //    updateBoxPlotV($summaryData, stats, scaleY);
    //  });
    //
    //allSummaryPlots.exit()
    //  .remove();
  };

  VDataRenderer.prototype.appendAxis = function (parent, dataset) {

    var scaleY = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([DATA_AXIS_SIZE, 0]);
    var yAxis = d3.svg.axis()
      .scale(scaleY)
      .orient("left")
      .ticks(3)
      .tickSize(3, 3);

    parent.append("g")
      .classed("boxPlotAxisY", true)
      .attr("transform", "translate(" + (s.NODE_START + DATA_AXIS_WIDTH) + "," + DATA_GROUP_V_PADDING + ")")
      .call(yAxis);
  };

  VDataRenderer.prototype.onDataGroupEnter = function ($group, pathWrapper, dataset, group, groupIndex) {

    this.appendAxis($group, dataset);
  };

  VDataRenderer.prototype.onDataGroupUpdate = function ($group, pathWrapper, dataset, group, groupIndex) {

    if ($group.select("g.boxPlotAxisY").empty()) {
      this.appendAxis($group, dataset);
    }
  };


  VDataRenderer.prototype.onNodeDataEnter = function ($nodeData, pathWrapper, dataset, group, statData) {
    var that = this;

    var scaleY = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([DATA_AXIS_SIZE, 0]);

    $nodeData.attr({
      transform: "translate(" + (that.pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true)) + "," + DATA_GROUP_V_PADDING + ")"
    });
    appendBoxPlotV($nodeData, statData.stats, scaleY);

    //$nodeData.append("title")
    //  .text(function (d) {
    //    var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
    //    return "Elements: " + stats.numElements +
    //      "\nNaNs: " + stats.nans +
    //      "\nMedian: " + stats.median +
    //      "\n1st Quartile: " + stats.quartile25 +
    //      "\n3rd Quartile: " + stats.quartile75 +
    //      "\nLowest value in 1.5xIQR range: " + stats.iqrMin +
    //      "\nHighest value in 1.5xIQR range: " + stats.iqrMax +
    //      "\nMin: " + stats.min +
    //      "\nMax: " + stats.max;
    //  });
    //
    //$nodeData.append("rect")
    //  .classed("box", true)
    //  .attr({
    //    x: function (d) {
    //      return -BOX_WIDTH / 2;
    //    },
    //    y: function (d) {
    //      var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
    //      return scaleY(stats.quartile75);
    //    },
    //    width: BOX_WIDTH,
    //    height: function (d) {
    //      var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
    //      return scaleY(stats.quartile25) - scaleY(stats.quartile75);
    //    }
    //  })
    //  .style({
    //    fill: "gray",
    //    stroke: "black"
    //  });
    //
    //$nodeData.append("line")
    //  .classed("median", true)
    //  .attr({
    //    x1: function (d) {
    //      return -BOX_WIDTH / 2;
    //    },
    //    y1: function (d) {
    //      var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
    //      return scaleY(stats.median);
    //    },
    //    x2: function (d) {
    //      return BOX_WIDTH / 2;
    //    },
    //    y2: function (d) {
    //      var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
    //      return scaleY(stats.median);
    //    }
    //  })
    //  .style({
    //    stroke: "white"
    //  });
    //
    //var stats = dataStore.getStatsForNode(node, dataset.name, group.name);
    //
    //appendWhiskerV($nodeData, stats.iqrMin, stats.quartile25, "lower", scaleY, pathWrapper, nodeIndex, that.pathList);
    //appendWhiskerV($nodeData, stats.iqrMax, stats.quartile75, "upper", scaleY, pathWrapper, nodeIndex, that.pathList);
  };

  VDataRenderer.prototype.onNodeDataUpdate = function ($nodeData, pathWrapper, dataset, group, statData) {
    var that = this;

    var scaleY = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([DATA_AXIS_SIZE, 0]);

    $nodeData.transition()
      .attr({
        transform: "translate(" + (that.pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true)) + "," + DATA_GROUP_V_PADDING + ")"
      });


    updateBoxPlotV($nodeData, statData.stats, scaleY);

    //$nodeData.select("rect.box")
    //  .transition()
    //  .attr({
    //    x: function (d) {
    //      return -BOX_WIDTH / 2;
    //    },
    //    y: function (d) {
    //      var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
    //
    //      return scaleY(stats.quartile75);
    //      //return scaleY(stats.quartile25);
    //    },
    //    width: BOX_WIDTH,
    //    height: function (d) {
    //      var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
    //      return scaleY(stats.quartile25) - scaleY(stats.quartile75);
    //    }
    //  });
    //
    //$nodeData.select("line.median")
    //  .transition()
    //  .attr({
    //    x1: function (d) {
    //      return -BOX_WIDTH / 2;
    //    },
    //    y1: function (d) {
    //      var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
    //      return scaleY(stats.median);
    //    },
    //    x2: function (d) {
    //      return BOX_WIDTH / 2;
    //    },
    //    y2: function (d) {
    //      var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
    //      return scaleY(stats.median);
    //    }
    //  });
    //
    //var stats = dataStore.getStatsForNode(node, dataset.name, group.name);
    //
    //updateWhiskerV($nodeData, "lower", scaleY, stats.iqrMin, stats.quartile25);
    //updateWhiskerV($nodeData, "upper", scaleY, stats.iqrMax, stats.quartile75);

    //var allPoints = $nodeData.selectAll("g.dataPoint")
    //  .data(dataStore.getDataForNode(node, dataset.name, group.name));
    //
    //var point = allPoints.enter()
    //  .append("g")
    //  .classed("dataPoint", true);
    //
    //point.append("circle")
    //  .attr({
    //
    //    cx: 0,
    //
    //    cy: function (d) {
    //      return scaleY(d);
    //    },
    //    r: 1
    //
    //  })
    //  .style({
    //    opacity: 2,
    //    fill: "red"
    //  });
    //
    //allPoints.selectAll("circle")
    //  .transition()
    //  .attr({
    //    cx: 0,
    //
    //    cy: function (d) {
    //      return scaleY(d);
    //    }
    //  });
    //
    //allPoints.exit().remove();

  };

  function appendBoxPlotV(parent, stats, scaleY) {

    parent.append("title")
      .text(function (d) {
        return "Elements: " + stats.numElements +
          "\nNaNs: " + stats.nans +
          "\nMedian: " + stats.median +
          "\n1st Quartile: " + stats.quartile25 +
          "\n3rd Quartile: " + stats.quartile75 +
          "\nLowest value in 1.5xIQR range: " + stats.iqrMin +
          "\nHighest value in 1.5xIQR range: " + stats.iqrMax +
          "\nMin: " + stats.min +
          "\nMax: " + stats.max;
      });

    parent.append("rect")
      .classed("box", true)
      .attr({
        x: function (d) {
          return -BOX_WIDTH / 2;
        },
        y: function (d) {
          return scaleY(stats.quartile75);
        },
        width: BOX_WIDTH,
        height: function (d) {
          return scaleY(stats.quartile25) - scaleY(stats.quartile75);
        }
      })
      .style({
        fill: "gray",
        stroke: "black"
      });

    parent.append("line")
      .classed("median", true)
      .attr({
        x1: function (d) {
          return -BOX_WIDTH / 2;
        },
        y1: function (d) {
          return scaleY(stats.median);
        },
        x2: function (d) {
          return BOX_WIDTH / 2;
        },
        y2: function (d) {
          return scaleY(stats.median);
        }
      })
      .style({
        stroke: "white"
      });

    appendWhiskerV(parent, stats.iqrMin, stats.quartile25, "lower", scaleY);
    appendWhiskerV(parent, stats.iqrMax, stats.quartile75, "upper", scaleY);

  }

  function updateBoxPlotV(parent, stats, scaleY) {


    parent.select("rect.box")
      .transition()
      .attr({
        x: function (d) {
          return -BOX_WIDTH / 2;
        },
        y: function (d) {
          return scaleY(stats.quartile75);
          //return scaleY(stats.quartile25);
        },
        width: BOX_WIDTH,
        height: function (d) {
          return scaleY(stats.quartile25) - scaleY(stats.quartile75);
        }
      });

    parent.select("line.median")
      .transition()
      .attr({
        x1: function (d) {
          return -BOX_WIDTH / 2;
        },
        y1: function (d) {
          return scaleY(stats.median);
        },
        x2: function (d) {
          return BOX_WIDTH / 2;
        },
        y2: function (d) {
          return scaleY(stats.median);
        }
      });

    updateWhiskerV(parent, "lower", scaleY, stats.iqrMin, stats.quartile25);
    updateWhiskerV(parent, "upper", scaleY, stats.iqrMax, stats.quartile75);
  }


  function appendWhiskerV(parent, iqr, quartile, classNamePrefix, scaleY) {
    if (!isNaN(iqr)) {

      parent.append("line")
        .classed(classNamePrefix + "Whisker", true)
        .attr({
          x1: -BOX_WIDTH / 4,
          y1: scaleY(iqr),
          x2: BOX_WIDTH / 4,
          y2: scaleY(iqr)
        })
        .style({
          stroke: "black"
        });

      parent.append("line")
        .classed(classNamePrefix + "WhiskerConnector", true)
        .attr({
          x1: 0,
          y1: scaleY(iqr),
          x2: 0,
          y2: scaleY(quartile)
        })
        .style({
          stroke: "black"
        });
    }
  }

  function appendBoxPlotH(parent, stats, scaleX) {

    //var stats = dataStore.getStatsForNode(d, dataset.name, group.name);

    parent.append("title")
      .text(function (d) {
        return "Elements: " + stats.numElements +
          "\nNaNs: " + stats.nans +
          "\nMedian: " + stats.median +
          "\n1st Quartile: " + stats.quartile25 +
          "\n3rd Quartile: " + stats.quartile75 +
          "\nLowest value in 1.5xIQR range: " + stats.iqrMin +
          "\nHighest value in 1.5xIQR range: " + stats.iqrMax +
          "\nMin: " + stats.min +
          "\nMax: " + stats.max;
      });

    parent.append("rect")
      .classed("box", true)
      .attr({

        x: function (d) {
          //var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
          var res = scaleX(stats.quartile25);
          return res;
        },
        y: 0,
        width: function (d) {
          //var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
          return scaleX(stats.quartile75) - scaleX(stats.quartile25);
        },
        height: BOX_WIDTH

      })
      .style({
        fill: "gray",
        stroke: "black"
      });

    parent.append("line")
      .classed("median", true)
      .attr({
        x1: function (d) {
          //var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
          return scaleX(stats.median);
        },
        y1: 0,
        x2: function (d) {
          //var stats = dataStore.getStatsForNode(d, dataset.name, group.name);
          return scaleX(stats.median);
        },
        y2: BOX_WIDTH
      })
      .style({
        stroke: "white"
      });

    appendWhiskerH(parent, stats.iqrMin, stats.quartile25, "lower", scaleX);
    appendWhiskerH(parent, stats.iqrMax, stats.quartile75, "upper", scaleX);

  }

  function updateBoxPlotH(parent, stats, scaleX) {
    parent.select("rect.box")
      .transition()
      .attr({
        x: function (d) {
          return scaleX(stats.quartile25);
        },
        y: 0,
        width: function (d) {
          return scaleX(stats.quartile75) - scaleX(stats.quartile25);
        },
        height: BOX_WIDTH
      });

    parent.select("line.median")
      .transition()
      .attr({
        x1: function (d) {
          return scaleX(stats.median);
        },
        y1: 0,
        x2: function (d) {
          return scaleX(stats.median);
        },
        y2: BOX_WIDTH
      });

    updateWhiskerH(parent, "lower", scaleX, stats.iqrMin, stats.quartile25);
    updateWhiskerH(parent, "upper", scaleX, stats.iqrMax, stats.quartile75);
  }


  function updateWhiskerV(parent, classPrefix, scaleY, iqr, quartile) {
    parent.select("line." + classPrefix + "Whisker")
      .transition()
      .attr({
        x1: -BOX_WIDTH / 4,
        y1: scaleY(iqr),
        x2: BOX_WIDTH / 4,
        y2: scaleY(iqr)
      });
    parent.select("line." + classPrefix + "WhiskerConnector")
      .transition()
      .attr({
        x1: 0,
        y1: scaleY(iqr),
        x2: 0,
        y2: scaleY(quartile)
      });
  }

  function appendWhiskerH(parent, iqr, quartile, classNamePrefix, scaleX) {
    if (!isNaN(iqr)) {

      parent.append("line")
        .classed(classNamePrefix + "Whisker", true)
        .attr({
          x1: scaleX(iqr),
          y1: BOX_WIDTH / 4,
          x2: scaleX(iqr),
          y2: 3 * BOX_WIDTH / 4
        })
        .style({
          stroke: "black"
        });

      parent.append("line")
        .classed(classNamePrefix + "WhiskerConnector", true)
        .attr({
          x1: scaleX(iqr),
          y1: BOX_WIDTH / 2,
          x2: scaleX(quartile),
          y2: BOX_WIDTH / 2
        })
        .style({
          stroke: "black"
        });
    }
  }

  function updateWhiskerH(parent, classPrefix, scaleX, iqr, quartile) {
    parent.select("line." + classPrefix + "Whisker")
      .transition()
      .attr({
        x1: scaleX(iqr),
        y1: BOX_WIDTH / 4,
        x2: scaleX(iqr),
        y2: 3 * BOX_WIDTH / 4
      });
    parent.select("line." + classPrefix + "WhiskerConnector")
      .transition()
      .attr({
        x1: scaleX(iqr),
        y1: BOX_WIDTH / 2,
        x2: scaleX(quartile),
        y2: BOX_WIDTH / 2
      });
  }

  function DatasetRenderer(pathList) {
    this.vRenderer = new VDataRenderer(pathList);
    this.hRenderer = new HDataRenderer(pathList);
  }


  DatasetRenderer.prototype = {

    render: function () {
      if (s.isTiltAttributes()) {
        this.vRenderer.render();
      } else {
        this.hRenderer.render();
      }

    }
  };

  return {
    DatasetWrapper: DatasetWrapper,
    DataGroupWrapper: DataGroupWrapper,
    DatasetRenderer: DatasetRenderer
  };

})
;
