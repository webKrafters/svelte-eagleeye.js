import { afterEach, describe, expect, it, test, vi } from 'vitest';
import { ChannelRegistry, type ChannelFactory, type MakeChannel } from '../index.ts';
import { BrowserChannel } from '../../index.ts'; 
import type {
	SourceData
} from '../../../../../test-artifacts/data/create-state-obj.ts';
import type { BaseStream, SelectorMap } from '../../../../../index.ts';
import Test from './index.svelte';
import { render } from 'vitest-browser-svelte';

export interface Registrar {
	at<const S extends SelectorMap>( selectorMap?: S ) : BrowserChannel<SourceData, S>
};

class DerivedChannelRegistry extends ChannelRegistry<SourceData> {
	static defaultChannelFactory = (( stream, selectorMap ) => new BrowserChannel( stream, selectorMap )) as MakeChannel<SourceData>;
	constructor( factory? : MakeChannel<SourceData> );
	constructor( factory? : ChannelFactory<SourceData> );
	constructor( factory? : any )  {
		super( factory ?? DerivedChannelRegistry.defaultChannelFactory )
	}
	get buckets() { return this.memoBuckets }
	get channelFactory() { return super.channelFactory }
	set channelFactory( factory : ChannelFactory ) { super.channelFactory = factory }
	set makeChannel( make : MakeChannel ) { super.makeChannel = make }
	getNumReferencesOf<const S extends SelectorMap>( channel: BrowserChannel<SourceData, S> ) {
		return super.getNumReferencesOf( channel );
	}
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
			.for( this.owner ) as ({
				at<const S extends SelectorMap>(selectorMap? : S) : BrowserChannel<SourceData, S>
			});
	}
	get graph() { return TestRegistrar.channelRegistry.buckets }
	get register() { return this._register }
	getChannelEntryAt<S extends SelectorMap>( selectorMap?: S ) {
		return TestRegistrar.channelRegistry.getChannelEntryFor( this.owner ).at( selectorMap );
	}
	getSelectorMapUsers<S extends SelectorMap>( selectorMap?: S ) {
		return TestRegistrar.channelRegistry.getOwnersAt( selectorMap );
	}
	getNumReferencesOf<S extends SelectorMap>( channel : BrowserChannel<SourceData, S> ) {
		return TestRegistrar.channelRegistry.getNumReferencesOf( channel );
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
		TestRegistrar.channelRegistry.unregisterStreamerFrom( channel );
	}
	private static channelRegistry = new DerivedChannelRegistry;
	private static noop = ()=>{};
}

