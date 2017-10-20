/** @babel */
import {DatabaseUtils} from "libsqlite/lib/helper";
import {Cursor, SQLiteCursor} from "libsqlite/lib/cursor";
import {Entity} from "./entity";

export class SQLiteResult extends Cursor {

    constructor({entity,resultSet={}}={}) {
        super();
        if (!entity) {
            throw new ReferenceError("IllegalArgumentException entity object cannot be null");
        }
        if (!resultSet) {
            throw new ReferenceError("IllegalArgumentException resultSet object cannot be null");
        }
        this.mEditTable = entity.getTableName();
        this.mColumnNameMap = null;
        this.mEntity = entity;
        this.mResultSet = resultSet;
        this.mColumns = this.mEntity.getKeys();
        if (!this.mColumnNameMap) {
            let map = {};
            let columns = this.mColumns;
            let columnCount = columns.length;
            while (columnCount--) {
                map[columns[columnCount]] = columnCount;
            }
            this.mColumnNameMap = map;

        }
    }

    fillWindow(requiredPos=0) {
        let len = this.mResultSet.rows.length;
        if (this.mCount === SQLiteCursor.NO_COUNT) {
            let num = len;
            let item = null;
            this.mRows = [];
            let rows = this.mResultSet.rows;
            for (let i = requiredPos; i < len; i++) {
                item = rows.item(i);
                if (item) {
                    this.mRows[i] = item;
                } else {
                    num--;
                }
            }
            this.mCount = num;
        } else {
            this.mCount = len - requiredPos;
            this.mRows = this.mRows.splice(requiredPos, this.mCount);
        }
        console.log("received count(*) from fillWindow: " + this.mCount);
    }

    getBlob(columnIndex=0) {
        this.checkPosition();
        return this.getValue(columnIndex);
    }

    getColumnIndex(columnName="") {
        let periodIndex = columnName.lastIndexOf('.');
        if (periodIndex !== -1) {
            console.log("requesting column name with table name -- " + columnName);
            columnName = columnName.substring(periodIndex + 1);
        }
        let i = this.mColumnNameMap[columnName];
        if (i !== null && i !== undefined) {
            return i;
        }
        return -1;
    }

    getColumnNames() {
        return this.mColumns;
    }

    getCount() {
        if (this.mCount === SQLiteCursor.NO_COUNT) {
            this.fillWindow(0);
        }
        return this.mCount;
    }

    getDouble(columnIndex=0) {
        this.checkPosition();
        return this.getValue(columnIndex);
    }

    getFloat(columnIndex=0) {
        this.checkPosition();
        return this.getValue(columnIndex);
    }

    getInsertedId() {
        return this.mResultSet.insertId;
    }

    getInt(columnIndex=0) {
        this.checkPosition();
        return this.getValue(columnIndex);
    }

    getLong(columnIndex=0) {
        this.checkPosition();
        return this.getValue(columnIndex);
    }

    getRowsAffected() {
        return this.mResultSet.rowsAffected;
    }

    getRowValue() {
        return this.mRows[this.mPos];
    }

    getShort(columnIndex=0) {
        this.checkPosition();
        return this.getValue(columnIndex);
    }

    getString(columnIndex=0) {
        this.checkPosition();
        return this.getValue(columnIndex);
    }

    getType(columnIndex=0) {
        this.checkPosition();
        return DatabaseUtils.getTypeOfObject(this.getValue(columnIndex));
    }

    getValue(columnIndex=0) {
        let row = this.mRows[this.mPos];
        return row[this.mColumns[columnIndex]];
    }

    hasChanged() {
        return this.getRowsAffected() > 0;
    }

    isBlob(columnIndex=0) {
        return this.getType(columnIndex) === Cursor.FIELD_TYPE_BLOB;
    }

    isInt(columnIndex=0) {
        return this.getType(columnIndex) === Cursor.FIELD_TYPE_INTEGER;
    }

    isNull(columnIndex=0) {
        return this.getType(columnIndex) === Cursor.FIELD_TYPE_NULL;
    }

    isString(columnIndex=0) {
        return this.getType(columnIndex) === Cursor.FIELD_TYPE_STRING;
    }

    newEntity() {
        let entity = Entity.getTableInstance(this.mEditTable);
        for(let p in this.mColumnNameMap) {
            if (this.mColumnNameMap.hasOwnProperty(p)) {
                let value = this.getValue(this.mColumnNameMap[p]);
                if (value) {
                    entity.setProperty(p, value);
                }
            }
        }
        return entity;
    }

    newRowEntity() {
        let row = {};
        for(let p in this.mColumnNameMap) {
            if (this.mColumnNameMap.hasOwnProperty(p)) {
                let value = this.getValue(this.mColumnNameMap[p]);
                if (value) {
                    row[p] = value;
                }
            }
        }
        return row;
    }

    newRowValue() {
        let row = {};
        let rowResult = this.getRowValue();
        for(let p in rowResult) {
            if (rowResult.hasOwnProperty(p)) {
                let value = rowResult[p];
                if (value) {
                    row[p] = value;
                }
            }
        }
        return row;
    }

    onMove(oldPosition=-1, newPosition=0) {
        if (!this.mRows || newPosition >= this.mRows.length) {
            this.fillWindow(newPosition);
        }
        return true;
    }

    requery() {
        if (this.mRows) {
            this.mRows = [];
        }
        this.mPos = -1;
        this.mCount = SQLiteCursor.NO_COUNT;
    }

    setWindow(resultSet={}) {
        this.mResultSet = resultSet;
        this.mCount = SQLiteCursor.NO_COUNT;
    }

}
