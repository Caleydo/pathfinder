define(['d3', '../../hierarchyelements', '../../datastore', '../../listeners', './settings', '../../config', '../../uiutil'],
  function (d3, hierarchyElements, dataStore, listeners, s, config, uiUtil) {

    var BOX_WIDTH = 10;
    var DATA_AXIS_WIDTH = 16;
    var DATA_GROUP_V_PADDING = 4;
    var DATA_AXIS_SIZE = 60;


    function DatasetWrapper(dataset) {
      hierarchyElements.HierarchyElement.call(this);
      var that = this;
      this.collapsed = true;
      this.dataset = dataset;
      this.name = dataset.info.name;
      this.id = dataset.info.id;
      //this.color = dataset.info.color;
      this.type = dataset.info.type;
      if (this.type === "matrix") {
        this.minValue = dataset.stats.min;
        this.maxValue = dataset.stats.max;

        this.getRenderer = function () {
          return currentDatasetGroupRenderer;
        };
        //Object.keys(dataset.groups).forEach(function (group) {
        //    var g = new DataGroupWrapper(group, that);
        //    that.children.push(g);
        //});

      } else if (dataset.info.type === "table") {
        this.getRenderer = function () {
          return currentNumericalDataRenderer;
        };
        //    dataset.info.columns.forEach(function (col) {
        //        if (col.value.type === "real") {
        //            var c = new DataGroupWrapper(col, that);
        //            that.children.push(c);
        //        }
        //    });
      }


    }

    DatasetWrapper.prototype = Object.create(hierarchyElements.HierarchyElement.prototype);

    DatasetWrapper.prototype.getBaseHeight = function () {
      return s.isTiltAttributes() ? DATA_AXIS_SIZE + 2 * DATA_GROUP_V_PADDING : BOX_WIDTH + 2 * DATA_GROUP_V_PADDING;
    };

    DatasetWrapper.prototype.getHeight = function () {
      var h = hierarchyElements.HierarchyElement.prototype.getHeight.call(this);
      return (this.dataset.info.type === "matrix" && !s.isTiltAttributes() && !this.collapsed) ? h + DATA_AXIS_WIDTH : h;
    };

    DatasetWrapper.prototype.renderEnter = function (parent, pathWrapper, pathList) {
      var that = this;
      parent.append("text")
        .classed("collapseIconSmall", true)
        .attr({
          x: 5,
          y: (that.getBaseHeight() - 10) / 2 + 9
        });
      var datasetLabel = parent.append("text")
        .classed("datasetLabel", true)
        .attr({
          x: s.SET_TYPE_INDENT,
          y: (that.getBaseHeight() - 10) / 2 + 9,
          "clip-path": "url(#SetLabelClipPath)"
        })
        .style({
          fill: config.getDatasetColorFromDatasetId(this.id)
        })
        .text(function (d) {
          return d.name;
        });

      datasetLabel.append("title")
        .text(function (d) {
          return d.name;
        });

      this.getRenderer().onDatasetEnter(parent, pathWrapper, this, pathList);
    };

    DatasetWrapper.prototype.renderUpdate = function (parent, pathWrapper, pathList) {
      var that = this;

      parent.select("text.datasetLabel")
        .style({
          fill: config.getDatasetColorFromDatasetId(this.id)
        });

      parent.select("text.collapseIconSmall")
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

            pathList.updatePathList();

          }
        });


      this.getRenderer().onDatasetUpdate(parent, pathWrapper, this, pathList);


      var allChildren = parent.selectAll("g.dataGroup")
        .data(that.getVisibleChildren(), function (d) {
          return d.name;
        });

      var child = allChildren.enter()
        .append("g")
        .classed("dataGroup", true);

      child.each(function (child) {
        child.renderEnter(d3.select(this), pathWrapper, that, pathList);
      });

      allChildren.attr({
        transform: function (d, i) {
          var posY = that.getBaseHeight();
          var groups = that.getVisibleChildren();

          for (var j = 0; j < i; j++) {
            var g = groups[j];
            posY += g.getHeight();
          }
          return ("translate(0, " + posY + ")");
        }
      });


      allChildren.each(function (child) {
        child.renderUpdate(d3.select(this), pathWrapper, that, pathList);
      });

      allChildren.exit().remove();
    };


    function DatasetSubsetWrapper(name, parent) {
      hierarchyElements.HierarchyElement.call(this, parent);
      this.name = name;
    }

    DatasetSubsetWrapper.prototype = Object.create(hierarchyElements.HierarchyElement.prototype);

    DatasetSubsetWrapper.prototype.isSticky = function () {
      return s.isDataGroupSticky(this.parent.id, this.name);
    };

    DatasetSubsetWrapper.prototype.renderEnter = function (parent, pathWrapper, dataset, pathList) {
      var that = this;

      //parent.append("rect")
      //    .attr({x: 0, y: 0, width: 500, height: that.getBaseHeight()});

      var groupLabel = parent.append("text")
        .classed("groupLabel", true)
        .attr({
          x: s.SET_TYPE_INDENT,
          y: that.getLabelPosY(),
          "clip-path": "url(#SetLabelClipPath)"
        })
        .style({
          fill: config.getDatasetColorFromDatasetId(dataset.id)
        })
        .text(that.name);

      groupLabel.append("title")
        .text(that.name);

      uiUtil.createTemporalMenuOverlayButton(parent, s.NODE_START, 4, true, function () {

        return [{
          text: "Pin/Unpin",
          icon: "\uf276",
          callback: function () {

            if (s.isDataGroupSticky(dataset.id, that.name)) {
              s.unstickDataGroup(dataset.id, that.name);
            } else {
              s.incStickyDataGroupOwners(dataset.id, that.name);
            }
            pathList.renderPaths();
          }
        }];
      });

      this.getRenderer().onDataGroupEnter(parent, pathWrapper, dataset, that, pathList);
    };

    DatasetSubsetWrapper.prototype.renderUpdate = function (parent, pathWrapper, dataset, pathList) {
      var that = this;

      var pinIcon = parent.select("text.pin");

      if (s.isDataGroupSticky(dataset.id, that.name)) {
        if (pinIcon.empty()) {
          parent.append("text")
            .classed("pin", true)
            .attr({
              x: s.SET_TYPE_INDENT / 2,
              y: that.getLabelPosY()
            })
            .text("\uf276");
        }
      } else {
        pinIcon.remove();
      }

      parent.select("text.groupLabel")
        .style({
          fill: config.getDatasetColorFromDatasetId(dataset.id)
        });

      this.getRenderer().onDataGroupUpdate(parent, pathWrapper, dataset, this, pathList);

      var data = [];

      pathWrapper.path.nodes.forEach(function (node, index) {
        var d = that.getDataForNode(dataset, node, index);

        if (typeof d !== "undefined") {
          d["node"] = node;
          d["nodeIndex"] = index;
          data.push(d);
        }
      });

      var allNodeData = parent.selectAll("g.nodeData")
        .data(data, function (d) {
          return d.node.id;
        });


      var nodeData = allNodeData.enter()
        .append("g")
        .classed("nodeData", true);

      nodeData.each(function (statData) {
        that.getRenderer().onNodeDataEnter(d3.select(this), pathWrapper, dataset, that, statData, pathList);
      });

      allNodeData.each(function (statData) {
        that.getRenderer().onNodeDataUpdate(d3.select(this), pathWrapper, dataset, that, statData, pathList);
      });

      allNodeData.exit().remove();
    };

    DatasetSubsetWrapper.prototype.getLabelPosY = function () {
      return (this.getBaseHeight() - 10) / 2 + 9;
    };


    function DataGroupWrapper(name, parent) {
      DatasetSubsetWrapper.call(this, name, parent);
    }

    DataGroupWrapper.prototype = Object.create(DatasetSubsetWrapper.prototype);

    DataGroupWrapper.prototype.getDataForNode = function (dataset, node, nodeIndex) {
      var stats = dataStore.getMatrixStatsForNode(node, dataset.id, this.name);
      if (typeof stats !== "undefined") {
        return {stats: stats};
      }
    };

    DataGroupWrapper.prototype.getRenderer = function () {
      return currentDatasetGroupRenderer;
    };

    DataGroupWrapper.prototype.getBaseHeight = function () {
      return s.isTiltAttributes() ? DATA_AXIS_SIZE + 2 * DATA_GROUP_V_PADDING : BOX_WIDTH + 2 * DATA_GROUP_V_PADDING;
    };


    function TableColumnWrapper(column, parent, pathWrapper) {
      DatasetSubsetWrapper.call(this, column.name, parent);
      var that = this;
      this.pathWrapper = pathWrapper;
      this.column = column;
    }

    TableColumnWrapper.prototype = Object.create(DatasetSubsetWrapper.prototype);


    TableColumnWrapper.prototype.getDataForNode = function (dataset, node, nodeIndex) {
      var data = dataStore.getTableAttributeForNode(node, dataset.id, this.name);
      //var stats = dataStore.getMatrixStatsForNode(node, dataset.id, that.name);
      if (typeof data !== "undefined") {
        return {data: data};
      }
    };

    TableColumnWrapper.prototype.getRenderer = function () {
      return currentNumericalDataRenderer;
    };

    TableColumnWrapper.prototype.getBaseHeight = function () {

      var that = this;
      var maxNumValues = 1;
      this.pathWrapper.path.nodes.forEach(function (node) {
        var data = dataStore.getTableAttributeForNode(node, that.parent.id, that.name);
        if (typeof data !== "undefined") {
          if (data instanceof Array && data.length > maxNumValues) {
            maxNumValues = data.length;
          }
        }
      });

      return s.isTiltAttributes() ? DATA_AXIS_SIZE + 2 * DATA_GROUP_V_PADDING : maxNumValues * s.DEFAULT_BAR_SIZE + 10 + DATA_AXIS_WIDTH;
    };

    TableColumnWrapper.prototype.getLabelPosY = function () {
      return 14;
    };

    function DataRenderer() {
    }

    DataRenderer.prototype = {
      onDatasetEnter: function ($dataset, pathWrapper, dataset, pathList) {

      },


      onDatasetUpdate: function ($dataset, pathWrapper, dataset, pathList) {

      },


      onDataGroupEnter: function ($group, pathWrapper, dataset, group, pathList) {

      },


      onDataGroupUpdate: function ($group, pathWrapper, dataset, group, pathList) {

      },


      onNodeDataEnter: function ($nodeData, pathWrapper, dataset, group, statData, pathList) {

      },


      onNodeDataUpdate: function ($nodeData, pathWrapper, dataset, group, statData, pathList) {

      }
    };


    function HNumericalDataRenderer() {
      DataRenderer.call(this);
    }

    HNumericalDataRenderer.prototype = Object.create(DataRenderer.prototype);

    //HNumericalDataRenderer.prototype.onDataGroupEnter = function ($group, pathWrapper, dataset, group, pathList) {
    //    $group.insert("rect", ":first-child")
    //        .classed("background", true)
    //        .attr({
    //            x: s.SET_TYPE_INDENT,
    //            y: -10,
    //            width: pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + config.getNodeWidth(),
    //            height: s.isTiltAttributes() ? DATA_AXIS_SIZE : s.DEFAULT_BAR_SIZE + 20
    //        })
    //        .style({
    //            //stroke: "black",
    //            fill: "white"
    //        });
    //};

    HNumericalDataRenderer.prototype.onNodeDataEnter = function ($nodeData, pathWrapper, dataset, group, nodeData, pathList) {
      $nodeData.attr({
        transform: "translate(" + (pathList.getNodePositionX(pathWrapper, nodeData.nodeIndex, false)) + ",5 )"
      });
      //var min = Math.min(0, group.column.value.range[0]);
      //var max = Math.max(0, group.column.value.range[1]);

      var min = group.column.value.range[0] < 0 ? -(Math.max(Math.abs(group.column.value.range[0]), Math.abs(group.column.value.range[1]))) : 0;
      var max = group.column.value.range[0] < 0 ? (Math.max(Math.abs(group.column.value.range[0]), Math.abs(group.column.value.range[1]))) : group.column.value.range[1];
      var scale = d3.scale.linear().domain([min, max]).range([0, config.getNodeWidth()]);
      ////FIXME cope with arrays
      //var value = nodeData.data instanceof Array ? nodeData.data[0] : nodeData.data;

      uiUtil.appendBars($nodeData, nodeData.data, scale, s.DEFAULT_BAR_SIZE, config.getDatasetColorFromDatasetId(dataset.id), group.name, true, true);


    };

    HNumericalDataRenderer.prototype.onNodeDataUpdate = function ($nodeData, pathWrapper, dataset, group, nodeData, pathList) {
      $nodeData.transition()
        .attr({
          transform: "translate(" + (pathList.getNodePositionX(pathWrapper, nodeData.nodeIndex, false)) + ",5 )"
        });

      var min = group.column.value.range[0] < 0 ? -(Math.max(Math.abs(group.column.value.range[0]), Math.abs(group.column.value.range[1]))) : 0;
      var max = group.column.value.range[0] < 0 ? (Math.max(Math.abs(group.column.value.range[0]), Math.abs(group.column.value.range[1]))) : group.column.value.range[1];
      var scale = d3.scale.linear().domain([min, max]).range([0, config.getNodeWidth()]);

      uiUtil.updateBars($nodeData, nodeData.data, scale, s.DEFAULT_BAR_SIZE, config.getDatasetColorFromDatasetId(dataset.id), group.name, true);
      //var min = Math.min(0, group.column.value.range[0]);
      //var max = Math.max(0, group.column.value.range[1]);

      //var min = group.column.value.range[0] < 0 ? -(Math.max(Math.abs(group.column.value.range[0]), Math.abs(group.column.value.range[1]))) : 0;
      //var max = group.column.value.range[0] < 0 ? (Math.max(Math.abs(group.column.value.range[0]), Math.abs(group.column.value.range[1]))) : group.column.value.range[1];
      //var scale = d3.scale.linear().domain([min, max]).range([0, config.getNodeWidth()]);
      ////FIXME cope with arrays
      //var value = nodeData.data instanceof Array ? nodeData.data[0] : nodeData.data;
      //
      //uiUtil.appendBars($nodeData, nodeData.data, scale, s.DEFAULT_BAR_SIZE, dataset.color, group.name, true, true);


    };


    function HDataRenderer() {
      //DataRenderer.call(this);
    }

