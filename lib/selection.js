/** @babel */
import {SQLiteDatabase} from "libsqlite/lib/sqlite";

let SELECTION_COUNTER = 0;

export class Selection {

    constructor({model = null, name = null} = {}) {
        this.mSelectedObject = null;
        this.mActive = false;
        if (model && name) {
            this.mModel = model;
            this.mName = name;
        } else {
            this.mName = this.constructor.name + "-" + SELECTION_COUNTER;
        }
        this.mIndex = -1;
        SELECTION_COUNTER++;
    }

    getIndex() {
        return this.mIndex;
    }

    getIndexedName() {
        return this.mName + "-" + this.getIndex();
    }

    getModel() {
        return this.mModel;
    }

    getName() {
        return this.mName;
    }

    getSelectedObject() {
        return this.mSelectedObject;
    }

    isActive() {
        return this.mActive;
    }

    recycle() {
        this.mActive = false;
        this.mSelectedObject = null;
    }

    select() {
        return null;
    }

    setModel(model) {
        this.mModel = model;
    }

    toString() {
        let selected = this.mSelectedObject || {};
        let query = selected["query"];
        let values = selected["values"];
        let buffer = "Selection[";
        buffer += "\nname:" + this.mName;
        buffer += "\nindex:" + this.mIndex;
        buffer += ",\nactive:" + this.mActive;
        buffer += ",\nquery" + (query ? query : "");
        buffer += ",\nvalues[" + (values && values.length ? values.join(",") : "") + "]";
        buffer += ",\nmodel:" + (this.mModel ? this.mModel.constructor.name : "<unknown>");
        buffer += "\n]";
        return buffer;
    }
}

export class SQLiteSelection extends Selection {

    constructor({model = null, name = null, ignoreId = true} = {}) {
        super({model, name});
        this.mIgnoreId = ignoreId;
    }

    isIgnoreId() {
        return this.mIgnoreId;
    }

    toString() {
        let selected = this.mSelectedObject || {};
        let query = selected["query"];
        let values = selected["values"];
        let buffer = "SQLiteSelection[";
        buffer += "\nname:" + this.mName;
        buffer += "\nindex:" + this.mIndex;
        buffer += ",\nactive:" + this.mActive;
        buffer += ",\nignoreId:" + this.mIgnoreId;
        buffer += ",\nquery:" + (query ? query : "");
        buffer += ",\nvalues[" + (values && values.length ? values.join(",") : "") + "]";
        buffer += ",\nmodel:" + (this.mModel ? this.mModel.getTableName() : "<unknown>");
        buffer += "\n]";
        return buffer;
    }
}

export class Drop extends SQLiteSelection {

    constructor({model = null, name = null, ignoreId = true} = {}) {
        super({model, name, ignoreId});
    }

    select() {
        if (!this.mActive) {
            this.mActive = true;
            let entity = this.mModel;
            let query = "DROP TABLE IF EXISTS " + entity.getTableName() + ";";
            console.log(query);
            this.mSelectedObject = {
                query: query,
                values: []
            };
        }
        return this.mSelectedObject;
    }

    toString() {
        var selected = this.mSelectedObject || {};
        var query = selected["query"];
        var values = selected["values"];
        var buffer = "Drop[";
        buffer += "\nindex:" + this.mIndex;
        buffer += ",\nactive:" + this.mActive;
        buffer += ",\nquery:" + (query ? query : "");
        buffer += ",\nmodel:" + (this.mModel ? this.mModel.getTableName() : "<unknown>");
        buffer += "\n]";
        return buffer;
    }

}

export class Insert extends SQLiteSelection {

    constructor({model = null, name = null, ignoreId = true, conflictAlgorithm = 0} = {}) {
        super({model, name, ignoreId});
        this.mConflictAlgorithm = conflictAlgorithm;
    }

