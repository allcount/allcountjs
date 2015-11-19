A.app({
    appName: "Crud",
    menuItems: [
        {
            name: "Hello world",
            entityTypeId: "Foo"
        }
    ],
    entities: function(Fields) {
        return {
            Foo: {
                fields: {
                    foo: Fields.text("Foo"),
                    bar: Fields.text("Bar")
                },
                beforeSave: function (Crud, Entity) {
                    Entity.bar = "Some " + Entity.foo;
                },
                afterSave: function (Crud, Entity) {
                    return Crud.crudForEntityType('Foo').updateEntity({id: Entity.id, foo: "Another " + Entity.bar});
                }
            }
        }
    }
});