describe( 'ChannelRegistry class', () => {
	afterEach(() => TestRegistrar.reset());
	describe( 'channelFactory property', () => {
		it( 'produces current channel factory', () => {
			const channelMakerMock = vi.fn().mockReturnValue({ memoDetail: {} });
			const factory = { make: channelMakerMock };
			const registry = new DerivedChannelRegistry( factory ); 
			expect( registry.channelFactory ).toBe( factory )
			expect( channelMakerMock ).not.toHaveBeenCalled();
			registry.registerStream({} as BaseStream<SourceData>).for( expect.any( String ) ).at();
			expect( channelMakerMock ).toHaveBeenCalled();
		} );
		test( 'function type factories are converted to instance form', () => {
			const channelMakerMock = vi.fn().mockReturnValue({ memoDetail: {} });
			const registry = new DerivedChannelRegistry( channelMakerMock ); 
			expect( registry.channelFactory ).toEqual(
				expect.objectContaining({ make: channelMakerMock })
			);
			expect( channelMakerMock ).not.toHaveBeenCalled();
			registry.registerStream({} as BaseStream<SourceData>).for( expect.any( String ) ).at();
			expect( channelMakerMock ).toHaveBeenCalled();
		} );
		it( 'can change current channel factory', () => {
			const channelMakerMock_0 = vi.fn().mockReturnValue({ memoDetail: {} });
			const registry = new DerivedChannelRegistry({ make: channelMakerMock_0 }); 
			expect( channelMakerMock_0 ).toHaveBeenCalledTimes( 0 );
			registry.registerStream({} as BaseStream<SourceData>).for( expect.any( String ) ).at();
			expect( channelMakerMock_0 ).toHaveBeenCalledTimes( 1 );
			channelMakerMock_0.mockClear();

			// setting with a factory object
			const channelMakerMock_1 = vi.fn().mockReturnValue({ memoDetail: {} });
			registry.channelFactory = { make: channelMakerMock_1 };
			expect( channelMakerMock_1 ).toHaveBeenCalledTimes( 0 );
			registry.registerStream({} as BaseStream<SourceData>).for( expect.any( String ) ).at({ company: 'company' });
			expect( channelMakerMock_0 ).toHaveBeenCalledTimes( 0 ); // defunct
			expect( channelMakerMock_1 ).toHaveBeenCalledTimes( 1 );
			channelMakerMock_1.mockClear();

			// setting with a factory function
			const channelMakerMock_2 = vi.fn().mockReturnValue({ memoDetail: {} });
			registry.makeChannel = channelMakerMock_2;
			expect( channelMakerMock_2 ).toHaveBeenCalledTimes( 0 );
			registry.registerStream({} as BaseStream<SourceData>).for( expect.any( String ) ).at({ age: 'age' });
			expect( channelMakerMock_0 ).toHaveBeenCalledTimes( 0 ); // defunct
			expect( channelMakerMock_1 ).toHaveBeenCalledTimes( 0 ); // defunct
			expect( channelMakerMock_2 ).toHaveBeenCalledTimes( 1 );
		} );
	} );
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
			const channel = registrar.getChannelEntryAt() as BrowserChannel<SourceData, SelectorMap>;
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
			expect( registrar.getChannelEntryAt( selectorMap ) ).toBeUndefined();
			await render( Test, { registrar, selectorMap } );
			const c = registrar.getChannelEntryAt( selectorMap ) as BrowserChannel<SourceData, SelectorMap>;
			expect( c ).toBeDefined();
			const t = registrar.getNumReferencesOf( c );
			expect( t ).toBe( 1 );
			c.selectorMap = selectorMap;
			expect( registrar.getNumReferencesOf( c ) ).toBe( t );
		} );
		it( 'shares current observer when recalibrating a channel to a selector map already subscribed', async () => {
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
			const monitoredChannel2_0 = registrar2.getChannelEntryAt() as BrowserChannel<SourceData, SelectorMap>;
			const monitoredChannel2_1 = registrar2.getChannelEntryAt( selectorMap ) as BrowserChannel<SourceData, SelectorMap>;
			expect( registrar2.getNumReferencesOf( monitoredChannel2_0 ) ).toBe( 1 );
			expect( registrar2.getNumReferencesOf( monitoredChannel2_1 ) ).toBe( 1 );
			
			registrar2.recalibrateChannel(
				registrar2.getChannelEntryAt() as BrowserChannel<SourceData, SelectorMap>,
				selectorMap
			);

			expect( registrar2.getChannelEntryAt() ).toBeUndefined();
			expect( registrar2.getNumReferencesOf( monitoredChannel2_0 ) ).toBe( 2 );
			expect( registrar2.getNumReferencesOf( monitoredChannel2_1 ) ).toBe( 2 );

			const monitoredChannel1_0 = registrar.getChannelEntryAt() as BrowserChannel<SourceData, SelectorMap>;
			expect( registrar.getChannelEntryAt( selectorMap ) ).toBeUndefined();
			expect( registrar.getNumReferencesOf( monitoredChannel1_0 ) ).toBe( 1 );

			registrar.recalibrateChannel(
				registrar.getChannelEntryAt() as BrowserChannel<SourceData, SelectorMap>,
				selectorMap
			);

			const monitoredChannel1_1 = registrar.getChannelEntryAt( selectorMap ) as BrowserChannel<SourceData, SelectorMap>;
			expect( registrar.getChannelEntryAt() ).toBeUndefined();
			expect( registrar.getNumReferencesOf( monitoredChannel1_1 ) ).toBe( 1 );

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
