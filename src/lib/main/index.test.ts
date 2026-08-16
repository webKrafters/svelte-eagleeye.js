import {
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	test,
	vi
} from 'vitest';
import {
	allKeysIn,
	create,
	deps,
	discard,
	type Props,
	type RequestGroup,
	type RequestToken,
	type State,
	use
} from './index.ts';
import { SvelteEagleEye } from './base.ts';


const rTokenList : Readonly<Array<RequestToken>> = Object.freeze([
	{ _id: 'req0' },
	{ _id: 'req1' }
]);

const propsList : Readonly<Array<Props<State>>> = Object.freeze([
	{ key: 'ctx0', requestToken: rTokenList[ 0 ] },

	{ key: 'ctx10', requestToken: rTokenList[ 1 ] },
	{ key: 'ctx11', requestToken: rTokenList[ 1 ] },

	{ key: 'ctx1', requestToken: rTokenList[ 0 ] },

	{ key: 'ctx12', requestToken: rTokenList[ 1 ] },

	{ key: 'ctx2', requestToken: rTokenList[ 0 ] },

	{ key: 'ctx3' },

	{ key: 'ctx4', requestToken: rTokenList[ 0 ] },

	{ key: 'ctx16', requestToken: rTokenList[ 1 ] },

	{ key: 'ctx5', requestToken: rTokenList[ 0 ] },

	{ key: 'ctx6' },

	{ key: 'ctx7', requestToken: rTokenList[ 0 ] }
]);

afterEach(() => {
	deps.eagleEyeMap = new WeakMap<RequestToken, RequestGroup>();
});

describe( 'allKeysIn', () => {
	test( 'in browser, lists names of all contexts designated to a particular request', () => {
		const browserSpy = vi
			.spyOn( deps, 'isBrowser' )
			.mockReturnValue( true );
		runSetupFor( 'browser' );
		expect( allKeysIn( rTokenList[ 0 ] ) ).toEqual([
			'ctx0', 'ctx1', 'ctx2', 'ctx4', 'ctx5', 'ctx7'
		]);
		expect( allKeysIn( rTokenList[ 1 ] ) ).toEqual([
			'ctx10', 'ctx11', 'ctx12', 'ctx16'
		]);
		expect( allKeysIn() ).toEqual([ 'ctx3', 'ctx6' ]);
		browserSpy.mockRestore();
	} );
	test( 'in server, lists names of all contexts designated to all named requests', () => {
		runSetupFor( 'server' );
		expect( allKeysIn( rTokenList[ 0 ] ) ).toEqual([
			'ctx0', 'ctx1', 'ctx2', 'ctx4', 'ctx5', 'ctx7'
		]);
		expect( allKeysIn( rTokenList[ 1 ] ) ).toEqual([
			'ctx10', 'ctx11', 'ctx12', 'ctx16'
		]);
	} );
	test( 'in server, fails at attempt to list unnamed requests', () => {
		const browserSpy = vi
			.spyOn( deps, 'isBrowser' )
			.mockReturnValue( false );
		runSetupFor( 'server' );
		expect( allKeysIn( rTokenList[ 0 ] ) ).toEqual([
			'ctx0', 'ctx1', 'ctx2', 'ctx4', 'ctx5', 'ctx7'
		]);
		expect( allKeysIn( rTokenList[ 1 ] ) ).toEqual([
			'ctx10', 'ctx11', 'ctx12', 'ctx16'
		]);
		expect( allKeysIn ).toThrow();
		browserSpy.mockRestore();
	} );
} );

describe( 'create', () => {
	it( 'returns an info object with a property holding the context', () => {
		expect( create( propsList[ 0 ] ) ).toEqual({
			identifier: {
				key: propsList[ 0 ].key,
				requestToken: propsList[ 0 ].requestToken
			},
			value: expect.any( SvelteEagleEye )
		});
	} );
	test( 'in server, must create entry for named requests only', () => {
		const browserSpy = vi
			.spyOn( deps, 'isBrowser' )
			.mockReturnValue( false );
		create( propsList[ 2 ] );
		expect(() => create( propsList[ 6 ] )).toThrow();
		create( propsList[ 8 ] );
		browserSpy.mockRestore();
	} );
	test( 'in browser, can create entry without named request', () => {
		const browserSpy = vi
			.spyOn( deps, 'isBrowser' )
			.mockReturnValue( true );
		create( propsList[ 2 ] );
		create( propsList[ 6 ] );
		create( propsList[ 8 ] );
		browserSpy.mockRestore();
	} );
	test( 'attempt to recreate a context produces the existing one', () => {
		const { value: ctx0 } = create( propsList[ 0 ] );
		const { value: ctx5 } = create( propsList[ 5 ] );
		const { value: ctx00 } = create( propsList[ 0 ] );
		expect( ctx00 ).toBe( ctx0 );
		expect( ctx00 ).not.toEqual( ctx5 );
	} );
	test( 'in server, attempt to override existing context with a different one will be rejected', () => {
		create( propsList[ 0 ] );
		create( propsList[ 5 ] );
		expect(() => {
			create({ ...propsList[ 0 ], prehooks: {} });
		}).toThrow();
	} );
	test( 'in browser, attempt to override existing context in unnamed request with a different one will be rejected', () => {
		const browserSpy = vi
			.spyOn( deps, 'isBrowser' )
			.mockReturnValue( true );
		create( propsList[ 6 ] );
		create( propsList[ 5 ] );
		expect(() => {
			create({ ...propsList[ 6 ], prehooks: {} });
		}).toThrow();
		browserSpy.mockRestore();
	} );
	it( 'throws on attempt to create a new context using existing context identity', () => {
		create( propsList[ 0 ] );
		create( propsList[ 5 ] );
		expect(() => create({ ...propsList[ 0 ], value: {} })).toThrow();
	} );
	it( 'in server, throws on attempt to reuse discarded position', () => {
		const p = propsList[ 0 ];
		expect( use( p ) ).toBeNull();
		const { value : ctx } = create( p );
		expect( use( p ) ).not.toBeNull();
		expect( ctx.closed ).toBeFalsy();
		discard( p );
		expect( ctx.closed ).toBeTruthy();
		expect( use( p ) ).toBeNull();
		let ctx2;
		expect(() => {
			const info = create( p );
			ctx2 = info.value;
		}).toThrow();
		expect( ctx2 ).toBeUndefined();
		expect( ctx.closed ).toBeTruthy();
		expect( use( p ) ).toBeNull();
	} );
	it( 'in browser, throws on attempt to reuse discarded position in unnamed requests', () => {
		const browserSpy = vi
			.spyOn( deps, 'isBrowser' )
			.mockReturnValue( true );
		const p = propsList[ 6 ];
		expect( use( p ) ).toBeNull();
		const { value : ctx } = create( p );
		expect( use( p ) ).not.toBeNull();
		expect( ctx.closed ).toBeFalsy();
		discard( p );
		expect( ctx.closed ).toBeTruthy();
		expect( use( p ) ).toBeNull();
		let ctx2;
		expect(() => {
			const info = create( p );
			ctx2 = info.value;
		}).toThrow();
		expect( ctx2 ).toBeUndefined();
		expect( ctx.closed ).toBeTruthy();
		expect( use( p ) ).toBeNull();
		browserSpy.mockRestore();
	} );
} );

