# <img src="https://github.com/elixir-cloud-aai/krini/blob/master/public/logo.png?raw=true" align="left" height="38" alt=""> <span >Krini</span>

**The Krini is a virtual research environment allowing users to run, manage, share and publish life science analyses.**

Check out the application in the [production](https://krini.rahtiapp.fi/). The rest of this doc will mainly contain details about how to run and contribute to the Krini site locally.

## Getting Started

### Prerequisites

- Git
- [Node &amp; npm](https://nodejs.org/en/): Recent LTS version avaliable

### Installation

- To start with, [fork](https://github.com/elixir-cloud-aai/krini) & clone the repository and traverse into the project's root directory with:

```
git clone https://github.com/<your-github-username>/krini.git
cd krini
```

- Install the packages to be used in the development:

```
npm install
```

> **_NOTE:_** If haven't used the cypress before please run
> `npm run cypress:install`
> This will install cypress in your project & will allow you to run e2e tests.

- Run the start script to start the development environment of the project:

```
npm run start
```

- This will open the browser window on your desktop. If not visit `http://localhost:3000/` on your browser's new window.

### Running workflows locally

To `run a workflow` or `manage your workflow runs` locally (on local host), please modify the `./src/config.js` file by:

- commenting out line 2 (`const host_uri = 'https://krini.rahtiapp.fi/';`) and
- uncommenting line 3 (`consthost_uri="http://localhost:3000/";`).

> **_NOTE:_** Please don't commit the changes made to the config.js file in a Pull request.

Great, now you are good to go!

## Contributing

This project is a community effort and lives off your contributions, be it in
the form of bug reports, feature requests, discussions, or fixes, and other code
changes. Please refer to our organization's [contribution
guidelines](https://github.com/elixir-cloud-aai/elixir-cloud-aai/blob/dev/CONTRIBUTING.md) if you are interested in contributing.
Please mind the [code of conduct](https://github.com/elixir-cloud-aai/elixir-cloud-aai/blob/dev/CODE_OF_CONDUCT.md) for all interactions with
the community.

## Versioning

The project adopts the [semantic versioning](https://semver.org/) scheme for versioning.

## License

This project is covered by the MIT License also
[shipped with this repository](https://github.com/elixir-cloud-aai/krini/blob/master/LICENSE).

## Contact

The project is a collaborative effort under the umbrella of [ELIXIR Cloud &amp;
AAI](https://github.com/elixir-cloud-aai/). Follow the link to get in touch with us via chat or email.
Please mention the name of this service for any inquiry, proposal, question,
etc. Alternatively, you can also make use of the [issue
tracker](https://github.com/elixir-cloud-aai/krini/issues) to request features or report bugs.