    select() {
        if (!this.mActive) {
            this.mActive = true;
            let entity = this.mModel;
            let ignoreId = this.mIgnoreId;
            let values = entity.getValues(ignoreId);
            let keys = entity.getKeys(ignoreId);
            let query = "INSERT" + SQLiteDatabase.CONFLICT_VALUES[this.mConflictAlgorithm] + " INTO " +
                entity.getTableName() + '(';
            if (values.length) {
                query += keys.join(",") + ") VALUES(";
                for (let j = 0; j < n; j++) {
                    query += (j > 0) ? ",?" : "?";
                }
            } else {
                query += keys.join(",") + ") VALUES(";
                for (let j = 0; j < keys.length; j++) {
                    query += (j > 0) ? ",NULL" : "NULL";
                }
            }
            query += ")";
            console.log(query);
            this.mSelectedObject = {
                query: query,
                values: values
            }
        }
        return this.mSelectedObject;
    }

    toString() {
        let selected = this.mSelectedObject || {};
        let query = selected["query"];
        let values = selected["values"];
        let buffer = "Insert[";
        buffer += "\nname:" + this.mName;
        buffer += "\nindex:" + this.mIndex;
        buffer += ",\nactive:" + this.mActive;
        buffer += ",\nignoreId:" + this.mIgnoreId;
        buffer += ",\nconflictAlgorithm:" + this.mConflictAlgorithm;
        buffer += ",\nquery:" + (query ? query : "");
        buffer += ",\nvalues[" + (values && values.length ? values.join(",") : "") + "]";
        buffer += ",\nmodel:" + (this.mModel ? this.mModel.getTableName() : "<unknown>");
        buffer += "\n]";
        return buffer;
    }
}

export class Delete extends SQLiteSelection {

    constructor({model = null, name = null, ignoreId = true, whereAlgorithm = null} = {}) {
        super({model, name, ignoreId});
        this.mWhereAlgorithm = whereAlgorithm;
    }

    select() {
        if (!this.mActive) {
            this.mActive = true;
            let entity = this.mModel;
            let ignoreId = this.mIgnoreId;
            let values = entity.getValues(ignoreId);
            let keys = entity.getKeys(ignoreId);
            let bindArgs = null;
            let query = "DELETE FROM " + entity.getTableName();
            if (this.mWhereAlgorithm) {
                if (typeof this.mWhereAlgorithm === "string") {
                    query += " WHERE ";
                    if (this.mWhereAlgorithm === "&") {
                        query += keys.join("= ? AND");
                        query += "= ?";
                        bindArgs = values;
                    } else if (this.mWhereAlgorithm === "OR") {
                        query += keys.join("= ? OR");
                        query += "= ?";
                        bindArgs = values;
                    } else {
                        query += this.mWhereAlgorithm;
                    }
                } else if (this.mWhereAlgorithm.constructor === Object) {
                    if (this.mWhereAlgorithm["clause"]) {
                        query += " WHERE ";
                        query += this.mWhereAlgorithm["clause"];
                        bindArgs = this.mWhereAlgorithm["bindArgs"];
                        if (this.mWhereAlgorithm["in"]) {
                            query += " IN (";
                            let len = bindArgs.length;
                            if (len > 0) {
                                while (len--) {
                                    if (len === 0) {
                                        query += "?";
                                    } else {
                                        query += "?,";
                                    }
                                }
                            }
                            query += ")";
                        } else if (this.mWhereAlgorithm["not_in"]) {
                            query += " NOT IN (";
                            let len = bindArgs.length;
                            if (len > 0) {
                                while (len--) {
                                    if (len === 0) {
                                        query += "?";
                                    } else {
                                        query += "?,";
                                    }
                                }
                            }
                            query += ")";
                        }
                    } else {
                        throw new TypeError("Unreconized where clause " + this.mWhereAlgorithm);
                    }
                }
            }
            console.log(query);
            this.mSelectedObject = {
                query: query,
                values: bindArgs || []
            }
        }
        return this.mSelectedObject;
    }

    toString() {
        let selected = this.mSelectedObject || {};
        let query = selected["query"];
        let values = selected["values"];
        let buffer = "Delete[";
        buffer += "\nindex:" + this.mIndex;
        buffer += ",\nactive:" + this.mActive;
        buffer += ",\nignoreId:" + this.mIgnoreId;
        buffer += ",\nwhereAlgorithm:" + (this.mWhereAlgorithm || "none");
        buffer += ",\nquery:" + (query ? query : "");
        buffer += ",\nvalues[" + (values && values.length ? values.join(",") : "") + "]";
        buffer += ",\nmodel:" + (this.mModel ? this.mModel.getTableName() : "<unknown>");
        buffer += "\n]";
        return buffer;
    }
}

