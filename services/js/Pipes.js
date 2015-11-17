var _ = require('underscore');

module.exports = function (Q, crudService) {
    return {
        oneWayImportSync: function (source, entityCrudId, destinationQuery, options) {
            options = options || {};
            var batchSize = options.batchSize || 1000;
            var keyFn = options.keyFn || function (item) {return item.id};
            var eqFn = options.equals || _.isEqual;
            var strategyForCrudId = crudService.strategyForCrudId(entityCrudId);
            var writeCrud = options.writeCrud || strategyForCrudId;
            return Q(source).then(function (sourceItems) {
                var keyToSourceItem = _.chain(sourceItems).map(function (item) {
                    return [keyFn(item), item];
                }).object().value();
                return strategyForCrudId.findCount(destinationQuery).then(function (count) {
                    var batchCount = Math.ceil(count / batchSize);
                    var seenKeys = {};
                    return Q.all(_.range(0, batchCount).map(function (batchIndex) {
                        return strategyForCrudId.findRange(destinationQuery, batchIndex * batchSize, batchSize).then(function (batchItems) {
                            return Q.all(batchItems.map(function (item) {
                                var itemKey = keyFn(item);
                                if (keyToSourceItem[itemKey]) {
                                    seenKeys[itemKey] = true;
                                    var itemWithoutId = _.clone(item);
                                    delete itemWithoutId['id'];
                                    if (!eqFn(keyToSourceItem[itemKey], itemWithoutId)) {
                                        keyToSourceItem[itemKey].id = item.id;
                                        return writeCrud.updateEntity(keyToSourceItem[itemKey]);
                                    }
                                } else {
                                    return writeCrud.deleteEntity(item.id);
                                }
                            }))
                        })
                    })).then(function () {
                        return Q.all(sourceItems.map(function (sourceItem) {
                            if (!seenKeys[keyFn(sourceItem)]) {
                                seenKeys[keyFn(sourceItem)] = true;
                                return writeCrud.createEntity(sourceItem);
                            }
                        }))
                    })
                })
            })
        }
    }
};