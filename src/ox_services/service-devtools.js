/* eslint-disable no-unreachable */
import WDIODevToolsService from '@wdio/devtools-service';

import OxygenService from '../core/OxygenService';
import NetworkSubModule from './service-devtools/submodule-network';

export default class DevToolsService extends OxygenService {
    constructor(options, ctx, results, logger) {
        super(options, ctx, results, logger);
        // hash of webdriver based modules
        this._subModules = {};

        console.log('~~#013 isServiceInitialized true');
        this.isServiceInitialized = false;
        this.id = +new Date();

        console.log('\x1b[36m', '       ~~new this.id', this.id, '\x1b[0m');
    }
    onModuleLoaded(module) {

        if ( module.name === 'web' ) {
            console.log('~~onModuleLoaded module.name1', module.name);
            console.log('\x1b[36m', '       ~~this.id', this.id, '\x1b[0m');
        }

        // skip any module that does not implement .getDriver() method (e.g. not webdriver based)
        if (!module || !module.getDriver || typeof module.getDriver !== 'function' || !module.getCapabilities || typeof module.getCapabilities !== 'function') {
            if ( module.name === 'web' ) {
                console.log('\n~~onModuleLoaded module.name.return', module.name);
            }
            // console.log('~~onModuleLoaded module.nagetDriverme.return', module.getDriver);
            // console.log('~~onModuleLoaded module.getCapabilities.return', module.getCapabilities);
            // console.log('~~onModuleLoaded module.return', module);

            this.isServiceInitialized = false;
            return;
        }

        // console.log('~~onModuleLoaded module', module);

        delete module.deleteSubModule('network');
        delete this._subModules[module.name];

        if ( module.name === 'web' ) {
            console.log('~~onModuleLoaded module.name2', module.name);
            console.log('~~onModuleLoaded this._subModules', this._subModules[module.name]);
            console.log('module after delete', module.network);
        }

        const networkSubmodule = new NetworkSubModule('network', module);
        module.addSubModule('network', networkSubmodule, this.id);

        if ( module.name === 'web' ) {
            console.log('~~!!!~~ module after addSubModule', module.network.name);
            console.log('~~!!!~~ moddule after addSubModule', module.network.id);
        }

        this._subModules[module.name] = networkSubmodule;
        console.log('~~#057 isServiceInitialized true');
        this.isServiceInitialized = false;
    }
    async onModuleInitialized(module, moduleName) {

        console.log('~~onModuleInitialized');
        console.log('\x1b[36m', '       ~~this.id', this.id, '\x1b[0m');
        console.log('~~this.isServiceInitialized', this.isServiceInitialized);

        // if (this.isServiceInitialized) {
        //     console.log('~~ return #30');
        //     return;
        // }

        // console.log('~~!!~~module', module);

        // skip any module that does not implement .getDriver() method (e.g. not webdriver based)
        if (!module || !module.getDriver || typeof module.getDriver !== 'function' || !module.getCapabilities || typeof module.getCapabilities !== 'function') {
            console.log('~~!!~~module.name', module.name);
            console.log('~~!!~~moduleName', moduleName);
            console.log('~~module.getDriver', !!module.getDriver);
            console.log('~~module.getCapabilities', !!module.getCapabilities);
            console.log('~~ return #36');
            return;
        }
        console.log('~~ this._subModules', Object.keys(this._subModules));
        let submodule = this._subModules[module.name];
        if (!submodule) {
            console.log('~~ return #41 before');
            this.onModuleLoaded(module);
            console.log('~~ return #41 after');
            submodule = this._subModules[module.name];
            if (!submodule) {
                return;
                console.log('~~ tmp return _subModules', Object.keys(this._subModules));
                console.log('~~ tmp return module.name', module.name);
            }
        }

        let options = {};
        const capabilities = module.getCapabilities();
        this._driver = module.getDriver();

        if (
            this._driver &&
            this._driver.capabilities &&
            this._driver.capabilities['goog:chromeOptions'] &&
            this._driver.capabilities['goog:chromeOptions']['debuggerAddress']
        ) {
            options.debuggerAddress = this._driver.capabilities['goog:chromeOptions']['debuggerAddress'];
        }

        if (capabilities && (capabilities['sauce:options'] || capabilities['lamda:options'] || capabilities['testingBot:options'] || capabilities['browserstack:options'])) {
            console.log('~~submodule.init #52');
            submodule.init();
        } else {
            // initialize DevToolsService and hook it to the current webdriver object
            const devToolsSvc = new WDIODevToolsService(options);
            const UNSUPPORTED_ERROR_MESSAGE = devToolsSvc.beforeSession(null, capabilities);

            if (UNSUPPORTED_ERROR_MESSAGE) {
                console.log('UNSUPPORTED_ERROR_MESSAGE', UNSUPPORTED_ERROR_MESSAGE);
            }

            if (devToolsSvc.isSupported) {
                // change global.browser to the current module's webdriver instance
                const orgGlobalBrowser = global.browser;
                global.browser = module.getDriver();
                await devToolsSvc.before();
                console.log('~~submodule.init #68');
                submodule.init(devToolsSvc);
                global.browser = orgGlobalBrowser;
            } else {
                console.log('~~submodule.init #isSupported false');
            }
        }

        console.log('~~#126 isServiceInitialized true');
        this.isServiceInitialized = true;
    }
    onModuleWillDispose(module) {
        if ( module.name === 'web') {
            console.log('~~onModuleWillDispose', module.name);
            console.log('\x1b[36m', '       ~~this.id', this.id, '\x1b[0m');
        }

        const submodule = this._subModules[module.name];

        if ( module.name === 'web') {
            console.log('~~onModuleWillDispose submodule', !!submodule);
        }

        if (!submodule) {
            return;
        }
        submodule.dispose();

        delete this._subModules[module.name];
        console.log('~~#147 isServiceInitialized false');
        this.isServiceInitialized = false;

        if ( module.name === 'web') {
            console.log('~~onModuleWillDispose end', Object.keys(this._subModules));
        }
    }
}