//HDataRenderer.prototype = Object.create(DataRenderer.prototype);

    HDataRenderer.prototype.onDatasetEnter = function ($dataset, pathWrapper, dataset, pathList) {

      var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
      var scaleX = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([0, axisSize]);

      this.appendAxes($dataset, pathWrapper, dataset, pathList);

    };

    HDataRenderer.prototype.appendAxes = function ($dataset, pathWrapper, dataset, pathList) {
      var that = this;
      var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
      var scaleX = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([0, axisSize]);

      var xAxis = d3.svg.axis()
        .scale(scaleX)
        .orient("bottom")
        .tickValues([dataset.minValue, dataset.maxValue - (Math.abs(dataset.maxValue - dataset.minValue) / 2), dataset.maxValue])
        //.tickFormat(d3.format(".2f"))
        .tickSize(3, 3);

      var allAxes = $dataset.selectAll("g.boxPlotAxisX")
        .data(pathWrapper.path.nodes);

      allAxes.enter()
        .append("g")
        .classed("boxPlotAxisX", true)
        .attr({
          transform: function (d, i) {
            return "translate(" + (pathList.getNodePositionX(pathWrapper, i, true) - axisSize / 2) + "," + (dataset.getHeight() - DATA_AXIS_WIDTH) + ")";
          }
        })
        .call(xAxis);
    };

    HDataRenderer.prototype.onDatasetUpdate = function ($dataset, pathWrapper, dataset, pathList) {

      $dataset.selectAll("g.boxPlotAxisY").remove();

      var that = this;
      var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
      var scaleX = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([0, axisSize]);
      var allAxes = $dataset.selectAll("g.boxPlotAxisX")
        .data(pathWrapper.path.nodes);

      if (dataset.collapsed) {
        allAxes.remove();
      } else {
        this.appendAxes($dataset, pathWrapper, dataset, pathList);
        allAxes.transition()
          .attr({
            transform: function (d, i) {
              return "translate(" + (pathList.getNodePositionX(pathWrapper, i, true) - axisSize / 2) + "," + (dataset.getHeight() - DATA_AXIS_WIDTH) + ")"
            }
          });

        allAxes.exit().remove();
      }

      var statData = [];

      pathWrapper.path.nodes.forEach(function (node, index) {
        if (dataset.children.length > 0) {
          var stats = dataStore.getMatrixStatsForNode(node, dataset.id);
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
            transform: "translate(" + (pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true) - axisSize / 2) + "," + (DATA_GROUP_V_PADDING) + ")"
          });

          appendBoxPlotH($summaryData, statData.stats, scaleX, config.getDatasetColorFromDatasetId(dataset.id));
        });

      allSummaryPlots
        .each(function (statData) {
          var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
          var $summaryData = d3.select(this);
          $summaryData.transition()
            .attr({
              transform: "translate(" + (pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true) - axisSize / 2) + "," + (DATA_GROUP_V_PADDING) + ")"
            });

          updateBoxPlotH($summaryData, statData.stats, scaleX, config.getDatasetColorFromDatasetId(dataset.id));
        });

      allSummaryPlots.exit()
        .remove();

    };

    HDataRenderer.prototype.onDataGroupEnter = function ($group, pathWrapper, dataset, group, pathList) {
      $group.insert("rect", ":first-child")
        .classed("background", true)
        .attr({
          x: s.SET_TYPE_INDENT,
          y: DATA_GROUP_V_PADDING,
          width: pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + config.getNodeWidth() + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2),
          height: s.isTiltAttributes() ? DATA_AXIS_SIZE : BOX_WIDTH
        })
        .style({
          //stroke: "black",
          fill: "rgba(240,240,240,0.5)"
        });
    };

    HDataRenderer.prototype.onDataGroupUpdate = function ($group, pathWrapper, dataset, group, pathList) {
      $group.select("rect.background")
        .transition()
        .attr({
          width: pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + config.getNodeWidth() + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2),
          height: s.isTiltAttributes() ? DATA_AXIS_SIZE : BOX_WIDTH
        });

      $group.selectAll("g.boxPlotAxisY").remove();
    };

    HDataRenderer.prototype.onNodeDataEnter = function ($nodeData, pathWrapper, dataset, group, statData, pathList) {
      var that = this;

      var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;

      var scaleX = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([0, axisSize]);

      $nodeData.attr({
        transform: "translate(" + (pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true) - axisSize / 2) + "," + DATA_GROUP_V_PADDING + ")"
      });

      //var stats = dataStore.getMatrixStatsForNode(node, dataset.name, group.name);

      appendBoxPlotH($nodeData, statData.stats, scaleX, config.getDatasetColorFromDatasetId(dataset.id));
    };


    HDataRenderer.prototype.onNodeDataUpdate = function ($nodeData, pathWrapper, dataset, group, statData, pathList) {
      var that = this;

      var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
      var scaleX = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([0, axisSize]);

      $nodeData
        .transition()
        .attr({
          transform: "translate(" + (pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true) - axisSize / 2) + "," + DATA_GROUP_V_PADDING + ")"
        });

      updateBoxPlotH($nodeData, statData.stats, scaleX, config.getDatasetColorFromDatasetId(dataset.id));

      //var allPoints = $nodeData.selectAll("g.dataPoint")
      //  .data(dataStore.getMatrixDataForNode(node, dataset.name, group.name));
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


    function VDataRenderer() {
      //DataRenderer.call(this);
    }

