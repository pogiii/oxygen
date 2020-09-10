export default class OxygenModule {
    constructor(options, context, rs, logger, modules, services) {
        this._this = this;
        this.options = options;
        this.ctx = context;
        this.rs = rs;
        this.logger = logger;
        this.modules = modules;
        this.services = services;
        this._isInitialized = false;
        this._alwaysInitialized = false;
    }
    get name() {
        throw Error('"name" property must be implemented by the deriving class');
    }
    get isInitialized() {
        return this._isInitialized;
    }
    init() {
        this._isInitialized = true;
    }
    dispose() {
        if (this._alwaysInitialized == false) {
            this._isInitialized = false;
        }
    }
    onBeforeCase(suite, suiteIterationNum, caze, caseIterationNum) {

    }
    onAfterCase(suiteResult, caseResult) {

    }
    addCommand(name, func, thisArg) {
        if (!thisArg) {
            thisArg = this;
        }
        this[name] =  func.bind(thisArg);
    }
    deleteSubModule(name) {
        console.log('~~deleteSubModule', name);
        delete this[name];
    }
    addSubModule(name, submodule, id) {
        // if (Object.getPrototypeOf(this)[name]) {
        //     return;
        // }

        // console.log('~~this', this);
        // console.log('~~name', name);
        // console.log('~~this[name]', this[name]);
        // console.log('~~Object.getPrototypeOf(this)', Object.getPrototypeOf(this));

        console.log('~~name', name);
        console.log('~~this[name]', this[name]);
        console.log('~~!!~~!!~~ network new id', submodule.id);

        try {
            this[name] = submodule;

            console.log('~~!!~~!!~~ this id', this[name]['id']);
        } catch (e) {
            console.log('~~e', e);
        }
    }
}