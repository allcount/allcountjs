var _ = require('underscore');
var Q = require('q');
var moment = require('moment');

module.exports = function (crudService, referenceService, entityDescriptionService, storageDriver, injection, routeUtil, cloudinaryService, securityService) {
    var route = {};

    var extractEntityCrudId = routeUtil.extractEntityCrudId;

    route.checkReadPermissionMiddleware = function (req, res, next) {
        var entityCrudId = extractEntityCrudId(req);
        if (entityCrudId && !entityDescriptionService.userHasReadAccess(entityCrudId, req.user)) {
            res.send(403, 'Permission denied');
        } else {
            next();
        }
    };

    /**
     * @deprecated
     * @param req
     * @param res
     * @param next
     */
    route.checkWritePermissionMiddleware = function (req, res, next) {
        var entityCrudId = extractEntityCrudId(req);
        if (entityCrudId && !entityDescriptionService.userHasWriteAccess(entityCrudId, req.user)) {
            res.send(403, 'Permission denied');
        } else {
            next();
        }
    };

    function filteringAndSorting(req) {
        var filtering = req.query.filtering && JSON.parse(req.query.filtering) || {};
        return {
            textSearch: filtering.textSearch,
            filtering: filtering.filtering,
            sorting: filtering.sorting
        };
    }

    route.findCount = function (req, res) {
        var strategyForCrudId = crudService.strategyForCrudId(extractEntityCrudId(req));
        var filtering = filteringAndSorting(req);
        Q.all([
                strategyForCrudId.findCount(filtering),
                strategyForCrudId.getTotalRow(filtering)
            ]).spread(function (count, totalRow) {
            res.json({
                count: count,
                totalRow: totalRow || undefined
            });
        }).done();
    };

    route.findRange = function (req, res) {
        var entityCrudId = extractEntityCrudId(req);
        var allFields = entityDescriptionService.entityDescription(entityCrudId).allFields;
        crudService
            .strategyForCrudId(entityCrudId)
            .findRange(filteringAndSorting(req), req.query.start, req.query.count)
            .then(function (result) {
                res.json(result.map(function (i) { return route.formatJsonObj(i, allFields) }));
            })
            .done();
    };

    function removeReadOnlyFieldValues (entityCrudId, entity) {
        _.forEach(entityDescriptionService.entityDescription(entityCrudId).allFields, function (field, fieldName) {
            if (field.readOnly()) {
                delete entity[fieldName];
            }
        });
        return entity;
    }

    route.createEntity = function (req, res) {
        var entityCrudId = extractEntityCrudId(req);
        var entity = removeReadOnlyFieldValues(entityCrudId, req.body);
        crudService.strategyForCrudId(entityCrudId).createEntity(entity).then(function (result) {
            res.send(result.toString());
        }).done();
    };

    route.readEntity = function (req, res) {
        var entityCrudId = extractEntityCrudId(req);
        crudService
            .strategyForCrudId(entityCrudId)
            .readEntity(req.params.entityId)
            .then(function (result) {
                res.json(route.formatJsonObj(result, entityDescriptionService.entityDescription(entityCrudId).allFields));
            })
            .done();
    };

    route.updateEntity = function (req, res) {
        var entityCrudId = extractEntityCrudId(req);
        var entity = removeReadOnlyFieldValues(entityCrudId, req.body);
        crudService.strategyForCrudId(entityCrudId).updateEntity(entity).then(function (result) {
            res.json(route.formatJsonObj(result, entityDescriptionService.entityDescription(entityCrudId).allFields));
        }).done();
    };

    route.deleteEntity = function (req, res) {
        var entityCrudId = extractEntityCrudId(req);
        crudService
            .strategyForCrudId(entityCrudId)
            .deleteEntity(req.params.entityId)
            .then(function (result) {
                res.json(route.formatJsonObj(result, entityDescriptionService.entityDescription(entityCrudId).allFields));
            })
            .done();
    };

    route.formatJsonObj = function (entity, fields) {
        _.forEach(entity, function (value, property) {
            if (_.isDate(value)) {
                entity[property] = moment(value).format(fields[property].fieldType.hasTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD');
            }
        });
        return entity;
    };

    route.referenceValues = function (req, res) { //TODO support reference TOP values
        referenceService.referenceValues({entityTypeId: req.params.entityTypeId}, req.query.query).then(function (result) {
            res.json(result);
        });
    };

    route.referenceValueByEntityId = function (req, res) {
        referenceService.referenceValueByEntityId(entityDescriptionService.entityTypeIdCrudId(req.params.entityTypeId), req.params.entityId).then(function (result) {
            res.json(result);
        });
    };

    route.uploadFile = function (req, res) {
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename) {
            var uploadPromise;
            if (req.params.provider === 'cloudinary') {
                uploadPromise = cloudinaryService.upload(file, filename);
            } else {
                uploadPromise = storageDriver.createFile(filename, file).then(function (fileId) { return {fileId: fileId, name: filename} });
            }
            uploadPromise.then(function (result) {
                res.json({files: [result]});
            }).done();
        });
    };

    var mimeTypes = {
        pdf: 'application/pdf'
    };

    route.downloadFile = function (req, res) {
        storageDriver.getFile(req.params.fileId).then(function (file) {
            var split = file.fileName.split('.');
            var extension = '';
            if (split.length > 1) {
                extension = split[split.length - 1];
            }
            res.set('Content-Type', mimeTypes[extension] || 'application/octet-stream');
            if (!mimeTypes[extension]) {
                res.set('Content-Disposition',  'attachment; filename="' + file.fileName + '"');
            }
            file.stream.pipe(res);
        }).done();
    };

    route.withUserScope = function (req, res, next) {
        return securityService.withUserScope(req.user, next);
    };

    return route;
};