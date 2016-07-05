A.app({
    appName: "Pipes",
    entities: function(Fields) {
        return {
            Foo: {
                fields: {
                    fooId: Fields.text("Foo"),
                    bar: Fields.text("Bar")
                }
            }
        }
    }
});