A.app({
    appName: "Crud",
    entities: function(Fields) {
        return {
            Foo: {
                fields: {
                    foo: Fields.text("Foo"),
                    bar: Fields.text("Bar")
                }
            }
        }
    }
});