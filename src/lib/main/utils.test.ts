import { describe, expect, it } from 'vitest';
import { hash } from './util.ts';

describe( 'utils', () => {
	describe( 'hash', () => {
		it( 'returns the hash for the string `undefined` for the undefined type', () => {
			const a = hash();
			const aa = hash( undefined );
			expect( a ).toEqual( expect.any( String ) );
			expect( a ).toBe( aa );
		} );
		it( 'returns the hash for function toString for functions', () => {
			expect(hash(()=>{})).toEqual( expect.any( String ) );
		} );
		it( 'returns null unhashed', () => expect( null ).toBeNull() );
	} );
} );
