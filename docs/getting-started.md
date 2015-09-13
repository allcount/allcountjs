# Introduction

AllcountJS is an application framework aimed for rapid development of business applications.
The main idea is to make application development fully declarative and reduce application code base size to minimum possible amount.
AllcountJS could be used as standalone server or as a npm dependency.
Typical AllcountJS application consists of app configuration and extensions code.
You could build applications by developing only configuration code though.
Configuration code is a JavaScript code written in JSON-like notation that describes application structure and behavior.
Extensions can be provided by overriding default AllcountJS implementations.
AllcountJS uses [dependency injection (DI)](http://en.wikipedia.org/wiki/Dependency_injection) to provide various extension points.
Configuration code could be placed in Git repository or in separate regular directory.
Such separation of concerns makes your code clearer that especially significant when business domain model is developed by separate team members.
Combination of configuration code and AllcountJS extensions allows to develop applications with minimal efforts.

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

`cd <project_name> && npm install`

To run your project and to connect to local MongoDB instance please run from project dir:

`allcountjs run`

Please note that MongoDB should be running in order to run this example.

# Further reading

- Read [Configuration docs](/docs/apps) to learn how to write AllcountJS configurations.
- Read [Customizing docs](/docs/server) to learn how to use AllcountJS as a npm dependency and extend it.