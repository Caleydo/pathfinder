/**
 * Created by Samuel Gratzl on 26.08.2015.
 */

define(['exports', '../caleydo_core/main', '../caleydo_core/plugin'], function (exports, C, plugin) {

  function getData(id, ids) {
    var plugins = plugin.list('pathfinder_' + id + '_data');
    if (plugins.length === 0) {
      return Promise.resolve({});
    }
    if (plugins.length === 0) {
      return plugins[0].load().then(function (impl) {
      return impl.factory(ids);
      });
    }
    return Promise.all(plugins.map(function(p) { return p.load().then(function(impl) { return impl.factory(ids); })})).then(function(datas) {
      var r = {};
      datas.forEach(function(data) {
        Object.keys(data).forEach(function(gene) {
          var d = data[gene];
          if (gene in r) {
            Object.keys(d).forEach(function(di) {
              r[gene][di] = d[di];
            });
          } else {
            r[gene] = d;
          }
        });
      });
      return r;
    });
  }

  exports.getKEGGData = function (kegg_ids) {
    return getData('kegg', kegg_ids);
  };
  exports.getGeneData = function (gene_symbols) {
    return getData('gene', gene_symbols);
  };
});