describe( 'discard', () => {
	let props : Props<State>;
	beforeAll(() => {
		props = Object.freeze({
			key: 'TEST_CONTAINER',
			requestToken: {
				_id: 'REQUEST_555-1212'
			}
		});
	});	
	test( 'removes a context from a request', () => {
		const { value: ctx } = create( props );
		expect( use( props ) ).toBe( ctx );
		discard( props );
		expect( use( props ) ).toBeNull();
	} );
	test( 'releases discarded context resources', () => {
		const { value: ctx } = create( props );
		const disposeSpy = vi.spyOn( ctx, 'dispose' );
		expect( disposeSpy ).not.toHaveBeenCalled();
		discard( props );
		expect( disposeSpy ).toHaveBeenCalled();
		disposeSpy.mockRestore();
	} );
	test( 'closes the discarded context', () => {
		const { value: ctx } = create( props );
		expect( ctx.closed ).toBeFalsy();
		discard( props );
		expect( ctx.closed ).toBeTruthy();
	} );
	test( 'retains keys to discarded contexts from further context assignment', () => {
		expect( allKeysIn( props.requestToken ) ).not.toContain( props.key );
		create( props );
		expect( allKeysIn( props.requestToken ) ).toContain( props.key );
		discard( props );
		expect( allKeysIn( props.requestToken ) ).toContain( props.key );
	} );
	test( 'attempt to remove from non-existing request is a noop', () => {
		const disposeSpy = vi.spyOn( SvelteEagleEye.prototype, 'dispose' );
		expect( disposeSpy ).not.toHaveBeenCalled();
		discard( props );
		expect( disposeSpy ).not.toHaveBeenCalled();
		disposeSpy.mockRestore();
	} );
	test( 'attempt to remove non-existent context from a request is a noop', () => {
		const disposeSpy = vi.spyOn( SvelteEagleEye.prototype, 'dispose' );
		expect( disposeSpy ).not.toHaveBeenCalled();
		create( props );
		discard({ ...props, key: 'TEST_CONTAINER II' });
		expect( disposeSpy ).not.toHaveBeenCalled();
		discard( props );
		expect( disposeSpy ).toHaveBeenCalled();
		disposeSpy.mockRestore();
	} );
	test( 'attempt to remove non-existent context from a request is a noop', () => {
		const disposeSpy = vi.spyOn( SvelteEagleEye.prototype, 'dispose' );
		expect( disposeSpy ).not.toHaveBeenCalled();
		create( props );
		discard({ ...props, key: 'TEST_CONTAINER II' });
		expect( disposeSpy ).not.toHaveBeenCalled();
		discard( props );
		expect( disposeSpy ).toHaveBeenCalled();
		disposeSpy.mockRestore();
	} );
	test( 'id-less request token not allowed.', () => {
		expect(() => {
			discard({
			...props,
			requestToken: {} as RequestToken
			})
		}).toThrow();
	} );
	test( 'mutating request token is not allowed.', () => {
		const props = { key: 'TEST_CONTAINER', requestToken: { _id: 'REQUEST_555-1212' } };
		const props2 = { key: 'TEST_CONTAINER', requestToken: { _id: 'REQUEST_555-1212' } };
		create( props );
		create( props2 );
		props2.requestToken._id = 'REQUEST_777-2424';
		expect(() => { discard( props2 ) }).toThrow();
		expect(() => { discard( props ) }).not.toThrow();
	} );
	test( 'Only original request token is permissible for a removal call', () => {
		const props = {
			key: 'TEST_CONTAINER',
			requestToken: { _id: 'REQUEST_555-1212' }
		};
		create( props );
		const propsCopy = { ...props, requestToken: { ...props.requestToken } };
		discard( propsCopy );
		expect( allKeysIn( props.requestToken ) );
		discard( props );
		expect( allKeysIn( props.requestToken ) );
	} );
} );

function runSetupFor( env : 'server' ) : void;
function runSetupFor( env : 'browser' ) : void;
function runSetupFor( env : any ) : void {
	switch( env ) {
		case 'browser': propsList.forEach( create ); break;
		case 'server': propsList
						.filter( p => 'requestToken' in p )
							.forEach( create );
						break;
	}
}
