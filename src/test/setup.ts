import 'fake-indexeddb/auto'

/**
 * Test environment setup.
 *
 * `fake-indexeddb/auto` installs an in-memory IndexedDB so the persistence layer
 * can be exercised for real rather than mocked away — a storage bug that only
 * appears in a browser is exactly the kind of thing that loses someone's
 * training history.
 */
