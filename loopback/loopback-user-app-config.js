module.exports = function (A) {
    A.app({
        entities: {
            User: {
                fields: function (Fields, $parentProperty) {
                    $parentProperty.email = Fields.text('Email').unique();
                    return $parentProperty;
                }
            }
        }
    })
};