export class Update extends SQLiteSelection {

    constructor({model = null, name = null, ignoreId = true, updateAlgorithm = "*", whereAlgorithm = null} = {}) {
        super({model, name, ignoreId});
        this.whereAlgorithm = whereAlgorithm;
        this.mUpdateAlgorithm = updateAlgorithm;
    }

    select() {
        if (!this.mActive) {
            this.mActive = true;
            let entity = this.mModel;
            let ignoreId = this.mIgnoreId;
            let values = entity.getValues(ignoreId);
            let keys = entity.getKeys(ignoreId);
            let updateClause = null;
            let bindArgs = null;
            if (!this.mUpdateAlgorithm) {
                this.mUpdateAlgorithm = keys.join(",");
            } else {
                if (Array.isArray(this.mUpdateAlgorithm)) {
                    updateClause = this.mUpdateAlgorithm.join(",");
                } else if (typeof this.mUpdateAlgorithm === "string") {
                    updateClause = this.mUpdateAlgorithm;
                } else if (this.mUpdateAlgorithm.constructor === Object) {
                    if (this.mUpdateAlgorithm["clause"] !== null) {
                        if (typeof this.mUpdateAlgorithm["clause"] === "string") {
                            updateClause = this.mUpdateAlgorithm["clause"];
                        } else if (this.mUpdateAlgorithm["clause"].constructor === Object &&
                            this.mUpdateAlgorithm["clause"].CASE !== null) {
                            var CASE = this.mUpdateAlgorithm["clause"].CASE;
                            var TNAME = entity.getTableName();
                            var index = 0;
                            updateClause = "";
                            for (let p in CASE) {
                                if (CASE.hasOwnProperty(p)) {
                                    if (index > 0) {
                                        updateClause += ", ";
                                    }
                                    updateClause += p + "=CASE";
                                    let WHEN = CASE[p].WHEN;
                                    for (let w in WHEN) {
                                        if (WHEN.hasOwnProperty(w)) {
                                            if (w !== "THEN") {
                                                let THEN = WHEN["THEN"];
                                                let fields = WHEN[w];
                                                len = fields.length;
                                                for (let i = 0; i < len; i++) {
                                                    updateClause += " WHEN " + w + "=" + "'" + fields[i] + "'";
                                                    updateClause += " THEN " + "'" + THEN[i] + "'";
                                                }
                                            }
                                        }
                                    }
                                    updateClause += " END";
                                    index++;
                                }
                            }
                        }
                    } else {
                        let alg = "";
                        for (let p in this.mUpdateAlgorithm) {
                            alg += p + "=" + this.mUpdateAlgorithm[p] + ",";
                        }
                        updateClause = this.mUpdateAlgorithm = alg.substring(0, alg.length - 1);
                    }
                } else {
                    throw new TypeError("Unreconized update clause " + this.mUpdateAlgorithm);
                }
            }
            let query = "UPDATE " + entity.getTableName() + " SET " + updateClause;
            if (this.whereAlgorithm) {
                if (typeof this.mWhereAlgorithm === "string") {
                    query += " WHERE ";
                    if (this.mWhereAlgorithm === "&") {
                        query += keys.join("= ? AND");
                        query += "= ?";
                        bindArgs = values;
                    } else if (this.mWhereAlgorithm === "OR") {
                        query += keys.join("= ? OR");
                        query += "= ?";
                        bindArgs = values;
                    } else {
                        query += this.mWhereAlgorithm;
                    }
                } else if (this.mWhereAlgorithm.constructor === Object) {
                    if (this.mWhereAlgorithm["inner_join"]) {
                        if (Array.isArray(this.mWhereAlgorithm["inner_join"]) &&
                            Array.isArray(this.mWhereAlgorithm["on"])) {
                            let inner_join = this.mWhereAlgorithm["inner_join"];
                            let on = this.mWhereAlgorithm["on"];
                            let len = inner_join.length;
                            for (let i = 0; i < len; i++) {
                                query += " INNER JOIN " + inner_join[i];
                                if (on[i]) {
                                    query += " ON " + on[i];
                                }
                            }
                        } else {
                            query += " INNER JOIN " + this.mWhereAlgorithm["inner_join"];
                            if (this.mWhereAlgorithm["on"]) {
                                query += " ON " + this.mWhereAlgorithm["on"];
                            }
                        }
                    } else if (this.mWhereAlgorithm["left_join"]) {
                        if (Array.isArray(this.mWhereAlgorithm["left_join"]) &&
                            Array.isArray(this.mWhereAlgorithm["on"])) {
                            let inner_join = this.mWhereAlgorithm["left_join"];
                            let on = this.mWhereAlgorithm["on"];
                            let len = inner_join.length;
                            for (let i = 0; i < len; i++) {
                                query += " LEFT JOIN " + inner_join[i];
                                if (on[i]) {
                                    query += " ON " + on[i];
                                }
                            }
                        } else {
                            query += " LEFT JOIN " + this.mWhereAlgorithm["left_join"];
                            if (this.mWhereAlgorithm["on"]) {
                                query += " ON " + this.mWhereAlgorithm["on"];
                            }
                        }
                    }
                    if (this.mWhereAlgorithm["clause"]) {
                        query += " WHERE ";
                        query += this.mWhereAlgorithm["clause"];
                        bindArgs = this.mWhereAlgorithm["bindArgs"];
                        if (this.mWhereAlgorithm["in"]) {
                            query += " IN (";
                            let len = bindArgs.length;
                            if (len > 0) {
                                while (len--) {
                                    if (len === 0) {
                                        query += "?";
                                    } else {
                                        query += "?,";
                                    }
                                }
                            }
                            query += ")";
                        } else if (this.mWhereAlgorithm["not_in"]) {
                            query += " NOT IN (";
                            let len = bindArgs.length;
                            if (len > 0) {
                                while (len--) {
                                    if (len === 0) {
                                        query += "?";
                                    } else {
                                        query += "?,";
                                    }
                                }
                            }
                            query += ")";
                        }
                    } else {
                        throw new TypeError("Unreconized where clause " + this.mWhereAlgorithm);
                    }
                }
            }
            console.log(query);
            this.mSelectedObject = {
                query: query,
                values: bindArgs || []
            }
        }
        return this.mSelectedObject;
    }

