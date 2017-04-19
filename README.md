[![Build Status](https://travis-ci.org/allcount/allcountjs.svg?branch=master)](https://travis-ci.org/allcount/allcountjs)
[![Build Status](https://ci.appveyor.com/api/projects/status/github/allcount/allcountjs?svg=true)](https://ci.appveyor.com/project/paveltiunov/allcountjs)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/allcount/allcountjs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

<img src="https://allcountjs.com/assets/images/allcountjs-logo-card.png" width="381">

# WARNING: This project is not maintained anymore

# What is AllcountJS

The fastest way to deliver web & mobile applications with business value using Node.js.

Write this:

```
A.app({
  appName: "Hello World",
  appIcon: "heart",
  menuItems: [
    {
      name: "Gifts",
      icon: "gift",
      entityTypeId: "Gift"
    }
  ],
  entities: function(Fields) {
    return {
      Gift: {
        title: 'Gifts',
        fields: {
          item: Fields.text("Item"),
          date: Fields.date("Giving Date")
        }
      }
    }
  }
});
```

Get this:

![AllcountJS Hello World App](https://allcountjs.com/assets/images/allcountjs-splash.png)

# Try it

- [Run application demo](http://allcountjs.com/#demo)

# Documentation

- [Getting Started](http://allcountjs.com/docs/getting-started)
- [Application Configuration](http://allcountjs.com/docs/apps)
- [Customizing](http://allcountjs.com/docs/server)

# Install
Before we start you should install [Node.js](http://nodejs.org/), [MongoDB](http://www.mongodb.org/) and [Git](http://git-scm.com/).
After that in order to install AllcountJS CLI you should run:

> *NOTE:* Preferred way to install and run allcountjs on Windows is to use Git-Bash.

```
npm install -g allcountjs-cli
```

> *NOTE:* Users who prior installed allcountjs globally could continue use it but this way should be considered as deprecated.

# Running Hello World
AllcountJS server uses Git repositories and regular directories to load app configurations from it and MongoDB to store application data.
To use AllcountJS Git capabilities Git should be installed and available in path.
To init new AllcountJS project just run

```
allcountjs init
```

You'll be prompted to enter project name, description and other info saved to package.json.
You could also pass `--template <template_name>` option that could be used to init your project with existing demo at [Demo Gallery](https://allcountjs.com/entity/DemoGallery).
`template_name` can be found at [Demo Gallery](https://allcountjs.com/entity/DemoGallery).
After project is initialized you could see created from template `app-config/` and `package.json` in newly created project directory.
In order to install AllcountJS dependencies please run:

> *NOTE:* npm install command will install bower dependencies and shouldn't be run as a root user

```
cd <project_name> && npm install
```

To run your project and to connect to local MongoDB instance please run from project dir:

```
allcountjs run
```

Please note that MongoDB should be running in order to run this example.

You should see:

```
Application server for "app-config" listening on port 9080
```

You could see your server up and running at [http://localhost:9080](http://localhost:9080) then. Please use *admin* / *admin* as user name / password to sign in.

# License
AllcountJS is licensed under the MIT Open Source license. For more information, see the LICENSE file in this repository.
