/** @babel */
import {MILLISECONDS} from "hjs-core/lib/time";
import {ActionEvent, ActionListener} from "eventslib/lib/action";
import {EventListenerAggregate} from "eventslib/lib/aggregate";
import {LinkedList} from "hjs-collection/lib/list";
import {SQLiteResult} from "./cursor";

export class Command {

    constructor({context = null, execute = null}) {
        this.mReceivers = new EventListenerAggregate(ActionListener);
        if (context) {
            this.mContext = context;
        }
        if (execute) {
            this.execute = this.execute;
        }
    }

    addReceiver(receiver) {
        this.mReceivers.add(receiver);
        return this;
    }

    execute() {
        return null;
    }

    unexecute() {
        return null;
    }

    getContext() {
        return this.mContext;
    }

    notifyReceivers(event) {
        let listeners = this.mPropListeners.getListenersInternal();
        for (const listener of listeners) {
            listener.actionPerformed(event);
        }
    }

    removeReceiver(receiver) {
        this.mReceivers.remove(receiver);
        return this;
    }

    setContext(context) {
        this.mContext = context;
    }
}

export class CommandReceiver extends ActionListener {

    constructor({actionPerformed = null} = {}) {
        super({actionPerformed});
    }

}

export class SelectionCommand extends Command {

    constructor({context = null, execute = null, onSuccess = null, onError = null}) {
        super({context, execute});
        this.mProcessing = false;
        if (onSuccess) {
            this.onSuccess = this.onSuccess;
        }
        if (onError) {
            this.onError = this.onError;
        }
    }

    addSelection(selection) {
        return this;
    }

    isComplete() {
        return !this.isProcessing();
    }

    isProcessing() {
        return this.mProcessing;
    }

    onError(selection, error) {

    }

    onSuccess(selection, result) {

    }

    removeSelection(selection) {
        return this;
    }
}

export class SQLiteCommandReceiver extends CommandReceiver {

    constructor({begin = null, commit = null, rollback = null, handler = null} = {}) {
        super();
        if (begin) {
            this.begin = this.begin;
        }
        if (commit) {
            this.commit = this.commit;
        }
        if (rollback) {
            this.rollback = this.rollback;
        }
        if (handler) {
            this.mHandler = this.handler;
        }
    }

    actionPerformed(event) {
        let actionCommand = event.getActionCommand();
        let command = event.getSource();
        let result = actionCommand.result;
        let operation = actionCommand.operation;
        let selection = actionCommand.selection;
        switch (operation) {
            case  SQLiteCommandReceiver.BEGIN:
                this.begin(command, selection);
                break;
            case SQLiteCommandReceiver.COMMIT:
                this.commit(command, selection, result);
                break;
            case SQLiteCommandReceiver.ROLLBACK:
                this.rollback(command, selection, result);
                break;
        }
    }

    begin(command, selection) {
        if (this.mHandler) {
            let msg = this.mHandler.obtainMessage({
                what: SQLiteCommandReceiver.BEGIN,
                obj: {
                    command: command,
                    selection: selection
                }
            });
            if (!this.mHandler.sendMessage(msg)) {

            }
        }
    }

    commit(command, selection, result) {
        if (this.mHandler) {
            let msg = this.mHandler.obtainMessage({
                what: SQLiteCommandReceiver.COMMIT,
                obj: {
                    command: command,
                    selection: selection,
                    result: result
                }
            });
            if (!this.mHandler.sendMessage(msg)) {

            }
        }
    }

    rollback(command, selection, error) {
        if (this.mHandler) {
            let msg = this.mHandler.obtainMessage({
                what: SQLiteCommandReceiver.ROLLBACK,
                obj: {
                    command: command,
                    selection: selection,
                    error: error
                }
            });
            if (!this.mHandler.sendMessage(msg)) {

            }
        }
    }

}
SQLiteCommandReceiver.BEGIN = 0x00000001;
SQLiteCommandReceiver.COMMIT = 0x00000010;
SQLiteCommandReceiver.ROLLBACK = 0x00000100;

export class SQLiteCommand extends SelectionCommand {

