A.app({
    appName: 'Referential-integrity',
    entities: function (Fields) {
        return {
            Foo: {
                fields: {
                    fooField: Fields.text('foo')
                },
                referenceName: "fooField",
                disableReferentialIntegrity: true
            },
            Bar: {
                fields: {
                    barField: Fields.reference('bar', 'Foo')
                }
            }
        }
    }
});