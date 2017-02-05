/**
 * Created by Samuel Gratzl on 26.08.2015.
 */

define(['exports', '../caleydo_core/main', '../caleydo_core/plugin', './config'], function (exports, C, plugin, config) {

    exports.getData = function (ids, datasetId) {
        var plugins = plugin.list('pathfinder_data');
        if (plugins.length === 0) {
            return Promise.resolve({});
        }
        if (plugins.length === 1) {
            return plugins[0].load().then(function (impl) {
                return impl.factory(ids, datasetId);
            });
        }
        return Promise.all(plugins.map(function (p) {
            return p.load().then(function (impl) {
                return impl.factory(ids, datasetId);
            })
        })).then(function (datas) {
            var r = {};
            datas = datas.filter(function (d) {
                return typeof d !== "undefined";
            });
            datas.forEach(function (data) {
                Object.keys(data).forEach(function (gene) {
                    var d = data[gene];
                    if (gene in r) {
                        Object.keys(d).forEach(function (di) {
                            r[gene][di] = d[di];
                        });
                    } else {
                        r[gene] = d;
                    }
                });
            });
            return r;
        });
    };

    //exports.getD = function (rowIds, datasetId) {
    //    var plugins = plugin.list('pathfinder_data');
    //    if (plugins.length === 0) {
    //        return C.resolved({});
    //    }
    //    //if (plugins.length === 1) {
    //    //    return plugins[0].load().then(function (impl) {
    //    //        return impl.factory(rowIds, datasetId);
    //    //    });
    //    //}
    //    return C.all(plugins.map(function (p) {
    //        return p.load().then(function (impl) {
    //            return impl.factory(rowIds, datasetId);
    //        })
    //    })).then(function (datas) {
    //        var r = {};
    //        datas.forEach(function (data) {
    //            Object.keys(data).forEach(function (gene) {
    //                var d = data[gene];
    //                if (gene in r) {
    //                    Object.keys(d).forEach(function (di) {
    //                        r[gene][di] = d[di];
    //                    });
    //                } else {
    //                    r[gene] = d;
    //                }
    //            });
    //        });
    //        return r;
    //    });
    //};
    //
    //exports.getKEGGData = function (kegg_ids, datasetId) {
    //    return getData('kegg', kegg_ids, datasetId);
    //};
    //exports.getGeneData = function (gene_symbols, datasetId) {
    //    return getData('gene', gene_symbols, datasetId);
    //};

    exports.list = function () {
        var plugins = plugin.list('pathfinder_data_desc');
        plugins = plugins.filter(function (p) {
            return p.uc === config.getUseCase();
        });
        if (plugins.length === 0) {
            return Promise.resolve([]);
        }
        if (plugins.length === 1) {
            return plugins[0].load().then(function (impl) {
                return impl.factory();
            });
        }
        return Promise.all(plugins.map(function (p) {
            return p.load().then(function (impl) {
                return impl.factory();
            })
        })).then(function (datas) {
            return datas;
        });
    };
});
