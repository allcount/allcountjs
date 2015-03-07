A.app({
    appName: "Hello World",
    menuItems: [
        {
            name: "Hello world",
            entityTypeId: "HelloWorld"
        }
    ],
    entities: function(Fields) {
        return {
            HelloWorld: {
                fields: {
                    foo: Fields.text("Foo"),
                    bar: Fields.date("Bar")
                }
            }
        }
    }
});