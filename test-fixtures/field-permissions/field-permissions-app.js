A.app({
    appName: "Field permissions",
    menuItems: [
        {
            name: "Foo",
            entityTypeId: "Foo"
        }
    ],
    roles: ['owner', 'manager'],
    entities: function(Fields) {
        return {
            Foo: {
                fields: {
                    foo: Fields.text("Foo"),
                    bar: Fields.text("Bar").permissions({
                        write: ['manager']
                    }),
                    ownerOnly: Fields.text("Foo and Bar").permissions({
                        read: ['owner']
                    })
                }
            },
            CreateOnly: {
                fields: {
                    foo: Fields.text("Foo"),
                    bar: Fields.text("Bar")
                },
                permissions: {
                    read: ['manager'],
                    create: null
                }
            }
        }
    }
});