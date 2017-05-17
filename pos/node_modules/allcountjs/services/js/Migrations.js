exports.insert = function (entityTypeId, entities) {
    return {
        id: 'insert',
        entityTypeId: entityTypeId,
        entities: entities
    }
};