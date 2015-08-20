/**
 * Created by Christian on 24.02.2015.
 */
define(['d3', './listeners', './config', './colors'], function (d3, listeners, config, colors) {

    //var colorScheme = Object.create(colorbrewer.Set1[9]);
    ////remove orange color to avoid conflict with highlighting
    //colorScheme.splice(4, 1);
    ////var scheme = Object.create(d3.scale.category10().domain());
    ////scheme.splice(1, 1);
    //
    //var scale = d3.scale.ordinal()
    //  .domain(d3.range(8))
    //  .range(colorScheme);
    //var numTypes = -1;

    return {
        setTypeInfos: {},
        setInfos: {},
        currentlyLoading: {},

        addToType: function (setType, setId) {
            var t = this.setTypeInfos[setType];
            if (typeof t === "undefined") {
                t = {type: setType, sets: [setId]};
                this.setTypeInfos[setType] = t;
            } else {
                if (t.sets.indexOf(setId) === -1)
                    t.sets.push(setId);
            }
        },

        getSetTypeInfos: function () {
            var that = this;
            return Object.keys(this.setTypeInfos).map(function (key) {
                return that.setTypeInfos[key];
            });
        },

        getSetTypeInfo: function (type) {
            return this.setTypeInfos[type];
        },

        getLinkOverlayItem: function (setId) {

            var setNode = this.get(setId);
            if (!setNode) {
                return;
            }
            var urlProperty = config.getSetUrlProperty(setNode);

            if (!urlProperty) {
                return;
            }
            return {
                text: "Show",
                icon: "\uf08e",
                callback: function () {
                    window.open(setNode.properties[urlProperty]);
                }
            };
        },

        getAllSetInfosForNode: function (node) {

        },

        get: function (setId) {
            //return new Promise(function (resolve, reject) {
            //  if(this.setInfos[setId]) {
            //    resolve(this.setInfos[setId]);
            //  } else {
            //
            //  }
            //
            //});
            return this.setInfos[setId];
        },

        getSetLabel: function (setId) {
            var info = this.get(setId);
            if (typeof info === "undefined") {
                return setId;
            }
            return info.properties[config.getSetNameProperty(info)];
        },

        fetch: function (setIds) {
            var that = this;
            //reduce to still unknown setsIds

            var lookup = setIds.filter(function (id) {
                return !(id in that.setInfos);
            });

            if (lookup.length === 0) { //all already loaded
                listeners.notify(listeners.updateType.SET_INFO_UPDATE, that);
                return;
            }

            //not currently loading
            lookup = setIds.filter(function (id) {
                return !(id in that.currentlyLoading);
            });

            if (lookup.length === 0) {
                return; // another callback will fire
            }

            //mark all as being catched
            lookup.forEach(function (d) {
                that.currentlyLoading[d] = true
            });
            $.getJSON('/api/pathway/setinfo', {
                uc: config.getUseCase(),
                sets: lookup
            }).then(function (data) {
                //integrate the map
                Object.keys(data).map(function (id) {
                    var key = id;
                    that.setInfos[key] = data[id];
                    delete that.currentlyLoading[key];
                });
                listeners.notify(listeners.updateType.SET_INFO_UPDATE, that);
            });
        }
    }
});