    constructor({database = null, timeout = -1} = {}) {
        super();
        this.mDatabase = database;
        this.mTimeout = timeout || SQLiteCommand.WAIT_EXECUTION_TIME;
        this.mSelections = [];
        this.mPendingSelections = [];
        this.mNumSelectionsToConsume = -1;
    }

    addSelection(selections) {
        if (!Array.isArray(selections)) {
            selections = [selections];
        }
        if (!this.isProcessing()) {
            console.log("added " + selections.length + " selection(s) to queue");
            this.mSelections.push(selections);
        } else {
            console.log("pending " + this.mPendingSelections.length + " selection(s) in queue");
            this.mPendingSelections.push(selections);
        }
        return this;
    }

    execute() {
        if (!this.isProcessing()) {
            let len = this.mSelections;
            if (len > 0) {
                let selections = null;
                this.mQueue = new LinkedList();
                for (let i = 0; i < len; i++) {
                    selections = this.mSelections[i];
                    this.mQueue.offer(selections);
                }
                this.mCurrentIndex = 0;
                this.mProcessing = true;
                this.mSelections = [];
                this.executeSelections();
            } else {
                this.mProcessing = false;
            }
        }
        return this;
    }

    executeSelections() {
        if (this.isProcessing()) {
            let selections = this.mQueue.poll();
            console.log(this.mQueue.size() + " pending selection(s)");
            if (selections) {
                this.mPendindExecutions = [];
                this.mDatabase.transaction((tx) => {
                    let selection = null;
                    let selectedObject = null;
                    let len = selections.length;
                    this.mNumSelectionsToConsume = len;
                    for (let i = 0; i < len; i++) {
                        this.mPendindExecutions.unshift(selection = selections[i]);
                        selection.index = i;
                        selectedObject = selection.select();
                        this.notifyReceivers(new ActionEvent({
                            source: this,
                            id: ActionEvent.ACTION_PERFORMED,
                            data: {
                                operation: SQLiteCommandReceiver.BEGIN,
                                selection: selection
                            }
                        }));
                        tx.executeSql(selectedObject["query"], selectedObject["values"],
                            (tx, resultSet) => {
                                this.mNumSelectionsToConsume--;
                                this.onSuccess(this.mPendindExecutions.pop(), resultSet);
                                this.nextSelections(this.mTimeout);
                            },
                            (tx, error) => {
                                this.mNumSelectionsToConsume--;
                                this.onError(this.mPendindExecutions.pop(), error);
                                this.nextSelections(this.mTimeout);
                            });
                    }
                });
            } else {
                this.mCurrentIndex = 0;
                this.mProcessing = false;
                this.mQueue = null;
                this.mSelections = this.mPendingSelections;
                this.mPendingSelections = [];
                this.execute();
            }
        }
    }

    getDatabase() {
        return this.mDatabase;
    }

    getCurrentIndex() {
        return this.mCurrentIndex;
    }

    isComplete() {
        return this.mNumSelectionsToConsume === 0;
    }

    nextSelections(timeout) {
        if (this.isComplete()) {
            this.mCurrentIndex++;
            MILLISECONDS.sleep(this.executeSelections.bind(this), timeout);
        }
    }

    onError(selection, error) {
        this.notifyReceivers(new ActionEvent({
            source: this,
            id: ActionEvent.ACTION_PERFORMED,
            data: {
                operation: SQLiteCommandReceiver.ROLLBACK,
                selection: selection,
                result: error
            }
        }));
    }

    onSuccess(selection, result) {
        this.notifyReceivers(new ActionEvent({
            source: this,
            data: {
                operation: SQLiteCommandReceiver.COMMIT,
                selection: selection,
                result: new SQLiteResult({
                    entity: selection.getModel(),
                    resultSet: result
                })
            }
        }));
    }

    removeSelection(selections) {
        let index = -1;
        if (!this.isProcessing()) {
            index = this.mSelections.indexOf(selections);
            if (index !== -1) {
                this.mSelections.splice(index, 1);
            }
        } else {
            index = this.mPendingSelections.indexOf(selections);
            if (index !== -1) {
                this.mPendingSelections.splice(index, 1);
            }
        }
        return this;
    }
}
SQLiteCommand.WAIT_EXECUTION_TIME = 0;