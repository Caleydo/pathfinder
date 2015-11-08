/**
 * Created by Christian on 06.11.2015.
 */
define(["d3", "../../config", "../../pathutil", "../../query/pathquery", "../pathsorting", "../../sorting", "../../listeners",
    "../../hierarchyelements", "../../dataStore", "./settings", "../../settings/visibilitysettings", "./datasetrenderer"],
  function (d3, config, pathUtil, pathQuery, pathSorting, sorting, listeners, hierarchyElements, dataStore, s, vs, dr) {

    var currentSetTypeId = 0;
    var pageSize = 5;

    function SetRep(setId, type) {
      this.id = setId;
      this.nodeIndices = [];
      this.relIndices = [];
      this.setType = type;
    }

    SetRep.prototype = {
      getHeight: function () {
        return s.SET_HEIGHT;
      },

      //Defines whether this set can be shown. Only considers own data to determine that, not e.g. whether its set type is collapsed.
      canBeShown: function () {
        return vs.isShowNonEdgeSets() || (!vs.isShowNonEdgeSets() && this.relIndices.length > 0);
      }
    };

    function SetType(type) {
      this.id = currentSetTypeId++;
      this.type = type;
      this.sets = [];
      this.setDict = {};
      this.collapsed = true;
      this.nodeIndices = [];
      this.relIndices = [];
    }

    SetType.prototype = {
      getHeight: function () {
        var height = s.SET_TYPE_HEIGHT;
        if (!this.collapsed) {
          this.sets.forEach(function (setRep) {
            if (setRep.canBeShown()) {
              height += setRep.getHeight();
            }
          });
        }
        return height;
      },

      canBeShown: function () {
        return vs.isShowNonEdgeSets() || (!vs.isShowNonEdgeSets() && this.relIndices.length > 0);
      }
    };

    function NodeProperty(name) {
      hierarchyElements.HierarchyElement.call(this);
      this.name = name;
    }

    NodeProperty.prototype = Object.create(hierarchyElements.HierarchyElement.prototype);

    NodeProperty.prototype.getBaseHeight = function () {
      return s.SET_TYPE_HEIGHT;
    };


    function PathWrapper(path) {
      this.path = path;
      this.nodePositions = d3.range(0, path.nodes.length - 1);
      this.rank = "?.";
      this.datasets = [];
      this.addPathSets(path);
      this.addPathProperties(path);
      this.updateDatasets();
    }

    PathWrapper.prototype = {

      getHeight: function () {
        var height = s.PATH_HEIGHT;
        height += this.getSetHeight();
        height += this.getPropertyHeight();
        height += this.getDatasetHeight();
        return height;
      },

      getSetHeight: function () {
        var height = 0;
        this.setTypes.forEach(function (setType) {
          if (setType.canBeShown()) {
            height += setType.getHeight();
          }
        });
        return height;
      },

      getPropertyHeight: function () {
        var height = 0;
        this.properties.forEach(function (prop) {
          if (prop.canBeShown()) {
            height += prop.getHeight();
          }
        });
        return height;
      },

      getDatasetHeight: function () {
        var height = 0;
        this.datasets.forEach(function (dataset) {
          if (dataset.canBeShown()) {
            height += dataset.getHeight();
          }
        });
        return height;
      },

      getWidth: function () {
        return s.NODE_START + this.path.nodes.length * s.NODE_WIDTH + this.path.edges.length * s.EDGE_SIZE;
      },

      updateDatasets: function () {
        var datasets = dataStore.getDataSets();
        var that = this;


        datasets.forEach(function (dataset) {
            var d = new dr.DatasetWrapper(dataset, that);
            var exists = false;
            //Use existing wrapper if present
            that.datasets.forEach(function (wrapper) {
              if (wrapper.id === dataset.info.id) {
                d = wrapper;
                //clear children
                d.children = [];
                exists = true;
              }
            });

            if (!exists) {
              that.datasets.push(d);
            }

            if (dataset.info.type === "matrix") {
              Object.keys(dataset.groups).forEach(function (group) {
                var g = new dr.DataGroupWrapper(group, d, that);
                d.children.push(g);
              });
            }
            else if (dataset.info.type === "table") {
              dataset.info.columns.forEach(function (col) {
                if (col.value.type === "real") {
                  var c = new dr.TableColumnWrapper(col, d, that);
                  d.children.push(c);
                }
              });
            }

          }
        );


      },

      addPathProperties: function (path) {
        var numericalProperties = {};

        path.nodes.forEach(function (node) {
          var props = config.getNumericalNodeProperties(node);
          props.forEach(function (prop) {
            if (!numericalProperties[prop]) {
              numericalProperties[prop] = new NodeProperty(prop);
            }
          });
        });

        this.properties = Object.keys(numericalProperties).map(function (key) {
          return numericalProperties[key];
        });

      }

      ,

      addPathSets: function (path) {

        var setTypeDict = {};
        var setTypeList = [];

        for (var i = 0; i < path.nodes.length; i++) {
          var node = path.nodes[i];

          pathUtil.forEachNodeSet(node, function (setType, setId) {
            addSetForNode(setType, setId, i);
          });
        }


        for (var i = 0; i < path.edges.length; i++) {
          var edge = path.edges[i];

          pathUtil.forEachEdgeSet(edge, function (setType, setId) {
            addSetForEdge(setType, setId, i);
          });
        }

        function addSetForNode(type, setId, nodeIndex) {
          var currentSet = addSet(type, setId);
          currentSet.nodeIndices.push(nodeIndex);
          var currentSetType = setTypeDict[type];
          if (currentSetType.nodeIndices.indexOf(nodeIndex) === -1) {
            currentSetType.nodeIndices.push(nodeIndex);
          }
        }

        function addSetForEdge(type, setId, relIndex) {
          var currentSet = addSet(type, setId);
          currentSet.relIndices.push(relIndex);
          var currentSetType = setTypeDict[type];
          if (currentSetType.relIndices.indexOf(relIndex) === -1) {
            currentSetType.relIndices.push(relIndex);
          }
        }

        function addSet(type, setId) {
          var setType = setTypeDict[type];

          if (typeof setType === "undefined") {
            setType = new SetType(type);
            //setType = {type: type, sets: [], setDict: {}, collapsed: false, nodeIndices: [], relIndices: []};
            setTypeDict[type] = setType;
            setTypeList.push(setType);
          }

          var mySet = setType.setDict[setId];
          if (typeof mySet === "undefined") {
            mySet = new SetRep(setId, type);
            //mySet = {id: setId, nodeIndices: [], relIndices: [], setType: type};
            setType.setDict[setId] = mySet;
            setType.sets.push(mySet);
          }
          return mySet;
        }

        //setTypeList.forEach(function (setType) {
        //  delete setType.setDict;
        //});

        this.setTypes = setTypeList;
        this.setTypeDict = setTypeDict;
      }
    };

    function getNodeSetCount(node, setTypeWrapper) {
      var numSets = 0;

      pathUtil.forEachNodeSetOfType(node, setTypeWrapper.type, function (type, setId) {
        if (setTypeWrapper.setDict[setId].canBeShown()) {
          numSets++;
        }
      });
      return numSets;
    }

    function getEdgeSetCount(edge, setTypeWrapper) {
      var numSets = 0;

      pathUtil.forEachEdgeSetOfType(edge, setTypeWrapper.type, function (type, setId) {
        if (setTypeWrapper.setDict[setId].canBeShown()) {
          numSets++;
        }
      });
      return numSets;
    }

    return {

      pathWrappers: [],
      maxNumNodeSets: 0,
      maxNumEdgeSets: 0,
      numericalPropertyScales: {},
      lastVisiblePathIndex: -1,
      currentPageIndex: 0,

      updateListeners: [],

      init: function () {
        var that = this;

        listeners.add(function (comparator) {
          that.sortPaths(comparator);
          that.notifyUpdateListeners();
        }, pathSorting.updateType);

        listeners.add(function () {
          that.updatePathWrappersToQuery();
          that.notifyUpdateListeners();
        }, listeners.updateType.QUERY_UPDATE);

        listeners.add(function () {
          that.updateLastVisibleIndex();
          that.updateCrossPathData();
          that.notifyUpdateListeners();
        }, listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE);

        listeners.add(function () {
          that.pathWrappers.forEach(function (pathWrapper) {
            pathWrapper.updateDatasets();
          });
          that.notifyUpdateListeners();
        }, listeners.updateType.DATASET_UPDATE);


      }
      ,

      addPath: function (path) {

        var pathWrapper = new PathWrapper(path);
        this.pathWrappers.push(pathWrapper);
        var pathFiltered = pathQuery.isPathFiltered(path.id);
        var removeFilteredPaths = pathQuery.isRemoveFilteredPaths();
        if (!(pathFiltered && removeFilteredPaths)) {
          this.updateCrossPathDataForPathWrapper(pathWrapper);
        }

        if (removeFilteredPaths) {
          //Index increases when path is not filtered, otherwise it stays the same
          if (!pathFiltered) {
            this.lastVisiblePathIndex++;
          }
        } else {
          this.lastVisiblePathIndex = this.pathWrappers.length - 1;
        }
        this.sortPaths();
        this.notifyUpdateListeners();
      }
      ,

      getPathWrappers: function (all) {

        if (this.lastVisiblePathIndex === -1) {
          return [];
        }

        if (all) {
          return this.pathWrappers.slice(0, this.lastVisiblePathIndex + 1);
        } else {
          var minIndex = this.currentPageIndex * pageSize;
          var maxIndex = Math.min(minIndex + pageSize, this.lastVisiblePathIndex + 1);

          return this.pathWrappers.slice(minIndex, maxIndex);
        }
      }
      ,

      updateLastVisibleIndex: function () {
        if (pathQuery.isRemoveFilteredPaths()) {
          //We assume that paths are sorted correctly, i.e., filtered paths are last
          for (var i = 0; i < this.pathWrappers.length; i++) {
            if (pathQuery.isPathFiltered(this.pathWrappers[i].path.id)) {
              this.lastVisiblePathIndex = i - 1;
              break;
            }
          }

          if (this.currentPageIndex * pageSize > this.lastVisiblePathIndex) {
            this.currentPageIndex = Math.floor(this.lastVisiblePathIndex / pageSize);
          }
        } else {
          this.lastVisiblePathIndex = this.pathWrappers.length - 1;
        }
      },

      updateCrossPathData: function () {
        var that = this;
        this.pathWrappers.forEach(function (pathWrapper) {
          that.updateCrossPathDataForPathWrapper(pathWrapper);
        })
      },


      updateCrossPathDataForPathWrapper: function (pathWrapper) {
        var that = this;

        pathWrapper.setTypes.forEach(function (setTypeWrapper) {
          pathWrapper.path.nodes.forEach(function (node) {
            var numNodeSets = getNodeSetCount(node, setTypeWrapper);
            if (numNodeSets > that.maxNumNodeSets) {
              that.maxNumNodeSets = numNodeSets;
            }

            config.getNumericalNodeProperties(node).forEach(function (property) {
              var scale = that.numericalPropertyScales[property];
              var value = node.properties[property];

              if (!scale) {
                that.numericalPropertyScales[property] = d3.scale.linear().domain([Math.min(0, value), Math.max(0, value)]).range([0, s.NODE_WIDTH]);
              } else {
                scale.domain([Math.min(0, Math.min(scale.domain()[0], value)), Math.max(0, Math.max(scale.domain()[1], value))]);
              }
            });
          });

          pathWrapper.path.edges.forEach(function (edge) {
            var numEdgeSets = getEdgeSetCount(edge, setTypeWrapper);
            if (numEdgeSets > that.maxNumEdgeSets) {
              that.maxNumEdgeSets = numEdgeSets;
            }
          });
        });
      }
      ,

      sortPaths: function (comparator) {
        var that = this;
        comparator = comparator || pathSorting.sortingManager.currentComparator;

        that.pathWrappers.sort(comparator);

        var rankingStrategyChain = Object.create(pathSorting.sortingManager.currentStrategyChain);
        rankingStrategyChain.splice(rankingStrategyChain.length - 1, 1);

        var rankComparator = sorting.getComparatorFromStrategyChain(rankingStrategyChain);

        var currentRank = 0;
        var rankCounter = 0;
        var prevWrapper = 0;
        that.pathWrappers.forEach(function (pathWrapper) {
          rankCounter++;
          if (prevWrapper === 0) {
            currentRank = rankCounter;
          } else {
            if (rankComparator(prevWrapper, pathWrapper) !== 0) {
              currentRank = rankCounter;
            }
          }
          pathWrapper.rank = currentRank.toString() + ".";
          prevWrapper = pathWrapper;
        });

      }
      ,

      updatePathWrappersToQuery: function () {


        if (pathQuery.isRemoteQuery()) {
          for (var i = 0; i < this.pathWrappers.length; i++) {
            var pathWrapper = this.pathWrappers[i];
            if (pathQuery.isPathFiltered(pathWrapper.path.id)) {
              this.pathWrappers.splice(i, 1);
              i--;
            }
          }
        }

        this.sortPaths();
        this.updateLastVisibleIndex();
        this.updateCrossPathData();
      },

      addUpdateListener: function (l) {
        this.updateListeners.push(l);
      },

      notifyUpdateListeners: function () {
        var that = this;
        this.updateListeners.forEach(function (l) {
          l(that);
        })
      }

    }

  });