//VDataRenderer.prototype = Object.create(DataRenderer.prototype);

    VDataRenderer.prototype.onDatasetEnter = function ($dataset, pathWrapper, dataset) {
      this.appendAxis($dataset, dataset);
    };

    VDataRenderer.prototype.onDatasetUpdate = function ($dataset, pathWrapper, dataset, pathList) {
      $dataset.selectAll("g.boxPlotAxisX").remove();
      var that = this;

      var scaleY = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([DATA_AXIS_SIZE, 0]);

      if ($dataset.select("g.boxPlotAxisY").empty()) {
        this.appendAxis($dataset, dataset);
      }

      var statData = [];

      pathWrapper.path.nodes.forEach(function (node, index) {
        if (dataset.children.length > 0) {
          var stats = dataStore.getMatrixStatsForNode(node, dataset.id);
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
            transform: "translate(" + (pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true)) + "," + DATA_GROUP_V_PADDING + ")"
          });

          appendBoxPlotV($summaryData, statData.stats, scaleY, config.getDatasetColorFromDatasetId(dataset.id));
        });

      allSummaryPlots
        .each(function (statData) {
          var axisSize = config.getNodeWidth() + s.EDGE_SIZE / 2;
          var $summaryData = d3.select(this);
          $summaryData.transition()
            .attr({
              transform: "translate(" + (pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true)) + "," + DATA_GROUP_V_PADDING + ")"
            });

          updateBoxPlotV($summaryData, statData.stats, scaleY, config.getDatasetColorFromDatasetId(dataset.id));
        });

      allSummaryPlots.exit()
        .remove();

    };

    VDataRenderer.prototype.appendAxis = function (parent, dataset) {

      var scaleY = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([DATA_AXIS_SIZE, 0]);
      var yAxis = d3.svg.axis()
        .scale(scaleY)
        .orient("left")
        .tickValues([dataset.minValue, dataset.maxValue - (Math.abs(dataset.maxValue - dataset.minValue) / 2), dataset.maxValue])
        .tickSize(3, 3);

      parent.append("g")
        .classed("boxPlotAxisY", true)
        .attr("transform", "translate(" + (s.NODE_START + DATA_AXIS_WIDTH) + "," + DATA_GROUP_V_PADDING + ")")
        .call(yAxis);
    };

    VDataRenderer.prototype.onDataGroupEnter = function ($group, pathWrapper, dataset) {
      $group.insert("rect", ":first-child")
        .classed("background", true)
        .attr({
          x: s.SET_TYPE_INDENT,
          y: DATA_GROUP_V_PADDING,
          width: pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + config.getNodeWidth() + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2),
          height: s.isTiltAttributes() ? DATA_AXIS_SIZE : BOX_WIDTH
        })
        .style({
          //stroke: "black",
          fill: "rgba(240,240,240,0.5)"
        });
      this.appendAxis($group, dataset);
    };

    VDataRenderer.prototype.onDataGroupUpdate = function ($group, pathWrapper, dataset, group, pathList) {

      $group.select("rect.background")
        .transition()
        .attr({
          width: pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + config.getNodeWidth() + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2),
          height: s.isTiltAttributes() ? DATA_AXIS_SIZE : BOX_WIDTH
        });

      if ($group.select("g.boxPlotAxisY").empty()) {
        this.appendAxis($group, dataset);
      }
    };


    VDataRenderer.prototype.onNodeDataEnter = function ($nodeData, pathWrapper, dataset, group, statData, pathList) {
      var that = this;

      var scaleY = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([DATA_AXIS_SIZE, 0]);

      $nodeData.attr({
        transform: "translate(" + (pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true)) + "," + DATA_GROUP_V_PADDING + ")"
      });
      appendBoxPlotV($nodeData, statData.stats, scaleY, config.getDatasetColorFromDatasetId(dataset.id));
    };

    VDataRenderer.prototype.onNodeDataUpdate = function ($nodeData, pathWrapper, dataset, group, statData, pathList) {
      var that = this;

      var scaleY = d3.scale.linear().domain([dataset.minValue, dataset.maxValue]).range([DATA_AXIS_SIZE, 0]);

      $nodeData.transition()
        .attr({
          transform: "translate(" + (pathList.getNodePositionX(pathWrapper, statData.nodeIndex, true)) + "," + DATA_GROUP_V_PADDING + ")"
        });


      updateBoxPlotV($nodeData, statData.stats, scaleY, config.getDatasetColorFromDatasetId(dataset.id));
    };

    function appendBoxPlotV(parent, stats, scaleY, color) {

      appendToolTip(parent, stats);

      parent.append("rect")
        .classed("box", true)
        .attr({
          x: -BOX_WIDTH / 2,
          y: scaleY(stats.quartile75),
          width: BOX_WIDTH,
          height: scaleY(stats.quartile25) - scaleY(stats.quartile75)
        })
        .style({
          fill: color ? color : "gray"
        });

      parent.append("line")
        .classed("median", true)
        .attr({
          x1: -BOX_WIDTH / 2,
          y1: scaleY(stats.median),
          x2: BOX_WIDTH / 2,
          y2: scaleY(stats.median)
        })
        .style({
          "shape-rendering": "crispEdges",
          stroke: "white"
        });

      parent.append("rect")
        .classed("boxFrame", true)
        .attr({
          x: -BOX_WIDTH / 2,
          y: scaleY(stats.quartile75),
          width: BOX_WIDTH,
          height: scaleY(stats.quartile25) - scaleY(stats.quartile75)
        })
        .style({
          "shape-rendering": "crispEdges",
          fill: "rgba(0,0,0,0)",
          stroke: "black"
        });

      appendWhiskerV(parent, stats.iqrMin, stats.quartile25, "lower", scaleY);
      appendWhiskerV(parent, stats.iqrMax, stats.quartile75, "upper", scaleY);

    }

    function updateBoxPlotV(parent, stats, scaleY, color) {


      parent.select("rect.box")
        .transition()
        .attr({
          x: -BOX_WIDTH / 2,
          y: scaleY(stats.quartile75),
          width: BOX_WIDTH,
          height: scaleY(stats.quartile25) - scaleY(stats.quartile75)
        })
        .style({
          fill: color ? color : "gray"
        });
      ;
      parent.select("rect.boxFrame")
        .transition()
        .attr({
          x: -BOX_WIDTH / 2,
          y: scaleY(stats.quartile75),
          width: BOX_WIDTH,
          height: scaleY(stats.quartile25) - scaleY(stats.quartile75)
        });

      parent.select("line.median")
        .transition()
        .attr({
          x1: -BOX_WIDTH / 2,
          y1: scaleY(stats.median),
          x2: BOX_WIDTH / 2,
          y2: scaleY(stats.median)
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
            "shape-rendering": "crispEdges",
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
            "shape-rendering": "crispEdges",
            stroke: "black"
          });
      }
    }

    function appendToolTip(parent, stats) {

      var formatter = d3.format(".4f");
      parent.append("title")
        .text("Elements: " + stats.numElements +
          "\nNaNs: " + stats.nans +
          "\nMedian: " + uiUtil.formatNumber(stats.median) +
          "\nMean: " + uiUtil.formatNumber(stats.mean) +
          "\nStandard Deviation: " + uiUtil.formatNumber(stats.std) +
          "\n1st Quartile: " + uiUtil.formatNumber(stats.quartile25) +
          "\n3rd Quartile: " + uiUtil.formatNumber(stats.quartile75) +
          "\nLowest value in 1.5xIQR range: " + uiUtil.formatNumber(stats.iqrMin) +
          "\nHighest value in 1.5xIQR range: " + uiUtil.formatNumber(stats.iqrMax) +
          "\nMin: " + uiUtil.formatNumber(stats.min) +
          "\nMax: " + uiUtil.formatNumber(stats.max)
        );
    }

    function appendBoxPlotH(parent, stats, scaleX, color) {

      //var stats = dataStore.getMatrixStatsForNode(d, dataset.name, group.name);

      appendToolTip(parent, stats);

      parent.append("rect")
        .classed("box", true)
        .attr({

          x: scaleX(stats.quartile25),
          y: 0,
          width: scaleX(stats.quartile75) - scaleX(stats.quartile25),
          height: BOX_WIDTH

        })
        .style({
          fill: color ? color : "gray"
        });

      parent.append("line")
        .classed("median", true)
        .attr({
          x1: scaleX(stats.median),
          y1: 0,
          x2: scaleX(stats.median),
          y2: BOX_WIDTH
        })
        .style({
          "shape-rendering": "crispEdges",
          stroke: "white"
        });

      parent.append("rect")
        .classed("boxFrame", true)
        .attr({

          x: scaleX(stats.quartile25),
          y: 0,
          width: scaleX(stats.quartile75) - scaleX(stats.quartile25),
          height: BOX_WIDTH

        })
        .style({
          fill: "rgba(0,0,0,0)",
          "shape-rendering": "crispEdges",
          stroke: "black"
        });

      appendWhiskerH(parent, stats.iqrMin, stats.quartile25, "lower", scaleX);
      appendWhiskerH(parent, stats.iqrMax, stats.quartile75, "upper", scaleX);

    }

    function updateBoxPlotH(parent, stats, scaleX, color) {
      parent.select("rect.box")
        .transition()
        .attr({
          x: scaleX(stats.quartile25),
          y: 0,
          width: scaleX(stats.quartile75) - scaleX(stats.quartile25),
          height: BOX_WIDTH
        })
        .style({
          fill: color ? color : "gray"
        });
      ;

      parent.select("rect.boxFrame")
        .transition()
        .attr({
          x: scaleX(stats.quartile25),
          y: 0,
          width: scaleX(stats.quartile75) - scaleX(stats.quartile25),
          height: BOX_WIDTH
        });

      parent.select("line.median")
        .transition()
        .attr({
          x1: scaleX(stats.median),
          y1: 0,
          x2: scaleX(stats.median),
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
            "shape-rendering": "crispEdges",
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
            "shape-rendering": "crispEdges",
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

    var hDatasetGroupRenderer = new HDataRenderer();
    var vDatasetGroupRenderer = new VDataRenderer();
    var currentDatasetGroupRenderer = hDatasetGroupRenderer;
    var hNumericalDataRenderer = new HNumericalDataRenderer();
    var currentNumericalDataRenderer = hNumericalDataRenderer;

    function DatasetRenderer(pathList) {
      this.pathList = pathList;
    }


    DatasetRenderer.prototype = {

      render: function () {
        if (s.isTiltAttributes()) {
          currentDatasetGroupRenderer = vDatasetGroupRenderer;
        } else {
          currentDatasetGroupRenderer = hDatasetGroupRenderer;
        }

        var that = this;
        var allDatasetGroups = that.pathList.parent.selectAll("g.pathContainer g.datasetGroup")
          .data(that.pathList.pathWrappers, function (d) {
            return d.path.id;
          });


        allDatasetGroups.each(function (pathWrapper) {

            var p = d3.select(this).attr({
              transform: "translate(0," + (s.PATH_HEIGHT + pathWrapper.getSetHeight() + pathWrapper.getPropertyHeight()) + ")"
            });

            var allDatasets = p.selectAll("g.dataset")
              .data(pathWrapper.datasets);

            var dataset = allDatasets.enter()
              .append("g")
              .classed("dataset", true);
            //
            dataset.each(function (dataset) {
              dataset.renderEnter(d3.select(this), pathWrapper, that.pathList)
            });

            allDatasets.attr({
              transform: function (d, i) {
                var posY = 0;
                var datasetWrappers = pathWrapper.datasets;

                for (var j = 0; j < i; j++) {
                  var datasetWrapper = datasetWrappers[j];
                  if (datasetWrapper.canBeShown()) {
                    posY += datasetWrapper.getHeight();
                  }
                }
                return ("translate(0, " + posY + ")");
              }
            });

            allDatasets.each(function (dataset) {
              dataset.renderUpdate(d3.select(this), pathWrapper, that.pathList);
            });

            allDatasets.exit().remove();

          }
        );
      }
    };

    return {
      DatasetWrapper: DatasetWrapper,
      DataGroupWrapper: DataGroupWrapper,
      TableColumnWrapper: TableColumnWrapper,
      DatasetRenderer: DatasetRenderer
    };

  }
)
;