    toString() {
        let selected = this.mSelectedObject || {};
        let query = selected["query"];
        let values = selected["values"];
        let buffer = "Update[";
        buffer += "\nindex:" + this.mIndex;
        buffer += ",\nactive:" + this.mActive;
        buffer += ",\nignoreId:" + this.mIgnoreId;
        buffer += ",\nupdateAlgorithm:" + this.mUpdateAlgorithm || "none";
        buffer += ",\nwhereAlgorithm:" + this.mWhereAlgorithm || "none";
        buffer += ",\nquery:" + (query ? query : "");
        buffer += ",\nvalues[" + (values && values.length ? values.join(",") : "") + "]";
        buffer += ",\nentity:" + (this.mModel ? this.mModel.getTableName() : "<unknown>");
        buffer += "\n]";
        return buffer;
    }
}

export class Select extends SQLiteSelection {

    constructor({model = null, name = null, ignoreId = true, selectAlgorithm = "*", whereAlgorithm = null} = {}) {
        super({model, name, ignoreId});
        this.whereAlgorithm = whereAlgorithm;
        this.mSelectAlgorithm = selectAlgorithm;
    }

    select() {
        if (!this.mActive) {
            this.mActive = true;
            let entity = this.mModel;
            let ignoreId = this.mIgnoreId;
            let values = entity.getValues(ignoreId);
            let keys = entity.getKeys(ignoreId);
            let bindArgs = null;
            let selectClause = null;
            if (!this.mSelectAlgorithm) {
                this.mSelectAlgorithm = keys.join(",");
            } else {
                if (Array.isArray(this.mSelectAlgorithm)) {
                    selectClause = this.mSelectAlgorithm.join(",");
                } else if (typeof this.mSelectAlgorithm === "string") {
                    selectClause = this.mSelectAlgorithm;
                } else {
                    throw new TypeError("Unreconized select clause " + this.mSelectAlgorithm);
                }
            }
            let query = "SELECT " + selectClause + " FROM " + entity.getTableName();
            if (this.mWhereAlgorithm) {
                if (typeof this.mWhereAlgorithm === "string") {
                    query += " WHERE ";
                    if (this.mWhereAlgorithm === "&") {
                        query += keys.join("= ? AND");
                        query += "= ?";
                        bindArgs = values;
                    } else if (this.mWhereAlgorithm === "OR") {
                        query += keys.join("= ? OR");
                        query += "= ?";
                        bindArgs = values;
                    } else {
                        query += this.mWhereAlgorithm;
                    }
                } else if (this.mWhereAlgorithm.constructor === Object) {
                    if (this.mWhereAlgorithm["inner_join"]) {
                        if (Array.isArray(this.mWhereAlgorithm["inner_join"]) &&
                            Array.isArray(this.mWhereAlgorithm["on"])) {
                            let inner_join = this.mWhereAlgorithm["inner_join"];
                            let on = this.mWhereAlgorithm["on"];
                            let len = inner_join.length;
                            for (let i = 0; i < len; i++) {
                                query += " INNER JOIN " + inner_join[i];
                                if (on[i]) {
                                    query += " ON " + on[i];
                                }
                            }
                        } else {
                            query += " INNER JOIN " + this.mWhereAlgorithm["inner_join"];
                            if (this.mWhereAlgorithm["on"]) {
                                query += " ON " + this.mWhereAlgorithm["on"];
                            }
                        }
                    } else if (this.mWhereAlgorithm["left_join"]) {
                        if (Array.isArray(this.mWhereAlgorithm["left_join"]) &&
                            Array.isArray(this.mWhereAlgorithm["on"])) {
                            let inner_join = this.mWhereAlgorithm["left_join"];
                            let on = this.mWhereAlgorithm["on"];
                            let len = inner_join.length;
                            for (let i = 0; i < len; i++) {
                                query += " LEFT JOIN " + inner_join[i];
                                if (on[i]) {
                                    query += " ON " + on[i];
                                }
                            }
                        } else {
                            query += " LEFT JOIN " + this.mWhereAlgorithm["left_join"];
                            if (this.mWhereAlgorithm["on"]) {
                                query += " ON " + this.mWhereAlgorithm["on"];
                            }
                        }
                    }
                    if (this.mWhereAlgorithm["clause"]) {
                        query += " WHERE ";
                        query += this.mWhereAlgorithm["clause"];
                        bindArgs = this.mWhereAlgorithm["bindArgs"];
                        if (this.mWhereAlgorithm["in"]) {
                            query += " IN (";
                            let len = bindArgs.length;
                            if (len > 0) {
                                while (len--) {
                                    if (len === 0) {
                                        query += "?";
                                    } else {
                                        query += "?,";
                                    }
                                }
                            }
                            query += ")";
                        } else if (this.mWhereAlgorithm["not_in"]) {
                            query += " NOT IN (";
                            let len = bindArgs.length;
                            if (len > 0) {
                                while (len--) {
                                    if (len === 0) {
                                        query += "?";
                                    } else {
                                        query += "?,";
                                    }
                                }
                            }
                            query += ")";
                        }
                    } else {
                        throw new TypeError("Unreconized where clause " + this.mWhereAlgorithm);
                    }
                    if (this.mWhereAlgorithm["order"]) {
                        query += " ORDER ";
                        query += this.mWhereAlgorithm["order"];
                    }
                }
            }
            console.log(query);
            this.mSelectedObject = {
                query: query,
                values: bindArgs || []
            };
        }
        return this.mSelectedObject;
    }

    toString() {
        let selected = this.mSelectedObject || {};
        let query = selected["sql"];
        let values = selected["values"];
        let buffer = "Select[";
        buffer += "\nindex:" + this.mIndex;
        buffer += ",\nactive:" + this.mActive;
        buffer += ",\nignoreId:" + this.mIgnoreId;
        buffer += ",\nselectAlgorithm:" + this.mSelectAlgorithm || "none";
        buffer += ",\nwhereAlgorithm:" + this.mWhereAlgorithm || "none";
        buffer += ",\nsql:" + (query ? query : "");
        buffer += ",\nvalues[" + (values && values.length ? values.join(",") : "") + "]";
        buffer += ",\nentity:" + (this.mModel ? this.mModel.getTableName() : "<unknown>");
        buffer += "\n]";
        return buffer;
    }
}