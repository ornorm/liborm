/** @babel */
import {Callable} from "hjs-future/lib/future";
import {FutureTask} from "hjs-future/lib/service";
import {Observable} from "libobs/lib/obs";
import {HTTPConnection, HTTPMessage} from "libhttp/lib/http";
import {BaseColumns, DatabaseUtils} from "libsqlite/lib/helper";

export class Model extends Observable {

    constructor() {
        super();
        this.mInternals = null;
    }

    clone() {
        let o = new this.constructor();
        let obj = this.getProperties();
        for (let p in obj) {
            if (obj.hasOwnProperty(p)) {
                o[p] = obj[p];
            }
        }
        return o;
    }

    compare(model1, model2) {
        return 0;
    }

    compareTo(model) {
        return 0;
    }

    containsKey(key) {
        if (key) {
            let keys = this.getKeys();
            return keys.indexOf(key) !== -1;
        }
        return false;
    }

    equals(obj) {
        if (!obj) {
            return false;
        }
        if (obj === this) {
            return true;
        }
        if (!(obj instanceof this.constructor)) {
            return false;
        }
        let properties = this.getProperties();
        for (let p in properties) {
            if (properties.hasOwnProperty(p)) {
                if (properties[p] !== obj[p]) {
                    return false;
                }
            }
        }
        return true;
    }

    fromJSONObject(url) {
        return new FutureTask({
            callable: new Callable({
                compute: (onComplete) => {
                    new HTTPConnection({
                        url: url,
                        method: HTTPMessage.GET,
                        responseType: HTTPMessage.JSON,
                        handler: {
                            onHandleRequest: (event) => {
                                let type = event.type;
                                let response = event.response;
                                if (type === "loadend") {
                                    if (!response.hasError()) {
                                        this.setProperties(response.getMessageBody());
                                    }
                                    onComplete(this);
                                }
                            }
                        },
                        autostart: true
                    });
                }
            })
        });
    }

    getInternals() {
        return this.mInternals;
    }

    getInternalsProperty(key) {
        if (key) {
            return this.mInternals[key];
        }
        return null;
    }

    getKeys(filter) {
        return null;
    }

    getProperties(filter) {
        let properties = {};
        let ctr = this.constructor;
        let keys = this.getKeys(filter);
        let len = keys.length;
        for (let i = 0; i < len; i++) {
            let key = keys[i];
            properties[key] = this[key];
        }
        return properties;
    }

    getProperty(key) {
        if (key) {
            return this[key];
        }
        return null;
    }

    getPropertyType(key) {
        if (key) {
            let value = this[key];
            if (value !== null && value !== undefined) {
                return value.constructor;
            }
        }
        return null;
    }

    getValues(withoutId = true) {
        let values = [];
        let keys = this.getKeys(withoutId);
        let len = keys.length;
        for (let i = 0; i < len; i++) {
            values.push(this[keys[i]]);
        }
        return values;
    }

    parseProperties(properties) {
        if (properties) {
            if (typeof properties === "string") {
                properties = JSON.parse(properties);
            }
            this.setProperties(properties);
        }
    }

    setInternals(properties) {
        if (properties) {
            for (let p in properties) {
                if (properties.hasOwnProperty(p)) {
                    this.setInternalProperty(p, properties[p]);
                }
            }
        }
    }

    setInternalProperty(key, value) {
        if (!this.mInternals) {
            this.mInternals = {};
        }
        this.mInternals[key] = value;
    }

    setProperties(properties) {
        if (properties) {
            let changeCount = 0;
            for (let key in properties) {
                if (properties.hasOwnProperty(key)) {
                    if (this.containsKey(key)) {
                        this[key] = properties[key];
                        changeCount++;
                    } else {
                        this.setInternalProperty(key, properties[key]);
                    }
                }
            }
            if (changeCount > 0) {
                this.setChanged();
            }
        }
    }

    setProperty(key, value) {
        let changeCount = 0;
        if (key) {
            if (this.containsKey(key)) {
                this[key] = value;
            } else {
                this.setInternalProperty(key, value);
            }
        }
        if (changeCount > 0) {
            this.setChanged();
        }
    }

    toJSONObject() {
        let obj = this.getProperties();
        return JSON.stringify(obj, null, 4);
    }

    toString() {
        return this.toJSONObject();
    }
}

export class SQLiteModel extends Model {

    constructor() {
        super();
    }

    compare(entity1, entity2) {
        let _id1 = entity1.getProperty(BaseColumns._ID);
        let _id2 = entity2.getProperty(BaseColumns._ID);
        return _id1 < _id2 ? -1 : _id1 > _id2 ? 1 : 0;
    }

    compareTo(entity) {
        let _id1 = entity.getProperty(BaseColumns._ID);
        let _id2 = entity.getProperty(BaseColumns._ID);
        return _id1 < _id2 ? -1 : _id1 > _id2 ? 1 : 0;
    }

    getKeys(withoutId = true) {
        let columnNames = this.getTable().getColumnNames();
        let result = columnNames.filter((key, index, columnNames) => {
            return !(withoutId && key === BaseColumns._ID);
        });
        return result;
    }

    getPropertyInfo(name) {
        return this.getTable().getColumnInfoByName(name);
    }

    getPropertyInfoAt(index) {
        return this.getTable().getColumnInfo(index);
    }

    getTable() {
        return null;
    }

    getTableName() {
        return null;
    }

    getValues(withoutId = true) {
        let values = [];
        let keys = this.getKeys(withoutId);
        let len = keys.length;
        for (let i = 0; i < len; i++) {
            values.push(this[keys[i]]);
        }
        return values;
    }

    toString() {
        let buffer = "";
        let index = 0;
        let properties = this.getProperties();
        let len = DatabaseUtils.countValues(properties);
        buffer += this.constructor.name + "{\n";
        for (let p in properties) {
            if (properties.hasOwnProperty(p)) {
                buffer += p + "=" + (properties[p] ? properties[p] : "null");
                if (index < len - 1) {
                    buffer += ",\n";
                }
                index++;
            }
        }
        return buffer += "}";
    }
}