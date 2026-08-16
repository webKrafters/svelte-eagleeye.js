import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChannelRegistry } from '../index.ts';
import { BrowserChannel } from '../../index.ts'; 
import type {
	SourceData
} from '../../../../../test-artifacts/data/create-state-obj.ts';
import type { BaseStream, SelectorMap } from '../../../../../index.ts';
import Test from './index.svelte';
import { render } from 'vitest-browser-svelte';

export interface Registrar {
	at<const S extends SelectorMap>( selectorMap?: S | undefined ) : BrowserChannel<SourceData, S>
};

class DerivedChannelRegistry extends ChannelRegistry<SourceData> {
	get buckets() { return this.memoBuckets }
}

export class TestRegistrar {
	static reset() { this.channelRegistry = new DerivedChannelRegistry }
	private _register : Registrar;
	private owner : string;
	constructor( ownerDescriptor = 'OWNER_DESC' ) {
		this.owner = ownerDescriptor;
		this._register = TestRegistrar
			.channelRegistry
			.registerStream((() => ({
				addListener: TestRegistrar.noop,
				data: {} as SourceData,
				endStream: TestRegistrar.noop,
				resetState: TestRegistrar.noop,
				removeListener: TestRegistrar.noop,
				setState: TestRegistrar.noop
			})) as unknown as BaseStream<SourceData> )
			.for( this.owner ); // as Registrar;
	}
	get graph() { return TestRegistrar.channelRegistry.buckets }
	get register() { return this._register }
	getChannelEntryAt<S extends SelectorMap>( selectorMap?: S ) {
		return TestRegistrar.channelRegistry.getChannelEntryFor( this.owner ).at( selectorMap );
	}
	getSelectorMapUsers<S extends SelectorMap>( selectorMap?: S ) {
		return TestRegistrar.channelRegistry.getOwnersAt( selectorMap );
	}
	recalibrateChannel<S extends SelectorMap>(
		channel : BrowserChannel<SourceData, S>,
		referenceTarget? : S
	) {
		TestRegistrar.channelRegistry.recalibrateChannel( channel ).against( referenceTarget );
	}
	unregisterChannel<S extends SelectorMap>(
		channel : BrowserChannel<SourceData, S>
	) {
		TestRegistrar.channelRegistry.unregisterChannel( channel );
	}
	private static channelRegistry = new DerivedChannelRegistry;
	private static noop = ()=>{};
}

