import type {
    ContextInfra,
    Data as BaseData,
    IStore,
    ProviderProps,
    RawProviderProps,
    SelectorMap,
    State
} from '@webkrafters/eagleeye';

export type Data<
    S extends SelectorMap = SelectorMap,
    T extends State = State
> = BaseData<S, T>;

export interface Store<
    T extends State = State,
    S extends SelectorMap = SelectorMap
> extends IStore<T> {
    get data() : Data<S, T>
    set selectorMap( selectorMap : S );
}

export type {
    Immutable as AutoImmutable,
    BaseType,
    ClearCommand,
    KeyType,
    MoveCommand,
    PushCommand,
    ReplaceCommand,
    SetCommand,
    SpliceCommand,
    TagCommand,
    TagType,
    UpdateStats,
    UpdatePayload,
    UpdatePayloadArray
} from '@webkrafters/auto-immutable';

export type {
    ArraySelector,
    Changes,
    ContextInfra,
    FullStateSelector,
    IStorage,
    Listener,
    ObjectSelector,
    Prehooks,
    ProviderProps,
    RawProviderProps,
    StoreInternal,
    Store as BaseStore,
    StoreRef,
    Stream as BaseStream,
    Text,
    Unsubscribe
} from '@webkrafters/eagleeye';

export {
    Channel as BaseChannel,
    CLEAR_TAG,
    DELETE_TAG,
    FULL_STATE_SELECTOR,
    MOVE_TAG,
    NULL_SELECTOR,
    PUSH_TAG,
    REPLACE_TAG,
    SET_TAG,
    SPLICE_TAG,
    Tag
} from '@webkrafters/eagleeye';

export type {
    BaseData,
    IStore,
    SelectorMap,
    State
};

export { SvelteEagleEye } from './main/base.ts';
export { BrowserSvelteEagleEye } from './main/browser.ts';
export { MemorySvelteEagleEye } from './main/memory.ts';

export interface IdProps {
    appInstanceId : string; // an arbitrary unique string id assigned by a server application to an incoming request.
	CTX_DESC : string;
}

export interface Props<T extends State> extends ContextInfra<T>, IdProps {
    value? : ( ProviderProps<T>|RawProviderProps<T>)["value"];
}

export {
    type RequestEvent,
    create as createEagleEye,
    DESC_EXISTS,
    discard as discardEagleEye,
    NO_DESC_ENTRY,
    NO_EMPTY_DESC,
    SSRID_REQ,
    UNAVAILABLE_DESC,
    use as useEagleEye,
    VACATED_DESC,
} from './main/index.ts';
