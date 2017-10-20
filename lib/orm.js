/** @babel */
import {Callable} from "hjs-future/lib/future";
import {FutureTask} from "hjs-future/lib/service";
import {HTTPConnection, HTTPMessage} from "libhttp/lib/http";
import {SQLiteOpenHelper} from "libsqlite/lib/helper";
import {Entity} from "./entity";
import {Delete, Drop, Insert, Select, Update} from "./selection";
import {SQLiteCommand, SQLiteCommandReceiver} from "./command";

export class Orm extends SQLiteOpenHelper {

    constructor({
                    version = 0,
                    newCursor = null,
                    onChange = null,
                    onConfigure = null,
                    onCreate = null,
                    onExecute = null,
                    onDowngrade = null,
                    onUpgrade = null,
                    onError = null,
                    onHandleEvent = null,
                    onOpen = null,
                    onTransaction = null
                } = {}) {
        super({
            version,
            newCursor,
            onChange,
            onConfigure,
            onCreate,
            onExecute,
            onDowngrade,
            onUpgrade,
            onError,
            onHandleEvent,
            onOpen,
            onTransaction
        });
        this.mInitialized = false;
    }

    isModelsInitialized() {
        return this.mInitialized;
    }

    loadModels(path) {
        if (!this.mInitialized) {
            throw new SQLException("ORM model(s) not initialized");
        }
        return new FutureTask({
            callable: new Callable({
                compute: (onComplete) => {
                    new HTTPConnection({
                        url: path,
                        method: HTTPMessage.GET,
                        responseType: HTTPMessage.JSON,
                        handler: {
                            onHandleRequest: (event) => {
                                let type = event.type;
                                let response = event.response;
                                if (type === "loadend") {
                                    let models = [];
                                    if (!response.hasError()) {
                                        let model = null;
                                        let jsonmodels = response.getMessageBody();
                                        jsonmodels.forEach((jsonmodel, index, list) => {
                                            for (let p in jsonmodel) {
                                                if (jsonmodel.hasOwnProperty(p)) {
                                                    model = this.getModelInstance(p, jsonmodel[p]);
                                                    models.push(model);
                                                }
                                            }
                                        });
                                    }
                                    onComplete(models);
                                }
                            }
                        }
                    });
                }
            })
        });
    }

    newCommand({context = null, timeout = -1, receiver = null} = {}) {
        let command = new SQLiteCommand({
            database: this.getReadableDatabase(),
            context: context,
            timeout: timeout
        });
        if (receiver) {
            command.addReceiver(receiver);
        }
        return command;
    }

    newCommandReceiver({begin = null, commit = null, rollback = null, handler = null} = {}) {
        return new SQLiteCommandReceiver({begin, commit, rollback, handler});
    }

    newCursorLoader({
                        id,
                        context,
                        listener,
                        executor,
                        editTable = "",
                        projection = [],
                        selection = "",
                        selectionArgs = [],
                        groupBy = "",
                        having = "",
                        sortOrder = "",
                        limit = ""
                    } = {}) {
        return this.getReadableDatabase().newCursorLoader({
            id,
            context,
            listener,
            executor,
            database: this,
            editTable,
            projection,
            selection,
            selectionArgs,
            groupBy,
            having,
            sortOrder,
            limit
        });
    }

    newDelete({model = null, name = null, ignoreId = true, whereAlgorithm = null} = {}) {
        if (!this.mInitialized) {
            throw new SQLException("ORM model(s) not initialized");
        }
        return new Delete({model, name, ignoreId, whereAlgorithm});
    }

    newDeleteSelections({models = [], name = null, ignoreId = true, whereAlgorithm = null} = {}) {
        let selections = [];
        if (!Array.isArray(models)) {
            models = [models];
        }
        for (let i = 0; i < models.length; i++) {
            selections[i] = this.newDelete({
                name,
                model: models[i],
                ignoreId,
                whereAlgorithm
            });
        }
        return selections;
    }

    newDrop({model = null, name = null, ignoreId = true} = {}) {
        if (!this.mInitialized) {
            throw new SQLException("ORM model(s) not initialized");
        }
        return new Drop({model, name, ignoreId});
    }

    newDropSelections({models = [], name = null, ignoreId = true} = {}) {
        let selections = [];
        if (!Array.isArray(models)) {
            models = [models];
        }
        for (let i = 0; i < models.length; i++) {
            selections[i] = this.newDrop({
                name,
                model: models[i],
                ignoreId
            });
        }
        return selections;
    }

    newInsert({model = null, name = null, ignoreId = true, conflictAlgorithm = 0} = {}) {
        if (!this.mInitialized) {
            throw new SQLException("ORM model(s) not initialized");
        }
        return new Insert({model, name, ignoreId, conflictAlgorithm});
    }

    newInsertSelections({models = [], name = null, ignoreId = true, conflictAlgorithm = 0} = {}) {
        let selections = [];
        if (!Array.isArray(models)) {
            models = [models];
        }
        for (let i = 0; i < models.length; i++) {
            selections[i] = this.newInsert({
                name,
                model: models[i],
                ignoreId,
                conflictAlgorithm
            });
        }
        return selections;
    }

    newModelClass(table) {
        if (!this.mInitialized) {
            throw new SQLException("ORM model(s) not initialized");
        }
        return Entity.getTableClass(table);
    }

    newModelInstance(table, object) {
        if (!this.mInitialized) {
            throw new SQLException("ORM model(s) not initialized");
        }
        let model = Entity.getTableInstance(table);
        if (object) {
            model.setProperties(object);
        }
        return model;
    }

    newModels() {
        if (!this.mInitialized) {
            Entity.generate();
            this.mInitialized = true;
        }
        return this;
    }

    newSelect({model = null, name = null, ignoreId = true, selectAlgorithm = "*", whereAlgorithm = null} = {}) {
        if (!this.mInitialized) {
            throw new SQLException("ORM model(s) not initialized");
        }
        return new Select({model, name, ignoreId, selectAlgorithm, whereAlgorithm});
    }

    newSelectSelections({models = [], name = null, ignoreId = true, selectAlgorithm = "*", whereAlgorithm = null} = {}) {
        let selections = [];
        if (!Array.isArray(models)) {
            models = [models];
        }
        for (let i = 0; i < models.length; i++) {
            selections[i] = this.newSelect({
                name,
                model: models[i],
                ignoreId,
                selectAlgorithm,
                whereAlgorithm
            });
        }
        return selections;
    }

    newUpdate({model = null, name = null, ignoreId = true, updateAlgorithm = "*", whereAlgorithm = null} = {}) {
        if (!this.mInitialized) {
            throw new SQLException("ORM model(s) not initialized");
        }
        return new Update({model, name, ignoreId, updateAlgorithm, whereAlgorithm});
    }

    newUpdateSelections({models = [], name = null, ignoreId = true, updateAlgorithm = "*", whereAlgorithm = null} = {}) {
        let selections = [];
        if (!Array.isArray(models)) {
            models = [models];
        }
        for (let i = 0; i < models.length; i++) {
            selections[i] = this.newUpdate({
                name,
                model: models[i],
                ignoreId,
                updateAlgorithm,
                whereAlgorithm
            });
        }
        return selections;
    }
}