describe( 'ChannelRegistry class', () => {
	afterEach(() => TestRegistrar.reset());
	describe( 'memoBucket property', () => {
		it( 'produces the underlying storage data structure from derived implementation', () => {
			const recalibrateChannelSpy = vi.spyOn( DerivedChannelRegistry.prototype, 'buckets', 'get' );
			const registrar = new TestRegistrar(); 
			expect( recalibrateChannelSpy ).not.toHaveBeenCalled();
			expect( registrar.graph ).toBeDefined();
			expect( recalibrateChannelSpy ).toHaveBeenCalled();
		} );
	} );
	describe( 'getChannelEntryAt method', () => {
		it( 'retrieves open and closed selector mapped channels', async () => {
			const registrar = new TestRegistrar;
			await render( Test, { registrar } ); // register null selector mapped stream
			const selectorMap = {
				age: 'age',
				fName: 'name.first',
				location: 'history.places[0]'
			};
			await render( Test, { registrar, selectorMap } ); // register a mapped stream
			let channel = registrar!.getChannelEntryAt(); // channel at null selector map
			expect( channel ).toEqual( expect.any( BrowserChannel ) );
			channel = registrar!.getChannelEntryAt( selectorMap ); // channel at mapped selector
			expect( channel ).toEqual( expect.any( BrowserChannel ) );
			expect( registrar.getSelectorMapUsers() ).toEqual([ 'OWNER_DESC' ]);
			const registrar2 = new TestRegistrar( 'SECOND_OWNER_DESC' );
			await render( Test, { registrar: registrar2, selectorMap } ); // register null selector mapped stream
			channel = registrar2.getChannelEntryAt( selectorMap ); // channel at mapped selector
			expect( channel ).toEqual( expect.any( BrowserChannel ) );
			expect( registrar2.getSelectorMapUsers( selectorMap ) )
				.toEqual([ 'OWNER_DESC', 'SECOND_OWNER_DESC' ]);
			expect( registrar.getChannelEntryAt() ).toBeDefined(); // null selection exists in registry 1
			expect( registrar2.getChannelEntryAt() ).toBeUndefined(); // null selection does not exist in registry 2
			expect( registrar.getChannelEntryAt( selectorMap ) ).toBeDefined(); //  selection exists in registry 1
			expect( registrar2.getChannelEntryAt( selectorMap ) ).toBeDefined(); // selection does not exist in registry 2
		} );
	} );
	describe( 'recalibrateChannelEntryFor method', () => {
		it( 'repositions channel to a new selector map', async () => {
			const recalibrateChannelSpy = vi.spyOn( ChannelRegistry.prototype, 'recalibrateChannel' );
			const registrar = new TestRegistrar( 'TEST_OWNER1' ); 
			const registrar2 = new TestRegistrar( 'TEST_OWNER2' );
			await Promise.all([ // registering streams [in this case: using null selectors]
				render( Test, { registrar } ),
				render( Test, { registrar: registrar2 } )
			]);
			const channel = registrar.getChannelEntryAt();
			expect( registrar.getSelectorMapUsers() ).toEqual([ 'TEST_OWNER1', 'TEST_OWNER2' ]);
			const selectorMap = {
				age: 'age',
				fName: 'name.first',
				location: 'history.places[0]'
			};

			expect( registrar.getChannelEntryAt( selectorMap ) ).toBeUndefined();
			
			expect( recalibrateChannelSpy ).not.toHaveBeenCalled();

			channel.selectorMap = selectorMap;

			expect( recalibrateChannelSpy ).toHaveBeenCalled();
			expect( recalibrateChannelSpy ).toHaveBeenCalledWith( channel );

			recalibrateChannelSpy.mockRestore();

			expect( registrar.getSelectorMapUsers() ).toEqual([ 'TEST_OWNER2' ]);
			expect( registrar.getSelectorMapUsers( selectorMap ) ).toEqual([ 'TEST_OWNER1' ]);
		} );
		it( 'ignores attempt to recalibrate a channel to its current selector map', async () => {
			const selectorMap = {
				age: 'age',
				fName: 'name.first',
				location: 'history.places[0]'
			};
			const registrar = new TestRegistrar( 'TEST_OWNER1' );
			await render( Test, { registrar, selectorMap } );
			registrar.getChannelEntryAt( selectorMap ).selectorMap = selectorMap;
		} );
		it( 'throws when recalibrating a channel to a selector map already subscribed', async () => {
			const selectorMap = {
				age: 'age',
				fName: 'name.first',
				location: 'history.places[0]'
			};
			const registrar = new TestRegistrar( 'TEST_OWNER1' ); 
			const registrar2 = new TestRegistrar( 'TEST_OWNER2' );
			await Promise.all([ // registering streams
				render( Test, { registrar } ),
				render( Test, { registrar: registrar2 } ),
				render( Test, { registrar: registrar2, selectorMap } ),
			]);
			expect(() => {
				registrar2.recalibrateChannel( registrar2.getChannelEntryAt(), selectorMap );
			}).toThrow();
			registrar.recalibrateChannel( registrar.getChannelEntryAt(), selectorMap );
		} );
	} );
	describe( 'registerStream method', () => {
		it( 'allows all valid selector map types', async () => {
			const registrar = new TestRegistrar( 'TEST_OWNER1' );
			await render( Test, { registrar, selectorMap: {} } );
			await render( Test, { registrar, selectorMap: [] } );
			await render( Test, { registrar, selectorMap: null } );
			await render( Test, { registrar, selectorMap: undefined } );
			expect( true ).toBe( true );
		} );
		it( 'throws on attempts to register a stream', async () => {
			const selectorMap = {
				age: 'age',
				fName: 'name.first',
				location: 'history.places[0]'
			};
			const registrar = new TestRegistrar( 'TEST_OWNER1' ); 
			const registrar2 = new TestRegistrar( 'TEST_OWNER2' );
			await Promise.all([ // registering streams
				render( Test, { registrar, selectorMap } ),
				render( Test, { registrar: registrar2, selectorMap } )
			]);
			expect( registrar.getSelectorMapUsers() ).toEqual([]);
			expect( registrar.getSelectorMapUsers( selectorMap ) )
				.toEqual([ 'TEST_OWNER1', 'TEST_OWNER2' ]);
			try{	// attempt to re-register streams
				render( Test, { registrar, selectorMap } );
				expect( true ).toBe( false );
			} catch( e ) {}
			try{	// attempt to re-register streams
				render( Test, { registrar: registrar2, selectorMap } );
				expect( true ).toBe( false );
			} catch( e ) {}
			expect( registrar.getSelectorMapUsers() ).toEqual([]);
			expect( registrar.getSelectorMapUsers( selectorMap ) )
				.toEqual([ 'TEST_OWNER1', 'TEST_OWNER2' ]);
			await Promise.all([ // registering null streams
				render( Test, { registrar } ),
				render( Test, { registrar: registrar2 } )
			]);
			expect( registrar.getSelectorMapUsers() )
				.toEqual([ 'TEST_OWNER1', 'TEST_OWNER2' ]);
			expect( registrar.getSelectorMapUsers( selectorMap ) )
				.toEqual([ 'TEST_OWNER1', 'TEST_OWNER2' ]);
		} );
	} );
} );
