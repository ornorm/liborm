/** @babel */
import * as char from "hjs-core/lib/char";
import * as type from "hjs-core/lib/type";

import {BaseColumns, TableInfo} from "libsqlite/lib/helper";
import {SQLiteModel} from "./model";

const ENTITIES = {};

let GENERATED = false;

export const Entity = {

    generate() {
        if (!GENERATED) {
            let tables = TableInfo.getTables();
            for (let tableName in tables) {
                if (tables.hasOwnProperty(tableName)) {
                    let table = tables[tableName];
                    if (!ENTITIES[tableName]) {
                        let type = this.generateCtr(tableName);
                        let proto = this.generateProto(type, table);
                        let proto = this.generateMembers(table, proto);
                        ENTITIES[tableName] = this.generateClass(table, proto);
                    }
                }
            }
            GENERATED = true;
        }
    },

    generateCtr(name) {
        let ctrName = char.camelify(name);
        let F = new Function("return function " + ctrName + "(){" + ctrName + ".superclass.call(this); }");
        return F();
    },

    generateField(name, proto) {
        proto[name] = null;
        return proto;
    },

    generateGetter(name, proto) {
        let methodName = char.asCamelifyGetMethod(name);
        let M = new Function("return function " + methodName + "(){ return this." + name + "; }");
        proto[methodName] = M();
        return proto;
    },

    generateClass(table, proto) {
        let C = type.Class.extend(proto);
        C.table = table;
        return C;
    },

    generateMembers(table, proto) {
        let columns = table.getColumnNames();
        let len = columns.length;
        while (len--) {
            let field = columns[len];
            if (field === BaseColumns._ID) {
                continue;
            }
            proto = this.generateField(field, proto);
            proto = this.generateGetter(field, proto);
            proto = this.generateSetter(field, proto);
        }
        return proto;
    },

    generateProto(type, table) {
        return {
            extends: SQLiteModel,
            constructor: type,
            getTable: function getTable() {
                return this.constructor.table;
            },
            getTableName: function getTableName() {
                return this.getTable().getTableName();
            }
        };
    },

    generateSetter(name, proto) {
        let methodName = char.asCamelifySetMethod(name);
        let M = new Function("return function " + methodName + "(value){ this." + name + " = value; }");
        proto[methodName] = M();
        return proto;
    },

    getTableClass(table) {
        let type = ENTITIES[table];
        if (type) {
            return type;
        }
        return null;
    },

    getTableInstance(table) {
        let type = this.getTableClass(table);
        if (type) {
            return new type();
        }
        return null;
    },

    isGenerated() {
        return GENERATED;
    }

};
