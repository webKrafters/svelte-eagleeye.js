import { afterAll, beforeAll, describe, expect, it, test, vi } from 'vitest';
import { EagleEyeContext } from '@webkrafters/eagleeye';
import {
	AutoImmutable,
	type IStorage,
	type SelectorMap
} from '../index.ts';
import { SvelteEagleEye } from './base.ts';
import {
	type SourceData
}from '../../lib/test-artifacts/data/create-state-obj.ts';

class TestImpl extends SvelteEagleEye<SourceData> {
	get stream() {
		return <const S extends SelectorMap>(
			ownerDesc : string,
			selectorMap? : S
		) => this.baseStream( selectorMap );
	}
}

describe( 'SvelteEagleEye class', () => {
	let ctx : TestImpl;
	beforeAll(() => {
		ctx = new TestImpl( 'TEST IMPLEMENTATION' );
	});
	afterAll(() => {
		ctx.dispose();
		ctx = null as unknown as TestImpl;
	});
	describe( 'cache property', () => {
		it( 'is readonly', () => {
			// @ts-expect-error
			expect(() => { ctx.cache = new AutoImmutable({}) }).toThrow();
		} );
		it( 'employs only internal cache of the AutoImmutable type', () => {
			expect( ctx.cache ).toBeInstanceOf( AutoImmutable );
		} );
	} );
	describe( 'closed property', () => {
		it( 'is readonly', () => {
			// @ts-expect-error
			expect(() => { ctx.closed = true }).toThrow();
		} );
		it( 'provides context active status', () => {
			const ctx1 = new TestImpl( 'TEST IMPLEMENTATION II' );
			ctx1.dispose();
			expect( ctx1.closed ).toBeTruthy();
			expect( ctx.closed ).toBeFalsy();
		} );
	} );
	describe( 'name property', () => {
		it( 'is readonly', () => {
			// @ts-expect-error
			expect(() => { ctx.name = '' }).toThrow();
		} );
		it( 'provides the name given to the context at creation', () => {
			const ctx1 = new TestImpl( 'TEST IMPLEMENTATION II' );
			expect( ctx1.name ).toBe( 'TEST IMPLEMENTATION II' );
			expect( ctx.name ).toBe( 'TEST IMPLEMENTATION' );
			ctx1.dispose();
		} );
	} );
	describe( 'prehooks property', () => {
		it( 'is writeable', () => {
			expect(() => {
				new TestImpl( expect.any( String ) ).prehooks = {};
			}).not.toThrow();
		} );
		it( 'provides the current prehooks applied by this context', () => {
			const prehooks = {};
			const ctx1 = new TestImpl( 'TEST IMPLEMENTATION II', undefined, prehooks );
			expect( ctx1.prehooks ).toBe( prehooks );
			expect( ctx.prehooks ).toEqual({});
			ctx1.dispose();
		} );
	} );
	describe( 'storage property', () => {
		it( 'is writeable', () => {
			expect(() => {
				new TestImpl( expect.any( String ) ).storage = {
					clone : vi.fn(),
					setItem: vi.fn()
				} as unknown as IStorage<any>;
			}).not.toThrow();
		} );
		it( 'provides the current storage applied by this context', () => {
			const storage = {
				clone : vi.fn(),
				removeItem: vi.fn(),
				setItem: vi.fn()
			} as unknown as IStorage<SourceData>;
			const ctx1 = new TestImpl(
				'TEST IMPLEMENTATION II',
				undefined,
				undefined,
				storage
			);
			expect( ctx1.storage ).toBe( storage );
			expect( ctx.storage ).toBeDefined();
			expect( ctx.storage ).not.toBe( ctx1.storage );
			ctx1.dispose();
		} );
	} );
	describe( 'store property', () => {
		it( 'is readonly', () => {
			// @ts-expect-error
			expect(() => { ctx.store = {} }).toThrow();
		} );
		it( "provides access to the context's global store reference", () => {
			expect( ctx.store ).toEqual({
				getState: expect.any( Function ),
				resetState: expect.any( Function ),
				setState: expect.any( Function ),
				subscribe: expect.any( Function )
			});
		} );
	} );
	describe( 'stream property', () => {
		it( 'is readonly', () => {
			// @ts-expect-error
			expect(() => { ctx.stream = {} }).toThrow();
		} );
		test( 'stream channel generator is an abstract method', () => {
			// @ts-expect-error
			class TestImpl extends SvelteEagleEye<any>{};
			expect( new TestImpl( expect.anything() ).stream ).toBeUndefined();
		} );
	} );
	it( "provides facilities for clean-up activities", () => {
		const ctx = new TestImpl( expect.any( String ) );
		const disposeBase = vi.spyOn( EagleEyeContext.prototype, 'dispose' );
		expect( disposeBase ).not.toHaveBeenCalled();
		ctx.dispose();
		expect( disposeBase ).toHaveBeenCalled();
		disposeBase.mockRestore();
	} );
} );
