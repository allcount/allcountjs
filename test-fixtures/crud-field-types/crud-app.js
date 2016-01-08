A.app({
    appName: "Crud Field Types",
    entities: function(Fields) {
        return {
            Foo: {
                fields: {
                    text: Fields.text("Text"),
                    date: Fields.date("Date"),
                    barReference: Fields.reference("Reference", "Bar"),
                    barMultiReference: Fields.multiReference("Multi Reference", "Bar"),
                    money: Fields.money("Money"),
                    integer: Fields.integer("Integer"),
                    checkbox: Fields.checkbox("Checkbox"),
                    checkboxArrayField: Fields.checkbox("Checkbox Array", 'checkboxArray'),
                    password: Fields.password("Password"),
                    link: Fields.link("Link"),
                    email: Fields.email("Email")
                }
            },
            Bar: {
                fields: {
                    name: Fields.text("Name")
                },
                referenceName: "name"
            }
        }
    }
});